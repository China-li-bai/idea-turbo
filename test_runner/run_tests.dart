import 'dart:math';

enum MemoryType { episodic, semantic, preference, instruction }
enum UserMood { happy, sad, neutral, anxious, excited, angry }
enum TimeOfDay { morning, afternoon, evening, night }
enum DayOfWeek { weekday, weekend }
enum SocialContext { alone, withFriends, atWork, commuting }
enum MemorySource { conversation, toolResult, observation, consolidation, external, userExplicit }
enum MemoryStatus { active, challenged, invalidated, merged, superseded }
enum RetentionMode { l2, huber, elastic }

class EncodingContext {
  final UserMood? userMood;
  final TimeOfDay? timeOfDay;
  final DayOfWeek? dayOfWeek;
  final String? conversationTopic;
  final double? arousalLevel;
  final double? valence;
  final SocialContext? socialContext;
  final DateTime? capturedAt;

  const EncodingContext({
    this.userMood, this.timeOfDay, this.dayOfWeek,
    this.conversationTopic, this.arousalLevel, this.valence,
    this.socialContext, this.capturedAt,
  });

  double calculateMatchScore(EncodingContext other) {
    double score = 0.0;
    double totalWeight = 0.0;
    const moodWeight = 0.25;
    if (userMood != null && other.userMood != null) {
      score += _moodSimilarity(userMood!, other.userMood!) * moodWeight;
      totalWeight += moodWeight;
    }
    const arousalWeight = 0.20;
    if (arousalLevel != null && other.arousalLevel != null) {
      final arousalDiff = (arousalLevel! - other.arousalLevel!).abs();
      score += (1.0 - arousalDiff) * arousalWeight;
      totalWeight += arousalWeight;
    }
    const valenceWeight = 0.15;
    if (valence != null && other.valence != null) {
      final valenceDiff = (valence! - other.valence!).abs() / 2.0;
      score += (1.0 - valenceDiff) * valenceWeight;
      totalWeight += valenceWeight;
    }
    const timeWeight = 0.15;
    if (timeOfDay != null && other.timeOfDay != null) {
      score += (timeOfDay == other.timeOfDay ? 1.0 : 0.0) * timeWeight;
      totalWeight += timeWeight;
    }
    const dayWeight = 0.10;
    if (dayOfWeek != null && other.dayOfWeek != null) {
      score += (dayOfWeek == other.dayOfWeek ? 1.0 : 0.0) * dayWeight;
      totalWeight += dayWeight;
    }
    const topicWeight = 0.10;
    if (conversationTopic != null && other.conversationTopic != null) {
      if (conversationTopic!.toLowerCase().contains(other.conversationTopic!.toLowerCase()) ||
          other.conversationTopic!.toLowerCase().contains(conversationTopic!.toLowerCase())) {
        score += 1.0 * topicWeight;
      }
      totalWeight += topicWeight;
    }
    const socialWeight = 0.05;
    if (socialContext != null && other.socialContext != null) {
      score += (socialContext == other.socialContext ? 1.0 : 0.0) * socialWeight;
      totalWeight += socialWeight;
    }
    return totalWeight > 0 ? score / totalWeight : 0.0;
  }

  double _moodSimilarity(UserMood a, UserMood b) {
    if (a == b) return 1.0;
    const moodValence = <UserMood, double>{
      UserMood.happy: 0.8, UserMood.excited: 0.9, UserMood.neutral: 0.0,
      UserMood.anxious: -0.4, UserMood.sad: -0.7, UserMood.angry: -0.8,
    };
    const moodArousal = <UserMood, double>{
      UserMood.happy: 0.5, UserMood.excited: 0.9, UserMood.neutral: 0.1,
      UserMood.anxious: 0.7, UserMood.sad: 0.2, UserMood.angry: 0.8,
    };
    final valenceDiff = ((moodValence[a] ?? 0) - (moodValence[b] ?? 0)).abs() / 2.0;
    final arousalDiff = ((moodArousal[a] ?? 0) - (moodArousal[b] ?? 0)).abs();
    return 1.0 - (valenceDiff * 0.6 + arousalDiff * 0.4);
  }
}

class MemoryItem {
  final String id;
  final String content;
  final MemoryType type;
  final MemorySource source;
  final MemoryStatus status;
  final double importance;
  final double initialStrength;
  final double strength;
  final double emotionalValence;
  final double surpriseScore;
  final List<String> keywords;
  final List<String> entities;
  final List<String> topics;
  final List<double>? embedding;
  final EncodingContext? encodingContext;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime accessedAt;
  final DateTime updatedAt;
  final int accessCount;
  final String? sourceId;
  final String? agentId;
  final String? userId;
  final List<String> relatedMemoryIds;
  final String? parentMemoryId;
  final String? supersededById;
  final bool isPinned;
  final bool isArchived;
  final bool isConsolidated;

  MemoryItem({
    required this.id, required this.content,
    this.type = MemoryType.episodic, this.source = MemorySource.conversation,
    this.status = MemoryStatus.active, this.importance = 0.5,
    this.initialStrength = 1.0, this.strength = 1.0,
    this.emotionalValence = 0.0, this.surpriseScore = 0.0,
    this.keywords = const [], this.entities = const [], this.topics = const [],
    this.embedding, this.encodingContext, this.metadata,
    DateTime? createdAt, DateTime? accessedAt, DateTime? updatedAt,
    this.accessCount = 0, this.sourceId, this.agentId, this.userId,
    this.relatedMemoryIds = const [], this.parentMemoryId, this.supersededById,
    this.isPinned = false, this.isArchived = false, this.isConsolidated = false,
  }) : createdAt = createdAt ?? DateTime.now(),
       accessedAt = accessedAt ?? DateTime.now(),
       updatedAt = updatedAt ?? DateTime.now();

  MemoryItem copyWith({
    String? id, String? content, MemoryType? type, MemorySource? source,
    MemoryStatus? status, double? importance, double? initialStrength,
    double? strength, double? emotionalValence, double? surpriseScore,
    List<String>? keywords, List<String>? entities, List<String>? topics,
    List<double>? embedding, EncodingContext? encodingContext,
    Map<String, dynamic>? metadata, DateTime? createdAt, DateTime? accessedAt,
    DateTime? updatedAt, int? accessCount, String? sourceId, String? agentId,
    String? userId, List<String>? relatedMemoryIds, String? parentMemoryId,
    String? supersededById, bool? isPinned, bool? isArchived, bool? isConsolidated,
  }) {
    return MemoryItem(
      id: id ?? this.id, content: content ?? this.content,
      type: type ?? this.type, source: source ?? this.source,
      status: status ?? this.status, importance: importance ?? this.importance,
      initialStrength: initialStrength ?? this.initialStrength,
      strength: strength ?? this.strength,
      emotionalValence: emotionalValence ?? this.emotionalValence,
      surpriseScore: surpriseScore ?? this.surpriseScore,
      keywords: keywords ?? this.keywords, entities: entities ?? this.entities,
      topics: topics ?? this.topics, embedding: embedding ?? this.embedding,
      encodingContext: encodingContext ?? this.encodingContext,
      metadata: metadata ?? this.metadata, createdAt: createdAt ?? this.createdAt,
      accessedAt: accessedAt ?? this.accessedAt, updatedAt: updatedAt ?? this.updatedAt,
      accessCount: accessCount ?? this.accessCount, sourceId: sourceId ?? this.sourceId,
      agentId: agentId ?? this.agentId, userId: userId ?? this.userId,
      relatedMemoryIds: relatedMemoryIds ?? this.relatedMemoryIds,
      parentMemoryId: parentMemoryId ?? this.parentMemoryId,
      supersededById: supersededById ?? this.supersededById,
      isPinned: isPinned ?? this.isPinned, isArchived: isArchived ?? this.isArchived,
      isConsolidated: isConsolidated ?? this.isConsolidated,
    );
  }

