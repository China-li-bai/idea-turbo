import 'dart:developer';

import 'package:llamadart/llamadart.dart';

class AiResponse {
  final String text;

  const AiResponse({required this.text});
}

class AiService {
  static const _maxHistoryPairs = 2;

  LlamaEngine? _engine;
  String? _modelPath;
  bool _isInitialized = false;
  final List<LlamaChatMessage> _chatHistory = [];

  bool get isInitialized => _isInitialized;

  Future<void> initialize(String modelPath) async {
    if (_modelPath == modelPath && _isInitialized) return;

    _engine?.dispose();
    _isInitialized = false;
    _modelPath = modelPath;
    _chatHistory.clear();

    _engine = LlamaEngine(LlamaBackend());
    await _engine!.loadModel(
      modelPath,
      modelParams: const ModelParams(contextSize: 4096, gpuLayers: 0),
    );

    _isInitialized = true;
  }

  Future<AiResponse> generateResponse(String userMessage) async {
    if (!_isInitialized || _engine == null) {
      log('[AiService] 未初始化', name: 'Zhenyue');
      return const AiResponse(text: '*沉默*');
    }

    try {
      final messages = <LlamaChatMessage>[
        ..._chatHistory,
        LlamaChatMessage.fromText(role: LlamaChatRole.user, text: userMessage),
      ];

      log(
        '[AiService] 发送消息, history: ${_chatHistory.length}, memory: disabled, prompt: disabled',
        name: 'Zhenyue',
      );

      final stream = _engine!.create(
        messages,
        params: const GenerationParams(maxTokens: 96, temp: 0.45),
      );

      final buffer = StringBuffer();
      await for (final chunk in stream) {
        final text = chunk.choices.firstOrNull?.delta.content ?? '';
        buffer.write(text);
      }

      final rawOutput = _sanitizeModelOutput(buffer.toString());

      _chatHistory.add(
        LlamaChatMessage.fromText(role: LlamaChatRole.user, text: userMessage),
      );
      _chatHistory.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.assistant,
          text: rawOutput,
        ),
      );

      final maxHistory = _maxHistoryPairs * 2;
      if (_chatHistory.length > maxHistory) {
        _chatHistory.removeRange(0, _chatHistory.length - maxHistory);
      }

      log('[AiService] 回复成功, 长度: ${rawOutput.length}', name: 'Zhenyue');

      return AiResponse(text: rawOutput);
    } catch (e, stackTrace) {
      log(
        '[AiService] 错误: $e',
        name: 'Zhenyue',
        error: e,
        stackTrace: stackTrace,
      );
      return const AiResponse(text: '... 我的思绪断了。');
    }
  }

  String _sanitizeModelOutput(String output) {
    var text = output.trim();
    text = text.replaceFirst(RegExp(r'^(助手|镇岳|AI|assistant)\s*[:：]\s*'), '');

    final stopMarkers = [
      '\n用户:',
      '\n用户：',
      '\nUser:',
      '\n我回应:',
      '\n我回应：',
      '\nAssistant:',
      '\n助手:',
      '\n助手：',
    ];
    var end = text.length;
    for (final marker in stopMarkers) {
      final index = text.indexOf(marker);
      if (index >= 0 && index < end) end = index;
    }

    return text.substring(0, end).trim();
  }

  void dispose() {
    _engine?.dispose();
    _engine = null;
    _isInitialized = false;
  }
}
