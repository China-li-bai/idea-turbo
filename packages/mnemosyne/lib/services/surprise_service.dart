import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class SurpriseResult {
  final double surprise;
  final double nearestDistance;
  final String? nearestId;
  final List<String> nearestIds;
  final bool isDuplicate;
  final double importanceModifier;
  final List<double> kDistances;

  SurpriseResult({
    required this.surprise,
    required this.nearestDistance,
    this.nearestId,
    this.nearestIds = const [],
    required this.isDuplicate,
    required this.importanceModifier,
    this.kDistances = const [],
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
        nearestIds: [],
        isDuplicate: false,
        importanceModifier: 0.15,
        kDistances: [],
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
        nearestIds: [],
        isDuplicate: false,
        importanceModifier: 0.15,
        kDistances: [],
      );
    }

    distances.sort((a, b) => a.distance.compareTo(b.distance));
    final kActual = distances.take(kNeighbors).toList();

    final nearestId = kActual.first.id;
    final nearestDistance = kActual.first.distance;
    final nearestSimilarity = kActual.first.similarity;
    final nearestIds = kActual.map((d) => d.id).toList();
    final kDistances = kActual.map((d) => double.parse(d.distance.toStringAsFixed(4))).toList();

    final meanDistance = kActual.map((d) => d.distance).reduce((a, b) => a + b) / kActual.length;

    final surprise = _sigmoid(meanDistance, midpoint: 0.35, steepness: 10.0);
    final importanceModifier = (surprise - 0.5) * 0.6;
    final isDuplicate = nearestSimilarity >= dedupThreshold;

    return SurpriseResult(
      surprise: double.parse(surprise.toStringAsFixed(4)),
      nearestDistance: double.parse(nearestDistance.toStringAsFixed(4)),
      nearestId: nearestId,
      nearestIds: nearestIds,
      isDuplicate: isDuplicate,
      importanceModifier: double.parse(importanceModifier.toStringAsFixed(4)),
      kDistances: kDistances,
    );
  }

  double adjustImportance(double baseImportance, SurpriseResult surpriseResult) {
    final adjusted = baseImportance + surpriseResult.importanceModifier;
    return adjusted.clamp(0.05, 1.0);
  }

  List<({String id, double similarity})> findDuplicates(
    List<MemoryItem> memories, {
    double threshold = 0.92,
    int limit = 500,
  }) {
    final duplicates = <({String id, double similarity})>[];
    final checked = <String>{};

    for (int i = 0; i < memories.length && i < limit; i++) {
      final m1 = memories[i];
      if (m1.embedding == null || m1.embedding!.isEmpty) continue;

      for (int j = i + 1; j < memories.length && j < limit; j++) {
        final m2 = memories[j];
        if (m2.embedding == null || m2.embedding!.isEmpty) continue;

        final pairKey = '${m1.id}:${m2.id}';
        if (checked.contains(pairKey)) continue;
        checked.add(pairKey);

        final similarity = _cosineSimilarity(m1.embedding!, m2.embedding!);
        if (similarity >= threshold) {
          duplicates.add((id: m2.id, similarity: similarity));
        }
      }
    }

    duplicates.sort((a, b) => b.similarity.compareTo(a.similarity));
    return duplicates;
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