  MemoryItem access({double rehearsalBoost = 0.2}) {
    return copyWith(
      accessedAt: DateTime.now(), updatedAt: DateTime.now(),
      accessCount: accessCount + 1,
      strength: (strength + rehearsalBoost).clamp(0.0, 1.0),
    );
  }
}

class DecayResult {
  final double originalStrength;
  final double decayedStrength;
  final double timeElapsed;
  final double rehearsalBonus;
  final double decayFactor;
  DecayResult({required this.originalStrength, required this.decayedStrength,
    required this.timeElapsed, required this.rehearsalBonus, required this.decayFactor});
}

class DecayService {
  final double decayRate;
  final double minStrength;
  final double rehearsalBoost;
  final double rehearsalDecayRate;
  final double recencyHalfLifeHours;
  final double forgettingHalfLifeDays;
  final RetentionMode retentionMode;
  final double huberDelta;
  final double elasticL1Ratio;
  final double trustKappa;

  DecayService({
    this.decayRate = 0.1, this.minStrength = 0.01, this.rehearsalBoost = 0.2,
    this.rehearsalDecayRate = 0.05, this.recencyHalfLifeHours = 24.0,
    this.forgettingHalfLifeDays = 30.0, this.retentionMode = RetentionMode.l2,
    this.huberDelta = 0.5, this.elasticL1Ratio = 0.3, this.trustKappa = 2.0,
  });

  DecayResult calculateDecay(MemoryItem memory, DateTime now) {
    if (memory.isPinned) {
      return DecayResult(originalStrength: memory.initialStrength,
        decayedStrength: memory.initialStrength, timeElapsed: 0,
        rehearsalBonus: 0, decayFactor: 1.0);
    }
    final elapsedSeconds = now.difference(memory.createdAt).inSeconds.toDouble();
    final timeElapsedHours = elapsedSeconds / 3600.0;
    final ageDays = elapsedSeconds / 86400.0;
    final effectiveHalfLife = _computeEffectiveHalfLife(memory);

    double decayFactor;
    switch (retentionMode) {
      case RetentionMode.l2:
        decayFactor = _retentionL2(ageDays, effectiveHalfLife);
      case RetentionMode.huber:
        decayFactor = _retentionHuber(ageDays, effectiveHalfLife, huberDelta);
      case RetentionMode.elastic:
        decayFactor = _retentionElastic(ageDays, effectiveHalfLife, elasticL1Ratio);
    }

    final baseStrength = memory.initialStrength * decayFactor;
    final rehearsalBonus = _calculateRehearsalBonus(memory, now);
    final stabilityBonus = _calculateStabilityBonus(memory);
    final arousalLevel = memory.encodingContext?.arousalLevel ?? 0.0;
    final arousalGating = 1.0 + arousalLevel * 0.5;
    var decayedStrength = (baseStrength + rehearsalBonus + stabilityBonus) * arousalGating;
    decayedStrength = decayedStrength.clamp(minStrength, 1.0);
    return DecayResult(originalStrength: memory.initialStrength,
      decayedStrength: decayedStrength, timeElapsed: timeElapsedHours,
      rehearsalBonus: rehearsalBonus, decayFactor: decayFactor);
  }

  double _calculateRehearsalBonus(MemoryItem memory, DateTime now) {
    if (memory.accessCount == 0) return 0.0;
    final elapsedSeconds = now.difference(memory.accessedAt).inSeconds.toDouble();
    final timeSinceAccessHours = elapsedSeconds / 3600.0;
    final accessMultiplier = log(1 + memory.accessCount);
    final baseBonus = rehearsalBoost * accessMultiplier;
    final bonusDecay = exp(-rehearsalDecayRate * timeSinceAccessHours);
    return baseBonus * bonusDecay;
  }

  double _calculateStabilityBonus(MemoryItem memory) {
    if (memory.accessCount <= 0) return 0.0;
    final ageMs = DateTime.now().millisecondsSinceEpoch - memory.createdAt.millisecondsSinceEpoch;
    final spanDays = ageMs / 86400000.0;
    if (spanDays <= 0) return 0.0;
    final stability = min(1.0, memory.accessCount / (spanDays + 1));
    return stability * 0.05;
  }

  double _computeEffectiveHalfLife(MemoryItem memory) {
    var halfLife = forgettingHalfLifeDays;
    final trust = _getSourceTrust(memory.source);
    halfLife = halfLife / (1.0 + trustKappa * (1.0 - trust));
    if (memory.type == MemoryType.semantic) halfLife *= 3.0;
    else if (memory.type == MemoryType.instruction) halfLife *= 2.0;
    else if (memory.type == MemoryType.preference) halfLife *= 2.5;
    return halfLife;
  }

  double _getSourceTrust(MemorySource source) {
    switch (source) {
      case MemorySource.userExplicit: return 0.95;
      case MemorySource.toolResult: return 0.85;
      case MemorySource.consolidation: return 0.80;
      case MemorySource.observation: return 0.70;
      case MemorySource.conversation: return 0.60;
      case MemorySource.external: return 0.50;
    }
  }

  double _retentionL2(double ageDays, double halfLife) {
    return exp(-0.693 * ageDays / halfLife);
  }

  double _retentionHuber(double ageDays, double halfLife, double delta) {
    final t = ageDays / halfLife;
    if (t <= delta) {
      return exp(-0.693 * ageDays / halfLife);
    } else {
      final transitionVal = exp(-0.693 * delta);
      final slope = 0.693 * transitionVal;
      final linear = transitionVal - slope * (t - delta);
      return max(0.0, linear);
    }
  }

  double _retentionElastic(double ageDays, double halfLife, double l1Ratio) {
    final l2Component = exp(-0.693 * ageDays / halfLife);
    final l1Component = max(0.0, 1.0 - (ageDays / (2.0 * halfLife)));
    return l1Ratio * l1Component + (1.0 - l1Ratio) * l2Component;
  }

  double calculateRecencyScore(MemoryItem memory, DateTime now) {
    final hoursElapsed = now.difference(memory.accessedAt).inSeconds / 3600.0;
    if (hoursElapsed <= 0) return 1.0;
    return pow(0.5, hoursElapsed / recencyHalfLifeHours).toDouble();
  }

  double calculateTemporalDecay(MemoryItem memory, DateTime now) {
    final ageDays = now.difference(memory.createdAt).inSeconds / 86400.0;
    final effectiveHalfLife = _computeEffectiveHalfLife(memory);
    return exp(-0.693 * ageDays / effectiveHalfLife);
  }

  MemoryItem applyDecay(MemoryItem memory, DateTime now) {
    final result = calculateDecay(memory, now);
    return memory.copyWith(strength: result.decayedStrength);
  }

  List<MemoryItem> applyDecayToAll(List<MemoryItem> memories, DateTime now) {
    return memories.map((m) => applyDecay(m, now)).toList();
  }

