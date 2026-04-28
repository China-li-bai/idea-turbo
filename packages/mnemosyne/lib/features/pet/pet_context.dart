import 'package:mnemosyne/core/constants.dart' show TimeOfDay;

enum PetMood {
  happy,
  sad,
  neutral,
  anxious,
  excited,
  angry,
  sleepy,
  curious,
  lonely,
  playful;

  static PetMood fromString(String value) {
    return PetMood.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => PetMood.neutral,
    );
  }

  double get arousalLevel {
    switch (this) {
      case PetMood.excited:
        return 0.9;
      case PetMood.anxious:
        return 0.8;
      case PetMood.angry:
        return 0.85;
      case PetMood.playful:
        return 0.75;
      case PetMood.happy:
        return 0.6;
      case PetMood.curious:
        return 0.55;
      case PetMood.sad:
        return 0.3;
      case PetMood.lonely:
        return 0.35;
      case PetMood.neutral:
        return 0.4;
      case PetMood.sleepy:
        return 0.15;
    }
  }

  double get valence {
    switch (this) {
      case PetMood.excited:
        return 0.8;
      case PetMood.happy:
        return 0.7;
      case PetMood.playful:
        return 0.65;
      case PetMood.curious:
        return 0.3;
      case PetMood.neutral:
        return 0.0;
      case PetMood.sleepy:
        return -0.1;
      case PetMood.lonely:
        return -0.4;
      case PetMood.anxious:
        return -0.5;
      case PetMood.sad:
        return -0.6;
      case PetMood.angry:
        return -0.7;
    }
  }
}

enum PetState {
  idle,
  thinking,
  sleeping,
  playing,
  eating,
  talking,
  exploring;

  static PetState fromString(String value) {
    return PetState.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => PetState.idle,
    );
  }
}

extension TimeOfDayPet on TimeOfDay {
  String get displayName {
    switch (this) {
      case TimeOfDay.morning:
        return '早晨';
      case TimeOfDay.afternoon:
        return '下午';
      case TimeOfDay.evening:
        return '傍晚';
      case TimeOfDay.night:
        return '深夜';
    }
  }

  static TimeOfDay fromDateTime(DateTime dt) {
    final hour = dt.hour;
    if (hour >= 6 && hour < 12) return TimeOfDay.morning;
    if (hour >= 12 && hour < 17) return TimeOfDay.afternoon;
    if (hour >= 17 && hour < 21) return TimeOfDay.evening;
    return TimeOfDay.night;
  }
}

class PetContext {
  final PetMood mood;
  final PetState state;
  final TimeOfDay timeOfDay;
  final bool isWeekend;
  final String? weather;
  final String? temperature;
  final String? activity;
  final String? location;
  final String? ambientMood;
  final DateTime capturedAt;

  PetContext({
    this.mood = PetMood.neutral,
    this.state = PetState.idle,
    TimeOfDay? timeOfDay,
    this.isWeekend = false,
    this.weather,
    this.temperature,
    this.activity,
    this.location,
    this.ambientMood,
    DateTime? capturedAt,
  })  : timeOfDay = timeOfDay ?? TimeOfDay.night,
        capturedAt = capturedAt ?? DateTime.now();

  factory PetContext.capture({
    PetMood mood = PetMood.neutral,
    PetState state = PetState.idle,
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    DateTime? now,
  }) {
    now ??= DateTime.now();
    return PetContext(
      mood: mood,
      state: state,
      timeOfDay: TimeOfDayPet.fromDateTime(now),
      isWeekend: now.weekday >= 6,
      weather: weather,
      temperature: temperature,
      activity: activity,
      location: location,
      ambientMood: ambientMood ?? _moodToAmbient(mood),
      capturedAt: now,
    );
  }

  static String? _moodToAmbient(PetMood mood) {
    switch (mood) {
      case PetMood.happy:
      case PetMood.excited:
      case PetMood.playful:
        return '热闹';
      case PetMood.sleepy:
        return '安静';
      case PetMood.sad:
      case PetMood.lonely:
        return '平静';
      case PetMood.anxious:
      case PetMood.angry:
        return '紧张';
      case PetMood.neutral:
      case PetMood.curious:
        return null;
    }
  }

  String get activityDescription {
    if (activity != null) return activity!;
    return switch (state) {
      PetState.idle => '休息',
      PetState.thinking => '思考',
      PetState.sleeping => '睡觉',
      PetState.playing => '玩耍',
      PetState.eating => '吃东西',
      PetState.talking => '聊天',
      PetState.exploring => '探索',
    };
  }

  String get locationDescription {
    if (location != null) return location!;
    return switch (timeOfDay) {
      TimeOfDay.morning => '家',
      TimeOfDay.afternoon => '家',
      TimeOfDay.evening => '家',
      TimeOfDay.night => '卧室',
    };
  }

  Map<String, dynamic> toJson() => {
        'mood': mood.name,
        'state': state.name,
        'timeOfDay': timeOfDay.name,
        'isWeekend': isWeekend,
        'weather': weather,
        'temperature': temperature,
        'activity': activity,
        'location': location,
        'ambientMood': ambientMood,
        'capturedAt': capturedAt.toIso8601String(),
      };

  factory PetContext.fromJson(Map<String, dynamic> json) => PetContext(
        mood: PetMood.fromString(json['mood'] as String? ?? 'neutral'),
        state: PetState.fromString(json['state'] as String? ?? 'idle'),
        timeOfDay: json['timeOfDay'] != null
            ? TimeOfDay.values.firstWhere(
                (e) => e.name == json['timeOfDay'],
                orElse: () => TimeOfDay.night,
              )
            : null,
        isWeekend: json['isWeekend'] as bool? ?? false,
        weather: json['weather'] as String?,
        temperature: json['temperature'] as String?,
        activity: json['activity'] as String?,
        location: json['location'] as String?,
        ambientMood: json['ambientMood'] as String?,
        capturedAt: json['capturedAt'] != null
            ? DateTime.parse(json['capturedAt'] as String)
            : null,
      );

  PetContext copyWith({
    PetMood? mood,
    PetState? state,
    TimeOfDay? timeOfDay,
    bool? isWeekend,
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    DateTime? capturedAt,
  }) =>
      PetContext(
        mood: mood ?? this.mood,
        state: state ?? this.state,
        timeOfDay: timeOfDay ?? this.timeOfDay,
        isWeekend: isWeekend ?? this.isWeekend,
        weather: weather ?? this.weather,
        temperature: temperature ?? this.temperature,
        activity: activity ?? this.activity,
        location: location ?? this.location,
        ambientMood: ambientMood ?? this.ambientMood,
        capturedAt: capturedAt ?? this.capturedAt,
      );
}
