import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 're_ranking_strategy.dart';

/// MMR（Maximal Marginal Relevance）重排策略。
///
/// 在相关性和多样性之间做平衡：lambda=1 纯相关性，lambda=0 纯多样性。
/// 参考 isar_agent_memory 0.4.0 的 MMRReRanker。
class MMRReRanker implements ReRankingStrategy {
  final double lambda;

  MMRReRanker({this.lambda = 0.5});

  @override
  List<MemorySearchResult> reRank(
    List<MemorySearchResult> results, {
    String? query,
  }) {
    if (results.isEmpty) return [];

    final reranked = <MemorySearchResult>[];
    final remaining = List<MemorySearchResult>.of(results);

    // 第一个元素选相关性最高的（标准 MMR 算法）
    remaining.sort((a, b) => b.totalScore.compareTo(a.totalScore));
    reranked.add(remaining.removeAt(0));

    while (remaining.isNotEmpty) {
      var bestCandidate = remaining.first;
      var bestScore = -double.infinity;

      for (final candidate in remaining) {
        final relevance = candidate.totalScore;
        final maxSimilarity = reranked
            .map((r) => _cosineSimilarity(
                  r.memory.embedding,
                  candidate.memory.embedding,
                ))
            .reduce(max);
        final mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
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