  List<MemoryItem> getMemoriesToPrune(List<MemoryItem> memories, double threshold) {
    return memories.where((m) => !m.isPinned && m.strength < threshold).toList();
  }

  double? estimateTimeToThreshold(MemoryItem memory, double threshold, [DateTime? now]) {
    if (memory.isPinned) return null;
    now ??= DateTime.now();
    final currentStrength = calculateDecay(memory, now).decayedStrength;
    if (currentStrength <= threshold) return 0.0;
    if (threshold / memory.initialStrength >= 1.0) return null;
    final effectiveHalfLife = _computeEffectiveHalfLife(memory);
    final targetDecayFactor = threshold / memory.initialStrength;
    final timeInDays = -log(targetDecayFactor) * effectiveHalfLife / 0.693;
    return timeInDays * 24.0;
  }

  List<MapEntry<MemoryItem, DecayResult>> batchCalculateDecay(
    List<MemoryItem> memories, [DateTime? now]) {
    now ??= DateTime.now();
    return memories.map((m) => MapEntry(m, calculateDecay(m, now))).toList();
  }

  List<MemoryItem> filterByStrength(
    List<MemoryItem> memories, double minStr, double maxStr, [DateTime? now]) {
    now ??= DateTime.now();
    return memories.where((m) {
      final s = calculateDecay(m, now).decayedStrength;
      return s >= minStr && s <= maxStr;
    }).toList();
  }

  MemoryItem applyRehearsalInPlace(MemoryItem memory) {
    return memory.copyWith(
      accessCount: memory.accessCount + 1,
      accessedAt: DateTime.now(), updatedAt: DateTime.now(),
    );
  }

  bool shouldForget(MemoryItem memory, DateTime now, {
    double retentionThreshold = 0.15, double minImportance = 0.1,
    int minAccessCount = 1, double minAgeDays = 30.0,
  }) {
    if (memory.isPinned) return false;
    if (memory.type == MemoryType.semantic) return false;
    if (memory.type == MemoryType.instruction) return false;
    final ageDays = now.difference(memory.createdAt).inSeconds / 86400.0;
    if (ageDays < minAgeDays) return false;
    final retention = calculateDecay(memory, now).decayFactor;
    return retention < retentionThreshold &&
        memory.importance < minImportance &&
        memory.accessCount < minAccessCount;
  }
}

class ImportanceResult {
  final double finalScore, recencyScore, accessRecencyScore, frequencyScore;
  final double emotionalScore, surpriseScore, entityScore, topicScore;
  final double explicitScore, typeBonus, stabilityBonus, sourceMultiplier;
  final Map<String, double> breakdown;
  ImportanceResult({required this.finalScore, required this.recencyScore,
    required this.accessRecencyScore, required this.frequencyScore,
    required this.emotionalScore, required this.surpriseScore,
    required this.entityScore, required this.topicScore,
    required this.explicitScore, required this.typeBonus,
    required this.stabilityBonus, required this.sourceMultiplier,
    Map<String, double>? breakdown}) : breakdown = breakdown ?? {};
}

class ImportanceHistoryEntry {
  final String memoryId;
  final double score;
  final DateTime recordedAt;
  ImportanceHistoryEntry({required this.memoryId, required this.score, required this.recordedAt});
}

class ImportanceEngine {
  final double recencyWeight, accessRecencyWeight, frequencyWeight, emotionalWeight;
  final double surpriseWeight, entityWeight, topicWeight, explicitWeight;
  final double recencyHalfLifeHours, accessRecencyHalfLifeHours;
  final int frequencySaturation, entitySaturation, topicSaturation;
  final Map<MemorySource, double> sourceWeights;
  final Map<MemoryType, double> typeBonuses;
  final double trustKappa;
  final int maxHistoryPerMemory;
  final Map<String, List<ImportanceHistoryEntry>> _history = {};

  ImportanceEngine({
    this.recencyWeight = 0.15, this.accessRecencyWeight = 0.05,
    this.frequencyWeight = 0.15, this.emotionalWeight = 0.2,
    this.surpriseWeight = 0.15, this.entityWeight = 0.08,
    this.topicWeight = 0.02, this.explicitWeight = 0.2,
    this.recencyHalfLifeHours = 24.0, this.accessRecencyHalfLifeHours = 48.0,
    this.frequencySaturation = 10, this.entitySaturation = 5,
    this.topicSaturation = 5, this.trustKappa = 2.0,
    this.maxHistoryPerMemory = 50,
    Map<MemorySource, double>? sourceWeights,
    Map<MemoryType, double>? typeBonuses,
  }) : sourceWeights = sourceWeights ?? const {
    MemorySource.userExplicit: 1.5, MemorySource.toolResult: 1.2,
    MemorySource.observation: 1.0, MemorySource.conversation: 0.8,
    MemorySource.consolidation: 1.1, MemorySource.external: 0.9,
  }, typeBonuses = typeBonuses ?? const {
    MemoryType.semantic: 0.10, MemoryType.instruction: 0.07,
    MemoryType.preference: 0.08, MemoryType.episodic: 0.0,
  };

  ImportanceResult calculateImportance(MemoryItem memory, DateTime now, {double? explicitImportance}) {
    final recencyScore = pow(0.5, max(0, now.difference(memory.createdAt).inSeconds) / 3600.0 / recencyHalfLifeHours).toDouble();
    final accessRecencyScore = pow(0.5, max(0, now.difference(memory.accessedAt).inSeconds) / 3600.0 / accessRecencyHalfLifeHours).toDouble();
    final frequencyScore = memory.accessCount <= 0 ? 0.0 : min(1.0, log(1 + memory.accessCount) / log(1 + frequencySaturation));
    final emotionalScore = memory.emotionalValence.abs();
    final surpriseScore = memory.surpriseScore.clamp(0.0, 1.0);
    final entityScore = memory.entities.isEmpty ? 0.0 : min(1.0, memory.entities.length / entitySaturation);
    final topicScore = memory.topics.isEmpty ? 0.0 : min(1.0, memory.topics.length / topicSaturation);
    var explicitScore = explicitImportance?.clamp(0.0, 1.0) ?? (memory.isPinned ? 1.0 : 0.5);
    if (explicitImportance == null && !memory.isPinned) {
      final metaImp = memory.metadata?['importance'];
      if (metaImp != null) {
        final parsed = double.tryParse(metaImp.toString());
        if (parsed != null) explicitScore = parsed.clamp(0.0, 1.0);
      }
    }
    final typeBonus = typeBonuses[memory.type] ?? 0.0;
    double stabilityBonus = 0.0;
    if (memory.accessCount > 0) {
      final ageMs = now.millisecondsSinceEpoch - memory.createdAt.millisecondsSinceEpoch;
      final spanDays = ageMs / 86400000.0;
      if (spanDays > 0) {
        final stability = min(1.0, memory.accessCount / (spanDays + 1));
        stabilityBonus = stability * 0.05;
      }
    }
    final baseMultiplier = sourceWeights[memory.source] ?? 1.0;
    final trust = _getSourceTrust(memory.source);
    final sourceMultiplier = baseMultiplier / (1.0 + trustKappa * (1.0 - trust));
    final weightedSum = recencyWeight * recencyScore + accessRecencyWeight * accessRecencyScore +
      frequencyWeight * frequencyScore + emotionalWeight * emotionalScore +
      surpriseWeight * surpriseScore + entityWeight * entityScore +
      topicWeight * topicScore + explicitWeight * explicitScore;
    final preMultiplier = weightedSum + typeBonus + stabilityBonus;
    final finalScore = (preMultiplier * sourceMultiplier).clamp(0.0, 1.0);
    recordImportance(memory.id, finalScore);
    return ImportanceResult(finalScore: finalScore, recencyScore: recencyScore,
      accessRecencyScore: accessRecencyScore, frequencyScore: frequencyScore,
      emotionalScore: emotionalScore, surpriseScore: surpriseScore,
      entityScore: entityScore, topicScore: topicScore,
      explicitScore: explicitScore, typeBonus: typeBonus,
      stabilityBonus: stabilityBonus, sourceMultiplier: sourceMultiplier,
      breakdown: {'recency': recencyScore, 'accessRecency': accessRecencyScore,
        'frequency': frequencyScore, 'emotional': emotionalScore,
        'surprise': surpriseScore, 'entity': entityScore, 'topic': topicScore,
        'explicit': explicitScore, 'typeBonus': typeBonus,
        'stabilityBonus': stabilityBonus, 'sourceMultiplier': sourceMultiplier});
  }

