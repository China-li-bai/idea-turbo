import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/core/constants.dart';

enum RetentionMode {
  l2,
  huber,
  elastic,
}

class DecayResult {
  final double originalStrength;
  final double decayedStrength;
  final double timeElapsed;
  final double rehearsalBonus;
  final double decayFactor;

  DecayResult({
    required this.originalStrength,
    required this.decayedStrength,
    required this.timeElapsed,
    required this.rehearsalBonus,
    required this.decayFactor,
  });
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
    this.decayRate = 0.1,
    this.minStrength = 0.01,
    this.rehearsalBoost = 0.2,
    this.rehearsalDecayRate = 0.05,
    this.recencyHalfLifeHours = 24.0,
    this.forgettingHalfLifeDays = 30.0,
    this.retentionMode = RetentionMode.l2,
    this.huberDelta = 0.5,
    this.elasticL1Ratio = 0.3,
    this.trustKappa = 2.0,
  });

  DecayResult calculateDecay(MemoryItem memory, DateTime now) {
    if (memory.isPinned) {
      return DecayResult(
        originalStrength: memory.initialStrength,
        decayedStrength: memory.initialStrength,
        timeElapsed: 0,
        rehearsalBonus: 0,
        decayFactor: 1.0,
      );
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

    return DecayResult(
      originalStrength: memory.initialStrength,
      decayedStrength: decayedStrength,
      timeElapsed: timeElapsedHours,
      rehearsalBonus: rehearsalBonus,
      decayFactor: decayFactor,
    );
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

    if (memory.type == MemoryType.semantic) {
      halfLife *= 3.0;
    } else if (memory.type == MemoryType.instruction) {
      halfLife *= 2.0;
    } else if (memory.type == MemoryType.preference) {
      halfLife *= 2.5;
    }

    if (memory.accessCount > 0) {
      final repetitionMultiplier = 1.0 + 0.3 * log(1 + memory.accessCount);
      halfLife *= repetitionMultiplier;
    }

    return halfLife;
  }

  double _getSourceTrust(MemorySource source) {
    switch (source) {
      case MemorySource.userExplicit:
        return 0.95;
      case MemorySource.toolResult:
        return 0.85;
      case MemorySource.consolidation:
        return 0.80;
      case MemorySource.observation:
        return 0.70;
      case MemorySource.conversation:
        return 0.60;
      case MemorySource.external:
        return 0.50;
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
    List<MemoryItem> memories, [
    DateTime? now,
  ]) {
    final effectiveNow = now ?? DateTime.now();
    return memories
        .map((m) => MapEntry(m, calculateDecay(m, effectiveNow)))
        .toList();
  }

  List<MemoryItem> filterByStrength(
    List<MemoryItem> memories,
    double minStrength,
    double maxStrength, [
    DateTime? now,
  ]) {
    final effectiveNow = now ?? DateTime.now();
    return memories.where((m) {
      final strength = calculateDecay(m, effectiveNow).decayedStrength;
      return strength >= minStrength && strength <= maxStrength;
    }).toList();
  }

  MemoryItem applyRehearsalInPlace(MemoryItem memory) {
    return memory.copyWith(
      accessCount: memory.accessCount + 1,
      accessedAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  bool shouldForget(MemoryItem memory, DateTime now, {
    double retentionThreshold = 0.15,
    double minImportance = 0.1,
    int minAccessCount = 1,
    double minAgeDays = 30.0,
  }) {
    if (memory.isPinned) return false;
    if (memory.type == MemoryType.semantic) return false;
    if (memory.type == MemoryType.instruction) return false;
    if (memory.status == MemoryStatus.superseded) return true;
    if (memory.status == MemoryStatus.invalidated) return true;

    final ageDays = now.difference(memory.createdAt).inSeconds / 86400.0;
    if (ageDays < minAgeDays) return false;

    final retention = calculateDecay(memory, now).decayFactor;
    return retention < retentionThreshold &&
        memory.importance < minImportance &&
        memory.accessCount < minAccessCount;
  }
}
