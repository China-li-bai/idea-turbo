class LlmMessage {
  final String role;
  final String content;

  const LlmMessage({required this.role, required this.content});

  static const system = 'system';
  static const user = 'user';
  static const assistant = 'assistant';
}

class LlmResponse {
  final String content;
  final String model;
  final int promptTokens;
  final int completionTokens;
  final Duration latency;
  final bool success;
  final String? error;

  const LlmResponse({
    required this.content,
    required this.model,
    this.promptTokens = 0,
    this.completionTokens = 0,
    required this.latency,
    required this.success,
    this.error,
  });
}

class LlmConfig {
  final String model;
  final double temperature;
  final int maxTokens;
  final double topP;
  final List<Map<String, String>> defaultSystemMessages;

  const LlmConfig({
    required this.model,
    this.temperature = 0.7,
    this.maxTokens = 512,
    this.topP = 0.9,
    this.defaultSystemMessages = const [],
  });
}

abstract class EdgeLlmService {
  String get modelName;
  int get contextWindowSize;
  bool get isModelLoaded;
  Future<bool> loadModel(String modelPath);
  Future<void> unloadModel();
  Future<LlmResponse> generate(String prompt, {LlmConfig? config});
  Future<LlmResponse> chat(List<LlmMessage> messages, {LlmConfig? config});
}

abstract class CloudLlmService {
  String get modelName;
  String get endpoint;
  Future<LlmResponse> generate(String prompt, {LlmConfig? config});
  Future<LlmResponse> chat(List<LlmMessage> messages, {LlmConfig? config});
  Future<bool> healthCheck();
}

class StubEdgeLlmService implements EdgeLlmService {
  bool _loaded = false;
  String _modelPath = '';

  @override
  String get modelName => _modelPath.isNotEmpty ? _modelPath.split('/').last : 'stub-edge';

  @override
  int get contextWindowSize => 2048;

  @override
  bool get isModelLoaded => _loaded;

  @override
  Future<bool> loadModel(String modelPath) async {
    _modelPath = modelPath;
    _loaded = true;
    return true;
  }

  @override
  Future<void> unloadModel() async {
    _loaded = false;
  }

  @override
  Future<LlmResponse> generate(String prompt, {LlmConfig? config}) async {
    if (!_loaded) {
      return LlmResponse(
        content: '',
        model: modelName,
        latency: Duration.zero,
        success: false,
        error: 'Model not loaded',
      );
    }
    return LlmResponse(
      content: '[Stub Edge LLM] 收到消息，但端侧模型尚未实际部署。',
      model: modelName,
      latency: const Duration(milliseconds: 100),
      success: true,
    );
  }

  @override
  Future<LlmResponse> chat(List<LlmMessage> messages, {LlmConfig? config}) async {
    final lastUserMsg = messages.lastWhere((m) => m.role == LlmMessage.user, orElse: () => const LlmMessage(role: LlmMessage.user, content: ''));
    return generate(lastUserMsg.content, config: config);
  }
}

class StubCloudLlmService implements CloudLlmService {
  @override
  String get modelName => 'deepseek-v3-stub';

  @override
  String get endpoint => 'https://api.deepseek.com/v1';

  @override
  Future<LlmResponse> generate(String prompt, {LlmConfig? config}) async {
    return LlmResponse(
      content: '[Stub Cloud LLM] 云端大模型尚未实际对接。',
      model: modelName,
      latency: const Duration(milliseconds: 500),
      success: true,
    );
  }

  @override
  Future<LlmResponse> chat(List<LlmMessage> messages, {LlmConfig? config}) async {
    final lastUserMsg = messages.lastWhere((m) => m.role == LlmMessage.user, orElse: () => const LlmMessage(role: LlmMessage.user, content: ''));
    return generate(lastUserMsg.content, config: config);
  }

  @override
  Future<bool> healthCheck() async => true;
}
