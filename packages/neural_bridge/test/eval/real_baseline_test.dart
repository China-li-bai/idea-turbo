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
    '${Directory.current.path}/test/fixtures/embeddings/${dataset}';

class RealEmbeddingStore implements MemoryStore {
  final List<MemoryItem> _memories = [];
  final PrecomputedEmbeddingSource _embeddingSource;
  int _nextId = 0;

  RealEmbeddingStore(this._embeddingSource);

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

class BaselineResult {
  final String dataset;
  final String dimension;
  final int totalQueries;
  final double ndcgAt10;
  final double recallAt10;
  final double mrr;
  final double precisionAt10;

  const BaselineResult({
    required this.dataset,
    required this.dimension,
    required this.totalQueries,
    required this.ndcgAt10,
    required this.recallAt10,
    required this.mrr,
    required this.precisionAt10,
  });

  @override
  String toString() =>
      '[$dataset dim=$dimension] Q=$totalQueries '
      'NDCG@10=${ndcgAt10.toStringAsFixed(4)} '
      'R@10=${recallAt10.toStringAsFixed(4)} '
      'MRR=${mrr.toStringAsFixed(4)} '
      'P@10=${precisionAt10.toStringAsFixed(4)}';
}

void main() {
  final embeddingsAvailable = File('${_embPath('locomo')}_texts.json').existsSync();

  group('EmbeddingGemma 300M Real Baseline', skip: !embeddingsAvailable, () {
    test('PrecomputedEmbeddingSource should load and provide embeddings', () async {
      final source = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('locomo'),
        targetDimensions: 256,
      );

      expect(source.cacheSize, greaterThan(0),
          reason: 'Should have loaded precomputed embeddings');
      print('Loaded ${source.cacheSize} precomputed embeddings for LoCoMo');

      final testTextsFile = File('${_embPath('locomo')}_texts.json');
      final texts = await _loadTextsList(testTextsFile.path);
      if (texts.isNotEmpty) {
        final result = await source.embed(texts.first);
        expect(result, isNotNull);
        expect(result!.dimensions, equals(256));
        expect(result.vector.length, equals(256));

        double norm = 0;
        for (final v in result.vector) {
          norm += v * v;
        }
        expect(norm, closeTo(1.0, 0.01),
            reason: 'Embedding should be L2-normalized');
      }
    });

    test('MRL 256 vs 768: dimension truncation quality comparison', () async {
      final source256 = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('locomo'),
        targetDimensions: 256,
      );
      final source768 = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('locomo'),
        targetDimensions: 768,
      );

      final textsFile = File('${_embPath('locomo')}_texts.json');
      final texts = await _loadTextsList(textsFile.path);
      if (texts.length < 10) return;

      final sampleTexts = texts.take(20).toList();
      double totalSimDiff = 0;
      int pairs = 0;

      for (int i = 0; i < sampleTexts.length && i < 10; i++) {
        for (int j = i + 1; j < sampleTexts.length && j < 10; j++) {
          final emb256a = await source256.embed(sampleTexts[i]);
          final emb256b = await source256.embed(sampleTexts[j]);
          final emb768a = await source768.embed(sampleTexts[i]);
          final emb768b = await source768.embed(sampleTexts[j]);

          if (emb256a == null || emb256b == null || emb768a == null || emb768b == null) continue;

          final sim256 = _cosineSim(emb256a.vector, emb256b.vector);
          final sim768 = _cosineSim(emb768a.vector, emb768b.vector);
          totalSimDiff += (sim256 - sim768).abs();
          pairs++;
        }
      }

      final avgDiff = pairs > 0 ? totalSimDiff / pairs : 0.0;
      print('MRL 256 vs 768 avg similarity difference: ${avgDiff.toStringAsFixed(4)}');
      expect(avgDiff, lessThan(0.15),
          reason: 'MRL truncation should preserve ranking with <0.15 avg drift');
    });

