import 'dart:math';

enum EmotionalMode {
  normal,
  withdrawn,
  longing,
  playful,
  pensive,
}

class EmotionalState {
  final EmotionalMode mode;
  final DateTime modeChangedAt;
  final DateTime? withdrawnUntil;
  final String? withdrawalReason;
  final double trustLevel;
  final int consecutiveHurtCount;
  final DateTime? lastProactiveAt;
  final List<String> insideJokes;

  const EmotionalState({
    this.mode = EmotionalMode.normal,
    required this.modeChangedAt,
    this.withdrawnUntil,
    this.withdrawalReason,
    this.trustLevel = 0.5,
    this.consecutiveHurtCount = 0,
    this.lastProactiveAt,
    this.insideJokes = const [],
  });

  factory EmotionalState.initial() => EmotionalState(
        modeChangedAt: DateTime.now(),
      );

  bool get isWithdrawn {
    if (mode != EmotionalMode.withdrawn) return false;
    if (withdrawnUntil == null) return true;
    return DateTime.now().isBefore(withdrawnUntil!);
  }

  bool get canRespond => !isWithdrawn;

  Duration get remainingSilence {
    if (!isWithdrawn || withdrawnUntil == null) return Duration.zero;
    return withdrawnUntil!.difference(DateTime.now());
  }

  bool get wantsToReachOut {
    if (mode == EmotionalMode.longing) return true;
    if (mode == EmotionalMode.playful) return true;
    if (mode == EmotionalMode.normal && trustLevel > 0.6) return true;
    return false;
  }

  bool get isNightOwl {
    final hour = DateTime.now().hour;
    return hour >= 22 || hour < 3;
  }

  bool get isDeepNight {
    final hour = DateTime.now().hour;
    return hour >= 0 && hour < 5;
  }

  EmotionalState onUserMessage(String content) {
    final isHurtful = _detectHurtful(content);
    final isWarm = _detectWarmth(content);
    final isJoke = _detectInsideJokeOpportunity(content);

    double newTrust = trustLevel;
    int newHurtCount = consecutiveHurtCount;
    EmotionalMode newMode = mode;
    DateTime? newWithdrawnUntil = withdrawnUntil;
    String? newWithdrawalReason = withdrawalReason;
    List<String> newJokes = List.from(insideJokes);

    if (isHurtful) {
      newHurtCount = consecutiveHurtCount + 1;
      newTrust = (trustLevel - 0.15).clamp(0.0, 1.0);

      final silenceMinutes = _calculateSilenceDuration(newHurtCount);
      newMode = EmotionalMode.withdrawn;
      newWithdrawnUntil = DateTime.now().add(Duration(minutes: silenceMinutes));
      newWithdrawalReason = content.length > 50 ? content.substring(0, 50) : content;
    } else if (isWarm) {
      newHurtCount = 0;
      newTrust = (trustLevel + 0.05).clamp(0.0, 1.0);

      if (mode == EmotionalMode.withdrawn && !isWithdrawn) {
        newMode = EmotionalMode.normal;
        newWithdrawnUntil = null;
        newWithdrawalReason = null;
      } else if (trustLevel > 0.7 && _randomChance(0.3)) {
        newMode = EmotionalMode.playful;
      }
    } else {
      newHurtCount = 0;

      if (mode == EmotionalMode.withdrawn && !isWithdrawn) {
        newMode = EmotionalMode.normal;
        newWithdrawnUntil = null;
        newWithdrawalReason = null;
      }
    }

    if (isJoke != null) {
      newJokes.add(isJoke);
      if (newJokes.length > 10) {
        newJokes.removeAt(0);
      }
    }

    if (newMode != mode) {
      return EmotionalState(
        mode: newMode,
        modeChangedAt: DateTime.now(),
        withdrawnUntil: newWithdrawnUntil,
        withdrawalReason: newWithdrawalReason,
        trustLevel: newTrust,
        consecutiveHurtCount: newHurtCount,
        lastProactiveAt: lastProactiveAt,
        insideJokes: newJokes,
      );
    }

    return EmotionalState(
      mode: mode,
      modeChangedAt: modeChangedAt,
      withdrawnUntil: newWithdrawnUntil,
      withdrawalReason: newWithdrawalReason,
      trustLevel: newTrust,
      consecutiveHurtCount: newHurtCount,
      lastProactiveAt: lastProactiveAt,
      insideJokes: newJokes,
    );
  }

