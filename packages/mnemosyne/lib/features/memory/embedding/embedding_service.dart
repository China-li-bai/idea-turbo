abstract class EmbeddingService {
  Future<List<double>> embed(String text);
  Future<List<List<double>>> embedBatch(List<String> texts);
  int get dimension;
  String get modelName;
}

class EmbeddingResult {
  final String text;
  final List<double> vector;
  final int dimension;
  final String model;
  final Duration latency;

  const EmbeddingResult({
    required this.text,
    required this.vector,
    required this.dimension,
    required this.model,
    required this.latency,
  });

  double cosineSimilarity(List<double> other) {
    if (vector.length != other.length) return 0.0;
    double dotProduct = 0.0;
    double normA = 0.0;
    double normB = 0.0;
    for (int i = 0; i < vector.length; i++) {
      dotProduct += vector[i] * other[i];
      normA += vector[i] * vector[i];
      normB += other[i] * other[i];
    }
    if (normA == 0.0 || normB == 0.0) return 0.0;
    return dotProduct / (sqrt(normA) * sqrt(normB));
  }

  static double sqrt(double x) {
    if (x <= 0) return 0.0;
    double guess = x / 2;
    for (int i = 0; i < 20; i++) {
      guess = (guess + x / guess) / 2;
    }
    return guess;
  }
}

class StubEmbeddingService implements EmbeddingService {
  final int _dimension;

  StubEmbeddingService({int dimension = 384}) : _dimension = dimension;

  @override
  Future<List<double>> embed(String text) async {
    return List.generate(_dimension, (i) => (text.hashCode * (i + 1) % 1000) / 1000.0);
  }

  @override
  Future<List<List<double>>> embedBatch(List<String> texts) async {
    return Future.wait(texts.map((t) => embed(t)));
  }

  @override
  int get dimension => _dimension;

  @override
  String get modelName => 'stub-embedding';
}
