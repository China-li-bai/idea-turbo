import 'llm_provider.dart';
import 'llamafu_provider.dart';
import 'cloud_llm_provider.dart';
import 'mock_llm_provider.dart';

export 'llm_provider.dart';
export 'llamafu_provider.dart';
export 'cloud_llm_provider.dart';
export 'mock_llm_provider.dart';

class LLMService {
  final List<LLMProvider> _providers;
  final Duration timeout;
  LLMProvider? _activeProvider;

  LLMService({
    required List<LLMProvider> providers,
    this.timeout = const Duration(seconds: 60),
  }) : _providers = providers {
    _providers.sort((a, b) => a.type.index.compareTo(b.type.index));
  }

  factory LLMService.withFallbacks({
    LlamafuConfig? llamafuConfig,
    CloudLLMConfig? cloudConfig,
    bool useMock = false,
    Duration timeout = const Duration(seconds: 60),
  }) {
    final providers = <LLMProvider>[];

    if (llamafuConfig != null) {
      providers.add(LlamafuProvider(config: llamafuConfig));
    }

    if (cloudConfig != null) {
      providers.add(CloudLLMProvider(config: cloudConfig));
    }

    if (useMock || providers.isEmpty) {
      providers.add(MockLLMProvider());
    }

    return LLMService(providers: providers, timeout: timeout);
  }

  Future<void> initialize() async {
    for (final provider in _providers) {
      try {
        await provider.initialize();
      } catch (_) {}
    }
    _activeProvider = _providers.firstWhere(
      (p) => p.isAvailable,
      orElse: () => _providers.last,
    );
  }

  Future<LLMGenerateResult> generate(
    List<LLMMessage> messages, {
    LLMGenerateOptions? options,
  }) async {
    for (final provider in _providers) {
      if (!provider.isAvailable) continue;
      try {
        final result = await provider
            .generate(messages, options: options)
            .timeout(timeout);
        _activeProvider = provider;
        return result;
      } catch (e) {
        continue;
      }
    }
    throw LLMProviderException(
      'All LLM providers failed',
      providerName: 'LLMService',
    );
  }

  Stream<LLMGenerateResult> generateStream(
    List<LLMMessage> messages, {
    LLMGenerateOptions? options,
  }) {
    final active = _activeProvider ?? _providers.firstWhere(
      (p) => p.isAvailable,
      orElse: () => _providers.last,
    );
    return active.generateStream(messages, options: options);
  }

  Future<void> dispose() async {
    for (final provider in _providers) {
      try {
        await provider.dispose();
      } catch (_) {}
    }
  }

  LLMProvider? get activeProvider => _activeProvider;

  List<LLMProvider> get availableProviders =>
      _providers.where((p) => p.isAvailable).toList();
}
