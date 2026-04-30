import 'dart:async';
import 'package:uuid/uuid.dart';
import '../embedding/embedding_service.dart';
import '../llm/llm_service.dart';
import 'conversation_manager.dart';
import 'conversation_message.dart';
import 'conversation_session.dart';
import 'conversation_config.dart';

export 'conversation_manager.dart';
export 'conversation_message.dart';
export 'conversation_session.dart';
export 'conversation_config.dart';

typedef MemoryArchiveCallback = Future<void> Function(
  String sessionId,
  List<ConversationMessage> messages,
);

class DefaultConversationManager implements ConversationManager {
  @override
  final ConversationConfig config;
  final LLMService _llmService;
  final EmbeddingService? _embeddingService;
  final MemoryArchiveCallback? _onArchive;

  final Map<String, ConversationSession> _sessions = {};
  final Map<String, List<ConversationMessage>> _messageBuffers = {};
  final _uuid = const Uuid();

  DefaultConversationManager({
    required this.config,
    required LLMService llmService,
    EmbeddingService? embeddingService,
    MemoryArchiveCallback? onArchive,
  })  : _llmService = llmService,
        _embeddingService = embeddingService,
        _onArchive = onArchive;

  @override
  Future<ConversationSession> createSession({
    String? systemPrompt,
    String? userId,
    String? agentId,
    Map<String, dynamic>? metadata,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final session = ConversationSession(
      id: id,
      userId: userId,
      agentId: agentId,
      systemPrompt: systemPrompt ?? config.defaultSystemPrompt,
      createdAt: now,
      updatedAt: now,
      metadata: metadata,
    );
    _sessions[id] = session;
    _messageBuffers[id] = [];

    if (session.systemPrompt != null && session.systemPrompt!.isNotEmpty) {
      _messageBuffers[id]!.add(ConversationMessage(
        id: _uuid.v4(),
        sessionId: id,
        role: MessageRole.system,
        content: session.systemPrompt!,
        timestamp: now,
      ));
    }

    return session;
  }

  @override
  Future<ConversationSession> getSession(String sessionId) async {
    final session = _sessions[sessionId];
    if (session == null) {
      throw ConversationException('Session not found: $sessionId');
    }
    return session;
  }

  @override
  Future<void> addMessage(
    String sessionId, {
    required String content,
    required MessageRole role,
    Map<String, dynamic>? metadata,
  }) async {
    _ensureSession(sessionId);

    List<double>? embedding;
    if (config.embedMessages && _embeddingService != null && role == MessageRole.user) {
      try {
        final result = await _embeddingService.embed(content);
        embedding = result.vector;
      } catch (_) {}
    }

    final message = ConversationMessage(
      id: _uuid.v4(),
      sessionId: sessionId,
      role: role,
      content: content,
      timestamp: DateTime.now(),
      metadata: metadata,
      embedding: embedding,
    );

    final buffer = _messageBuffers[sessionId];
    if (buffer != null) buffer.add(message);

    final session = _sessions[sessionId];
    if (session != null) {
      _sessions[sessionId] = session.copyWith(
        updatedAt: DateTime.now(),
        messageCount: _messageBuffers[sessionId]?.length ?? 0,
      );
    }

    _trimWorkingMemory(sessionId);
  }

  @override
  Future<List<ConversationMessage>> getHistory(String sessionId, {int? limit}) async {
    _ensureSession(sessionId);
    final messages = _messageBuffers[sessionId];
    if (messages == null) return const [];
    if (limit != null && messages.length > limit) {
      return messages.sublist(messages.length - limit);
    }
    return List.unmodifiable(messages);
  }

  @override
  Future<String> generateReply(
    String sessionId, {
    String? overrideSystemPrompt,
    Map<String, dynamic>? context,
  }) async {
    _ensureSession(sessionId);

    final contextWindow = await buildContextWindow(sessionId);
    final llmMessages = _toLLMMessages(contextWindow);

    if (overrideSystemPrompt != null && llmMessages.isNotEmpty && llmMessages.first.role == LLMRole.system) {
      llmMessages[0] = LLMMessage(role: LLMRole.system, content: overrideSystemPrompt);
    } else if (overrideSystemPrompt != null) {
      llmMessages.insert(0, LLMMessage(role: LLMRole.system, content: overrideSystemPrompt));
    }

    final result = await _llmService.generate(llmMessages);

    await addMessage(
      sessionId,
      content: result.text,
      role: MessageRole.assistant,
    );

    return result.text;
  }

  @override
  Stream<String> generateReplyStream(
    String sessionId, {
    String? overrideSystemPrompt,
    Map<String, dynamic>? context,
  }) async* {
    _ensureSession(sessionId);

    final contextWindow = await buildContextWindow(sessionId);
    final llmMessages = _toLLMMessages(contextWindow);

    if (overrideSystemPrompt != null && llmMessages.isNotEmpty && llmMessages.first.role == LLMRole.system) {
      llmMessages[0] = LLMMessage(role: LLMRole.system, content: overrideSystemPrompt);
    } else if (overrideSystemPrompt != null) {
      llmMessages.insert(0, LLMMessage(role: LLMRole.system, content: overrideSystemPrompt));
    }

    final buffer = StringBuffer();
    await for (final chunk in _llmService.generateStream(llmMessages)) {
      buffer.write(chunk.text);
      yield chunk.text;
    }

    await addMessage(
      sessionId,
      content: buffer.toString(),
      role: MessageRole.assistant,
    );
  }

  @override
  Future<void> archiveSession(String sessionId) async {
    _ensureSession(sessionId);

    if (_onArchive != null) {
      final msgs = _messageBuffers[sessionId];
      if (msgs != null) {
        final nonSystem = msgs.where((m) => m.role != MessageRole.system).toList();
        await _onArchive(sessionId, nonSystem);
      }
    }

    final session = _sessions[sessionId];
    if (session != null) {
      _sessions[sessionId] = session.copyWith(
        status: SessionStatus.archived,
        updatedAt: DateTime.now(),
      );
    }
  }

  @override
  Future<void> deleteSession(String sessionId) async {
    _sessions.remove(sessionId);
    _messageBuffers.remove(sessionId);
  }

  @override
  Future<List<ConversationSession>> getActiveSessions({String? userId}) async {
    return _sessions.values
        .where((s) => s.isActive && (userId == null || s.userId == userId))
        .toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  @override
  Future<String> buildContextWindow(String sessionId, {int? maxMessages}) async {
    _ensureSession(sessionId);
    final messages = _messageBuffers[sessionId];
    if (messages == null) return '';
    final limit = maxMessages ?? config.maxWorkingMemoryMessages;

    final relevant = messages.length > limit ? messages.sublist(messages.length - limit) : messages;

    final parts = <String>[];
    for (final msg in relevant) {
      final prefix = switch (msg.role) {
        MessageRole.system => '[System]',
        MessageRole.user => '[User]',
        MessageRole.assistant => '[Assistant]',
        MessageRole.tool => '[Tool]',
      };
      parts.add('$prefix ${msg.content}');
    }
    return parts.join('\n\n');
  }

  void _trimWorkingMemory(String sessionId) {
    final messages = _messageBuffers[sessionId];
    if (messages == null || messages.length <= config.maxWorkingMemoryMessages) return;

    final systemMessages = messages.where((m) => m.role == MessageRole.system).toList();
    final nonSystemMessages = messages.where((m) => m.role != MessageRole.system).toList();

    final trimmed = nonSystemMessages.length > config.maxWorkingMemoryMessages - systemMessages.length
        ? nonSystemMessages.sublist(nonSystemMessages.length - (config.maxWorkingMemoryMessages - systemMessages.length))
        : nonSystemMessages;

    _messageBuffers[sessionId] = [...systemMessages, ...trimmed];
  }

  List<LLMMessage> _toLLMMessages(String contextWindow) {
    return [
      LLMMessage(role: LLMRole.user, content: contextWindow),
    ];
  }

  void _ensureSession(String sessionId) {
    if (!_sessions.containsKey(sessionId)) {
      throw ConversationException('Session not found: $sessionId');
    }
  }
}

class ConversationException implements Exception {
  final String message;
  const ConversationException(this.message);

  @override
  String toString() => 'ConversationException: $message';
}
