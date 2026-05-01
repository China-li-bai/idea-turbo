import 'dart:convert';
import 'dart:io';
import 'dart:math' show sqrt;
import 'dart:typed_data';
import '../embedding/embedding_provider.dart';
import '../bridge/embedding_source.dart';

class PrecomputedEmbeddingProvider implements EmbeddingProvider {
  final Map<String, int> _textToIndex;
  final List<List<double>> _embeddings768;
  final int _targetDimensions;
  bool _isAvailable;

  PrecomputedEmbeddingProvider._({
    required Map<String, int> textToIndex,
    required List<List<double>> embeddings768,
    required int targetDimensions,
  })  : _textToIndex = textToIndex,
        _embeddings768 = embeddings768,
        _targetDimensions = targetDimensions,
        _isAvailable = embeddings768.isNotEmpty;

  static Future<PrecomputedEmbeddingProvider> load({
    required String basePath,
    int targetDimensions = 256,
    int minDimensions = 128,
  }) async {
    if (targetDimensions < minDimensions) {
      targetDimensions = minDimensions;
    }
    final textsFile = File('$basePath\_texts.json');
    final npyFile = File('$basePath\_dim768.npy');

    if (!await textsFile.exists() || !await npyFile.exists()) {
      return PrecomputedEmbeddingProvider._(
        textToIndex: {},
        embeddings768: [],
        targetDimensions: targetDimensions,
      );
    }

    final textsContent = await textsFile.readAsString();
    final List<dynamic> texts = jsonDecode(textsContent);

    final embeddings768 = await _loadNpy(npyFile);

    final textToIndex = <String, int>{};
    for (int i = 0; i < texts.length && i < embeddings768.length; i++) {
      textToIndex[texts[i] as String] = i;
    }

    return PrecomputedEmbeddingProvider._(
      textToIndex: textToIndex,
      embeddings768: embeddings768,
      targetDimensions: targetDimensions,
    );
  }

  static Future<List<List<double>>> _loadNpy(File file) async {
    final bytes = await file.readAsBytes();
    if (bytes.length < 10 || bytes[0] != 0x93) {
      throw FormatException('Not a valid .npy file');
    }

    final headerEnd = bytes.indexOf(0x0A) + 1;
    final headerStr = String.fromCharCodes(bytes.sublist(10, headerEnd - 1));

    final shapeMatch = RegExp(r"'shape':\s*\((\d+),\s*(\d+)\)").firstMatch(headerStr);
    if (shapeMatch == null) {
      throw FormatException('Cannot parse npy shape from header: $headerStr');
    }
    final rows = int.parse(shapeMatch.group(1)!);
    final cols = int.parse(shapeMatch.group(2)!);

    final isFloat32 = headerStr.contains('float32') ||
        headerStr.contains("<f4") ||
        headerStr.contains(">f4") ||
        headerStr.contains("|f4");
    final isFloat64 = headerStr.contains('float64') ||
        headerStr.contains("<f8") ||
        headerStr.contains(">f8") ||
        headerStr.contains("|f8");

    final dataBytes = bytes.sublist(headerEnd);
    final result = <List<double>>[];

    if (isFloat32) {
      final data = Float32List.view(dataBytes.buffer, dataBytes.offsetInBytes, rows * cols);
      for (int i = 0; i < rows; i++) {
        final row = <double>[];
        for (int j = 0; j < cols; j++) {
          row.add(data[i * cols + j].toDouble());
        }
        result.add(row);
      }
    } else if (isFloat64) {
      final data = Float64List.view(dataBytes.buffer, dataBytes.offsetInBytes, rows * cols);
      for (int i = 0; i < rows; i++) {
        final row = <double>[];
        for (int j = 0; j < cols; j++) {
          row.add(data[i * cols + j]);
        }
        result.add(row);
      }
    } else {
      throw FormatException('Unsupported npy dtype in header: $headerStr');
    }

    return result;
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
    final idx = _textToIndex[text];
    if (idx == null) {
      final matchIdx = _findBestMatchIndex(text);
      if (matchIdx >= 0) {
        return _truncateAndRenormalize(_embeddings768[matchIdx]);
      }
      throw EmbeddingProviderException(
        'No precomputed embedding for text: "${text.substring(0, text.length.clamp(0, 50))}"',
        providerName: modelName,
      );
    }
    return _truncateAndRenormalize(_embeddings768[idx]);
  }

  @override
  Future<List<List<double>>> embedBatch(List<String> texts) async {
    return Future.wait(texts.map((t) => embed(t)));
  }

  @override
  List<double> truncate(List<double> embedding, int targetDim, {int minDim = 128}) {
    if (targetDim < minDim) {
      targetDim = minDim;
    }
    if (embedding.length <= targetDim) return embedding;
    final truncated = embedding.sublist(0, targetDim);
    double normSq = 0;
    for (final v in truncated) {
      normSq += v * v;
    }
    if (normSq == 0) return truncated;
    final invNorm = 1.0 / sqrt(normSq);
    return truncated.map((v) => v * invNorm).toList();
  }

  List<double> _truncateAndRenormalize(List<double> full) {
    if (full.length <= _targetDimensions) return full;
    final truncated = full.sublist(0, _targetDimensions);
    double normSq = 0;
    for (final v in truncated) {
      normSq += v * v;
    }
    if (normSq == 0) return truncated;
    final invNorm = 1.0 / sqrt(normSq);
    return truncated.map((v) => v * invNorm).toList();
  }

  int _findBestMatchIndex(String text) {
    final normalized = text.trim();
    for (final entry in _textToIndex.entries) {
      if (entry.key.trim() == normalized) return entry.value;
    }
    return -1;
  }

  bool hasEmbedding(String text) =>
      _textToIndex.containsKey(text) || _findBestMatchIndex(text) >= 0;

  int get cacheSize => _textToIndex.length;
}

class PrecomputedEmbeddingSource implements EmbeddingSource {
  final PrecomputedEmbeddingProvider _provider;

  PrecomputedEmbeddingSource(this._provider);

  static Future<PrecomputedEmbeddingSource> load({
    required String basePath,
    int targetDimensions = 256,
    int minDimensions = 128,
  }) async {
    final provider = await PrecomputedEmbeddingProvider.load(
      basePath: basePath,
      targetDimensions: targetDimensions,
      minDimensions: minDimensions,
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
