import 'dart:math';
import 'embedding_provider.dart';

typedef OnDeviceEmbeddingCallback = Future<List<double>> Function(String text);

class GemmaEmbeddingConfig {
  final OnDeviceEmbeddingCallback? inferenceCallback;
  final int maxSequenceLength;
  final String modelAssetPath;
  final String? huggingFaceToken;

  const GemmaEmbeddingConfig({
    this.inferenceCallback,
    this.maxSequenceLength = 8192,
    this.modelAssetPath = 'assets/models/embeddinggemma-300m/',
    this.huggingFaceToken,
  });
}

class GemmaEmbeddingProvider extends EmbeddingProvider {
  final GemmaEmbeddingConfig _config;
  final EmbeddingConfig _embeddingConfig;
  bool _isInitialized = false;
  bool _initializationFailed = false;
  String? _initError;

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
      if (_config.inferenceCallback == null) {
        _initializationFailed = true;
        _initError = 'No inferenceCallback provided. '
            'App layer must supply a callback that wraps flutter_gemma or flutter_onnxruntime.';
        throw EmbeddingProviderException(
          _initError!,
          providerName: modelName,
        );
      }

      _isInitialized = true;
      _initializationFailed = false;
    } catch (e) {
      _initializationFailed = true;
      _isInitialized = false;
      if (e is EmbeddingProviderException) rethrow;
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
        _initError ?? 'GemmaEmbeddingProvider is not available',
        providerName: modelName,
      );
    }

    try {
      final truncatedText = _truncateText(text);
      final raw = await _config.inferenceCallback!(truncatedText)
          .timeout(_embeddingConfig.timeout);

      final normalized = _l2Normalize(raw);

      if (_embeddingConfig.enableTruncation) {
        final truncated = truncate(normalized, _embeddingConfig.targetDimensions);
        return _l2Normalize(truncated);
      }
      return normalized;
    } catch (e) {
      if (e is EmbeddingProviderException) rethrow;
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

  String _truncateText(String text) {
    final charLimit = _config.maxSequenceLength * 4;
    if (text.length <= charLimit) return text;
    return text.substring(0, charLimit);
  }

  List<double> _l2Normalize(List<double> vector) {
    final norm = sqrt(vector.fold(0.0, (sum, v) => sum + v * v));
    if (norm < 1e-10) return vector;
    return vector.map((v) => v / norm).toList();
  }
}
