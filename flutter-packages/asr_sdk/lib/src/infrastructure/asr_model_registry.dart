import 'package:asr_sdk/src/domain/asr_language.dart';
import 'package:asr_sdk/src/domain/asr_model_config.dart';

/// Static catalog of recommended ASR models for idea-turbo.
///
/// These are the curated defaults; the catalog is intentionally small to
/// keep decision fatigue low. Consumers (e.g. flutter_demo's
/// DevicePerformanceService + ModelDownloadPage) read this registry to
/// populate model picker UI and decide what to download.
///
/// All download URLs point to k2-fsa/sherpa-onnx GitHub releases. Models
/// are Apache-2.0 or MIT (model-specific; see upstream model cards).
class AsrModelRegistry {
  AsrModelRegistry._();

  /// Default model for the Chinese-first product scenario.
  /// SenseVoice-Small int8: 96.2% Chinese accuracy, faster-than-realtime
  /// on CPU, ~234MB compressed.
  static const AsrModelConfig senseVoiceSmallInt8 = AsrModelConfig(
    id: 'sensevoice-small-int8',
    displayName: 'SenseVoice Small (INT8)',
    description: 'Alibaba SenseVoice-Small, int8 quantized. Best Chinese '
        'accuracy on CPU. Supports zh/en/yue/ja/ko with auto-detect. '
        'Non-streaming (use VAD + chunking for pseudo-streaming).',
    type: AsrModelType.senseVoice,
    mode: AsrModelMode.offline,
    supportedLanguages: [
      AsrLanguage.auto,
      AsrLanguage.zh,
      AsrLanguage.en,
      AsrLanguage.yue,
      AsrLanguage.ja,
      AsrLanguage.ko,
    ],
    modelPath: 'model.int8.onnx',
    tokensPath: 'tokens.txt',
    sizeBytes: 234 * 1024 * 1024,
    downloadUrl: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/'
        'asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17-int8.tar.bz2',
    minDeviceTier: 1,
  );

  /// Streaming English-first model. Moonshine v2 Base: 107ms TTFT,
  /// WER 6.65%, native streaming encoder. Use for real-time English
  /// conversation scenarios where SenseVoice's batch latency is too high.
  static const AsrModelConfig moonshineBaseV2 = AsrModelConfig(
    id: 'moonshine-base-v2',
    displayName: 'Moonshine v2 Base',
    description: 'Useful SenseCommunications Moonshine v2 Base. Native '
        'streaming encoder with 107ms TTFT. English only. Use for low-'
        'latency voice chat scenarios.',
    type: AsrModelType.moonshine,
    mode: AsrModelMode.streaming,
    supportedLanguages: [AsrLanguage.en],
    modelPath: 'model.onnx',
    tokensPath: 'tokens.txt',
    sizeBytes: 125 * 1024 * 1024,
    // TODO(phase1): verify exact release URL once PoC starts.
    downloadUrl: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/'
        'asr-models/sherpa-onnx-moonshine-base-en-int8.tar.bz2',
    minDeviceTier: 2,
  );

  /// All curated models, ordered by recommendation priority for the
  /// idea-turbo Chinese-first product.
  static const List<AsrModelConfig> all = [
    senseVoiceSmallInt8,
    moonshineBaseV2,
  ];

  /// Find a model by id. Returns null if not found.
  static AsrModelConfig? findById(String id) {
    for (final m in all) {
      if (m.id == id) return m;
    }
    return null;
  }

  /// Returns models that support the given language, ordered by
  /// recommendation priority.
  static List<AsrModelConfig> forLanguage(AsrLanguage language) {
    return all.where((m) => m.supportsLanguage(language)).toList(growable: false);
  }

  /// Returns the default model for the given device tier.
  /// Tier 1 (low-end): SenseVoice int8 only.
  /// Tier 2+ (mid/high): SenseVoice int8 + Moonshine v2 for streaming.
  static AsrModelConfig defaultForDeviceTier(int tier) {
    return senseVoiceSmallInt8;
  }
}