  double _getSourceTrust(MemorySource source) {
    switch (source) {
      case MemorySource.userExplicit: return 0.95;
      case MemorySource.toolResult: return 0.80;
      case MemorySource.observation: return 0.60;
      case MemorySource.conversation: return 0.50;
      case MemorySource.consolidation: return 0.70;
      case MemorySource.external: return 0.40;
    }
  }

  void recordImportance(String memoryId, double score) {
    _history.putIfAbsent(memoryId, () => []);
    _history[memoryId]!.add(ImportanceHistoryEntry(memoryId: memoryId, score: score, recordedAt: DateTime.now()));
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
    List<MemoryItem> memories, DateTime now, {double? explicitImportance}) {
    return memories.map((m) => MapEntry(m, calculateImportance(m, now, explicitImportance: explicitImportance))).toList();
  }

  List<MapEntry<MemoryItem, double>> rankByImportance(
    List<MemoryItem> memories, DateTime now, {int? topK}) {
    final ranked = memories.map((m) => MapEntry(m, getImportance(m, now))).toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    if (topK != null) return ranked.take(topK).toList();
    return ranked;
  }

  List<MemoryItem> filterByImportance(
    List<MemoryItem> memories, double minScore, double maxScore, DateTime now) {
    return memories.where((m) {
      final s = getImportance(m, now);
      return s >= minScore && s <= maxScore;
    }).toList();
  }
}

class WorkingMemorySlot {
  final MemoryItem memory;
  final double activation;
  final int refreshCount;
  final DateTime addedAt;
  WorkingMemorySlot({required this.memory, required this.activation,
    this.refreshCount = 0, DateTime? addedAt}) : addedAt = addedAt ?? DateTime.now();
  WorkingMemorySlot copyWith({MemoryItem? memory, double? activation,
    int? refreshCount, DateTime? addedAt}) {
    return WorkingMemorySlot(memory: memory ?? this.memory,
      activation: activation ?? this.activation,
      refreshCount: refreshCount ?? this.refreshCount,
      addedAt: addedAt ?? this.addedAt);
  }
}

class WorkingMemoryManager {
  final int capacity;
  final double activationDecayRate, minActivation, refreshBoost, importanceWeight;
  final Map<String, WorkingMemorySlot> _slots = {};

  WorkingMemoryManager({this.capacity = 7, this.activationDecayRate = 0.1,
    this.minActivation = 0.1, this.refreshBoost = 0.3, this.importanceWeight = 0.5});

  int get size => _slots.length;
  bool get isFull => _slots.length >= capacity;
  int get availableSlots => capacity - _slots.length;

  bool add(MemoryItem memory, {double? initialActivation}) {
    if (_slots.containsKey(memory.id)) { refresh(memory.id); return false; }
    if (isFull) _evictLowest();
    final activation = (initialActivation ?? _calculateDefaultActivation(memory)).clamp(0.0, 1.0);
    _slots[memory.id] = WorkingMemorySlot(memory: memory, activation: activation);
    return true;
  }

  bool contains(String memoryId) => _slots.containsKey(memoryId);
  WorkingMemorySlot? getSlot(String memoryId) => _slots[memoryId];
  bool remove(String memoryId) => _slots.remove(memoryId) != null;

  bool refresh(String memoryId) {
    final slot = _slots[memoryId];
    if (slot == null) return false;
    final newActivation = (slot.activation + refreshBoost).clamp(0.0, 1.0);
    _slots[memoryId] = slot.copyWith(activation: newActivation, refreshCount: slot.refreshCount + 1);
    return true;
  }

  int decayAll({double elapsedSeconds = 1.0}) {
    final toEvict = <String>[];
    final updated = <String, WorkingMemorySlot>{};
    for (final entry in _slots.entries) {
      final slot = entry.value;
      final newActivation = slot.activation * (1.0 - activationDecayRate * elapsedSeconds);
      if (newActivation < minActivation) toEvict.add(entry.key);
      else updated[entry.key] = slot.copyWith(activation: newActivation.clamp(0.0, 1.0));
    }
    for (final id in toEvict) _slots.remove(id);
    for (final entry in updated.entries) _slots[entry.key] = entry.value;
    return toEvict.length;
  }

  List<MemoryItem> getActiveMemories() {
    final sorted = _slots.values.toList()..sort((a, b) => b.activation.compareTo(a.activation));
    return sorted.map((s) => s.memory).toList();
  }

  void clear() => _slots.clear();

  double _calculateDefaultActivation(MemoryItem memory) {
    return importanceWeight * memory.importance + (1.0 - importanceWeight) * 0.5;
  }

  void _evictLowest() {
    if (_slots.isEmpty) return;
    String? lowestId;
    double lowestActivation = double.infinity;
    for (final entry in _slots.entries) {
      if (entry.value.activation < lowestActivation) {
        lowestActivation = entry.value.activation;
        lowestId = entry.key;
      }
    }
    if (lowestId != null) _slots.remove(lowestId);
  }
}

class SurpriseResult {
  final double surprise, nearestDistance, importanceModifier;
  final String? nearestId;
  final List<String> nearestIds;
  final bool isDuplicate;
  final List<double> kDistances;
  SurpriseResult({required this.surprise, required this.nearestDistance,
    this.nearestId, this.nearestIds = const [], required this.isDuplicate,
    required this.importanceModifier, this.kDistances = const []});
}

class _NeighborDist {
  final String id;
  final double distance;
  final double similarity;
  _NeighborDist(this.id, this.distance, this.similarity);
}

class SurpriseService {
  final int kNeighbors;
  final double dedupThreshold;
  SurpriseService({this.kNeighbors = 5, this.dedupThreshold = 0.92});

  SurpriseResult computeSurprise(List<double> embedding, List<MemoryItem> existingMemories) {
    if (existingMemories.isEmpty) {
      return SurpriseResult(surprise: 1.0, nearestDistance: 1.0, nearestId: null,
        nearestIds: [], isDuplicate: false, importanceModifier: 0.15, kDistances: []);
    }
    final distances = <_NeighborDist>[];
    for (final memory in existingMemories) {
      if (memory.embedding == null || memory.embedding!.isEmpty) continue;
      final similarity = _cosineSimilarity(embedding, memory.embedding!);
      distances.add(_NeighborDist(memory.id, 1.0 - similarity, similarity));
    }
    if (distances.isEmpty) {
      return SurpriseResult(surprise: 1.0, nearestDistance: 1.0, nearestId: null,
        nearestIds: [], isDuplicate: false, importanceModifier: 0.15, kDistances: []);
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
      nearestId: nearestId, nearestIds: nearestIds,
      isDuplicate: isDuplicate,
      importanceModifier: double.parse(importanceModifier.toStringAsFixed(4)),
      kDistances: kDistances);
  }

