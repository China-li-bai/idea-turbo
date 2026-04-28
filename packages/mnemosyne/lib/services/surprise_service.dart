import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class SurpriseResult {
  final double surprise;
  final double nearestDistance;
  final String? nearestId;
  final bool isDuplicate;
  final double importanceModifier;

  SurpriseResult({
    required this.surprise,
    required this.nearestDistance,
    this.nearestId,
    required this.isDuplicate,
    required this.importanceModifier,
  });
}

class SurpriseService {
  final int kNeighbors;
  final double dedupThreshold;

  SurpriseService({
    this.kNeighbors = 5,
    this.dedupThreshold = 0.92,
  });

  SurpriseResult computeSurprise(
    List<double> embedding,
    List<MemoryItem> existingMemories,
  ) {
    if (existingMemories.isEmpty) {
      return SurpriseResult(
        surprise: 1.0,
        nearestDistance: 1.0,
        nearestId: null,
        isDuplicate: false,
        importanceModifier: 0.15,
      );
    }

    final distances = <_NeighborDist>[];
    for (final memory in existingMemories) {
      if (memory.embedding == null || memory.embedding!.isEmpty) continue;
      final similarity = _cosineSimilarity(embedding, memory.embedding!);
      distances.add(_NeighborDist(memory.id, 1.0 - similarity, similarity));
    }

    if (distances.isEmpty) {
      return SurpriseResult(
        surprise: 1.0,
        nearestDistance: 1.0,
        nearestId: null,
        isDuplicate: false,
        importanceModifier: 0.15,
      );
    }

    distances.sort((a, b) => a.distance.compareTo(b.distance));
    final kActual = distances.take(kNeighbors).toList();

    final nearestId = kActual.first.id;
    final nearestDistance = kActual.first.distance;
    final nearestSimilarity = kActual.first.similarity;

    final meanDistance = kActual.map((d) => d.distance).reduce((a, b) => a + b) / kActual.length;

    final surprise = _sigmoid(meanDistance, midpoint: 0.35, steepness: 10.0);
    final importanceModifier = (surprise - 0.5) * 0.6;
    final isDuplicate = nearestSimilarity >= dedupThreshold;

    return SurpriseResult(
      surprise: surprise,
      nearestDistance: nearestDistance,
      nearestId: nearestId,
      isDuplicate: isDuplicate,
      importanceModifier: importanceModifier,
    );
  }

  double adjustImportance(double baseImportance, SurpriseResult surpriseResult) {
    return (baseImportance + surpriseResult.importanceModifier).clamp(0.05, 1.0);
  }

  double _cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length || a.isEmpty) return 0.0;
    double dotProduct = 0, normA = 0, normB = 0;
    for (int i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA == 0 || normB == 0) return 0.0;
    return (dotProduct / (sqrt(normA) * sqrt(normB))).clamp(0.0, 1.0);
  }

  double _sigmoid(double x, {double midpoint = 0.35, double steepness = 10.0}) {
    final z = (steepness * (x - midpoint)).clamp(-20.0, 20.0);
    return 1.0 / (1.0 + exp(-z));
  }
}

class _NeighborDist {
  final String id;
  final double distance;
  final double similarity;
  _NeighborDist(this.id, this.distance, this.similarity);
}
