import 'dart:math';

enum MemoryType { episodic, semantic, preference, instruction }
enum MemorySource { conversation, toolResult, observation, consolidation, external, userExplicit }
enum MemoryStatus { active, challenged, invalidated, merged, superseded }
enum UserMood { happy, sad, neutral, anxious, excited, angry }
enum TimeOfDay { morning, afternoon, evening, night }
enum DayOfWeek { weekday, weekend }
enum SocialContext { alone, withFriends, atWork, commuting }
enum RetentionMode { l2, huber, elastic }

class EncodingContext {
  final UserMood? userMood; final TimeOfDay? timeOfDay; final DayOfWeek? dayOfWeek;
  final String? conversationTopic; final double? arousalLevel; final double? valence;
  final SocialContext? socialContext; final DateTime? capturedAt;
  const EncodingContext({this.userMood, this.timeOfDay, this.dayOfWeek,
      this.conversationTopic, this.arousalLevel, this.valence, this.socialContext, this.capturedAt});
  factory EncodingContext.capture({UserMood? userMood, String? conversationTopic,
      double? arousalLevel, double? valence, SocialContext? socialContext}) {
    final now = DateTime.now(); final hour = now.hour;
    TimeOfDay? tod;
    if (hour >= 6 && hour < 12) tod = TimeOfDay.morning;
    else if (hour >= 12 && hour < 18) tod = TimeOfDay.afternoon;
    else if (hour >= 18 && hour < 22) tod = TimeOfDay.evening;
    else tod = TimeOfDay.night;
    final dow = (now.weekday >= 1 && now.weekday <= 5) ? DayOfWeek.weekday : DayOfWeek.weekend;
    return EncodingContext(userMood: userMood, timeOfDay: tod, dayOfWeek: dow,
        conversationTopic: conversationTopic, arousalLevel: arousalLevel,
        valence: valence, socialContext: socialContext, capturedAt: now);
  }
  double calculateMatchScore(EncodingContext other) {
    double score = 0.0, totalWeight = 0.0;
    const mw = 0.25, aw = 0.20, vw = 0.15, tw = 0.15, dw = 0.10, tpw = 0.10, sw = 0.05;
    if (userMood != null && other.userMood != null) { score += _moodSim(userMood!, other.userMood!) * mw; totalWeight += mw; }
    if (arousalLevel != null && other.arousalLevel != null) { score += (1.0 - (arousalLevel! - other.arousalLevel!).abs()) * aw; totalWeight += aw; }
    if (valence != null && other.valence != null) { score += (1.0 - (valence! - other.valence!).abs() / 2.0) * vw; totalWeight += vw; }
    if (timeOfDay != null && other.timeOfDay != null) { score += (timeOfDay == other.timeOfDay ? 1.0 : 0.0) * tw; totalWeight += tw; }
    if (dayOfWeek != null && other.dayOfWeek != null) { score += (dayOfWeek == other.dayOfWeek ? 1.0 : 0.0) * dw; totalWeight += dw; }
    if (conversationTopic != null && other.conversationTopic != null) {
      if (conversationTopic!.toLowerCase().contains(other.conversationTopic!.toLowerCase()) ||
          other.conversationTopic!.toLowerCase().contains(conversationTopic!.toLowerCase())) { score += 1.0 * tpw; }
      totalWeight += tpw;
    }
    if (socialContext != null && other.socialContext != null) { score += (socialContext == other.socialContext ? 1.0 : 0.0) * sw; totalWeight += sw; }
    return totalWeight > 0 ? score / totalWeight : 0.0;
  }
  double _moodSim(UserMood a, UserMood b) {
    if (a == b) return 1.0;
    const mv = {UserMood.happy: 0.8, UserMood.excited: 0.9, UserMood.neutral: 0.0, UserMood.anxious: -0.4, UserMood.sad: -0.7, UserMood.angry: -0.8};
    const ma = {UserMood.happy: 0.5, UserMood.excited: 0.9, UserMood.neutral: 0.1, UserMood.anxious: 0.7, UserMood.sad: 0.2, UserMood.angry: 0.8};
    final vd = ((mv[a] ?? 0) - (mv[b] ?? 0)).abs() / 2.0;
    final ad = ((ma[a] ?? 0) - (ma[b] ?? 0)).abs();
    return 1.0 - (vd * 0.6 + ad * 0.4);
  }
}

class MemoryItem {
  final String id; final String content; final MemoryType type; final MemorySource source;
  final MemoryStatus status; final double importance; final double initialStrength;
  final double strength; final double emotionalValence; final double surpriseScore;
  final List<String> keywords; final List<String> entities; final List<String> topics;
  final List<double>? embedding; final EncodingContext? encodingContext;
  final Map<String, dynamic>? metadata; final DateTime createdAt; final DateTime accessedAt;
  final DateTime updatedAt; final int accessCount; final String? sourceId;
  final String? agentId; final String? userId; final List<String> relatedMemoryIds;
  final String? parentMemoryId; final String? supersededById;
  final bool isPinned; final bool isArchived; final bool isConsolidated;
  MemoryItem({required this.id, required this.content, this.type = MemoryType.episodic,
      this.source = MemorySource.conversation, this.status = MemoryStatus.active,
      this.importance = 0.5, this.initialStrength = 1.0, this.strength = 1.0,
      this.emotionalValence = 0.0, this.surpriseScore = 0.0, this.keywords = const [],
      this.entities = const [], this.topics = const [], this.embedding, this.encodingContext,
      this.metadata, DateTime? createdAt, DateTime? accessedAt, DateTime? updatedAt,
      this.accessCount = 0, this.sourceId, this.agentId, this.userId,
      this.relatedMemoryIds = const [], this.parentMemoryId, this.supersededById,
      this.isPinned = false, this.isArchived = false, this.isConsolidated = false})
      : createdAt = createdAt ?? DateTime.now(), accessedAt = accessedAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();
  MemoryItem copyWith({String? id, String? content, MemoryType? type, MemorySource? source,
      MemoryStatus? status, double? importance, double? initialStrength, double? strength,
      double? emotionalValence, double? surpriseScore, List<String>? keywords,
      List<String>? entities, List<String>? topics, List<double>? embedding,
      EncodingContext? encodingContext, Map<String, dynamic>? metadata,
      DateTime? createdAt, DateTime? accessedAt, DateTime? updatedAt,
      int? accessCount, String? sourceId, String? agentId, String? userId,
      List<String>? relatedMemoryIds, String? parentMemoryId, String? supersededById,
      bool? isPinned, bool? isArchived, bool? isConsolidated}) {
    return MemoryItem(id: id ?? this.id, content: content ?? this.content,
        type: type ?? this.type, source: source ?? this.source, status: status ?? this.status,
        importance: importance ?? this.importance, initialStrength: initialStrength ?? this.initialStrength,
        strength: strength ?? this.strength, emotionalValence: emotionalValence ?? this.emotionalValence,
        surpriseScore: surpriseScore ?? this.surpriseScore, keywords: keywords ?? this.keywords,
        entities: entities ?? this.entities, topics: topics ?? this.topics,
        embedding: embedding ?? this.embedding, encodingContext: encodingContext ?? this.encodingContext,
        metadata: metadata ?? this.metadata, createdAt: createdAt ?? this.createdAt,
        accessedAt: accessedAt ?? this.accessedAt, updatedAt: updatedAt ?? this.updatedAt,
        accessCount: accessCount ?? this.accessCount, sourceId: sourceId ?? this.sourceId,
        agentId: agentId ?? this.agentId, userId: userId ?? this.userId,
        relatedMemoryIds: relatedMemoryIds ?? this.relatedMemoryIds,
        parentMemoryId: parentMemoryId ?? this.parentMemoryId, supersededById: supersededById ?? this.supersededById,
        isPinned: isPinned ?? this.isPinned, isArchived: isArchived ?? this.isArchived,
        isConsolidated: isConsolidated ?? this.isConsolidated);
  }
}