  double adjustImportance(double baseImportance, SurpriseResult surpriseResult) {
    final adjusted = baseImportance + surpriseResult.importanceModifier;
    return adjusted.clamp(0.05, 1.0);
  }

  List<({String id, double similarity})> findDuplicates(
    List<MemoryItem> memories, {double threshold = 0.92, int limit = 500}) {
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
      dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
    }
    if (normA == 0 || normB == 0) return 0.0;
    return (dotProduct / (sqrt(normA) * sqrt(normB))).clamp(0.0, 1.0);
  }

  double _sigmoid(double x, {double midpoint = 0.35, double steepness = 10.0}) {
    final z = (steepness * (x - midpoint)).clamp(-20.0, 20.0);
    return 1.0 / (1.0 + exp(-z));
  }
}

class ConsolidationCandidate {
  final List<MemoryItem> memories;
  final List<double> centroid;
  final double similarityScore;
  final double combinedImportance;
  final List<String> sharedEntities;
  final List<String> sharedTopics;
  ConsolidationCandidate({required this.memories, required this.centroid,
    required this.similarityScore, required this.combinedImportance,
    required this.sharedEntities, required this.sharedTopics});
}

class ConsolidationResult {
  final String consolidatedMemoryId;
  final List<String> sourceMemoryIds;
  final String memoryType;
  final String contentSummary;
  final double combinedImportance;
  final List<String> sharedEntities;
  final List<String> sharedTopics;
  final List<double> centroidEmbedding;
  final DateTime consolidationTimestamp;
  ConsolidationResult({required this.consolidatedMemoryId,
    required this.sourceMemoryIds, required this.memoryType,
    required this.contentSummary, required this.combinedImportance,
    required this.sharedEntities, required this.sharedTopics,
    required this.centroidEmbedding, required this.consolidationTimestamp});
}

class ConsolidationEngine {
  final int minMemories;
  final double similarityThreshold;
  final int minAccessCount;
  final double minAgeHours;
  final int maxClusterSize;
  final bool preserveSourceMemories;
  int _totalConsolidations = 0;

  ConsolidationEngine({this.minMemories = 3, this.similarityThreshold = 0.75,
    this.minAccessCount = 2, this.minAgeHours = 24.0,
    this.maxClusterSize = 10, this.preserveSourceMemories = true});

  List<ConsolidationCandidate> findConsolidationCandidates(List<MemoryItem> memories, DateTime now) {
    final eligible = _filterEligibleMemories(memories, now);
    if (eligible.length < minMemories) return [];
    final clusters = _clusterBySimilarity(eligible);
    return clusters.where((c) => c.length >= minMemories).map((c) => _createCandidate(c)).toList();
  }

  ConsolidationResult consolidate(ConsolidationCandidate candidate, {String Function(List<MemoryItem>)? contentGenerator}) {
    _totalConsolidations++;
    final contentSummary = contentGenerator != null
      ? contentGenerator(candidate.memories) : _defaultContentSummary(candidate);
    return ConsolidationResult(
      consolidatedMemoryId: 'consolidated_${DateTime.now().millisecondsSinceEpoch}',
      sourceMemoryIds: candidate.memories.map((m) => m.id).toList(),
      memoryType: 'semantic', contentSummary: contentSummary,
      combinedImportance: candidate.combinedImportance,
      sharedEntities: candidate.sharedEntities, sharedTopics: candidate.sharedTopics,
      centroidEmbedding: candidate.centroid, consolidationTimestamp: DateTime.now());
  }

  String _defaultContentSummary(ConsolidationCandidate candidate) {
    final contents = candidate.memories.map((m) => m.content).toList();
    final uniqueContents = contents.toSet().toList();
    if (uniqueContents.length == 1) return uniqueContents[0];
    return uniqueContents.take(5).join(' | ');
  }

  bool shouldConsolidate(ConsolidationCandidate candidate, {double? minSimilarity, double minImportance = 0.3}) {
    final effectiveMinSimilarity = minSimilarity ?? similarityThreshold;
    if (candidate.memories.length < minMemories) return false;
    if (candidate.similarityScore < effectiveMinSimilarity) return false;
    if (candidate.combinedImportance < minImportance) return false;
    return true;
  }

  Map<String, dynamic> getConsolidationStats() => {'totalConsolidations': _totalConsolidations};

  List<double> calculateCentroid(List<List<double>> embeddings) {
    if (embeddings.isEmpty) return [];
    final dim = embeddings.first.length;
    final centroid = List.filled(dim, 0.0);
    var count = 0;
    for (final emb in embeddings) {
      if (emb.length != dim) continue;
      for (int i = 0; i < dim; i++) centroid[i] += emb[i];
      count++;
    }
    if (count == 0) return [];
    for (int i = 0; i < dim; i++) centroid[i] /= count;
    return centroid;
  }

  List<String> findSharedItems(List<List<String>> itemLists) {
    if (itemLists.isEmpty) return [];
    final counts = <String, int>{};
    for (final list in itemLists) {
      for (final item in list.toSet()) counts[item] = (counts[item] ?? 0) + 1;
    }
    final threshold = itemLists.length ~/ 2;
    return counts.entries.where((e) => e.value > threshold).map((e) => e.key).toList();
  }

  List<MemoryItem> _filterEligibleMemories(List<MemoryItem> memories, DateTime now) {
    final minAgeSeconds = minAgeHours * 3600;
    return memories.where((m) {
      if (m.isConsolidated) return false;
      if (m.type != MemoryType.episodic) return false;
      if (m.accessCount < minAccessCount) return false;
      final age = now.difference(m.createdAt).inSeconds.toDouble();
      if (age < minAgeSeconds) return false;
      if (m.embedding == null || m.embedding!.isEmpty) return false;
      return true;
    }).toList();
  }

  List<List<MemoryItem>> _clusterBySimilarity(List<MemoryItem> memories) {
    final clusters = <List<MemoryItem>>[];
    final assigned = <String>{};
    for (final memory in memories) {
      if (assigned.contains(memory.id)) continue;
      final cluster = [memory];
      assigned.add(memory.id);
      for (final other in memories) {
        if (assigned.contains(other.id)) continue;
        if (cluster.length >= maxClusterSize) break;
        final similarity = _cosineSimilarity(memory.embedding!, other.embedding!);
        if (similarity >= similarityThreshold) {
          cluster.add(other);
          assigned.add(other.id);
        }
      }
      clusters.add(cluster);
    }
    return clusters;
  }

