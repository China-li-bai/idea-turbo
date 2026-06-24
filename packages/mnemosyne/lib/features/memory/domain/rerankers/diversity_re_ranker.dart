import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 're_ranking_strategy.dart';

/// 多样性重排策略。
///
/// 贪心地选择与已选结果最不相似的候选，最大化整体多样性。
/// 参考 isar_agent_memory 0.4.0 的 DiversityReRanker。
class DiversityReRanker implements ReRankingStrategy {
  @override
  List<MemorySearchResult> reRank(
    List<MemorySearchResult> results, {
    String? query,
  }) {
    if (results.isEmpty) return [];

    final reranked = <MemorySearchResult>[];
    final remaining = List<MemorySearchResult>.of(results);

    reranked.add(remaining.removeAt(0));

    while (remaining.isNotEmpty) {
      var bestCandidate = remaining.first;
      var bestScore = double.infinity;

      for (final candidate in remaining) {
        final maxSimilarity = reranked
            .map((r) => _cosineSimilarity(
                  r.memory.embedding,
                  candidate.memory.embedding,
                ))
            .reduce(max);

        if (maxSimilarity < bestScore) {
          bestScore = maxSimilarity;
          bestCandidate = candidate;
        }
      }

      reranked.add(bestCandidate);
      remaining.remove(bestCandidate);
    }

    return reranked;
  }

  double _cosineSimilarity(List<double>? a, List<double>? b) {
    if (a == null || b == null || a.length != b.length || a.isEmpty) {
      return 0.0;
    }
    double dotProduct = 0.0;
    double normA = 0.0;
    double normB = 0.0;
    for (var i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA == 0.0 || normB == 0.0) return 0.0;
    return dotProduct / (sqrt(normA) * sqrt(normB));
  }
}
