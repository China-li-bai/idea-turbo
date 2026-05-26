import 'package:mnemosyne/mnemosyne.dart';

class MemoryContext {
  final List<MemorySearchResult> relevantMemories;
  final List<ProactiveMemory> proactiveMemories;
  final PetMood inferredMood;

  const MemoryContext({
    this.relevantMemories = const [],
    this.proactiveMemories = const [],
    this.inferredMood = PetMood.neutral,
  });

  String get memoryInjectionText {
    if (relevantMemories.isEmpty) return '';

    final buffer = StringBuffer();
    buffer.writeln('\n[记忆上下文 - 你记得以下事情]');
    for (var i = 0; i < relevantMemories.length && i < 5; i++) {
      final mem = relevantMemories[i].memory;
      final timeAgo = _formatTimeAgo(mem.createdAt);
      buffer.writeln('- ($timeAgo) ${mem.content}');
    }
    return buffer.toString();
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return '刚刚';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分钟前';
    if (diff.inHours < 24) return '${diff.inHours}小时前';
    if (diff.inDays < 7) return '${diff.inDays}天前';
    return '${diff.inDays ~/ 7}周前';
  }
}

class MemoryService {
  final PetMemoryBridge _bridge;

  MemoryService(this._bridge);

  Future<MemoryContext> buildContext({
    required String userMessage,
    required PetContext petContext,
  }) async {
    final relevantMemories = await _bridge.recallInteractions(
      query: userMessage,
      currentContext: petContext,
      limit: 10,
    );

    final proactiveMemories = await _bridge.getProactiveMemories(
      currentContext: petContext,
      queryHint: userMessage,
    );

    final inferredMood = await _bridge.inferMoodFromRecentMemories();

    return MemoryContext(
      relevantMemories: relevantMemories,
      proactiveMemories: proactiveMemories,
      inferredMood: inferredMood,
    );
  }

  Future<void> rememberInteraction({
    required String userMessage,
    required String petResponse,
    required PetContext petContext,
  }) async {
    await _bridge.rememberInteraction(
      content: '用户说: $userMessage',
      petContext: petContext,
      type: MemoryType.episodic,
      source: MemorySource.conversation,
      importance: 0.6,
    );

    await _bridge.rememberInteraction(
      content: '我回复: $petResponse',
      petContext: petContext,
      type: MemoryType.episodic,
      source: MemorySource.conversation,
      importance: 0.5,
    );
  }

  Future<List<MemoryItem>> getRecentMemories({int limit = 20}) async {
    return await _bridge.getRecentInteractions(limit: limit);
  }

  Future<List<MemoryItem>> getImportantMemories({int limit = 20}) async {
    return await _bridge.getImportantInteractions(limit: limit);
  }

  Future<ProactiveMemory?> checkSceneTrigger({
    required PetContext petContext,
  }) async {
    return await _bridge.checkSceneTrigger(currentContext: petContext);
  }
}
