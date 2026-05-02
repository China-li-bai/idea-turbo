class RawMessage {
  final String id;
  final String content;
  final String source;
  final String? speakerId;
  final String? petId;
  final DateTime timestamp;
  final bool isProcessed;
  final DateTime? processedAt;
  final Map<String, dynamic> metadata;

  const RawMessage({
    required this.id,
    required this.content,
    this.source = 'conversation',
    this.speakerId,
    this.petId,
    required this.timestamp,
    this.isProcessed = false,
    this.processedAt,
    this.metadata = const {},
  });

  RawMessage markProcessed() => RawMessage(
        id: id,
        content: content,
        source: source,
        speakerId: speakerId,
        petId: petId,
        timestamp: timestamp,
        isProcessed: true,
        processedAt: DateTime.now(),
        metadata: metadata,
      );

  RawMessage copyWith({
    String? id,
    String? content,
    String? source,
    String? speakerId,
    String? petId,
    DateTime? timestamp,
    bool? isProcessed,
    DateTime? processedAt,
    Map<String, dynamic>? metadata,
  }) =>
      RawMessage(
        id: id ?? this.id,
        content: content ?? this.content,
        source: source ?? this.source,
        speakerId: speakerId ?? this.speakerId,
        petId: petId ?? this.petId,
        timestamp: timestamp ?? this.timestamp,
        isProcessed: isProcessed ?? this.isProcessed,
        processedAt: processedAt ?? this.processedAt,
        metadata: metadata ?? this.metadata,
      );
}
