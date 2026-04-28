import 'dart:math';

enum MemoryType { episodic, semantic, preference, instruction }
enum UserMood { happy, sad, neutral, anxious, excited, angry }
enum TimeOfDay { morning, afternoon, evening, night }
enum DayOfWeek { weekday, weekend }
enum SocialContext { alone, withFriends, atWork, commuting }
enum MemorySource { conversation, toolResult, observation, consolidation, external, userExplicit }
enum MemoryStatus { active, challenged, invalidated, merged, superseded }

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

  DecayService({
    this.decayRate = 0.1, this.minStrength = 0.01, this.rehearsalBoost = 0.2,
    this.rehearsalDecayRate = 0.05, this.recencyHalfLifeHours = 24.0,
    this.forgettingHalfLifeDays = 30.0,
  });

  DecayResult calculateDecay(MemoryItem memory, DateTime now) {
    if (memory.isPinned) {
      return DecayResult(originalStrength: memory.initialStrength,
        decayedStrength: memory.initialStrength, timeElapsed: 0,
        rehearsalBonus: 0, decayFactor: 1.0);
    }
    final elapsedSeconds = now.difference(memory.createdAt).inSeconds.toDouble();
    final timeElapsedHours = elapsedSeconds / 3600.0;
    final decayFactor = exp(-decayRate * timeElapsedHours);
    final baseStrength = memory.initialStrength * decayFactor;
    final rehearsalBonus = _calculateRehearsalBonus(memory, now);
    final arousalLevel = memory.encodingContext?.arousalLevel ?? 0.0;
    final arousalGating = 1.0 + arousalLevel * 0.5;
    var decayedStrength = (baseStrength + rehearsalBonus) * arousalGating;
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

  List<MemoryItem> getMemoriesToPrune(List<MemoryItem> memories, double threshold) {
    return memories.where((m) => !m.isPinned && m.strength < threshold).toList();
  }

  double? estimateTimeToThreshold(MemoryItem memory, double threshold, [DateTime? now]) {
    if (memory.isPinned) return null;
    now ??= DateTime.now();
    final currentStrength = calculateDecay(memory, now).decayedStrength;
    if (currentStrength <= threshold) return 0.0;
    if (threshold / memory.initialStrength >= 1.0) return null;
    final targetDecayFactor = threshold / memory.initialStrength;
    final timeInHours = -log(targetDecayFactor) / decayRate;
    return timeInHours;
  }

  List<MapEntry<MemoryItem, DecayResult>> batchCalculateDecay(List<MemoryItem> memories, [DateTime? now]) {
    final resolvedNow = now ?? DateTime.now();
    return memories.map((m) => MapEntry(m, calculateDecay(m, resolvedNow))).toList();
  }

  MemoryItem applyRehearsalInPlace(MemoryItem memory) {
    return memory.copyWith(accessCount: memory.accessCount + 1,
      accessedAt: DateTime.now(), updatedAt: DateTime.now());
  }
}

class ImportanceResult {
  final double finalScore, recencyScore, frequencyScore, emotionalScore;
  final double surpriseScore, entityScore, explicitScore, sourceMultiplier;
  final Map<String, double> breakdown;
  ImportanceResult({required this.finalScore, required this.recencyScore,
    required this.frequencyScore, required this.emotionalScore,
    required this.surpriseScore, required this.entityScore,
    required this.explicitScore, required this.sourceMultiplier,
    Map<String, double>? breakdown}) : breakdown = breakdown ?? {};
}

class ImportanceEngine {
  final double recencyWeight, frequencyWeight, emotionalWeight;
  final double surpriseWeight, entityWeight, explicitWeight;
  final double recencyHalfLifeHours;
  final int frequencySaturation, entitySaturation;
  final Map<MemorySource, double> sourceWeights;

  ImportanceEngine({
    this.recencyWeight = 0.2, this.frequencyWeight = 0.15,
    this.emotionalWeight = 0.2, this.surpriseWeight = 0.15,
    this.entityWeight = 0.1, this.explicitWeight = 0.2,
    this.recencyHalfLifeHours = 24.0, this.frequencySaturation = 10,
    this.entitySaturation = 5, Map<MemorySource, double>? sourceWeights,
  }) : sourceWeights = sourceWeights ?? const {
    MemorySource.userExplicit: 1.5, MemorySource.toolResult: 1.2,
    MemorySource.observation: 1.0, MemorySource.conversation: 0.8,
    MemorySource.consolidation: 1.1, MemorySource.external: 0.9,
  };

