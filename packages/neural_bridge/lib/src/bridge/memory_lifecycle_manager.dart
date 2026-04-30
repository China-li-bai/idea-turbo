import 'package:mnemosyne/mnemosyne.dart';
import 'embedding_source.dart';
import 'memory_store.dart';
import '../conversation/conversation_message.dart';

enum MemoryTier {
  working,
  episodic,
  semantic,
}

class MemoryLifecycleConfig {
  final int workingMemoryCapacity;
  final Duration workingMemoryTTL;
  final double episodicToSemanticThreshold;
  final int episodicMinAccessCount;
  final double episodicMinImportance;
  final Duration consolidationInterval;
  final int maxConsolidationBatch;

  const MemoryLifecycleConfig({
    this.workingMemoryCapacity = 20,
    this.workingMemoryTTL = const Duration(minutes: 30),
    this.episodicToSemanticThreshold = 0.7,
    this.episodicMinAccessCount = 3,
    this.episodicMinImportance = 0.5,
    this.consolidationInterval = const Duration(hours: 6),
    this.maxConsolidationBatch = 10,
  });
}

class MemoryLifecycleManager {
  final EmbeddingSource? embeddingSource;
  final ConversationSource? conversationSource;
  final MemoryStore memoryStore;
  final MemoryLifecycleConfig config;

  DateTime? _lastConsolidation;

  MemoryLifecycleManager({
    this.embeddingSource,
    this.conversationSource,
    required this.memoryStore,
    this.config = const MemoryLifecycleConfig(),
  });

  Future<void> archiveWorkingMemory(String sessionId) async {
    if (conversationSource == null) return;

    final messages = await conversationSource!.getHistory(sessionId);
    if (messages.isEmpty) return;

    final userMessages = messages.where((m) => m.role == MessageRole.user).toList();

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
        importance: _estimateImportance(msg.content),
        emotionalValence: _estimateEmotionalValence(msg.content),
        embedding: embedding,
        metadata: {
          'sessionId': sessionId,
          'tier': 'episodic',
          'archivedFrom': 'working_memory',
          'archivedAt': DateTime.now().toIso8601String(),
        },
      );
    }

    await conversationSource!.archiveSession(sessionId);
  }

  Future<List<String>> promoteEpisodicToSemantic() async {
    final recent = await memoryStore.getRecent(limit: 100);
    final candidates = recent.where((m) =>
        m.type == MemoryType.episodic &&
        m.status == MemoryStatus.active &&
        !m.isConsolidated &&
        m.importance >= config.episodicMinImportance &&
        m.accessCount >= config.episodicMinAccessCount &&
        m.embedding != null &&
        m.embedding!.isNotEmpty
    ).toList();

    final promoted = <String>[];

    for (final memory in candidates.take(config.maxConsolidationBatch)) {
      try {
        await memoryStore.updateMemory(memory.copyWith(
          type: MemoryType.semantic,
          isConsolidated: true,
          metadata: {
            ...?memory.metadata,
            'promotedAt': DateTime.now().toIso8601String(),
            'promotedFrom': 'episodic',
            'promotionReason': 'importance=${memory.importance.toStringAsFixed(2)}, '
                'accessCount=${memory.accessCount}',
          },
        ));
        promoted.add(memory.id);
      } catch (_) {}
    }

    return promoted;
  }

  Future<Map<String, dynamic>> runFullCycle() async {
    final now = DateTime.now();
    final stats = <String, dynamic>{
      'promoted': 0,
      'consolidated': 0,
      'pruned': 0,
    };

    await memoryStore.decay();

    final promoted = await promoteEpisodicToSemantic();
    stats['promoted'] = promoted.length;

    if (_shouldConsolidate(now)) {
      final candidates = await memoryStore.findConsolidationCandidates();
      int consolidated = 0;
      for (final candidate in candidates.take(config.maxConsolidationBatch)) {
        try {
          await memoryStore.consolidate(
            candidate,
            (memories) => _summarizeMemories(memories),
          );
          consolidated++;
        } catch (_) {}
      }
      stats['consolidated'] = consolidated;
      _lastConsolidation = now;
    }

    final beforePrune = await memoryStore.getRecent(limit: 1000);
    await memoryStore.prune();
    final afterPrune = await memoryStore.getRecent(limit: 1000);
    stats['pruned'] = beforePrune.length - afterPrune.length;

    return stats;
  }

  Future<List<MemorySearchResult>> recall({
    required String query,
    MemoryTier? tier,
    int limit = 10,
  }) async {
    List<double>? queryEmbedding;
    if (embeddingSource != null) {
      final result = await embeddingSource!.embed(query);
      if (result != null) queryEmbedding = result.vector;
    }

    final results = await memoryStore.recall(
      query: query,
      queryEmbedding: queryEmbedding,
      limit: tier != null ? limit * 3 : limit,
    );

    if (tier == null) return results;

    return results.where((r) {
      switch (tier) {
        case MemoryTier.working:
          return false;
        case MemoryTier.episodic:
          return r.memory.type == MemoryType.episodic;
        case MemoryTier.semantic:
          return r.memory.type == MemoryType.semantic;
      }
    }).take(limit).toList();
  }

  bool _shouldConsolidate(DateTime now) {
    if (_lastConsolidation == null) return true;
    return now.difference(_lastConsolidation!) >= config.consolidationInterval;
  }

  double _estimateImportance(String content) {
    double score = 0.5;
    final emotionalPatterns = [
      RegExp(r'[!！]{2,}'),
      RegExp(r'[?？]{2,}'),
      RegExp(r'(讨厌|恨|爱|喜欢|开心|难过|生气|焦虑|害怕|担心)'),
      RegExp(r'(hate|love|angry|sad|happy|afraid|worried|anxious)'),
    ];
    for (final pattern in emotionalPatterns) {
      if (pattern.hasMatch(content)) score += 0.1;
    }
    if (content.length > 200) score += 0.1;
    return score.clamp(0.0, 1.0);
  }

  double _estimateEmotionalValence(String content) {
    final positive = RegExp(r'(开心|高兴|喜欢|爱|棒|好|谢谢|感谢|happy|love|great|good|thanks)');
    final negative = RegExp(r'(讨厌|恨|难过|伤心|生气|烦|焦虑|怕|hate|sad|angry|afraid|annoyed)');

    if (positive.hasMatch(content)) return 0.5;
    if (negative.hasMatch(content)) return -0.5;
    return 0.0;
  }

  String _summarizeMemories(List<MemoryItem> memories) {
    if (memories.isEmpty) return '';
    if (memories.length == 1) return memories.first.content;

    final buffer = StringBuffer();
    for (int i = 0; i < memories.length && i < 5; i++) {
      buffer.writeln('- ${memories[i].content}');
    }
    if (memories.length > 5) {
      buffer.writeln('... and ${memories.length - 5} more');
    }
    return buffer.toString();
  }
}
