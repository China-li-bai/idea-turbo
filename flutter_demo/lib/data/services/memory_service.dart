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
    buffer.writeln('[记忆提示]');
    buffer.writeln('以下只是一条事实提示。不要模仿历史文本，不要续写历史回复。');

    if (inferredMood != PetMood.neutral) {
      buffer.writeln('近期情绪基调：${_moodLabel(inferredMood)}');
    }

    if (proactiveMemories.isNotEmpty) {
      for (final proactive in proactiveMemories.take(1)) {
        final mem = proactive.memory;
        buffer.writeln('旧事：${_memoryFact(mem.content)}');
      }
    }

    final remaining = proactiveMemories.isNotEmpty ? 0 : 1;
    for (var i = 0; i < relevantMemories.length && i < remaining; i++) {
      final mem = relevantMemories[i].memory;
      final timeAgo = _formatTimeAgo(mem.createdAt);
      buffer.writeln('$timeAgo：${_memoryFact(mem.content)}');
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

  String _memoryFact(String raw) {
    final structured = _structuredFact(raw);
    if (structured != null) return structured;

    final content = _sanitizeMemoryData(raw);

    final userMatch = RegExp(r'用户说:\s*(.*?)(?:\s*我回应:|$)').firstMatch(content);
    if (userMatch != null) {
      return _quote(_truncate(userMatch.group(1)!.trim()));
    }

    final withoutReply = content.replaceFirst(RegExp(r'\s*我回应:.*$'), '');
    return _quote(_truncate(withoutReply));
  }

  String? _structuredFact(String content) {
    final parts = <String>[];
    final lines = content.split(RegExp(r'\r?\n'));
    for (final line in lines) {
      final cleaned = _sanitizeMemoryData(line);
      for (final marker in ['用户事件:', '用户偏好:', '用户情绪:', '触发线索:']) {
        if (cleaned.startsWith(marker)) {
          final value = cleaned.substring(marker.length).trim();
          if (value.isNotEmpty) parts.add(value);
        }
      }
    }
    if (parts.isEmpty) return null;
    return _truncate(parts.join('；'));
  }

  String _quote(String value) => '用户曾经提到：「$value」';

  String _truncate(String value, {int maxChars = 72}) {
    if (value.length <= maxChars) return value;
    return '${value.substring(0, maxChars)}...';
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
      limit: 2,
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

    return '$label\n用户说: $userMessage';
  }
}
