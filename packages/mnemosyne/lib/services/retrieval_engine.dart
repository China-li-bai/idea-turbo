import 'dart:math';
import 'package:mnemosyne/core/constants.dart';
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

const Map<String, List<String>> _queryExpansions = {
  'auth': ['authentication', 'login', 'oauth', 'token', '认证', '登录'],
  'bug': ['issue', 'error', 'failure', '缺陷', '错误'],
  'deploy': ['deployment', 'release', 'ship', '部署', '发布'],
  'memory': ['recall', 'context', 'history', '记忆', '回忆'],
  'graph': ['entity', 'relationship', '图', '关系'],
  'code': ['function', 'class', 'file', '代码', '函数'],
  'config': ['configuration', 'settings', '配置', '设置'],
  'api': ['endpoint', 'route', '接口'],
  'db': ['database', 'storage', '数据库', '存储'],
  'ai': ['artificial intelligence', 'ml', 'model', '人工智能', '模型'],
  '安全': ['security', 'vulnerability', '漏洞'],
  '性能': ['performance', 'optimization', '优化'],
  '架构': ['architecture', 'design', '设计'],
};

enum RetrievalProfile {
  factsOnly,
  factsPlusRules,
  fullContext,
}

class RetrievalEngine {
  final ObjectBoxMemoryDataSource datasource;
  final DecayService decayService;
  final KeywordExtractorService keywordExtractor;
  final int rrfK;
  final double minConfidence;
  final double exactMatchBoost;
  final bool enableQueryExpansion;
  final RetrievalProfile retrievalProfile;