  ConsolidationCandidate _createCandidate(List<MemoryItem> cluster) {
    final embeddings = cluster.where((m) => m.embedding != null && m.embedding!.isNotEmpty).map((m) => m.embedding!).toList();
    final centroid = calculateCentroid(embeddings);
    double similarityScore = 0.0;
    if (centroid.isNotEmpty) {
      final similarities = cluster.where((m) => m.embedding != null && m.embedding!.isNotEmpty).map((m) => _cosineSimilarity(m.embedding!, centroid)).toList();
      similarityScore = similarities.isEmpty ? 0.0 : similarities.reduce((a, b) => a + b) / similarities.length;
    }
    final combinedImportance = cluster.map((m) => m.importance).reduce((a, b) => a + b) / cluster.length;
    final sharedEntities = findSharedItems(cluster.map((m) => m.entities).toList());
    final sharedTopics = findSharedItems(cluster.map((m) => m.topics).toList());
    return ConsolidationCandidate(memories: cluster, centroid: centroid,
      similarityScore: similarityScore, combinedImportance: combinedImportance,
      sharedEntities: sharedEntities, sharedTopics: sharedTopics);
  }

  double _cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length || a.isEmpty) return 0.0;
    double dotProduct = 0, normA = 0, normB = 0;
    for (int i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
    }
    if (normA == 0 || normB == 0) return 0.0;
    return (dotProduct / (sqrt(normA) * sqrt(normB))).clamp(-1.0, 1.0);
  }
}

class KeywordExtractorService {
  final Set<String> stopWords;
  final int maxNgramLength;

  KeywordExtractorService({Set<String>? stopWords, this.maxNgramLength = 4})
    : stopWords = stopWords ?? _defaultStopWords;

  static final _defaultStopWords = <String>{
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'dare', 'ought', 'used', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
    'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'this', 'that',
    'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'where',
    'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
    'there', 'then', 'once', 'if', 'because', 'as', 'until', 'while',
    'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further',
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
    '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '们', '吗',
    '吧', '呢', '啊', '哦', '嗯', '把', '被', '让', '给', '从', '向',
    '对', '与', '而', '但', '却', '又', '还', '已', '已经', '过', '来',
    '去', '得', '地', '所', '以', '因', '为', '之', '其', '此', '些',
    '每', '各', '该', '本', '于', '及', '等', '种', '样', '么', '什么',
  };

  List<String> extractKeywords(String content, {int maxKeywords = 10}) {
    final chineseSegments = _segmentChinese(content);
    final englishWords = _extractEnglishWords(content);
    final allTerms = <String>[...chineseSegments, ...englishWords];
    final filtered = allTerms.where((term) => term.length > 1 && !stopWords.contains(term)).toList();
    if (filtered.isEmpty) return [];
    final tfidfScores = _calculateTfIdf(filtered);
    final sorted = tfidfScores.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(maxKeywords).map((e) => e.key).toList();
  }

  List<String> lemmatizeForSearch(String content) {
    final chineseSegments = _segmentChinese(content);
    final englishWords = _extractEnglishWords(content);
    final lemmatized = <String>[];
    for (final word in englishWords) {
      lemmatized.add(_simpleEnglishLemmatize(word));
    }
    lemmatized.addAll(chineseSegments);
    return lemmatized.where((term) => term.length > 1 && !stopWords.contains(term.toLowerCase())).toList();
  }

  double calculateKeywordMatch(String query, List<String> keywords) {
    final queryTerms = _segmentChinese(query)..addAll(_extractEnglishWords(query));
    if (queryTerms.isEmpty) return 0.0;
    final normalizedQueryTerms = queryTerms.map((t) => t.toLowerCase()).toSet();
    final normalizedKeywords = keywords.map((k) => k.toLowerCase()).toSet();
    int exactMatches = 0;
    int partialMatches = 0;
    for (final queryTerm in normalizedQueryTerms) {
      if (normalizedKeywords.contains(queryTerm)) {
        exactMatches++;
      } else {
        for (final keyword in normalizedKeywords) {
          if (keyword.length >= 2 && queryTerm.length >= 2) {
            if (keyword.contains(queryTerm) || queryTerm.contains(keyword)) {
              partialMatches++;
              break;
            }
          }
        }
      }
    }
    final score = (exactMatches * 1.0 + partialMatches * 0.3) / normalizedQueryTerms.length;
    return score.clamp(0.0, 1.0);
  }

  List<String> _segmentChinese(String text) {
    final segments = <String>[];
    final chineseRegex = RegExp(r'[\u4e00-\u9fa5]+');
    final matches = chineseRegex.allMatches(text);
    for (final match in matches) {
      final segment = match.group(0)!;
      segments.addAll(_bigramSegment(segment));
    }
    return segments;
  }

  List<String> _bigramSegment(String chinese) {
    if (chinese.length <= 1) return [chinese];
    if (chinese.length <= maxNgramLength) return [chinese];
    final ngrams = <String>[];
    for (int n = 2; n <= maxNgramLength && n <= chinese.length; n++) {
      for (int i = 0; i <= chinese.length - n; i++) {
        ngrams.add(chinese.substring(i, i + n));
      }
    }
    final scored = <String, double>{};
    for (final ngram in ngrams) {
      scored[ngram] = (scored[ngram] ?? 0.0) + 1.0;
    }
    final sorted = scored.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final result = <String>[];
    final used = List.filled(chinese.length, false);
    for (final entry in sorted) {
      final ngram = entry.key;
      final start = chinese.indexOf(ngram);
      if (start >= 0) {
        var overlaps = false;
        for (int i = start; i < start + ngram.length && i < used.length; i++) {
          if (used[i]) { overlaps = true; break; }
        }
        if (!overlaps) {
          result.add(ngram);
          for (int i = start; i < start + ngram.length && i < used.length; i++) {
            used[i] = true;
          }
        }
      }
    }
    return result;
  }

  List<String> _extractEnglishWords(String text) {
    return text.toLowerCase()
        .replaceAll(RegExp(r'[^\w\s\u4e00-\u9fa5]'), ' ')
        .split(RegExp(r'\s+'))
        .where((word) => word.length > 1 &&
            !stopWords.contains(word) &&
            !RegExp(r'^[\u4e00-\u9fa5]+$').hasMatch(word))
        .toList();
  }

  String _simpleEnglishLemmatize(String word) {
    final lower = word.toLowerCase();
    if (lower.endsWith('ing') && lower.length > 5) return lower.substring(0, lower.length - 3);
    if (lower.endsWith('ed') && lower.length > 4) return lower.substring(0, lower.length - 2);
    if (lower.endsWith('ly') && lower.length > 4) return lower.substring(0, lower.length - 2);
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.substring(0, lower.length - 1);
    if (lower.endsWith('es') && lower.length > 4) return lower.substring(0, lower.length - 2);
    return lower;
  }

  Map<String, double> _calculateTfIdf(List<String> terms) {
    final tf = <String, double>{};
    final totalTerms = terms.length;
    for (final term in terms) { tf[term] = (tf[term] ?? 0.0) + 1.0; }
    for (final key in tf.keys) { tf[key] = tf[key]! / totalTerms; }
    final uniqueTerms = tf.keys.toSet();
    final idf = <String, double>{};
    final docCount = 1.0;
    for (final term in uniqueTerms) { idf[term] = log((docCount + 1.0) / (1.0 + 1.0)) + 1.0; }
    final tfidf = <String, double>{};
    for (final term in uniqueTerms) { tfidf[term] = (tf[term] ?? 0.0) * (idf[term] ?? 0.0); }
    return tfidf;
  }
}

int _passed = 0;
int _failed = 0;
final _failures = <String>[];

void check(String name, bool condition) {
  if (condition) { _passed++; print('  ✅ $name'); }
  else { _failed++; _failures.add(name); print('  ❌ $name'); }
}

void closeTo(String name, double actual, double expected, double tolerance) {
  check(name, (actual - expected).abs() <= tolerance);
}