class DecayResult {
  final double originalStrength, decayedStrength, timeElapsed, rehearsalBonus, decayFactor;
  DecayResult({required this.originalStrength, required this.decayedStrength,
      required this.timeElapsed, required this.rehearsalBonus, required this.decayFactor});
}

class DecayService {
  final double decayRate, minStrength, rehearsalBoost, rehearsalDecayRate;
  final double recencyHalfLifeHours, forgettingHalfLifeDays;
  final RetentionMode retentionMode;
  final double huberDelta, elasticL1Ratio, trustKappa;
  DecayService({this.decayRate = 0.1, this.minStrength = 0.01, this.rehearsalBoost = 0.2,
      this.rehearsalDecayRate = 0.05, this.recencyHalfLifeHours = 24.0,
      this.forgettingHalfLifeDays = 30.0, this.retentionMode = RetentionMode.l2,
      this.huberDelta = 0.5, this.elasticL1Ratio = 0.3, this.trustKappa = 2.0});
  DecayResult calculateDecay(MemoryItem memory, DateTime now) {
    if (memory.isPinned) return DecayResult(originalStrength: memory.initialStrength,
        decayedStrength: memory.initialStrength, timeElapsed: 0, rehearsalBonus: 0, decayFactor: 1.0);
    final elapsedSec = now.difference(memory.createdAt).inSeconds.toDouble();
    final timeElapsedHours = elapsedSec / 3600.0;
    final ageDays = elapsedSec / 86400.0;
    final effectiveHalfLife = _computeEffectiveHalfLife(memory);
    double decayFactor;
    switch (retentionMode) {
      case RetentionMode.l2: decayFactor = exp(-0.693 * ageDays / effectiveHalfLife);
      case RetentionMode.huber: decayFactor = _retentionHuber(ageDays, effectiveHalfLife, huberDelta);
      case RetentionMode.elastic: decayFactor = _retentionElastic(ageDays, effectiveHalfLife, elasticL1Ratio);
    }
    final baseStrength = memory.initialStrength * decayFactor;
    final rehearsalBonus = _calculateRehearsalBonus(memory, now);
    final stabilityBonus = _calculateStabilityBonus(memory);
    final arousalLevel = memory.encodingContext?.arousalLevel ?? 0.0;
    final arousalGating = 1.0 + arousalLevel * 0.5;
    var decayedStrength = (baseStrength + rehearsalBonus + stabilityBonus) * arousalGating;
    decayedStrength = decayedStrength.clamp(minStrength, 1.0);
    return DecayResult(originalStrength: memory.initialStrength, decayedStrength: decayedStrength,
        timeElapsed: timeElapsedHours, rehearsalBonus: rehearsalBonus, decayFactor: decayFactor);
  }
  double _calculateRehearsalBonus(MemoryItem memory, DateTime now) {
    if (memory.accessCount == 0) return 0.0;
    final elapsedSec = now.difference(memory.accessedAt).inSeconds.toDouble();
    final timeSinceAccessHours = elapsedSec / 3600.0;
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
    return min(1.0, memory.accessCount / (spanDays + 1)) * 0.05;
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
  double _getSourceTrust(MemorySource source) => switch (source) {
    MemorySource.userExplicit => 0.95, MemorySource.toolResult => 0.85,
    MemorySource.consolidation => 0.80, MemorySource.observation => 0.70,
    MemorySource.conversation => 0.60, MemorySource.external => 0.50,
  };
  double _retentionHuber(double ageDays, double halfLife, double delta) {
    final t = ageDays / halfLife;
    if (t <= delta) return exp(-0.693 * ageDays / halfLife);
    final transitionVal = exp(-0.693 * delta);
    final slope = 0.693 * transitionVal;
    return max(0.0, transitionVal - slope * (t - delta));
  }
  double _retentionElastic(double ageDays, double halfLife, double l1Ratio) {
    final l2 = exp(-0.693 * ageDays / halfLife);
    final l1 = max(0.0, 1.0 - (ageDays / (2.0 * halfLife)));
    return l1Ratio * l1 + (1.0 - l1Ratio) * l2;
  }
  double calculateRecencyScore(MemoryItem memory, DateTime now) {
    final hoursElapsed = now.difference(memory.accessedAt).inSeconds / 3600.0;
    if (hoursElapsed <= 0) return 1.0;
    return pow(0.5, hoursElapsed / recencyHalfLifeHours).toDouble();
  }
  MemoryItem applyDecay(MemoryItem memory, DateTime now) {
    final result = calculateDecay(memory, now);
    return memory.copyWith(strength: result.decayedStrength);
  }
  List<MemoryItem> getMemoriesToPrune(List<MemoryItem> memories, double threshold) =>
      memories.where((m) => !m.isPinned && m.strength < threshold).toList();
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
  bool shouldForget(MemoryItem memory, DateTime now, {double retentionThreshold = 0.15,
      double minImportance = 0.1, int minAccessCount = 1, double minAgeDays = 30.0}) {
    if (memory.isPinned) return false;
    if (memory.type == MemoryType.semantic || memory.type == MemoryType.instruction) return false;
    final ageDays = now.difference(memory.createdAt).inSeconds / 86400.0;
    if (ageDays < minAgeDays) return false;
    final retention = calculateDecay(memory, now).decayFactor;
    return retention < retentionThreshold && memory.importance < minImportance && memory.accessCount < minAccessCount;
  }
}

class ImportanceResult {
  final double finalScore, recencyScore, accessRecencyScore, frequencyScore,
      emotionalScore, surpriseScore, entityScore, topicScore, explicitScore,
      typeBonus, stabilityBonus, sourceMultiplier;
  final Map<String, double> breakdown;
  ImportanceResult({required this.finalScore, required this.recencyScore,
      required this.accessRecencyScore, required this.frequencyScore,
      required this.emotionalScore, required this.surpriseScore,
      required this.entityScore, required this.topicScore, required this.explicitScore,
      required this.typeBonus, required this.stabilityBonus, required this.sourceMultiplier,
      Map<String, double>? breakdown}) : breakdown = breakdown ?? {};
}

class ImportanceHistoryEntry {
  final String memoryId; final double score; final DateTime recordedAt;
  ImportanceHistoryEntry({required this.memoryId, required this.score, required this.recordedAt});
}

class ImportanceEngine {
  final double recencyWeight, accessRecencyWeight, frequencyWeight, emotionalWeight,
      surpriseWeight, entityWeight, topicWeight, explicitWeight;
  final double recencyHalfLifeHours, accessRecencyHalfLifeHours;
  final int frequencySaturation, entitySaturation, topicSaturation;
  final Map<MemorySource, double> sourceWeights;
  final Map<MemoryType, double> typeBonuses;
  final double trustKappa;
  final int maxHistoryPerMemory;
  final Map<String, List<ImportanceHistoryEntry>> _history = {};
  ImportanceEngine({this.recencyWeight = 0.15, this.accessRecencyWeight = 0.05,
      this.frequencyWeight = 0.15, this.emotionalWeight = 0.2,
      this.surpriseWeight = 0.15, this.entityWeight = 0.08,
      this.topicWeight = 0.02, this.explicitWeight = 0.2,
      this.recencyHalfLifeHours = 24.0, this.accessRecencyHalfLifeHours = 48.0,
      this.frequencySaturation = 10, this.entitySaturation = 5, this.topicSaturation = 5,
      Map<MemorySource, double>? sourceWeights, Map<MemoryType, double>? typeBonuses,
      this.trustKappa = 2.0, this.maxHistoryPerMemory = 50})
      : sourceWeights = sourceWeights ?? const {MemorySource.userExplicit: 1.5, MemorySource.toolResult: 1.2,
            MemorySource.observation: 1.0, MemorySource.conversation: 0.8, MemorySource.consolidation: 1.1, MemorySource.external: 0.9},
        typeBonuses = typeBonuses ?? const {MemoryType.semantic: 0.10, MemoryType.instruction: 0.07,
            MemoryType.preference: 0.08, MemoryType.episodic: 0.0};
  ImportanceResult calculateImportance(MemoryItem memory, DateTime now, {double? explicitImportance}) {
    final recencyScore = _calcRecency(memory, now);
    final accessRecencyScore = _calcAccessRecency(memory, now);
    final frequencyScore = _calcFrequency(memory);
    final emotionalScore = memory.emotionalValence.abs();
    final surpriseScore = memory.surpriseScore.clamp(0.0, 1.0);
    final entityScore = _calcEntity(memory);
    final topicScore = _calcTopic(memory);
    final explicitScore = _calcExplicit(memory, explicitImportance);
    final typeBonus = typeBonuses[memory.type] ?? 0.0;
    final stabilityBonus = _calcStability(memory);
    final sourceMultiplier = _getSourceMultiplier(memory);
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
        entityScore: entityScore, topicScore: topicScore, explicitScore: explicitScore,
        typeBonus: typeBonus, stabilityBonus: stabilityBonus, sourceMultiplier: sourceMultiplier,
        breakdown: {'recency': recencyScore, 'accessRecency': accessRecencyScore,
            'frequency': frequencyScore, 'emotional': emotionalScore, 'surprise': surpriseScore,
            'entity': entityScore, 'topic': topicScore, 'explicit': explicitScore,
            'typeBonus': typeBonus, 'stabilityBonus': stabilityBonus, 'sourceMultiplier': sourceMultiplier});
  }
  double _calcRecency(MemoryItem m, DateTime now) {
    final h = now.difference(m.createdAt).inSeconds / 3600.0;
    return h <= 0 ? 1.0 : pow(0.5, h / recencyHalfLifeHours).toDouble();
  }
  double _calcAccessRecency(MemoryItem m, DateTime now) {
    final h = now.difference(m.accessedAt).inSeconds / 3600.0;
    return h <= 0 ? 1.0 : pow(0.5, h / accessRecencyHalfLifeHours).toDouble();
  }
  double _calcFrequency(MemoryItem m) => m.accessCount <= 0 ? 0.0 : min(1.0, log(1 + m.accessCount) / log(1 + frequencySaturation));
  double _calcEntity(MemoryItem m) => m.entities.isEmpty ? 0.0 : min(1.0, m.entities.length / entitySaturation);
  double _calcTopic(MemoryItem m) => m.topics.isEmpty ? 0.0 : min(1.0, m.topics.length / topicSaturation);
  double _calcExplicit(MemoryItem m, double? ei) {
    if (ei != null) return ei.clamp(0.0, 1.0);
    if (m.isPinned) return 1.0;
    final mi = m.metadata?['importance'];
    if (mi != null) { final p = double.tryParse(mi.toString()); if (p != null) return p.clamp(0.0, 1.0); }
    return 0.5;
  }
  double _calcStability(MemoryItem m) {
    if (m.accessCount <= 0) return 0.0;
    final ageMs = DateTime.now().millisecondsSinceEpoch - m.createdAt.millisecondsSinceEpoch;
    final spanDays = ageMs / 86400000.0;
    if (spanDays <= 0) return 0.0;
    return min(1.0, m.accessCount / (spanDays + 1)) * 0.05;
  }
  double _getSourceMultiplier(MemoryItem m) {
    final base = sourceWeights[m.source] ?? 1.0;
    final trust = _getSourceTrust(m.source);
    return base / (1.0 + trustKappa * (1.0 - trust));
  }
  double _getSourceTrust(MemorySource s) => switch (s) {
    MemorySource.userExplicit => 0.95, MemorySource.toolResult => 0.80,
    MemorySource.observation => 0.60, MemorySource.conversation => 0.50,
    MemorySource.consolidation => 0.70, MemorySource.external => 0.40,
  };
  void recordImportance(String memoryId, double score) {
    _history.putIfAbsent(memoryId, () => []);
    _history[memoryId]!.add(ImportanceHistoryEntry(memoryId: memoryId, score: score, recordedAt: DateTime.now()));
    if (_history[memoryId]!.length > maxHistoryPerMemory) _history[memoryId]!.removeAt(0);
  }
  double getImportance(MemoryItem m, DateTime now, {double? explicitImportance}) =>
      calculateImportance(m, now, explicitImportance: explicitImportance).finalScore;
}

