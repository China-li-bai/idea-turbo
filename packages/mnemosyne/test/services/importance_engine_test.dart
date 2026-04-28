import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/services/importance_engine.dart';

MemoryItem _createMemory({
  String id = 'test-id',
  DateTime? createdAt,
  DateTime? accessedAt,
  int accessCount = 0,
  double emotionalValence = 0.0,
  double surpriseScore = 0.0,
  MemorySource source = MemorySource.conversation,
  List<String> entities = const [],
  Map<String, dynamic>? metadata,
  bool isPinned = false,
}) {
  final now = DateTime.now();
  return MemoryItem(
    id: id,
    content: 'test content',
    createdAt: createdAt ?? now,
    accessedAt: accessedAt ?? createdAt ?? now,
    accessCount: accessCount,
    emotionalValence: emotionalValence,
    surpriseScore: surpriseScore,
    source: source,
    entities: entities,
    metadata: metadata,
    isPinned: isPinned,
  );
}

void main() {
  group('ImportanceEngine', () {
    group('default values', () {
      test('should have sensible defaults', () {
        final engine = ImportanceEngine();
        expect(engine.recencyWeight, equals(0.15));
        expect(engine.accessRecencyWeight, equals(0.05));
        expect(engine.frequencyWeight, equals(0.15));
        expect(engine.emotionalWeight, equals(0.2));
        expect(engine.surpriseWeight, equals(0.15));
        expect(engine.entityWeight, equals(0.08));
        expect(engine.topicWeight, equals(0.02));
        expect(engine.explicitWeight, equals(0.2));
      });

      test('should accept custom values', () {
        final engine = ImportanceEngine(
          recencyWeight: 0.3,
          frequencyWeight: 0.2,
          recencyHalfLifeHours: 48.0,
        );
        expect(engine.recencyWeight, equals(0.3));
        expect(engine.frequencyWeight, equals(0.2));
        expect(engine.recencyHalfLifeHours, equals(48.0));
      });
    });

    group('recency score', () {
      test('recently created memory should have high recency score', () {
        final engine = ImportanceEngine();
        final now = DateTime.now();
        final memory = _createMemory(createdAt: now);

        final result = engine.calculateImportance(memory, now);

        expect(result.recencyScore, closeTo(1.0, 0.01));
      });

      test('old memory should have lower recency score', () {
        final engine = ImportanceEngine(recencyHalfLifeHours: 24.0);
        final now = DateTime.now();
        final memory = _createMemory(createdAt: now.subtract(const Duration(hours: 48)));

        final result = engine.calculateImportance(memory, now);

        expect(result.recencyScore, closeTo(0.25, 0.05));
      });

      test('score should halve after one half-life', () {
        final engine = ImportanceEngine(recencyHalfLifeHours: 24.0);
        final now = DateTime.now();
        final memory = _createMemory(createdAt: now.subtract(const Duration(hours: 24)));

        final result = engine.calculateImportance(memory, now);

        expect(result.recencyScore, closeTo(0.5, 0.01));
      });
    });

    group('frequency score', () {
      test('zero access should have zero frequency score', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(accessCount: 0);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.frequencyScore, equals(0.0));
      });

      test('high access count should have high frequency score', () {
        final engine = ImportanceEngine(frequencySaturation: 10);
        final memory = _createMemory(accessCount: 10);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.frequencyScore, closeTo(1.0, 0.01));
      });

      test('frequency score should saturate at 1.0', () {
        final engine = ImportanceEngine(frequencySaturation: 10);
        final memory = _createMemory(accessCount: 100);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.frequencyScore, equals(1.0));
      });
    });

    group('emotional score', () {
      test('neutral emotion should give zero score', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(emotionalValence: 0.0);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.emotionalScore, equals(0.0));
      });

      test('strong positive emotion should give high score', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(emotionalValence: 0.8);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.emotionalScore, equals(0.8));
      });

      test('strong negative emotion should also give high score', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(emotionalValence: -0.9);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.emotionalScore, equals(0.9));
      });
    });

    group('surprise score', () {
      test('no surprise should give zero score', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(surpriseScore: 0.0);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.surpriseScore, equals(0.0));
      });

      test('surprise score should be clamped to [0, 1]', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(surpriseScore: 1.5);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.surpriseScore, equals(1.0));
      });
    });

    group('entity score', () {
      test('no entities should give zero score', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(entities: []);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.entityScore, equals(0.0));
      });

      test('many entities should give high score', () {
        final engine = ImportanceEngine(entitySaturation: 5);
        final memory = _createMemory(entities: ['Alice', 'Bob', 'Acme', 'NYC', 'Python']);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.entityScore, equals(1.0));
      });
    });

    group('explicit score', () {
      test('default explicit score should be 0.5', () {
        final engine = ImportanceEngine();
        final memory = _createMemory();

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.explicitScore, equals(0.5));
      });

      test('explicit importance parameter should override default', () {
        final engine = ImportanceEngine();
        final memory = _createMemory();

        final result = engine.calculateImportance(memory, DateTime.now(), explicitImportance: 0.9);

        expect(result.explicitScore, equals(0.9));
      });

      test('pinned memory should have explicit score of 1.0', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(isPinned: true);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.explicitScore, equals(1.0));
      });
    });

    group('source multiplier', () {
      test('user explicit source should have high multiplier', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(source: MemorySource.userExplicit);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.sourceMultiplier, closeTo(1.3636, 0.01));
      });

      test('conversation source should have lower multiplier', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(source: MemorySource.conversation);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.sourceMultiplier, closeTo(0.4, 0.01));
      });

      test('unknown source should use default base with trust weighting', () {
        final engine = ImportanceEngine(sourceWeights: {});
        final memory = _createMemory(source: MemorySource.conversation);

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.sourceMultiplier, closeTo(0.5, 0.01));
      });
    });

    group('importance result', () {
      test('final score should be clamped to [0, 1]', () {
        final engine = ImportanceEngine();
        final memory = _createMemory(
          source: MemorySource.userExplicit,
          accessCount: 100,
          emotionalValence: 1.0,
          surpriseScore: 1.0,
          entities: ['A', 'B', 'C', 'D', 'E', 'F'],
          isPinned: true,
        );

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.finalScore, lessThanOrEqualTo(1.0));
      });

      test('result should contain breakdown', () {
        final engine = ImportanceEngine();
        final memory = _createMemory();

        final result = engine.calculateImportance(memory, DateTime.now());

        expect(result.breakdown.containsKey('recency'), isTrue);
        expect(result.breakdown.containsKey('frequency'), isTrue);
        expect(result.breakdown.containsKey('emotional'), isTrue);
      });
    });

    group('convenience methods', () {
      test('getImportance should return just the score', () {
        final engine = ImportanceEngine();
        final memory = _createMemory();

        final score = engine.getImportance(memory, DateTime.now());

        expect(score, isA<double>());
        expect(score, greaterThanOrEqualTo(0.0));
        expect(score, lessThanOrEqualTo(1.0));
      });

      test('batchCalculateImportance should process multiple memories', () {
        final engine = ImportanceEngine();
        final now = DateTime.now();
        final memories = List.generate(
          5,
          (i) => _createMemory(id: 'm$i', createdAt: now.subtract(Duration(hours: i))),
        );

        final results = engine.batchCalculateImportance(memories, now);

        expect(results.length, equals(5));
      });

      test('rankByImportance should sort by score descending', () {
        final engine = ImportanceEngine();
        final now = DateTime.now();
        final memories = List.generate(
          5,
          (i) => _createMemory(id: 'm$i', createdAt: now.subtract(Duration(hours: i * 10))),
        );

        final ranked = engine.rankByImportance(memories, now);

        final scores = ranked.map((e) => e.value).toList();
        expect(scores, equals(scores..sort((a, b) => b.compareTo(a))));
      });

      test('rankByImportance should respect topK limit', () {
        final engine = ImportanceEngine();
        final now = DateTime.now();
        final memories = List.generate(10, (i) => _createMemory(id: 'm$i'));

        final ranked = engine.rankByImportance(memories, now, topK: 3);

        expect(ranked.length, equals(3));
      });

      test('filterByImportance should filter by range', () {
        final engine = ImportanceEngine();
        final now = DateTime.now();
        final memories = List.generate(
          10,
          (i) => _createMemory(
            id: 'm$i',
            createdAt: now.subtract(Duration(hours: i * 24)),
            accessCount: i,
          ),
        );

        final filtered = engine.filterByImportance(memories, 0.3, 0.7, now);

        for (final m in filtered) {
          final score = engine.getImportance(m, now);
          expect(score, greaterThanOrEqualTo(0.3));
          expect(score, lessThanOrEqualTo(0.7));
        }
      });
    });
  });
}
