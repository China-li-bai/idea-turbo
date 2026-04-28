import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/services/decay_service.dart';

MemoryItem _createMemory({
  String id = 'test-id',
  double initialStrength = 1.0,
  DateTime? createdAt,
  DateTime? accessedAt,
  int accessCount = 0,
  bool isPinned = false,
  EncodingContext? encodingContext,
}) {
  final now = DateTime.now();
  return MemoryItem(
    id: id,
    content: 'test content',
    initialStrength: initialStrength,
    createdAt: createdAt ?? now,
    accessedAt: accessedAt ?? createdAt ?? now,
    accessCount: accessCount,
    isPinned: isPinned,
    encodingContext: encodingContext,
  );
}

void main() {
  group('DecayService', () {
    group('default values', () {
      test('should have sensible defaults', () {
        final service = DecayService();
        expect(service.decayRate, equals(0.1));
        expect(service.minStrength, equals(0.01));
        expect(service.rehearsalBoost, equals(0.2));
        expect(service.rehearsalDecayRate, equals(0.05));
        expect(service.recencyHalfLifeHours, equals(24.0));
      });

      test('should accept custom values', () {
        final service = DecayService(
          decayRate: 0.2,
          minStrength: 0.05,
          rehearsalBoost: 0.3,
        );
        expect(service.decayRate, equals(0.2));
        expect(service.minStrength, equals(0.05));
        expect(service.rehearsalBoost, equals(0.3));
      });
    });

    group('decay calculation', () {
      test('memory should have full strength at creation time', () {
        final service = DecayService();
        final now = DateTime.now();
        final memory = _createMemory(initialStrength: 1.0, createdAt: now);

        final result = service.calculateDecay(memory, now);

        expect(result.decayedStrength, closeTo(1.0, 0.01));
        expect(result.timeElapsed, closeTo(0.0, 0.01));
      });

      test('memory strength should decrease over time', () {
        final service = DecayService(decayRate: 0.1);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 10));
        final memory = _createMemory(initialStrength: 1.0, createdAt: created);

        final result = service.calculateDecay(memory, now);

        expect(result.decayedStrength, closeTo(0.368, 0.05));
        expect(result.timeElapsed, closeTo(10.0, 0.1));
      });

      test('strength should not fall below minStrength', () {
        final service = DecayService(decayRate: 1.0, minStrength: 0.1);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 100));
        final memory = _createMemory(initialStrength: 1.0, createdAt: created);

        final result = service.calculateDecay(memory, now);

        expect(result.decayedStrength, greaterThanOrEqualTo(0.1));
      });

      test('pinned memory should not decay', () {
        final service = DecayService(decayRate: 1.0);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 100));
        final memory = _createMemory(
          initialStrength: 1.0,
          createdAt: created,
          isPinned: true,
        );

        final result = service.calculateDecay(memory, now);

        expect(result.decayedStrength, equals(1.0));
        expect(result.decayFactor, equals(1.0));
      });

      test('decay result should contain all expected fields', () {
        final service = DecayService();
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 5));
        final memory = _createMemory(initialStrength: 0.8, createdAt: created);

        final result = service.calculateDecay(memory, now);

        expect(result.originalStrength, equals(0.8));
        expect(result.decayedStrength, lessThanOrEqualTo(0.8));
        expect(result.decayedStrength, greaterThan(0));
        expect(result.timeElapsed, closeTo(5.0, 0.1));
        expect(result.decayFactor, lessThan(1));
        expect(result.decayFactor, greaterThan(0));
      });
    });

    group('rehearsal effect', () {
      test('accessing a memory should increase its effective strength', () {
        final service = DecayService(rehearsalBoost: 0.2);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 10));

        final memoryNoAccess = _createMemory(
          initialStrength: 1.0,
          createdAt: created,
          accessedAt: created,
          accessCount: 0,
        );

        final memoryAccessed = _createMemory(
          initialStrength: 1.0,
          createdAt: created,
          accessedAt: now.subtract(const Duration(hours: 1)),
          accessCount: 3,
        );

        final resultNoAccess = service.calculateDecay(memoryNoAccess, now);
        final resultAccessed = service.calculateDecay(memoryAccessed, now);

        expect(resultAccessed.decayedStrength, greaterThan(resultNoAccess.decayedStrength));
        expect(resultAccessed.rehearsalBonus, greaterThan(0));
      });

      test('rehearsal bonus should decay over time since last access', () {
        final service = DecayService(rehearsalBoost: 0.2, rehearsalDecayRate: 0.1);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 20));

        final memoryRecent = _createMemory(
          initialStrength: 1.0,
          createdAt: created,
          accessedAt: now.subtract(const Duration(hours: 1)),
          accessCount: 5,
        );

        final memoryOld = _createMemory(
          initialStrength: 1.0,
          createdAt: created,
          accessedAt: now.subtract(const Duration(hours: 10)),
          accessCount: 5,
        );

        final resultRecent = service.calculateDecay(memoryRecent, now);
        final resultOld = service.calculateDecay(memoryOld, now);

        expect(resultRecent.rehearsalBonus, greaterThan(resultOld.rehearsalBonus));
      });
    });

    group('estimateTimeToThreshold', () {
      test('should estimate time until strength falls below threshold', () {
        final service = DecayService(decayRate: 0.1);
        final now = DateTime.now();
        final memory = _createMemory(initialStrength: 1.0, createdAt: now);

        final timeToHalf = service.estimateTimeToThreshold(memory, 0.5, now);

        expect(timeToHalf, isNotNull);
        expect(timeToHalf, closeTo(6.93, 0.2));
      });

      test('pinned memory should return null', () {
        final service = DecayService();
        final now = DateTime.now();
        final memory = _createMemory(initialStrength: 1.0, createdAt: now, isPinned: true);

        final result = service.estimateTimeToThreshold(memory, 0.5, now);

        expect(result, isNull);
      });

      test('already below threshold should return zero', () {
        final service = DecayService(decayRate: 1.0);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 10));
        final memory = _createMemory(initialStrength: 1.0, createdAt: created);

        final result = service.estimateTimeToThreshold(memory, 0.9, now);

        expect(result, equals(0.0));
      });
    });

    group('batch operations', () {
      test('should calculate decay for multiple memories', () {
        final service = DecayService();
        final now = DateTime.now();
        final memories = List.generate(
          5,
          (i) => _createMemory(
            id: 'm$i',
            initialStrength: 1.0,
            createdAt: now.subtract(Duration(hours: i)),
          ),
        );

        final results = service.batchCalculateDecay(memories, now);

        expect(results.length, equals(5));
        final strengths = results.map((r) => r.value.decayedStrength).toList();
        expect(strengths, equals(strengths..sort((a, b) => b.compareTo(a))));
      });

      test('should filter memories by strength range', () {
        final service = DecayService(decayRate: 0.1);
        final now = DateTime.now();
        final memories = List.generate(
          10,
          (i) => _createMemory(
            id: 'm$i',
            initialStrength: 1.0,
            createdAt: now.subtract(Duration(hours: i * 5)),
          ),
        );

        final filtered = service.filterByStrength(memories, 0.3, 0.7, now);

        expect(filtered.isNotEmpty, isTrue);
        for (final m in filtered) {
          final strength = service.calculateDecay(m, now).decayedStrength;
          expect(strength, greaterThanOrEqualTo(0.3));
          expect(strength, lessThanOrEqualTo(0.7));
        }
      });
    });

    group('applyRehearsalInPlace', () {
      test('should increment access count', () {
        final service = DecayService();
        final memory = _createMemory(accessCount: 3);

        final updated = service.applyRehearsalInPlace(memory);

        expect(updated.accessCount, equals(4));
      });

      test('should update accessedAt to approximately now', () {
        final service = DecayService();
        final oldTime = DateTime(2025, 1, 1);
        final memory = _createMemory(accessedAt: oldTime, accessCount: 0);

        final before = DateTime.now();
        final updated = service.applyRehearsalInPlace(memory);
        final after = DateTime.now();

        expect(updated.accessedAt.isAfter(oldTime), isTrue);
        expect(updated.accessedAt.millisecondsSinceEpoch,
            greaterThanOrEqualTo(before.millisecondsSinceEpoch));
        expect(updated.accessedAt.millisecondsSinceEpoch,
            lessThanOrEqualTo(after.millisecondsSinceEpoch));
      });
    });

    group('arousal gating', () {
      test('high arousal should boost decayed strength', () {
        final service = DecayService(decayRate: 0.1);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 10));

        final memoryNoArousal = _createMemory(
          initialStrength: 1.0,
          createdAt: created,
        );

        final memoryHighArousal = _createMemory(
          initialStrength: 1.0,
          createdAt: created,
          encodingContext: EncodingContext(arousalLevel: 0.8),
        );

        final resultNoArousal = service.calculateDecay(memoryNoArousal, now);
        final resultHighArousal = service.calculateDecay(memoryHighArousal, now);

        expect(resultHighArousal.decayedStrength, greaterThan(resultNoArousal.decayedStrength));
      });
    });

    group('pruning', () {
      test('should identify memories below threshold for pruning', () {
        final service = DecayService();
        final memories = [
          _createMemory(id: 'strong', strength: 0.8),
          _createMemory(id: 'weak', strength: 0.05),
          _createMemory(id: 'pinned', strength: 0.02, isPinned: true),
        ];

        final toPrune = service.getMemoriesToPrune(memories, 0.1);

        expect(toPrune.length, equals(1));
        expect(toPrune.first.id, equals('weak'));
      });
    });
  });
}
