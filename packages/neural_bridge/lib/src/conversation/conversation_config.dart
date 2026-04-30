class ConversationConfig {
  final int maxWorkingMemoryMessages;
  final int contextWindowSize;
  final Duration sessionTimeout;
  final bool autoArchiveOnTimeout;
  final bool embedMessages;
  final String defaultSystemPrompt;
  final bool enableProactiveMemory;

  const ConversationConfig({
    this.maxWorkingMemoryMessages = 20,
    this.contextWindowSize = 4096,
    this.sessionTimeout = const Duration(hours: 2),
    this.autoArchiveOnTimeout = true,
    this.embedMessages = true,
    this.defaultSystemPrompt = '',
    this.enableProactiveMemory = true,
  });
}
