import 'dart:math' as math;

double _log2(double x) => x <= 0 ? 0.0 : math.log(x) / math.ln2;

class RetrievalMetrics {
  final int k;
  final List<int> relevantIds;
  final List<int> retrievedIds;

  const RetrievalMetrics({
    required this.k,
    required this.relevantIds,
    required this.retrievedIds,
  });

  double get precisionAtK {
    if (retrievedIds.isEmpty) return 0.0;
    final topK = retrievedIds.take(k).toList();
    final relevant = topK.where((id) => relevantIds.contains(id)).length;
    return relevant / topK.length;
  }

  double get recallAtK {
    if (relevantIds.isEmpty) return 0.0;
    final topK = retrievedIds.take(k).toList();
    final relevant = topK.where((id) => relevantIds.contains(id)).length;
    return relevant / relevantIds.length;
  }

  double get mrr {
    for (int i = 0; i < retrievedIds.length && i < k; i++) {
      if (relevantIds.contains(retrievedIds[i])) {
        return 1.0 / (i + 1);
      }
    }
    return 0.0;
  }

  double get ndcgAtK {
    final topK = retrievedIds.take(k).toList();
    if (topK.isEmpty || relevantIds.isEmpty) return 0.0;

    double dcg = 0.0;
    for (int i = 0; i < topK.length; i++) {
      final rel = relevantIds.contains(topK[i]) ? 1.0 : 0.0;
      dcg += rel / _log2(i + 2);
    }

    double idcg = 0.0;
    final idealCount = math.min(relevantIds.length, k);
    for (int i = 0; i < idealCount; i++) {
      idcg += 1.0 / _log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0.0;
  }

  Map<String, double> toMap() => {
        'precision@$k': precisionAtK,
        'recall@$k': recallAtK,
        'mrr': mrr,
        'ndcg@$k': ndcgAtK,
      };

  @override
  String toString() =>
      'P@$k=${precisionAtK.toStringAsFixed(3)} '
      'R@$k=${recallAtK.toStringAsFixed(3)} '
      'MRR=${mrr.toStringAsFixed(3)} '
      'NDCG@$k=${ndcgAtK.toStringAsFixed(3)}';
}

class EvaluationReport {
  final String name;
  final int totalQueries;
  final List<RetrievalMetrics> perQueryMetrics;
  final Map<String, double> meanMetrics;

  EvaluationReport({
    required this.name,
    required this.totalQueries,
    required this.perQueryMetrics,
  }) : meanMetrics = _computeMean(perQueryMetrics);

  static Map<String, double> _computeMean(List<RetrievalMetrics> metrics) {
    if (metrics.isEmpty) return {};
    final keys = metrics.first.toMap().keys.toList();
    final result = <String, double>{};
    for (final key in keys) {
      final values = metrics.map((m) => m.toMap()[key]!).toList();
      result[key] = values.reduce((a, b) => a + b) / values.length;
    }
    return result;
  }

  @override
  String toString() {
    final buf = StringBuffer('=== $name ===\n');
    buf.writeln('Total queries: $totalQueries');
    for (final entry in meanMetrics.entries) {
      buf.writeln('  ${entry.key}: ${entry.value.toStringAsFixed(4)}');
    }
    return buf.toString();
  }
}

class GradedRelevanceMetrics {
  final int k;
  final Map<int, int> relevanceGrades;
  final List<int> retrievedIds;

  const GradedRelevanceMetrics({
    required this.k,
    required this.relevanceGrades,
    required this.retrievedIds,
  });

  double get ndcgAtK {
    final topK = retrievedIds.take(k).toList();
    if (topK.isEmpty) return 0.0;

    double dcg = 0.0;
    for (int i = 0; i < topK.length; i++) {
      final rel = relevanceGrades[topK[i]]?.toDouble() ?? 0.0;
      dcg += (math.pow(2, rel) - 1) / _log2(i + 2);
    }

    final sortedGrades = relevanceGrades.values.toList()
      ..sort((a, b) => b.compareTo(a));
    double idcg = 0.0;
    for (int i = 0; i < math.min(sortedGrades.length, k); i++) {
      idcg += (math.pow(2, sortedGrades[i].toDouble()) - 1) / _log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0.0;
  }
}
