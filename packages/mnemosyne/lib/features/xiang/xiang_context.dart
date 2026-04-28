class SensoryTag {
  final String category;
  final String value;
  final double intensity;

  const SensoryTag({
    required this.category,
    required this.value,
    this.intensity = 1.0,
  });

  Map<String, dynamic> toJson() => {
        'category': category,
        'value': value,
        'intensity': intensity,
      };

  factory SensoryTag.fromJson(Map<String, dynamic> json) => SensoryTag(
        category: json['category'] as String,
        value: json['value'] as String,
        intensity: (json['intensity'] as num?)?.toDouble() ?? 1.0,
      );

  SensoryTag copyWith({
    String? category,
    String? value,
    double? intensity,
  }) =>
      SensoryTag(
        category: category ?? this.category,
        value: value ?? this.value,
        intensity: intensity ?? this.intensity,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SensoryTag &&
          category == other.category &&
          value == other.value &&
          intensity == other.intensity;

  @override
  int get hashCode => Object.hash(category, value, intensity);
}

class XiangContext {
  static const String metadataKey = 'xiang';

  final String? weather;
  final String? temperature;
  final String? activity;
  final String? location;
  final String? ambientMood;
  final List<SensoryTag> sensoryTags;
  final DateTime capturedAt;

  const XiangContext({
    this.weather,
    this.temperature,
    this.activity,
    this.location,
    this.ambientMood,
    this.sensoryTags = const [],
    required this.capturedAt,
  });

  List<String> get allValues {
    final values = <String?>[
      weather,
      temperature,
      activity,
      location,
      ambientMood,
    ];
    return [
      ...values.whereType<String>(),
      ...sensoryTags.map((t) => t.value),
    ];
  }

  List<SensoryTag> get allTags => [
        if (weather != null)
          SensoryTag(category: 'weather', value: weather!),
        if (temperature != null)
          SensoryTag(category: 'temperature', value: temperature!),
        if (activity != null)
          SensoryTag(category: 'activity', value: activity!),
        if (location != null)
          SensoryTag(category: 'location', value: location!),
        if (ambientMood != null)
          SensoryTag(category: 'ambientMood', value: ambientMood!),
        ...sensoryTags,
      ];

  Map<String, dynamic> toJson() => {
        'weather': weather,
        'temperature': temperature,
        'activity': activity,
        'location': location,
        'ambientMood': ambientMood,
        'sensoryTags': sensoryTags.map((t) => t.toJson()).toList(),
        'capturedAt': capturedAt.toIso8601String(),
      };

  factory XiangContext.fromJson(Map<String, dynamic> json) => XiangContext(
        weather: json['weather'] as String?,
        temperature: json['temperature'] as String?,
        activity: json['activity'] as String?,
        location: json['location'] as String?,
        ambientMood: json['ambientMood'] as String?,
        sensoryTags: (json['sensoryTags'] as List<dynamic>?)
                ?.map((t) => SensoryTag.fromJson(t as Map<String, dynamic>))
                .toList() ??
            [],
        capturedAt: DateTime.parse(json['capturedAt'] as String),
      );

  XiangContext copyWith({
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    List<SensoryTag>? sensoryTags,
    DateTime? capturedAt,
  }) =>
      XiangContext(
        weather: weather ?? this.weather,
        temperature: temperature ?? this.temperature,
        activity: activity ?? this.activity,
        location: location ?? this.location,
        ambientMood: ambientMood ?? this.ambientMood,
        sensoryTags: sensoryTags ?? this.sensoryTags,
        capturedAt: capturedAt ?? this.capturedAt,
      );

  static XiangContext? fromMemoryMetadata(Map<String, dynamic>? metadata) {
    if (metadata == null) return null;
    final data = metadata[metadataKey];
    if (data == null) return null;
    if (data is Map<String, dynamic>) return XiangContext.fromJson(data);
    return null;
  }

  static Map<String, dynamic> injectIntoMetadata(
    Map<String, dynamic>? metadata,
    XiangContext context,
  ) {
    final updated = Map<String, dynamic>.from(metadata ?? {});
    updated[metadataKey] = context.toJson();
    return updated;
  }
}
