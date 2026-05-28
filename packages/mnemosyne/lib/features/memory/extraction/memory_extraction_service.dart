import 'raw_message.dart';
import 'extracted_insight.dart';

class ExtractionConfig {
  final int maxBatchSize;
  final Duration processingInterval;
  final double minImportanceToStore;
  final bool enableAutoExtraction;
  final String extractionPromptTemplate;

  const ExtractionConfig({
    this.maxBatchSize = 10,
    this.processingInterval = const Duration(minutes: 5),
    this.minImportanceToStore = 0.3,
    this.enableAutoExtraction = true,
    this.extractionPromptTemplate = _defaultPromptTemplate,
  });

  static const _defaultPromptTemplate = r'''
你是一个记忆提取引擎。请从以下用户对话中提取结构化信息，以JSON格式输出。

输出格式：
{
  "event": "提取的核心事件（如：老板让改需求导致厌恶）",
  "preference": "提取的偏好（如：想吃炸鸡解压）",
  "mood": "情绪状态（如：烦躁、开心、焦虑）",
  "keywords": ["关键词1", "关键词2"],
  "entities": ["实体1", "实体2"],
  "topics": ["话题1", "话题2"],
  "emotionalValence": -0.6,
  "importance": 0.7,
  "extra": {
    "xiang": {
      "innerState": "用户内在状态，如孤独、期待、烦躁、安心",
      "relationshipState": "关系状态，如信任、疏远、依赖、试探",
      "eventShape": "事件之象，如confession、promise、conflict、ritual、preference",
      "changeSignal": "变化之象，如becoming_closer、withdrawing、awakening",
      "recallCues": ["后续可触发回忆的词、场景、时间、地点、语气"]
    }
  }
}

规则：
1. emotionalValence 范围 [-1.0, 1.0]，负面情绪为负值
2. importance 范围 [0.0, 1.0]，涉及核心偏好/重大事件时更高
3. 如果对话中没有有价值的信息，返回空JSON: {}
4. extra.xiang 只提取对话中明确出现或强烈暗示的象，不确定就省略字段
5. recallCues 应该短、具体、可复现，例如"雨夜"、"不想回消息"、"小灯"
6. 绝不编造对话中不存在的信息

用户对话：
""";
''';
}

abstract class LlmExtractor {
  Future<Map<String, dynamic>?> extract(String content, String promptTemplate);
}

abstract class MemoryExtractionService {
  Future<RawMessage> ingest(
    String content, {
    String? speakerId,
    String? petId,
    String source = 'conversation',
    Map<String, dynamic>? metadata,
  });
  Future<ExtractedInsight?> extractInsight(RawMessage message);
  Future<List<ExtractedInsight>> processBatch(List<RawMessage> messages);
  List<RawMessage> getPendingMessages({int? limit});
  Future<void> markProcessed(String rawMessageId);
}

class DefaultMemoryExtractionService implements MemoryExtractionService {
  final ExtractionConfig config;
  final LlmExtractor? _llmExtractor;
  final List<RawMessage> _pendingMessages = [];
  final Map<String, RawMessage> _allMessages = {};
  final Map<String, ExtractedInsight> _extractedInsights = {};

  DefaultMemoryExtractionService({
    this.config = const ExtractionConfig(),
    LlmExtractor? llmExtractor,
  }) : _llmExtractor = llmExtractor;

  @override
  Future<RawMessage> ingest(
    String content, {
    String? speakerId,
    String? petId,
    String source = 'conversation',
    Map<String, dynamic>? metadata,
  }) async {
    final message = RawMessage(
      id: 'raw_${DateTime.now().millisecondsSinceEpoch}_${content.hashCode.abs()}',
      content: content,
      source: source,
      speakerId: speakerId,
      petId: petId,
      timestamp: DateTime.now(),
      metadata: metadata ?? {},
    );

    _pendingMessages.add(message);
    _allMessages[message.id] = message;

    return message;
  }

  @override
  Future<ExtractedInsight?> extractInsight(RawMessage message) async {
    if (_llmExtractor == null) return null;

    final jsonResult = await _llmExtractor.extract(
      message.content,
      config.extractionPromptTemplate,
    );

    if (jsonResult == null || jsonResult.isEmpty) return null;

    final insight = ExtractedInsight.fromJson(jsonResult, message.id);

    if (!insight.hasContent) return null;
    if (insight.importance < config.minImportanceToStore) return null;

    _extractedInsights[message.id] = insight;
    await markProcessed(message.id);

    return insight;
  }

  @override
  Future<List<ExtractedInsight>> processBatch(List<RawMessage> messages) async {
    final insights = <ExtractedInsight>[];
    final batch = messages.take(config.maxBatchSize).toList();

    for (final message in batch) {
      if (message.isProcessed) continue;
      final insight = await extractInsight(message);
      if (insight != null) {
        insights.add(insight);
      }
    }

    return insights;
  }

  @override
  List<RawMessage> getPendingMessages({int? limit}) {
    final pending = _pendingMessages.where((m) => !m.isProcessed).toList();
    if (limit != null && pending.length > limit) {
      return pending.sublist(0, limit);
    }
    return pending;
  }

  @override
  Future<void> markProcessed(String rawMessageId) async {
    final index = _pendingMessages.indexWhere((m) => m.id == rawMessageId);
    if (index >= 0) {
      _pendingMessages[index] = _pendingMessages[index].markProcessed();
      _allMessages[rawMessageId] = _pendingMessages[index];
    }
  }
}