class SurpriseResult {
  final double surprise, nearestDistance, importanceModifier;
  final String? nearestId; final List<String> nearestIds;
  final bool isDuplicate; final List<double> kDistances;
  SurpriseResult({required this.surprise, required this.nearestDistance,
      this.nearestId, this.nearestIds = const [], required this.isDuplicate,
      required this.importanceModifier, this.kDistances = const []});
}

class SurpriseService {
  final int kNeighbors; final double dedupThreshold;
  SurpriseService({this.kNeighbors = 5, this.dedupThreshold = 0.92});
  SurpriseResult computeSurprise(List<double> embedding, List<MemoryItem> existing) {
    if (existing.isEmpty) return SurpriseResult(surprise: 1.0, nearestDistance: 1.0, nearestId: null, isDuplicate: false, importanceModifier: 0.15);
    final dists = <_ND>[];
    for (final m in existing) { if (m.embedding == null || m.embedding!.isEmpty) continue; dists.add(_ND(m.id, 1.0 - _cosine(embedding, m.embedding!), _cosine(embedding, m.embedding!))); }
    if (dists.isEmpty) return SurpriseResult(surprise: 1.0, nearestDistance: 1.0, nearestId: null, isDuplicate: false, importanceModifier: 0.15);
    dists.sort((a, b) => a.dist.compareTo(b.dist));
    final k = dists.take(kNeighbors).toList();
    final meanDist = k.map((d) => d.dist).reduce((a, b) => a + b) / k.length;
    final surprise = 1.0 / (1.0 + exp(-(10.0 * (meanDist - 0.35)).clamp(-20.0, 20.0)));
    final isDup = k.first.sim >= dedupThreshold;
    return SurpriseResult(surprise: double.parse(surprise.toStringAsFixed(4)), nearestDistance: double.parse(k.first.dist.toStringAsFixed(4)),
        nearestId: k.first.id, nearestIds: k.map((d) => d.id).toList(), isDuplicate: isDup,
        importanceModifier: double.parse(((surprise - 0.5) * 0.6).toStringAsFixed(4)),
        kDistances: k.map((d) => double.parse(d.dist.toStringAsFixed(4))).toList());
  }
  double adjustImportance(double base, SurpriseResult r) => (base + r.importanceModifier).clamp(0.05, 1.0);
  double _cosine(List<double> a, List<double> b) {
    if (a.length != b.length || a.isEmpty) return 0.0;
    double dot = 0, nA = 0, nB = 0;
    for (int i = 0; i < a.length; i++) { dot += a[i] * b[i]; nA += a[i] * a[i]; nB += b[i] * b[i]; }
    if (nA == 0 || nB == 0) return 0.0;
    return (dot / (sqrt(nA) * sqrt(nB))).clamp(0.0, 1.0);
  }
}
class _ND { final String id; final double dist, sim; _ND(this.id, this.dist, this.sim); }

