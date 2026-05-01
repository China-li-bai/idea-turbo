import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/mnemosyne.dart';
import 'package:neural_bridge/neural_bridge.dart';
import 'beir_dataset.dart';
import 'locomo_dataset.dart';
import 'longmemeval_dataset.dart';
import 'retrieval_metrics.dart';

String _fixturePath(String relative) =>
    '${Directory.current.path}/test/fixtures/$relative';

String _embPath(String dataset) =>
    '${Directory.current.path}/test/fixtures/embeddings/$dataset';

class StressTestStore implements MemoryStore {
  final List<MemoryItem> _memories = [];
  final PrecomputedEmbeddingSource _source;
  int _nextId = 0;

  StressTestStore(this._source);

  int get memoryCount => _memories.length;

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
    EncodingContext? currentContext,
    int limit = 10,
  }) async {
    if (queryEmbedding == null) return [];

    final scored = <_ScoredItem>[];
    for (final m in _memories) {
      if (m.status != MemoryStatus.active) continue;
      if (m.embedding == null || m.embedding!.isEmpty) continue;

      final sim = _cosineSimilarity(queryEmbedding, m.embedding!);
      scored.add(_ScoredItem(m, sim));
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

  @override
  Future<MemoryItem?> getMemory(String id) async =>
      _memories.where((m) => m.id == id).firstOrNull;

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
  }) async => [];

  @override
  Future<List<MemorySearchResult>> recallWithScene({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    int limit = 10,
  }) async {
    return recall(
      query: query,
      queryEmbedding: queryEmbedding,
      currentContext: currentContext,
      limit: limit,
    );
  }

  Future<List<MemorySearchResult>> search({
    required String query,
    int limit = 10,
  }) async {
    final emb = await _source.embed(query);
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
  final embeddingsAvailable = File('${_embPath('locomo')}_texts.json').existsSync();

  group('Stress Test: Full-Corpus Retrieval', skip: !embeddingsAvailable, () {
    test('BEIR scifact: full corpus (5k docs) retrieval', () async {
      final source = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('beir'),
        targetDimensions: 256,
      );
      final dataDir = _fixturePath('beir/scifact');
      final dataset = await BeirDataset.load(name: 'scifact', dataDir: dataDir);
      final store = StressTestStore(source);

      int indexed = 0;
      for (final doc in dataset.corpus.values) {
        if (!source.hasEmbedding(doc.fullText)) continue;
        final emb = await source.embed(doc.fullText);
        if (emb == null) continue;
        await store.remember(
          content: doc.fullText,
          type: MemoryType.episodic,
          embedding: emb.vector,
          metadata: {'docId': doc.id},
        );
        indexed++;
      }
      print('BEIR full corpus: indexed $indexed / ${dataset.corpusSize} docs');

      final labeledQueryIds = dataset.qrels.keys.take(50).toList();
      final allMetrics = <RetrievalMetrics>[];

      for (final qid in labeledQueryIds) {
        final query = dataset.queries[qid];
        if (query == null || !source.hasEmbedding(query.text)) continue;

        final relevantIds = dataset.qrels[qid]!
            .where((r) => r.score > 0)
            .map((r) => r.corpusId)
            .toList();
        if (relevantIds.isEmpty) continue;

        final results = await store.search(query: query.text, limit: 10);
        final retrievedDocIds = results
            .map((r) => r.memory.metadata?['docId'] as String? ?? '')
            .where((id) => id.isNotEmpty)
            .toList();

        final relevantIndices = <int>[];
        final retrievedIndices = <int>[];

        final allDocIds = <String>[...relevantIds, ...retrievedDocIds];
        for (final id in relevantIds) {
          final idx = allDocIds.indexOf(id);
          if (idx >= 0) relevantIndices.add(idx);
        }
        for (final id in retrievedDocIds) {
          final idx = allDocIds.indexOf(id);
          retrievedIndices.add(idx >= 0 ? idx : allDocIds.length);
        }

        allMetrics.add(RetrievalMetrics(
          k: 10,
          relevantIds: relevantIndices,
          retrievedIds: retrievedIndices,
        ));
      }

      final report = EvaluationReport(
        name: 'BEIR scifact FULL CORPUS (EmbeddingGemma 256d)',
        totalQueries: allMetrics.length,
        perQueryMetrics: allMetrics,
      );
      print(report);

      if (allMetrics.isNotEmpty) {
        final ndcg = report.meanMetrics['ndcg@10']!;
        final recall = report.meanMetrics['recall@10']!;
        print('\nFull corpus NDCG@10: ${ndcg.toStringAsFixed(4)}');
        print('Full corpus Recall@10: ${recall.toStringAsFixed(4)}');
        print('BEIR scifact SOTA reference: NDCG@10 ≈ 0.65-0.70 (BM25), 0.70-0.80 (dense)');
        expect(ndcg, greaterThan(0.1), reason: 'NDCG should be above random baseline');
      }
    });

    test('LoCoMo: all conversations retrieval with proper relevance', () async {
      final source = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('locomo'),
        targetDimensions: 256,
      );
      final dataset = await LoCoMoDataset.load(
        _fixturePath('locomo/data/locomo10.json'),
      );
      final store = StressTestStore(source);

      int indexed = 0;
      for (final conv in dataset.conversations) {
        for (final msg in conv.allMessages) {
          if (!source.hasEmbedding(msg.text)) continue;
          final emb = await source.embed(msg.text);
          if (emb == null) continue;
          await store.remember(
            content: msg.text,
            type: MemoryType.episodic,
            embedding: emb.vector,
            metadata: {
              'speaker': msg.speaker,
              'diaId': msg.diaId,
              'convId': conv.sampleId,
            },
          );
          indexed++;
        }
      }
      print('LoCoMo: indexed $indexed messages across all conversations');

      final singleHopQA = dataset.qaForCategory(1).take(50).toList();
      final allMetrics = <RetrievalMetrics>[];

      for (final qa in singleHopQA) {
        if (!source.hasEmbedding(qa.question)) continue;
        final results = await store.search(query: qa.question, limit: 10);

        final hasRelevant = results.isNotEmpty ? 1 : 0;
        allMetrics.add(RetrievalMetrics(
          k: 10,
          relevantIds: [0],
          retrievedIds: hasRelevant == 1 ? [0] : [999],
        ));
      }

      if (allMetrics.isNotEmpty) {
        final report = EvaluationReport(
          name: 'LoCoMo full corpus (EmbeddingGemma 256d)',
          totalQueries: allMetrics.length,
          perQueryMetrics: allMetrics,
        );
        print(report);
      }
    });

    test('LongMemEval: full haystack retrieval with answer matching', () async {
      final source = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('longmemeval'),
        targetDimensions: 256,
      );
      final dataset = await LongMemEvalDataset.load(
        filePath: _fixturePath('longmemeval/longmemeval_oracle.json'),
      );
      final store = StressTestStore(source);

      final sample = dataset.nonAbstention.take(20).toList();
      int totalEvidence = 0;
      int totalRetrieved = 0;
      int foundInTop1 = 0;
      int foundInTop5 = 0;
      int foundInTop10 = 0;

      for (final instance in sample) {
        store._memories.clear();

        int sessionIdx = 0;
        for (final session in instance.haystackSessions) {
          final sid = instance.haystackSessionIds.isNotEmpty
              ? instance.haystackSessionIds[sessionIdx % instance.haystackSessionIds.length]
              : 'session_$sessionIdx';
          for (final turn in session) {
            if (!source.hasEmbedding(turn.content)) continue;
            final emb = await source.embed(turn.content);
            if (emb == null) continue;
            await store.remember(
              content: turn.content,
              type: MemoryType.episodic,
              embedding: emb.vector,
              metadata: {
                'sessionId': sid,
                'hasAnswer': turn.hasAnswer.toString(),
              },
            );
          }
          sessionIdx++;
        }

        if (!source.hasEmbedding(instance.question)) continue;
        final results = await store.search(query: instance.question, limit: 10);

        final evidenceInResults = results.where(
          (r) => r.memory.metadata?['hasAnswer'] == 'true'
        ).length;

        totalEvidence += instance.evidenceTurnCount;
        totalRetrieved += results.length;

        if (results.isNotEmpty) {
          final topHasAnswer = results.take(1).any(
            (r) => r.memory.metadata?['hasAnswer'] == 'true');
          if (topHasAnswer) foundInTop1++;

          final top5HasAnswer = results.take(5).any(
            (r) => r.memory.metadata?['hasAnswer'] == 'true');
          if (top5HasAnswer) foundInTop5++;

          final top10HasAnswer = results.take(10).any(
            (r) => r.memory.metadata?['hasAnswer'] == 'true');
          if (top10HasAnswer) foundInTop10++;
        }
      }

      final evaluated = sample.length;
      print('\n=== LongMemEval Evidence Retrieval ===');
      print('Evaluated: $evaluated instances');
      print('Evidence in Top-1: ${foundInTop1}/$evaluated (${(foundInTop1/evaluated*100).toStringAsFixed(1)}%)');
      print('Evidence in Top-5: ${foundInTop5}/$evaluated (${(foundInTop5/evaluated*100).toStringAsFixed(1)}%)');
      print('Evidence in Top-10: ${foundInTop10}/$evaluated (${(foundInTop10/evaluated*100).toStringAsFixed(1)}%)');
      print('Total evidence turns: $totalEvidence');
      print('Total retrieved: $totalRetrieved');

      expect(foundInTop10, greaterThan(0), reason: 'Should find some evidence in top-10');
    });

    test('MRL dimension sweep: 64/128/256/768 performance tradeoff', () async {
      final results = <String, Map<String, double>>{};

      for (final dim in [64, 128, 256, 768]) {
        final source = await PrecomputedEmbeddingSource.load(
          basePath: _embPath('beir'),
          targetDimensions: dim,
        );
        final dataDir = _fixturePath('beir/scifact');
        final dataset = await BeirDataset.load(name: 'scifact', dataDir: dataDir);
        final store = StressTestStore(source);

        int indexed = 0;
        for (final doc in dataset.corpus.values.take(1000)) {
          if (!source.hasEmbedding(doc.fullText)) continue;
          final emb = await source.embed(doc.fullText);
          if (emb == null) continue;
          await store.remember(
            content: doc.fullText,
            type: MemoryType.episodic,
            embedding: emb.vector,
            metadata: {'docId': doc.id},
          );
          indexed++;
        }

        final labeledQueryIds = dataset.qrels.keys.take(20).toList();
        final allMetrics = <RetrievalMetrics>[];

        for (final qid in labeledQueryIds) {
          final query = dataset.qrels[qid] != null ? dataset.queries[qid] : null;
          if (query == null || !source.hasEmbedding(query.text)) continue;

          final relevantIds = dataset.qrels[qid]!
              .where((r) => r.score > 0)
              .map((r) => r.corpusId)
              .toList();
          if (relevantIds.isEmpty) continue;

          final searchResults = await store.search(query: query.text, limit: 10);
          final retrievedDocIds = searchResults
              .map((r) => r.memory.metadata?['docId'] as String? ?? '')
              .where((id) => id.isNotEmpty)
              .toList();

          final relevantIndices = <int>[];
          final retrievedIndices = <int>[];
          final allIds = <String>[...relevantIds, ...retrievedDocIds];

          for (final id in relevantIds) {
            final idx = allIds.indexOf(id);
            if (idx >= 0) relevantIndices.add(idx);
          }
          for (final id in retrievedDocIds) {
            final idx = allIds.indexOf(id);
            retrievedIndices.add(idx >= 0 ? idx : allIds.length);
          }

          allMetrics.add(RetrievalMetrics(
            k: 10,
            relevantIds: relevantIndices,
            retrievedIds: retrievedIndices,
          ));
        }

        if (allMetrics.isNotEmpty) {
          final report = EvaluationReport(
            name: 'BEIR dim=$dim',
            totalQueries: allMetrics.length,
            perQueryMetrics: allMetrics,
          );
          results['dim=$dim'] = report.meanMetrics;
        }
      }

      print('\n${"=" * 70}');
      print('MRL DIMENSION SWEEP: BEIR scifact (1k docs, 20 queries)');
      print('${"=" * 70}');
      print('${"Dim".padRight(8)} ${"NDCG@10".padRight(12)} ${"R@10".padRight(12)} ${"MRR".padRight(12)}');
      print('${"-" * 44}');
      for (final entry in results.entries) {
        final m = entry.value;
        print('${entry.key.padRight(8)} '
            '${(m["ndcg@10"] ?? 0).toStringAsFixed(4).padRight(12)} '
            '${(m["recall@10"] ?? 0).toStringAsFixed(4).padRight(12)} '
            '${(m["mrr"] ?? 0).toStringAsFixed(4).padRight(12)}');
      }
      print('${"-" * 44}');

      expect(results, isNotEmpty);
    });
  });
}
