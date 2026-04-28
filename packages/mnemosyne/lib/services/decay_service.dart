import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

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

  DecayService({
    this.decayRate = 0.1,
    this.minStrength = 0.01,
    this.rehearsalBoost = 0.2,
    this.rehearsalDecayRate = 0.05,
    this.recencyHalfLifeHours = 24.0,
    this.forgettingHalfLifeDays = 30.0,
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

    final decayFactor = exp(-decayRate * timeElapsedHours);
    final baseStrength = memory.initialStrength * decayFactor;

    final rehearsalBonus = _calculateRehearsalBonus(memory, now);

    final arousalLevel = memory.encodingContext?.arousalLevel ?? 0.0;
    final arousalGating = 1.0 + arousalLevel * 0.5;

    var decayedStrength = (baseStrength + rehearsalBonus) * arousalGating;
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

  double calculateRecencyScore(MemoryItem memory, DateTime now) {
    final hoursElapsed = now.difference(memory.accessedAt).inSeconds / 3600.0;
    if (hoursElapsed <= 0) return 1.0;
    return pow(0.5, hoursElapsed / recencyHalfLifeHours).toDouble();
  }

  double calculateTemporalDecay(MemoryItem memory, DateTime now) {
    final ageDays = now.difference(memory.createdAt).inSeconds / 86400.0;
    return exp(-0.693 * ageDays / forgettingHalfLifeDays);
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
    final targetDecayFactor = threshold / memory.initialStrength;
    final timeInHours = -log(targetDecayFactor) / decayRate;
    return timeInHours;
  }

  List<MapEntry<MemoryItem, DecayResult>> batchCalculateDecay(
    List<MemoryItem> memories, [
    DateTime? now,
  ]) {
    now ??= DateTime.now();
    return memories
        .map((m) => MapEntry(m, calculateDecay(m, now)))
        .toList();
  }

  List<MemoryItem> filterByStrength(
    List<MemoryItem> memories,
    double minStrength,
    double maxStrength, [
    DateTime? now,
  ]) {
    now ??= DateTime.now();
    return memories.where((m) {
      final strength = calculateDecay(m, now).decayedStrength;
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
}
