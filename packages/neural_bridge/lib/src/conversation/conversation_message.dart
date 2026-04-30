enum MessageRole {
  system,
  user,
  assistant,
  tool,
}

class ConversationMessage {
  final String id;
  final String sessionId;
  final MessageRole role;
  final String content;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;
  final List<double>? embedding;

  const ConversationMessage({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    required this.timestamp,
    this.metadata,
    this.embedding,
  });

  ConversationMessage copyWith({
    String? id,
    String? sessionId,
    MessageRole? role,
    String? content,
    DateTime? timestamp,
    Map<String, dynamic>? metadata,
    List<double>? embedding,
  }) =>
      ConversationMessage(
        id: id ?? this.id,
        sessionId: sessionId ?? this.sessionId,
        role: role ?? this.role,
        content: content ?? this.content,
        timestamp: timestamp ?? this.timestamp,
        metadata: metadata ?? this.metadata,
        embedding: embedding ?? this.embedding,
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'sessionId': sessionId,
        'role': role.name,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        if (metadata != null) 'metadata': metadata,
      };
}
