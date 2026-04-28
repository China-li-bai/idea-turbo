import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/core/constants.dart';

void main() {
  group('MemoryItem', () {
    group('construction', () {
      test('should create with required fields only', () {
        final item = MemoryItem(id: 'test', content: 'hello');

        expect(item.id, equals('test'));
        expect(item.content, equals('hello'));
        expect(item.type, equals(MemoryType.episodic));
        expect(item.source, equals(MemorySource.conversation));
        expect(item.status, equals(MemoryStatus.active));
        expect(item.importance, equals(0.5));
        expect(item.initialStrength, equals(1.0));
        expect(item.strength, equals(1.0));
        expect(item.isPinned, isFalse);
        expect(item.isArchived, isFalse);
        expect(item.isConsolidated, isFalse);
      });

      test('should create with all fields', () {
        final now = DateTime.now();
        final ctx = EncodingContext(arousalLevel: 0.5, userMood: UserMood.happy);
        final item = MemoryItem(
          id: 'full',
          content: 'full content',
          type: MemoryType.semantic,
          source: MemorySource.userExplicit,
          status: MemoryStatus.challenged,
          importance: 0.9,
          initialStrength: 0.8,
          strength: 0.7,
          emotionalValence: 0.6,
          surpriseScore: 0.4,
          keywords: ['key1', 'key2'],
          entities: ['Alice', 'Bob'],
          topics: ['work'],
          embedding: [0.1, 0.2, 0.3],
          encodingContext: ctx,
          metadata: {'key': 'value'},
          createdAt: now,
          accessedAt: now,
          updatedAt: now,
          accessCount: 5,
          agentId: 'agent-1',
          userId: 'user-1',
          relatedMemoryIds: ['r1'],
          isPinned: true,
          isArchived: false,
          isConsolidated: false,
        );

        expect(item.type, equals(MemoryType.semantic));
        expect(item.source, equals(MemorySource.userExplicit));
        expect(item.status, equals(MemoryStatus.challenged));
        expect(item.importance, equals(0.9));
        expect(item.emotionalValence, equals(0.6));
        expect(item.keywords, equals(['key1', 'key2']));
        expect(item.entities, equals(['Alice', 'Bob']));
        expect(item.embedding, equals([0.1, 0.2, 0.3]));
        expect(item.encodingContext?.arousalLevel, equals(0.5));
        expect(item.metadata?['key'], equals('value'));
        expect(item.accessCount, equals(5));
        expect(item.isPinned, isTrue);
      });
    });

    group('currentStrength', () {
      test('should return initialStrength when pinned', () {
        final item = MemoryItem(id: 'p', content: 'pinned', isPinned: true, initialStrength: 0.8);
        expect(item.currentStrength, equals(0.8));
      });

      test('should return strength when no encoding context', () {
        final item = MemoryItem(id: 's', content: 'simple', strength: 0.6);
        expect(item.currentStrength, equals(0.6));
      });

      test('should boost strength with arousal level', () {
        final ctx = EncodingContext(arousalLevel: 0.8);
        final item = MemoryItem(id: 'a', content: 'aroused', strength: 0.5, encodingContext: ctx);
        expect(item.currentStrength, closeTo(0.5 * 1.4, 0.01));
      });
    });

    group('copyWith', () {
      test('should copy with new values', () {
        final original = MemoryItem(id: 'orig', content: 'original');
        final copied = original.copyWith(content: 'modified', importance: 0.9);

        expect(copied.id, equals('orig'));
        expect(copied.content, equals('modified'));
        expect(copied.importance, equals(0.9));
        expect(original.content, equals('original'));
      });

      test('should preserve unmodified fields', () {
        final original = MemoryItem(
          id: 'orig',
          content: 'original',
          importance: 0.7,
          isPinned: true,
        );
        final copied = original.copyWith(content: 'new');

        expect(copied.importance, equals(0.7));
        expect(copied.isPinned, isTrue);
      });
    });

    group('access', () {
      test('should increment access count and update timestamps', () {
        final original = MemoryItem(id: 'acc', content: 'test', accessCount: 3);
        final before = DateTime.now();
        final accessed = original.access(rehearsalBoost: 0.2);
        final after = DateTime.now();

        expect(accessed.accessCount, equals(4));
        expect(accessed.strength, closeTo(1.0, 0.01));
        expect(accessed.accessedAt.millisecondsSinceEpoch,
            greaterThanOrEqualTo(before.millisecondsSinceEpoch));
        expect(accessed.accessedAt.millisecondsSinceEpoch,
            lessThanOrEqualTo(after.millisecondsSinceEpoch));
      });
    });

    group('serialization', () {
      test('should round-trip through JSON', () {
        final now = DateTime(2025, 6, 15, 10, 30, 0);
        final ctx = EncodingContext(
          userMood: UserMood.happy,
          arousalLevel: 0.7,
          socialContext: SocialContext.withFriends,
        );
        final original = MemoryItem(
          id: 'json-test',
          content: 'test serialization',
          type: MemoryType.semantic,
          source: MemorySource.userExplicit,
          importance: 0.85,
          emotionalValence: 0.6,
          keywords: ['test', 'json'],
          entities: ['Alice'],
          topics: ['testing'],
          embedding: [0.1, 0.2, 0.3],
          encodingContext: ctx,
          metadata: {'category': 'unit-test'},
          createdAt: now,
          accessedAt: now,
          updatedAt: now,
          accessCount: 7,
          isPinned: true,
        );

        final json = original.toJson();
        final restored = MemoryItem.fromJson(json);

        expect(restored.id, equals(original.id));
        expect(restored.content, equals(original.content));
        expect(restored.type, equals(original.type));
        expect(restored.source, equals(original.source));
        expect(restored.importance, equals(original.importance));
        expect(restored.emotionalValence, equals(original.emotionalValence));
        expect(restored.keywords, equals(original.keywords));
        expect(restored.entities, equals(original.entities));
        expect(restored.embedding, equals(original.embedding));
        expect(restored.encodingContext?.arousalLevel, equals(0.7));
        expect(restored.accessCount, equals(7));
        expect(restored.isPinned, isTrue);
      });

      test('should handle null optional fields', () {
        final original = MemoryItem(id: 'minimal', content: 'minimal');
        final json = original.toJson();
        final restored = MemoryItem.fromJson(json);

        expect(restored.embedding, isNull);
        expect(restored.encodingContext, isNull);
        expect(restored.metadata, isNull);
        expect(restored.sourceId, isNull);
        expect(restored.agentId, isNull);
      });
    });
  });
}
