import 'dart:async';
import 'dart:typed_data';

import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';

/// Glue between the microphone ([AudioRecorder]) and the on-device
/// streaming recognizer ([StreamingAsrSession]).
///
/// Architecture role (per .trae/rules/architecture.md):
///   flutter_demo (Presentation)
///       ↓ depends on
///   asr_sdk (Flutter SDK wrapper)
///
/// This service owns NO business logic. It only:
///   1. Requests mic permission and starts the recorder in 16kHz mono
///      PCM-16 mode (matching [AsrConstants.sampleRateHz]).
///   2. For each PCM chunk from the recorder, converts Int16 → Float32
///      normalized to [-1, 1] and feeds it into the [StreamingAsrSession].
///   3. Forwards the session's [TranscriptionChunk] stream to consumers.
///   4. On [stop], tears down the recorder and flushes the session.
///
/// Lifecycle:
///   - [start] expects a streaming-capable [SherpaOnnxAsrEngine] that has
///     already been initialized with a streaming model.
///   - [chunks] is a single-subscription broadcast-cached stream. Listen
///     once; the partial text updates with each chunk, and the final text
///     is delivered via [TranscriptionChunk.isEndpoint] / [committedText].
///   - [stop] is idempotent and disposes both recorder and session.
///
/// Error handling:
///   - Mic permission denied, recorder errors, and engine state errors are
///     surfaced via [chunks]'s error channel (addError) so the UI can show
///     them. The service resets to idle on any error.
class AsrService {
  AsrService({AudioRecorder? recorder})
    : _recorder = recorder ?? AudioRecorder();

  final AudioRecorder _recorder;

  StreamingAsrSession? _session;
  StreamSubscription<Uint8List>? _recorderSub;
  StreamController<TranscriptionChunk>? _controller;
  bool _running = false;

  /// Whether a recognition session is currently active.
  bool get isRunning => _running;

  /// Stream of transcription chunks for the current session.
  ///
  /// Returns null when no session is active. The stream closes when
  /// [stop] completes.
  Stream<TranscriptionChunk>? get chunks => _controller?.stream;

  /// Starts streaming recognition.
  ///
  /// [engine] MUST be a [SherpaOnnxAsrEngine] that has been initialized
  /// with a streaming model (e.g. Zipformer). Calling [start] while a
  /// session is already running is a no-op.
  ///
  /// Throws [StateError] if the engine is not initialized, the engine is
  /// offline-only, or microphone permission is denied.
  Future<void> start(SherpaOnnxAsrEngine engine) async {
    if (_running) return;

    final controller = StreamController<TranscriptionChunk>.broadcast();
    _controller = controller;

    try {
      final hasPerm = await _recorder.hasPermission();
      if (!hasPerm) {
        throw StateError('Microphone permission denied');
      }

      final session = engine.createStreamingSession();
      _session = session;
      session.start();
      _running = true;

      // Wire session → broadcast controller. We hold the subscription
      // internally so we can cancel it on stop even if the consumer didn't.
      // Note: the session's chunks is single-subscription; we relay.
      // ignore: unawaited_futures
      session.chunks.listen(
        controller.add,
        onError: controller.addError,
        onDone: () {
          if (!controller.isClosed) controller.close();
        },
      );

      // 16kHz mono PCM-16 = exactly what sherpa-onnx expects. The recorder
      // emits Uint8List of Int16 LE samples; we convert to Float32 [-1, 1]
      // before feeding the session.
      const config = RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: AsrConstants.sampleRateHz,
        numChannels: AsrConstants.channels,
        autoGain: true,
        echoCancel: true,
        noiseSuppress: true,
      );

      final audioStream = await _recorder.startStream(config);
      _recorderSub = audioStream.listen(
        (bytes) {
          if (!_running) return;
          final samples = _bytesToFloat32(bytes);
          if (samples.isEmpty) return;
          try {
            session.feed(samples);
          } catch (e, st) {
            controller.addError(e, st);
          }
        },
        onError: (Object e, StackTrace st) => controller.addError(e, st),
      );
    } catch (e, st) {
      await _teardown();
      controller.addError(e, st);
      await controller.close();
    }
  }

  /// Stops the active recognition session. Idempotent.
  ///
  /// Flushes any trailing partial text via the session's stop(), then
  /// releases the recorder and session. The [chunks] stream closes once
  /// all buffered events are delivered.
  Future<void> stop() async {
    if (!_running) return;
    await _teardown();
  }

  Future<void> _teardown() async {
    _running = false;
    await _recorderSub?.cancel();
    _recorderSub = null;

    try {
      await _recorder.stop();
    } catch (_) {
      // recorder may already be stopped; ignore.
    }

    try {
      _session?.stop();
    } catch (_) {
      // session may already be stopped; ignore.
    }
    await _session?.dispose();
    _session = null;

    final controller = _controller;
    _controller = null;
    if (controller != null && !controller.isClosed) {
      await controller.close();
    }
  }

  /// Releases all resources. Idempotent. Implies [stop] if running.
  Future<void> dispose() async {
    await _teardown();
    await _recorder.dispose();
  }

  /// Converts little-endian Int16 PCM bytes to normalized Float32 samples.
  ///
  /// Sherpa-onnx expects Float32 in [-1, 1]; record emits Int16 LE.
  /// Trailing odd bytes are dropped (incomplete sample).
  static Float32List _bytesToFloat32(Uint8List bytes) {
    if (bytes.length < 2) return Float32List(0);
    final sampleCount = bytes.length ~/ 2;
    final out = Float32List(sampleCount);
    final byteData = ByteData.sublistView(bytes);
    for (var i = 0; i < sampleCount; i++) {
      final int16 = byteData.getInt16(i * 2, Endian.little);
      out[i] = int16 / 32768.0;
    }
    return out;
  }
}
