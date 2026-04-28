import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/services/consolidation_engine.dart';

MemoryItem _createMemory({
  String id = 'test-id',
  MemoryType type = MemoryType.episodic,
  String content = 'test content',
  List<double> embedding = const [0.1, 0.2, 0.3],
  DateTime? createdAt,
  int accessCount = 5,
  double importance = 0.7,
  List<String> entities = const [],
  List<String> topics = const [],
  bool isConsolidated = false,
}) {
  final now = DateTime.now();
  return MemoryItem(
    id: id,
    content: content,
    type: type,
    embedding: embedding,
    createdAt: createdAt ?? now.subtract(const Duration(hours: 48)),
    accessCount: accessCount,
    importance: importance,
    entities: entities,
    topics: topics,
    isConsolidated: isConsolidated,
  );
}

ConsolidationCandidate _createCandidate({
  List<MemoryItem>? memories,
  List<double> centroid = const [0.5, 0.5, 0.5],
  double similarityScore = 0.9,
  double combinedImportance = 0.7,
  List<String> sharedEntities = const [],
  List<String> sharedTopics = const [],
}) {
  return ConsolidationCandidate(
    memories: memories ?? [_createMemory(id: 'm1')],
    centroid: centroid,
    similarityScore: similarityScore,
    combinedImportance: combinedImportance,
    sharedEntities: sharedEntities,
    sharedTopics: sharedTopics,
  );
}

