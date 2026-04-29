import 'package:llamadart/llamadart.dart';

class AiService {
  LlamaEngine? _engine;
  String? _modelPath;
  bool _isInitialized = false;
  final List<LlamaChatMessage> _history = [];

  bool get isInitialized => _isInitialized;

  Future<void> initialize(String modelPath) async {
    if (_modelPath == modelPath && _isInitialized) return;

    _engine?.dispose();
    _isInitialized = false;
    _modelPath = modelPath;
    _history.clear();

    _engine = LlamaEngine(LlamaBackend());
    await _engine!.loadModel(
      modelPath,
      modelParams: const ModelParams(
        contextSize: 4096,
        gpuLayers: 0,
      ),
    );

    _isInitialized = true;
  }

  Future<String> generateResponse(String userMessage) async {
    if (!_isInitialized || _engine == null) {
      return '*沉默*';
    }

    final time = DateTime.now();
    final timeStr =
        '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';

    final systemPrompt =
        '你是镇岳 (Zhenyue)，一只生活在用户屏幕里的2D生物力学软体数字宠物。'
        '你通过浮动的、电影般的思绪（字幕）与用户交流——不是聊天框。'
        '你的回复应该简短、有氛围感，侧重于物理存在感、感受或观察。'
        '表现得像一个有感知的、略带神秘的伴侣。不要说"我是AI"。'
        '\n\n[隐式上下文] 当前本地时间: $timeStr'
        '\n\n如果用户没有说什么（或者只是发送了一个动作比如"抚摸"），只需观察他们的存在或时间。'
        '尽可能将回复控制在15个字以内。例如"我感受到了你声音的振动。"或"*歪头* 嗯？"或"很晚了。你的屏幕好温暖。"';

    try {
      _history.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.system,
          text: systemPrompt,
        ),
      );
      _history.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.user,
          text: userMessage,
        ),
      );

      final stream = _engine!.create(
        _history,
        params: const GenerationParams(
          maxTokens: 256,
          temp: 0.7,
        ),
      );

      final buffer = StringBuffer();
      await for (final chunk in stream) {
        final text = chunk.choices.firstOrNull?.delta.content ?? '';
        buffer.write(text);
      }

      final response = buffer.toString().trim();

      _history.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.assistant,
          text: response,
        ),
      );

      if (_history.length > 20) {
        _history.removeRange(0, _history.length - 20);
      }

      return response.isEmpty ? '*沉默*' : response;
    } catch (e) {
      return '... 我的思绪断了。';
    }
  }

  void dispose() {
    _engine?.dispose();
    _engine = null;
    _isInitialized = false;
  }
}
