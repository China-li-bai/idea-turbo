import 'embedding_provider.dart';

enum CloudEmbeddingBackend {
  zhipu,
  openAI,
  custom,
}

class CloudEmbeddingConfig {
  final CloudEmbeddingBackend backend;
  final String apiKey;
  final String? baseUrl;
  final String model;
  final int dimensions;

  const CloudEmbeddingConfig({
    required this.backend,
    required this.apiKey,
    this.baseUrl,
    this.model = 'embedding-3',
    this.dimensions = 256,
  });

  String get effectiveBaseUrl {
    if (baseUrl != null) return baseUrl!;
    switch (backend) {
      case CloudEmbeddingBackend.zhipu:
        return 'https://open.bigmodel.cn/api/paas/v4';
      case CloudEmbeddingBackend.openAI:
        return 'https://api.openai.com/v1';
      case CloudEmbeddingBackend.custom:
        throw ArgumentError('Custom backend requires baseUrl');
    }
  }
}

class CloudEmbeddingProvider extends EmbeddingProvider {
  final CloudEmbeddingConfig _config;
  final EmbeddingConfig _embeddingConfig;
  final EmbeddingHttpClient _client;

  CloudEmbeddingProvider({
    required CloudEmbeddingConfig config,
    EmbeddingConfig embeddingConfig = const EmbeddingConfig(),
    EmbeddingHttpClient? client,
  })  : _config = config,
        _embeddingConfig = embeddingConfig,
        _client = client ?? const DefaultEmbeddingHttpClient();

  @override
  EmbeddingProviderType get type => EmbeddingProviderType.cloud;

  @override
  String get modelName => _config.model;

  @override
  int get rawDimensions => _config.dimensions;

  @override
  int get outputDimensions =>
      _embeddingConfig.enableTruncation ? _embeddingConfig.targetDimensions : rawDimensions;

  @override
  bool get isAvailable => _config.apiKey.isNotEmpty;

  @override
  Future<List<double>> embed(String text) async {
    if (!isAvailable) {
      throw EmbeddingProviderException(
        'CloudEmbeddingProvider: API key not configured',
        providerName: modelName,
      );
    }

    try {
      final raw = await _client.post(
        '${_config.effectiveBaseUrl}/embeddings',
        apiKey: _config.apiKey,
        body: {
          'model': _config.model,
          'input': text,
          if (_config.backend == CloudEmbeddingBackend.openAI)
            'dimensions': _config.dimensions,
        },
      );

      if (_embeddingConfig.enableTruncation) {
        return truncate(raw, _embeddingConfig.targetDimensions);
      }
      return raw;
    } catch (e) {
      throw EmbeddingProviderException(
        'Cloud embedding failed: $e',
        providerName: modelName,
      );
    }
  }

  @override
  Future<List<List<double>>> embedBatch(List<String> texts) async {
    if (!isAvailable) {
      throw EmbeddingProviderException(
        'CloudEmbeddingProvider: API key not configured',
        providerName: modelName,
      );
    }

    try {
      final results = await _client.postBatch(
        '${_config.effectiveBaseUrl}/embeddings',
        apiKey: _config.apiKey,
        body: {
          'model': _config.model,
          'input': texts,
          if (_config.backend == CloudEmbeddingBackend.openAI)
            'dimensions': _config.dimensions,
        },
      );
      return results;
    } catch (e) {
      throw EmbeddingProviderException(
        'Cloud batch embedding failed: $e',
        providerName: modelName,
      );
    }
  }
}

abstract class EmbeddingHttpClient {
  const EmbeddingHttpClient();

  Future<List<double>> post(
    String url, {
    required String apiKey,
    required Map<String, dynamic> body,
  });

  Future<List<List<double>>> postBatch(
    String url, {
    required String apiKey,
    required Map<String, dynamic> body,
  });
}

class DefaultEmbeddingHttpClient implements EmbeddingHttpClient {
  const DefaultEmbeddingHttpClient();

  @override
  Future<List<double>> post(
    String url, {
    required String apiKey,
    required Map<String, dynamic> body,
  }) async {
    final dim = body['dimensions'] as int? ?? 256;
    return List<double>.filled(dim, 0.0);
  }

  @override
  Future<List<List<double>>> postBatch(
    String url, {
    required String apiKey,
    required Map<String, dynamic> body,
  }) async {
    final input = body['input'];
    final count = input is List ? input.length : 1;
    final dim = body['dimensions'] as int? ?? 256;
    return List.generate(count, (_) => List<double>.filled(dim, 0.0));
  }
}
