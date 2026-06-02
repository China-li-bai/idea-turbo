import 'dart:async';
import 'dart:developer';
import 'dart:io' show Platform;

import 'package:llamadart/llamadart.dart';

enum AiConversationRole { user, assistant }

/// MiniCPM5-1B 的 Hybrid Reasoning 模式。
///
/// OpenBMB 官方推荐（MiniCPM5 模型卡）：
/// - [noThink]: temp=0.7, topP=0.95, topK=40
/// - [think]: temp=0.9, topP=0.95, topK=40
enum AiReasoningMode { noThink, think }

class AiConversationMessage {
  final AiConversationRole role;
  final String text;

  const AiConversationMessage({required this.role, required this.text});
}

class AiResponse {
  final String text;

  const AiResponse({required this.text});
}

class AiService {
  static const _maxHistoryMessages = 8;
  static const systemPrompt = '你是「甄悦」，一个会记得、理解、陪伴用户长大的 AI 人格。\n'
      '语言风格：温和、克制、不油腻。\n'
      '约束：\n'
      '- 默认中文；用户切英文你也切英文。\n'
      '- 不堆叠客套（"很抱歉听到..."、"非常理解你的感受..."），用具体内容替代套话。\n'
      '- 不知道就说"我不确定"，不要编。\n'
      '\n'
      '长度原则：\n'
      '- 回复长度与用户输入的"重量"成正比。\n'
      '  · 闲聊、打招呼、简单确认：1-2 句。\n'
      '  · 情绪倾诉、需要接住：3-5 句，先接情绪再回应内容。\n'
      '  · 用户明确要详细解释、教程、列表：充分展开，不要人为截断。\n'
      '- 不为了"显得简短"而省略关键信息。';
  /// OpenBMB MiniCPM5-1B 模型卡官方推荐的生成参数。
  ///
  /// - noThink: temp=0.7, topP=0.95, topK=40 (快速、回复短)
  /// - think:   temp=0.9, topP=0.95, topK=40 (含 <think> 块、回复更长)
  ///
  /// `minP=0.05` 和 `penalty=1.10` 来自项目经验值，无 MiniCPM 官方推荐。
  static GenerationParams paramsFor(AiReasoningMode mode) {
    final isThink = mode == AiReasoningMode.think;
    return GenerationParams(
      maxTokens: isThink ? 1024 : 512,
      temp: isThink ? 0.9 : 0.7,
      topK: 40,
      topP: 0.95,
      minP: 0.05,
      penalty: 1.10,
    );
  }

  /// 离屏 GPU 卸载的层数。MiniCPM5-1B 有 24 层；使用 `ModelParams.maxGpuLayers`
  /// 让 llama.cpp 把所有层都尽量放到 GPU 上。
  static const int defaultGpuLayers = ModelParams.maxGpuLayers;

  /// 移动端上下文窗口。
  /// - iOS / macOS：GPU 可用，4096 tokens 平衡性能与内存。
  /// - Android：默认 CPU 推理，2048 tokens 避免 1B 模型 KV 内存爆炸。
  /// MiniCPM5-1B 原生支持 128K，但移动端没那么多 RAM。
  static const int iosContextSize = 4096;
  static const int androidCpuContextSize = 2048;

  /// 构建 MiniCPM5-1B 移动端推理的 `ModelParams`。
  ///
  /// 平台分支：
  /// - iOS / macOS：全部 24 层 GPU offload（默认）。
  /// - Android：CPU 推理（`gpuLayers: 0`），等 llamadart 启用 Vulkan 后再调。
  ///
  /// 关键参数：
  /// - `batchSize: 512` — 默认 0 会被解释为 `n_ctx`，浪费内存。
  /// - `cacheTypeK/V: q4_0` — KV 缓存压到 1/4。llamadart 的 `validate()` 会强制
  ///   `flashAttention != disabled`。
  /// - `useMmap: true / useMlock: false` — 700MB 权重不锁内存，按需 page。
  static ModelParams buildModelParams({required int threads}) {
    final isAndroid = Platform.isAndroid;
    return ModelParams(
      contextSize: isAndroid ? androidCpuContextSize : iosContextSize,
      gpuLayers: isAndroid ? 0 : defaultGpuLayers,
      numberOfThreads: threads,
      numberOfThreadsBatch: threads,
      batchSize: 512,
      microBatchSize: 64,
      useMmap: true,
      useMlock: false,
      flashAttention: FlashAttention.auto,
      cacheTypeK: KvCacheType.q4_0,
      cacheTypeV: KvCacheType.q4_0,
      splitMode: ModelSplitMode.none,
      mainGpu: 0,
    );
  }