  RetrievalEngine({
    required this.datasource,
    required this.decayService,
    required this.keywordExtractor,
    this.rrfK = 60,
    this.minConfidence = 0.0,
    this.exactMatchBoost = 1.5,
    this.enableQueryExpansion = true,
    this.retrievalProfile = RetrievalProfile.fullContext,
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
    final queryTokens = _tokenize(query);

    final expandedTerms = enableQueryExpansion ? _expandQuery(queryTokens) : <String>[];
    final expandedQuery = expandedTerms.isNotEmpty
        ? '$query ${expandedTerms.take(8).join(' ')}'
        : query;

    final denseResults = await _denseSearch(queryEmbedding, limit * 3);
    final keywordResults = await _keywordSearch(expandedQuery, limit * 3);
    final allActive = await datasource.getActiveMemories();

    final allowedTypes = _getAllowedTypes(retrievalProfile);

    final denseRanking = denseResults.map((r) => _RankEntry(r.object.memoryUid, 1.0 / (1.0 + r.score))).toList();
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

    final sortedRrf = rrfScores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final memoryMap = <String, MemoryItem>{};
    for (final m in allActive) {
      memoryMap[m.id] = m;
    }
    for (final m in keywordResults) {
      memoryMap[m.id] = m;
    }

    final boosted = <MapEntry<String, double>>[];
    for (final entry in sortedRrf) {
      final memory = memoryMap[entry.key];
      if (memory == null) continue;

      if (memory.status == MemoryStatus.superseded ||
          memory.status == MemoryStatus.invalidated) continue;

      if (!allowedTypes.contains(memory.type)) continue;

      var score = entry.value;

      if (memory.status == MemoryStatus.challenged) {
        score *= 0.7;
      }

      score *= (0.8 + 0.4 * memory.importance);

      final temporalSignal = _detectTemporal(query);
      if (temporalSignal != null && memory.encodingContext?.capturedAt != null) {
        final memDate = _formatDate(memory.encodingContext!.capturedAt!);
        if (memDate.contains(temporalSignal)) {
          score *= 2.0;
        }
      }

      final exactSignal = _exactMatchSignal(queryTokens, memory);
      if (exactSignal > 0) {
        score *= (1.0 + exactSignal * (exactMatchBoost - 1.0));
      }

      if (memory.type == MemoryType.episodic) {
        final temporalDecay = decayService.calculateTemporalDecay(memory, now);
        score *= (0.5 + 0.5 * temporalDecay);
      }
      if (memory.accessCount > 0) {
        score *= (1.0 + 0.1 * log(1 + memory.accessCount));
      }

      boosted.add(MapEntry(entry.key, score));
    }

    boosted.sort((a, b) => b.value.compareTo(a.value));

    final results = <MemorySearchResult>[];
    for (final entry in boosted.take(limit)) {
      final memory = memoryMap[entry.key];
      if (memory == null) continue;

      if (minConfidence > 0 && entry.value < minConfidence) continue;

      final decayedMemory = decayService.applyDecay(memory, now);

      final contextMatchScore = currentContext != null && memory.encodingContext != null
          ? memory.encodingContext!.calculateMatchScore(currentContext)
          : 0.0;

      results.add(MemorySearchResult(
        memory: decayedMemory,
        totalScore: entry.value,
        semanticScore: _getScore(denseRanking, memory.id),
        keywordScore: _getScore(keywordRanking, memory.id),
        recencyScore: decayService.calculateRecencyScore(memory, now),
        importanceScore: memory.importance,
        contextMatchScore: contextMatchScore,
      ));
    }

    return results;
  }

  Future<List<ObjectWithScore<MemoryVectorIndex>>> _denseSearch(
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
    if (keywords.isEmpty) {
      return await datasource.keywordSearch(query, limit: limit);
    }
    final results = <String, MemoryItem>{};
    for (final keyword in keywords) {
      final matches = await datasource.keywordSearch(keyword, limit: limit);
      for (final m in matches) {
        results[m.id] = m;
      }
      if (results.length >= limit) break;
    }
    return results.values.toList();
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

  List<String> _tokenize(String query) {
    return query
        .toLowerCase()
        .replaceAll(RegExp(r'[^\w\s\u4e00-\u9fa5]'), ' ')
        .split(RegExp(r'\s+'))
        .where((t) => t.length > 1)
        .toList();
  }

  double _exactMatchSignal(List<String> queryTokens, MemoryItem memory) {
    final content = memory.content.toLowerCase();
    final keywords = memory.keywords.map((k) => k.toLowerCase()).toList();
    double score = 0.0;

    int tokenHits = 0;
    for (final token in queryTokens.take(8)) {
      if (token.length > 2 && content.contains(token)) {
        tokenHits++;
      }
    }
    score += min(0.6, tokenHits * 0.12);

    for (final keyword in keywords) {
      if (queryTokens.contains(keyword)) {
        score += 0.2;
        break;
      }
    }

    return min(1.0, score);
  }

  String? _detectTemporal(String query) {
    final datePattern = RegExp(r'\b(\d{4}-\d{2}-\d{2})\b');
    final match = datePattern.firstMatch(query);
    if (match != null) return match.group(1);

    final monthPattern = RegExp(r'\b(\d{4}-\d{2})\b');
    final monthMatch = monthPattern.firstMatch(query);
    if (monthMatch != null) return monthMatch.group(1);

    final chineseDatePattern = RegExp(r'(\d{4})年(\d{1,2})月(\d{1,2})日');
    final cnMatch = chineseDatePattern.firstMatch(query);
    if (cnMatch != null) {
      final y = cnMatch.group(1);
      final m = cnMatch.group(2)!.padLeft(2, '0');
      final d = cnMatch.group(3)!.padLeft(2, '0');
      return '$y-$m-$d';
    }

    final chineseMonthPattern = RegExp(r'(\d{4})年(\d{1,2})月');
    final cnMonthMatch = chineseMonthPattern.firstMatch(query);
    if (cnMonthMatch != null) {
      final y = cnMonthMatch.group(1);
      final m = cnMonthMatch.group(2)!.padLeft(2, '0');
      return '$y-$m';
    }

    final relativePattern = RegExp(r'(昨天|前天|上周|上个月|去年|今天)');
    final relMatch = relativePattern.firstMatch(query);
    if (relMatch != null) return relMatch.group(1);

    return null;
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  static double normalizeBm25Score(double rawScore, double midpoint, double steepness) {
    final z = (steepness * (rawScore - midpoint)).clamp(-20.0, 20.0);
    return 1.0 / (1.0 + exp(-z));
  }

  static (double midpoint, double steepness) getBm25Params(int queryTermCount) {
    if (queryTermCount <= 3) return (5.0, 0.7);
    if (queryTermCount <= 6) return (7.0, 0.6);
    if (queryTermCount <= 9) return (9.0, 0.5);
    if (queryTermCount <= 15) return (10.0, 0.5);
    return (12.0, 0.5);
  }

  List<String> _expandQuery(List<String> tokens) {
    final expanded = <String>[];
    final seen = <String>{};
    for (final token in tokens) {
      final lower = token.toLowerCase();
      if (seen.contains(lower)) continue;
      seen.add(lower);
      final expansions = _queryExpansions[lower];
      if (expansions != null) {
        for (final exp in expansions) {
          if (!seen.contains(exp.toLowerCase())) {
            expanded.add(exp);
            seen.add(exp.toLowerCase());
          }
        }
      }
    }
    return expanded;
  }

  Set<MemoryType> _getAllowedTypes(RetrievalProfile profile) {
    switch (profile) {
      case RetrievalProfile.factsOnly:
        return {MemoryType.semantic};
      case RetrievalProfile.factsPlusRules:
        return {MemoryType.semantic, MemoryType.instruction};
      case RetrievalProfile.fullContext:
        return MemoryType.values.toSet();
    }
  }
}

class _RankEntry {
  final String id;
  final double score;
  _RankEntry(this.id, this.score);
}
