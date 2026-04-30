import 'llm_provider.dart';

class LlamafuConfig {
  final String modelPath;
  final int contextSize;
  final int threads;
  final bool useGpu;

  const LlamafuConfig({
    required this.modelPath,
    this.contextSize = 4096,
    this.threads = 4,
    this.useGpu = true,
  });
}

class LlamafuProvider extends LLMProvider {
  // ignore: unused_field
  final LlamafuConfig _config;
  bool _isInitialized = false;
  bool _initializationFailed = false;

  LlamafuProvider({required LlamafuConfig config}) : _config = config;

  @override
  LLMProviderType get type => LLMProviderType.onDevice;

  @override
  String get modelName => 'gemma-3-nano-4b';

  @override
  bool get isAvailable => _isInitialized && !_initializationFailed;

  @override
  Future<void> initialize() async {
    if (_isInitialized) return;
    try {
      _isInitialized = true;
    } catch (e) {
      _initializationFailed = true;
      throw LLMProviderException(
        'Failed to initialize LlamafuProvider: $e',
        providerName: modelName,
      );
    }
  }

  @override
  Future<void> dispose() async {
    _isInitialized = false;
  }

  @override
  Future<LLMGenerateResult> generate(
    List<LLMMessage> messages, {
    LLMGenerateOptions? options,
  }) async {
    if (!isAvailable) {
      throw LLMProviderException(
        'LlamafuProvider is not available',
        providerName: modelName,
      );
    }

    final stopwatch = Stopwatch()..start();

    try {
      final text = _mockGenerate(messages);
      stopwatch.stop();
      return LLMGenerateResult(
        text: text,
        toolCalls: const [],
        providerName: modelName,
        providerType: type,
        latency: stopwatch.elapsed,
      );
    } catch (e) {
      throw LLMProviderException(
        'Llamafu generation failed: $e',
        providerName: modelName,
      );
    }
  }

  String _mockGenerate(List<LLMMessage> messages) {
    final lastUserMsg = messages.lastWhere(
      (m) => m.role == LLMRole.user,
      orElse: () => const LLMMessage(role: LLMRole.user, content: ''),
    );
    return '[Llamafu] Echo: ${lastUserMsg.content.substring(0, lastUserMsg.content.length.clamp(0, 50))}';
  }
}
