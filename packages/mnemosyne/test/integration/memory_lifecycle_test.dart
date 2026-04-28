import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/services/decay_service.dart';
import 'package:mnemosyne/services/importance_engine.dart';
import 'package:mnemosyne/services/consolidation_engine.dart';
import 'package:mnemosyne/services/working_memory_manager.dart';
import 'package:mnemosyne/services/surprise_service.dart';

void main() {
  group('Integration: Memory Lifecycle', () {
    group('add → decay → prune lifecycle', () {
      test('memory should flow through full lifecycle', () {
        final decayService = DecayService(decayRate: 0.1);
        final now = DateTime.now();

        final memory = MemoryItem(
          id: 'lifecycle-1',
          content: 'I am a vegetarian and allergic to nuts',
          type: MemoryType.episodic,
          source: MemorySource.conversation,
          importance: 0.7,
          keywords: ['vegetarian', 'nuts', 'allergy'],
          entities: ['user'],
          createdAt: now,
          accessedAt: now,
        );

        final result = decayService.calculateDecay(memory, now);
        expect(result.decayedStrength, closeTo(1.0, 0.01));

        final after10Hours = now.add(const Duration(hours: 10));
        final decayed = decayService.calculateDecay(memory, after10Hours);
        expect(decayed.decayedStrength, lessThan(1.0));
        expect(decayed.decayedStrength, greaterThan(0.0));

        final after100Days = now.add(const Duration(days: 100));
        final heavilyDecayed = decayService.calculateDecay(memory, after100Days);
        expect(heavilyDecayed.decayedStrength, greaterThanOrEqualTo(decayService.minStrength));

        final toPrune = decayService.getMemoriesToPrune(
          [memory.copyWith(strength: heavilyDecayed.decayedStrength)],
          0.1,
        );
        expect(toPrune.length, equals(1));
      });
    });

    group('evolutionary stability (OpenMemory omnibus)', () {
      test('popular memory should survive while unpopular decays', () {
        final decayService = DecayService(decayRate: 0.1);
        final baseTime = DateTime(2025, 1, 1, 0, 0, 0);
        final futureTime = baseTime.add(const Duration(hours: 240));

        final popular = MemoryItem(
          id: 'popular',
          content: 'I am the Popular Memory',
          importance: 0.7,
          createdAt: baseTime,
          accessedAt: futureTime.subtract(const Duration(hours: 2)),
          accessCount: 5,
        );

        final unpopular = MemoryItem(
          id: 'unpopular',
          content: 'I am the Unpopular Memory',
          importance: 0.3,
          createdAt: baseTime,
          accessedAt: baseTime,
          accessCount: 0,
        );

        final popularFinal = decayService.calculateDecay(popular, futureTime);
        final unpopularFinal = decayService.calculateDecay(unpopular, futureTime);

        expect(popularFinal.decayedStrength, greaterThan(unpopularFinal.decayedStrength));
      });

      test('recently accessed memory should have higher strength than old access', () {
        final decayService = DecayService(decayRate: 0.1);
        final baseTime = DateTime(2025, 1, 1, 0, 0, 0);
        final futureTime = baseTime.add(const Duration(hours: 240));

        final recentAccess = MemoryItem(
          id: 'recent',
          importance: 0.5,
          createdAt: baseTime,
          accessedAt: futureTime.subtract(const Duration(hours: 1)),
          accessCount: 3,
        );

        final oldAccess = MemoryItem(
          id: 'old',
          importance: 0.5,
          createdAt: baseTime,
          accessedAt: baseTime.add(const Duration(hours: 1)),
          accessCount: 3,
        );

        final recentResult = decayService.calculateDecay(recentAccess, futureTime);
        final oldResult = decayService.calculateDecay(oldAccess, futureTime);

        expect(recentResult.decayedStrength, greaterThan(oldResult.decayedStrength));
      });
    });

    group('importance scoring integration', () {
      test('multi-factor importance should rank memories correctly', () {
        final engine = ImportanceEngine();
        final now = DateTime.now();

        final urgentWork = MemoryItem(
          id: 'urgent-work',
          content: 'Finish Report',
          source: MemorySource.userExplicit,
          importance: 0.9,
          accessCount: 10,
          emotionalValence: 0.7,
          surpriseScore: 0.3,
          entities: ['Report', 'Work'],
          createdAt: now,
        );

        final casualNote = MemoryItem(
          id: 'casual',
          content: 'Clean Desk',
          source: MemorySource.conversation,
          importance: 0.3,
          accessCount: 1,
          emotionalValence: 0.0,
          entities: [],
          createdAt: now.subtract(const Duration(hours: 48)),
        );

        final urgentScore = engine.getImportance(urgentWork, now);
        final casualScore = engine.getImportance(casualNote, now);

        expect(urgentScore, greaterThan(casualScore));
      });
    });

    group('consolidation integration', () {
      test('similar episodic memories should consolidate into semantic', () {
        final engine = ConsolidationEngine(minMemories: 2, similarityThreshold: 0.9);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 48));

        final memories = [
          MemoryItem(
            id: 'ep1',
            content: 'Had lunch with Alice at Italian restaurant',
            type: MemoryType.episodic,
            embedding: [1.0, 0.0, 0.0],
            entities: ['Alice', 'Italian restaurant'],
            topics: ['dining'],
            accessCount: 5,
            createdAt: created,
          ),
          MemoryItem(
            id: 'ep2',
            content: 'Had dinner with Alice at Italian place',
            type: MemoryType.episodic,
            embedding: [0.99, 0.01, 0.0],
            entities: ['Alice', 'Italian restaurant'],
            topics: ['dining'],
            accessCount: 3,
            createdAt: created,
          ),
          MemoryItem(
            id: 'ep3',
            content: 'Met Alice for Italian food again',
            type: MemoryType.episodic,
            embedding: [0.98, 0.02, 0.0],
            entities: ['Alice'],
            topics: ['dining'],
            accessCount: 4,
            createdAt: created,
          ),
        ];

        final candidates = engine.findConsolidationCandidates(memories, now);
        expect(candidates.length, equals(1));

        final result = engine.consolidate(
          candidates.first,
          contentGenerator: (memories) => memories.map((m) => m.content).join('; '),
        );

        expect(result.sourceMemoryIds.length, equals(3));
        expect(result.sharedEntities, contains('Alice'));
        expect(result.sharedTopics, contains('dining'));
        expect(result.memoryType, equals('semantic'));
      });
    });

    group('working memory integration', () {
      test('should manage capacity and evict low-activation items', () {
        final manager = WorkingMemoryManager(capacity: 3);

        manager.add(MemoryItem(id: 'm1', content: 'first', importance: 0.3), initialActivation: 0.3);
        manager.add(MemoryItem(id: 'm2', content: 'second', importance: 0.5), initialActivation: 0.5);
        manager.add(MemoryItem(id: 'm3', content: 'third', importance: 0.7), initialActivation: 0.7);

        expect(manager.isFull, isTrue);

        manager.add(MemoryItem(id: 'm4', content: 'fourth', importance: 0.9), initialActivation: 0.9);

        expect(manager.size, equals(3));
        expect(manager.contains('m1'), isFalse);
        expect(manager.contains('m4'), isTrue);

        manager.refresh('m2');
        manager.decayAll(elapsedSeconds: 1.0);

        final active = manager.getActiveMemories();
        expect(active.isNotEmpty, isTrue);
      });
    });

    group('surprise detection', () {
      test('novel content should have higher surprise score', () {
        final service = SurpriseService();

        final existingMemories = [
          MemoryItem(
            id: 'e1',
            content: 'I like pizza',
            keywords: ['pizza', 'food'],
            embedding: [0.8, 0.2, 0.0],
          ),
          MemoryItem(
            id: 'e2',
            content: 'I enjoy pasta',
            keywords: ['pasta', 'food'],
            embedding: [0.7, 0.3, 0.0],
          ),
        ];

        final novelEmbedding = [0.0, 0.1, 0.9];
        final familiarEmbedding = [0.75, 0.25, 0.0];

        final novelSurprise = service.computeSurprise(novelEmbedding, existingMemories);
        final familiarSurprise = service.computeSurprise(familiarEmbedding, existingMemories);

        expect(novelSurprise.surprise, greaterThan(familiarSurprise.surprise));
      });

      test('near-duplicate should be flagged', () {
        final service = SurpriseService(dedupThreshold: 0.92);

        final existing = [
          MemoryItem(id: 'e1', content: 'I like pizza', embedding: [1.0, 0.0, 0.0]),
        ];

        final nearDuplicate = service.computeSurprise([0.99, 0.01, 0.0], existing);
        expect(nearDuplicate.isDuplicate, isTrue);
      });
    });

    group('content robustness (OpenMemory omnibus)', () {
      test('should handle HTML content', () {
        final html = '<div><h1>Title</h1><p>Body</p></div>';
        final memory = MemoryItem(id: 'html', content: html);
        expect(memory.content, equals(html));
      });

      test('should handle JSON content', () {
        final json = '{"key": "value", "list": [1, 2, 3]}';
        final memory = MemoryItem(id: 'json', content: json);
        expect(memory.content, equals(json));
      });

      test('should handle Markdown content', () {
        final markdown = '| Col1 | Col2 |\n|---|---|\n| Val1 | Val2 |';
        final memory = MemoryItem(id: 'md', content: markdown);
        expect(memory.content, equals(markdown));
      });

      test('should handle Chinese content', () {
        final chinese = '我喜欢普洱茶，特别是云南的古树茶';
        final memory = MemoryItem(id: 'zh', content: chinese);
        expect(memory.content, equals(chinese));
      });

      test('should handle emoji content', () {
        final emoji = 'Great party! 🎉🥳🎊';
        final memory = MemoryItem(id: 'emoji', content: emoji);
        expect(memory.content, equals(emoji));
      });

      test('should handle very long content', () {
        final longContent = 'A' * 10000;
        final memory = MemoryItem(id: 'long', content: longContent);
        expect(memory.content.length, equals(10000));
      });
    });

    group('encoding context (相) integration', () {
      test('memories stored with similar context should match higher', () {
        final storeContext = EncodingContext(
          userMood: UserMood.happy,
          socialContext: SocialContext.withFriends,
          timeOfDay: TimeOfDay.evening,
          arousalLevel: 0.6,
        );

        final memory = MemoryItem(
          id: 'ctx-test',
          content: 'Great dinner with Alice',
          encodingContext: storeContext,
        );

        final matchingContext = EncodingContext(
          userMood: UserMood.happy,
          socialContext: SocialContext.withFriends,
          timeOfDay: TimeOfDay.evening,
        );

        final mismatchingContext = EncodingContext(
          userMood: UserMood.sad,
          socialContext: SocialContext.alone,
          timeOfDay: TimeOfDay.morning,
        );

        final matchScore = memory.encodingContext!.calculateMatchScore(matchingContext);
        final mismatchScore = memory.encodingContext!.calculateMatchScore(mismatchingContext);

        expect(matchScore, greaterThan(mismatchScore));
      });

      test('arousal gating should affect decay', () {
        final decayService = DecayService(decayRate: 0.1);
        final now = DateTime.now();
        final created = now.subtract(const Duration(hours: 10));

        final calmMemory = MemoryItem(
          id: 'calm',
          content: 'Routine meeting',
          initialStrength: 1.0,
          createdAt: created,
        );

        final excitedMemory = MemoryItem(
          id: 'excited',
          content: 'Surprise party!',
          initialStrength: 1.0,
          createdAt: created,
          encodingContext: EncodingContext(arousalLevel: 0.9),
        );

        final calmDecay = decayService.calculateDecay(calmMemory, now);
        final excitedDecay = decayService.calculateDecay(excitedMemory, now);

        expect(excitedDecay.decayedStrength, greaterThan(calmDecay.decayedStrength));
      });
    });

    group('memory state machine (engram)', () {
      test('active memory can be challenged by contradictory memory', () {
        final original = MemoryItem(
          id: 'old',
          content: 'User lives in Beijing',
          status: MemoryStatus.active,
        );

        final challenged = original.copyWith(status: MemoryStatus.challenged);

        expect(challenged.status, equals(MemoryStatus.challenged));
        expect(challenged.id, equals('old'));
      });

      test('challenged memory can be invalidated', () {
        final challenged = MemoryItem(
          id: 'old',
          content: 'User lives in Beijing',
          status: MemoryStatus.challenged,
        );

        final invalidated = challenged.copyWith(status: MemoryStatus.invalidated);

        expect(invalidated.status, equals(MemoryStatus.invalidated));
      });

      test('challenged memory can be merged', () {
        final challenged = MemoryItem(
          id: 'old',
          content: 'User lives in Beijing',
          status: MemoryStatus.challenged,
        );

        final merged = challenged.copyWith(
          status: MemoryStatus.merged,
          supersededById: 'new-memory-id',
        );

        expect(merged.status, equals(MemoryStatus.merged));
        expect(merged.supersededById, equals('new-memory-id'));
      });
    });
  });
}
