import 'dart:convert';
import 'package:objectbox/objectbox.dart';
import 'package:crypto/crypto.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/core/constants.dart';

@Entity()
class MemoryEntity {
  @Id()
  int obId = 0;

  String uid;
  String content;

  String type;
  String source;
  String status;

  double importance;
  double initialStrength;
  double strength;
  double emotionalValence;
  double surpriseScore;

  String keywords;
  String entities;
  String topics;

  /// embedding 统一 SSOT（P0 #4 修复）。
  /// 之前 embedding 同时存在 MemoryEntity 和 MemoryVectorIndex 两处，
  /// 现在统一到 MemoryEntity，加 HNSW 索引支持向量检索。
  @HnswIndex(dimensions: 256, distanceType: VectorDistanceType.cosine)
  @Property(type: PropertyType.floatVector)
  List<double>? embedding;

  /// contentHash 索引字段（P0 #2 修复）。
  /// 之前 contentHash 存在 metadata['contentHash']，去重需全表扫描。
  /// 现在提升为独立索引字段，用 ObjectBox query 精确查找。
  @Index()
  String contentHash;

  String? encodingContextJson;
  String? metadataJson;

  int createdAtMs;
  int accessedAtMs;
  int updatedAtMs;
  int accessCount;

  String? sourceId;
  String? agentId;
  String? userId;
  String relatedMemoryIds;
  String? parentMemoryId;
  String? supersededById;

  bool isPinned;
  bool isArchived;
  bool isConsolidated;

  MemoryEntity({
    this.obId = 0,
    required this.uid,
    required this.content,
    this.type = 'episodic',
    this.source = 'conversation',
    this.status = 'active',
    this.importance = 0.5,
    this.initialStrength = 1.0,
    this.strength = 1.0,
    this.emotionalValence = 0.0,
    this.surpriseScore = 0.0,
    this.keywords = '',
    this.entities = '',
    this.topics = '',
    this.embedding,
    this.contentHash = '',
    this.encodingContextJson,
    this.metadataJson,
    required this.createdAtMs,
    required this.accessedAtMs,
    required this.updatedAtMs,
    this.accessCount = 0,
    this.sourceId,
    this.agentId,
    this.userId,
    this.relatedMemoryIds = '',
    this.parentMemoryId,
    this.supersededById,
    this.isPinned = false,
    this.isArchived = false,
    this.isConsolidated = false,
  });

  factory MemoryEntity.fromDomain(MemoryItem item) {
    // contentHash 从 metadata 提取，若不存在则计算
    String contentHash = '';
    if (item.metadata != null && item.metadata!['contentHash'] is String) {
      contentHash = item.metadata!['contentHash'] as String;
    } else {
      contentHash = _computeContentHash(item.content);
    }

    return MemoryEntity(
      uid: item.id,
      content: item.content,
      type: item.type.name,
      source: item.source.name,
      status: item.status.name,
      importance: item.importance,
      initialStrength: item.initialStrength,
      strength: item.strength,
      emotionalValence: item.emotionalValence,
      surpriseScore: item.surpriseScore,
      keywords: item.keywords.join('\x01'),
      entities: item.entities.join('\x01'),
      topics: item.topics.join('\x01'),
      embedding: item.embedding,
      contentHash: contentHash,
      encodingContextJson: item.encodingContext != null
          ? jsonEncode(item.encodingContext!.toJson())
          : null,
      metadataJson: item.metadata != null ? jsonEncode(item.metadata) : null,
      createdAtMs: item.createdAt.millisecondsSinceEpoch,
      accessedAtMs: item.accessedAt.millisecondsSinceEpoch,
      updatedAtMs: item.updatedAt.millisecondsSinceEpoch,
      accessCount: item.accessCount,
      sourceId: item.sourceId,
      agentId: item.agentId,
      userId: item.userId,
      relatedMemoryIds: item.relatedMemoryIds.join('\x01'),
      parentMemoryId: item.parentMemoryId,
      supersededById: item.supersededById,
      isPinned: item.isPinned,
      isArchived: item.isArchived,
      isConsolidated: item.isConsolidated,
    );
  }

  MemoryItem toDomain() {
    return MemoryItem(
      id: uid,
      content: content,
      type: MemoryType.values.firstWhere((e) => e.name == type, orElse: () => MemoryType.episodic),
      source: MemorySource.values.firstWhere((e) => e.name == source, orElse: () => MemorySource.conversation),
      status: MemoryStatus.values.firstWhere((e) => e.name == status, orElse: () => MemoryStatus.active),
      importance: importance,
      initialStrength: initialStrength,
      strength: strength,
      emotionalValence: emotionalValence,
      surpriseScore: surpriseScore,
      keywords: _splitNull(keywords),
      entities: _splitNull(entities),
      topics: _splitNull(topics),
      embedding: embedding,
      encodingContext: encodingContextJson != null
          ? _encodingContextFromJson(encodingContextJson!)
          : null,
      metadata: _metadataFromJson(metadataJson, contentHash),      createdAt: DateTime.fromMillisecondsSinceEpoch(createdAtMs),
      accessedAt: DateTime.fromMillisecondsSinceEpoch(accessedAtMs),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(updatedAtMs),
      accessCount: accessCount,
      sourceId: sourceId,
      agentId: agentId,
      userId: userId,
      relatedMemoryIds: _splitNull(relatedMemoryIds),
      parentMemoryId: parentMemoryId,
      supersededById: supersededById,
      isPinned: isPinned,
      isArchived: isArchived,
      isConsolidated: isConsolidated,
    );
  }

  static String _computeContentHash(String content) {
    final digest = md5.convert(utf8.encode(content));
    return digest.toString();
  }

  static List<String> _splitNull(String? value) {
    if (value == null || value.isEmpty) return [];
    return value.split('\x01').where((s) => s.isNotEmpty).toList();
  }

  static EncodingContext? _encodingContextFromJson(String json) {
    try {
      final map = jsonDecode(json) as Map<String, dynamic>;
      return EncodingContext.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  static Map<String, dynamic>? _metadataFromJson(String? json, String contentHash) {
    if (json == null || json.isEmpty) {
      // metadata 为空时，仍返回包含 contentHash 的最小 map
      if (contentHash.isNotEmpty) return {'contentHash': contentHash};
      return null;
    }
    try {
      final map = jsonDecode(json) as Map<String, dynamic>;
      // 确保 metadata 中包含 contentHash（向后兼容）
      if (contentHash.isNotEmpty && !map.containsKey('contentHash')) {
        map['contentHash'] = contentHash;
      }
      return map;
    } catch (_) {
      // metadata 解析失败时，仍返回包含 contentHash 的最小 map
      if (contentHash.isNotEmpty) return {'contentHash': contentHash};
      return null;
    }
  }
}
