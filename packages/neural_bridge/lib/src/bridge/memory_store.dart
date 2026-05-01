import 'package:mnemosyne/mnemosyne.dart';

abstract class MemoryStore {
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
  });

  Future<List<MemorySearchResult>> recall({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    int limit = 10,
  });

  Future<List<MemorySearchResult>> recallWithScene({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    int limit = 10,
  });

  Future<List<MemoryItem>> getRecent({int limit = 20});

  Future<void> updateMemory(MemoryItem memory);

  Future<MemoryItem?> getMemory(String id);

  Future<void> decay();

  Future<void> prune();

  Future<List<ConsolidationCandidate>> findConsolidationCandidates();

  Future<ConsolidationResult> consolidate(
    ConsolidationCandidate candidate,
    String Function(List<MemoryItem>) summarizeContent,
  );

  Future<List<String>> findConflictingMemories({
    required String content,
    required String conflictTopic,
    MemoryType? type,
    int limit = 5,
  });
}

class MnemosyneMemoryStore implements MemoryStore {
  final Mnemosyne _mnemosyne;

  MnemosyneMemoryStore(this._mnemosyne);

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
  }) =>
      _mnemosyne.remember(
        content: content,
        type: type,
        source: source,
        importance: importance,
        emotionalValence: emotionalValence,
        keywords: keywords,
        entities: entities,
        topics: topics,
        embedding: embedding,
        metadata: metadata,
      );

  @override
  Future<List<MemorySearchResult>> recall({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    int limit = 10,
  }) =>
      _mnemosyne.recall(
        query: query,
        queryEmbedding: queryEmbedding,
        currentContext: currentContext,
        limit: limit,
      );

  @override
  Future<List<MemorySearchResult>> recallWithScene({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    int limit = 10,
  }) =>
      _mnemosyne.recallWithScene(
        query: query,
        queryEmbedding: queryEmbedding,
        currentContext: currentContext,
        weather: weather,
        temperature: temperature,
        activity: activity,
        location: location,
        ambientMood: ambientMood,
        limit: limit,
      );

  @override
  Future<List<MemoryItem>> getRecent({int limit = 20}) =>
      _mnemosyne.getRecent(limit: limit);

  @override
  Future<void> updateMemory(MemoryItem memory) =>
      _mnemosyne.updateMemory(memory);

  @override
  Future<MemoryItem?> getMemory(String id) =>
      _mnemosyne.getMemory(id);

  @override
  Future<void> decay() => _mnemosyne.decay();

  @override
  Future<void> prune() => _mnemosyne.prune();

  @override
  Future<List<ConsolidationCandidate>> findConsolidationCandidates() =>
      _mnemosyne.findConsolidationCandidates();

  @override
  Future<ConsolidationResult> consolidate(
    ConsolidationCandidate candidate,
    String Function(List<MemoryItem>) summarizeContent,
  ) =>
      _mnemosyne.consolidate(candidate, summarizeContent);

  @override
  Future<List<String>> findConflictingMemories({
    required String content,
    required String conflictTopic,
    MemoryType? type,
    int limit = 5,
  }) async {
    final results = await _mnemosyne.recall(
      query: conflictTopic,
      limit: limit,
    );
    return results
        .where((r) {
          if (type != null && r.memory.type != type) return false;
          if (r.memory.status != MemoryStatus.active) return false;
          return r.memory.id != content;
        })
        .map((r) => r.memory.id)
        .toList();
  }
}