class ConsolidationCandidate {
  final List<MemoryItem> memories; final List<double> centroid;
  final double similarityScore, combinedImportance;
  final List<String> sharedEntities, sharedTopics;
  ConsolidationCandidate({required this.memories, required this.centroid, required this.similarityScore,
      required this.combinedImportance, required this.sharedEntities, required this.sharedTopics});
}
class ConsolidationResult {
  final String consolidatedMemoryId, memoryType, contentSummary;
  final List<String> sourceMemoryIds, sharedEntities, sharedTopics;
  final double combinedImportance; final List<double> centroidEmbedding; final DateTime consolidationTimestamp;
  ConsolidationResult({required this.consolidatedMemoryId, required this.sourceMemoryIds, required this.memoryType,
      required this.contentSummary, required this.combinedImportance, required this.sharedEntities,
      required this.sharedTopics, required this.centroidEmbedding, required this.consolidationTimestamp});
}
class ConsolidationEngine {
  final int minMemories, minAccessCount, maxClusterSize;
  final double similarityThreshold, minAgeHours;
  final bool preserveSourceMemories;
  int _totalConsolidations = 0;
  ConsolidationEngine({this.minMemories = 3, this.similarityThreshold = 0.75, this.minAccessCount = 2,
      this.minAgeHours = 24.0, this.maxClusterSize = 10, this.preserveSourceMemories = true});
  List<ConsolidationCandidate> findConsolidationCandidates(List<MemoryItem> memories, DateTime now) {
    final eligible = memories.where((m) => !m.isConsolidated && m.type == MemoryType.episodic &&
        m.accessCount >= minAccessCount && now.difference(m.createdAt).inSeconds >= minAgeHours * 3600 &&
        m.embedding != null && m.embedding!.isNotEmpty).toList();
    if (eligible.length < minMemories) return [];
    final clusters = <List<MemoryItem>>[]; final assigned = <String>{};
    for (final m in eligible) {
      if (assigned.contains(m.id)) continue;
      final cluster = [m]; assigned.add(m.id);
      for (final o in eligible) { if (assigned.contains(o.id) || cluster.length >= maxClusterSize) continue;
        if (_cosine(m.embedding!, o.embedding!) >= similarityThreshold) { cluster.add(o); assigned.add(o.id); } }
      clusters.add(cluster);
    }
    return clusters.where((c) => c.length >= minMemories).map(_createCandidate).toList();
  }
  ConsolidationResult consolidate(ConsolidationCandidate candidate, {String Function(List<MemoryItem>)? contentGenerator}) {
    _totalConsolidations++;
    final summary = contentGenerator != null ? contentGenerator(candidate.memories) : _defaultSummary(candidate);
    return ConsolidationResult(consolidatedMemoryId: 'consolidated_${DateTime.now().millisecondsSinceEpoch}',
        sourceMemoryIds: candidate.memories.map((m) => m.id).toList(), memoryType: 'semantic',
        contentSummary: summary, combinedImportance: candidate.combinedImportance,
        sharedEntities: candidate.sharedEntities, sharedTopics: candidate.sharedTopics,
        centroidEmbedding: candidate.centroid, consolidationTimestamp: DateTime.now());
  }
  bool shouldConsolidate(ConsolidationCandidate candidate, {double? minSimilarity, double minImportance = 0.3}) {
    final eff = minSimilarity ?? similarityThreshold;
    return candidate.memories.length >= minMemories && candidate.similarityScore >= eff && candidate.combinedImportance >= minImportance;
  }
  Map<String, dynamic> getConsolidationStats() => {'totalConsolidations': _totalConsolidations};
  List<double> calculateCentroid(List<List<double>> embeddings) {
    if (embeddings.isEmpty) return [];
    final dim = embeddings.first.length; final c = List.filled(dim, 0.0); var count = 0;
    for (final e in embeddings) { if (e.length != dim) continue; for (int i = 0; i < dim; i++) c[i] += e[i]; count++; }
    if (count == 0) return [];
    for (int i = 0; i < dim; i++) c[i] /= count; return c;
  }
  List<String> findSharedItems(List<List<String>> itemLists) {
    if (itemLists.isEmpty) return [];
    final counts = <String, int>{};
    for (final l in itemLists) for (final i in l.toSet()) counts[i] = (counts[i] ?? 0) + 1;
    final threshold = itemLists.length ~/ 2;
    return counts.entries.where((e) => e.value > threshold).map((e) => e.key).toList();
  }
  String _defaultSummary(ConsolidationCandidate c) {
    final unique = c.memories.map((m) => m.content).toSet().toList();
    return unique.length == 1 ? unique[0] : unique.take(5).join(' | ');
  }
  ConsolidationCandidate _createCandidate(List<MemoryItem> cluster) {
    final embs = cluster.where((m) => m.embedding != null && m.embedding!.isNotEmpty).map((m) => m.embedding!).toList();
    final centroid = calculateCentroid(embs);
    double simScore = 0.0;
    if (centroid.isNotEmpty) {
      final sims = cluster.where((m) => m.embedding != null && m.embedding!.isNotEmpty).map((m) => _cosine(m.embedding!, centroid)).toList();
      simScore = sims.isEmpty ? 0.0 : sims.reduce((a, b) => a + b) / sims.length;
    }
    return ConsolidationCandidate(memories: cluster, centroid: centroid, similarityScore: simScore,
        combinedImportance: cluster.map((m) => m.importance).reduce((a, b) => a + b) / cluster.length,
        sharedEntities: findSharedItems(cluster.map((m) => m.entities).toList()),
        sharedTopics: findSharedItems(cluster.map((m) => m.topics).toList()));
  }
  double _cosine(List<double> a, List<double> b) {
    if (a.length != b.length || a.isEmpty) return 0.0;
    double dot = 0, nA = 0, nB = 0;
    for (int i = 0; i < a.length; i++) { dot += a[i] * b[i]; nA += a[i] * a[i]; nB += b[i] * b[i]; }
    if (nA == 0 || nB == 0) return 0.0;
    return (dot / (sqrt(nA) * sqrt(nB))).clamp(-1.0, 1.0);
  }
}

