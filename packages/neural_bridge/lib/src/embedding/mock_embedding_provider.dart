import 'dart:math';
import 'embedding_provider.dart';

class MockEmbeddingProvider extends EmbeddingProvider {
  final int _dimensions;
  final Random _random;

  MockEmbeddingProvider({
    int dimensions = 256,
    int? seed,
  })  : _dimensions = dimensions,
        _random = Random(seed);

  @override
  EmbeddingProviderType get type => EmbeddingProviderType.mock;

  @override
  String get modelName => 'mock-embedding';

  @override
  int get rawDimensions => _dimensions;

  @override
  int get outputDimensions => _dimensions;

  @override
  bool get isAvailable => true;

  @override
  Future<List<double>> embed(String text) async {
    return _generateVector(text);
  }

  @override
  Future<List<List<double>>> embedBatch(List<String> texts) async {
    return texts.map((t) => _generateVector(t)).toList();
  }

  List<double> _generateVector(String text) {
    final seed = text.hashCode ^ _random.nextInt(1 << 32);
    final rng = Random(seed);
    final vector = List.generate(_dimensions, (_) => rng.nextDouble() * 2 - 1);
    final norm = sqrt(vector.fold(0.0, (sum, v) => sum + v * v));
    if (norm < 1e-10) return vector;
    return vector.map((v) => v / norm).toList();
  }
}
