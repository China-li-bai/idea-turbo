import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/extraction/extracted_insight.dart';
import 'package:mnemosyne/features/memory/extraction/memory_extraction_service.dart';
import 'package:mnemosyne/features/memory/extraction/raw_message.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/pet_memory_bridge.dart';
import 'package:mnemosyne/features/pet/pet_orchestrator.dart';
import 'package:mnemosyne/mnemosyne.dart';

void main() {
  group('PetOrchestrator xiang extraction flow', () {
    late Directory tempDir;
    late Mnemosyne mnemosyne;
    late PetOrchestrator orchestrator;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('mnemosyne_pet_xiang_');
      mnemosyne = Mnemosyne(
        xiangPlugin: XiangPlugin(),
        directoryOverride: tempDir.path,
      );
      await mnemosyne.initialize();

      final bridge = PetMemoryBridge(mnemosyne: mnemosyne);
      orchestrator = PetOrchestrator(
        petId: 'pet-1',
        userId: 'user-1',
        mnemosyne: mnemosyne,
        memoryBridge: bridge,
        extractionService: _FakeXiangExtractionService(),
      );
    });

    tearDown(() async {
      await mnemosyne.close();
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('stores extracted xiang dimensions in memory metadata', () async {
      final memoryId = await orchestrator.ingestConversation(
        '今晚下雨，我不想回任何人的消息，但我想跟你说。',
        petContext: PetContext.capture(
          mood: PetMood.lonely,
          weather: 'rainy',
          activity: 'chatting',
          now: DateTime(2026, 5, 28, 23),
        ),
      );

      final memory = await mnemosyne.getMemory(memoryId);
      final xiang = XiangContext.fromMemoryMetadata(memory!.metadata);

      expect(memory.content, contains('用户事件: 用户雨夜表达不想回消息'));
      expect(memory.content, isNot(contains('我回应')));
      expect(xiang, isNotNull);
      expect(xiang!.innerState, equals('lonely'));
      expect(xiang.relationshipState, equals('trusting_owner'));
      expect(xiang.eventShape, equals('emotional_confession'));
      expect(xiang.changeSignal, equals('becoming_closer'));
      expect(xiang.recallCues.map((cue) => cue.value), contains('不想回消息'));
    });

    test('can skip unextracted low-value interactions', () async {
      final bridge = PetMemoryBridge(mnemosyne: mnemosyne);
      final quietOrchestrator = PetOrchestrator(
        petId: 'pet-1',
        userId: 'user-1',
        config: const PetOrchestratorConfig(
          storeUnextractedInteractions: false,
        ),
        mnemosyne: mnemosyne,
        memoryBridge: bridge,
        extractionService: _NullExtractionService(),
      );

      final memoryId = await quietOrchestrator.ingestConversation(
        '嗯嗯，今天还行',
        petContext: PetContext.capture(),
      );

      expect(memoryId, isEmpty);
    });
  });
}

class _FakeXiangExtractionService implements MemoryExtractionService {
  @override
  Future<RawMessage> ingest(
    String content, {
    String? speakerId,
    String? petId,
    String source = 'conversation',
    Map<String, dynamic>? metadata,
  }) async {
    return RawMessage(
      id: 'raw-test',
      content: content,
      source: source,
      speakerId: speakerId,
      petId: petId,
      timestamp: DateTime(2026, 5, 28, 23),
      metadata: metadata ?? {},
    );
  }

  @override
  Future<ExtractedInsight?> extractInsight(RawMessage message) async {
    return ExtractedInsight(
      id: 'insight-test',
      rawMessageId: message.id,
      event: '用户雨夜表达不想回消息',
      mood: 'lonely',
      keywords: const ['雨夜', '不想回消息'],
      emotionalValence: -0.4,
      importance: 0.8,
      extra: const {
        'xiang': {
          'innerState': 'lonely',
          'relationshipState': 'trusting_owner',
          'eventShape': 'emotional_confession',
          'changeSignal': 'becoming_closer',
          'recallCues': ['雨夜', '不想回消息'],
        },
      },
      extractedAt: DateTime(2026, 5, 28, 23),
    );
  }

  @override
  Future<List<ExtractedInsight>> processBatch(List<RawMessage> messages) async {
    final insight = await extractInsight(messages.first);
    return insight == null ? [] : [insight];
  }

  @override
  List<RawMessage> getPendingMessages({int? limit}) => [];

  @override
  Future<void> markProcessed(String rawMessageId) async {}
}

class _NullExtractionService implements MemoryExtractionService {
  @override
  Future<RawMessage> ingest(
    String content, {
    String? speakerId,
    String? petId,
    String source = 'conversation',
    Map<String, dynamic>? metadata,
  }) async {
    return RawMessage(
      id: 'raw-null-test',
      content: content,
      source: source,
      speakerId: speakerId,
      petId: petId,
      timestamp: DateTime(2026, 5, 28, 23),
      metadata: metadata ?? {},
    );
  }

  @override
  Future<ExtractedInsight?> extractInsight(RawMessage message) async => null;

  @override
  Future<List<ExtractedInsight>> processBatch(
    List<RawMessage> messages,
  ) async => [];

  @override
  List<RawMessage> getPendingMessages({int? limit}) => [];

  @override
  Future<void> markProcessed(String rawMessageId) async {}
}
