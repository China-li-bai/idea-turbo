import 'package:asr_sdk/src/domain/asr_language.dart';
import 'package:asr_sdk/src/domain/asr_model_config.dart';
import 'package:asr_sdk/src/domain/transcription_chunk.dart';
import 'package:asr_sdk/src/domain/transcription_request.dart';
import 'package:asr_sdk/src/domain/transcription_result.dart';

/// Abstract ASR engine contract.
///
/// Implementations:
/// - [SherpaOnnxAsrEngine] (Phase 1 PoC, will wrap sherpa_onnx 1.13.x).
/// - [FakeAsrEngine] (testing).
///
/// Lifecycle:
///   1. [initialize] with a chosen [AsrModelConfig] (idempotent for the same
///      config; switching models requires [dispose] first).
///   2. [transcribeFile] for batch, or [startStreamRecognition] for realtime.
///   3. [dispose] to release native resources.
///
/// Thread safety:
///   Implementations MUST be safe to call from a single isolate. Concurrent
///   calls from multiple isolates are NOT supported (use one engine per
///   isolate). This constraint aligns with sherpa-onnx's native model.
abstract class AsrEngine {
  /// Whether [initialize] has completed successfully.
  bool get isInitialized;

  /// The currently loaded model, or null if not initialized.
  AsrModelConfig? get activeModel;

  /// Loads the given model. Idempotent: calling with the same [model] twice
  /// is a no-op. Calling with a different model before [dispose] throws
  /// [AsrInitializationException].
  ///
  /// Throws:
  /// - [AsrInitializationException] on native load failure or model switch.
  /// - [AsrModelNotFoundException] (from registry layer) if the model files
  ///   are not present on disk.
  Future<void> initialize({required AsrModelConfig model});

  /// Transcribes a complete audio file (batch mode).
  ///
  /// The engine MUST validate that the file exists and is non-empty before
  /// invoking the native model. Audio format conversion (if needed) is the
  /// engine's responsibility.
  ///
  /// Throws:
  /// - [AsrNotInitializedException] if called before [initialize].
  /// - [AsrTranscriptionException] on decode/IO errors.
  /// - [AsrUnsupportedLanguageException] if [request.language] is not
  ///   supported by [activeModel].
  Future<TranscriptionResult> transcribeFile(TranscriptionRequest request);

  /// Starts a streaming recognition session.
  ///
  /// Returns a [Stream] of [TranscriptionChunk]. The consumer feeds audio
  /// frames by calling [StreamingSession.feed] (returned via a higher-level
  /// controller, see [startStreamRecognitionWithController] in Phase 2).
  ///
  /// For Phase 1, this method returns a Stream that the engine itself
  /// drives from an internal audio capture loop. The Stream ends when:
  /// - the engine detects a terminal endpoint, OR
  /// - [dispose] is called, OR
  /// - the underlying audio source is exhausted.
  ///
  /// Throws:
  /// - [AsrNotInitializedException] if called before [initialize].
  /// - [AsrUnsupportedLanguageException] if [language] is not supported.
  /// - [AsrTranscriptionException] if the active model is offline-only.
  Stream<TranscriptionChunk> startStreamRecognition({
    AsrLanguage language = AsrLanguage.auto,
  });

  /// Releases native resources. Safe to call multiple times.
  /// After dispose, the engine MUST NOT be reused; create a new instance.
  Future<void> dispose();
}