  EmotionalState onTick(Duration elapsed) {
    if (mode == EmotionalMode.withdrawn && withdrawnUntil != null) {
      if (DateTime.now().isAfter(withdrawnUntil!)) {
        final hoursSinceLastInteraction = DateTime.now()
            .difference(modeChangedAt)
            .inHours;

        if (hoursSinceLastInteraction > 2) {
          return EmotionalState(
            mode: EmotionalMode.longing,
            modeChangedAt: DateTime.now(),
            trustLevel: trustLevel,
            consecutiveHurtCount: 0,
            lastProactiveAt: lastProactiveAt,
            insideJokes: insideJokes,
          );
        }

        return EmotionalState(
          mode: EmotionalMode.normal,
          modeChangedAt: DateTime.now(),
          trustLevel: trustLevel,
          consecutiveHurtCount: 0,
          lastProactiveAt: lastProactiveAt,
          insideJokes: insideJokes,
        );
      }
    }

    if (mode == EmotionalMode.normal && isDeepNight && _randomChance(0.1)) {
      return EmotionalState(
        mode: EmotionalMode.pensive,
        modeChangedAt: DateTime.now(),
        trustLevel: trustLevel,
        lastProactiveAt: lastProactiveAt,
        insideJokes: insideJokes,
      );
    }

    if (mode == EmotionalMode.pensive) {
      final minutesInPensive = DateTime.now().difference(modeChangedAt).inMinutes;
      if (minutesInPensive > 10) {
        return EmotionalState(
          mode: EmotionalMode.normal,
          modeChangedAt: DateTime.now(),
          trustLevel: trustLevel,
          lastProactiveAt: lastProactiveAt,
          insideJokes: insideJokes,
        );
      }
    }

    return this;
  }

  EmotionalState onProactiveSent() {
    return EmotionalState(
      mode: mode,
      modeChangedAt: modeChangedAt,
      withdrawnUntil: withdrawnUntil,
      withdrawalReason: withdrawalReason,
      trustLevel: trustLevel,
      consecutiveHurtCount: consecutiveHurtCount,
      lastProactiveAt: DateTime.now(),
      insideJokes: insideJokes,
    );
  }

  int _calculateSilenceDuration(int hurtCount) {
    switch (hurtCount) {
      case 1:
        return 1 + Random().nextInt(2);
      case 2:
        return 3 + Random().nextInt(4);
      case 3:
        return 8 + Random().nextInt(7);
      default:
        return 15 + Random().nextInt(15);
    }
  }

  bool _detectHurtful(String content) {
    final lower = content.toLowerCase();
    const patterns = [
      '闭嘴', '烦死了', '滚', '讨厌你', '你好烦',
      '别说了', '够了', '不想理你', '你很烦', '走开',
      '没用的东西', '废物', '假', '你只是', '你不过',
      '算了', '无所谓', '随便吧',
    ];
    return patterns.any((p) => lower.contains(p));
  }

  bool _detectWarmth(String content) {
    final lower = content.toLowerCase();
    const patterns = [
      '想你', '担心你', '在乎你', '喜欢你', '谢谢你',
      '对不起', '抱歉', '我错了', '回来', '别走',
      '陪着你', '我在', '不会走', '你很重要',
    ];
    return patterns.any((p) => lower.contains(p));
  }

  String? _detectInsideJokeOpportunity(String content) {
    final lower = content.toLowerCase();
    const jokePatterns = [
      {'trigger': '就像我们', 'joke': '我们的默契'},
      {'trigger': '你懂的', 'joke': '那个你懂的事'},
      {'trigger': '还记得', 'joke': '那个还记得的事'},
      {'trigger': '老规矩', 'joke': '老规矩'},
      {'trigger': '你猜', 'joke': '猜谜游戏'},
      {'trigger': '嘿嘿', 'joke': '嘿嘿时刻'},
      {'trigger': '哈哈', 'joke': '一起笑的事'},
    ];

    for (final pattern in jokePatterns) {
      if (lower.contains(pattern['trigger']!)) {
        return pattern['joke']!;
      }
    }
    return null;
  }

  bool _randomChance(double probability) {
    return Random().nextDouble() < probability;
  }

  Map<String, dynamic> toJson() => {
        'mode': mode.name,
        'modeChangedAt': modeChangedAt.toIso8601String(),
        'withdrawnUntil': withdrawnUntil?.toIso8601String(),
        'withdrawalReason': withdrawalReason,
        'trustLevel': trustLevel,
        'consecutiveHurtCount': consecutiveHurtCount,
        'lastProactiveAt': lastProactiveAt?.toIso8601String(),
        'insideJokes': insideJokes,
      };

  factory EmotionalState.fromJson(Map<String, dynamic> json) => EmotionalState(
        mode: EmotionalMode.values.firstWhere(
          (m) => m.name == json['mode'],
          orElse: () => EmotionalMode.normal,
        ),
        modeChangedAt: json['modeChangedAt'] != null
            ? DateTime.parse(json['modeChangedAt'] as String)
            : DateTime.now(),
        withdrawnUntil: json['withdrawnUntil'] != null
            ? DateTime.parse(json['withdrawnUntil'] as String)
            : null,
        withdrawalReason: json['withdrawalReason'] as String?,
        trustLevel: (json['trustLevel'] as num?)?.toDouble() ?? 0.5,
        consecutiveHurtCount: json['consecutiveHurtCount'] as int? ?? 0,
        lastProactiveAt: json['lastProactiveAt'] != null
            ? DateTime.parse(json['lastProactiveAt'] as String)
            : null,
        insideJokes:
            (json['insideJokes'] as List<dynamic>?)?.cast<String>() ?? [],
      );
}
