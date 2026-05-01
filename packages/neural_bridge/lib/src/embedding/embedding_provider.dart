enum EmbeddingProviderType {
  onDevice,
  cloud,
  mock,
}

class EmbeddingConfig {
  final int targetDimensions;
  final bool enableTruncation;
  final Duration timeout;
  final int maxBatchSize;
  final int minMrlDimensions;

  const EmbeddingConfig({
    this.targetDimensions = 256,
    this.enableTruncation = true,
    this.timeout = const Duration(seconds: 30),
    this.maxBatchSize = 32,
    this.minMrlDimensions = 128,
  });

  bool get isDimensionSafe => targetDimensions >= minMrlDimensions;
}

class EmbeddingProviderException implements Exception {
  final String message;
  final String? providerName;

  const EmbeddingProviderException(this.message, {this.providerName});

  @override
  String toString() =>
      'EmbeddingProviderException(${providerName ?? "unknown"}): $message';
}

class EmbeddingResult {
  final List<double> vector;
  final String providerName;
  final EmbeddingProviderType providerType;
  final int dimensions;

  const EmbeddingResult({
    required this.vector,
    required this.providerName,
    required this.providerType,
    required this.dimensions,
  });
}

abstract class EmbeddingProvider {
  EmbeddingProviderType get type;
  String get modelName;
  int get rawDimensions;
  int get outputDimensions;
  bool get isAvailable;

  Future<List<double>> embed(String text);
  Future<List<List<double>>> embedBatch(List<String> texts);

  List<double> truncate(List<double> embedding, int targetDim, {int minDim = 128}) {
    if (targetDim < minDim) {
      targetDim = minDim;
    }
    if (embedding.length <= targetDim) return embedding;
    return embedding.sublist(0, targetDim);
  }
}
