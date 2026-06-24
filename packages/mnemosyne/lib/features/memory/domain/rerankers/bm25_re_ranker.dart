import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 're_ranking_strategy.dart';

/// BM25 重排策略。
///
/// 基于 Okapi BM25 算法对检索结果按查询词频重排。
/// 参考 isar_agent_memory 0.4.0 的 BM25ReRanker。
class BM25ReRanker implements ReRankingStrategy {
  final double k1;
  final double b;

  BM25ReRanker({this.k1 = 1.5, this.b = 0.75});

  @override
  List<MemorySearchResult> reRank(
    List<MemorySearchResult> results, {
    String? query,
  }) {
    if (query == null || query.isEmpty || results.isEmpty) {
      return List.of(results);
    }

    final queryTerms = _tokenize(query);
    if (queryTerms.isEmpty) return List.of(results);

    final documents = results.map((r) => _tokenize(r.memory.content)).toList();
    final idf = _calculateIdf(queryTerms, documents);
    final avgdl = documents.isEmpty
        ? 0.0
        : documents.map((d) => d.length).reduce((a, b) => a + b) /
            documents.length;
    if (avgdl == 0.0) return List.of(results);

    final scored = <MapEntry<MemorySearchResult, double>>[];
    for (int i = 0; i < results.length; i++) {
      final bm25 = _calculateBm25(queryTerms, documents[i], idf, avgdl);
      scored.add(MapEntry(results[i], bm25));
    }

    scored.sort((a, b) => b.value.compareTo(a.value));

    return scored
        .map((e) => e.key.copyWith(totalScore: e.value))
        .toList();
  }

  List<String> _tokenize(String text) {
    return text
        .toLowerCase()
        .replaceAll(RegExp(r'[^\w\s\u4e00-\u9fa5]'), ' ')
        .split(RegExp(r'\s+'))
        .where((t) => t.isNotEmpty)
        .toList();
  }

  Map<String, double> _calculateIdf(
    List<String> queryTerms,
    List<List<String>> documents,
  ) {
    final idf = <String, double>{};
    final docCount = documents.length;
    for (final term in queryTerms.toSet()) {
      final docCountWithTerm = documents.where((d) => d.contains(term)).length;
      idf[term] = log((docCount - docCountWithTerm + 0.5) /
              (docCountWithTerm + 0.5) +
          1);
    }
    return idf;
  }

  double _calculateBm25(
    List<String> queryTerms,
    List<String> doc,
    Map<String, double> idf,
    double avgdl,
  ) {
    double score = 0.0;
    final docLen = doc.length;
    for (final term in queryTerms.toSet()) {
      final tf = doc.where((t) => t == term).length;
      if (tf == 0) continue;
      final idfVal = idf[term];
      if (idfVal == null) continue;
      score += idfVal *
          (tf * (k1 + 1)) /
          (tf + k1 * (1 - b + b * (docLen / avgdl)));
    }
    return score;
  }
}
