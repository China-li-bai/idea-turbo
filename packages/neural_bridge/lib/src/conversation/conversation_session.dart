enum SessionStatus {
  active,
  archived,
  expired,
}

class ConversationSession {
  final String id;
  final String? userId;
  final String? agentId;
  final String? systemPrompt;
  final SessionStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int messageCount;
  final Map<String, dynamic>? metadata;

  const ConversationSession({
    required this.id,
    this.userId,
    this.agentId,
    this.systemPrompt,
    this.status = SessionStatus.active,
    required this.createdAt,
    required this.updatedAt,
    this.messageCount = 0,
    this.metadata,
  });

  ConversationSession copyWith({
    String? id,
    String? userId,
    String? agentId,
    String? systemPrompt,
    SessionStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? messageCount,
    Map<String, dynamic>? metadata,
  }) =>
      ConversationSession(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        agentId: agentId ?? this.agentId,
        systemPrompt: systemPrompt ?? this.systemPrompt,
        status: status ?? this.status,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        messageCount: messageCount ?? this.messageCount,
        metadata: metadata ?? this.metadata,
      );

  bool get isActive => status == SessionStatus.active;
}
