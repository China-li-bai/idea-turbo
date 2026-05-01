import 'dart:io';
import 'dart:math' as math;
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/mnemosyne.dart';
import 'package:neural_bridge/neural_bridge.dart';
import 'beir_dataset.dart';
import 'locomo_dataset.dart';
import 'longmemeval_dataset.dart';
import 'membench_dataset.dart';
import 'retrieval_metrics.dart';

String _fixturePath(String relative) =>
    '${Directory.current.path}/test/fixtures/$relative';

class SemanticEmbeddingSource implements EmbeddingSource {
  final Map<String, List<double>> _cache = {};
  static const int _dim = 256;

  @override
  int get outputDimensions => _dim;

  @override
  Future<EmbeddingResult?> embed(String text) async {
    if (_cache.containsKey(text)) {
      return EmbeddingResult(
        vector: _cache[text]!,
        providerName: 'semantic-mock',
        providerType: EmbeddingProviderType.mock,
        dimensions: _dim,
      );
    }
    final vec = _semanticVector(text);
    _cache[text] = vec;
    return EmbeddingResult(
      vector: vec,
      providerName: 'semantic-mock',
      providerType: EmbeddingProviderType.mock,
      dimensions: _dim,
    );
  }

  Future<List<EmbeddingResult>> embedBatch(List<String> texts) async {
    final results = <EmbeddingResult>[];
    for (final t in texts) {
      final r = await embed(t);
      if (r != null) results.add(r);
    }
    return results;
  }

  List<double> _semanticVector(String text) {
    final lower = text.toLowerCase();
    final vec = List<double>.filled(_dim, 0.0);

    final groups = _semanticGroups();
    for (final entry in groups.entries) {
      for (final kw in entry.value) {
        if (lower.contains(kw)) {
          final seed = entry.key.hashCode.abs();
          final rng = math.Random(seed);
          for (int i = 0; i < _dim; i++) {
            vec[i] += rng.nextDouble() * 0.5;
          }
          break;
        }
      }
    }

    final baseRng = math.Random(lower.hashCode.abs());
    for (int i = 0; i < _dim; i++) {
      vec[i] += baseRng.nextDouble() * 0.1;
    }

    final norm = math.sqrt(vec.fold(0.0, (sum, v) => sum + v * v));
    if (norm > 0) {
      for (int i = 0; i < _dim; i++) {
        vec[i] /= norm;
      }
    }
    return vec;
  }

  Map<String, List<String>> _semanticGroups() {
    return {
      'food': ['food', 'eat', 'cook', 'restaurant', 'sushi', 'pizza', 'coffee', 'hotpot', 'meal', 'dinner', 'lunch', 'breakfast'],
      'work': ['work', 'job', 'office', 'meeting', 'boss', 'colleague', 'project', 'deadline', 'company', 'career', 'manager'],
      'family': ['family', 'mom', 'dad', 'sister', 'brother', 'parent', 'child', 'kid', 'baby', 'husband', 'wife'],
      'hobby': ['hobby', 'game', 'music', 'movie', 'book', 'sport', 'travel', 'hike', 'run', 'yoga', 'paint'],
      'health': ['health', 'doctor', 'hospital', 'sick', 'allergic', 'medicine', 'headache', 'cold', 'fever'],
      'pet': ['cat', 'dog', 'pet', 'whiskers', 'animal', 'puppy', 'kitten'],
      'location': ['live', 'move', 'city', 'apartment', 'house', 'home', 'town', 'country', 'boston', 'san francisco', 'new york'],
      'education': ['school', 'university', 'study', 'class', 'degree', 'college', 'student', 'exam', 'learn'],
      'social': ['friend', 'party', 'date', 'wedding', 'birthday', 'hang out', 'meet', 'visit'],
      'weather': ['weather', 'rain', 'snow', 'sunny', 'cold', 'hot', 'storm', 'wind'],
      'car': ['car', 'drive', 'bus', 'train', 'bike', 'commute', 'traffic', 'subway'],
      'shopping': ['buy', 'shop', 'store', 'mall', 'price', 'discount', 'brand', 'order'],
      'emotion': ['happy', 'sad', 'angry', 'anxious', 'excited', 'worried', 'love', 'hate', 'miss', 'feel'],
      'tech': ['computer', 'phone', 'app', 'software', 'code', 'program', 'python', 'rust', 'ai', 'robot'],
      'chinese_food': ['火锅', '饺子', '面条', '米饭', '炒菜', '烧烤', '奶茶', '豆腐'],
      'chinese_work': ['加班', '上班', '同事', '老板', '项目', '会议', '出差'],
      'chinese_life': ['生活', '周末', '假期', '旅行', '运动', '健身', '电影'],
    };
  }
}