void main() {
  group('ConsolidationEngine', () {
    group('default values', () {
      test('should have sensible defaults', () {
        final engine = ConsolidationEngine();
        expect(engine.minMemories, equals(3));
        expect(engine.similarityThreshold, equals(0.75));
        expect(engine.minAccessCount, equals(2));
        expect(engine.minAgeHours, equals(24.0));
        expect(engine.maxClusterSize, equals(10));
        expect(engine.preserveSourceMemories, isTrue);
      });
    });

    group('findConsolidationCandidates', () {
      test('empty list should return no candidates', () {
        final engine = ConsolidationEngine();
        final candidates = engine.findConsolidationCandidates([], DateTime.now());
        expect(candidates, isEmpty);
      });

      test('too few memories should return no candidates', () {
        final engine = ConsolidationEngine(minMemories: 3);
        final memories = [_createMemory(id: 'm1'), _createMemory(id: 'm2')];
        final candidates = engine.findConsolidationCandidates(memories, DateTime.now());
        expect(candidates, isEmpty);
      });

      test('already consolidated memories should be excluded', () {
        final engine = ConsolidationEngine(minMemories: 2);
        final memories = [
          _createMemory(id: 'm1', isConsolidated: true),
          _createMemory(id: 'm2', isConsolidated: true),
          _createMemory(id: 'm3'),
        ];
        final candidates = engine.findConsolidationCandidates(memories, DateTime.now());
        expect(candidates, isEmpty);
      });

      test('non-episodic memories should be excluded', () {
        final engine = ConsolidationEngine(minMemories: 2);
        final memories = [
          _createMemory(id: 'm1', type: MemoryType.semantic),
          _createMemory(id: 'm2', type: MemoryType.preference),
          _createMemory(id: 'm3'),
        ];
        final candidates = engine.findConsolidationCandidates(memories, DateTime.now());
        expect(candidates, isEmpty);
      });

      test('too recent memories should be excluded', () {
        final engine = ConsolidationEngine(minMemories: 2, minAgeHours: 24);
        final now = DateTime.now();
        final memories = [
          _createMemory(id: 'm1', createdAt: now.subtract(const Duration(hours: 1))),
          _createMemory(id: 'm2', createdAt: now.subtract(const Duration(hours: 2))),
          _createMemory(id: 'm3', createdAt: now.subtract(const Duration(hours: 48))),
        ];
        final candidates = engine.findConsolidationCandidates(memories, now);
        expect(candidates, isEmpty);
      });

      test('similar memories should form a cluster', () {
        final engine = ConsolidationEngine(minMemories: 2, similarityThreshold: 0.9);
        final memories = [
          _createMemory(id: 'm1', embedding: [1.0, 0.0, 0.0]),
          _createMemory(id: 'm2', embedding: [0.99, 0.01, 0.0]),
          _createMemory(id: 'm3', embedding: [0.98, 0.02, 0.0]),
        ];
        final candidates = engine.findConsolidationCandidates(memories, DateTime.now());
        expect(candidates.length, equals(1));
        expect(candidates.first.memories.length, equals(3));
        expect(candidates.first.centroid.length, equals(3));
        expect(candidates.first.similarityScore, greaterThan(0.0));
      });

      test('dissimilar memories should not cluster', () {
        final engine = ConsolidationEngine(minMemories: 2, similarityThreshold: 0.9);
        final memories = [
          _createMemory(id: 'm1', embedding: [1.0, 0.0, 0.0]),
          _createMemory(id: 'm2', embedding: [0.0, 1.0, 0.0]),
          _createMemory(id: 'm3', embedding: [0.0, 0.0, 1.0]),
        ];
        final candidates = engine.findConsolidationCandidates(memories, DateTime.now());
        expect(candidates, isEmpty);
      });

      test('memories without embeddings should be excluded', () {
        final engine = ConsolidationEngine(minMemories: 2);
        final memories = [
          _createMemory(id: 'm1', embedding: []),
          _createMemory(id: 'm2', embedding: [0.1, 0.2]),
          _createMemory(id: 'm3', embedding: [0.1, 0.2]),
        ];
        final candidates = engine.findConsolidationCandidates(memories, DateTime.now());
        expect(candidates.length, equals(1));
      });

      test('low access count memories should be excluded', () {
        final engine = ConsolidationEngine(minMemories: 2, minAccessCount: 5);
        final memories = [
          _createMemory(id: 'm1', accessCount: 1),
          _createMemory(id: 'm2', accessCount: 2),
          _createMemory(id: 'm3', accessCount: 10),
        ];
        final candidates = engine.findConsolidationCandidates(memories, DateTime.now());
        expect(candidates, isEmpty);
      });
    });

    group('calculateCentroid', () {
      test('single embedding should be its own centroid', () {
        final engine = ConsolidationEngine();
        final centroid = engine.calculateCentroid([
          [1.0, 2.0, 3.0]
        ]);
        expect(centroid, equals([1.0, 2.0, 3.0]));
      });

      test('multiple embeddings should average to centroid', () {
        final engine = ConsolidationEngine();
        final centroid = engine.calculateCentroid([
          [1.0, 0.0],
          [0.0, 1.0],
        ]);
        expect(centroid, equals([0.5, 0.5]));
      });

      test('empty embeddings should return empty', () {
        final engine = ConsolidationEngine();
        expect(engine.calculateCentroid([]), isEmpty);
      });

      test('three embeddings should average correctly', () {
        final engine = ConsolidationEngine();
        final centroid = engine.calculateCentroid([
          [3.0],
          [6.0],
          [9.0],
        ]);
        expect(centroid, equals([6.0]));
      });
    });

    group('findSharedItems', () {
      test('no shared items should return empty list', () {
        final engine = ConsolidationEngine();
        final shared = engine.findSharedItems([
          ['a'],
          ['b'],
          ['c']
        ]);
        expect(shared, isEmpty);
      });

      test('items in all lists should be returned', () {
        final engine = ConsolidationEngine();
        final shared = engine.findSharedItems([
          ['a', 'b'],
          ['a', 'c'],
          ['a', 'd'],
        ]);
        expect(shared, contains('a'));
      });

      test('empty lists should return empty', () {
        final engine = ConsolidationEngine();
        expect(engine.findSharedItems([]), isEmpty);
        expect(engine.findSharedItems([[], []]), isEmpty);
      });

      test('should not return items only in some lists', () {
        final engine = ConsolidationEngine();
        final shared = engine.findSharedItems([
          ['a', 'b'],
          ['a', 'b'],
          ['a', 'c'],
        ]);
        expect(shared, contains('a'));
        expect(shared, isNot(contains('b')));
        expect(shared, isNot(contains('c')));
      });

      test('items in majority of lists should be returned', () {
        final engine = ConsolidationEngine();
        final shared = engine.findSharedItems([
          ['a'],
          ['a'],
          ['b'],
        ]);
        expect(shared, contains('a'));
        expect(shared, isNot(contains('b')));
      });
    });

    group('shouldConsolidate', () {
      test('should return true when all criteria met', () {
        final engine = ConsolidationEngine(minMemories: 2);
        final candidate = _createCandidate(
          memories: [_createMemory(id: 'm1'), _createMemory(id: 'm2'), _createMemory(id: 'm3')],
          similarityScore: 0.9,
          combinedImportance: 0.7,
        );
        expect(engine.shouldConsolidate(candidate), isTrue);
      });

      test('should return false with too few memories', () {
        final engine = ConsolidationEngine(minMemories: 5);
        final candidate = _createCandidate(
          memories: [_createMemory(id: 'm1'), _createMemory(id: 'm2')],
          similarityScore: 0.9,
          combinedImportance: 0.7,
        );
        expect(engine.shouldConsolidate(candidate), isFalse);
      });

      test('should return false with low similarity', () {
        final engine = ConsolidationEngine(minMemories: 2, similarityThreshold: 0.9);
        final candidate = _createCandidate(
          memories: [_createMemory(id: 'm1'), _createMemory(id: 'm2'), _createMemory(id: 'm3')],
          similarityScore: 0.5,
          combinedImportance: 0.7,
        );
        expect(engine.shouldConsolidate(candidate), isFalse);
      });

      test('should return false with low importance', () {
        final engine = ConsolidationEngine(minMemories: 2);
        final candidate = _createCandidate(
          memories: [_createMemory(id: 'm1'), _createMemory(id: 'm2'), _createMemory(id: 'm3')],
          similarityScore: 0.9,
          combinedImportance: 0.1,
        );
        expect(engine.shouldConsolidate(candidate, minImportance: 0.5), isFalse);
      });
    });

    group('consolidate', () {
      test('should create a result with correct source IDs', () {
        final engine = ConsolidationEngine();
        final memories = [
          _createMemory(id: 'm1', content: 'content 1'),
          _createMemory(id: 'm2', content: 'content 2'),
          _createMemory(id: 'm3', content: 'content 3'),
        ];
        final candidate = _createCandidate(
          memories: memories,
          sharedEntities: ['Alice'],
          sharedTopics: ['work'],
        );

        final result = engine.consolidate(candidate, contentGenerator: (memories) => 'summary');

        expect(result.sourceMemoryIds.length, equals(3));
        expect(result.combinedImportance, equals(0.7));
        expect(result.sharedEntities, contains('Alice'));
        expect(result.sharedTopics, contains('work'));
        expect(result.memoryType, equals('semantic'));
        expect(result.centroidEmbedding, isNotEmpty);
        expect(result.consolidationTimestamp, isNotNull);
      });

      test('custom content generator should be used', () {
        final engine = ConsolidationEngine();
        final candidate = _createCandidate(
          memories: [_createMemory(id: 'm1', content: 'original')],
        );

        final result = engine.consolidate(candidate, contentGenerator: (_) => 'custom summary');

        expect(result.contentSummary, equals('custom summary'));
      });

      test('default content summary should deduplicate', () {
        final engine = ConsolidationEngine();
        final candidate = _createCandidate(
          memories: [
            _createMemory(id: 'm1', content: 'same'),
            _createMemory(id: 'm2', content: 'same'),
          ],
        );

        final result = engine.consolidate(candidate);

        expect(result.contentSummary, equals('same'));
      });

      test('default content summary should join unique contents', () {
        final engine = ConsolidationEngine();
        final candidate = _createCandidate(
          memories: [
            _createMemory(id: 'm1', content: 'content 1'),
            _createMemory(id: 'm2', content: 'content 2'),
          ],
        );

        final result = engine.consolidate(candidate);

        expect(result.contentSummary, contains('content 1'));
        expect(result.contentSummary, contains('content 2'));
      });

      test('consolidated memory ID should be generated', () {
        final engine = ConsolidationEngine();
        final candidate = _createCandidate();

        final result = engine.consolidate(candidate);

        expect(result.consolidatedMemoryId, startsWith('consolidated_'));
      });

      test('should increment consolidation count', () {
        final engine = ConsolidationEngine();
        final candidate = _createCandidate();

        engine.consolidate(candidate);
        engine.consolidate(candidate);

        final stats = engine.getConsolidationStats();
        expect(stats['totalConsolidations'], equals(2));
      });
    });

    group('getConsolidationStats', () {
      test('should return initial stats', () {
        final engine = ConsolidationEngine();
        final stats = engine.getConsolidationStats();

        expect(stats['totalConsolidations'], equals(0));
      });
    });
  });
}
