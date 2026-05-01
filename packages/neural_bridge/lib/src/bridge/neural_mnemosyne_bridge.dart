import 'package:mnemosyne/mnemosyne.dart';
import 'embedding_source.dart';
import 'memory_store.dart';
import '../conversation/conversation_message.dart';

class ConflictResolutionResult {
  final String newMemoryId;
  final List<String> supersededMemoryIds;
  final List<String> conflictTopics;

  const ConflictResolutionResult({
    required this.newMemoryId,
    this.supersededMemoryIds = const [],
    this.conflictTopics = const [],
  });

  bool get hasConflicts => supersededMemoryIds.isNotEmpty;
}

class NeuralMnemosyneBridge {
  final EmbeddingSource? embeddingSource;
  final MemoryStore memoryStore;
  final bool enableConflictDetection;

  NeuralMnemosyneBridge({
    this.embeddingSource,
    required this.memoryStore,
    this.enableConflictDetection = true,
  });

  factory NeuralMnemosyneBridge.fromInstances({
    required EmbeddingSource? embeddingSource,
    required MemoryStore memoryStore,
    bool enableConflictDetection = true,
  }) {
    return NeuralMnemosyneBridge(
      embeddingSource: embeddingSource,
      memoryStore: memoryStore,
      enableConflictDetection: enableConflictDetection,
    );
  }

  Future<void> archiveConversationMessages(
    String sessionId,
    List<ConversationMessage> messages,
  ) async {
    final nonSystem = messages.where((m) => m.role != MessageRole.system).toList();
    if (nonSystem.isEmpty) return;

    final userMessages = nonSystem.where((m) => m.role == MessageRole.user).toList();

    for (final msg in userMessages) {
      List<double>? embedding;
      if (embeddingSource != null) {
        final result = await embeddingSource!.embed(msg.content);
        if (result != null) embedding = result.vector;
      }

      await memoryStore.remember(
        content: msg.content,
        type: MemoryType.episodic,
        source: MemorySource.conversation,
        embedding: embedding,
        metadata: {
          'sessionId': sessionId,
          'role': 'user',
          'archivedAt': DateTime.now().toIso8601String(),
        },
      );
    }

    for (final asstMsg in nonSystem.where((m) => m.role == MessageRole.assistant).toList()) {
      await memoryStore.remember(
        content: asstMsg.content,
        type: MemoryType.episodic,
        source: MemorySource.conversation,
        metadata: {
          'sessionId': sessionId,
          'role': 'assistant',
          'archivedAt': DateTime.now().toIso8601String(),
        },
      );
    }
  }

  Future<List<MemorySearchResult>> recallWithEmbedding({
    required String query,
    int limit = 10,
  }) async {
    List<double>? queryEmbedding;
    if (embeddingSource != null) {
      final result = await embeddingSource!.embed(query);
      if (result != null) queryEmbedding = result.vector;
    }

    return await memoryStore.recall(
      query: query,
      queryEmbedding: queryEmbedding,
      limit: limit,
    );
  }

  Future<ConflictResolutionResult> rememberWithEmbedding({
    required String content,
    MemoryType type = MemoryType.episodic,
    MemorySource source = MemorySource.conversation,
    double importance = 0.5,
    double emotionalValence = 0.0,
    Map<String, dynamic>? metadata,
  }) async {
    List<double>? embedding;
    if (embeddingSource != null) {
      final result = await embeddingSource!.embed(content);
      if (result != null) embedding = result.vector;
    }

    final newMemoryId = await memoryStore.remember(
      content: content,
      type: type,
      source: source,
      importance: importance,
      emotionalValence: emotionalValence,
      embedding: embedding,
      metadata: metadata,
    );

    final supersededIds = <String>[];
    final conflictTopics = <String>[];

    if (enableConflictDetection && type == MemoryType.semantic) {
      final resolved = await _detectAndResolveConflicts(
        content: content,
        newMemoryId: newMemoryId,
        embedding: embedding,
      );
      supersededIds.addAll(resolved.supersededMemoryIds);
      conflictTopics.addAll(resolved.conflictTopics);
    }

    return ConflictResolutionResult(
      newMemoryId: newMemoryId,
      supersededMemoryIds: supersededIds,
      conflictTopics: conflictTopics,
    );
  }

  Future<ConflictResolutionResult> _detectAndResolveConflicts({
    required String content,
    required String newMemoryId,
    List<double>? embedding,
  }) async {
    final conflictTopics = _extractConflictTopics(content);
    if (conflictTopics.isEmpty) {
      return ConflictResolutionResult(newMemoryId: newMemoryId);
    }

    final supersededIds = <String>[];

    for (final topic in conflictTopics) {
      final existing = await memoryStore.recall(
        query: topic,
        queryEmbedding: embedding,
        limit: 5,
      );

      for (final result in existing) {
        final mem = result.memory;
        if (mem.id == newMemoryId) continue;
        if (mem.status != MemoryStatus.active) continue;
        if (mem.type != MemoryType.semantic) continue;

        final memTopics = _extractConflictTopics(mem.content);
        if (memTopics.any((t) => conflictTopics.contains(t))) {
          try {
            await memoryStore.updateMemory(mem.copyWith(
              status: MemoryStatus.superseded,
              metadata: {
                ...?mem.metadata,
                'supersededBy': newMemoryId,
                'supersededAt': DateTime.now().toIso8601String(),
                'conflictTopic': topic,
              },
            ));
            supersededIds.add(mem.id);
          } catch (_) {}
        }
      }
    }

    return ConflictResolutionResult(
      newMemoryId: newMemoryId,
      supersededMemoryIds: supersededIds,
      conflictTopics: conflictTopics,
    );
  }

  static final _conflictPatterns = <RegExp, String>{
    RegExp(r'(sushi|fish|seafood|海鲜|寿司|鱼)'): 'food_preference',
    RegExp(r'(python|rust|java|golang|javascript)'): 'programming_language',
    RegExp(r'(new york|san francisco|tokyo|beijing|纽约|旧金山|东京|北京)'): 'location',
    RegExp(r'(allergic|过敏|intolerant)'): 'health_condition',
    RegExp(r'(hate|love|like|dislike|讨厌|喜欢|爱|恨)'): 'preference',
  };

  List<String> _extractConflictTopics(String content) {
    final lower = content.toLowerCase();
    final topics = <String>{};
    for (final entry in _conflictPatterns.entries) {
      if (entry.key.hasMatch(lower)) {
        topics.add(entry.value);
      }
    }
    return topics.toList();
  }
}
