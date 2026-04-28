import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class ImportanceResult {
  final double finalScore;
  final double recencyScore;
  final double frequencyScore;
  final double emotionalScore;
  final double surpriseScore;
  final double entityScore;
  final double explicitScore;
  final double sourceMultiplier;
  final Map<String, double> breakdown;

  ImportanceResult({
    required this.finalScore,
    required this.recencyScore,
    required this.frequencyScore,
    required this.emotionalScore,
    required this.surpriseScore,
    required this.entityScore,
    required this.explicitScore,
    required this.sourceMultiplier,
    Map<String, double>? breakdown,
  }) : breakdown = breakdown ?? {};
}

class ImportanceEngine {
  final double recencyWeight;
  final double frequencyWeight;
  final double emotionalWeight;
  final double surpriseWeight;
  final double entityWeight;
  final double explicitWeight;
  final double recencyHalfLifeHours;
  final int frequencySaturation;
  final int entitySaturation;
  final Map<MemorySource, double> sourceWeights;

  ImportanceEngine({
    this.recencyWeight = 0.2,
    this.frequencyWeight = 0.15,
    this.emotionalWeight = 0.2,
    this.surpriseWeight = 0.15,
    this.entityWeight = 0.1,
    this.explicitWeight = 0.2,
    this.recencyHalfLifeHours = 24.0,
    this.frequencySaturation = 10,
    this.entitySaturation = 5,
    Map<MemorySource, double>? sourceWeights,
  }) : sourceWeights = sourceWeights ??
            const {
              MemorySource.userExplicit: 1.5,
              MemorySource.toolResult: 1.2,
              MemorySource.observation: 1.0,
              MemorySource.conversation: 0.8,
              MemorySource.consolidation: 1.1,
              MemorySource.external: 0.9,
            };

  ImportanceResult calculateImportance(
    MemoryItem memory,
    DateTime now, {
    double? explicitImportance,
  }) {
    final recencyScore = _calculateRecencyScore(memory, now);
    final frequencyScore = _calculateFrequencyScore(memory);
    final emotionalScore = _calculateEmotionalScore(memory);
    final surpriseScore = _calculateSurpriseScore(memory);
    final entityScore = _calculateEntityScore(memory);
    final explicitScore = _calculateExplicitScore(memory, explicitImportance);
    final sourceMultiplier = _getSourceMultiplier(memory);

    final weightedSum = (recencyWeight * recencyScore +
        frequencyWeight * frequencyScore +
        emotionalWeight * emotionalScore +
        surpriseWeight * surpriseScore +
        entityWeight * entityScore +
        explicitWeight * explicitScore);

    final finalScore = (weightedSum * sourceMultiplier).clamp(0.0, 1.0);

    return ImportanceResult(
      finalScore: finalScore,
      recencyScore: recencyScore,
      frequencyScore: frequencyScore,
      emotionalScore: emotionalScore,
      surpriseScore: surpriseScore,
      entityScore: entityScore,
      explicitScore: explicitScore,
      sourceMultiplier: sourceMultiplier,
      breakdown: {
        'recency': recencyScore,
        'frequency': frequencyScore,
        'emotional': emotionalScore,
        'surprise': surpriseScore,
        'entity': entityScore,
        'explicit': explicitScore,
        'sourceMultiplier': sourceMultiplier,
      },
    );
  }

  double _calculateRecencyScore(MemoryItem memory, DateTime now) {
    final hoursElapsed = now.difference(memory.createdAt).inSeconds / 3600.0;
    if (hoursElapsed <= 0) return 1.0;
    return pow(0.5, hoursElapsed / recencyHalfLifeHours).toDouble();
  }

  double _calculateFrequencyScore(MemoryItem memory) {
    if (memory.accessCount <= 0) return 0.0;
    return min(1.0, log(1 + memory.accessCount) / log(1 + frequencySaturation));
  }

  double _calculateEmotionalScore(MemoryItem memory) {
    return memory.emotionalValence.abs();
  }

  double _calculateSurpriseScore(MemoryItem memory) {
    return memory.surpriseScore.clamp(0.0, 1.0);
  }

  double _calculateEntityScore(MemoryItem memory) {
    final count = memory.entities.length;
    if (count <= 0) return 0.0;
    return min(1.0, count / entitySaturation);
  }

  double _calculateExplicitScore(MemoryItem memory, double? explicitImportance) {
    if (explicitImportance != null) return explicitImportance.clamp(0.0, 1.0);
    if (memory.isPinned) return 1.0;
    return 0.5;
  }

  double _getSourceMultiplier(MemoryItem memory) {
    return sourceWeights[memory.source] ?? 1.0;
  }

  double getImportance(MemoryItem memory, DateTime now, {double? explicitImportance}) {
    return calculateImportance(memory, now, explicitImportance: explicitImportance).finalScore;
  }

  List<MapEntry<MemoryItem, ImportanceResult>> batchCalculateImportance(
    List<MemoryItem> memories,
    DateTime now, {
    double? explicitImportance,
  }) {
    return memories
        .map((m) => MapEntry(m, calculateImportance(m, now, explicitImportance: explicitImportance)))
        .toList();
  }

  List<MapEntry<MemoryItem, double>> rankByImportance(
    List<MemoryItem> memories,
    DateTime now, {
    int? topK,
  }) {
    final ranked = memories
        .map((m) => MapEntry(m, getImportance(m, now)))
        .toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    if (topK != null) return ranked.take(topK).toList();
    return ranked;
  }

  List<MemoryItem> filterByImportance(
    List<MemoryItem> memories,
    double minScore,
    double maxScore,
    DateTime now,
  ) {
    return memories.where((m) {
      final score = getImportance(m, now);
      return score >= minScore && score <= maxScore;
    }).toList();
  }
}
