import 'package:mnemosyne/mnemosyne.dart';
import 'embedding_source.dart';
import 'memory_store.dart';
import '../conversation/conversation_message.dart';

class NeuralMnemosyneBridge {
  final EmbeddingSource? embeddingSource;
  final MemoryStore memoryStore;

  NeuralMnemosyneBridge({
    this.embeddingSource,
    required this.memoryStore,
  });

  factory NeuralMnemosyneBridge.fromInstances({
    required EmbeddingSource? embeddingSource,
    required MemoryStore memoryStore,
  }) {
    return NeuralMnemosyneBridge(
      embeddingSource: embeddingSource,
      memoryStore: memoryStore,
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

  Future<String> rememberWithEmbedding({
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

    return await memoryStore.remember(
      content: content,
      type: type,
      source: source,
      importance: importance,
      emotionalValence: emotionalValence,
      embedding: embedding,
      metadata: metadata,
    );
  }
}