class WorkingMemorySlot {
  final MemoryItem memory; final double activation; final int refreshCount; final DateTime addedAt;
  WorkingMemorySlot({required this.memory, required this.activation, this.refreshCount = 0, DateTime? addedAt})
      : addedAt = addedAt ?? DateTime.now();
  WorkingMemorySlot copyWith({MemoryItem? memory, double? activation, int? refreshCount, DateTime? addedAt}) =>
      WorkingMemorySlot(memory: memory ?? this.memory, activation: activation ?? this.activation,
          refreshCount: refreshCount ?? this.refreshCount, addedAt: addedAt ?? this.addedAt);
}
class WorkingMemoryManager {
  final int capacity; final double activationDecayRate, minActivation, refreshBoost, importanceWeight;
  final Map<String, WorkingMemorySlot> _slots = {};
  WorkingMemoryManager({this.capacity = 7, this.activationDecayRate = 0.1, this.minActivation = 0.1,
      this.refreshBoost = 0.3, this.importanceWeight = 0.5});
  int get size => _slots.length; bool get isFull => _slots.length >= capacity;
  bool add(MemoryItem memory, {double? initialActivation}) {
    if (_slots.containsKey(memory.id)) { refresh(memory.id); return false; }
    if (isFull) _evictLowest();
    final act = (initialActivation ?? _defaultActivation(memory)).clamp(0.0, 1.0);
    _slots[memory.id] = WorkingMemorySlot(memory: memory, activation: act); return true;
  }
  bool contains(String id) => _slots.containsKey(id);
  WorkingMemorySlot? getSlot(String id) => _slots[id];
  bool remove(String id) => _slots.remove(id) != null;
  bool refresh(String id) {
    final slot = _slots[id]; if (slot == null) return false;
    _slots[id] = slot.copyWith(activation: (slot.activation + refreshBoost).clamp(0.0, 1.0), refreshCount: slot.refreshCount + 1); return true;
  }
  int decayAll({double elapsedSeconds = 1.0}) {
    final toEvict = <String>[], updated = <String, WorkingMemorySlot>{};
    for (final e in _slots.entries) {
      final newAct = e.value.activation * (1.0 - activationDecayRate * elapsedSeconds);
      if (newAct < minActivation) toEvict.add(e.key); else updated[e.key] = e.value.copyWith(activation: newAct.clamp(0.0, 1.0));
    }
    for (final id in toEvict) _slots.remove(id); for (final e in updated.entries) _slots[e.key] = e.value; return toEvict.length;
  }
  List<MemoryItem> getActiveMemories() =>
      (_slots.values.toList()..sort((a, b) => b.activation.compareTo(a.activation))).map((s) => s.memory).toList();
  void clear() => _slots.clear();
  double _defaultActivation(MemoryItem m) => importanceWeight * m.importance + (1.0 - importanceWeight) * 0.5;
  void _evictLowest() {
    if (_slots.isEmpty) return;
    String? lowestId; double lowestAct = double.infinity;
    for (final e in _slots.entries) { if (e.value.activation < lowestAct) { lowestAct = e.value.activation; lowestId = e.key; } }
    if (lowestId != null) _slots.remove(lowestId);
  }
}

// ===== MINI TEST FRAMEWORK =====
int _passCount = 0, _failCount = 0;
final _failures = <String>[];
void test(String name, void Function() body) {
  try { body(); _passCount++; print('  ✓ $name'); }
  catch (e) { _failCount++; _failures.add(name); print('  ✗ $name\n    $e'); }
}
void group(String name, void Function() body) { print('\n$name'); body(); }
bool _closeTo(double actual, double expected, double tolerance) => (actual - expected).abs() <= tolerance;
void expect(dynamic actual, dynamic matcher) {
  if (matcher is _Equals) {
    if (matcher.value is List && actual is List) {
      final expected = matcher.value as List;
      final got = actual as List;
      if (expected.length != got.length) throw 'Expected $expected, got $got (length mismatch)';
      for (int i = 0; i < expected.length; i++) {
        if ((expected[i] is num && got[i] is num) && (expected[i] - got[i]).abs() > 1e-9) {
          throw 'Expected $expected, got $got (diff at index $i: ${expected[i]} vs ${got[i]})';
        }
        if (expected[i] != got[i]) throw 'Expected $expected, got $got (diff at index $i)';
      }
    } else if (actual != matcher.value) throw 'Expected ${matcher.value}, got $actual';
  }
  else if (matcher is _CloseTo) { if (!_closeTo(actual, matcher.value, matcher.tolerance)) throw 'Expected ${matcher.value}±${matcher.tolerance}, got $actual'; }
  else if (matcher is _GreaterThan) { if (!(actual > matcher.value)) throw 'Expected > ${matcher.value}, got $actual'; }
  else if (matcher is _GreaterThanOrEqualTo) { if (!(actual >= matcher.value)) throw 'Expected >= ${matcher.value}, got $actual'; }
  else if (matcher is _LessThan) { if (!(actual < matcher.value)) throw 'Expected < ${matcher.value}, got $actual'; }
  else if (matcher is _LessThanOrEqualTo) { if (!(actual <= matcher.value)) throw 'Expected <= ${matcher.value}, got $actual'; }
  else if (matcher is _IsTrue) { if (actual != true) throw 'Expected true, got $actual'; }
  else if (matcher is _IsFalse) { if (actual != false) throw 'Expected false, got $actual'; }
  else if (matcher is _IsNull) { if (actual != null) throw 'Expected null, got $actual'; }
  else if (matcher is _IsNotNull) { if (actual == null) throw 'Expected non-null, got null'; }
  else if (matcher is _Contains) { if (!(actual is Iterable && actual.contains(matcher.value))) throw 'Expected to contain ${matcher.value}'; }
  else if (matcher is _IsNotEmpty) { if (actual is Iterable && actual.isEmpty) throw 'Expected non-empty'; }
  else if (matcher is _IsEmpty) { if (actual is Iterable && actual.isNotEmpty) throw 'Expected empty'; }
  else if (matcher is _StartsWith) { if (!(actual is String && actual.startsWith(matcher.value))) throw 'Expected to start with ${matcher.value}'; }
  else { if (actual != matcher) throw 'Expected $matcher, got $actual'; }
}
_Equals equals(dynamic v) => _Equals(v); _CloseTo closeTo(dynamic v, double t) => _CloseTo(v, t);
_GreaterThan greaterThan(dynamic v) => _GreaterThan(v); _GreaterThanOrEqualTo greaterThanOrEqualTo(dynamic v) => _GreaterThanOrEqualTo(v);
_LessThan lessThan(dynamic v) => _LessThan(v); _LessThanOrEqualTo lessThanOrEqualTo(dynamic v) => _LessThanOrEqualTo(v);
_IsTrue get isTrue => _IsTrue(); _IsFalse get isFalse => _IsFalse();
_IsNull get isNull => _IsNull(); _IsNotNull get isNotNull => _IsNotNull();
_Contains contains(dynamic v) => _Contains(v); _IsNotEmpty get isNotEmpty => _IsNotEmpty();
_IsEmpty get isEmpty => _IsEmpty(); _StartsWith startsWith(String v) => _StartsWith(v);
class _Equals { final dynamic value; _Equals(this.value); }
class _CloseTo { final dynamic value; final double tolerance; _CloseTo(this.value, this.tolerance); }
class _GreaterThan { final dynamic value; _GreaterThan(this.value); }
class _GreaterThanOrEqualTo { final dynamic value; _GreaterThanOrEqualTo(this.value); }
class _LessThan { final dynamic value; _LessThan(this.value); }
class _LessThanOrEqualTo { final dynamic value; _LessThanOrEqualTo(this.value); }
class _IsTrue {} class _IsFalse {} class _IsNull {} class _IsNotNull {}
class _Contains { final dynamic value; _Contains(this.value); } class _IsNotEmpty {} class _IsEmpty {}
class _StartsWith { final String value; _StartsWith(this.value); }

