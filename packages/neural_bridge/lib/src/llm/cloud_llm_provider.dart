import 'llm_provider.dart';

enum CloudLLMBackend {
  zhipu,
  openAI,
  anthropic,
  custom,
}

class CloudLLMConfig {
  final CloudLLMBackend backend;
  final String apiKey;
  final String? baseUrl;
  final String model;
  final int maxTokens;

  const CloudLLMConfig({
    required this.backend,
    required this.apiKey,
    this.baseUrl,
    this.model = 'glm-4-flash',
    this.maxTokens = 4096,
  });

  String get effectiveBaseUrl {
    if (baseUrl != null) return baseUrl!;
    switch (backend) {
      case CloudLLMBackend.zhipu:
        return 'https://open.bigmodel.cn/api/paas/v4';
      case CloudLLMBackend.openAI:
        return 'https://api.openai.com/v1';
      case CloudLLMBackend.anthropic:
        return 'https://api.anthropic.com/v1';
      case CloudLLMBackend.custom:
        throw ArgumentError('Custom backend requires baseUrl');
    }
  }

  String get chatEndpoint {
    switch (backend) {
      case CloudLLMBackend.anthropic:
        return '$effectiveBaseUrl/messages';
      default:
        return '$effectiveBaseUrl/chat/completions';
    }
  }
}

class CloudLLMProvider extends LLMProvider {
  final CloudLLMConfig _config;

  CloudLLMProvider({required CloudLLMConfig config}) : _config = config;

  @override
  LLMProviderType get type => LLMProviderType.cloud;

  @override
  String get modelName => _config.model;

  @override
  bool get isAvailable => _config.apiKey.isNotEmpty;

  @override
  Future<void> initialize() async {}

  @override
  Future<void> dispose() async {}

  @override
  Future<LLMGenerateResult> generate(
    List<LLMMessage> messages, {
    LLMGenerateOptions? options,
  }) async {
    if (!isAvailable) {
      throw LLMProviderException(
        'CloudLLMProvider: API key not configured',
        providerName: modelName,
      );
    }

    final stopwatch = Stopwatch()..start();

    try {
      final text = _mockGenerate(messages);
      stopwatch.stop();

      return LLMGenerateResult(
        text: text,
        providerName: modelName,
        providerType: type,
        latency: stopwatch.elapsed,
      );
    } catch (e) {
      throw LLMProviderException(
        'Cloud LLM generation failed: $e',
        providerName: modelName,
      );
    }
  }

  String _mockGenerate(List<LLMMessage> messages) {
    final lastUserMsg = messages.lastWhere(
      (m) => m.role == LLMRole.user,
      orElse: () => const LLMMessage(role: LLMRole.user, content: ''),
    );
    return '[Cloud:${_config.model}] Echo: ${lastUserMsg.content.substring(0, lastUserMsg.content.length.clamp(0, 50))}';
  }
}
