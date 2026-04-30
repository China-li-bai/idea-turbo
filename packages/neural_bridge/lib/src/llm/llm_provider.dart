enum LLMProviderType {
  onDevice,
  cloud,
  mock,
}

enum LLMRole {
  system,
  user,
  assistant,
  tool,
}

class LLMMessage {
  final LLMRole role;
  final String content;
  final String? toolCallId;
  final String? toolName;
  final Map<String, dynamic>? metadata;

  const LLMMessage({
    required this.role,
    required this.content,
    this.toolCallId,
    this.toolName,
    this.metadata,
  });

  Map<String, dynamic> toMap() => {
        'role': role.name,
        'content': content,
        if (toolCallId != null) 'tool_call_id': toolCallId,
        if (toolName != null) 'tool_name': toolName,
      };
}

class LLMTool {
  final String name;
  final String description;
  final Map<String, dynamic> parametersSchema;

  const LLMTool({
    required this.name,
    required this.description,
    required this.parametersSchema,
  });

  Map<String, dynamic> toMap() => {
        'type': 'function',
        'function': {
          'name': name,
          'description': description,
          'parameters': parametersSchema,
        },
      };
}

class LLMToolCall {
  final String id;
  final String name;
  final String arguments;

  const LLMToolCall({
    required this.id,
    required this.name,
    required this.arguments,
  });
}

class LLMGenerateOptions {
  final double? temperature;
  final int? maxTokens;
  final double? topP;
  final int? topK;
  final List<LLMTool>? tools;
  final List<String>? stopSequences;

  const LLMGenerateOptions({
    this.temperature,
    this.maxTokens,
    this.topP,
    this.topK,
    this.tools,
    this.stopSequences,
  });
}

class LLMGenerateResult {
  final String text;
  final List<LLMToolCall> toolCalls;
  final String providerName;
  final LLMProviderType providerType;
  final int? promptTokens;
  final int? completionTokens;
  final Duration? latency;

  const LLMGenerateResult({
    required this.text,
    this.toolCalls = const [],
    required this.providerName,
    required this.providerType,
    this.promptTokens,
    this.completionTokens,
    this.latency,
  });

  bool get hasToolCalls => toolCalls.isNotEmpty;
}

abstract class LLMProvider {
  LLMProviderType get type;
  String get modelName;
  bool get isAvailable;

  Future<LLMGenerateResult> generate(
    List<LLMMessage> messages, {
    LLMGenerateOptions? options,
  });

  Stream<LLMGenerateResult> generateStream(
    List<LLMMessage> messages, {
    LLMGenerateOptions? options,
  }) {
    return Stream.fromFuture(generate(messages, options: options));
  }

  Future<void> initialize() async {}
  Future<void> dispose() async {}
}

class LLMProviderException implements Exception {
  final String message;
  final String? providerName;

  const LLMProviderException(this.message, {this.providerName});

  @override
  String toString() =>
      'LLMProviderException(${providerName ?? "unknown"}): $message';
}
