import 'package:mnemosyne/core/constants.dart';

class EncodingContext {
  final UserMood? userMood;
  final TimeOfDay? timeOfDay;
  final DayOfWeek? dayOfWeek;
  final String? conversationTopic;
  final double? arousalLevel;
  final double? valence;
  final SocialContext? socialContext;
  final DateTime? capturedAt;

  const EncodingContext({
    this.userMood,
    this.timeOfDay,
    this.dayOfWeek,
    this.conversationTopic,
    this.arousalLevel,
    this.valence,
    this.socialContext,
    this.capturedAt,
  });

  factory EncodingContext.capture({
    UserMood? userMood,
    String? conversationTopic,
    double? arousalLevel,
    double? valence,
    SocialContext? socialContext,
  }) {
    final now = DateTime.now();
    final hour = now.hour;
    TimeOfDay? timeOfDay;
    if (hour >= 6 && hour < 12) {
      timeOfDay = TimeOfDay.morning;
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = TimeOfDay.afternoon;
    } else if (hour >= 18 && hour < 22) {
      timeOfDay = TimeOfDay.evening;
    } else {
      timeOfDay = TimeOfDay.night;
    }

    final weekday = now.weekday;
    final dayOfWeek = (weekday >= DateTime.monday && weekday <= DateTime.friday)
        ? DayOfWeek.weekday
        : DayOfWeek.weekend;

    return EncodingContext(
      userMood: userMood,
      timeOfDay: timeOfDay,
      dayOfWeek: dayOfWeek,
      conversationTopic: conversationTopic,
      arousalLevel: arousalLevel,
      valence: valence,
      socialContext: socialContext,
      capturedAt: now,
    );
  }

  double calculateMatchScore(EncodingContext other) {
    double score = 0.0;
    double totalWeight = 0.0;

    final moodWeight = 0.25;
    if (userMood != null && other.userMood != null) {
      score += _moodSimilarity(userMood!, other.userMood!) * moodWeight;
      totalWeight += moodWeight;
    }

    final arousalWeight = 0.20;
    if (arousalLevel != null && other.arousalLevel != null) {
      final arousalDiff = (arousalLevel! - other.arousalLevel!).abs();
      score += (1.0 - arousalDiff) * arousalWeight;
      totalWeight += arousalWeight;
    }

    final valenceWeight = 0.15;
    if (valence != null && other.valence != null) {
      final valenceDiff = (valence! - other.valence!).abs() / 2.0;
      score += (1.0 - valenceDiff) * valenceWeight;
      totalWeight += valenceWeight;
    }

    final timeWeight = 0.15;
    if (timeOfDay != null && other.timeOfDay != null) {
      score += (timeOfDay == other.timeOfDay ? 1.0 : 0.0) * timeWeight;
      totalWeight += timeWeight;
    }

    final dayWeight = 0.10;
    if (dayOfWeek != null && other.dayOfWeek != null) {
      score += (dayOfWeek == other.dayOfWeek ? 1.0 : 0.0) * dayWeight;
      totalWeight += dayWeight;
    }

    final topicWeight = 0.10;
    if (conversationTopic != null && other.conversationTopic != null) {
      if (conversationTopic!.toLowerCase().contains(other.conversationTopic!.toLowerCase()) ||
          other.conversationTopic!.toLowerCase().contains(conversationTopic!.toLowerCase())) {
        score += 1.0 * topicWeight;
      }
      totalWeight += topicWeight;
    }

    final socialWeight = 0.05;
    if (socialContext != null && other.socialContext != null) {
      score += (socialContext == other.socialContext ? 1.0 : 0.0) * socialWeight;
      totalWeight += socialWeight;
    }

    return totalWeight > 0 ? score / totalWeight : 0.0;
  }

  double _moodSimilarity(UserMood a, UserMood b) {
    if (a == b) return 1.0;

    const moodValence = <UserMood, double>{
      UserMood.happy: 0.8,
      UserMood.excited: 0.9,
      UserMood.neutral: 0.0,
      UserMood.anxious: -0.4,
      UserMood.sad: -0.7,
      UserMood.angry: -0.8,
    };

    const moodArousal = <UserMood, double>{
      UserMood.happy: 0.5,
      UserMood.excited: 0.9,
      UserMood.neutral: 0.1,
      UserMood.anxious: 0.7,
      UserMood.sad: 0.2,
      UserMood.angry: 0.8,
    };

    final valenceDiff = ((moodValence[a] ?? 0) - (moodValence[b] ?? 0)).abs() / 2.0;
    final arousalDiff = ((moodArousal[a] ?? 0) - (moodArousal[b] ?? 0)).abs();

    return 1.0 - (valenceDiff * 0.6 + arousalDiff * 0.4);
  }

  Map<String, dynamic> toJson() {
    return {
      'userMood': userMood?.name,
      'timeOfDay': timeOfDay?.name,
      'dayOfWeek': dayOfWeek?.name,
      'conversationTopic': conversationTopic,
      'arousalLevel': arousalLevel,
      'valence': valence,
      'socialContext': socialContext?.name,
      'capturedAt': capturedAt?.toIso8601String(),
    };
  }

  factory EncodingContext.fromJson(Map<String, dynamic> json) {
    return EncodingContext(
      userMood: json['userMood'] != null
          ? UserMood.values.firstWhere((e) => e.name == json['userMood'], orElse: () => UserMood.neutral)
          : null,
      timeOfDay: json['timeOfDay'] != null
          ? TimeOfDay.values.firstWhere((e) => e.name == json['timeOfDay'], orElse: () => TimeOfDay.morning)
          : null,
      dayOfWeek: json['dayOfWeek'] != null
          ? DayOfWeek.values.firstWhere((e) => e.name == json['dayOfWeek'], orElse: () => DayOfWeek.weekday)
          : null,
      conversationTopic: json['conversationTopic'],
      arousalLevel: json['arousalLevel']?.toDouble(),
      valence: json['valence']?.toDouble(),
      socialContext: json['socialContext'] != null
          ? SocialContext.values.firstWhere((e) => e.name == json['socialContext'], orElse: () => SocialContext.alone)
          : null,
      capturedAt: json['capturedAt'] != null ? DateTime.parse(json['capturedAt']) : null,
    );
  }

  EncodingContext copyWith({
    UserMood? userMood,
    TimeOfDay? timeOfDay,
    DayOfWeek? dayOfWeek,
    String? conversationTopic,
    double? arousalLevel,
    double? valence,
    SocialContext? socialContext,
    DateTime? capturedAt,
  }) {
    return EncodingContext(
      userMood: userMood ?? this.userMood,
      timeOfDay: timeOfDay ?? this.timeOfDay,
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      conversationTopic: conversationTopic ?? this.conversationTopic,
      arousalLevel: arousalLevel ?? this.arousalLevel,
      valence: valence ?? this.valence,
      socialContext: socialContext ?? this.socialContext,
      capturedAt: capturedAt ?? this.capturedAt,
    );
  }
}
