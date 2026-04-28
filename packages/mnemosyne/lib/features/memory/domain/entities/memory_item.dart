import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';

enum MemorySource {
  conversation,
  toolResult,
  observation,
  consolidation,
  external,
  userExplicit,
}

enum MemoryStatus {
  active,
  challenged,
  invalidated,
  merged,
  superseded,
}

class MemoryItem {
  final String id;
  final String content;
  final MemoryType type;
  final MemorySource source;
  final MemoryStatus status;
  final double importance;
  final double initialStrength;
  final double strength;
  final double emotionalValence;
  final double surpriseScore;
  final List<String> keywords;
  final List<String> entities;
  final List<String> topics;
  final List<double>? embedding;
  final EncodingContext? encodingContext;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime accessedAt;
  final DateTime updatedAt;
  final int accessCount;
  final String? sourceId;
  final String? agentId;
  final String? userId;
  final List<String> relatedMemoryIds;
  final String? parentMemoryId;
  final String? supersededById;
  final bool isPinned;
  final bool isArchived;
  final bool isConsolidated;
  final int confirmationCount;

  MemoryItem({
    required this.id,
    required this.content,
    this.type = MemoryType.episodic,
    this.source = MemorySource.conversation,
    this.status = MemoryStatus.active,
    this.importance = 0.5,
    this.initialStrength = 1.0,
    this.strength = 1.0,
    this.emotionalValence = 0.0,
    this.surpriseScore = 0.0,
    this.keywords = const [],
    this.entities = const [],
    this.topics = const [],
    this.embedding,
    this.encodingContext,
    this.metadata,
    DateTime? createdAt,
    DateTime? accessedAt,
    DateTime? updatedAt,
    this.accessCount = 0,
    this.sourceId,
    this.agentId,
    this.userId,
    this.relatedMemoryIds = const [],
    this.parentMemoryId,
    this.supersededById,
    this.isPinned = false,
    this.isArchived = false,
    this.isConsolidated = false,
    this.confirmationCount = 0,
  })  : createdAt = createdAt ?? DateTime.now(),
        accessedAt = accessedAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  double get currentStrength {
    if (isPinned) return initialStrength;
    if (encodingContext?.arousalLevel == null) return strength;
    final arousalBoost = 1.0 + encodingContext!.arousalLevel! * 0.5;
    return (strength * arousalBoost).clamp(0.0, 1.0);
  }

  MemoryItem copyWith({
    String? id,
    String? content,
    MemoryType? type,
    MemorySource? source,
    MemoryStatus? status,
    double? importance,
    double? initialStrength,
    double? strength,
    double? emotionalValence,
    double? surpriseScore,
    List<String>? keywords,
    List<String>? entities,
    List<String>? topics,
    List<double>? embedding,
    EncodingContext? encodingContext,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? accessedAt,
    DateTime? updatedAt,
    int? accessCount,
    String? sourceId,
    String? agentId,
    String? userId,
    List<String>? relatedMemoryIds,
    String? parentMemoryId,
    String? supersededById,
    bool? isPinned,
    bool? isArchived,
    bool? isConsolidated,
    int? confirmationCount,
  }) {
    return MemoryItem(
      id: id ?? this.id,
      content: content ?? this.content,
      type: type ?? this.type,
      source: source ?? this.source,
      status: status ?? this.status,
      importance: importance ?? this.importance,
      initialStrength: initialStrength ?? this.initialStrength,
      strength: strength ?? this.strength,
      emotionalValence: emotionalValence ?? this.emotionalValence,
      surpriseScore: surpriseScore ?? this.surpriseScore,
      keywords: keywords ?? this.keywords,
      entities: entities ?? this.entities,
      topics: topics ?? this.topics,
      embedding: embedding ?? this.embedding,
      encodingContext: encodingContext ?? this.encodingContext,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      accessedAt: accessedAt ?? this.accessedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      accessCount: accessCount ?? this.accessCount,
      sourceId: sourceId ?? this.sourceId,
      agentId: agentId ?? this.agentId,
      userId: userId ?? this.userId,
      relatedMemoryIds: relatedMemoryIds ?? this.relatedMemoryIds,
      parentMemoryId: parentMemoryId ?? this.parentMemoryId,
      supersededById: supersededById ?? this.supersededById,
      isPinned: isPinned ?? this.isPinned,
      isArchived: isArchived ?? this.isArchived,
      isConsolidated: isConsolidated ?? this.isConsolidated,
      confirmationCount: confirmationCount ?? this.confirmationCount,
    );
  }

