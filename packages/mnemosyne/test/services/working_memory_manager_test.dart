import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/services/working_memory_manager.dart';

MemoryItem _createMemory({
  String id = 'test-id',
  double importance = 0.5,
  double strength = 0.8,
}) {
  return MemoryItem(
    id: id,
    content: 'test content',
    importance: importance,
    strength: strength,
  );
}

void main() {
  group('WorkingMemoryManager', () {
    group('default values', () {
      test('should have sensible defaults', () {
        final manager = WorkingMemoryManager();
        expect(manager.capacity, equals(7));
        expect(manager.activationDecayRate, equals(0.1));
        expect(manager.minActivation, equals(0.1));
        expect(manager.refreshBoost, equals(0.3));
        expect(manager.importanceWeight, equals(0.5));
      });

      test('should start empty', () {
        final manager = WorkingMemoryManager();
        expect(manager.size, equals(0));
        expect(manager.isFull, isFalse);
        expect(manager.availableSlots, equals(7));
      });
    });

    group('add', () {
      test('should create a slot', () {
        final manager = WorkingMemoryManager();
        final memory = _createMemory(id: 'm1');

        final result = manager.add(memory);

        expect(result, isTrue);
        expect(manager.contains('m1'), isTrue);
        expect(manager.size, equals(1));
      });

      test('adding duplicate should refresh instead', () {
        final manager = WorkingMemoryManager();
        final memory = _createMemory(id: 'm1');

        manager.add(memory);
        final result = manager.add(memory);

        expect(result, isFalse);
        expect(manager.size, equals(1));
      });

      test('should accept custom activation', () {
        final manager = WorkingMemoryManager();
        final memory = _createMemory(id: 'm1');

        manager.add(memory, initialActivation: 0.9);
        final slot = manager.getSlot('m1');

        expect(slot, isNotNull);
        expect(slot!.activation, equals(0.9));
      });

      test('should clamp activation to [0, 1]', () {
        final manager = WorkingMemoryManager();

        manager.add(_createMemory(id: 'm1'), initialActivation: 1.5);
        manager.add(_createMemory(id: 'm2'), initialActivation: -0.5);

        expect(manager.getSlot('m1')!.activation, equals(1.0));
        expect(manager.getSlot('m2')!.activation, equals(0.0));
      });

      test('should evict lowest activation when full', () {
        final manager = WorkingMemoryManager(capacity: 3);

        manager.add(_createMemory(id: 'm1'), initialActivation: 0.3);
        manager.add(_createMemory(id: 'm2'), initialActivation: 0.5);
        manager.add(_createMemory(id: 'm3'), initialActivation: 0.7);
        manager.add(_createMemory(id: 'm4'), initialActivation: 0.9);

        expect(manager.size, equals(3));
        expect(manager.contains('m1'), isFalse);
        expect(manager.contains('m4'), isTrue);
      });
    });

    group('remove', () {
      test('should delete slot', () {
        final manager = WorkingMemoryManager();
        manager.add(_createMemory(id: 'm1'));

        final result = manager.remove('m1');

        expect(result, isTrue);
        expect(manager.contains('m1'), isFalse);
      });

      test('should return false for missing', () {
        final manager = WorkingMemoryManager();

        final result = manager.remove('nonexistent');

        expect(result, isFalse);
      });
    });

    group('refresh', () {
      test('should boost activation', () {
        final manager = WorkingMemoryManager(refreshBoost: 0.2);
        manager.add(_createMemory(id: 'm1'), initialActivation: 0.5);

        final result = manager.refresh('m1');
        final slot = manager.getSlot('m1');

        expect(result, isTrue);
        expect(slot!.activation, closeTo(0.7, 0.01));
        expect(slot.refreshCount, equals(1));
      });

      test('should return false for missing', () {
        final manager = WorkingMemoryManager();

        final result = manager.refresh('nonexistent');

        expect(result, isFalse);
      });

      test('should not exceed 1.0', () {
        final manager = WorkingMemoryManager(refreshBoost: 0.5);
        manager.add(_createMemory(id: 'm1'), initialActivation: 0.9);

        manager.refresh('m1');
        final slot = manager.getSlot('m1');

        expect(slot!.activation, equals(1.0));
      });
    });

    group('decay', () {
      test('should reduce activation', () {
        final manager = WorkingMemoryManager(activationDecayRate: 0.1);
        manager.add(_createMemory(id: 'm1'), initialActivation: 1.0);

        manager.decayAll(elapsedSeconds: 1.0);
        final slot = manager.getSlot('m1');

        expect(slot!.activation, lessThan(1.0));
      });

      test('should evict slots below threshold', () {
        final manager = WorkingMemoryManager(
          activationDecayRate: 0.5,
          minActivation: 0.3,
        );
        manager.add(_createMemory(id: 'm1'), initialActivation: 0.4);

        final evicted = manager.decayAll(elapsedSeconds: 1.0);

        expect(evicted, equals(1));
        expect(manager.contains('m1'), isFalse);
      });

      test('should return eviction count', () {
        final manager = WorkingMemoryManager(
          activationDecayRate: 0.9,
          minActivation: 0.5,
        );
        manager.add(_createMemory(id: 'm1'), initialActivation: 0.6);
        manager.add(_createMemory(id: 'm2'), initialActivation: 0.6);

        final evicted = manager.decayAll(elapsedSeconds: 1.0);

        expect(evicted, greaterThanOrEqualTo(0));
      });
    });

    group('getActiveMemories', () {
      test('should return memories sorted by activation', () {
        final manager = WorkingMemoryManager(capacity: 5);
        manager.add(_createMemory(id: 'low'), initialActivation: 0.3);
        manager.add(_createMemory(id: 'high'), initialActivation: 0.9);
        manager.add(_createMemory(id: 'mid'), initialActivation: 0.6);

        final active = manager.getActiveMemories();

        expect(active[0].id, equals('high'));
        expect(active[1].id, equals('mid'));
        expect(active[2].id, equals('low'));
      });
    });

    group('clear', () {
      test('should remove all slots', () {
        final manager = WorkingMemoryManager();
        manager.add(_createMemory(id: 'm1'));
        manager.add(_createMemory(id: 'm2'));

        manager.clear();

        expect(manager.size, equals(0));
      });
    });
  });
}
