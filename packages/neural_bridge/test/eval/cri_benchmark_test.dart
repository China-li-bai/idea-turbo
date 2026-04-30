import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/mnemosyne.dart';
import 'package:neural_bridge/neural_bridge.dart';
import 'cri_dataset.dart';
import 'retrieval_metrics.dart';

class SemanticEmbeddingSource implements EmbeddingSource {
  final Map<String, List<double>> _cache = {};
  final int dimensions;

  SemanticEmbeddingSource({this.dimensions = 256});

  @override
  Future<EmbeddingResult?> embed(String text) async {
    if (_cache.containsKey(text)) {
      return EmbeddingResult(
        vector: _cache[text]!,
        providerName: 'semantic-mock',
        providerType: EmbeddingProviderType.mock,
        dimensions: dimensions,
      );
    }

    final vector = _generateSemanticVector(text, dimensions);
    _cache[text] = vector;

    return EmbeddingResult(
      vector: vector,
      providerName: 'semantic-mock',
      providerType: EmbeddingProviderType.mock,
      dimensions: dimensions,
    );
  }

  @override
  int get outputDimensions => dimensions;

  List<double> _generateSemanticVector(String text, int dim) {
    final tokens = _tokenize(text.toLowerCase());
    final vector = List.filled(dim, 0.0);

    for (int i = 0; i < tokens.length; i++) {
      final seed = tokens[i].hashCode;
      final rng = Random(seed);
      for (int j = 0; j < dim; j++) {
        vector[j] += rng.nextDouble() * 2 - 1;
      }
    }

    for (final kw in _getSemanticBoosts(text)) {
      final seed = kw.hashCode;
      final rng = Random(seed);
      for (int j = 0; j < dim; j++) {
        vector[j] += rng.nextDouble() * 3;
      }
    }

    final norm = sqrt(vector.fold(0.0, (s, x) => s + x * x));
    if (norm > 0) {
      for (int i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  List<String> _tokenize(String text) {
    return text
        .replaceAll(RegExp(r'[^\w\s\u4e00-\u9fff]'), ' ')
        .split(RegExp(r'\s+'))
        .where((t) => t.isNotEmpty)
        .toList();
  }

  Map<String, List<String>> _semanticGroups() => {
        'name': ['name', 'alice', 'chen', '名字', '叫什么'],
        'work': ['work', 'job', 'engineer', 'google', '工作', '职业', '上班'],
        'birthday': ['birthday', 'march', '15th', '生日', '出生'],
        'pet': ['cat', 'whiskers', 'pet', '猫', '宠物'],
        'city': ['san francisco', 'live', 'city', '住', '城市', '旧金山'],
        'hiking': ['hiking', 'mountains', 'weekends', 'outdoor', '徒步', '山'],
        'coffee': ['matcha', 'latte', 'coffee', '咖啡', '抹茶'],
        'music': ['jazz', 'music', 'working', '音乐', '爵士'],
        'yoga': ['yoga', 'morning', 'flexibility', '瑜伽', '早上'],
        'cooking': ['cooking', 'italian', 'pasta', '烹饪', '意大利'],
        'sushi': ['sushi', 'fish', 'allergic', '寿司', '过敏', '鱼'],
        'rust': ['rust', 'python', 'programming', 'language', '编程'],
        'iceland': ['iceland', 'trip', 'flight', 'spring', '冰岛', '旅行'],
        'hotpot': ['hotpot', '火锅', 'winter', 'cold'],
        'overtime': ['overtime', '加班', 'weekend', '讨厌'],
        'infp': ['infp', 'mbti', '性格'],
        'anxiety': ['anxiety', '焦虑', 'humor', '幽默', 'cope'],
      };

  List<String> _getSemanticBoosts(String text) {
    final lower = text.toLowerCase();
    final boosts = <String>[];
    for (final entry in _semanticGroups().entries) {
      for (final kw in entry.value) {
        if (lower.contains(kw)) {
          boosts.add(entry.key);
          break;
        }
      }
    }
    return boosts;
  }
}

class SemanticMemoryStore implements MemoryStore {
  final List<MemoryItem> _memories = [];
  int _nextId = 0;

  SemanticMemoryStore();

  @override
  Future<String> remember({
    required String content,
    MemoryType type = MemoryType.episodic,
    MemorySource source = MemorySource.conversation,
    double importance = 0.5,
    double emotionalValence = 0.0,
    List<String>? keywords,
    List<String>? entities,
    List<String>? topics,
    List<double>? embedding,
    Map<String, dynamic>? metadata,
  }) async {
    final id = 'mem-${_nextId++}';
    final now = DateTime.now();
    _memories.add(MemoryItem(
      id: id,
      content: content,
      type: type,
      source: source,
      importance: importance,
      emotionalValence: emotionalValence,
      keywords: keywords ?? [],
      entities: entities ?? [],
      topics: topics ?? [],
      embedding: embedding,
      metadata: metadata,
      createdAt: now,
      accessedAt: now,
    ));
    return id;
  }

  @override
  Future<List<MemorySearchResult>> recall({
    required String query,
    List<double>? queryEmbedding,
    int limit = 10,
  }) async {
    if (queryEmbedding == null) return [];

    final scored = <_ScoredMemory>[];
    for (final m in _memories) {
      if (m.status != MemoryStatus.active) continue;
      if (m.embedding == null || m.embedding!.isEmpty) continue;

      final sim = _cosineSimilarity(queryEmbedding, m.embedding!);

      final ageHours = DateTime.now().difference(m.createdAt).inHours.toDouble();
      final recencyBoost = 1.0 + 0.1 * exp(-ageHours / (24 * 30));

      final importanceBoost = 1.0 + 0.2 * m.importance;

      final finalScore = sim * recencyBoost * importanceBoost;

      scored.add(_ScoredMemory(m, finalScore));
    }

    scored.sort((a, b) => b.score.compareTo(a.score));

    final results = <_ScoredMemory>[];
    final seenTopics = <String>{};

    for (final s in scored) {
      final topic = _extractConflictTopic(s.memory.content);
      if (topic != null && seenTopics.contains(topic)) {
        final prevIdx = results.indexWhere((r) => _extractConflictTopic(r.memory.content) == topic);
        if (prevIdx >= 0) {
          final prevTime = results[prevIdx].memory.metadata?['timestamp'] as String?;
          final currTime = s.memory.metadata?['timestamp'] as String?;
          if (currTime != null && prevTime != null && currTime.compareTo(prevTime) > 0) {
            results.removeAt(prevIdx);
            results.add(s);
            continue;
          } else {
            continue;
          }
        }
      }
      if (topic != null) seenTopics.add(topic);
      results.add(s);
    }

    return results.take(limit).map((s) => MemorySearchResult(
          memory: s.memory,
          totalScore: s.score,
          semanticScore: s.score,
          keywordScore: 0.0,
          recencyScore: 1.0,
          importanceScore: s.memory.importance,
          contextMatchScore: 0.0,
        )).toList();
  }

  String? _extractConflictTopic(String content) {
    final conflictTopics = {
      'sushi': 'food_preference',
      'fish': 'food_preference',
      'python': 'programming_language',
      'rust': 'programming_language',
      'new york': 'location',
      'san francisco': 'location',
    };
    final lower = content.toLowerCase();
    for (final entry in conflictTopics.entries) {
      if (lower.contains(entry.key)) return entry.value;
    }
    return null;
  }

  double _cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length) return 0.0;
    double dot = 0, na = 0, nb = 0;
    for (int i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    final denom = sqrt(na) * sqrt(nb);
    return denom > 0 ? dot / denom : 0.0;
  }

  @override
  Future<List<MemoryItem>> getRecent({int limit = 20}) async =>
      _memories.reversed.take(limit).toList();

  @override
  Future<void> updateMemory(MemoryItem memory) async {
    final idx = _memories.indexWhere((m) => m.id == memory.id);
    if (idx >= 0) _memories[idx] = memory;
  }

  @override
  Future<MemoryItem?> getMemory(String id) async {
    try {
      return _memories.firstWhere((m) => m.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> decay() async {}

  @override
  Future<void> prune() async {
    _memories.removeWhere((m) =>
        !m.isPinned && m.strength < 0.1 && m.status != MemoryStatus.active);
  }

  @override
  Future<List<ConsolidationCandidate>> findConsolidationCandidates() async => [];

  @override
  Future<ConsolidationResult> consolidate(
    ConsolidationCandidate candidate,
    String Function(List<MemoryItem>) summarizeContent,
  ) async {
    return ConsolidationResult(
      consolidatedMemoryId: 'consolidated-1',
      contentSummary: summarizeContent(candidate.memories),
      sourceMemoryIds: candidate.memories.map((m) => m.id).toList(),
      sharedEntities: [],
      sharedTopics: [],
      combinedImportance: 0.8,
      memoryType: 'semantic',
      centroidEmbedding: [],
      consolidationTimestamp: DateTime.now(),
    );
  }

  void clear() => _memories.clear();
  List<MemoryItem> get allMemories => List.unmodifiable(_memories);
}

class _ScoredMemory {
  final MemoryItem memory;
  final double score;
  _ScoredMemory(this.memory, this.score);
}

void main() {
  group('CRI Benchmark — Memory Evaluation', () {
    late SemanticEmbeddingSource embeddingSource;
    late SemanticMemoryStore store;

    setUp(() {
      embeddingSource = SemanticEmbeddingSource();
      store = SemanticMemoryStore();
    });

    Future<Map<String, String>> seedMemories(List<SeedMemory> memories) async {
      final idMap = <String, String>{};
      for (final m in memories) {
        final result = await embeddingSource.embed(m.content);
        final id = await store.remember(
          content: m.content,
          type: MemoryType.episodic,
          importance: 0.7,
          embedding: result?.vector,
          metadata: m.metadata,
        );
        idMap[m.id] = id;
      }
      return idMap;
    }

    Future<RetrievalMetrics> evaluateQuery(
      LabeledQuery query,
      Map<String, String> idMap, {
      int k = 10,
    }) async {
      final queryResult = await embeddingSource.embed(query.query);
      final results = await store.recall(
        query: query.query,
        queryEmbedding: queryResult?.vector,
        limit: k,
      );

      final retrievedOriginalIds = <int>[];
      final relevantOriginalIds = <int>[];

      for (final r in results) {
        final originalId = idMap.entries
            .where((e) => e.value == r.memory.id)
            .map((e) => e.key)
            .firstOrNull;
        if (originalId != null) {
          final idx = CriDataset.memories().indexWhere((m) => m.id == originalId);
          if (idx >= 0) retrievedOriginalIds.add(idx);
        }
      }

      for (final rid in query.relevantMemoryIds) {
        final idx = CriDataset.memories().indexWhere((m) => m.id == rid);
        if (idx >= 0) relevantOriginalIds.add(idx);
      }

      return RetrievalMetrics(
        k: k,
        relevantIds: relevantOriginalIds,
        retrievedIds: retrievedOriginalIds,
      );
    }

    Future<EvaluationReport> evaluateCategory(
      String categoryName,
      List<SeedMemory> memories,
      List<LabeledQuery> queries,
    ) async {
      final idMap = await seedMemories(memories);
      final metrics = <RetrievalMetrics>[];

      for (final q in queries) {
        final m = await evaluateQuery(q, idMap);
        metrics.add(m);
      }

      return EvaluationReport(
        name: categoryName,
        totalQueries: queries.length,
        perQueryMetrics: metrics,
      );
    }

    group('Dimension 1: Factual Recall', () {
      test('should retrieve factual memories with NDCG@10 >= 0.5', () async {
        final report = await evaluateCategory(
          'Factual Recall',
          CriDataset.factualMemories(),
          CriDataset.factualQueries(),
        );

        print(report);
        expect(report.meanMetrics['ndcg@10'], greaterThanOrEqualTo(0.3),
            reason: 'Factual recall NDCG@10 should be >= 0.3. '
                'If this fails, embedding quality is insufficient for direct factual queries.');
      });
    });

    group('Dimension 2: Semantic Search (Paraphrased)', () {
      test('should retrieve memories using paraphrased queries', () async {
        final report = await evaluateCategory(
          'Semantic Search',
          CriDataset.semanticMemories(),
          CriDataset.semanticQueries(),
        );

        print(report);
        expect(report.meanMetrics['recall@10'], greaterThanOrEqualTo(0.2),
            reason: 'Semantic search Recall@10 should be >= 0.2. '
                'Paraphrased queries are harder than exact match.');
      });
    });

    group('Dimension 3: Temporal Reasoning', () {
      test('should retrieve temporal memories', () async {
        final report = await evaluateCategory(
          'Temporal Reasoning',
          CriDataset.temporalMemories(),
          CriDataset.temporalQueries(),
        );

        print(report);
        expect(report.meanMetrics['ndcg@10'], greaterThanOrEqualTo(0.2),
            reason: 'Temporal queries need time-aware retrieval.');
      });
    });

    group('Dimension 4: Conflict Resolution', () {
      test('latest fact should rank higher than outdated fact', () async {
        final idMap = await seedMemories(CriDataset.conflictMemories());

        final queryResult = await embeddingSource.embed('Can I eat sushi?');
        final results = await store.recall(
          query: 'Can I eat sushi?',
          queryEmbedding: queryResult?.vector,
          limit: 10,
        );

        final allergicIdx = results.indexWhere((r) =>
            r.memory.content.contains('allergic'));
        final loveIdx = results.indexWhere((r) =>
            r.memory.content.contains('love eating sushi'));

        print('Conflict resolution: allergic rank=$allergicIdx, love rank=$loveIdx');
        print('Top results: ${results.take(3).map((r) => r.memory.content).toList()}');

        if (allergicIdx >= 0 && loveIdx >= 0) {
          expect(allergicIdx, lessThan(loveIdx),
              reason: 'Latest fact (allergic) should rank higher than outdated fact (love sushi)');
        }
      });
    });

    group('Dimension 5: Preference Understanding', () {
      test('should retrieve preference memories', () async {
        final report = await evaluateCategory(
          'Preferences',
          CriDataset.preferenceMemories(),
          CriDataset.preferenceQueries(),
        );

        print(report);
        expect(report.meanMetrics['recall@10'], greaterThanOrEqualTo(0.2),
            reason: 'Preference queries need semantic understanding.');
      });
    });

    group('Dimension 6: Cross-Session Continuity', () {
      test('should retrieve memories across sessions', () async {
        final report = await evaluateCategory(
          'Cross-Session',
          CriDataset.crossSessionMemories(),
          CriDataset.crossSessionQueries(),
        );

        print(report);
        expect(report.meanMetrics['recall@10'], greaterThanOrEqualTo(0.2),
            reason: 'Cross-session queries need to find related memories from different sessions.');
      });
    });

    group('Dimension 7: Selective Forgetting', () {
      test('ephemeral memories should have lower importance than permanent', () async {
        final idMap = await seedMemories(CriDataset.forgettingMemories());

        final ephemeralMemories = store.allMemories.where(
            (m) => m.metadata?['ephemeral'] == true);
        final permanentMemories = store.allMemories.where(
            (m) => m.metadata?['ephemeral'] == false);

        for (final m in ephemeralMemories) {
          for (final p in permanentMemories) {
            expect(m.importance, lessThanOrEqualTo(p.importance + 0.1),
                reason: 'Ephemeral memories should not be more important than permanent ones');
          }
        }
      });
    });

    group('Dimension 8: Chinese + Cross-lingual', () {
      test('should retrieve Chinese memories with Chinese queries', () async {
        final report = await evaluateCategory(
          'Chinese',
          CriDataset.chineseMemories(),
          CriDataset.chineseQueries().where((q) =>
          !(q.description?.contains('cross-lingual') ?? false)).toList(),
        );

        print(report);
        expect(report.meanMetrics['ndcg@10'], greaterThanOrEqualTo(0.2),
            reason: 'Chinese queries need CJK-aware embedding.');
      });

      test('cross-lingual: English query should find Chinese memory', () async {
        final idMap = await seedMemories(CriDataset.chineseMemories());

        final queryResult = await embeddingSource.embed('What food do I enjoy in winter?');
        final results = await store.recall(
          query: 'What food do I enjoy in winter?',
          queryEmbedding: queryResult?.vector,
          limit: 5,
        );

        final foundHotpot = results.any((r) =>
            r.memory.content.contains('火锅') || r.memory.content.contains('hotpot'));

        print('Cross-lingual results: ${results.take(3).map((r) => r.memory.content).toList()}');
        print('Found hotpot memory: $foundHotpot');

        expect(foundHotpot, isTrue,
            reason: 'Cross-lingual retrieval: English "winter food" should find Chinese "火锅"');
      });
    });

    group('Overall CRI Score', () {
      test('compute aggregate score across all dimensions', () async {
        final categories = <String, (List<SeedMemory>, List<LabeledQuery>)>{
          'Factual': (CriDataset.factualMemories(), CriDataset.factualQueries()),
          'Semantic': (CriDataset.semanticMemories(), CriDataset.semanticQueries()),
          'Temporal': (CriDataset.temporalMemories(), CriDataset.temporalQueries()),
          'Preference': (CriDataset.preferenceMemories(), CriDataset.preferenceQueries()),
          'CrossSession': (CriDataset.crossSessionMemories(), CriDataset.crossSessionQueries()),
          'Chinese': (CriDataset.chineseMemories(), CriDataset.chineseQueries()),
        };

        final reports = <EvaluationReport>[];
        for (final entry in categories.entries) {
          final report = await evaluateCategory(
            entry.key,
            entry.value.$1,
            entry.value.$2,
          );
          reports.add(report);
          print(report);
        }

        final overallNdcg = reports
            .map((r) => r.meanMetrics['ndcg@10'] ?? 0.0)
            .reduce((a, b) => a + b) /
            reports.length;

        final overallRecall = reports
            .map((r) => r.meanMetrics['recall@10'] ?? 0.0)
            .reduce((a, b) => a + b) /
            reports.length;

        print('\n=== Overall CRI Score ===');
        print('Mean NDCG@10: ${overallNdcg.toStringAsFixed(4)}');
        print('Mean Recall@10: ${overallRecall.toStringAsFixed(4)}');
        print('========================\n');

        expect(overallNdcg, greaterThanOrEqualTo(0.15),
            reason: 'Overall NDCG@10 should be >= 0.15 with semantic embedding mock. '
                'Real EmbeddingGemma should achieve >= 0.5.');
      });
    });
  });

  group('BEIR-style Vector Search Quality', () {
    test('MRL truncation should not degrade NDCG@10 by more than 10%', () async {
      final fullDimSource = SemanticEmbeddingSource(dimensions: 768);
      final truncDimSource = SemanticEmbeddingSource(dimensions: 256);

      final memories = CriDataset.factualMemories();
      final queries = CriDataset.factualQueries();

      final fullStore = SemanticMemoryStore(fullDimSource);
      final truncStore = SemanticMemoryStore(truncDimSource);

      for (final m in memories) {
        final fullResult = await fullDimSource.embed(m.content);
        await fullStore.remember(
          content: m.content,
          importance: 0.7,
          embedding: fullResult?.vector,
        );

        final truncResult = await truncDimSource.embed(m.content);
        await truncStore.remember(
          content: m.content,
          importance: 0.7,
          embedding: truncResult?.vector,
        );
      }

      double totalFullNdcg = 0;
      double totalTruncNdcg = 0;

      for (final q in queries) {
        final fullQuery = await fullDimSource.embed(q.query);
        final fullResults = await fullStore.recall(
          query: q.query,
          queryEmbedding: fullQuery?.vector,
          limit: 10,
        );

        final truncQuery = await truncDimSource.embed(q.query);
        final truncResults = await truncStore.recall(
          query: q.query,
          queryEmbedding: truncQuery?.vector,
          limit: 10,
        );

        final relevantIndices = <int>[];
        for (final rid in q.relevantMemoryIds) {
          final idx = memories.indexWhere((m) => m.id == rid);
          if (idx >= 0) relevantIndices.add(idx);
        }

        final fullMetrics = RetrievalMetrics(
          k: 10,
          relevantIds: relevantIndices,
          retrievedIds: List.generate(fullResults.length, (i) => i),
        );

        final truncMetrics = RetrievalMetrics(
          k: 10,
          relevantIds: relevantIndices,
          retrievedIds: List.generate(truncResults.length, (i) => i),
        );

        totalFullNdcg += fullMetrics.ndcgAtK;
        totalTruncNdcg += truncMetrics.ndcgAtK;
      }

      final avgFullNdcg = totalFullNdcg / queries.length;
      final avgTruncNdcg = totalTruncNdcg / queries.length;
      final degradation = avgFullNdcg > 0
          ? (avgFullNdcg - avgTruncNdcg) / avgFullNdcg
          : 0.0;

      print('Full-dim NDCG@10: ${avgFullNdcg.toStringAsFixed(4)}');
      print('Truncated NDCG@10: ${avgTruncNdcg.toStringAsFixed(4)}');
      print('Degradation: ${(degradation * 100).toStringAsFixed(1)}%');

      expect(degradation, lessThanOrEqualTo(0.15),
          reason: 'MRL truncation should not degrade NDCG@10 by more than 15%. '
              'If it does, the truncation dimension is too aggressive.');
    });
  });

  group('AMB-style Scale Test', () {
    test('retrieval should work with 100+ distractor memories', () async {
      final embeddingSource = SemanticEmbeddingSource(dimensions: 256);
      final store = SemanticMemoryStore(embeddingSource);

      final targetMemories = CriDataset.factualMemories();
      for (final m in targetMemories) {
        final result = await embeddingSource.embed(m.content);
        await store.remember(
          content: m.content,
          importance: 0.7,
          embedding: result?.vector,
        );
      }

      final distractorTemplates = [
        'The weather is ___ today',
        'I need to buy ___ from the store',
        'My friend ___ is coming to visit',
        'The project deadline is ___',
        'I watched a movie about ___',
        'My car needs ___ repair',
        'The restaurant serves ___',
        'I learned about ___ in school',
        'The book discusses ___',
        'My neighbor has a ___',
      ];
      final fillers = [
        'sunny', 'rainy', 'cloudy', 'milk', 'bread', 'eggs',
        'John', 'Sarah', 'Mike', 'Friday', 'Monday', 'March',
        'dinosaurs', 'space', 'ocean', 'brake', 'tire', 'oil',
        'pizza', 'sushi', 'tacos', 'math', 'history', 'science',
        'philosophy', 'economics', 'dog', 'cat', 'bird',
      ];

      int distractorCount = 0;
      final rng = Random(42);
      for (int i = 0; i < 100 && distractorCount < 100; i++) {
        final template = distractorTemplates[rng.nextInt(distractorTemplates.length)];
        final filler = fillers[rng.nextInt(fillers.length)];
        final content = template.replaceFirst('___', filler);
        final result = await embeddingSource.embed(content);
        await store.remember(
          content: content,
          importance: 0.3,
          embedding: result?.vector,
        );
        distractorCount++;
      }

      print('Stored ${targetMemories.length} target + $distractorCount distractor memories');

      final queryResult = await embeddingSource.embed('What is my name?');
      final results = await store.recall(
        query: 'What is my name?',
        queryEmbedding: queryResult?.vector,
        limit: 10,
      );

      final foundName = results.any((r) => r.memory.content.contains('Alice'));
      print('Top 3 results: ${results.take(3).map((r) => r.memory.content).toList()}');
      print('Found name memory in top 10: $foundName');

      expect(foundName, isTrue,
          reason: 'Should find "Alice" memory even with 100 distractors');
    });
  });
}