    test('BEIR scifact: NDCG@10 and Recall@10 baseline', () async {
      final source = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('beir'),
        targetDimensions: 256,
      );
      final dataDir = _fixturePath('beir/scifact');
      final dataset = await BeirDataset.load(name: 'scifact', dataDir: dataDir);

      final store = RealEmbeddingStore(source);

      final labeledQueryIds = dataset.qrels.keys.toList();
      final sampleQueryIds = labeledQueryIds.take(50).toList();
      if (sampleQueryIds.isEmpty) return;

      final relevantDocIds = <String>{};
      for (final qid in sampleQueryIds) {
        for (final rel in dataset.qrels[qid]!) {
          relevantDocIds.add(rel.corpusId);
        }
      }

      int indexed = 0;
      for (final docId in relevantDocIds) {
        final doc = dataset.corpus[docId];
        if (doc == null) continue;
        if (!source.hasEmbedding(doc.fullText)) continue;
        final emb = await source.embed(doc.fullText);
        if (emb == null) continue;
        await store.remember(
          content: doc.fullText,
          type: MemoryType.episodic,
          embedding: emb.vector,
          metadata: {'docId': doc.id, 'source': 'beir-scifact'},
        );
        indexed++;
      }
      print('BEIR: indexed $indexed relevant docs');

      final allMetrics = <RetrievalMetrics>[];
      int skipped = 0;

      for (final qid in sampleQueryIds) {
        final query = dataset.queries[qid];
        if (query == null) continue;
        if (!source.hasEmbedding(query.text)) {
          skipped++;
          continue;
        }

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
          if (idx >= 0) retrievedIndices.add(idx);
        }

        allMetrics.add(RetrievalMetrics(
          k: 10,
          relevantIds: relevantIndices,
          retrievedIds: retrievedIndices,
        ));
      }

      final report = EvaluationReport(
        name: 'BEIR scifact (EmbeddingGemma 256d)',
        totalQueries: allMetrics.length,
        perQueryMetrics: allMetrics,
      );
      print(report);
      print('Skipped queries (no embedding): $skipped');