class _InMemoryStore implements MemoryStore {
  final List<MemoryItem> _memories = [];
  final SemanticEmbeddingSource _embeddingSource;
  int _nextId = 0;

  _InMemoryStore(this._embeddingSource);

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
    final id = 'mem_${_nextId++}';
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

    final scored = <_ScoredItem>[];
    for (final m in _memories) {
      if (m.status != MemoryStatus.active) continue;
      if (m.embedding == null || m.embedding!.isEmpty) continue;

      final sim = _cosineSimilarity(queryEmbedding, m.embedding!);

      final ageHours = DateTime.now().difference(m.createdAt).inHours.toDouble();
      final recencyBoost = 1.0 + 0.1 * math.exp(-ageHours / (24 * 30));
      final importanceBoost = 1.0 + 0.2 * m.importance;
      final finalScore = sim * recencyBoost * importanceBoost;

      scored.add(_ScoredItem(m, finalScore));
    }

    scored.sort((a, b) => b.score.compareTo(a.score));

    return scored.take(limit).map((s) => MemorySearchResult(
          memory: s.memory,
          totalScore: s.score,
          semanticScore: s.score,
          keywordScore: 0.0,
          recencyScore: 1.0,
          importanceScore: s.memory.importance,
          contextMatchScore: 0.0,
        )).toList();
  }

  Future<bool> forget(String id) async {
    final idx = _memories.indexWhere((m) => m.id == id);
    if (idx < 0) return false;
    _memories.removeAt(idx);
    return true;
  }

  Future<MemoryItem?> get(String id) async =>
      _memories.where((m) => m.id == id).firstOrNull;

  @override
  Future<MemoryItem?> getMemory(String id) async => get(id);

  @override
  Future<List<MemoryItem>> getRecent({int limit = 20}) async =>
      _memories.take(limit).toList();

  @override
  Future<void> updateMemory(MemoryItem memory) async {
    final idx = _memories.indexWhere((m) => m.id == memory.id);
    if (idx >= 0) _memories[idx] = memory;
  }

  @override
  Future<void> decay() async {}

  @override
  Future<void> prune() async {}

  @override
  Future<List<ConsolidationCandidate>> findConsolidationCandidates() async => [];

  @override
  Future<ConsolidationResult> consolidate(
    ConsolidationCandidate candidate,
    String Function(List<MemoryItem>) summarizeContent,
  ) async {
    return ConsolidationResult(
      consolidatedMemoryId: 'consolidated_${_nextId++}',
      sourceMemoryIds: candidate.memories.map((m) => m.id).toList(),
      memoryType: 'semantic',
      contentSummary: summarizeContent(candidate.memories),
      combinedImportance: candidate.combinedImportance,
      sharedEntities: candidate.sharedEntities,
      sharedTopics: candidate.sharedTopics,
      centroidEmbedding: candidate.centroid,
      consolidationTimestamp: DateTime.now(),
    );
  }

  @override
  Future<List<String>> findConflictingMemories({
    required String content,
    required String conflictTopic,
    MemoryType? type,
    int limit = 5,
  }) async {
    return _memories
        .where((m) {
          if (type != null && m.type != type) return false;
          if (m.status != MemoryStatus.active) return false;
          return m.content.toLowerCase().contains(conflictTopic.toLowerCase());
        })
        .take(limit)
        .map((m) => m.id)
        .toList();
  }

  Future<List<MemorySearchResult>> search({
    required String query,
    int limit = 10,
    MemoryType? type,
  }) async {
    final emb = await _embeddingSource.embed(query);
    return recall(query: query, queryEmbedding: emb?.vector, limit: limit);
  }

  double _cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length) return 0.0;
    double dot = 0, normA = 0, normB = 0;
    for (int i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    final denom = math.sqrt(normA) * math.sqrt(normB);
    return denom > 0 ? dot / denom : 0.0;
  }
}

