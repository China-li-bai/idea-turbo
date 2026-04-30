import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/mnemosyne.dart';
import 'package:neural_bridge/neural_bridge.dart';

class MockMemoryStore implements MemoryStore {
  final List<MemoryItem> _memories = [];
  int _nextId = 0;
  bool decayCalled = false;
  bool pruneCalled = false;

  @override
  Future<String> remember({
    required String content,
    MemoryType type = MemoryType.episodic,
    MemorySource source = MemorySource.conversation,
    double importance = 0.5,
    double emotionalValence = 0.0,
    List<String>? keywords,
    List<String>? entities,
    List<String>? topics,
    List<double>? embedding,
    Map<String, dynamic>? metadata,
  }) async {
    final id = 'mem-${_nextId++}';
    final now = DateTime.now();
    _memories.add(MemoryItem(
      id: id,
      content: content,
      type: type,
      source: source,
      importance: importance,
      emotionalValence: emotionalValence,
      keywords: keywords ?? [],
      entities: entities ?? [],
      topics: topics ?? [],
      embedding: embedding,
      metadata: metadata,
      createdAt: now,
      accessedAt: now,
    ));
    return id;
  }

  @override
  Future<List<MemorySearchResult>> recall({
    required String query,
    List<double>? queryEmbedding,
    int limit = 10,
  }) async {
    final results = _memories
        .where((m) => m.status == MemoryStatus.active)
        .take(limit)
        .map((m) => MemorySearchResult(
              memory: m,
              totalScore: 1.0,
              semanticScore: 0.5,
              keywordScore: 0.5,
              recencyScore: 1.0,
              importanceScore: m.importance,
              contextMatchScore: 0.0,
            ))
        .toList();
    return results;
  }

  @override
  Future<List<MemoryItem>> getRecent({int limit = 20}) async {
    return _memories.reversed.take(limit).toList();
  }

  @override
  Future<void> updateMemory(MemoryItem memory) async {
    final idx = _memories.indexWhere((m) => m.id == memory.id);
    if (idx >= 0) _memories[idx] = memory;
  }

