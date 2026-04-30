import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:neural_bridge/neural_bridge.dart';

List<double> _generateUnitVector(int dim, int seed) {
  final rng = Random(seed);
  final v = List.generate(dim, (_) => rng.nextDouble() * 2 - 1);
  final norm = sqrt(v.fold(0.0, (s, x) => s + x * x));
  return v.map((x) => x / norm).toList();
}

void main() {
  group('GemmaEmbeddingProvider', () {
    group('initialization', () {
      test('should fail initialization without inferenceCallback', () async {
        final provider = GemmaEmbeddingProvider(
          config: const GemmaEmbeddingConfig(),
        );
        expect(provider.isAvailable, isFalse);
        expect(
          () => provider.initialize(),
          throwsA(isA<EmbeddingProviderException>()),
        );
      });

      test('should initialize successfully with inferenceCallback', () async {
        final provider = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async => _generateUnitVector(768, text.hashCode),
          ),
        );
        await provider.initialize();
        expect(provider.isAvailable, isTrue);
      });

      test('should report correct dimensions', () async {
        final provider = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async => _generateUnitVector(768, text.hashCode),
          ),
        );
        expect(provider.rawDimensions, equals(768));
        expect(provider.outputDimensions, equals(256));
        expect(provider.modelName, equals('embeddinggemma-300m'));
        expect(provider.type, equals(EmbeddingProviderType.onDevice));
      });

      test('should not reinitialize if already initialized', () async {
        final callCount = <int>[0];
        final provider = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async {
              callCount[0]++;
              return _generateUnitVector(768, text.hashCode);
            },
          ),
        );
        await provider.initialize();
        await provider.initialize();
        expect(callCount[0], equals(0));
      });
    });

    group('embedding generation', () {
      late GemmaEmbeddingProvider provider;

      setUp(() async {
        provider = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async => _generateUnitVector(768, text.hashCode),
          ),
        );
        await provider.initialize();
      });

      test('should return 256-dim vector with MRL truncation enabled', () async {
        final result = await provider.embed('Hello world');
        expect(result.length, equals(256));
      });

      test('should return 768-dim vector with MRL truncation disabled', () async {
        final providerNoTruncation = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async => _generateUnitVector(768, text.hashCode),
          ),
          embeddingConfig: const EmbeddingConfig(
            enableTruncation: false,
          ),
        );
        await providerNoTruncation.initialize();
        final result = await providerNoTruncation.embed('Hello world');
        expect(result.length, equals(768));
      });

      test('should produce L2-normalized output', () async {
        final result = await provider.embed('test normalization');
        final norm = sqrt(result.fold(0.0, (s, x) => s + x * x));
        expect(norm, closeTo(1.0, 0.01));
      });

      test('should normalize before truncation (MRL invariant)', () async {
        final rawVector = List.generate(768, (i) => (i + 1).toDouble());
        final provider = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async => rawVector,
          ),
        );
        await provider.initialize();

        final result256 = await provider.embed('test');
        expect(result256.length, equals(256));

        final norm256 = sqrt(result256.fold(0.0, (s, x) => s + x * x));
        expect(norm256, closeTo(1.0, 0.01));
      });

      test('should throw when not available', () async {
        final dead = GemmaEmbeddingProvider(
          config: const GemmaEmbeddingConfig(),
        );
        expect(
          () => dead.embed('test'),
          throwsA(isA<EmbeddingProviderException>()),
        );
      });

      test('should handle empty text', () async {
        final result = await provider.embed('');
        expect(result.length, equals(256));
        final norm = sqrt(result.fold(0.0, (s, x) => s + x * x));
        expect(norm, closeTo(1.0, 0.01));
      });

      test('should handle very long text (truncation)', () async {
        final longText = 'a' * 100000;
        final result = await provider.embed(longText);
        expect(result.length, equals(256));
      });
    });

    group('batch embedding', () {
      late GemmaEmbeddingProvider provider;

      setUp(() async {
        provider = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async => _generateUnitVector(768, text.hashCode),
          ),
        );
        await provider.initialize();
      });

      test('should embed multiple texts', () async {
        final results = await provider.embedBatch(['hello', 'world', 'test']);
        expect(results.length, equals(3));
        for (final r in results) {
          expect(r.length, equals(256));
        }
      });

      test('should reject oversized batch', () async {
        final texts = List.generate(33, (i) => 'text $i');
        expect(
          () => provider.embedBatch(texts),
          throwsA(isA<EmbeddingProviderException>()),
        );
      });
    });

    group('callback timeout', () {
      test('should timeout if callback takes too long', () async {
        final provider = GemmaEmbeddingProvider(
          config: GemmaEmbeddingConfig(
            inferenceCallback: (text) async {
              await Future.delayed(const Duration(seconds: 10));
              return _generateUnitVector(768, 0);
            },
          ),
          embeddingConfig: const EmbeddingConfig(
            timeout: Duration(milliseconds: 100),
          ),
        );
        await provider.initialize();
        expect(
          () => provider.embed('slow'),
          throwsA(isA<EmbeddingProviderException>()),
        );
      });
    });
  });

  group('EmbeddingService', () {
    group('fallback chain', () {
      test('should use on-device provider first', () async {
        final service = EmbeddingService.withFallbacks(
          config: const EmbeddingConfig(),
          gemmaConfig: GemmaEmbeddingConfig(
            inferenceCallback: (text) async => _generateUnitVector(768, text.hashCode),
          ),
          cloudConfig: CloudEmbeddingConfig(
            backend: CloudEmbeddingBackend.zhipu,
            apiKey: 'test-key',
          ),
        );
        await service.initialize();
        final result = await service.embed('test');
        expect(result.providerType, equals(EmbeddingProviderType.onDevice));
        expect(result.dimensions, equals(256));
      });

      test('should fallback to cloud when on-device fails', () async {
        final service = EmbeddingService.withFallbacks(
          config: const EmbeddingConfig(),
          gemmaConfig: const GemmaEmbeddingConfig(),
          cloudConfig: CloudEmbeddingConfig(
            backend: CloudEmbeddingBackend.zhipu,
            apiKey: 'test-key',
          ),
        );
        await service.initialize();
        final result = await service.embed('test');
        expect(result.providerType, equals(EmbeddingProviderType.cloud));
      });

      test('should fallback to mock when all real providers fail', () async {
        final service = EmbeddingService.withFallbacks(
          config: const EmbeddingConfig(),
        );
        await service.initialize();
        final result = await service.embed('test');
        expect(result.providerType, equals(EmbeddingProviderType.mock));
        expect(result.dimensions, equals(256));
      });

      test('should throw when all providers fail in non-mock setup', () async {
        final service = EmbeddingService(
          providers: [
            GemmaEmbeddingProvider(config: const GemmaEmbeddingConfig()),
          ],
        );
        expect(
          () => service.embed('test'),
          throwsA(isA<EmbeddingProviderException>()),
        );
      });
    });

    group('batch operations', () {
      test('should embed batch with consistent dimensions', () async {
        final service = EmbeddingService.withFallbacks(
          config: const EmbeddingConfig(),
        );
        await service.initialize();
        final results = await service.embedBatch(['a', 'b', 'c']);
        expect(results.length, equals(3));
        for (final r in results) {
          expect(r.dimensions, equals(256));
        }
      });
    });
  });

  group('FlutterGemmaAdapter', () {
    test('should create config with callback', () {
      final config = FlutterGemmaAdapter.createConfig(
        getEmbedding: (text) async => _generateUnitVector(768, 0),
      );
      expect(config.inferenceCallback, isNotNull);
    });

    test('should create config with all options', () {
      final config = FlutterGemmaAdapter.createConfig(
        getEmbedding: (text) async => _generateUnitVector(768, 0),
        maxSequenceLength: 4096,
        modelAssetPath: 'custom/path/',
        huggingFaceToken: 'hf_test',
      );
      expect(config.maxSequenceLength, equals(4096));
      expect(config.modelAssetPath, equals('custom/path/'));
      expect(config.huggingFaceToken, equals('hf_test'));
    });
  });

  group('MRL Truncation Invariants', () {
    test('truncated vector should be L2-normalized and direction-preserving', () async {
      final fullVector = _generateUnitVector(768, 42);
      final provider = GemmaEmbeddingProvider(
        config: GemmaEmbeddingConfig(
          inferenceCallback: (text) async => fullVector,
        ),
        embeddingConfig: const EmbeddingConfig(
          enableTruncation: false,
        ),
      );
      await provider.initialize();

      final fullResult = await provider.embed('test');
      expect(fullResult.length, equals(768));

      final truncatedProvider = GemmaEmbeddingProvider(
        config: GemmaEmbeddingConfig(
          inferenceCallback: (text) async => fullVector,
        ),
      );
      await truncatedProvider.initialize();

      final truncatedResult = await truncatedProvider.embed('test');
      expect(truncatedResult.length, equals(256));

      final truncNorm = sqrt(truncatedResult.fold(0.0, (s, x) => s + x * x));
      expect(truncNorm, closeTo(1.0, 0.01));

      double cosineSim(List<double> a, List<double> b) {
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          na += a[i] * a[i];
          nb += b[i] * b[i];
        }
        return dot / (sqrt(na) * sqrt(nb));
      }

      final prefixSim = cosineSim(
        truncatedResult,
        fullResult.sublist(0, 256),
      );
      expect(prefixSim, greaterThan(0.95));
    });

    test('truncated vectors should preserve cosine similarity', () async {
      final vec1 = _generateUnitVector(768, 1);
      final vec2 = _generateUnitVector(768, 2);

      double cosineSim(List<double> a, List<double> b) {
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          na += a[i] * a[i];
          nb += b[i] * b[i];
        }
        return dot / (sqrt(na) * sqrt(nb));
      }

      final fullSim = cosineSim(vec1, vec2);

      final provider1 = GemmaEmbeddingProvider(
        config: GemmaEmbeddingConfig(inferenceCallback: (t) async => vec1),
      );
      final provider2 = GemmaEmbeddingProvider(
        config: GemmaEmbeddingConfig(inferenceCallback: (t) async => vec2),
      );
      await provider1.initialize();
      await provider2.initialize();

      final trunc1 = await provider1.embed('a');
      final trunc2 = await provider2.embed('b');
      final truncSim = cosineSim(trunc1, trunc2);

      expect((truncSim - fullSim).abs(), lessThan(0.15));
    });
  });
}
