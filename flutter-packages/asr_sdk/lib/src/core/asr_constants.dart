/// Constants for asr_sdk.
///
/// Centralizes audio format requirements so that downstream recorders
/// and upstream sherpa-onnx consumers agree on sample rate, channel
/// count, and sample format.
class AsrConstants {
  AsrConstants._();

  /// sherpa-onnx expects 16 kHz mono Float32 PCM for all ASR models.
  static const int sampleRateHz = 16000;

  /// Number of channels. ASR is mono; stereo must be downmixed upstream.
  static const int channels = 1;

  /// Samples per second = sampleRateHz. Used for buffer sizing.
  static const int samplesPerSecond = sampleRateHz;

  /// Recommended frame duration for streaming recognition.
  /// Smaller = lower latency but higher overhead; larger = vice versa.
  static const Duration streamingFrameDuration = Duration(milliseconds: 100);

  /// Recommended VAD frame duration (silero-vad expects 30ms or 100ms).
  static const Duration vadFrameDuration = Duration(milliseconds: 30);

  /// Minimum audio duration to attempt transcription. Below this the
  /// engine may return an empty result without invoking the model.
  static const Duration minAudioDuration = Duration(milliseconds: 200);
}
