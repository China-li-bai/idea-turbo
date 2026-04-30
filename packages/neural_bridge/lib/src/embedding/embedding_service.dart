import 'embedding_provider.dart';
import 'gemma_embedding_provider.dart';
import 'cloud_embedding_provider.dart';
import 'mock_embedding_provider.dart';

export 'embedding_provider.dart';
export 'gemma_embedding_provider.dart';
export 'cloud_embedding_provider.dart';
export 'mock_embedding_provider.dart';

class EmbeddingService {
  final EmbeddingConfig config;
  final List<EmbeddingProvider> _providers;
  EmbeddingProvider? _activeProvider;

  EmbeddingService({
    this.config = const EmbeddingConfig(),
    required List<EmbeddingProvider> providers,
  }) : _providers = providers {
    _providers.sort((a, b) => a.type.index.compareTo(b.type.index));
  }

  factory EmbeddingService.withFallbacks({
    EmbeddingConfig config = const EmbeddingConfig(),
    GemmaEmbeddingConfig? gemmaConfig,
    CloudEmbeddingConfig? cloudConfig,
    bool useMock = false,
  }) {
    final providers = <EmbeddingProvider>[];

    if (gemmaConfig != null) {
      providers.add(GemmaEmbeddingProvider(
        config: gemmaConfig,
        embeddingConfig: config,
      ));
    }

    if (cloudConfig != null) {
      providers.add(CloudEmbeddingProvider(
        config: cloudConfig,
        embeddingConfig: config,
      ));
    }

    if (useMock || providers.isEmpty) {
      providers.add(MockEmbeddingProvider(dimensions: config.targetDimensions));
    }

    return EmbeddingService(config: config, providers: providers);
  }

  int get outputDimensions => config.targetDimensions;

  Future<void> initialize() async {
    for (final provider in _providers) {
      if (provider is GemmaEmbeddingProvider) {
        try {
          await provider.initialize();
        } catch (_) {}
      }
    }
    _activeProvider = _providers.firstWhere(
      (p) => p.isAvailable,
      orElse: () => _providers.last,
    );
  }

  Future<EmbeddingResult> embed(String text) async {
    for (final provider in _providers) {
      if (!provider.isAvailable) continue;
      try {
        final vector = await provider.embed(text).timeout(config.timeout);
        _activeProvider = provider;
        return EmbeddingResult(
          vector: vector,
          providerName: provider.modelName,
          providerType: provider.type,
          dimensions: vector.length,
        );
      } catch (e) {
        continue;
      }
    }
    throw EmbeddingProviderException(
      'All embedding providers failed for text: "${text.substring(0, text.length.clamp(0, 50))}"',
      providerName: 'EmbeddingService',
    );
  }

  Future<List<EmbeddingResult>> embedBatch(List<String> texts) async {
    for (final provider in _providers) {
      if (!provider.isAvailable) continue;
      try {
        final vectors = await provider.embedBatch(texts).timeout(config.timeout);
        _activeProvider = provider;
        return List.generate(
          texts.length,
          (i) => EmbeddingResult(
            vector: vectors[i],
            providerName: provider.modelName,
            providerType: provider.type,
            dimensions: vectors[i].length,
          ),
        );
      } catch (e) {
        continue;
      }
    }
    throw EmbeddingProviderException(
      'All embedding providers failed for batch of ${texts.length} texts',
      providerName: 'EmbeddingService',
    );
  }

  EmbeddingProvider? get activeProvider => _activeProvider;

  List<EmbeddingProvider> get availableProviders =>
      _providers.where((p) => p.isAvailable).toList();
}