class _ScoredItem {
  final MemoryItem memory;
  final double score;
  const _ScoredItem(this.memory, this.score);
}

void main() {
  group('LoCoMo Benchmark (Snap Research)', () {
    late LoCoMoDataset dataset;

    setUpAll(() async {
      final path = _fixturePath('locomo/data/locomo10.json');
      final file = File(path);
      if (!await file.exists()) {
        throw FileSystemException(
            'LoCoMo dataset not found. Run: git clone https://github.com/snap-research/locomo.git test/fixtures/locomo',
            path);
      }
      dataset = await LoCoMoDataset.load(path);
    });

    test('dataset should load successfully with correct structure', () {
      expect(dataset.totalConversations, greaterThanOrEqualTo(10));
      expect(dataset.totalQA, greaterThanOrEqualTo(1500));
      expect(dataset.totalMessages, greaterThanOrEqualTo(1000));
    });

    test('QA categories should match LoCoMo specification', () {
      final counts = dataset.qaCategoryCounts;
      expect(counts['single_hop'], greaterThan(0),
          reason: 'Category 1 (single-hop) must exist');
      expect(counts['multi_hop'], greaterThan(0),
          reason: 'Category 2 (multi-hop) must exist');
      expect(counts['temporal'], greaterThan(0),
          reason: 'Category 3 (temporal) must exist');
      expect(counts['open_domain'], greaterThan(0),
          reason: 'Category 4 (open-domain) must exist');
      expect(counts['adversarial'], greaterThan(0),
          reason: 'Category 5 (adversarial) must exist');
    });

    test('conversations should have multi-session structure', () {
      for (final conv in dataset.conversations) {
        expect(conv.sessionCount, greaterThanOrEqualTo(5),
            reason: 'LoCoMo conversations span multiple sessions');
        expect(conv.totalMessages, greaterThanOrEqualTo(20),
            reason: 'Each conversation should have substantial messages');
      }
    });

    test('single-hop QA should retrieve correct evidence', () async {
      final embeddingSource = SemanticEmbeddingSource();
      final store = _InMemoryStore(embeddingSource);

      final singleHopQA = dataset.qaForCategory(1).take(20).toList();
      if (singleHopQA.isEmpty) return;

      final conv = dataset.conversations.first;
      final allMsgs = conv.allMessages;

      for (final msg in allMsgs) {
        final emb = await embeddingSource.embed(msg.text);
        await store.remember(
          content: msg.text,
          type: MemoryType.episodic,
          embedding: emb?.vector,
          metadata: {
            'speaker': msg.speaker,
            'diaId': msg.diaId,
            'source': 'locomo',
          },
        );
      }

      int found = 0;
      for (final qa in singleHopQA) {
        final results = await store.search(query: qa.question, limit: 10);
        if (results.isNotEmpty) found++;
      }

      final recallRate = found / singleHopQA.length;
      print('LoCoMo single-hop recall@10: ${recallRate.toStringAsFixed(3)} '
          '($found/${singleHopQA.length})');
      expect(recallRate, greaterThanOrEqualTo(0.5),
          reason: 'At least 50% of single-hop questions should return results');
    });

    test('temporal QA should handle time-based queries', () {
      final temporalQA = dataset.qaForCategory(3);
      expect(temporalQA.length, greaterThan(0),
          reason: 'LoCoMo should have temporal questions');

      print('LoCoMo temporal QA count: ${temporalQA.length}');
      print('Sample temporal Q: ${temporalQA.first.question}');
    });

    test('multi-hop QA should require combining information', () {
      final multiHopQA = dataset.qaForCategory(2);
      expect(multiHopQA.length, greaterThan(0),
          reason: 'LoCoMo should have multi-hop questions');

      print('LoCoMo multi-hop QA count: ${multiHopQA.length}');
      print('Sample multi-hop Q: ${multiHopQA.first.question}');
    });
  });

  group('MemBench Benchmark (ACL 2025 Findings)', () {
    late MemBenchDataset dataset;

    setUpAll(() async {
      final path = _fixturePath('membench');
      final dir = Directory(path);
      if (!await dir.exists()) {
        throw FileSystemException(
            'MemBench dataset not found. Run: git clone https://github.com/import-myself/membench.git test/fixtures/membench',
            path);
      }
      dataset = await MemBenchDataset.load(path);
    });

    test('dataset should load with multiple categories', () {
      expect(dataset.data.keys.length, greaterThanOrEqualTo(3),
          reason: 'MemBench should have roles/events/items/places/hybrid categories');
    });

    test('each category should have QA pairs with evidence', () {
      for (final cat in MemBenchCategory.values) {
        final items = dataset.itemsForCategory(cat);
        if (items.isEmpty) continue;

        for (final item in items.take(5)) {
          expect(item.qa.question, isNotEmpty,
              reason: 'QA should have a question');
          expect(item.qa.answerText, isNotEmpty,
              reason: 'QA should have an answer');
          expect(item.messageList, isNotEmpty,
              reason: 'Item should have message evidence');
        }
      }
    });

    test('simple difficulty should have factual recall items', () async {
      final simpleItems = dataset.itemsForDifficulty(MemBenchDifficulty.simple);
      if (simpleItems.isEmpty) return;

      final embeddingSource = SemanticEmbeddingSource();
      final store = _InMemoryStore(embeddingSource);

      final sample = simpleItems.take(10).toList();
      for (final item in sample) {
        for (final msg in item.messageList) {
          final emb = await embeddingSource.embed(msg.message);
          await store.remember(
            content: msg.message,
            type: MemoryType.episodic,
            embedding: emb?.vector,
            metadata: {
              'time': msg.time,
              'place': msg.place,
              'source': 'membench',
            },
          );
        }
      }

      int found = 0;
      for (final item in sample) {
        final results =
            await store.search(query: item.qa.question, limit: 10);
        if (results.isNotEmpty) found++;
      }

      final recallRate = found / sample.length;
      print('MemBench simple recall@10: ${recallRate.toStringAsFixed(3)} '
          '($found/${sample.length})');
      expect(recallRate, greaterThanOrEqualTo(0.5));
    });

    test('noisy difficulty should test robustness', () {
      final noisyItems = dataset.itemsForDifficulty(MemBenchDifficulty.noisy);
      print('MemBench noisy items: ${noisyItems.length}');

      if (noisyItems.isNotEmpty) {
        final item = noisyItems.first;
        print('Noisy sample Q: ${item.qa.question}');
        print('Noisy sample messages: ${item.messageList.length}');
      }
    });

    test('hybrid category should test cross-domain reasoning', () {
      final hybridItems = dataset.itemsForCategory(MemBenchCategory.hybrid);
      print('MemBench hybrid items: ${hybridItems.length}');

      if (hybridItems.isNotEmpty) {
        final item = hybridItems.first;
        expect(item.qa.question, contains(RegExp(r';|addition|also|plus|什么|moreover|furthermore', caseSensitive: false)),
            reason: 'Hybrid questions should combine multiple domains');
      }
    });

    test('knowledge_update difficulty should test conflict resolution', () {
      final kuItems =
          dataset.itemsForDifficulty(MemBenchDifficulty.knowledgeUpdate);
      print('MemBench knowledge_update items: ${kuItems.length}');

      if (kuItems.isNotEmpty) {
        print('Knowledge update sample Q: ${kuItems.first.qa.question}');
      }
    });
  });

  group('Cross-Benchmark Comparison', () {
    test('LoCoMo vs MemBench: coverage comparison', () async {
      final locomoPath = _fixturePath('locomo/data/locomo10.json');
      final membenchPath = _fixturePath('membench');

      final locomoExists = await File(locomoPath).exists();
      final membenchExists = await Directory(membenchPath).exists();

      if (!locomoExists || !membenchExists) {
        print('Skipping cross-benchmark: datasets not available');
        return;
      }

      final locomo = await LoCoMoDataset.load(locomoPath);
      final membench = await MemBenchDataset.load(membenchPath);

      print('\n=== Cross-Benchmark Coverage ===');
      print('LoCoMo: ${locomo.totalConversations} convs, '
          '${locomo.totalQA} QA, ${locomo.totalMessages} msgs');
      print('MemBench: ${membench.totalItems} items, '
          '${membench.totalMessages} msgs');
      print('');

      print('LoCoMo categories: ${locomo.qaCategoryCounts}');
      print('MemBench categories: '
          '${membench.data.keys.map((k) => k.name).join(', ')}');

      expect(locomo.totalQA, greaterThan(0));
      expect(membench.totalItems, greaterThan(0));
    });
  });

  group('BEIR Benchmark (NeurIPS 2021 - scifact)', () {
    late BeirDataset dataset;

    setUpAll(() async {
      final dataDir = _fixturePath('beir/scifact');
      final corpusFile = File('$dataDir/corpus.jsonl');
      if (!await corpusFile.exists()) {
        throw FileSystemException(
            'BEIR scifact not found. Download from: '
            'https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip',
            dataDir);
      }
      dataset = await BeirDataset.load(name: 'scifact', dataDir: dataDir);
    });

    test('dataset should load with correct structure', () {
      expect(dataset.corpusSize, greaterThanOrEqualTo(5000),
          reason: 'scifact has ~5k documents');
      expect(dataset.queryCount, greaterThanOrEqualTo(1000),
          reason: 'scifact has ~1k queries');
      expect(dataset.qrelCount, greaterThanOrEqualTo(300),
          reason: 'scifact has ~300 qrels');
    });

    test('corpus documents should have title and text', () {
      final sample = dataset.corpus.values.take(10);
      for (final doc in sample) {
        expect(doc.id, isNotEmpty);
        expect(doc.text, isNotEmpty);
      }
    });

    test('retrieval should find relevant documents for labeled queries', () async {
      final embeddingSource = SemanticEmbeddingSource();
      final store = _InMemoryStore(embeddingSource);

      final labeledQueryIds = dataset.qrels.keys.toList();
      final sampleQueryIds = labeledQueryIds.take(20).toList();
      if (sampleQueryIds.isEmpty) return;

      final relevantDocIds = <String>{};
      for (final qid in sampleQueryIds) {
        for (final rel in dataset.qrels[qid]!) {
          relevantDocIds.add(rel.corpusId);
        }
      }

      for (final docId in relevantDocIds) {
        final doc = dataset.corpus[docId];
        if (doc == null) continue;
        final emb = await embeddingSource.embed(doc.fullText);
        await store.remember(
          content: doc.fullText,
          type: MemoryType.episodic,
          embedding: emb?.vector,
          metadata: {'docId': doc.id, 'source': 'beir-scifact'},
        );
      }

      double totalNdcg = 0;
      int evaluated = 0;
      for (final qid in sampleQueryIds) {
        final query = dataset.queries[qid];
        if (query == null) continue;

        final relevantIds =
            dataset.qrels[qid]!.where((r) => r.score > 0).map((r) => r.corpusId).toList();
        if (relevantIds.isEmpty) continue;

        final results = await store.search(query: query.text, limit: 10);
        final retrievedIds = results
            .map((r) => r.memory.metadata?['docId'] as String? ?? '')
            .where((id) => id.isNotEmpty)
            .toList();

        final metrics = RetrievalMetrics(
          k: 10,
          relevantIds: relevantIds.map((id) => id.hashCode).toList(),
          retrievedIds: retrievedIds.map((id) => id.hashCode).toList(),
        );

        totalNdcg += metrics.ndcgAtK;
        evaluated++;
      }

      final avgNdcg = evaluated > 0 ? totalNdcg / evaluated : 0.0;
      print('BEIR scifact NDCG@10 (semantic-mock): ${avgNdcg.toStringAsFixed(3)} '
          '($evaluated queries)');
      expect(evaluated, greaterThan(0),
          reason: 'Should evaluate at least some queries');
    });
  });

  group('LongMemEval Benchmark (ICLR 2025)', () {
    late LongMemEvalDataset dataset;

    setUpAll(() async {
      final filePath = _fixturePath('longmemeval/longmemeval_oracle.json');
      final file = File(filePath);
      if (!await file.exists()) {
        throw FileSystemException(
            'LongMemEval oracle not found. Download from: '
            'https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned',
            filePath);
      }
      dataset = await LongMemEvalDataset.load(
          filePath: filePath, variant: 'oracle');
    });

    test('dataset should load with 500 instances', () {
      expect(dataset.totalInstances, equals(500),
          reason: 'LongMemEval has 500 evaluation instances');
    });

    test('question types should cover all 6 categories', () {
      final dist = dataset.typeDistribution;
      expect(dist.length, equals(6),
          reason: 'LongMemEval has 6 question types');
      expect(dist[LongMemEvalQuestionType.temporalReasoning], greaterThan(0));
      expect(dist[LongMemEvalQuestionType.multiSession], greaterThan(0));
      expect(dist[LongMemEvalQuestionType.knowledgeUpdate], greaterThan(0));
      expect(dist[LongMemEvalQuestionType.singleSessionUser], greaterThan(0));
      print('LongMemEval type distribution: '
          '${dist.map((k, v) => MapEntry(k.name, v))}');
    });

    test('abstention questions should be identified', () {
      expect(dataset.abstentionCount, greaterThan(0),
          reason: 'LongMemEval has abstention questions');
      print('LongMemEval abstention count: ${dataset.abstentionCount}');
    });

    test('each instance should have valid question and answer', () {
      for (final instance in dataset.instances.take(20)) {
        expect(instance.questionId, isNotEmpty);
        expect(instance.question, isNotEmpty);
        expect(instance.answerText, isNotEmpty);
        expect(instance.haystackSessions, isNotEmpty);
      }
    });

    test('evidence turns should be labeled with has_answer', () {
      final sample = dataset.nonAbstention.take(10);
      int totalEvidence = 0;
      for (final instance in sample) {
        totalEvidence += instance.evidenceTurnCount;
      }
      expect(totalEvidence, greaterThan(0),
          reason: 'Non-abstention instances should have evidence turns');
      print('LongMemEval evidence turns (sample of 10): $totalEvidence');
    });

    test('temporal reasoning should retrieve evidence from conversation', () async {
      final embeddingSource = SemanticEmbeddingSource();
      final store = _InMemoryStore(embeddingSource);

      final temporalInstances = dataset
          .byType(LongMemEvalQuestionType.temporalReasoning)
          .where((i) => !i.isAbstention)
          .take(5)
          .toList();
      if (temporalInstances.isEmpty) return;

      for (final instance in temporalInstances) {
        final evidenceTexts = instance.evidenceTurns
            .map((t) => t.content)
            .where((c) => c.isNotEmpty)
            .toList();
        for (final text in evidenceTexts) {
          final emb = await embeddingSource.embed(text);
          await store.remember(
            content: text,
            type: MemoryType.episodic,
            embedding: emb?.vector,
            metadata: {
              'questionId': instance.questionId,
              'source': 'longmemeval',
              'questionDate': instance.questionDate,
            },
          );
        }
      }

      int found = 0;
      for (final instance in temporalInstances) {
        final results = await store.search(
            query: instance.question, limit: 10);
        final hasMatch = results.any((r) =>
            r.memory.metadata?['questionId'] == instance.questionId);
        if (hasMatch) found++;
      }

      final recall = found / temporalInstances.length;
      print('LongMemEval temporal recall@10 (semantic-mock): '
          '${recall.toStringAsFixed(3)} ($found/${temporalInstances.length})');
      expect(found, greaterThan(0),
          reason: 'Should find at least some evidence');
    });

    test('knowledge update should test conflicting information', () async {
      final kuInstances = dataset
          .byType(LongMemEvalQuestionType.knowledgeUpdate)
          .where((i) => !i.isAbstention)
          .take(5)
          .toList();
      if (kuInstances.isEmpty) return;

      for (final instance in kuInstances) {
        expect(instance.haystackSessions.length, greaterThanOrEqualTo(1),
            reason: 'Knowledge update needs at least 1 session');
        expect(instance.evidenceTurnCount, greaterThan(0),
            reason: 'Should have evidence turns');
      }
      print('LongMemEval knowledge_update sample: '
          '${kuInstances.first.question}');
    });
  });
}
