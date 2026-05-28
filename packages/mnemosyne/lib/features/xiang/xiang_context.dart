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

  SensoryTag copyWith({String? category, String? value, double? intensity}) =>
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
  final String? innerState;
  final String? relationshipState;
  final String? eventShape;
  final String? changeSignal;
  final List<SensoryTag> sensoryTags;
  final List<SensoryTag> recallCues;
  final DateTime capturedAt;

  const XiangContext({
    this.weather,
    this.temperature,
    this.activity,
    this.location,
    this.ambientMood,
    this.innerState,
    this.relationshipState,
    this.eventShape,
    this.changeSignal,
    this.sensoryTags = const [],
    this.recallCues = const [],
    required this.capturedAt,
  });

  List<String> get allValues {
    final values = <String?>[
      weather,
      temperature,
      activity,
      location,
      ambientMood,
      innerState,
      relationshipState,
      eventShape,
      changeSignal,
    ];
    return [
      ...values.whereType<String>(),
      ...sensoryTags.map((t) => t.value),
      ...recallCues.map((t) => t.value),
    ];
  }

  List<SensoryTag> get allTags => [
    if (weather != null) SensoryTag(category: 'weather', value: weather!),
    if (temperature != null)
      SensoryTag(category: 'temperature', value: temperature!),
    if (activity != null) SensoryTag(category: 'activity', value: activity!),
    if (location != null) SensoryTag(category: 'location', value: location!),
    if (ambientMood != null)
      SensoryTag(category: 'ambientMood', value: ambientMood!),
    if (innerState != null)
      SensoryTag(category: 'innerState', value: innerState!),
    if (relationshipState != null)
      SensoryTag(category: 'relationshipState', value: relationshipState!),
    if (eventShape != null)
      SensoryTag(category: 'eventShape', value: eventShape!),
    if (changeSignal != null)
      SensoryTag(category: 'changeSignal', value: changeSignal!),
    ...sensoryTags,
    ...recallCues,
  ];

  Map<String, dynamic> toJson() => {
    'weather': weather,
    'temperature': temperature,
    'activity': activity,
    'location': location,
    'ambientMood': ambientMood,
    'innerState': innerState,
    'relationshipState': relationshipState,
    'eventShape': eventShape,
    'changeSignal': changeSignal,
    'sensoryTags': sensoryTags.map((t) => t.toJson()).toList(),
    'recallCues': recallCues.map((t) => t.toJson()).toList(),
    'capturedAt': capturedAt.toIso8601String(),
  };

  factory XiangContext.fromJson(Map<String, dynamic> json) => XiangContext(
    weather: json['weather'] as String?,
    temperature: json['temperature'] as String?,
    activity: json['activity'] as String?,
    location: json['location'] as String?,
    ambientMood: json['ambientMood'] as String?,
    innerState: json['innerState'] as String?,
    relationshipState: json['relationshipState'] as String?,
    eventShape: json['eventShape'] as String?,
    changeSignal: json['changeSignal'] as String?,
    sensoryTags:
        (json['sensoryTags'] as List<dynamic>?)
            ?.map((t) => SensoryTag.fromJson(t as Map<String, dynamic>))
            .toList() ??
        [],
    recallCues:
        (json['recallCues'] as List<dynamic>?)
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
    String? innerState,
    String? relationshipState,
    String? eventShape,
    String? changeSignal,
    List<SensoryTag>? sensoryTags,
    List<SensoryTag>? recallCues,
    DateTime? capturedAt,
  }) => XiangContext(
    weather: weather ?? this.weather,
    temperature: temperature ?? this.temperature,
    activity: activity ?? this.activity,
    location: location ?? this.location,
    ambientMood: ambientMood ?? this.ambientMood,
    innerState: innerState ?? this.innerState,
    relationshipState: relationshipState ?? this.relationshipState,
    eventShape: eventShape ?? this.eventShape,
    changeSignal: changeSignal ?? this.changeSignal,
    sensoryTags: sensoryTags ?? this.sensoryTags,
    recallCues: recallCues ?? this.recallCues,
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