MemoryItem mkMem({String id = 'test-id', double initialStrength = 1.0, double strength = 1.0,
    DateTime? createdAt, DateTime? accessedAt, int accessCount = 0, bool isPinned = false,
    EncodingContext? encodingContext, MemoryType type = MemoryType.episodic,
    MemorySource source = MemorySource.conversation, double importance = 0.5,
    double emotionalValence = 0.0, double surpriseScore = 0.0,
    List<String> entities = const [], List<String> topics = const [],
    List<double> embedding = const [], Map<String, dynamic>? metadata,
    bool isConsolidated = false, String content = 'test content'}) {
  final now = DateTime.now();
  return MemoryItem(id: id, content: content, type: type, source: source,
      initialStrength: initialStrength, strength: strength,
      createdAt: createdAt ?? now, accessedAt: accessedAt ?? createdAt ?? now,
      accessCount: accessCount, isPinned: isPinned, encodingContext: encodingContext,
      importance: importance, emotionalValence: emotionalValence, surpriseScore: surpriseScore,
      entities: entities, topics: topics, embedding: embedding.isEmpty ? null : embedding,
      metadata: metadata, isConsolidated: isConsolidated);
}

void main() {
  print('═══════════════════════════════════════════════');
  print('  Mnemosyne Test Suite (Standalone Dart)');
  print('═══════════════════════════════════════════════');

  group('DecayService', () {
    group('defaults', () { test('sensible defaults', () {
      final s = DecayService(); expect(s.decayRate, equals(0.1)); expect(s.minStrength, equals(0.01));
      expect(s.rehearsalBoost, equals(0.2)); expect(s.rehearsalDecayRate, equals(0.05));
      expect(s.recencyHalfLifeHours, equals(24.0)); expect(s.forgettingHalfLifeDays, equals(30.0));
    }); });
    group('half-life model', () {
      test('full strength at creation', () { final s = DecayService(); final now = DateTime.now();
        final r = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: now), now);
        expect(r.decayedStrength, closeTo(1.0, 0.01)); });
      test('strength halves after one half-life', () { final s = DecayService(forgettingHalfLifeDays: 30.0, trustKappa: 0.0); final now = DateTime.now();
        final r = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: now.subtract(Duration(days: 30))), now);
        expect(r.decayedStrength, closeTo(0.5, 0.05)); });
      test('strength >= minStrength', () { final s = DecayService(minStrength: 0.1, forgettingHalfLifeDays: 0.001); final now = DateTime.now();
        final r = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: now.subtract(Duration(days: 365))), now);
        expect(r.decayedStrength, greaterThanOrEqualTo(0.1)); });
      test('pinned no decay', () { final s = DecayService(); final now = DateTime.now();
        final r = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: now.subtract(Duration(hours: 100)), isPinned: true), now);
        expect(r.decayedStrength, equals(1.0)); });
      test('semantic decays slower', () { final s = DecayService(forgettingHalfLifeDays: 30.0); final now = DateTime.now();
        final c = now.subtract(Duration(days: 30));
        expect(s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, type: MemoryType.semantic), now).decayedStrength,
            greaterThan(s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c), now).decayedStrength)); });
      test('userExplicit longer effective half-life', () { final s = DecayService(forgettingHalfLifeDays: 30.0); final now = DateTime.now();
        final c = now.subtract(Duration(days: 30));
        expect(s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, source: MemorySource.userExplicit), now).decayedStrength,
            greaterThan(s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, source: MemorySource.conversation), now).decayedStrength)); });
    });
    group('rehearsal', () {
      test('accessed > not accessed', () { final s = DecayService(rehearsalBoost: 0.2, forgettingHalfLifeDays: 30.0); final now = DateTime.now();
        final c = now.subtract(Duration(days: 30));
        final rNo = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, accessedAt: c, accessCount: 0), now);
        final rYes = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, accessedAt: now.subtract(Duration(hours: 1)), accessCount: 3), now);
        expect(rYes.decayedStrength, greaterThan(rNo.decayedStrength)); });
      test('recent access > old access', () { final s = DecayService(rehearsalBoost: 0.2, rehearsalDecayRate: 0.1, forgettingHalfLifeDays: 30.0); final now = DateTime.now();
        final c = now.subtract(Duration(days: 30));
        final rR = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, accessedAt: now.subtract(Duration(hours: 1)), accessCount: 5), now);
        final rO = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, accessedAt: now.subtract(Duration(hours: 10)), accessCount: 5), now);
        expect(rR.rehearsalBonus, greaterThan(rO.rehearsalBonus)); });
    });
    group('arousal', () { test('high arousal boosts', () { final s = DecayService(forgettingHalfLifeDays: 30.0); final now = DateTime.now();
        final c = now.subtract(Duration(days: 30));
        expect(s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, encodingContext: EncodingContext(arousalLevel: 0.8)), now).decayedStrength,
            greaterThan(s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c), now).decayedStrength)); }); });
    group('estimateTimeToThreshold', () {
      test('correct estimate', () { final s = DecayService(forgettingHalfLifeDays: 30.0, trustKappa: 0.0); final now = DateTime.now();
        final t = s.estimateTimeToThreshold(mkMem(initialStrength: 1.0, createdAt: now), 0.5, now);
        expect(t, isNotNull); expect(t!, closeTo(720.0, 5.0)); });
      test('pinned returns null', () { final s = DecayService(); final now = DateTime.now();
        expect(s.estimateTimeToThreshold(mkMem(initialStrength: 1.0, createdAt: now, isPinned: true), 0.5, now), isNull); });
      test('below threshold returns 0', () { final s = DecayService(forgettingHalfLifeDays: 0.01); final now = DateTime.now();
        expect(s.estimateTimeToThreshold(mkMem(initialStrength: 1.0, createdAt: now.subtract(Duration(days: 365))), 0.9, now), equals(0.0)); });
    });
    group('retention modes', () {
      test('huber', () { final s = DecayService(forgettingHalfLifeDays: 30.0, retentionMode: RetentionMode.huber, huberDelta: 0.5);
        final r = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: DateTime.now().subtract(Duration(days: 60))), DateTime.now());
        expect(r.decayedStrength, greaterThanOrEqualTo(s.minStrength)); });
      test('elastic', () { final s = DecayService(forgettingHalfLifeDays: 30.0, retentionMode: RetentionMode.elastic, elasticL1Ratio: 0.3);
        final r = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: DateTime.now().subtract(Duration(days: 30))), DateTime.now());
        expect(r.decayedStrength, greaterThanOrEqualTo(s.minStrength)); });
    });
    group('pruning', () { test('below threshold', () { final s = DecayService();
        final mems = [mkMem(id: 's', strength: 0.8), mkMem(id: 'w', strength: 0.05), mkMem(id: 'p', strength: 0.02, isPinned: true)];
        final p = s.getMemoriesToPrune(mems, 0.1); expect(p.length, equals(1)); expect(p.first.id, equals('w')); }); });
    group('shouldForget', () {
      test('old weak episodic', () { final s = DecayService(forgettingHalfLifeDays: 0.01); final now = DateTime.now();
        expect(s.shouldForget(mkMem(type: MemoryType.episodic, importance: 0.05, accessCount: 0, createdAt: now.subtract(Duration(days: 60))), now), isTrue); });
      test('semantic never', () { final s = DecayService(forgettingHalfLifeDays: 0.01); final now = DateTime.now();
        expect(s.shouldForget(mkMem(type: MemoryType.semantic, importance: 0.05, accessCount: 0, createdAt: now.subtract(Duration(days: 60))), now), isFalse); });
    });
    group('property', () {
      test('monotonic non-increasing', () { final s = DecayService(forgettingHalfLifeDays: 30.0); final c = DateTime(2025, 1, 1);
        final m = mkMem(initialStrength: 1.0, createdAt: c); double prev = 1.0;
        for (int d = 0; d <= 365; d += 30) { final r = s.calculateDecay(m, c.add(Duration(days: d)));
          expect(r.decayedStrength, lessThanOrEqualTo(prev + 0.001)); prev = r.decayedStrength; } });
      test('always >= minStrength', () { final s = DecayService(minStrength: 0.05, forgettingHalfLifeDays: 1.0); final c = DateTime(2025, 1, 1);
        final m = mkMem(initialStrength: 1.0, createdAt: c);
        for (int d = 0; d <= 365; d += 7) { expect(s.calculateDecay(m, c.add(Duration(days: d))).decayedStrength, greaterThanOrEqualTo(0.05)); } });
      test('rehearsal improves strength', () { final s = DecayService(forgettingHalfLifeDays: 30.0); final c = DateTime(2025, 1, 1);
        final now = c.add(Duration(days: 30));
        for (int ac = 0; ac <= 20; ac += 2) {
          final r0 = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, accessedAt: now, accessCount: ac), now);
          final r1 = s.calculateDecay(mkMem(initialStrength: 1.0, createdAt: c, accessedAt: now, accessCount: ac + 1), now);
          expect(r1.decayedStrength, greaterThanOrEqualTo(r0.decayedStrength - 0.001)); } });
    });
  });

  group('ImportanceEngine', () {
    group('defaults', () { test('correct defaults', () { final e = ImportanceEngine();
      expect(e.recencyWeight, equals(0.15)); expect(e.accessRecencyWeight, equals(0.05));
      expect(e.frequencyWeight, equals(0.15)); expect(e.emotionalWeight, equals(0.2));
      expect(e.surpriseWeight, equals(0.15)); expect(e.entityWeight, equals(0.08));
      expect(e.topicWeight, equals(0.02)); expect(e.explicitWeight, equals(0.2)); }); });
    group('recency', () {
      test('recent high', () { final e = ImportanceEngine(); final now = DateTime.now();
        expect(e.calculateImportance(mkMem(createdAt: now), now).recencyScore, closeTo(1.0, 0.01)); });
      test('old lower', () { final e = ImportanceEngine(recencyHalfLifeHours: 24.0); final now = DateTime.now();
        expect(e.calculateImportance(mkMem(createdAt: now.subtract(Duration(hours: 48))), now).recencyScore, closeTo(0.25, 0.05)); });
    });
    group('frequency', () {
      test('zero=0', () { expect(ImportanceEngine().calculateImportance(mkMem(accessCount: 0), DateTime.now()).frequencyScore, equals(0.0)); });
      test('saturates at 1', () { expect(ImportanceEngine(frequencySaturation: 10).calculateImportance(mkMem(accessCount: 100), DateTime.now()).frequencyScore, equals(1.0)); });
    });
    group('emotional', () { test('abs valence', () { expect(ImportanceEngine().calculateImportance(mkMem(emotionalValence: -0.9), DateTime.now()).emotionalScore, equals(0.9)); }); });
    group('source multiplier', () {
      test('userExplicit ~1.36', () { expect(ImportanceEngine().calculateImportance(mkMem(source: MemorySource.userExplicit), DateTime.now()).sourceMultiplier, closeTo(1.3636, 0.01)); });
      test('conversation ~0.4', () { expect(ImportanceEngine().calculateImportance(mkMem(source: MemorySource.conversation), DateTime.now()).sourceMultiplier, closeTo(0.4, 0.01)); });
      test('empty weights ~0.5', () { expect(ImportanceEngine(sourceWeights: {}).calculateImportance(mkMem(source: MemorySource.conversation), DateTime.now()).sourceMultiplier, closeTo(0.5, 0.01)); });
    });
    group('type bonus', () {
      test('semantic 0.10', () { expect(ImportanceEngine().calculateImportance(mkMem(type: MemoryType.semantic), DateTime.now()).typeBonus, equals(0.10)); });
      test('episodic 0.0', () { expect(ImportanceEngine().calculateImportance(mkMem(type: MemoryType.episodic), DateTime.now()).typeBonus, equals(0.0)); });
    });
    group('explicit', () {
      test('default 0.5', () { expect(ImportanceEngine().calculateImportance(mkMem(), DateTime.now()).explicitScore, equals(0.5)); });
      test('pinned 1.0', () { expect(ImportanceEngine().calculateImportance(mkMem(isPinned: true), DateTime.now()).explicitScore, equals(1.0)); });
      test('param override', () { expect(ImportanceEngine().calculateImportance(mkMem(), DateTime.now(), explicitImportance: 0.9).explicitScore, equals(0.9)); });
      test('metadata', () { expect(ImportanceEngine().calculateImportance(mkMem(metadata: {'importance': 0.8}), DateTime.now()).explicitScore, equals(0.8)); });
    });
    group('final score', () { test('clamped [0,1]', () { final r = ImportanceEngine().calculateImportance(
        mkMem(source: MemorySource.userExplicit, accessCount: 100, emotionalValence: 1.0, surpriseScore: 1.0, entities: ['A','B','C','D','E','F'], isPinned: true), DateTime.now());
        expect(r.finalScore, lessThanOrEqualTo(1.0)); expect(r.finalScore, greaterThanOrEqualTo(0.0)); }); });
    group('property', () {
      test('non-increasing with age', () { final e = ImportanceEngine(); final now = DateTime.now(); double prev = 1.0;
        for (int h = 0; h <= 240; h += 24) { final s = e.getImportance(mkMem(createdAt: now.subtract(Duration(hours: h))), now);
          expect(s, lessThanOrEqualTo(prev + 0.01)); prev = s; } });
      test('higher access = higher importance', () { final e = ImportanceEngine(); final now = DateTime.now();
        final c = now.subtract(Duration(hours: 48)); double prev = 0.0;
        for (int ac = 0; ac <= 20; ac += 2) { final s = e.getImportance(mkMem(createdAt: c, accessedAt: now, accessCount: ac), now);
          expect(s, greaterThanOrEqualTo(prev - 0.01)); prev = s; } });
    });
  });

  group('SurpriseService', () {
    test('novel > familiar', () { final s = SurpriseService();
      final ex = [mkMem(id: 'e1', embedding: [0.8, 0.2, 0.0]), mkMem(id: 'e2', embedding: [0.7, 0.3, 0.0])];
      expect(s.computeSurprise([0.0, 0.1, 0.9], ex).surprise, greaterThan(s.computeSurprise([0.75, 0.25, 0.0], ex).surprise)); });
    test('near-dup flagged', () { final s = SurpriseService(dedupThreshold: 0.92);
      expect(s.computeSurprise([0.99, 0.01, 0.0], [mkMem(id: 'e1', embedding: [1.0, 0.0, 0.0])]).isDuplicate, isTrue); });
    test('empty=1.0', () { expect(SurpriseService().computeSurprise([0.5, 0.5], []).surprise, equals(1.0)); });
    test('k_distances and nearest_ids', () { final s = SurpriseService(kNeighbors: 3);
      final ex = [mkMem(id: 'e1', embedding: [1.0, 0.0, 0.0]), mkMem(id: 'e2', embedding: [0.9, 0.1, 0.0]), mkMem(id: 'e3', embedding: [0.8, 0.2, 0.0])];
      final r = s.computeSurprise([0.85, 0.15, 0.0], ex); expect(r.kDistances.length, equals(3)); expect(r.nearestIds.length, equals(3)); });
    test('adjustImportance clamps', () { final s = SurpriseService();
      expect(s.adjustImportance(0.5, SurpriseResult(surprise: 0.5, nearestDistance: 0.5, isDuplicate: false, importanceModifier: 0.6)), lessThanOrEqualTo(1.0));
      expect(s.adjustImportance(0.1, SurpriseResult(surprise: 0.1, nearestDistance: 0.5, isDuplicate: false, importanceModifier: -0.5)), greaterThanOrEqualTo(0.05)); });
  });

  group('ConsolidationEngine', () {
    test('similar cluster', () { final e = ConsolidationEngine(minMemories: 2, similarityThreshold: 0.9);
      final now = DateTime.now(); final c = now.subtract(Duration(hours: 48));
      final mems = [mkMem(id: 'm1', embedding: [1.0, 0.0, 0.0], createdAt: c, accessCount: 5),
          mkMem(id: 'm2', embedding: [0.99, 0.01, 0.0], createdAt: c, accessCount: 3),
          mkMem(id: 'm3', embedding: [0.98, 0.02, 0.0], createdAt: c, accessCount: 4)];
      final r = e.findConsolidationCandidates(mems, now); expect(r.length, equals(1)); expect(r.first.memories.length, equals(3)); });
    test('dissimilar no cluster', () { final e = ConsolidationEngine(minMemories: 2, similarityThreshold: 0.9);
      final mems = [mkMem(id: 'm1', embedding: [1.0, 0.0, 0.0]), mkMem(id: 'm2', embedding: [0.0, 1.0, 0.0]), mkMem(id: 'm3', embedding: [0.0, 0.0, 1.0])];
      expect(e.findConsolidationCandidates(mems, DateTime.now()), isEmpty); });
    test('consolidate result', () { final e = ConsolidationEngine();
      final c = ConsolidationCandidate(memories: [mkMem(id: 'm1'), mkMem(id: 'm2'), mkMem(id: 'm3')],
          centroid: [0.5, 0.5], similarityScore: 0.9, combinedImportance: 0.7, sharedEntities: ['Alice'], sharedTopics: ['work']);
      final r = e.consolidate(c, contentGenerator: (_) => 'summary');
      expect(r.sourceMemoryIds.length, equals(3)); expect(r.memoryType, equals('semantic'));
      expect(r.contentSummary, equals('summary')); expect(r.sharedEntities, contains('Alice')); });
    test('shouldConsolidate', () { final e = ConsolidationEngine(minMemories: 3);
      expect(e.shouldConsolidate(ConsolidationCandidate(memories: [mkMem(), mkMem(), mkMem()], centroid: [],
          similarityScore: 0.9, combinedImportance: 0.7, sharedEntities: [], sharedTopics: [])), isTrue);
      expect(e.shouldConsolidate(ConsolidationCandidate(memories: [mkMem(), mkMem(), mkMem()], centroid: [],
          similarityScore: 0.5, combinedImportance: 0.7, sharedEntities: [], sharedTopics: [])), isFalse); });
    test('centroid', () { final e = ConsolidationEngine();
      expect(e.calculateCentroid([[1.0, 0.0], [0.0, 1.0]]), equals([0.5, 0.5])); expect(e.calculateCentroid([]), isEmpty); });
    test('sharedItems', () { final e = ConsolidationEngine();
      expect(e.findSharedItems([['a', 'b'], ['a', 'c'], ['a', 'd']]), contains('a'));
      expect(e.findSharedItems([['a'], ['b'], ['c']]), isEmpty); });
    test('counter', () { final e = ConsolidationEngine();
      final c = ConsolidationCandidate(memories: [mkMem()], centroid: [], similarityScore: 0.9, combinedImportance: 0.7, sharedEntities: [], sharedTopics: []);
      e.consolidate(c, contentGenerator: (_) => 's1'); e.consolidate(c, contentGenerator: (_) => 's2');
      expect(e.getConsolidationStats()['totalConsolidations'], equals(2)); });
  });

  group('WorkingMemoryManager', () {
    test('add/retrieve', () { final wm = WorkingMemoryManager(); wm.add(mkMem(id: 'm1', importance: 0.8));
      expect(wm.contains('m1'), isTrue); expect(wm.size, equals(1)); });
    test('dup refreshes', () { final wm = WorkingMemoryManager(); wm.add(mkMem(id: 'm1', importance: 0.8));
      expect(wm.add(mkMem(id: 'm1', importance: 0.8)), isFalse); });
    test('capacity eviction', () { final wm = WorkingMemoryManager(capacity: 2);
      wm.add(mkMem(id: 'm1', importance: 0.3)); wm.add(mkMem(id: 'm2', importance: 0.9)); wm.add(mkMem(id: 'm3', importance: 0.7));
      expect(wm.size, equals(2)); expect(wm.contains('m1'), isFalse); });
    test('refresh increases activation', () { final wm = WorkingMemoryManager(); wm.add(mkMem(id: 'm1', importance: 0.5));
      final b = wm.getSlot('m1')!.activation; wm.refresh('m1'); expect(wm.getSlot('m1')!.activation, greaterThan(b)); });
    test('decayAll evicts', () { final wm = WorkingMemoryManager(minActivation: 0.1, activationDecayRate: 0.5);
      wm.add(mkMem(id: 'm1', importance: 0.1), initialActivation: 0.15); wm.decayAll(elapsedSeconds: 1.0); expect(wm.contains('m1'), isFalse); });
    test('sorted by activation', () { final wm = WorkingMemoryManager();
      wm.add(mkMem(id: 'lo', importance: 0.2)); wm.add(mkMem(id: 'hi', importance: 0.9));
      expect(wm.getActiveMemories().first.id, equals('hi')); });
    test('remove', () { final wm = WorkingMemoryManager(); wm.add(mkMem(id: 'm1'));
      expect(wm.remove('m1'), isTrue); expect(wm.contains('m1'), isFalse); });
    test('clear', () { final wm = WorkingMemoryManager(); wm.add(mkMem(id: 'm1')); wm.add(mkMem(id: 'm2'));
      wm.clear(); expect(wm.size, equals(0)); });
  });

  group('EncodingContext', () {
    test('capture', () { final ctx = EncodingContext.capture();
      expect(ctx.timeOfDay, isNotNull); expect(ctx.dayOfWeek, isNotNull); });
    test('identical=1.0', () { final ctx = EncodingContext(userMood: UserMood.happy, arousalLevel: 0.5, valence: 0.3);
      expect(ctx.calculateMatchScore(ctx), closeTo(1.0, 0.01)); });
    test('different<1.0', () { final a = EncodingContext(userMood: UserMood.happy, arousalLevel: 0.5);
      final b = EncodingContext(userMood: UserMood.angry, arousalLevel: 0.9);
      expect(a.calculateMatchScore(b), lessThan(1.0)); });
  });

  group('Integration: evolutionary stability', () {
    test('popular > unpopular', () { final s = DecayService(forgettingHalfLifeDays: 30.0);
      final base = DateTime(2025, 1, 1); final future = base.add(Duration(hours: 240));
      final pop = mkMem(id: 'pop', initialStrength: 1.0, createdAt: base, accessedAt: future.subtract(Duration(hours: 1)), accessCount: 10);
      final unpop = mkMem(id: 'unpop', initialStrength: 1.0, createdAt: base, accessedAt: base, accessCount: 0);
      expect(s.calculateDecay(pop, future).decayedStrength, greaterThan(s.calculateDecay(unpop, future).decayedStrength)); });
  });

  print('\n═══════════════════════════════════════════════');
  print('  Results: $_passCount passed, $_failCount failed');
  if (_failures.isNotEmpty) { print('  Failed:'); for (final f in _failures) print('    - $f'); }
  print('═══════════════════════════════════════════════');
  exit(_failCount);
}

void exit(int code) { if (code != 0) throw 'TESTS FAILED: $code'; }
