import '../embedding/embedding_service.dart';
import '../llm/llm_service.dart';
import '../conversation/default_conversation_manager.dart';
import 'neural_bridge_config.dart';

export '../embedding/embedding_service.dart';
export '../embedding/embedding_provider.dart';
export '../embedding/gemma_embedding_provider.dart';
export '../embedding/cloud_embedding_provider.dart';
export '../embedding/mock_embedding_provider.dart';
export '../llm/llm_service.dart';
export '../llm/llm_provider.dart';
export '../llm/llamafu_provider.dart';
export '../llm/cloud_llm_provider.dart';
export '../llm/mock_llm_provider.dart';
export '../conversation/conversation_manager.dart';
export '../conversation/conversation_message.dart';
export '../conversation/conversation_session.dart';
export '../conversation/conversation_config.dart';
export '../conversation/default_conversation_manager.dart';
export 'neural_bridge_config.dart';

class NeuralBridge {
  final NeuralBridgeConfig config;
  final EmbeddingService? embeddingService;
  final LLMService? llmService;
  final ConversationManager? conversationManager;

  bool _isInitialized = false;

  NeuralBridge._({
    required this.config,
    this.embeddingService,
    this.llmService,
    this.conversationManager,
  });

  factory NeuralBridge({
    NeuralBridgeConfig config = const NeuralBridgeConfig(),
    EmbeddingService? embeddingService,
    LLMService? llmService,
    ConversationManager? conversationManager,
    ConversationConfig? conversationConfig,
    MemoryArchiveCallback? onArchive,
  }) {
    ConversationManager? conv = conversationManager;
    if (conv == null && llmService != null && config.enableConversation) {
      conv = DefaultConversationManager(
        config: conversationConfig ?? const ConversationConfig(),
        llmService: llmService,
        embeddingService: embeddingService,
        onArchive: onArchive,
      );
    }

    return NeuralBridge._(
      config: config,
      embeddingService: config.enableEmbedding ? embeddingService : null,
      llmService: config.enableLLM ? llmService : null,
      conversationManager: conv,
    );
  }

  Future<void> initialize() async {
    if (_isInitialized) return;

    if (embeddingService != null) {
      await embeddingService!.initialize();
    }

    if (llmService != null) {
      await llmService!.initialize();
    }

    _isInitialized = true;
  }

  Future<void> dispose() async {
    if (llmService != null) {
      await llmService!.dispose();
    }
    _isInitialized = false;
  }

  bool get isInitialized => _isInitialized;

  EmbeddingService get embedding {
    _ensureInitialized();
    if (embeddingService == null) {
      throw StateError('EmbeddingService is not configured');
    }
    return embeddingService!;
  }

  LLMService get llm {
    _ensureInitialized();
    if (llmService == null) {
      throw StateError('LLMService is not configured');
    }
    return llmService!;
  }

  ConversationManager get conversation {
    _ensureInitialized();
    if (conversationManager == null) {
      throw StateError('ConversationManager is not configured');
    }
    return conversationManager!;
  }

  void _ensureInitialized() {
    if (!_isInitialized) {
      throw StateError('NeuralBridge is not initialized. Call initialize() first.');
    }
  }
}
