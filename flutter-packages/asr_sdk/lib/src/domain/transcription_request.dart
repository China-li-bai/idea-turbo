import 'package:asr_sdk/src/domain/asr_language.dart';

/// Request for batch (offline) transcription.
///
/// The audio file MUST be 16 kHz mono PCM (WAV) or a format the underlying
/// engine can decode. Non-WAV inputs may require FFmpeg preprocessing
/// (handled by the engine implementation, not by this value object).
class TranscriptionRequest {
  /// Absolute path to the audio file on the local filesystem.
  final String audioFilePath;

  /// Language hint. null or [AsrLanguage.auto] lets the model auto-detect.
  final AsrLanguage? language;

  /// Whether to insert punctuation in the output.
  final bool enablePunctuation;

  /// Whether to apply inverse text normalization (digits, dates, etc).
  final bool enableItn;

  /// Optional hotwords to bias recognition. Each entry is a token or phrase.
  final List<String> hotwords;

  const TranscriptionRequest({
    required this.audioFilePath,
    this.language,
    this.enablePunctuation = true,
    this.enableItn = true,
    this.hotwords = const [],
  });

  /// Whether the caller requested auto-detection.
  bool get isAutoDetect => language == null || language == AsrLanguage.auto;

  @override
  String toString() =>
      'TranscriptionRequest($audioFilePath, lang=$language, punct=$enablePunctuation, itn=$enableItn)';
}
