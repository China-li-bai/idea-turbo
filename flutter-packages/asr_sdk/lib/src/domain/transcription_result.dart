import 'package:asr_sdk/src/domain/asr_language.dart';

/// One timestamped segment of a transcription.
///
/// Segments are emitted by models that support alignment (e.g. Whisper,
/// SenseVoice). For models that only emit full text, the engine returns a
/// single segment spanning the entire audio.
class TranscriptionSegment {
  final String text;
  final Duration start;
  final Duration end;
  final double? confidence;

  const TranscriptionSegment({
    required this.text,
    required this.start,
    required this.end,
    this.confidence,
  });

  Duration get duration => end - start;

  @override
  String toString() =>
      'TranscriptionSegment("${text}", ${start.inMilliseconds}ms→${end.inMilliseconds}ms)';
}

/// Result of a batch transcription.
class TranscriptionResult {
  final String text;
  final List<TranscriptionSegment> segments;
  final Duration processingTime;
  final AsrLanguage detectedLanguage;
  final double? confidence;

  const TranscriptionResult({
    required this.text,
    required this.segments,
    required this.processingTime,
    required this.detectedLanguage,
    this.confidence,
  });

  /// True if the model produced no text (silence, noise, or unsupported lang).
  bool get isEmpty => text.trim().isEmpty;

  @override
  String toString() =>
      'TranscriptionResult("$text", lang=$detectedLanguage, ${segments.length} segments, ${processingTime.inMilliseconds}ms)';
}
