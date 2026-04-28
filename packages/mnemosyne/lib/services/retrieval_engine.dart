import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/memory/data/datasources/objectbox_memory_datasource.dart';
import 'package:mnemosyne/services/decay_service.dart';
import 'package:mnemosyne/services/keyword_extractor_service.dart';
import 'package:objectbox/objectbox.dart';

enum QueryIntent { why, when_, who, how, what }

class IntentWeights {
  final double dense;
  final double keyword;
  final double context;

  const IntentWeights({required this.dense, required this.keyword, required this.context});
}

class RetrievalEngine {
  final ObjectBoxMemoryDataSource datasource;
  final DecayService decayService;
  final KeywordExtractorService keywordExtractor;
  final int rrfK;

  RetrievalEngine({
    required this.datasource,
    required this.decayService,
    required this.keywordExtractor,
    this.rrfK = 60,
  });

  static QueryIntent classifyIntent(String query) {
    final q = query.toLowerCase();
    if (RegExp(r'\b(为什么|why|原因|because|reason|导致)\b').hasMatch(q)) return QueryIntent.why;
    if (RegExp(r'\b(什么时候|when|时间|date|time|之前|之后)\b').hasMatch(q)) return QueryIntent.when_;
    if (RegExp(r'\b(谁|who|人|person|谁说的)\b').hasMatch(q)) return QueryIntent.who;
    if (RegExp(r'\b(怎么|how|步骤|方法|如何|过程)\b').hasMatch(q)) return QueryIntent.how;
    return QueryIntent.what;
  }

  static IntentWeights getIntentWeights(QueryIntent intent) {
    switch (intent) {
      case QueryIntent.why:
        return const IntentWeights(dense: 1.0, keyword: 0.8, context: 1.5);
      case QueryIntent.when_:
        return const IntentWeights(dense: 0.8, keyword: 1.2, context: 0.8);
      case QueryIntent.who:
        return const IntentWeights(dense: 0.8, keyword: 0.8, context: 1.8);
      case QueryIntent.how:
        return const IntentWeights(dense: 1.2, keyword: 1.0, context: 0.8);
      case QueryIntent.what:
        return const IntentWeights(dense: 1.0, keyword: 1.0, context: 1.0);
    }
  }

  Future<List<MemorySearchResult>> retrieve({
    required String query,
    required List<double> queryEmbedding,
    EncodingContext? currentContext,
    DateTime? now,
    int limit = 10,
  }) async {
    now ??= DateTime.now();
    final intent = classifyIntent(query);
    final intentWeights = getIntentWeights(intent);

    final denseResults = await _denseSearch(queryEmbedding, limit * 3);
    final keywordResults = await _keywordSearch(query, limit * 3);
    final allActive = await datasource.getActiveMemories();

    final denseRanking = denseResults.map((r) => _RankEntry(r.object.uid, 1.0 / (1.0 + r.score))).toList();
    final keywordRanking = keywordResults.asMap().entries.map((e) {
      final rank = e.key + 1;
      return _RankEntry(e.value.id, 1.0 / rank);
    }).toList();
    final contextRanking = _rankByContext(allActive, currentContext);

    final rrfScores = _rrfFuse(
      [denseRanking, keywordRanking, contextRanking],
      signalWeights: [
        intentWeights.dense,
        intentWeights.keyword,
        intentWeights.context,
      ],
    );

    final results = <MemorySearchResult>[];
    final sortedRrf = rrfScores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final memoryMap = <String, MemoryItem>{};
    for (final m in allActive) {
      memoryMap[m.id] = m;
    }
    for (final dense in denseResults) {
      final domain = dense.object.toDomain();
      memoryMap[domain.id] = domain;
    }
    for (final m in keywordResults) {
      memoryMap[m.id] = m;
    }

    for (final entry in sortedRrf.take(limit)) {
      final memory = memoryMap[entry.key];
      if (memory == null) continue;

      final decayedMemory = decayService.applyDecay(memory, now);

      var boostedScore = entry.value;
      boostedScore *= (0.8 + 0.4 * memory.importance);
      if (memory.type == MemoryType.episodic) {
        final temporalDecay = decayService.calculateTemporalDecay(memory, now);
        boostedScore *= (0.5 + 0.5 * temporalDecay);
      }
      if (memory.accessCount > 0) {
        boostedScore *= (1.0 + 0.1 * log(1 + memory.accessCount));
      }

      final contextMatchScore = currentContext != null && memory.encodingContext != null
          ? memory.encodingContext!.calculateMatchScore(currentContext)
          : 0.0;

      results.add(MemorySearchResult(
        memory: decayedMemory,
        totalScore: boostedScore,
        semanticScore: _getScore(denseRanking, memory.id),
        keywordScore: _getScore(keywordRanking, memory.id),
        recencyScore: decayService.calculateRecencyScore(memory, now),
        importanceScore: memory.importance,
        contextMatchScore: contextMatchScore,
      ));
    }

    results.sort((a, b) => b.totalScore.compareTo(a.totalScore));
    return results.take(limit).toList();
  }

  Future<List<ObjectWithScore<MemoryEntity>>> _denseSearch(
    List<double> queryEmbedding,
    int topK,
  ) async {
    try {
      return await datasource.vectorSearch(queryEmbedding, topK);
    } catch (_) {
      return [];
    }
  }

  Future<List<MemoryItem>> _keywordSearch(String query, int limit) async {
    final keywords = keywordExtractor.extractKeywords(query);
    if (keywords.isEmpty) return [];
    return await datasource.keywordSearch(keywords.first, limit: limit);
  }

  List<_RankEntry> _rankByContext(List<MemoryItem> memories, EncodingContext? currentContext) {
    if (currentContext == null) {
      return memories.map((m) => _RankEntry(m.id, 0.0)).toList();
    }
    final ranked = memories.map((m) {
      final score = m.encodingContext?.calculateMatchScore(currentContext) ?? 0.0;
      return _RankEntry(m.id, score);
    }).toList()
      ..sort((a, b) => b.score.compareTo(a.score));
    return ranked;
  }

  Map<String, double> _rrfFuse(
    List<List<_RankEntry>> rankings, {
    List<double>? signalWeights,
  }) {
    final scores = <String, double>{};
    final weights = signalWeights ?? List.filled(rankings.length, 1.0);

    for (int i = 0; i < rankings.length; i++) {
      final ranking = rankings[i];
      final weight = weights[i];
      for (int rank = 0; rank < ranking.length; rank++) {
        final docId = ranking[rank].id;
        scores[docId] = (scores[docId] ?? 0.0) + weight * (1.0 / (rrfK + rank + 1));
      }
    }
    return scores;
  }

  double _getScore(List<_RankEntry> ranking, String id) {
    for (final entry in ranking) {
      if (entry.id == id) return entry.score;
    }
    return 0.0;
  }
}

class _RankEntry {
  final String id;
  final double score;
  _RankEntry(this.id, this.score);
}