  @override
  Future<MemoryItem?> getMemory(String id) async {
    try {
      return _memories.firstWhere((m) => m.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> decay() async {
    decayCalled = true;
  }

  @override
  Future<void> prune() async {
    pruneCalled = true;
    _memories.removeWhere((m) =>
        !m.isPinned && m.strength < 0.1 && m.status != MemoryStatus.active);
  }

  @override
  Future<List<ConsolidationCandidate>> findConsolidationCandidates() async => [];

  @override
  Future<ConsolidationResult> consolidate(
    ConsolidationCandidate candidate,
    String Function(List<MemoryItem>) summarizeContent,
  ) async {
    return ConsolidationResult(
      consolidatedMemoryId: 'consolidated-1',
      contentSummary: summarizeContent(candidate.memories),
      sourceMemoryIds: candidate.memories.map((m) => m.id).toList(),
      sharedEntities: [],
      sharedTopics: [],
      combinedImportance: 0.8,
      memoryType: 'semantic',
      centroidEmbedding: [],
      consolidationTimestamp: DateTime.now(),
    );
  }
}

class MockEmbeddingSource implements EmbeddingSource {
  final List<double> Function(String)? _embedFn;
  int callCount = 0;
  final List<String> calls = [];

  MockEmbeddingSource([this._embedFn]);

  @override
  Future<EmbeddingResult?> embed(String text) async {
    callCount++;
    calls.add(text);
    if (_embedFn != null) {
      final vector = _embedFn(text);
      return EmbeddingResult(
        vector: vector,
        providerName: 'mock',
        providerType: EmbeddingProviderType.mock,
        dimensions: vector.length,
      );
    }
    return null;
  }

  @override
  int get outputDimensions => 256;
}

class MockConversationSource implements ConversationSource {
  final Map<String, List<ConversationMessage>> _history = {};
  final Set<String> _archived = {};

  void addMessage(String sessionId, ConversationMessage msg) {
    _history.putIfAbsent(sessionId, () => []);
    _history[sessionId]!.add(msg);
  }

  @override
  Future<List<ConversationMessage>> getHistory(String sessionId) async {
    return _history[sessionId] ?? [];
  }

  @override
  Future<void> archiveSession(String sessionId) async {
    _archived.add(sessionId);
  }

  bool isArchived(String sessionId) => _archived.contains(sessionId);
}

List<double> _unitVector(int dim, int seed) {
  final rng = Random(seed);
  final v = List.generate(dim, (_) => rng.nextDouble() * 2 - 1);
  final norm = sqrt(v.fold(0.0, (s, x) => s + x * x));
  return v.map((x) => x / norm).toList();
}

void main() {
  group('NeuralMnemosyneBridge', () {
    group('rememberWithEmbedding', () {
      test('should auto-generate embedding and store memory', () async {
        final store = MockMemoryStore();
        final embedding = MockEmbeddingSource(
          (text) => _unitVector(256, text.hashCode),
        );
        final bridge = NeuralMnemosyneBridge(
          embeddingSource: embedding,
          memoryStore: store,
        );

        final id = await bridge.rememberWithEmbedding(
          content: 'I love cats',
          importance: 0.8,
        );

        expect(id, isNotNull);
        expect(embedding.callCount, equals(1));
        expect(embedding.calls, contains('I love cats'));

        final memories = await store.getRecent();
        expect(memories.length, equals(1));
        expect(memories[0].embedding, isNotNull);
        expect(memories[0].embedding!.length, equals(256));
      });

      test('should store memory without embedding when source is null', () async {
        final store = MockMemoryStore();
        final bridge = NeuralMnemosyneBridge(memoryStore: store);

        final id = await bridge.rememberWithEmbedding(
          content: 'No embedding available',
        );

        expect(id, isNotNull);
        final memories = await store.getRecent();
        expect(memories.length, equals(1));
        expect(memories[0].embedding, isNull);
      });

      test('should store memory without embedding when source fails', () async {
        final store = MockMemoryStore();
        final embedding = MockEmbeddingSource();
        final bridge = NeuralMnemosyneBridge(
          embeddingSource: embedding,
          memoryStore: store,
        );

        final id = await bridge.rememberWithEmbedding(
          content: 'Embedding will fail',
        );

        expect(id, isNotNull);
        final memories = await store.getRecent();
        expect(memories[0].embedding, isNull);
      });
    });

    group('recallWithEmbedding', () {
      test('should auto-generate query embedding and search', () async {
        final store = MockMemoryStore();
        await store.remember(content: 'test memory');
        final embedding = MockEmbeddingSource(
          (text) => _unitVector(256, text.hashCode),
        );
        final bridge = NeuralMnemosyneBridge(
          embeddingSource: embedding,
          memoryStore: store,
        );

        final results = await bridge.recallWithEmbedding(
          query: 'test query',
        );

        expect(embedding.callCount, equals(1));
        expect(results, isNotEmpty);
      });

      test('should fallback to keyword search without embedding', () async {
        final store = MockMemoryStore();
        await store.remember(content: 'test memory');
        final bridge = NeuralMnemosyneBridge(memoryStore: store);

        final results = await bridge.recallWithEmbedding(
          query: 'test query',
        );

        expect(results, isNotEmpty);
      });
    });

    group('archiveConversationMessages', () {
      test('should archive user messages as episodic memories', () async {
        final store = MockMemoryStore();
        final embedding = MockEmbeddingSource(
          (text) => _unitVector(256, text.hashCode),
        );
        final bridge = NeuralMnemosyneBridge(
          embeddingSource: embedding,
          memoryStore: store,
        );

        final messages = [
          ConversationMessage(
            id: '1', sessionId: 's1', role: MessageRole.system,
            content: 'You are a cat', timestamp: DateTime.now(),
          ),
          ConversationMessage(
            id: '2', sessionId: 's1', role: MessageRole.user,
            content: 'Hello kitty!', timestamp: DateTime.now(),
          ),
          ConversationMessage(
            id: '3', sessionId: 's1', role: MessageRole.assistant,
            content: 'Meow!', timestamp: DateTime.now(),
          ),
        ];

        await bridge.archiveConversationMessages('s1', messages);

        final memories = await store.getRecent();
        expect(memories.length, equals(2));

        final userMem = memories.firstWhere(
          (m) => m.metadata?['role'] == 'user',
        );
        expect(userMem.type, equals(MemoryType.episodic));
        expect(userMem.embedding, isNotNull);

        final asstMem = memories.firstWhere(
          (m) => m.metadata?['role'] == 'assistant',
        );
        expect(asstMem.type, equals(MemoryType.episodic));
        expect(asstMem.embedding, isNull);
      });

      test('should skip system messages', () async {
        final store = MockMemoryStore();
        final bridge = NeuralMnemosyneBridge(memoryStore: store);

        final messages = [
          ConversationMessage(
            id: '1', sessionId: 's1', role: MessageRole.system,
            content: 'System prompt', timestamp: DateTime.now(),
          ),
        ];

        await bridge.archiveConversationMessages('s1', messages);
        final memories = await store.getRecent();
        expect(memories.length, equals(0));
      });

      test('should handle empty messages', () async {
        final store = MockMemoryStore();
        final bridge = NeuralMnemosyneBridge(memoryStore: store);

        await bridge.archiveConversationMessages('s1', []);
        final memories = await store.getRecent();
        expect(memories.length, equals(0));
      });
    });
  });

  group('MemoryLifecycleManager', () {
    group('archiveWorkingMemory', () {
      test('should convert working memory to episodic and archive session', () async {
        final store = MockMemoryStore();
        final conv = MockConversationSource();
        final embedding = MockEmbeddingSource(
          (text) => _unitVector(256, text.hashCode),
        );

        conv.addMessage('s1', ConversationMessage(
          id: '1', sessionId: 's1', role: MessageRole.user,
          content: 'I had a great day!', timestamp: DateTime.now(),
        ));

        final manager = MemoryLifecycleManager(
          embeddingSource: embedding,
          conversationSource: conv,
          memoryStore: store,
        );

        await manager.archiveWorkingMemory('s1');

        final memories = await store.getRecent();
        expect(memories.length, equals(1));
        expect(memories[0].type, equals(MemoryType.episodic));
        expect(memories[0].metadata?['archivedFrom'], equals('working_memory'));
        expect(conv.isArchived('s1'), isTrue);
      });

      test('should do nothing when no conversation source', () async {
        final store = MockMemoryStore();
        final manager = MemoryLifecycleManager(memoryStore: store);

        await manager.archiveWorkingMemory('s1');

        final memories = await store.getRecent();
        expect(memories.length, equals(0));
      });

      test('should do nothing when no messages', () async {
        final store = MockMemoryStore();
        final conv = MockConversationSource();
        final manager = MemoryLifecycleManager(
          conversationSource: conv,
          memoryStore: store,
        );

        await manager.archiveWorkingMemory('s1');

        final memories = await store.getRecent();
        expect(memories.length, equals(0));
      });
    });

    group('promoteEpisodicToSemantic', () {
      test('should promote episodic memories meeting criteria', () async {
        final store = MockMemoryStore();

        await store.remember(
          content: 'Frequent memory',
          type: MemoryType.episodic,
          importance: 0.7,
          embedding: _unitVector(256, 1),
        );

        final memories = await store.getRecent();
        await store.updateMemory(memories[0].copyWith(
          accessCount: 5,
        ));

        final manager = MemoryLifecycleManager(memoryStore: store);
        final promoted = await manager.promoteEpisodicToSemantic();

        expect(promoted.length, equals(1));
        final updated = await store.getMemory(promoted[0]);
        expect(updated!.type, equals(MemoryType.semantic));
        expect(updated.isConsolidated, isTrue);
        expect(updated.metadata?['promotedFrom'], equals('episodic'));
      });

      test('should not promote memories below importance threshold', () async {
        final store = MockMemoryStore();

        await store.remember(
          content: 'Unimportant memory',
          type: MemoryType.episodic,
          importance: 0.2,
          embedding: _unitVector(256, 1),
        );

        final memories = await store.getRecent();
        await store.updateMemory(memories[0].copyWith(accessCount: 5));

        final manager = MemoryLifecycleManager(memoryStore: store);
        final promoted = await manager.promoteEpisodicToSemantic();

        expect(promoted.length, equals(0));
      });

      test('should not promote memories below access count threshold', () async {
        final store = MockMemoryStore();

        await store.remember(
          content: 'Rare memory',
          type: MemoryType.episodic,
          importance: 0.8,
          embedding: _unitVector(256, 1),
        );

        final manager = MemoryLifecycleManager(memoryStore: store);
        final promoted = await manager.promoteEpisodicToSemantic();

        expect(promoted.length, equals(0));
      });

      test('should not promote memories without embedding', () async {
        final store = MockMemoryStore();

        await store.remember(
          content: 'No vector memory',
          type: MemoryType.episodic,
          importance: 0.8,
        );

        final memories = await store.getRecent();
        await store.updateMemory(memories[0].copyWith(accessCount: 5));

        final manager = MemoryLifecycleManager(memoryStore: store);
        final promoted = await manager.promoteEpisodicToSemantic();

        expect(promoted.length, equals(0));
      });

      test('should not promote already consolidated memories', () async {
        final store = MockMemoryStore();

        await store.remember(
          content: 'Already consolidated',
          type: MemoryType.episodic,
          importance: 0.8,
          embedding: _unitVector(256, 1),
        );

        final memories = await store.getRecent();
        await store.updateMemory(memories[0].copyWith(
          accessCount: 5,
          isConsolidated: true,
        ));

        final manager = MemoryLifecycleManager(memoryStore: store);
        final promoted = await manager.promoteEpisodicToSemantic();

        expect(promoted.length, equals(0));
      });
    });

    group('importance estimation', () {
      test('should boost importance for emotional content', () async {
        final store = MockMemoryStore();
        final conv = MockConversationSource();

        conv.addMessage('s1', ConversationMessage(
          id: '1', sessionId: 's1', role: MessageRole.user,
          content: 'I hate this so much!!!', timestamp: DateTime.now(),
        ));

        final manager = MemoryLifecycleManager(
          conversationSource: conv,
          memoryStore: store,
        );

        await manager.archiveWorkingMemory('s1');

        final memories = await store.getRecent();
        expect(memories.length, equals(1));
        expect(memories[0].importance, greaterThan(0.5));
      });

      test('should boost importance for long content', () async {
        final store = MockMemoryStore();
        final conv = MockConversationSource();

        conv.addMessage('s1', ConversationMessage(
          id: '1', sessionId: 's1', role: MessageRole.user,
          content: 'A' * 300, timestamp: DateTime.now(),
        ));

        final manager = MemoryLifecycleManager(
          conversationSource: conv,
          memoryStore: store,
        );

        await manager.archiveWorkingMemory('s1');

        final memories = await store.getRecent();
        expect(memories[0].importance, greaterThan(0.5));
      });

      test('should assign positive valence for happy content', () async {
        final store = MockMemoryStore();
        final conv = MockConversationSource();

        conv.addMessage('s1', ConversationMessage(
          id: '1', sessionId: 's1', role: MessageRole.user,
          content: 'I am so happy today!', timestamp: DateTime.now(),
        ));

        final manager = MemoryLifecycleManager(
          conversationSource: conv,
          memoryStore: store,
        );

        await manager.archiveWorkingMemory('s1');

        final memories = await store.getRecent();
        expect(memories[0].emotionalValence, greaterThan(0));
      });

      test('should assign negative valence for sad content', () async {
        final store = MockMemoryStore();
        final conv = MockConversationSource();

        conv.addMessage('s1', ConversationMessage(
          id: '1', sessionId: 's1', role: MessageRole.user,
          content: 'I feel so sad and anxious', timestamp: DateTime.now(),
        ));

        final manager = MemoryLifecycleManager(
          conversationSource: conv,
          memoryStore: store,
        );

        await manager.archiveWorkingMemory('s1');

        final memories = await store.getRecent();
        expect(memories[0].emotionalValence, lessThan(0));
      });
    });

    group('runFullCycle', () {
      test('should run decay + promote + prune', () async {
        final store = MockMemoryStore();
        final manager = MemoryLifecycleManager(memoryStore: store);

        final stats = await manager.runFullCycle();

        expect(store.decayCalled, isTrue);
        expect(store.pruneCalled, isTrue);
        expect(stats, containsPair('promoted', 0));
        expect(stats, containsPair('consolidated', 0));
      });
    });

    group('recall with tier filtering', () {
      test('should filter results by episodic tier', () async {
        final store = MockMemoryStore();
        final embedding = MockEmbeddingSource(
          (text) => _unitVector(256, text.hashCode),
        );

        await store.remember(
          content: 'episodic memory',
          type: MemoryType.episodic,
          embedding: _unitVector(256, 1),
        );
        await store.remember(
          content: 'semantic memory',
          type: MemoryType.semantic,
          embedding: _unitVector(256, 2),
        );

        final manager = MemoryLifecycleManager(
          embeddingSource: embedding,
          memoryStore: store,
        );

        final results = await manager.recall(
          query: 'memory',
          tier: MemoryTier.episodic,
        );

        for (final r in results) {
          expect(r.memory.type, equals(MemoryType.episodic));
        }
      });

      test('should filter results by semantic tier', () async {
        final store = MockMemoryStore();
        final embedding = MockEmbeddingSource(
          (text) => _unitVector(256, text.hashCode),
        );

        await store.remember(
          content: 'episodic memory',
          type: MemoryType.episodic,
          embedding: _unitVector(256, 1),
        );
        await store.remember(
          content: 'semantic memory',
          type: MemoryType.semantic,
          embedding: _unitVector(256, 2),
        );

        final manager = MemoryLifecycleManager(
          embeddingSource: embedding,
          memoryStore: store,
        );

        final results = await manager.recall(
          query: 'memory',
          tier: MemoryTier.semantic,
        );

        for (final r in results) {
          expect(r.memory.type, equals(MemoryType.semantic));
        }
      });

      test('working tier should always return empty', () async {
        final store = MockMemoryStore();
        final embedding = MockEmbeddingSource(
          (text) => _unitVector(256, text.hashCode),
        );

        final manager = MemoryLifecycleManager(
          embeddingSource: embedding,
          memoryStore: store,
        );

        final results = await manager.recall(
          query: 'anything',
          tier: MemoryTier.working,
        );

        expect(results, isEmpty);
      });
    });
  });
}