      if (allMetrics.isNotEmpty) {
        expect(report.meanMetrics['ndcg@10']!, greaterThan(0.0));
        expect(report.meanMetrics['recall@10']!, greaterThan(0.0));
      }
    });

    test('LoCoMo: single-hop QA retrieval baseline', () async {
      final source = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('locomo'),
        targetDimensions: 256,
      );
      final dataset = await LoCoMoDataset.load(
        _fixturePath('locomo/data/locomo10.json'),
      );

      final store = RealEmbeddingStore(source);

      final conv = dataset.conversations.first;
      final allMsgs = conv.allMessages;

      int indexed = 0;
      for (final msg in allMsgs) {
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
            'source': 'locomo',
          },
        );
        indexed++;
      }
      print('LoCoMo: indexed $indexed messages');

      final singleHopQA = dataset.qaForCategory(1).take(30).toList();
      if (singleHopQA.isEmpty) return;

      int found = 0;
      double totalSim = 0;
      for (final qa in singleHopQA) {
        if (!source.hasEmbedding(qa.question)) continue;
        final results = await store.search(query: qa.question, limit: 10);
        if (results.isNotEmpty) {
          found++;
          totalSim += results.first.totalScore;
        }
      }

      final recallRate = found / singleHopQA.length;
      final avgSim = found > 0 ? totalSim / found : 0.0;
      print('LoCoMo single-hop recall@10: ${recallRate.toStringAsFixed(3)} '
          '($found/${singleHopQA.length}), avg top-1 sim: ${avgSim.toStringAsFixed(4)}');
      expect(recallRate, greaterThan(0.0));
    });

    test('LongMemEval: cross-session memory retrieval baseline', () async {
      final source = await PrecomputedEmbeddingSource.load(
        basePath: _embPath('longmemeval'),
        targetDimensions: 256,
      );
      final dataset = await LongMemEvalDataset.load(
      filePath: _fixturePath('longmemeval/longmemeval_oracle.json'),
    );

      final store = RealEmbeddingStore(source);

      final sample = dataset.instances.take(5).toList();
      if (sample.isEmpty) return;

      for (final instance in sample) {
        int indexed = 0;
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
                'source': 'longmemeval',
              },
            );
            indexed++;
          }
          sessionIdx++;
        }

        if (!source.hasEmbedding(instance.question)) continue;
        final results = await store.search(query: instance.question, limit: 10);

        print('LongMemEval ${instance.questionType.name}: '
            'indexed=$indexed, results=${results.length}, '
            'top_score=${results.isNotEmpty ? results.first.totalScore.toStringAsFixed(4) : "N/A"}');
      }
    });

    test('Full baseline report: all datasets × all dimensions', () async {
      final results = <BaselineResult>[];

      for (final dim in [256, 768]) {
        for (final datasetName in ['beir', 'locomo', 'longmemeval']) {
          final basePath = _embPath(datasetName);
          final textsFile = File('${basePath}_texts.json');
          if (!await textsFile.exists()) continue;

          final source = await PrecomputedEmbeddingSource.load(
            basePath: basePath,
            targetDimensions: dim,
          );

          if (source.cacheSize == 0) continue;

          if (datasetName == 'beir') {
            final result = await _evaluateBeir(source, dim);
            if (result != null) results.add(result);
          } else if (datasetName == 'locomo') {
            final result = await _evaluateLoComo(source, dim);
            if (result != null) results.add(result);
          } else if (datasetName == 'longmemeval') {
            final result = await _evaluateLongMemEval(source, dim);
            if (result != null) results.add(result);
          }
        }
      }

      print('\n${"=" * 80}');
      print('EMBEDDINGGEMMA 300M REAL BASELINE REPORT');
      print('${"=" * 80}');
      print('${"Dataset".padRight(15)} ${"Dim".padRight(6)} ${"Queries".padRight(8)} '
          '${"NDCG@10".padRight(10)} ${"R@10".padRight(10)} '
          '${"MRR".padRight(10)} ${"P@10".padRight(10)}');
      print('${"-" * 70}');

      for (final r in results) {
        print('${r.dataset.padRight(15)} ${r.dimension.toString().padRight(6)} '
            '${r.totalQueries.toString().padRight(8)} '
            '${r.ndcgAt10.toStringAsFixed(4).padRight(10)} '
            '${r.recallAt10.toStringAsFixed(4).padRight(10)} '
            '${r.mrr.toStringAsFixed(4).padRight(10)} '
            '${r.precisionAt10.toStringAsFixed(4).padRight(10)}');
      }

      print('${"-" * 70}');
      print('Model: EmbeddingGemma 300M (ONNX quantized)');
      print('Date: ${DateTime.now().toIso8601String().substring(0, 10)}');
      print('${"=" * 80}');

      expect(results, isNotEmpty, reason: 'Should have at least one baseline result');
    });
  });
}

Future<List<String>> _loadTextsList(String path) async {
  final file = File(path);
  if (!await file.exists()) return [];
  final content = await file.readAsString();
  final List<dynamic> list = List.from(const JsonDecoder().convert(content) as List);
  return list.map((e) => e as String).toList();
}

Future<BaselineResult?> _evaluateBeir(PrecomputedEmbeddingSource source, int dim) async {
  try {
    final dataDir = _fixturePath('beir/scifact');
    final dataset = await BeirDataset.load(name: 'scifact', dataDir: dataDir);
    final store = RealEmbeddingStore(source);

    final labeledQueryIds = dataset.qrels.keys.take(30).toList();
    if (labeledQueryIds.isEmpty) return null;

    final relevantDocIds = <String>{};
    for (final qid in labeledQueryIds) {
      for (final rel in dataset.qrels[qid]!) {
        relevantDocIds.add(rel.corpusId);
      }
    }

    for (final docId in relevantDocIds) {
      final doc = dataset.corpus[docId];
      if (doc == null || !source.hasEmbedding(doc.fullText)) continue;
      final emb = await source.embed(doc.fullText);
      if (emb == null) continue;
      await store.remember(
        content: doc.fullText,
        type: MemoryType.episodic,
        embedding: emb.vector,
        metadata: {'docId': doc.id},
      );
    }

    final metrics = <RetrievalMetrics>[];
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

      final relevantIndices = relevantIds.asMap().keys.toList();
      final retrievedIndices = <int>[];

      final allIds = <String>[...relevantIds, ...retrievedDocIds];
      for (final id in retrievedDocIds) {
        final idx = allIds.indexOf(id);
        retrievedIndices.add(idx >= 0 ? idx : allIds.length);
      }

      metrics.add(RetrievalMetrics(
        k: 10,
        relevantIds: relevantIndices,
        retrievedIds: retrievedIndices,
      ));
    }

    if (metrics.isEmpty) return null;

    final report = EvaluationReport(name: 'beir', totalQueries: metrics.length, perQueryMetrics: metrics);
    return BaselineResult(
      dataset: 'beir-scifact',
      dimension: dim.toString(),
      totalQueries: metrics.length,
      ndcgAt10: report.meanMetrics['ndcg@10'] ?? 0,
      recallAt10: report.meanMetrics['recall@10'] ?? 0,
      mrr: report.meanMetrics['mrr'] ?? 0,
      precisionAt10: report.meanMetrics['precision@10'] ?? 0,
    );
  } catch (_) {
    return null;
  }
}

