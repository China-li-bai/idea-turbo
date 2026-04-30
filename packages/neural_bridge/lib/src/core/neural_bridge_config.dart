class NeuralBridgeConfig {
  final int embeddingDimensions;
  final bool enableEmbedding;
  final bool enableLLM;
  final bool enableConversation;
  final Duration globalTimeout;

  const NeuralBridgeConfig({
    this.embeddingDimensions = 256,
    this.enableEmbedding = true,
    this.enableLLM = true,
    this.enableConversation = true,
    this.globalTimeout = const Duration(seconds: 30),
  });
}
