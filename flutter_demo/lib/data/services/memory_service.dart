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
    if (relevantMemories.isEmpty &&
        proactiveMemories.isEmpty &&
        inferredMood == PetMood.neutral) {
      return '';
    }

    final buffer = StringBuffer();
    buffer.writeln('[记忆]');
    buffer.writeln('以下是你自然想起的旧事，只提起最相关的一条，像自然想起的。');

    if (inferredMood != PetMood.neutral) {
      buffer.writeln('近期情绪基调：${_moodLabel(inferredMood)}');
    }

    if (proactiveMemories.isNotEmpty) {
      for (final proactive in proactiveMemories.take(2)) {
        final mem = proactive.memory;
        buffer.writeln(
          '${_sanitizeMemoryData(mem.content)}',
        );
      }
    }

    for (var i = 0; i < relevantMemories.length && i < 3; i++) {
      final mem = relevantMemories[i].memory;
      final timeAgo = _formatTimeAgo(mem.createdAt);
      buffer.writeln('$timeAgo：${_sanitizeMemoryData(mem.content)}');
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

  String _moodLabel(PetMood mood) {
    return switch (mood) {
      PetMood.happy => '开心',
      PetMood.sad => '低落',
      PetMood.anxious => '焦虑',
      PetMood.excited => '兴奋',
      PetMood.angry => '受伤或生气',
      PetMood.sleepy => '疲惫',
      PetMood.curious => '好奇',
      PetMood.lonely => '孤独',
      PetMood.playful => '轻松',
      PetMood.neutral => '平静',
    };
  }

  String _sanitizeMemoryData(String value) {
    return value
        .replaceAll(RegExp(r'\s+'), ' ')
        .replaceAll('[', '〔')
        .replaceAll(']', '〕')
        .trim();
  }
}

enum MemoryEventKind { conversation, silentAction, refused }

class MemoryService {
  final PetMemoryBridge _bridge;
  final PetOrchestrator? _orchestrator;

  MemoryService(this._bridge, {PetOrchestrator? orchestrator})
    : _orchestrator = orchestrator;

  Future<MemoryContext> buildContext({
    required String userMessage,
    required PetContext petContext,
  }) async {
    final relevantMemories = await _bridge.recallInteractions(
      query: userMessage,
      currentContext: petContext,
      limit: 5,
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
    MemoryEventKind kind = MemoryEventKind.conversation,
  }) async {
    final content = _eventContent(
      userMessage: userMessage,
      petResponse: petResponse,
      kind: kind,
    );

    final orchestrator = _orchestrator;
    if (orchestrator != null) {
      await orchestrator.ingestConversation(content, petContext: petContext);
      return;
    }

    await _bridge.rememberInteraction(
      content: content,
      petContext: petContext,
      type: MemoryType.episodic,
      source: MemorySource.conversation,
      importance: kind == MemoryEventKind.conversation ? 0.65 : 0.8,
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

  String _eventContent({
    required String userMessage,
    required String petResponse,
    required MemoryEventKind kind,
  }) {
    final label = switch (kind) {
      MemoryEventKind.conversation => '一次对话',
      MemoryEventKind.silentAction => '一次沉默回应',
      MemoryEventKind.refused => '一次受伤后的后退',
    };

    return '$label\n用户说: $userMessage\n我回应: $petResponse';
  }
}
