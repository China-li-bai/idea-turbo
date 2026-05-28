class ExtractedInsight {
  final String id;
  final String rawMessageId;
  final String? event;
  final String? preference;
  final String? mood;
  final List<String> keywords;
  final List<String> entities;
  final List<String> topics;
  final double emotionalValence;
  final double importance;
  final Map<String, dynamic> extra;
  final DateTime extractedAt;

  const ExtractedInsight({
    required this.id,
    required this.rawMessageId,
    this.event,
    this.preference,
    this.mood,
    this.keywords = const [],
    this.entities = const [],
    this.topics = const [],
    this.emotionalValence = 0.0,
    this.importance = 0.5,
    this.extra = const {},
    required this.extractedAt,
  });

  String get summary {
    final parts = <String>[];
    if (event != null) parts.add('事件: $event');
    if (preference != null) parts.add('偏好: $preference');
    if (mood != null) parts.add('情绪: $mood');
    return parts.join(' | ');
  }

  bool get hasContent => event != null || preference != null || mood != null;

  factory ExtractedInsight.fromJson(
    Map<String, dynamic> json,
    String rawMessageId,
  ) {
    return ExtractedInsight(
      id: 'insight_${rawMessageId}_${DateTime.now().millisecondsSinceEpoch}',
      rawMessageId: rawMessageId,
      event: json['event'] as String?,
      preference: json['preference'] as String?,
      mood: json['mood'] as String?,
      keywords:
          (json['keywords'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      entities:
          (json['entities'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      topics:
          (json['topics'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      emotionalValence: (json['emotionalValence'] as num?)?.toDouble() ?? 0.0,
      importance: (json['importance'] as num?)?.toDouble() ?? 0.5,
      extra: (json['extra'] as Map<String, dynamic>?) ?? {},
      extractedAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'event': event,
    'preference': preference,
    'mood': mood,
    'keywords': keywords,
    'entities': entities,
    'topics': topics,
    'emotionalValence': emotionalValence,
    'importance': importance,
    'extra': extra,
  };
}