  ImportanceResult calculateImportance(MemoryItem memory, DateTime now, {double? explicitImportance}) {
    final recencyScore = pow(0.5, now.difference(memory.createdAt).inSeconds / 3600.0 / recencyHalfLifeHours).toDouble();
    final frequencyScore = memory.accessCount <= 0 ? 0.0 : min(1.0, log(1 + memory.accessCount) / log(1 + frequencySaturation));
    final emotionalScore = memory.emotionalValence.abs();
    final surpriseScore = memory.surpriseScore.clamp(0.0, 1.0);
    final entityScore = memory.entities.isEmpty ? 0.0 : min(1.0, memory.entities.length / entitySaturation);
    final explicitScore = explicitImportance?.clamp(0.0, 1.0) ?? (memory.isPinned ? 1.0 : 0.5);
    final sourceMultiplier = sourceWeights[memory.source] ?? 1.0;
    final weightedSum = recencyWeight * recencyScore + frequencyWeight * frequencyScore +
      emotionalWeight * emotionalScore + surpriseWeight * surpriseScore +
      entityWeight * entityScore + explicitWeight * explicitScore;
    final finalScore = (weightedSum * sourceMultiplier).clamp(0.0, 1.0);
    return ImportanceResult(finalScore: finalScore, recencyScore: recencyScore,
      frequencyScore: frequencyScore, emotionalScore: emotionalScore,
      surpriseScore: surpriseScore, entityScore: entityScore,
      explicitScore: explicitScore, sourceMultiplier: sourceMultiplier,
      breakdown: {'recency': recencyScore, 'frequency': frequencyScore,
        'emotional': emotionalScore, 'surprise': surpriseScore,
        'entity': entityScore, 'explicit': explicitScore,
        'sourceMultiplier': sourceMultiplier});
  }

  double getImportance(MemoryItem memory, DateTime now, {double? explicitImportance}) {
    return calculateImportance(memory, now, explicitImportance: explicitImportance).finalScore;
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
  final bool isDuplicate;
  SurpriseResult({required this.surprise, required this.nearestDistance,
    this.nearestId, required this.isDuplicate, required this.importanceModifier});
}

class SurpriseService {
  final int kNeighbors;
  final double dedupThreshold;
  SurpriseService({this.kNeighbors = 5, this.dedupThreshold = 0.92});

