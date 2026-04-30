import '../embedding/embedding_service.dart';
import '../conversation/conversation_manager.dart';
import '../conversation/conversation_message.dart';

abstract class EmbeddingSource {
  Future<EmbeddingResult?> embed(String text);
  int get outputDimensions;
}

class NeuralBridgeEmbeddingSource implements EmbeddingSource {
  final EmbeddingService _service;

  NeuralBridgeEmbeddingSource(this._service);

  @override
  Future<EmbeddingResult?> embed(String text) async {
    try {
      return await _service.embed(text);
    } catch (_) {
      return null;
    }
  }

  @override
  int get outputDimensions => _service.outputDimensions;
}

abstract class ConversationSource {
  Future<List<ConversationMessage>> getHistory(String sessionId);
  Future<void> archiveSession(String sessionId);
}

class DefaultConversationSource implements ConversationSource {
  final ConversationManager _manager;

  DefaultConversationSource(this._manager);

  @override
  Future<List<ConversationMessage>> getHistory(String sessionId) =>
      _manager.getHistory(sessionId);

  @override
  Future<void> archiveSession(String sessionId) =>
      _manager.archiveSession(sessionId);
}
