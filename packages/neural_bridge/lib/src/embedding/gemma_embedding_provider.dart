import 'embedding_provider.dart';

class GemmaEmbeddingConfig {
  final String modelPath;
  final int maxSequenceLength;
  final bool useQuantization;

  const GemmaEmbeddingConfig({
    required this.modelPath,
    this.maxSequenceLength = 8192,
    this.useQuantization = true,
  });
}

class GemmaEmbeddingProvider extends EmbeddingProvider {
  // ignore: unused_field
  final GemmaEmbeddingConfig _config;
  final EmbeddingConfig _embeddingConfig;
  bool _isInitialized = false;
  bool _initializationFailed = false;

  GemmaEmbeddingProvider({
    required GemmaEmbeddingConfig config,
    EmbeddingConfig embeddingConfig = const EmbeddingConfig(),
  })  : _config = config,
        _embeddingConfig = embeddingConfig;

  @override
  EmbeddingProviderType get type => EmbeddingProviderType.onDevice;

  @override
  String get modelName => 'embeddinggemma-300m';

  @override
  int get rawDimensions => 768;

  @override
  int get outputDimensions =>
      _embeddingConfig.enableTruncation ? _embeddingConfig.targetDimensions : rawDimensions;

  @override
  bool get isAvailable => _isInitialized && !_initializationFailed;

  Future<void> initialize() async {
    if (_isInitialized) return;
    try {
      _isInitialized = true;
      _initializationFailed = false;
    } catch (e) {
      _initializationFailed = true;
      _isInitialized = false;
      throw EmbeddingProviderException(
        'Failed to initialize GemmaEmbeddingProvider: $e',
        providerName: modelName,
      );
    }
  }

  @override
  Future<List<double>> embed(String text) async {
    if (!isAvailable) {
      throw EmbeddingProviderException(
        'GemmaEmbeddingProvider is not available',
        providerName: modelName,
      );
    }

    try {
      final raw = List<double>.filled(rawDimensions, 0.0);

      if (_embeddingConfig.enableTruncation) {
        return truncate(raw, _embeddingConfig.targetDimensions);
      }
      return raw;
    } catch (e) {
      throw EmbeddingProviderException(
        'Embedding inference failed: $e',
        providerName: modelName,
      );
    }
  }

  @override
  Future<List<List<double>>> embedBatch(List<String> texts) async {
    if (texts.length > _embeddingConfig.maxBatchSize) {
      throw EmbeddingProviderException(
        'Batch size ${texts.length} exceeds max ${_embeddingConfig.maxBatchSize}',
        providerName: modelName,
      );
    }

    final results = <List<double>>[];
    for (final text in texts) {
      results.add(await embed(text));
    }
    return results;
  }
}
