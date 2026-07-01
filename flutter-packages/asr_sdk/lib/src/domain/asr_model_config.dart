import 'package:asr_sdk/src/domain/asr_language.dart';

/// Model family. Determines which sherpa-onnx config struct to use.
enum AsrModelType {
  /// Alibaba SenseVoice — best Chinese accuracy on CPU, non-streaming.
  senseVoice,

  /// OpenAI Whisper — strongest multilingual accuracy, non-streaming, CPU-heavy.
  whisper,

  /// Useful SenseCommunications Moonshine v2 — low-latency streaming English.
  moonshine,

  /// k2-fsa Zipformer — streaming transducer/CTC, multiple languages.
  zipformer,

  /// Alibaba Paraformer — streaming + non-streaming Chinese.
  paraformer,
}

/// Whether the model supports real-time streaming recognition.
enum AsrModelMode {
  /// Batch transcription of a complete audio file.
  offline,

  /// Real-time recognition via incremental audio feeding.
  streaming,
}

/// Immutable configuration for an ASR model.
///
/// Acts as a value object: two configs with the same [id] are considered
/// equal. The [downloadUrl] points to a sherpa-onnx model release archive
/// that [AsrModelLoader] (Phase 2) will fetch, extract, and verify.
class AsrModelConfig {
  final String id;
  final String displayName;
  final String description;
  final AsrModelType type;
  final AsrModelMode mode;
  final List<AsrLanguage> supportedLanguages;

  /// Relative path of the ONNX model file inside the extracted archive.
  final String modelPath;

  /// Relative path of the tokens file inside the extracted archive.
  final String tokensPath;

  /// Optional relative paths for transducer models (encoder/decoder/joiner).
  final String? encoderPath;
  final String? decoderPath;
  final String? joinerPath;

  /// Approximate download size in bytes (compressed archive).
  final int sizeBytes;

  /// URL of the model archive (tar.bz2 or zip).
  final String downloadUrl;

  /// SHA-256 of the archive for download verification.
  final String? sha256;

  /// Minimum device tier required to run this model (1=low, 2=mid, 3=high).
  /// Lower-tier devices should pick models with a lower requirement.
  final int minDeviceTier;

  const AsrModelConfig({
    required this.id,
    required this.displayName,
    required this.description,
    required this.type,
    required this.mode,
    required this.supportedLanguages,
    required this.modelPath,
    required this.tokensPath,
    this.encoderPath,
    this.decoderPath,
    this.joinerPath,
    required this.sizeBytes,
    required this.downloadUrl,
    this.sha256,
    this.minDeviceTier = 1,
  });

  bool supportsLanguage(AsrLanguage language) {
    return supportedLanguages.contains(language);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AsrModelConfig && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'AsrModelConfig($id, $type, $mode)';
}