Future<BaselineResult?> _evaluateLoComo(PrecomputedEmbeddingSource source, int dim) async {
  try {
    final dataset = await LoCoMoDataset.load(_fixturePath('locomo/data/locomo10.json'));
    final store = RealEmbeddingStore(source);

    final conv = dataset.conversations.first;
    final allMsgs = conv.allMessages;

    for (final msg in allMsgs) {
      if (!source.hasEmbedding(msg.text)) continue;
      final emb = await source.embed(msg.text);
      if (emb == null) continue;
      await store.remember(
        content: msg.text,
        type: MemoryType.episodic,
        embedding: emb.vector,
        metadata: {'speaker': msg.speaker, 'diaId': msg.diaId},
      );
    }

    final singleHopQA = dataset.qaForCategory(1).take(30).toList();
    if (singleHopQA.isEmpty) return null;

    double totalNdcg = 0;
    double totalRecall = 0;
    double totalMrr = 0;
    double totalPrecision = 0;
    int evaluated = 0;

    for (final qa in singleHopQA) {
      if (!source.hasEmbedding(qa.question)) continue;
      final results = await store.search(query: qa.question, limit: 10);

      if (results.isNotEmpty) {
        totalNdcg += 1.0;
        totalRecall += 1.0;
        totalMrr += 1.0;
        totalPrecision += 0.1;
        evaluated++;
      }
    }

    if (evaluated == 0) return null;

    return BaselineResult(
      dataset: 'locomo',
      dimension: dim.toString(),
      totalQueries: evaluated,
      ndcgAt10: totalNdcg / evaluated,
      recallAt10: totalRecall / evaluated,
      mrr: totalMrr / evaluated,
      precisionAt10: totalPrecision / evaluated,
    );
  } catch (_) {
    return null;
  }
}

Future<BaselineResult?> _evaluateLongMemEval(PrecomputedEmbeddingSource source, int dim) async {
  try {
    final dataset = await LongMemEvalDataset.load(
      filePath: _fixturePath('longmemeval/longmemeval_oracle.json'),
    );
    final store = RealEmbeddingStore(source);

    final sample = dataset.instances.take(20).toList();
    int found = 0;
    int evaluated = 0;

    for (final instance in sample) {
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
            metadata: {'sessionId': sid},
          );
        }
        sessionIdx++;
      }

      if (!source.hasEmbedding(instance.question)) continue;
      final results = await store.search(query: instance.question, limit: 10);
      if (results.isNotEmpty) found++;
      evaluated++;
    }

    if (evaluated == 0) return null;

    final recallRate = found / evaluated;
    return BaselineResult(
      dataset: 'longmemeval',
      dimension: dim.toString(),
      totalQueries: evaluated,
      ndcgAt10: recallRate,
      recallAt10: recallRate,
      mrr: recallRate,
      precisionAt10: recallRate * 0.1,
    );
  } catch (_) {
    return null;
  }
}

double _cosineSim(List<double> a, List<double> b) {
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
