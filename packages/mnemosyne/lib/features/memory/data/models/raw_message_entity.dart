import 'dart:convert';
import 'package:objectbox/objectbox.dart';
import 'package:mnemosyne/features/memory/extraction/raw_message.dart';

/// RawMessage 的 ObjectBox 持久化实体（P0 #6 修复）。
///
/// 之前 RawMessage 仅存在于 DefaultMemoryExtractionService 的内存 List/Map 中，
/// 应用重启后未处理的消息会丢失。现在持久化到 ObjectBox。
@Entity()
class RawMessageEntity {
  @Id()
  int obId = 0;

  String uid;
  String content;
  String source;
  String? speakerId;
  String? petId;

  int timestampMs;
  bool isProcessed;
  int? processedAtMs;

  String? metadataJson;

  RawMessageEntity({
    this.obId = 0,
    required this.uid,
    required this.content,
    this.source = 'conversation',
    this.speakerId,
    this.petId,
    required this.timestampMs,
    this.isProcessed = false,
    this.processedAtMs,
    this.metadataJson,
  });

  factory RawMessageEntity.fromDomain(RawMessage message) {
    return RawMessageEntity(
      uid: message.id,
      content: message.content,
      source: message.source,
      speakerId: message.speakerId,
      petId: message.petId,
      timestampMs: message.timestamp.millisecondsSinceEpoch,
      isProcessed: message.isProcessed,
      processedAtMs: message.processedAt?.millisecondsSinceEpoch,
      metadataJson: message.metadata.isNotEmpty
          ? jsonEncode(message.metadata)
          : null,
    );
  }

  RawMessage toDomain() {
    return RawMessage(
      id: uid,
      content: content,
      source: source,
      speakerId: speakerId,
      petId: petId,
      timestamp: DateTime.fromMillisecondsSinceEpoch(timestampMs),
      isProcessed: isProcessed,
      processedAt: processedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(processedAtMs!)
          : null,
      metadata: _parseMetadata(metadataJson),
    );
  }

  static Map<String, dynamic> _parseMetadata(String? json) {
    if (json == null || json.isEmpty) return {};
    try {
      return jsonDecode(json) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }
}
