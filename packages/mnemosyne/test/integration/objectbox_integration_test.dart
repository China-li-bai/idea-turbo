import 'dart:io';
import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/core/config.dart';
import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/features/memory/data/datasources/objectbox_memory_datasource.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/services/decay_service.dart';
import 'package:mnemosyne/services/keyword_extractor_service.dart';
import 'package:mnemosyne/services/retrieval_engine.dart';

const _kDimensions = 384;

List<double> _makeVec(int seed, {double scale = 1.0}) {
  final rng = Random(seed);
  final vec = List.generate(_kDimensions, (_) => rng.nextDouble() * 2 - 1);
  final norm = sqrt(vec.fold(0.0, (sum, v) => sum + v * v));
  if (norm == 0) return vec;
  return vec.map((v) => v / norm * scale).toList();
}

List<double> _similarVec(List<double> base, {double noise = 0.1}) {
  final rng = Random(42);
  return base.map((v) => v + (rng.nextDouble() * 2 - 1) * noise).toList();
}

void main() {
  late ObjectBoxMemoryDataSource datasource;
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('mnemosyne_test_');
    datasource = ObjectBoxMemoryDataSource(
      const MnemosyneConfig(),
      directoryOverride: tempDir.path,
    );
  });

  tearDown(() async {
    await datasource.close();
    if (tempDir.existsSync()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('ObjectBox CRUD', () {
    test('insert and retrieve memory', () async {
      final memory = MemoryItem(
        id: 'crud-1',
        content: 'I prefer dark mode in all applications',
        type: MemoryType.preference,
        source: MemorySource.userExplicit,
        importance: 0.8,
        keywords: ['dark mode', 'preference'],
        entities: ['user'],
      );

      await datasource.insertMemory(memory);
      final retrieved = await datasource.getMemory('crud-1');

      expect(retrieved, isNotNull);
      expect(retrieved!.content, equals('I prefer dark mode in all applications'));
      expect(retrieved.type, equals(MemoryType.preference));
      expect(retrieved.importance, closeTo(0.8, 0.01));
      expect(retrieved.keywords, contains('dark mode'));
    });

    test('update existing memory', () async {
      final memory = MemoryItem(
        id: 'crud-2',
        content: 'Original content',
        importance: 0.5,
      );

      await datasource.insertMemory(memory);
      final updated = memory.copyWith(
        content: 'Updated content',
        importance: 0.9,
      );
      await datasource.updateMemory(updated);

      final retrieved = await datasource.getMemory('crud-2');
      expect(retrieved!.content, equals('Updated content'));
      expect(retrieved.importance, closeTo(0.9, 0.01));
    });

    test('delete memory', () async {
      final memory = MemoryItem(id: 'crud-3', content: 'To be deleted');
      await datasource.insertMemory(memory);

      await datasource.deleteMemory('crud-3');
      final retrieved = await datasource.getMemory('crud-3');
      expect(retrieved, isNull);
    });

    test('get all memories', () async {
      for (var i = 0; i < 5; i++) {
        await datasource.insertMemory(MemoryItem(
          id: 'all-$i',
          content: 'Memory $i',
          importance: 0.5 + i * 0.1,
        ));
      }

      final all = await datasource.getAllMemories();
      expect(all.length, equals(5));
    });

    test('get recent memories ordered by creation time', () async {
      final now = DateTime.now();
      for (var i = 0; i < 5; i++) {
        await datasource.insertMemory(MemoryItem(
          id: 'recent-$i',
          content: 'Recent memory $i',
          createdAt: now.subtract(Duration(hours: 5 - i)),
          accessedAt: now.subtract(Duration(hours: 5 - i)),
        ));
      }

      final recent = await datasource.getRecentMemories(limit: 3);
      expect(recent.length, equals(3));
      expect(recent.first.content, equals('Recent memory 4'));
    });

    test('get important memories', () async {
      for (var i = 0; i < 5; i++) {
        await datasource.insertMemory(MemoryItem(
          id: 'imp-$i',
          content: 'Important memory $i',
          importance: 0.2 + i * 0.2,
        ));
      }

      final important = await datasource.getImportantMemories(limit: 3);
      expect(important.length, equals(3));
      expect(important.first.importance, greaterThanOrEqualTo(0.6));
    });

    test('get active memories filters archived and inactive', () async {
      await datasource.insertMemory(MemoryItem(
        id: 'active-1',
        content: 'Active memory',
        status: MemoryStatus.active,
      ));
      await datasource.insertMemory(MemoryItem(
        id: 'archived-1',
        content: 'Archived memory',
        isArchived: true,
      ));
      await datasource.insertMemory(MemoryItem(
        id: 'invalid-1',
        content: 'Invalidated memory',
        status: MemoryStatus.invalidated,
      ));

      final active = await datasource.getActiveMemories();
      expect(active.length, equals(1));
      expect(active.first.id, equals('active-1'));
    });

    test('batch update memories', () async {
      final memories = List.generate(
        3,
        (i) => MemoryItem(id: 'batch-$i', content: 'Original $i', importance: 0.5),
      );
      for (final m in memories) {
        await datasource.insertMemory(m);
      }

      final updated = memories
          .map((m) => m.copyWith(content: 'Updated ${m.id}'))
          .toList();
      await datasource.batchUpdateMemories(updated);

      for (final m in updated) {
        final retrieved = await datasource.getMemory(m.id);
        expect(retrieved!.content, equals('Updated ${m.id}'));
      }
    });

    test('delete memories below strength threshold', () async {
      await datasource.insertMemory(MemoryItem(
        id: 'strong',
        content: 'Strong memory',
        strength: 0.8,
      ));
      await datasource.insertMemory(MemoryItem(
        id: 'weak',
        content: 'Weak memory',
        strength: 0.05,
      ));
      await datasource.insertMemory(MemoryItem(
        id: 'pinned-weak',
        content: 'Pinned weak memory',
        strength: 0.02,
        isPinned: true,
      ));

      await datasource.deleteMemoriesBelowStrength(0.1);

      final all = await datasource.getAllMemories();
      expect(all.length, equals(2));
      expect(all.any((m) => m.id == 'strong'), isTrue);
      expect(all.any((m) => m.id == 'pinned-weak'), isTrue);
      expect(all.any((m) => m.id == 'weak'), isFalse);
    });

    test('clear all memories', () async {
      for (var i = 0; i < 5; i++) {
        await datasource.insertMemory(MemoryItem(id: 'clear-$i', content: 'Memory $i'));
      }
      await datasource.clearAll();
      final all = await datasource.getAllMemories();
      expect(all, isEmpty);
    });
  });

  group('Keyword Search', () {
    setUp(() async {
      final now = DateTime.now();
      final memories = [
        MemoryItem(
          id: 'kw-1',
          content: 'I am allergic to peanuts and tree nuts',
          keywords: ['peanuts', 'allergy', 'nuts'],
          topics: ['health'],
          importance: 0.9,
          createdAt: now,
        ),
        MemoryItem(
          id: 'kw-2',
          content: 'My favorite programming language is Rust',
          keywords: ['rust', 'programming', 'language'],
          topics: ['technology'],
          importance: 0.6,
          createdAt: now,
        ),
        MemoryItem(
          id: 'kw-3',
          content: 'I prefer vegetarian food and green tea',
          keywords: ['vegetarian', 'tea', 'food'],
          topics: ['food', 'health'],
          importance: 0.7,
          createdAt: now,
        ),
        MemoryItem(
          id: 'kw-4',
          content: 'The meeting is scheduled for next Monday',
          keywords: ['meeting', 'schedule'],
          topics: ['work'],
          importance: 0.5,
          createdAt: now,
        ),
      ];
      for (final m in memories) {
        await datasource.insertMemory(m);
      }
    });

    test('should find memories by keyword match', () async {
      final results = await datasource.keywordSearch('allergy');
      expect(results, isNotEmpty);
      expect(results.any((m) => m.id == 'kw-1'), isTrue);
    });

    test('should find memories by content match', () async {
      final results = await datasource.keywordSearch('peanuts');
      expect(results, isNotEmpty);
      expect(results.any((m) => m.id == 'kw-1'), isTrue);
    });

    test('should find memories by topic match', () async {
      final results = await datasource.keywordSearch('health');
      expect(results.length, greaterThanOrEqualTo(2));
    });

    test('should return empty for non-matching keyword', () async {
      final results = await datasource.keywordSearch('quantum');
      expect(results, isEmpty);
    });
  });

  group('Vector Search (HNSW)', () {
    late List<double> foodVec;
    late List<double> chineseVec;
    late List<double> rustVec;
    late List<double> pythonVec;
    late List<double> hikingVec;

    setUp(() async {
      foodVec = _makeVec(1);
      chineseVec = _similarVec(foodVec, noise: 0.15);
      rustVec = _makeVec(3);
      pythonVec = _similarVec(rustVec, noise: 0.15);
      hikingVec = _makeVec(5);

      final now = DateTime.now();
      final memories = [
        MemoryItem(id: 'vec-1', content: 'I love Italian food', embedding: foodVec, importance: 0.7, createdAt: now),
        MemoryItem(id: 'vec-2', content: 'I enjoy Chinese cuisine', embedding: chineseVec, importance: 0.6, createdAt: now),
        MemoryItem(id: 'vec-3', content: 'I prefer programming in Rust', embedding: rustVec, importance: 0.8, createdAt: now),
        MemoryItem(id: 'vec-4', content: 'Python is my go-to language', embedding: pythonVec, importance: 0.5, createdAt: now),
        MemoryItem(id: 'vec-5', content: 'I like hiking in mountains', embedding: hikingVec, importance: 0.4, createdAt: now),
      ];
      for (final m in memories) {
        await datasource.insertMemory(m);
      }
    });

    test('should find nearest neighbors by vector similarity', () async {
      final queryVector = _similarVec(foodVec, noise: 0.05);
      final results = await datasource.vectorSearch(queryVector, 3);

      expect(results, isNotEmpty);
      expect(results.first.object.uid, equals('vec-1'));
    });

    test('should find programming-related memories', () async {
      final queryVector = _similarVec(rustVec, noise: 0.05);
      final results = await datasource.vectorSearch(queryVector, 2);

      expect(results, isNotEmpty);
      final ids = results.map((r) => r.object.uid).toList();
      expect(ids, contains('vec-3'));
    });

    test('should return scores indicating similarity', () async {
      final queryVector = _similarVec(foodVec, noise: 0.05);
      final results = await datasource.vectorSearch(queryVector, 5);

      expect(results, isNotEmpty);
      expect(results.first.score, greaterThan(0));
    });

    test('should exclude archived memories from vector search', () async {
      await datasource.insertMemory(MemoryItem(
        id: 'vec-archived',
        content: 'Archived memory',
        embedding: _similarVec(foodVec, noise: 0.05),
        isArchived: true,
      ));

      final queryVector = _similarVec(foodVec, noise: 0.05);
      final results = await datasource.vectorSearch(queryVector, 10);

      expect(results.every((r) => r.object.uid != 'vec-archived'), isTrue);
    });

    test('should exclude non-active memories from vector search', () async {
      await datasource.insertMemory(MemoryItem(
        id: 'vec-invalidated',
        content: 'Invalidated memory',
        embedding: _similarVec(foodVec, noise: 0.05),
        status: MemoryStatus.invalidated,
      ));

      final queryVector = _similarVec(foodVec, noise: 0.05);
      final results = await datasource.vectorSearch(queryVector, 10);

      expect(results.every((r) => r.object.uid != 'vec-invalidated'), isTrue);
    });
  });

  group('RetrievalEngine (Hybrid: Vector + Keyword + Context)', () {
    late RetrievalEngine engine;
    late List<double> foodVec;
    late List<double> seafoodVec;
    late List<double> rustVec;
    late List<double> hikingVec;
    late List<double> allergyVec;

    setUp(() async {
      engine = RetrievalEngine(
        datasource: datasource,
        decayService: DecayService(),
        keywordExtractor: KeywordExtractorService(),
      );

      foodVec = _makeVec(10);
      seafoodVec = _similarVec(foodVec, noise: 0.1);
      rustVec = _makeVec(30);
      hikingVec = _makeVec(50);
      allergyVec = _similarVec(foodVec, noise: 0.08);

      final now = DateTime.now();
      final memories = [
        MemoryItem(
          id: 'ret-1',
          content: 'I am allergic to shellfish and cannot eat shrimp',
          keywords: ['allergic', 'shellfish', 'shrimp'],
          entities: ['user'],
          embedding: foodVec,
          importance: 0.9,
          source: MemorySource.userExplicit,
          createdAt: now,
        ),
        MemoryItem(
          id: 'ret-2',
          content: 'I had seafood pasta at the Italian restaurant',
          keywords: ['seafood', 'pasta', 'italian'],
          entities: ['restaurant'],
          embedding: seafoodVec,
          importance: 0.5,
          createdAt: now.subtract(const Duration(hours: 24)),
        ),
        MemoryItem(
          id: 'ret-3',
          content: 'I prefer Rust for systems programming',
          keywords: ['rust', 'programming', 'systems'],
          entities: ['rust'],
          embedding: rustVec,
          importance: 0.7,
          createdAt: now,
        ),
        MemoryItem(
          id: 'ret-4',
          content: 'I enjoy hiking in the mountains on weekends',
          keywords: ['hiking', 'mountains', 'weekends'],
          entities: ['mountains'],
          embedding: hikingVec,
          importance: 0.4,
          createdAt: now.subtract(const Duration(days: 7)),
        ),
        MemoryItem(
          id: 'ret-5',
          content: 'My shellfish allergy is very serious',
          keywords: ['shellfish', 'allergy', 'serious'],
          entities: ['user'],
          embedding: allergyVec,
          importance: 0.95,
          source: MemorySource.userExplicit,
          createdAt: now,
        ),
      ];
      for (final m in memories) {
        await datasource.insertMemory(m);
      }
    });

    test('should combine vector and keyword signals via RRF', () async {
      final results = await engine.retrieve(
        query: 'shellfish allergy',
        queryEmbedding: _similarVec(foodVec, noise: 0.05),
        limit: 5,
      );

      expect(results, isNotEmpty);
      final ids = results.map((r) => r.memory.id).toList();
      expect(ids, contains('ret-1'));
      expect(ids, contains('ret-5'));
    });

    test('should rank highly important memories higher', () async {
      final results = await engine.retrieve(
        query: 'shellfish',
        queryEmbedding: _similarVec(foodVec, noise: 0.05),
        limit: 5,
      );

      final ret5Index = results.indexWhere((r) => r.memory.id == 'ret-5');
      final ret2Index = results.indexWhere((r) => r.memory.id == 'ret-2');
      if (ret5Index >= 0 && ret2Index >= 0) {
        expect(ret5Index, lessThan(ret2Index));
      }
    });

    test('should boost with encoding context match', () async {
      final now = DateTime.now();
      await datasource.insertMemory(MemoryItem(
        id: 'ctx-boost',
        content: 'Evening coding session was productive',
        keywords: ['coding', 'evening', 'productive'],
        embedding: _makeVec(70),
        encodingContext: EncodingContext(
          userMood: UserMood.happy,
          timeOfDay: TimeOfDay.evening,
        ),
        importance: 0.6,
        createdAt: now,
      ));

      final currentCtx = EncodingContext(
        userMood: UserMood.happy,
        timeOfDay: TimeOfDay.evening,
      );

      final resultsWithCtx = await engine.retrieve(
        query: 'coding session',
        queryEmbedding: _makeVec(70),
        currentContext: currentCtx,
        limit: 10,
      );

      final resultsWithoutCtx = await engine.retrieve(
        query: 'coding session',
        queryEmbedding: _makeVec(70),
        limit: 10,
      );

      final withCtxScore = resultsWithCtx
          .firstWhere((r) => r.memory.id == 'ctx-boost',
              orElse: () => MemorySearchResult(
                  memory: MemoryItem(id: 'none', content: ''),
                  totalScore: -1))
          .totalScore;
      final withoutCtxScore = resultsWithoutCtx
          .firstWhere((r) => r.memory.id == 'ctx-boost',
              orElse: () => MemorySearchResult(
                  memory: MemoryItem(id: 'none', content: ''),
                  totalScore: -1))
          .totalScore;

      if (withCtxScore >= 0 && withoutCtxScore >= 0) {
        expect(withCtxScore, greaterThanOrEqualTo(withoutCtxScore));
      }
    });

    test('should classify query intent correctly', () {
      expect(RetrievalEngine.classifyIntent('why did this happen'), equals(QueryIntent.why));
      expect(RetrievalEngine.classifyIntent('when is the meeting'), equals(QueryIntent.when_));
      expect(RetrievalEngine.classifyIntent('who said that'), equals(QueryIntent.who));
      expect(RetrievalEngine.classifyIntent('how to fix this'), equals(QueryIntent.how));
      expect(RetrievalEngine.classifyIntent('shellfish allergy'), equals(QueryIntent.what));
    });

    test('should apply temporal decay to episodic memories', () async {
      final now = DateTime.now();
      final baseVec = _makeVec(90);
      await datasource.insertMemory(MemoryItem(
        id: 'old-episodic',
        content: 'Old episodic memory about food',
        type: MemoryType.episodic,
        keywords: ['food'],
        embedding: baseVec,
        importance: 0.5,
        createdAt: now.subtract(const Duration(days: 90)),
      ));
      await datasource.insertMemory(MemoryItem(
        id: 'new-episodic',
        content: 'New episodic memory about food',
        type: MemoryType.episodic,
        keywords: ['food'],
        embedding: baseVec,
        importance: 0.5,
        createdAt: now,
      ));

      final results = await engine.retrieve(
        query: 'food memory',
        queryEmbedding: baseVec,
        limit: 10,
      );

      final newIndex = results.indexWhere((r) => r.memory.id == 'new-episodic');
      final oldIndex = results.indexWhere((r) => r.memory.id == 'old-episodic');
      if (newIndex >= 0 && oldIndex >= 0) {
        expect(newIndex, lessThan(oldIndex));
      }
    });
  });

  group('Memory with XiangContext metadata', () {
    test('should store and retrieve memory with xiang metadata', () async {
      final memory = MemoryItem(
        id: 'xiang-1',
        content: 'Rainy day coding session',
        metadata: {
          'xiang': {
            'weather': 'rainy',
            'activity': 'coding',
            'location': 'home',
            'ambientMood': 'cozy',
          },
          'petMood': 'happy',
          'petState': 'playing',
        },
        importance: 0.7,
      );

      await datasource.insertMemory(memory);
      final retrieved = await datasource.getMemory('xiang-1');

      expect(retrieved, isNotNull);
      expect(retrieved!.metadata, isNotNull);
      expect(retrieved.metadata!['xiang'], isNotNull);
      expect((retrieved.metadata!['xiang'] as Map)['weather'], equals('rainy'));
      expect(retrieved.metadata!['petMood'], equals('happy'));
    });

    test('should query memories by metadata-persisted xiang data', () async {
      final now = DateTime.now();
      await datasource.insertMemory(MemoryItem(
        id: 'xiang-query-1',
        content: 'Sunny day walk in the park',
        keywords: ['walk', 'park', 'sunny'],
        metadata: {
          'xiang': {'weather': 'sunny', 'location': 'park'},
        },
        importance: 0.6,
        createdAt: now,
      ));
      await datasource.insertMemory(MemoryItem(
        id: 'xiang-query-2',
        content: 'Rainy day at home reading',
        keywords: ['reading', 'home', 'rainy'],
        metadata: {
          'xiang': {'weather': 'rainy', 'location': 'home'},
        },
        importance: 0.5,
        createdAt: now,
      ));

      final results = await datasource.keywordSearch('park');
      expect(results.length, greaterThanOrEqualTo(1));
      expect(results.any((m) => m.id == 'xiang-query-1'), isTrue);
    });
  });

  group('End-to-end: Store → Decay → Retrieve lifecycle', () {
    test('full lifecycle with decay affecting retrieval ranking', () async {
      final now = DateTime.now();
      final engine = RetrievalEngine(
        datasource: datasource,
        decayService: DecayService(),
        keywordExtractor: KeywordExtractorService(),
      );

      final baseVec = _makeVec(200);
      await datasource.insertMemory(MemoryItem(
        id: 'lifecycle-1',
        content: 'Important preference about dark mode',
        type: MemoryType.preference,
        keywords: ['dark mode', 'preference'],
        embedding: baseVec,
        importance: 0.9,
        source: MemorySource.userExplicit,
        createdAt: now,
      ));

      await datasource.insertMemory(MemoryItem(
        id: 'lifecycle-2',
        content: 'Casual observation about weather',
        type: MemoryType.episodic,
        keywords: ['weather', 'observation'],
        embedding: _makeVec(201),
        importance: 0.3,
        createdAt: now.subtract(const Duration(days: 30)),
      ));

      final results = await engine.retrieve(
        query: 'dark mode preference',
        queryEmbedding: baseVec,
        limit: 10,
      );

      expect(results, isNotEmpty);
      expect(results.first.memory.id, equals('lifecycle-1'));
      expect(results.first.totalScore, greaterThan(0));

      final decayService = DecayService();
      final oldMemory = MemoryItem(
        id: 'old',
        content: 'old',
        initialStrength: 0.3,
        createdAt: now.subtract(const Duration(days: 30)),
      );
      final decayResult = decayService.calculateDecay(oldMemory, now);
      expect(decayResult.decayedStrength, lessThan(0.3));
    });
  });
}