  MemoryItem access({double rehearsalBoost = 0.2}) {
    return copyWith(
      accessedAt: DateTime.now(),
      updatedAt: DateTime.now(),
      accessCount: accessCount + 1,
      strength: (strength + rehearsalBoost).clamp(0.0, 1.0),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'type': type.name,
      'source': source.name,
      'status': status.name,
      'importance': importance,
      'initialStrength': initialStrength,
      'strength': strength,
      'emotionalValence': emotionalValence,
      'surpriseScore': surpriseScore,
      'keywords': keywords,
      'entities': entities,
      'topics': topics,
      'embedding': embedding,
      'encodingContext': encodingContext?.toJson(),
      'metadata': metadata,
      'createdAt': createdAt.toIso8601String(),
      'accessedAt': accessedAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'accessCount': accessCount,
      'sourceId': sourceId,
      'agentId': agentId,
      'userId': userId,
      'relatedMemoryIds': relatedMemoryIds,
      'parentMemoryId': parentMemoryId,
      'supersededById': supersededById,
      'isPinned': isPinned ? 1 : 0,
      'isArchived': isArchived ? 1 : 0,
      'isConsolidated': isConsolidated ? 1 : 0,
      'confirmationCount': confirmationCount,
    };
  }

  factory MemoryItem.fromJson(Map<String, dynamic> json) {
    return MemoryItem(
      id: json['id'] as String,
      content: json['content'] as String,
      type: MemoryType.values.firstWhere((e) => e.name == json['type'], orElse: () => MemoryType.episodic),
      source: MemorySource.values.firstWhere((e) => e.name == json['source'], orElse: () => MemorySource.conversation),
      status: MemoryStatus.values.firstWhere((e) => e.name == json['status'], orElse: () => MemoryStatus.active),
      importance: (json['importance'] as num?)?.toDouble() ?? 0.5,
      initialStrength: (json['initialStrength'] as num?)?.toDouble() ?? 1.0,
      strength: (json['strength'] as num?)?.toDouble() ?? 1.0,
      emotionalValence: (json['emotionalValence'] as num?)?.toDouble() ?? 0.0,
      surpriseScore: (json['surpriseScore'] as num?)?.toDouble() ?? 0.0,
      keywords: (json['keywords'] as List<dynamic>?)?.cast<String>() ?? [],
      entities: (json['entities'] as List<dynamic>?)?.cast<String>() ?? [],
      topics: (json['topics'] as List<dynamic>?)?.cast<String>() ?? [],
      embedding: json['embedding'] != null ? (json['embedding'] as List<dynamic>).cast<double>() : null,
      encodingContext: json['encodingContext'] != null ? EncodingContext.fromJson(json['encodingContext']) : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      accessedAt: json['accessedAt'] != null ? DateTime.parse(json['accessedAt'] as String) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt'] as String) : null,
      accessCount: json['accessCount'] as int? ?? 0,
      sourceId: json['sourceId'] as String?,
      agentId: json['agentId'] as String?,
      userId: json['userId'] as String?,
      relatedMemoryIds: (json['relatedMemoryIds'] as List<dynamic>?)?.cast<String>() ?? [],
      parentMemoryId: json['parentMemoryId'] as String?,
      supersededById: json['supersededById'] as String?,
      isPinned: (json['isPinned'] as int?) == 1,
      isArchived: (json['isArchived'] as int?) == 1,
      isConsolidated: (json['isConsolidated'] as int?) == 1,
      confirmationCount: json['confirmationCount'] as int? ?? 0,
    );
  }
}