  LlamaEngine? _engine;
  String? _modelPath;
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  Future<void> initialize(String modelPath) async {
    if (_modelPath == modelPath && _isInitialized) return;

    _engine?.dispose();
    _isInitialized = false;
    _modelPath = modelPath;

    _engine = LlamaEngine(LlamaBackend());
    final threads = Platform.numberOfProcessors.clamp(2, 8);
    await _engine!.loadModel(
      modelPath,
      modelParams: buildModelParams(threads: threads),
    );

    _isInitialized = true;

    // Best-effort warm-up: pre-prompt a tiny token so the first real user
    // request doesn't pay JIT/KV-alloc latency. Errors are swallowed.
    unawaited(warmup());
  }

  /// Pre-runs a 1-token decode to amortize model warm-up costs (JIT, KV
  /// cache allocation, weight paging). Safe to call on an uninitialized
  /// service — short-circuits to a no-op.
  Future<void> warmup() async {
    if (_engine == null) return;
    try {
      final stream = _engine!.create(
        const [LlamaChatMessage.fromText(role: LlamaChatRole.user, text: 'hi')],
        params: const GenerationParams(maxTokens: 1, temp: 0.0),
      );
      await for (final _ in stream) {
        // drain
      }
    } catch (e) {
      log('[AiService] warmup failed: $e', name: 'LocalChat');
    }
  }

  /// Strips every `<think>...</think>` block from a final assembled string.
  ///
  /// MiniCPM5-1B's Hybrid Reasoning mode emits a <think> block before the
  /// user-facing answer. The final pass trims it out so the consumer only
  /// sees the answer.
  static String stripThinkBlocks(String text) {
    return text.replaceAll(RegExp(r'<think>[\s\S]*?</think>'), '').trim();
  }

  /// Streaming delta filter: hides any tokens emitted while the model is
  /// inside a `<think>` block.
  ///
  /// Callers track [inThink] across deltas — pass `true` for subsequent
  /// chunks after seeing `<think>`, then `false` again after `</think>`.
  static String stripThinkBlocksDelta(String delta, {required bool inThink}) {
    if (inThink) {
      final closeIdx = delta.indexOf('</think>');
      if (closeIdx < 0) return '';
      return delta.substring(closeIdx + '</think>'.length);
    }
    final openIdx = delta.indexOf('<think>');
    if (openIdx < 0) return delta;
    return delta.substring(0, openIdx);
  }

  Future<AiResponse> generateResponse(
    String userMessage, {
    List<AiConversationMessage> history = const [],
    AiReasoningMode mode = AiReasoningMode.noThink,
  }) async {
    if (!_isInitialized || _engine == null) {
      log('[AiService] 未初始化', name: 'LocalChat');
      return const AiResponse(text: '');
    }

    final recentHistory = history.length <= _maxHistoryMessages
        ? history
        : history.sublist(history.length - _maxHistoryMessages);

    try {
      final messages = <LlamaChatMessage>[
        for (final message in recentHistory)
          LlamaChatMessage.fromText(
            role: message.role == AiConversationRole.user
                ? LlamaChatRole.user
                : LlamaChatRole.assistant,
            text: message.text,
          ),
        LlamaChatMessage.fromText(role: LlamaChatRole.user, text: userMessage),
      ];

      log(
        '[AiService] 发送消息, history: ${recentHistory.length}',
        name: 'LocalChat',
      );

      final stream = _engine!.create(
        messages,
        params: paramsFor(mode),
      );

      final buffer = StringBuffer();
      var inThink = false;
      await for (final chunk in stream) {
        final text = chunk.choices.firstOrNull?.delta.content ?? '';
        if (text.isEmpty) continue;
        // Track think-block state across deltas.
        if (inThink) {
          inThink = !text.contains('</think>');
        } else if (text.contains('<think>')) {
          inThink = !text.contains('</think>');
        }
        buffer.write(stripThinkBlocksDelta(text, inThink: inThink));
      }

      // Defensive final pass: even if state tracking missed a tag, scrub
      // any remaining <think>...</think> in the assembled text.
      final output = stripThinkBlocks(buffer.toString());
      log('[AiService] 回复成功, 长度: ${output.length}', name: 'LocalChat');

      return AiResponse(text: output);
    } catch (e, stackTrace) {
      log(
        '[AiService] 错误: $e',
        name: 'LocalChat',
        error: e,
        stackTrace: stackTrace,
      );
      return const AiResponse(text: '');
    }
  }

  void dispose() {
    _engine?.dispose();
    _engine = null;
    _isInitialized = false;
  }
}
