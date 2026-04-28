import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class ImportanceResult {
  final double finalScore;
  final double recencyScore;
  final double accessRecencyScore;
  final double frequencyScore;
  final double emotionalScore;
  final double surpriseScore;
  final double entityScore;
  final double topicScore;
  final double explicitScore;
  final double typeBonus;
  final double stabilityBonus;
  final double sourceMultiplier;
  final Map<String, double> breakdown;

  ImportanceResult({
    required this.finalScore,
    required this.recencyScore,
    required this.accessRecencyScore,
    required this.frequencyScore,
    required this.emotionalScore,
    required this.surpriseScore,
    required this.entityScore,
    required this.topicScore,
    required this.explicitScore,
    required this.typeBonus,
    required this.stabilityBonus,
    required this.sourceMultiplier,
    Map<String, double>? breakdown,
  }) : breakdown = breakdown ?? {};
}

class ImportanceHistoryEntry {
  final String memoryId;
  final double score;
  final DateTime recordedAt;

  ImportanceHistoryEntry({
    required this.memoryId,
    required this.score,
    required this.recordedAt,
  });
}

class ImportanceEngine {
  final double recencyWeight;
  final double accessRecencyWeight;
  final double frequencyWeight;
  final double emotionalWeight;
  final double surpriseWeight;
  final double entityWeight;
  final double topicWeight;
  final double explicitWeight;
  final double recencyHalfLifeHours;
  final double accessRecencyHalfLifeHours;
  final int frequencySaturation;
  final int entitySaturation;
  final int topicSaturation;
  final Map<MemorySource, double> sourceWeights;
  final Map<MemoryType, double> typeBonuses;
  final double trustKappa;
  final int maxHistoryPerMemory;

  final Map<String, List<ImportanceHistoryEntry>> _history = {};

  ImportanceEngine({
    this.recencyWeight = 0.15,
    this.accessRecencyWeight = 0.05,
    this.frequencyWeight = 0.15,
    this.emotionalWeight = 0.2,
    this.surpriseWeight = 0.15,
    this.entityWeight = 0.08,
    this.topicWeight = 0.02,
    this.explicitWeight = 0.2,
    this.recencyHalfLifeHours = 24.0,
    this.accessRecencyHalfLifeHours = 48.0,
    this.frequencySaturation = 10,
    this.entitySaturation = 5,
    this.topicSaturation = 5,
    Map<MemorySource, double>? sourceWeights,
    Map<MemoryType, double>? typeBonuses,
    this.trustKappa = 2.0,
    this.maxHistoryPerMemory = 50,
  })  : sourceWeights = sourceWeights ??
            const {
              MemorySource.userExplicit: 1.5,
              MemorySource.toolResult: 1.2,
              MemorySource.observation: 1.0,
              MemorySource.conversation: 0.8,
              MemorySource.consolidation: 1.1,
              MemorySource.external: 0.9,
            },
        typeBonuses = typeBonuses ??
            const {
              MemoryType.semantic: 0.10,
              MemoryType.instruction: 0.07,
              MemoryType.preference: 0.08,
              MemoryType.episodic: 0.0,
            };

  ImportanceResult calculateImportance(
    MemoryItem memory,
    DateTime now, {
    double? explicitImportance,
  }) {
    final recencyScore = _calculateRecencyScore(memory, now);
    final accessRecencyScore = _calculateAccessRecencyScore(memory, now);
    final frequencyScore = _calculateFrequencyScore(memory);
    final emotionalScore = _calculateEmotionalScore(memory);
    final surpriseScore = _calculateSurpriseScore(memory);
    final entityScore = _calculateEntityScore(memory);
    final topicScore = _calculateTopicScore(memory);
    final explicitScore = _calculateExplicitScore(memory, explicitImportance);
    final typeBonus = _getTypeBonus(memory);
    final stabilityBonus = _calculateStabilityBonus(memory);
    final sourceMultiplier = _getSourceMultiplier(memory);

    final weightedSum = (recencyWeight * recencyScore +
        accessRecencyWeight * accessRecencyScore +
        frequencyWeight * frequencyScore +
        emotionalWeight * emotionalScore +
        surpriseWeight * surpriseScore +
        entityWeight * entityScore +
        topicWeight * topicScore +
        explicitWeight * explicitScore);

    final preMultiplier = weightedSum + typeBonus + stabilityBonus;
    final finalScore = (preMultiplier * sourceMultiplier).clamp(0.0, 1.0);

    final result = ImportanceResult(
      finalScore: finalScore,
      recencyScore: recencyScore,
      accessRecencyScore: accessRecencyScore,
      frequencyScore: frequencyScore,
      emotionalScore: emotionalScore,
      surpriseScore: surpriseScore,
      entityScore: entityScore,
      topicScore: topicScore,
      explicitScore: explicitScore,
      typeBonus: typeBonus,
      stabilityBonus: stabilityBonus,
      sourceMultiplier: sourceMultiplier,
      breakdown: {
        'recency': recencyScore,
        'accessRecency': accessRecencyScore,
        'frequency': frequencyScore,
        'emotional': emotionalScore,
        'surprise': surpriseScore,
        'entity': entityScore,
        'topic': topicScore,
        'explicit': explicitScore,
        'typeBonus': typeBonus,
        'stabilityBonus': stabilityBonus,
        'sourceMultiplier': sourceMultiplier,
      },
    );

    recordImportance(memory.id, finalScore);
    return result;
  }

