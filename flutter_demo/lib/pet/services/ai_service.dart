import 'dart:developer';

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
    await _engine!.loadModel(
      modelPath,
      modelParams: const ModelParams(contextSize: 4096, gpuLayers: 0),
    );

    _isInitialized = true;
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
      await for (final chunk in stream) {
        final text = chunk.choices.firstOrNull?.delta.content ?? '';
        buffer.write(text);
      }

      final output = buffer.toString().trim();
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