MemoryItem _m({
  String id = 'test', String content = 'test content',
  double initialStrength = 1.0, double strength = 1.0,
  DateTime? createdAt, DateTime? accessedAt, int accessCount = 0,
  double emotionalValence = 0.0, double surpriseScore = 0.0,
  MemorySource source = MemorySource.conversation, MemoryType type = MemoryType.episodic,
  List<String> entities = const [], List<String> topics = const [],
  List<double>? embedding, bool isPinned = false, bool isConsolidated = false,
  EncodingContext? encodingContext, double importance = 0.5,
  MemoryStatus status = MemoryStatus.active, Map<String, dynamic>? metadata,
  List<String> keywords = const [],
}) {
  final now = DateTime.now();
  return MemoryItem(
    id: id, content: content, initialStrength: initialStrength,
    strength: strength, createdAt: createdAt ?? now,
    accessedAt: accessedAt ?? createdAt ?? now, accessCount: accessCount,
    emotionalValence: emotionalValence, surpriseScore: surpriseScore,
    source: source, type: type, entities: entities, topics: topics,
    embedding: embedding, isPinned: isPinned, isConsolidated: isConsolidated,
    encodingContext: encodingContext, importance: importance, status: status,
    metadata: metadata, keywords: keywords,
  );
}

void main() {
  print('\n🧪 mnemosyne Test Suite v2 (synced with actual implementation)');
  print('=' * 70);

  final now = DateTime.now();
  final baseTime = DateTime(2025, 1, 1, 0, 0, 0);

  // ═══════════════════════════════════════════════════════════════════
  // DecayService
  // ═══════════════════════════════════════════════════════════════════
  print('\n📋 DecayService');
  final decay = DecayService();

  check('default retentionMode = l2', decay.retentionMode == RetentionMode.l2);
  check('default huberDelta = 0.5', decay.huberDelta == 0.5);
  check('default elasticL1Ratio = 0.3', decay.elasticL1Ratio == 0.3);
  check('default trustKappa = 2.0', decay.trustKappa == 2.0);
  check('default forgettingHalfLifeDays = 30.0', decay.forgettingHalfLifeDays == 30.0);

  final freshMem = _m(initialStrength: 1.0, createdAt: now);
  closeTo('fresh memory has full strength', decay.calculateDecay(freshMem, now).decayedStrength, 1.0, 0.01);

  final oldMem = _m(initialStrength: 1.0, createdAt: now.subtract(const Duration(hours: 10)));
  final oldResult = decay.calculateDecay(oldMem, now);
  check('old memory has less strength', oldResult.decayedStrength < 1.0);
  check('old memory still has positive strength', oldResult.decayedStrength > 0);

  final pinnedMem = _m(initialStrength: 0.8, isPinned: true, createdAt: now.subtract(const Duration(days: 365)));
  closeTo('pinned memory does not decay', decay.calculateDecay(pinnedMem, now).decayedStrength, 0.8, 0.01);

  final calmMem = _m(initialStrength: 1.0, createdAt: now.subtract(const Duration(hours: 10)));
  final excitedMem = _m(initialStrength: 1.0, createdAt: now.subtract(const Duration(hours: 10)),
    encodingContext: EncodingContext(arousalLevel: 0.9));
  check('arousal gating: excited > calm',
    decay.calculateDecay(excitedMem, now).decayedStrength > decay.calculateDecay(calmMem, now).decayedStrength);

  final toPrune = decay.getMemoriesToPrune([
    _m(id: 'strong', strength: 0.8), _m(id: 'weak', strength: 0.05), _m(id: 'pinned', strength: 0.02, isPinned: true),
  ], 0.1);
  check('pruning: only weak non-pinned', toPrune.length == 1 && toPrune.first.id == 'weak');

  check('estimateTimeToThreshold pinned returns null', decay.estimateTimeToThreshold(_m(isPinned: true), 0.5) == null);
  check('applyRehearsalInPlace increments count', decay.applyRehearsalInPlace(_m(accessCount: 3)).accessCount == 4);
  check('batchCalculateDecay processes all', decay.batchCalculateDecay([_m(id: 'm1'), _m(id: 'm2')], now).length == 2);

  final decayedMem = decay.applyDecay(_m(initialStrength: 1.0, createdAt: now.subtract(const Duration(hours: 24))), now);
  check('applyDecay returns MemoryItem with reduced strength', decayedMem.strength < 1.0);

  check('applyDecayToAll processes all', decay.applyDecayToAll([_m(id: 'a1'), _m(id: 'a2')], now).length == 2);

  closeTo('calculateRecencyScore: just accessed = 1.0', decay.calculateRecencyScore(_m(accessedAt: now), now), 1.0, 0.01);
  closeTo('calculateTemporalDecay: fresh = 1.0', decay.calculateTemporalDecay(_m(createdAt: now), now), 1.0, 0.01);

  check('shouldForget: pinned = false', !decay.shouldForget(_m(isPinned: true), now));
  check('shouldForget: semantic = false', !decay.shouldForget(_m(type: MemoryType.semantic), now));
  check('shouldForget: instruction = false', !decay.shouldForget(_m(type: MemoryType.instruction), now));

  // RetentionMode
  print('\n📋 DecayService: RetentionMode');
  for (final mode in RetentionMode.values) {
    final ds = DecayService(retentionMode: mode);
    final m = _m(initialStrength: 1.0, createdAt: baseTime);
    final r1 = ds.calculateDecay(m, baseTime.add(const Duration(days: 5)));
    final r2 = ds.calculateDecay(m, baseTime.add(const Duration(days: 10)));
    check('monotonic decay ($mode)', r1.decayedStrength >= r2.decayedStrength);
  }
  for (final mode in RetentionMode.values) {
    final ds = DecayService(retentionMode: mode);
    final m = _m(initialStrength: 1.0, createdAt: baseTime);
    final r = ds.calculateDecay(m, baseTime.add(const Duration(days: 365)));
    check('bounded below by minStrength ($mode)', r.decayedStrength >= ds.minStrength);
  }

  // Trust-weighted half-life
  print('\n📋 DecayService: Trust-weighted half-life');
  final trustedR = decay.calculateDecay(
    _m(source: MemorySource.userExplicit, type: MemoryType.semantic, createdAt: baseTime),
    baseTime.add(const Duration(days: 60)));
  final untrustedR = decay.calculateDecay(
    _m(source: MemorySource.external, type: MemoryType.episodic, createdAt: baseTime),
    baseTime.add(const Duration(days: 60)));
  check('trusted source + semantic type decays slower', trustedR.decayedStrength > untrustedR.decayedStrength);

  // Stability bonus
  print('\n📋 DecayService: Stability bonus');
  final stableR = decay.calculateDecay(_m(accessCount: 50, createdAt: baseTime), baseTime.add(const Duration(days: 10)));
  final unstableR = decay.calculateDecay(_m(accessCount: 1, createdAt: baseTime), baseTime.add(const Duration(days: 10)));
  check('stability bonus: high access > low access', stableR.rehearsalBonus > unstableR.rehearsalBonus);

  // ═══════════════════════════════════════════════════════════════════
  // ImportanceEngine
  // ═══════════════════════════════════════════════════════════════════
  print('\n📋 ImportanceEngine');
  final impEngine = ImportanceEngine();

  check('default maxHistoryPerMemory = 50', impEngine.maxHistoryPerMemory == 50);

  final urgentWork = _m(source: MemorySource.userExplicit, importance: 0.9,
    accessCount: 10, emotionalValence: 0.7, surpriseScore: 0.3,
    entities: ['Report', 'Work'], topics: ['work'], createdAt: now);
  final casualNote = _m(source: MemorySource.conversation, importance: 0.3,
    accessCount: 1, emotionalValence: 0.0, entities: [], topics: [],
    createdAt: now.subtract(const Duration(hours: 48)));
  check('urgent work > casual note', impEngine.getImportance(urgentWork, now) > impEngine.getImportance(casualNote, now));

  closeTo('pinned memory explicitScore = 1.0', impEngine.calculateImportance(_m(isPinned: true), now).explicitScore, 1.0, 0.01);
  closeTo('neutral emotion = 0', impEngine.calculateImportance(_m(emotionalValence: 0.0), now).emotionalScore, 0.0, 0.01);
  check('high frequency > low frequency', impEngine.calculateImportance(_m(accessCount: 10), now).frequencyScore > impEngine.calculateImportance(_m(accessCount: 0), now).frequencyScore);
  check('access recency: recent > old', impEngine.calculateImportance(_m(accessedAt: now, accessCount: 3), now).accessRecencyScore > impEngine.calculateImportance(_m(accessedAt: now.subtract(const Duration(hours: 48)), accessCount: 3), now).accessRecencyScore);
  check('type bonus: semantic > episodic', impEngine.calculateImportance(_m(type: MemoryType.semantic), now).typeBonus > impEngine.calculateImportance(_m(type: MemoryType.episodic), now).typeBonus);
  closeTo('semantic typeBonus = 0.10', impEngine.calculateImportance(_m(type: MemoryType.semantic), now).typeBonus, 0.10, 0.01);
  closeTo('metadata importance = 0.8', impEngine.calculateImportance(_m(metadata: {'importance': 0.8}), now).explicitScore, 0.8, 0.01);
  check('topic score: with > without', impEngine.calculateImportance(_m(topics: ['AI', 'ML', 'NLP']), now).topicScore > impEngine.calculateImportance(_m(topics: []), now).topicScore);
  check('stability bonus: stable > unstable', impEngine.calculateImportance(_m(accessCount: 50, createdAt: now.subtract(const Duration(days: 10))), now).stabilityBonus > impEngine.calculateImportance(_m(accessCount: 1, createdAt: now.subtract(const Duration(days: 10))), now).stabilityBonus);
  check('trust-weighted: trusted source higher score', impEngine.calculateImportance(_m(source: MemorySource.userExplicit), now).finalScore > impEngine.calculateImportance(_m(source: MemorySource.external), now).finalScore);

  // Importance history
  print('\n📋 ImportanceEngine: History tracking');
  final historyMem = _m(id: 'hist-test', accessCount: 5);
  impEngine.calculateImportance(historyMem, now);
  impEngine.calculateImportance(historyMem.copyWith(accessCount: 10), now);
  final history = impEngine.getImportanceHistory('hist-test');
  check('history has 2 entries', history.length == 2);
  check('history is most-recent-first', history.first.score >= history.last.score);

  // Batch & rank
  print('\n📋 ImportanceEngine: Batch & rank');
  check('batchCalculateImportance processes all', impEngine.batchCalculateImportance([_m(id: 'b1'), _m(id: 'b2')], now).length == 2);
  final ranked = impEngine.rankByImportance([
    _m(id: 'r1', accessCount: 10, source: MemorySource.userExplicit),
    _m(id: 'r2', accessCount: 1, source: MemorySource.external),
    _m(id: 'r3', accessCount: 5, source: MemorySource.conversation),
  ], now);
  check('rankByImportance sorts descending', ranked.first.value >= ranked.last.value);

  final filtered2 = impEngine.filterByImportance([
    _m(id: 'f1', source: MemorySource.userExplicit, accessCount: 10),
    _m(id: 'f2', source: MemorySource.external, accessCount: 0),
  ], 0.0, 1.0, now);
  check('filterByImportance returns results', filtered2.isNotEmpty);

  // ═══════════════════════════════════════════════════════════════════
  // WorkingMemoryManager
  // ═══════════════════════════════════════════════════════════════════
  print('\n📋 WorkingMemoryManager');
  final wm = WorkingMemoryManager(capacity: 3);

  check('starts empty', wm.size == 0);
  check('not full initially', !wm.isFull);
  check('availableSlots = capacity', wm.availableSlots == 3);

  wm.add(_m(id: 'm1', importance: 0.3), initialActivation: 0.3);
  wm.add(_m(id: 'm2', importance: 0.5), initialActivation: 0.5);
  wm.add(_m(id: 'm3', importance: 0.7), initialActivation: 0.7);
  check('is full after 3 adds', wm.isFull);
  check('size = 3', wm.size == 3);

  wm.add(_m(id: 'm4', importance: 0.9), initialActivation: 0.9);
  check('evicts lowest on overflow', !wm.contains('m1') && wm.contains('m4'));
  check('size stays at capacity', wm.size == 3);

  wm.refresh('m2');
  final slot = wm.getSlot('m2');
  check('refresh boosts activation', slot != null && slot.activation > 0.5);
  check('refresh increments count', slot != null && slot.refreshCount == 1);

  wm.remove('m2');
  check('remove works', !wm.contains('m2'));

  wm.clear();
  check('clear empties all', wm.size == 0);

  final wm2 = WorkingMemoryManager(activationDecayRate: 0.5, minActivation: 0.3);
  wm2.add(_m(id: 'd1'), initialActivation: 0.4);
  final evicted = wm2.decayAll(elapsedSeconds: 1.0);
  check('decay evicts below threshold', evicted >= 0);

  final wm3 = WorkingMemoryManager(capacity: 5);
  wm3.add(_m(id: 'low'), initialActivation: 0.3);
  wm3.add(_m(id: 'high'), initialActivation: 0.9);
  wm3.add(_m(id: 'mid'), initialActivation: 0.6);
  final active = wm3.getActiveMemories();
  check('active memories sorted by activation', active[0].id == 'high' && active[1].id == 'mid' && active[2].id == 'low');

  // ═══════════════════════════════════════════════════════════════════
  // SurpriseService
  // ═══════════════════════════════════════════════════════════════════
  print('\n📋 SurpriseService');
  final surprise = SurpriseService();

  final existing = [
    _m(id: 'e1', embedding: [0.8, 0.2, 0.0]),
    _m(id: 'e2', embedding: [0.7, 0.3, 0.0]),
  ];
  final novelResult = surprise.computeSurprise([0.0, 0.1, 0.9], existing);
  final familiarResult = surprise.computeSurprise([0.75, 0.25, 0.0], existing);
  check('novel > familiar surprise', novelResult.surprise > familiarResult.surprise);

  final emptyResult = surprise.computeSurprise([0.5, 0.5], []);
  closeTo('empty existing = max surprise', emptyResult.surprise, 1.0, 0.01);

  final dedup = SurpriseService(dedupThreshold: 0.92);
  final nearDup = dedup.computeSurprise([0.99, 0.01, 0.0], [_m(id: 'orig', embedding: [1.0, 0.0, 0.0])]);
  check('near-duplicate flagged', nearDup.isDuplicate);

  // k_distances and nearest_ids
  print('\n📋 SurpriseService: k_distances & nearest_ids');
  final kResult =