  double _calculateRecencyScore(MemoryItem memory, DateTime now) {
    final hoursElapsed = now.difference(memory.createdAt).inSeconds / 3600.0;
    if (hoursElapsed <= 0) return 1.0;
    return pow(0.5, hoursElapsed / recencyHalfLifeHours).toDouble();
  }

  double _calculateAccessRecencyScore(MemoryItem memory, DateTime now) {
    final hoursSinceAccess = now.difference(memory.accessedAt).inSeconds / 3600.0;
    if (hoursSinceAccess <= 0) return 1.0;
    return pow(0.5, hoursSinceAccess / accessRecencyHalfLifeHours).toDouble();
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

  double _calculateTopicScore(MemoryItem memory) {
    final count = memory.topics.length;
    if (count <= 0) return 0.0;
    return min(1.0, count / topicSaturation);
  }

  double _calculateExplicitScore(MemoryItem memory, double? explicitImportance) {
    if (explicitImportance != null) return explicitImportance.clamp(0.0, 1.0);
    if (memory.isPinned) return 1.0;
    final metadataImportance = memory.metadata?['importance'];
    if (metadataImportance != null) {
      final parsed = double.tryParse(metadataImportance.toString());
      if (parsed != null) return parsed.clamp(0.0, 1.0);
    }
    return 0.5;
  }

  double _getTypeBonus(MemoryItem memory) {
    return typeBonuses[memory.type] ?? 0.0;
  }

  double _calculateStabilityBonus(MemoryItem memory) {
    if (memory.accessCount <= 0) return 0.0;
    final ageMs = DateTime.now().millisecondsSinceEpoch - memory.createdAt.millisecondsSinceEpoch;
    final spanDays = ageMs / 86400000.0;
    if (spanDays <= 0) return 0.0;
    final stability = min(1.0, memory.accessCount / (spanDays + 1));
    return stability * 0.05;
  }

  double _getSourceMultiplier(MemoryItem memory) {
    final baseMultiplier = sourceWeights[memory.source] ?? 1.0;
    final trust = _getSourceTrust(memory.source);
    return baseMultiplier / (1.0 + trustKappa * (1.0 - trust));
  }

  double _getSourceTrust(MemorySource source) {
    switch (source) {
      case MemorySource.userExplicit:
        return 0.95;
      case MemorySource.toolResult:
        return 0.80;
      case MemorySource.observation:
        return 0.60;
      case MemorySource.conversation:
        return 0.50;
      case MemorySource.consolidation:
        return 0.70;
      case MemorySource.external:
        return 0.40;
    }
  }

  void recordImportance(String memoryId, double score) {
    _history.putIfAbsent(memoryId, () => []);
    _history[memoryId]!.add(ImportanceHistoryEntry(
      memoryId: memoryId,
      score: score,
      recordedAt: DateTime.now(),
    ));
    if (_history[memoryId]!.length > maxHistoryPerMemory) {
      _history[memoryId]!.removeAt(0);
    }
  }

  List<ImportanceHistoryEntry> getImportanceHistory(String memoryId, {int? limit}) {
    final entries = _history[memoryId];
    if (entries == null || entries.isEmpty) return [];
    final effectiveLimit = limit ?? entries.length;
    return entries.reversed.take(effectiveLimit).toList();
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
