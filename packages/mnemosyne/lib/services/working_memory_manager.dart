import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class WorkingMemorySlot {
  final MemoryItem memory;
  final double activation;
  final int refreshCount;
  final DateTime addedAt;

  WorkingMemorySlot({
    required this.memory,
    required this.activation,
    this.refreshCount = 0,
    DateTime? addedAt,
  }) : addedAt = addedAt ?? DateTime.now();

  WorkingMemorySlot copyWith({
    MemoryItem? memory,
    double? activation,
    int? refreshCount,
    DateTime? addedAt,
  }) {
    return WorkingMemorySlot(
      memory: memory ?? this.memory,
      activation: activation,
      refreshCount: refreshCount ?? this.refreshCount,
      addedAt: addedAt ?? this.addedAt,
    );
  }
}

class WorkingMemoryManager {
  final int capacity;
  final double activationDecayRate;
  final double minActivation;
  final double refreshBoost;
  final double importanceWeight;

  final Map<String, WorkingMemorySlot> _slots = {};

  WorkingMemoryManager({
    this.capacity = 7,
    this.activationDecayRate = 0.1,
    this.minActivation = 0.1,
    this.refreshBoost = 0.3,
    this.importanceWeight = 0.5,
  });

  int get size => _slots.length;
  bool get isFull => _slots.length >= capacity;
  int get availableSlots => capacity - _slots.length;

  bool add(MemoryItem memory, {double? initialActivation}) {
    if (_slots.containsKey(memory.id)) {
      refresh(memory.id);
      return false;
    }

    if (isFull) {
      _evictLowest();
    }

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
    _slots[memoryId] = slot.copyWith(
      activation: newActivation,
      refreshCount: slot.refreshCount + 1,
    );
    return true;
  }

  int decayAll({double elapsedSeconds = 1.0}) {
    final toEvict = <String>[];
    final updated = <String, WorkingMemorySlot>{};

    for (final entry in _slots.entries) {
      final slot = entry.value;
      final newActivation = slot.activation * (1.0 - activationDecayRate * elapsedSeconds);
      if (newActivation < minActivation) {
        toEvict.add(entry.key);
      } else {
        updated[entry.key] = slot.copyWith(activation: newActivation.clamp(0.0, 1.0));
      }
    }

    for (final id in toEvict) {
      _slots.remove(id);
    }
    for (final entry in updated.entries) {
      _slots[entry.key] = entry.value;
    }

    return toEvict.length;
  }

  List<MemoryItem> getActiveMemories() {
    final sorted = _slots.values.toList()
      ..sort((a, b) => b.activation.compareTo(a.activation));
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
