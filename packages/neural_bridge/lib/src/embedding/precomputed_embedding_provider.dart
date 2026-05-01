import 'dart:convert';
import 'dart:io';
import '../embedding/embedding_provider.dart';
import '../bridge/embedding_source.dart';

class PrecomputedEmbeddingProvider implements EmbeddingProvider {
  final Map<String, List<double>> _cache768;
  final int _targetDimensions;
  bool _isAvailable;

  PrecomputedEmbeddingProvider._({
    required Map<String, List<double>> cache768,
    required int targetDimensions,
  })  : _cache768 = cache768,
        _targetDimensions = targetDimensions,
        _isAvailable = cache768.isNotEmpty;

  static Future<PrecomputedEmbeddingProvider> load({
    required String jsonPath,
    int targetDimensions = 256,
    String dimKey = 'dim_768',
  }) async {
    final file = File(jsonPath);
    if (!await file.exists()) {
      return PrecomputedEmbeddingProvider._(
        cache768: {},
        targetDimensions: targetDimensions,
      );
    }

    final content = await file.readAsString();
    final Map<String, dynamic> data = jsonDecode(content);

    final cache768 = <String, List<double>>{};
    for (final entry in data.entries) {
      final text = entry.key;
      final dimData = entry.value as Map<String, dynamic>;
      if (dimData.containsKey(dimKey)) {
        final rawList = dimData[dimKey] as List;
        cache768[text] = rawList.map((e) => (e as num).toDouble()).toList();
      }
    }

    return PrecomputedEmbeddingProvider._(
      cache768: cache768,
      targetDimensions: targetDimensions,
    );
  }

  @override
  EmbeddingProviderType get type => EmbeddingProviderType.onDevice;

  @override
  String get modelName => 'embeddinggemma-300m-precomputed';

  @override
  int get rawDimensions => 768;

  @override
  int get outputDimensions => _targetDimensions;

  @override
  bool get isAvailable => _isAvailable;

  @override
  Future<List<double>> embed(String text) async {
    final full = _cache768[text];
    if (full == null) {
      final bestMatch = _findBestMatch(text);
      if (bestMatch != null) {
        return _truncateAndRenormalize(bestMatch);
      }
      throw EmbeddingProviderException(
        'No precomputed embedding for text: "${text.substring(0, text.length.clamp(0, 50))}"',
        providerName: modelName,
      );
    }
    return _truncateAndRenormalize(full);
  }

  @override
  Future<List<List<double>>> embedBatch(List<String> texts) async {
    return Future.wait(texts.map((t) => embed(t)));
  }

  List<double> _truncateAndRenormalize(List<double> full) {
    if (full.length <= _targetDimensions) return full;
    final truncated = full.sublist(0, _targetDimensions);
    double norm = 0;
    for (final v in truncated) {
      norm += v * v;
    }
    norm = norm == 0 ? 1.0 : norm;
    final sqrtNorm = sqrt(norm);
    return truncated.map((v) => v / sqrtNorm).toList();
  }

  String? _findBestMatch(String text) {
    final normalized = text.trim();
    for (final key in _cache768.keys) {
      if (key.trim() == normalized) return key;
    }
    return null;
  }

  bool hasEmbedding(String text) => _cache768.containsKey(text) || _findBestMatch(text) != null;

  int get cacheSize => _cache768.length;
}

double sqrt(double x) {
  if (x <= 0) return 0;
  double guess = x / 2;
  for (int i = 0; i < 20; i++) {
    guess = (guess + x / guess) / 2;
  }
  return guess;
}

class PrecomputedEmbeddingSource implements EmbeddingSource {
  final PrecomputedEmbeddingProvider _provider;

  PrecomputedEmbeddingSource(this._provider);

  static Future<PrecomputedEmbeddingSource> load({
    required String jsonPath,
    int targetDimensions = 256,
  }) async {
    final provider = await PrecomputedEmbeddingProvider.load(
      jsonPath: jsonPath,
      targetDimensions: targetDimensions,
    );
    return PrecomputedEmbeddingSource(provider);
  }

  @override
  Future<EmbeddingResult?> embed(String text) async {
    try {
      final vector = await _provider.embed(text);
      return EmbeddingResult(
        vector: vector,
        providerName: _provider.modelName,
        providerType: _provider.type,
        dimensions: vector.length,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  int get outputDimensions => _provider.outputDimensions;

  bool hasEmbedding(String text) => _provider.hasEmbedding(text);
  int get cacheSize => _provider.cacheSize;
}
