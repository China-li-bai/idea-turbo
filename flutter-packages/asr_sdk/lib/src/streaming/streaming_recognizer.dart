import 'dart:typed_data';

import 'package:asr_sdk/src/domain/transcription_chunk.dart';

/// Minimal contract for a streaming recognizer, abstracted away from any
/// specific native backend (sherpa-onnx, whisper.cpp, etc).
///
/// Used by [StreamingAsrSession] so the session is unit-testable without
/// a native library, and so future ASR backends can plug in without
/// changing the session code.
///
/// Lifecycle:
///   - [createStream] returns a new [StreamingRecognizerStream].
///   - The session owns the stream and calls [freeStream] when done.
///
/// Implementations MUST be safe to call from a single isolate.
abstract class StreamingRecognizer {
  StreamingRecognizerStream createStream();
}

/// A live recognition stream owned by a [StreamingRecognizer].
///
/// Sample feeding + decode/result cycle:
///   1. [acceptWaveform] with PCM samples.
///   2. [decode] runs one inference pass.
///   3. [getResult] returns the current partial text.
///   4. [isEndpoint] returns true if the model detected an utterance
///      boundary (silence-based or length-based).
///   5. [reset] starts a fresh partial after an endpoint.
///   6. [inputFinished] marks end-of-input.
///   7. [free] releases native resources. Idempotent.
abstract class StreamingRecognizerStream {
  void acceptWaveform({required Float32List samples, required int sampleRate});

  void decode();

  /// Returns the current recognized text. Implementations may also expose
  /// timestamps/lang via richer result types; here we only need text.
  String get partialText;

  bool isEndpoint();

  void reset();

  void inputFinished();

  void free();
}

/// Wraps a [StreamingRecognizer] result emission cycle into a single
/// decision: emit a partial chunk, an endpoint chunk, or nothing.
///
/// Pulled out as a pure function so it can be unit-tested in isolation
/// from any native code.
TranscriptionChunk? buildChunkForDecodeResult({
  required String partial,
  required bool isEndpoint,
  required String previousCommitted,
}) {
  final trimmed = partial.trim();
  if (isEndpoint) {
    final committed = previousCommitted.isEmpty
        ? trimmed
        : (trimmed.isEmpty
            ? previousCommitted
            : '$previousCommitted $trimmed');
    return TranscriptionChunk(
      partialText: trimmed,
      committedText: committed,
      isEndpoint: true,
    );
  }
  if (trimmed.isEmpty) return null;
  return TranscriptionChunk(partialText: trimmed);
}

/// Cumulative text merge after an endpoint, exposed for testing.
String mergeCommitted(String previous, String utterance) {
  if (previous.isEmpty) return utterance;
  if (utterance.isEmpty) return previous;
  return '$previous $utterance';
}
