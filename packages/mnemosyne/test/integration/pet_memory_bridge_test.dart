import 'dart:io';
import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/core/config.dart';
import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/pet_memory_bridge.dart';
import 'package:mnemosyne/features/xiang/xiang.dart';
import 'package:mnemosyne/mnemosyne_class.dart';

const _kDimensions = 384;

List<double> _makeVec(int seed) {
  final rng = Random(seed);
  final vec = List.generate(_kDimensions, (_) => rng.nextDouble() * 2 - 1);
  final norm = sqrt(vec.fold(0.0, (sum, v) => sum + v * v));
  if (norm == 0) return vec;
  return vec.map((v) => v / norm).toList();
}

void main() {
  late PetMemoryBridge bridge;
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('pet_bridge_test_');

    final mnemosyne = Mnemosyne(
      config: MnemosyneConfig(databaseName: 'pet_test.db'),
      xiangPlugin: XiangPlugin(),
      directoryOverride: tempDir.path,
    );

    bridge = PetMemoryBridge(
      mnemosyne: mnemosyne,
      config: const PetMemoryConfig(
        enableEmotionalGating: true,
        enableSceneRecall: true,
        enableXiangContext: true,
      ),
    );

    await bridge.initialize();
  });

  tearDown(() async {
    await bridge.close();
    if (tempDir.existsSync()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('PetMemoryBridge - rememberInteraction', () {
    test('should store interaction with pet context metadata', () async {
      final ctx = PetContext(
        mood: PetMood.happy,
        state: PetState.playing,
        timeOfDay: TimeOfDay.afternoon,
        weather: 'sunny',
        activity: 'playing fetch',
        location: 'park',
      );

      final id = await bridge.rememberInteraction(
        content: 'Had a great time playing fetch in the park',
        petContext: ctx,
        importance: 0.7,
      );

      expect(id, isNotEmpty);

      final memory = await bridge.mnemosyne.getMemory(id);
      expect(memory, isNotNull);
      expect(memory!.content, equals('Had a great time playing fetch in the park'));
      expect(memory.metadata, isNotNull);
      expect(memory.metadata!['petMood'], equals('happy'));
      expect(memory.metadata!['petState'], equals('playing'));
      expect(memory.metadata!['timeOfDay'], equals('afternoon'));
    });

    test('should apply emotional gating to importance', () async {
      final excitedCtx = PetContext(
        mood: PetMood.excited,
        state: PetState.playing,
        timeOfDay: TimeOfDay.afternoon,
      );

      final neutralCtx = PetContext(
        mood: PetMood.neutral,
        state: PetState.idle,
        timeOfDay: TimeOfDay.afternoon,
      );

      final excitedId = await bridge.rememberInteraction(
        content: 'Excited memory event',
        petContext: excitedCtx,
        importance: 0.5,
      );

      final neutralId = await bridge.rememberInteraction(
        content: 'Neutral memory event',
        petContext: neutralCtx,
        importance: 0.5,
      );

      final excitedMemory = await bridge.mnemosyne.getMemory(excitedId);
      final neutralMemory = await bridge.mnemosyne.getMemory(neutralId);

      expect(excitedMemory!.importance, greaterThan(neutralMemory!.importance));
    });

    test('should store xiang context when enabled', () async {
      final ctx = PetContext(
        mood: PetMood.happy,
        state: PetState.talking,
        timeOfDay: TimeOfDay.evening,
        weather: 'rainy',
        temperature: '18',
        activity: 'chatting',
        location: 'home',
        ambientMood: 'cozy',
      );

      final id = await bridge.rememberInteraction(
        content: 'Rainy evening chat at home',
        petContext: ctx,
      );

      final memory = await bridge.mnemosyne.getMemory(id);
      expect(memory, isNotNull);
      expect(memory!.metadata, isNotNull);
      expect(memory.metadata!['xiang'], isNotNull);
      final xiang = memory.metadata!['xiang'] as Map;
      expect(xiang['weather'], equals('rainy'));
      expect(xiang['location'], equals('home'));
    });

    test('should store interaction with custom keywords and embedding', () async {
      final ctx = PetContext(
        mood: PetMood.curious,
        state: PetState.exploring,
        timeOfDay: TimeOfDay.morning,
      );

      final id = await bridge.rememberInteraction(
        content: 'Discovered a new walking trail',
        petContext: ctx,
        keywords: ['walking', 'trail', 'discovery'],
        embedding: _makeVec(1),
        importance: 0.6,
      );

      final memory = await bridge.mnemosyne.getMemory(id);
      expect(memory, isNotNull);
      expect(memory!.keywords, contains('walking'));
      expect(memory.embedding, isNotNull);
      expect(memory.embedding!.length, equals(_kDimensions));
    });
  });

  group('PetMemoryBridge - recallInteractions', () {
    test('should recall memories with pet context', () async {
      final sunnyCtx = PetContext(
        mood: PetMood.happy,
        state: PetState.playing,
        timeOfDay: TimeOfDay.afternoon,
        weather: 'sunny',
        location: 'park',
      );

      await bridge.rememberInteraction(
        content: 'Playing in the sunny park',
        petContext: sunnyCtx,
        keywords: ['park', 'sunny', 'playing'],
        embedding: _makeVec(10),
        importance: 0.8,
      );

      await bridge.rememberInteraction(
        content: 'Reading at home on a rainy day',
        petContext: PetContext(
          mood: PetMood.sleepy,
          state: PetState.idle,
          timeOfDay: TimeOfDay.evening,
          weather: 'rainy',
          location: 'home',
        ),
        keywords: ['reading', 'rainy', 'home'],
        embedding: _makeVec(20),
        importance: 0.5,
      );

      final results = await bridge.recallInteractions(
        query: 'park sunny',
        currentContext: sunnyCtx,
        queryEmbedding: _makeVec(10),
        limit: 5,
      );

      expect(results, isNotEmpty);
      expect(results.any((r) => r.memory.content.contains('sunny park')), isTrue);
    });
  });

  group('PetMemoryBridge - getRecentInteractions', () {
    test('should return recent interactions ordered by time', () async {
      final now = DateTime.now();
      for (int i = 0; i < 5; i++) {
        await bridge.rememberInteraction(
          content: 'Interaction $i',
          petContext: PetContext(
            mood: PetMood.neutral,
            state: PetState.talking,
            timeOfDay: TimeOfDay.afternoon,
          ),
          importance: 0.5,
        );
      }

      final recent = await bridge.getRecentInteractions(limit: 3);
      expect(recent.length, equals(3));
    });
  });

  group('PetMemoryBridge - getImportantInteractions', () {
    test('should return important interactions', () async {
      await bridge.rememberInteraction(
        content: 'Very important preference about food',
        petContext: PetContext(
          mood: PetMood.excited,
          state: PetState.talking,
          timeOfDay: TimeOfDay.morning,
        ),
        importance: 0.95,
        keywords: ['food', 'preference'],
        source: MemorySource.userExplicit,
      );

      await bridge.rememberInteraction(
        content: 'Casual observation about nothing special',
        petContext: PetContext(
          mood: PetMood.neutral,
          state: PetState.idle,
          timeOfDay: TimeOfDay.afternoon,
        ),
        importance: 0.1,
      );

      final important = await bridge.getImportantInteractions(limit: 1);
      expect(important, isNotEmpty);
      expect(important.first.content, contains('food'));
    });
  });

  group('PetMemoryBridge - inferMoodFromRecentMemories', () {
    test('should infer happy mood from positive memories', () async {
      for (int i = 0; i < 3; i++) {
        await bridge.rememberInteraction(
          content: 'Happy moment $i',
          petContext: PetContext(
            mood: PetMood.happy,
            state: PetState.playing,
            timeOfDay: TimeOfDay.afternoon,
          ),
          importance: 0.7,
        );
      }

      final inferredMood = await bridge.inferMoodFromRecentMemories();
      expect(inferredMood, equals(PetMood.happy));
    });

    test('should infer neutral mood from empty history', () async {
      final inferredMood = await bridge.inferMoodFromRecentMemories();
      expect(inferredMood, equals(PetMood.neutral));
    });
  });

  group('PetMemoryBridge - emotional gating integration', () {
    test('sad mood should reduce importance for low-arousal content', () async {
      final sadCtx = PetContext(
        mood: PetMood.sad,
        state: PetState.idle,
        timeOfDay: TimeOfDay.night,
      );

      final happyCtx = PetContext(
        mood: PetMood.happy,
        state: PetState.playing,
        timeOfDay: TimeOfDay.afternoon,
      );

      final sadId = await bridge.rememberInteraction(
        content: 'Routine observation during sad time',
        petContext: sadCtx,
        importance: 0.5,
      );

      final happyId = await bridge.rememberInteraction(
        content: 'Routine observation during happy time',
        petContext: happyCtx,
        importance: 0.5,
      );

      final sadMemory = await bridge.mnemosyne.getMemory(sadId);
      final happyMemory = await bridge.mnemosyne.getMemory(happyId);

      expect(happyMemory!.importance, greaterThanOrEqualTo(sadMemory!.importance));
    });

    test('excited mood should boost importance relative to neutral', () async {
      final excitedCtx = PetContext(
        mood: PetMood.excited,
        state: PetState.playing,
        timeOfDay: TimeOfDay.afternoon,
      );

      final neutralCtx = PetContext(
        mood: PetMood.neutral,
        state: PetState.idle,
        timeOfDay: TimeOfDay.afternoon,
      );

      final excitedId = await bridge.rememberInteraction(
        content: 'Exciting discovery during play',
        petContext: excitedCtx,
        importance: 0.5,
        keywords: ['discovery', 'exciting'],
      );

      final neutralId = await bridge.rememberInteraction(
        content: 'Routine observation while idle',
        petContext: neutralCtx,
        importance: 0.5,
        keywords: ['routine', 'observation'],
      );

      final excitedMemory = await bridge.mnemosyne.getMemory(excitedId);
      final neutralMemory = await bridge.mnemosyne.getMemory(neutralId);

      expect(excitedMemory!.emotionalValence, greaterThan(neutralMemory!.emotionalValence));
    });
  });

  group('PetMemoryBridge - end-to-end lifecycle', () {
    test('full pet memory lifecycle: remember → recall → infer mood', () async {
      final morningWalkCtx = PetContext(
        mood: PetMood.happy,
        state: PetState.exploring,
        timeOfDay: TimeOfDay.morning,
        weather: 'sunny',
        activity: 'walking',
        location: 'park',
        ambientMood: 'fresh',
      );

      final id = await bridge.rememberInteraction(
        content: 'Beautiful morning walk in the park with sunshine',
        petContext: morningWalkCtx,
        keywords: ['walk', 'park', 'morning', 'sunny'],
        embedding: _makeVec(100),
        importance: 0.8,
      );

      expect(id, isNotEmpty);

      final memory = await bridge.mnemosyne.getMemory(id);
      expect(memory, isNotNull);
      expect(memory!.metadata!['petMood'], equals('happy'));
      expect(memory.metadata!['xiang'], isNotNull);

      final recallCtx = PetContext(
        mood: PetMood.happy,
        state: PetState.idle,
        timeOfDay: TimeOfDay.morning,
        weather: 'sunny',
      );

      final results = await bridge.recallInteractions(
        query: 'morning walk park',
        currentContext: recallCtx,
        queryEmbedding: _makeVec(100),
        limit: 5,
      );

      expect(results, isNotEmpty);
      expect(results.any((r) => r.memory.id == id), isTrue);

      final inferredMood = await bridge.inferMoodFromRecentMemories();
      expect(inferredMood, equals(PetMood.happy));
    });
  });
}