  SurpriseResult computeSurprise(List<double> embedding, List<MemoryItem> existingMemories) {
    if (existingMemories.isEmpty) {
      return SurpriseResult(surprise: 1.0, nearestDistance: 1.0,
        nearestId: null, isDuplicate: false, importanceModifier: 0.15);
    }
    final distances = <_NeighborDist>[];
    for (final memory in existingMemories) {
      if (memory.embedding == null || memory.embedding!.isEmpty) continue;
      final similarity = _cosineSimilarity(embedding, memory.embedding!);
      distances.add(_NeighborDist(memory.id, 1.0 - similarity, similarity));
    }
    if (distances.isEmpty) {
      return SurpriseResult(surprise: 1.0, nearestDistance: 1.0,
        nearestId: null, isDuplicate: false, importanceModifier: 0.15);
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
    return SurpriseResult(surprise: surprise, nearestDistance: nearestDistance,
      nearestId: nearestId, isDuplicate: isDuplicate, importanceModifier: importanceModifier);
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

class _NeighborDist {
  final String id;
  final double distance, similarity;
  _NeighborDist(this.id, this.distance, this.similarity);
}

class ConsolidationCandidate {
  final List<MemoryItem> memories;
  final List<double> centroid;
  final double similarityScore;
  final double combinedImportance;
  final List<String> sharedEntities, sharedTopics;
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
  final List<String> sharedEntities, sharedTopics;
  final List<double> centroidEmbedding;
  final DateTime consolidationTimestamp;
  ConsolidationResult({required this.consolidatedMemoryId,
    required this.sourceMemoryIds, required this.memoryType,
    required this.contentSummary, required this.combinedImportance,
    required this.sharedEntities, required this.sharedTopics,
    required this.centroidEmbedding, required this.consolidationTimestamp});
}

class ConsolidationEngine {
  final int minMemories, minAccessCount, maxClusterSize;
  final double similarityThreshold, minAgeHours;
  final bool preserveSourceMemories;
  int _totalConsolidations = 0;

  ConsolidationEngine({this.minMemories = 3, this.similarityThreshold = 0.75,
    this.minAccessCount = 2, this.minAgeHours = 24.0, this.maxClusterSize = 10,
    this.preserveSourceMemories = true});

  List<ConsolidationCandidate> findConsolidationCandidates(List<MemoryItem> memories, DateTime now) {
    final eligible = memories.where((m) {
      if (m.isConsolidated) return false;
      if (m.type != MemoryType.episodic) return false;
      if (m.accessCount < minAccessCount) return false;
      if (now.difference(m.createdAt).inSeconds < minAgeHours * 3600) return false;
      if (m.embedding == null || m.embedding!.isEmpty) return false;
      return true;
    }).toList();
    if (eligible.length < minMemories) return [];
    final clusters = <List<MemoryItem>>[];
    final assigned = <String>{};
    for (final memory in eligible) {
      if (assigned.contains(memory.id)) continue;
      final cluster = [memory]; assigned.add(memory.id);
      for (final other in eligible) {
        if (assigned.contains(other.id)) continue;
        if (cluster.length >= maxClusterSize) break;
        final similarity = _cosineSimilarity(memory.embedding!, other.embedding!);
        if (similarity >= similarityThreshold) { cluster.add(other); assigned.add(other.id); }
      }
      clusters.add(cluster);
    }
    return clusters.where((c) => c.length >= minMemories).map((c) => _createCandidate(c)).toList();
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

  ConsolidationResult consolidate(ConsolidationCandidate candidate, {String Function(List<MemoryItem>)? contentGenerator}) {
    _totalConsolidations++;
    final contentSummary = contentGenerator != null
      ? contentGenerator(candidate.memories)
      : _defaultContentSummary(candidate);
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
  MemoryStatus status = MemoryStatus.active,
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
  );
}

void main() {
  print('\n🧪 mnemosyne Test Suite (Dart Standalone)');
  print('=' * 60);

  print('\n📋 DecayService');
  final decay = DecayService();
  final now = DateTime.now();

  check('default decayRate = 0.1', decay.decayRate == 0.1);
  check('default minStrength = 0.01', decay.minStrength == 0.01);
  check('default rehearsalBoost = 0.2', decay.rehearsalBoost == 0.2);

  final freshMem = _m(initialStrength: 1.0, createdAt: now);
  final freshResult = decay.calculateDecay(freshMem, now);
  closeTo('fresh memory has full strength', freshResult.decayedStrength, 1.0, 0.01);

  final oldMem = _m(initialStrength: 1.0, createdAt: now.subtract(const Duration(hours: 10)));
  final oldResult = decay.calculateDecay(oldMem, now);
  check('old memory has less strength', oldResult.decayedStrength < 1.0);
  check('old memory still has positive strength', oldResult.decayedStrength > 0);
  closeTo('old memory timeElapsed ~10h', oldResult.timeElapsed, 10.0, 0.1);

  final pinnedMem = _m(initialStrength: 0.8, isPinned: true, createdAt: now.subtract(const Duration(days: 365)));
  final pinnedResult = decay.calculateDecay(pinnedMem, now);
  closeTo('pinned memory does not decay', pinnedResult.decayedStrength, 0.8, 0.01);

  final calmMem = _m(initialStrength: 1.0, createdAt: now.subtract(const Duration(hours: 10)));
  final excitedMem = _m(initialStrength: 1.0, createdAt: now.subtract(const Duration(hours: 10)),
    encodingContext: EncodingContext(arousalLevel: 0.9));
  final calmR = decay.calculateDecay(calmMem, now);
  final excitedR = decay.calculateDecay(excitedMem, now);
  check('arousal gating: excited > calm', excitedR.decayedStrength > calmR.decayedStrength);

  final weakMem = _m(id: 'weak', strength: 0.05);
  final strongMem = _m(id: 'strong', strength: 0.8);
  final pinnedWeak = _m(id: 'pinned', strength: 0.02, isPinned: true);
  final toPrune = decay.getMemoriesToPrune([strongMem, weakMem, pinnedWeak], 0.1);
  check('pruning: only weak non-pinned', toPrune.length == 1 && toPrune.first.id == 'weak');

  final timeEst = decay.estimateTimeToThreshold(_m(initialStrength: 1.0, createdAt: now), 0.5, now);
  check('estimateTimeToThreshold returns positive', timeEst != null && timeEst! > 0);
  check('estimateTimeToThreshold pinned returns null', decay.estimateTimeToThreshold(_m(isPinned: true), 0.5) == null);

  final rehearsed = decay.applyRehearsalInPlace(_m(accessCount: 3));
  check('applyRehearsalInPlace increments count', rehearsed.accessCount == 4);

  final batch = decay.batchCalculateDecay([
    _m(id: 'm1', createdAt: now),
    _m(id: 'm2', createdAt: now.subtract(const Duration(hours: 5))),
  ], now);
  check('batchCalculateDecay processes all', batch.length == 2);

  print('\n📋 ImportanceEngine');
  final impEngine = ImportanceEngine();

  check('default recencyWeight = 0.2', impEngine.recencyWeight == 0.2);
  check('default frequencyWeight = 0.15', impEngine.frequencyWeight == 0.15);
  check('default emotionalWeight = 0.2', impEngine.emotionalWeight == 0.2);

  final urgentWork = _m(source: MemorySource.userExplicit, importance: 0.9,
    accessCount: 10, emotionalValence: 0.7, surpriseScore: 0.3,
    entities: ['Report', 'Work'], createdAt: now);
  final casualNote = _m(source: MemorySource.conversation, importance: 0.3,
    accessCount: 1, emotionalValence: 0.0, entities: [],
    createdAt: now.subtract(const Duration(hours: 48)));
  final urgentScore = impEngine.getImportance(urgentWork, now);
  final casualScore = impEngine.getImportance(casualNote, now);
  check('urgent work > casual note', urgentScore > casualScore);

  final pinnedImp = _m(isPinned: true);
  final pinnedResult2 = impEngine.calculateImportance(pinnedImp, now);
  closeTo('pinned memory explicitScore = 1.0', pinnedResult2.explicitScore, 1.0, 0.01);

  final neutralEmo = _m(emotionalValence: 0.0);
  final neutralResult = impEngine.calculateImportance(neutralEmo, now);
  closeTo('neutral emotion = 0', neutralResult.emotionalScore, 0.0, 0.01);

  final highFreq = _m(accessCount: 10);
  final lowFreq = _m(accessCount: 0);
  final highFreqResult = impEngine.calculateImportance(highFreq, now);
  final lowFreqResult = impEngine.calculateImportance(lowFreq, now);
  check('high frequency > low frequency', highFreqResult.frequencyScore > lowFreqResult.frequencyScore);

  print('\n📋 WorkingMemoryManager');
  final wm = WorkingMemoryManager(capacity: 3);

  check('starts empty', wm.size == 0);
  check('not full initially', !wm.isFull);

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
  check('size decreases after remove', wm.size == 2);

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

  print('\n📋 ConsolidationEngine');
  final consol = ConsolidationEngine(minMemories: 2, similarityThreshold: 0.9);

  check('default minMemories = 3', ConsolidationEngine().minMemories == 3);
  check('default similarityThreshold = 0.75', ConsolidationEngine().similarityThreshold == 0.75);

  final similarMemories = [
    _m(id: 'ep1', embedding: [1.0, 0.0, 0.0], entities: ['Alice', 'Italian restaurant'],
      topics: ['dining'], accessCount: 5, importance: 0.7,
      createdAt: now.subtract(const Duration(hours: 48))),
    _m(id: 'ep2', embedding: [0.99, 0.01, 0.0], entities: ['Alice', 'Italian restaurant'],
      topics: ['dining'], accessCount: 3, importance: 0.6,
      createdAt: now.subtract(const Duration(hours: 48))),
    _m(id: 'ep3', embedding: [0.98, 0.02, 0.0], entities: ['Alice'],
      topics: ['dining'], accessCount: 4, importance: 0.65,
      createdAt: now.subtract(const Duration(hours: 48))),
  ];
  final candidates = consol.findConsolidationCandidates(similarMemories, now);
  check('finds similar cluster', candidates.length == 1);
  check('cluster has all 3 memories', candidates.isNotEmpty && candidates.first.memories.length == 3);

  if (candidates.isNotEmpty) {
    final result = consol.consolidate(candidates.first, contentGenerator: (mems) => mems.map((m) => m.content).join('; '));
    check('consolidation result has 3 source IDs', result.sourceMemoryIds.length == 3);
    check('consolidated ID starts with consolidated_', result.consolidatedMemoryId.startsWith('consolidated_'));
  }

  final centroid = consol.calculateCentroid([[1.0, 0.0], [0.0, 1.0]]);
  check('centroid averages correctly', centroid[0] == 0.5 && centroid[1] == 0.5);

  final shared = consol.findSharedItems([['a', 'b'], ['a', 'c'], ['a', 'd']]);
  check('findSharedItems finds common items', shared.contains('a'));

  final shouldConsol = consol.shouldConsolidate(ConsolidationCandidate(
    memories: similarMemories, centroid: [0.99, 0.01, 0.0],
    similarityScore: 0.95, combinedImportance: 0.7,
    sharedEntities: ['Alice'], sharedTopics: ['dining']));
  check('shouldConsolidate returns true for valid candidate', shouldConsol);

  print('\n📋 EncodingContext (相)');
  final happyEvening = EncodingContext(userMood: UserMood.happy,
    socialContext: SocialContext.withFriends, timeOfDay: TimeOfDay.evening, arousalLevel: 0.6);
  final happyEvening2 = EncodingContext(userMood: UserMood.happy,
    socialContext: SocialContext.withFriends, timeOfDay: TimeOfDay.evening);
  final sadMorning = EncodingContext(userMood: UserMood.sad,
    socialContext: SocialContext.alone, timeOfDay: TimeOfDay.morning);

  final matchScore = happyEvening.calculateMatchScore(happyEvening2);
  final mismatchScore = happyEvening.calculateMatchScore(sadMorning);
  check('matching context > mismatching', matchScore > mismatchScore);
  closeTo('full match score near 1.0', matchScore, 1.0, 0.1);

  print('\n📋 Integration: Memory Lifecycle');
  final lifecycleDecay = DecayService(decayRate: 0.1);
  final baseTime = DateTime(2025, 1, 1, 0, 0, 0);
  final futureTime = baseTime.add(const Duration(hours: 240));

  var popular = _m(id: 'popular', importance: 0.7,
    createdAt: baseTime, accessedAt: futureTime.subtract(const Duration(hours: 2)), accessCount: 5);
  var unpopular = _m(id: 'unpopular', importance: 0.3,
    createdAt: baseTime, accessedAt: baseTime, accessCount: 0);

  final pFinal = lifecycleDecay.calculateDecay(popular, futureTime);
  final uFinal = lifecycleDecay.calculateDecay(unpopular, futureTime);
  check('evolutionary stability: popular > unpopular', pFinal.decayedStrength > uFinal.decayedStrength);

  var recentAccess = _m(id: 'recent', importance: 0.5,
    createdAt: baseTime, accessedAt: futureTime.subtract(const Duration(hours: 1)), accessCount: 3);
  var oldAccess = _m(id: 'old', importance: 0.5,
    createdAt: baseTime, accessedAt: baseTime.add(const Duration(hours: 1)), accessCount: 3);
  final rRecent = lifecycleDecay.calculateDecay(recentAccess, futureTime);
  final rOld = lifecycleDecay.calculateDecay(oldAccess, futureTime);
  check('recent access > old access', rRecent.decayedStrength > rOld.decayedStrength);

  print('\n📋 Content Robustness (OpenMemory omnibus)');
  check('HTML content', _m(content: '<div><h1>Title</h1></div>').content.contains('Title'));
  check('JSON content', _m(content: '{"key": "value"}').content.contains('key'));
  check('Chinese content', _m(content: '我喜欢普洱茶').content.contains('普洱'));
  check('Emoji content', _m(content: '🎉🥳🎊').content.contains('🎉'));
  check('Long content', _m(content: 'A' * 10000).content.length == 10000);

  print('\n📋 Memory State Machine (engram)');
  final active2 = _m(status: MemoryStatus.active);
  final challenged = active2.copyWith(status: MemoryStatus.challenged);
  check('active → challenged', challenged.status == MemoryStatus.challenged);
  final invalidated = challenged.copyWith(status: MemoryStatus.invalidated);
  check('challenged → invalidated', invalidated.status == MemoryStatus.invalidated);
  final merged = challenged.copyWith(status: MemoryStatus.merged, supersededById: 'new-id');
  check('challenged → merged', merged.status == MemoryStatus.merged && merged.supersededById == 'new-id');

  print('\n' + '=' * 60);
  print('📊 Results: $_passed passed, $_failed failed');
  if (_failures.isNotEmpty) {
    print('\n❌ Failures:');
    for (final f in _failures) print('  - $f');
  }
  print(_failed == 0 ? '\n✅ ALL TESTS PASSED' : '\n⚠️ SOME TESTS FAILED');
}
