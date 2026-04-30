import 'conversation_message.dart';
import 'conversation_session.dart';
import 'conversation_config.dart';

abstract class ConversationManager {
  ConversationConfig get config;

  Future<ConversationSession> createSession({
    String? systemPrompt,
    String? userId,
    String? agentId,
    Map<String, dynamic>? metadata,
  });

  Future<ConversationSession> getSession(String sessionId);

  Future<void> addMessage(
    String sessionId, {
    required String content,
    required MessageRole role,
    Map<String, dynamic>? metadata,
  });

  Future<List<ConversationMessage>> getHistory(String sessionId, {int? limit});

  Future<String> generateReply(
    String sessionId, {
    String? overrideSystemPrompt,
    Map<String, dynamic>? context,
  });

  Stream<String> generateReplyStream(
    String sessionId, {
    String? overrideSystemPrompt,
    Map<String, dynamic>? context,
  });

  Future<void> archiveSession(String sessionId);

  Future<void> deleteSession(String sessionId);

  Future<List<ConversationSession>> getActiveSessions({String? userId});

  Future<String> buildContextWindow(String sessionId, {int? maxMessages});
}
