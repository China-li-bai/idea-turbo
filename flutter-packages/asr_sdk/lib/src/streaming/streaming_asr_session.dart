import 'dart:async';
import 'dart:typed_data';

import 'package:meta/meta.dart';

import 'package:asr_sdk/src/core/asr_constants.dart';
import 'package:asr_sdk/src/domain/transcription_chunk.dart';
import 'package:asr_sdk/src/streaming/streaming_recognizer.dart';

/// Live streaming ASR session bound to a [StreamingRecognizer].
///
/// The session is **audio-source agnostic**: callers feed normalized PCM
/// frames via [feed] and observe incremental transcripts via [chunks].
/// This keeps asr_sdk free of any recorder dependency; the consumer app
/// (e.g. flutter_demo) wires in `package:record` or any other source.
///
/// Lifecycle:
///   1. Construct with a [StreamingRecognizer] (typically obtained from
///      [SherpaOnnxAsrEngine.createStreamingSession]).
///   2. Call [start] to create the native stream.
///   3. Call [feed] for each audio chunk from the recorder (16kHz mono
///      Float32 in [-1, 1]).
///   4. Listen to [chunks] for partial/endpoint updates.
///   5. Call [stop] when the user stops recording; the recognizer flushes
///      trailing context and emits a final endpoint chunk.
///   6. Call [dispose] to release the native stream.
///
/// Contract:
///   - [feed] MUST only be called after [start] and before [stop].
///   - [chunks] is a single-subscription stream.
///   - [dispose] is idempotent and implies [stop].
class StreamingAsrSession {
  StreamingAsrSession({
    required StreamingRecognizer recognizer,
    @visibleForTesting this.decodeThrottle = const Duration(milliseconds: 80),
  }) : _recognizer = recognizer {
    _controller = StreamController<TranscriptionChunk>(
      onListen: _onListen,
      onCancel: _onCancel,
    );
  }

  final StreamingRecognizer _recognizer;

  /// Reserved for a future debounce implementation. Currently the session
  /// decodes on every [feed]; callers should batch frames externally
  /// (e.g. emit every 100ms from the recorder).
  final Duration decodeThrottle;

  late final StreamController<TranscriptionChunk> _controller;
  StreamingRecognizerStream? _stream;
  bool _started = false;
  bool _stopped = false;
  bool _disposed = false;

  /// Cumulative committed (endpoint-finalized) text across the session.
  String _committedText = '';

  /// Stream of incremental recognition results.
  ///
  /// - Non-endpoint chunks carry [TranscriptionChunk.partialText] only.
  /// - Endpoint chunks carry both [TranscriptionChunk.partialText] (the
  ///   final text for the just-closed utterance) and
  ///   [TranscriptionChunk.committedText] (cumulative session text).
  Stream<TranscriptionChunk> get chunks => _controller.stream;

  /// Whether [start] has been called and [stop] has not.
  bool get isActive => _started && !_stopped;

  /// Begins recognition. Creates the native stream via the recognizer.
  ///
  /// Safe to call once per instance. Calling [feed] before [start] is a
  /// state error.
  void start() {
    _ensureNotDisposed();
    if (_started) {
      throw StateError('StreamingAsrSession.start called twice');
    }
    _stream = _recognizer.createStream();
    _started = true;
  }

  /// Feeds normalized PCM samples to the recognizer and triggers a decode.
  ///
  /// [samples] MUST be mono Float32 normalized to [-1, 1] at the sample
  /// rate declared in [AsrConstants.sampleRateHz] (16000). The recognizer
  /// resamples internally if needed, but feeding the correct rate avoids
  /// that cost.
  ///
  /// After each feed, the session decodes and emits a [TranscriptionChunk]
  /// on [chunks] if the partial text changed or an endpoint was detected.
  void feed(Float32List samples) {
    _ensureActive();
    if (samples.isEmpty) return;

    final stream = _stream!;
    stream.acceptWaveform(samples: samples, sampleRate: AsrConstants.sampleRateHz);
    _decodeAndEmit();
  }

  /// Signals end-of-input. Flushes the recognizer and emits a final
  /// endpoint chunk so consumers see the last partial text committed.
  ///
  /// After [stop], [feed] MUST NOT be called. Call [dispose] to release
  /// native resources.
  void stop() {
    _ensureNotDisposed();
    if (!_started || _stopped) return;
    _stopped = true;

    final stream = _stream;
    if (stream == null) return;

    stream.inputFinished();
    _decodeAndEmit(forceEndpoint: true);

    if (!_controller.isClosed) {
      _controller.close();
    }
  }

  /// Releases native resources. Idempotent. Implies [stop] if not already.
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;

    // If session was active, flush trailing context inline rather than
    // calling stop() — stop()'s _ensureNotDisposed guard would throw now
    // that _disposed is true.
    final stream = _stream;
    if (stream != null && _started && !_stopped) {
      _stopped = true;
      stream.inputFinished();
      _decodeAndEmit(forceEndpoint: true);
    }

    _stream?.free();
    _stream = null;
    // Close the controller without awaiting: listeners that have already
    // subscribed will receive the done event asynchronously. Awaiting
    // close() can deadlock when called from a sync onCancel handler
    // because the controller's done-completion is scheduled via
    // microtasks that never run if the caller is itself inside a
    // synchronous stream callback.
    if (!_controller.isClosed) {
      _controller.close();
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  void _decodeAndEmit({bool forceEndpoint = false}) {
    final stream = _stream;
    if (stream == null) return;

    stream.decode();
    final partial = stream.partialText;
    final trimmed = partial.trim();

    // Skip emission when forceEndpoint is requested but there's no
    // trailing partial to commit (the last endpoint already cleared the
    // partial via reset()). Emitting an empty endpoint chunk here would
    // duplicate the previous committed text as noise.
    if (forceEndpoint && trimmed.isEmpty) {
      return;
    }

    final isEndpoint = forceEndpoint || stream.isEndpoint();

    final chunk = buildChunkForDecodeResult(
      partial: partial,
      isEndpoint: isEndpoint,
      previousCommitted: _committedText,
    );

    if (chunk == null) return;

    if (chunk.isEndpoint) {
      _committedText = mergeCommitted(_committedText, chunk.partialText);
      // After an endpoint, reset the recognizer stream so subsequent
      // partials start a fresh utterance. This matches sherpa-onnx's
      // expected usage: the caller is responsible for invoking reset()
      // after consuming an endpoint. Without this, the next feed's
      // partial would still contain the just-finalized text, and a
      // subsequent stop() would re-emit it as a duplicate endpoint.
      stream.reset();
    }

    if (!_controller.isClosed) {
      _controller.add(chunk);
    }
  }

  void _onListen() {
    // No-op: decoding is driven by [feed], not by stream subscription.
  }

  void _onCancel() {
    // Consumer cancelled the subscription; tear down the session.
    dispose();
  }

  void _ensureNotDisposed() {
    if (_disposed) {
      throw StateError('StreamingAsrSession has been disposed');
    }
  }

  void _ensureActive() {
    _ensureNotDisposed();
    if (!_started) {
      throw StateError('StreamingAsrSession.feed called before start');
    }
    if (_stopped) {
      throw StateError('StreamingAsrSession.feed called after stop');
    }
  }
}
