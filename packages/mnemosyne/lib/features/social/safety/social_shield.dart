import 'prompt_injection_defense.dart';

enum ShieldMode {
  open,
  quiet,
  invisible,
  strict,
}

class ShieldConfig {
  final ShieldMode mode;
  final double minMatchScoreForContact;
  final bool allowSameGenderOnly;
  final bool allowSameCityOnly;
  final bool blockStrangersWithoutMbti;
  final int maxStrangerMessagesPerDay;
  final bool enableAutoBlock;
  final double autoBlockCreepinessThreshold;

  const ShieldConfig({
    this.mode = ShieldMode.open,
    this.minMatchScoreForContact = 0.0,
    this.allowSameGenderOnly = false,
    this.allowSameCityOnly = false,
    this.blockStrangersWithoutMbti = false,
    this.maxStrangerMessagesPerDay = 50,
    this.enableAutoBlock = true,
    this.autoBlockCreepinessThreshold = 0.8,
  });

  static const ShieldConfig socialAnxiety = ShieldConfig(
    mode: ShieldMode.invisible,
    minMatchScoreForContact: 0.9,
    allowSameGenderOnly: true,
    allowSameCityOnly: true,
    blockStrangersWithoutMbti: true,
    maxStrangerMessagesPerDay: 5,
    enableAutoBlock: true,
    autoBlockCreepinessThreshold: 0.5,
  );

  static const ShieldConfig quiet = ShieldConfig(
    mode: ShieldMode.quiet,
    minMatchScoreForContact: 0.6,
    allowSameCityOnly: true,
    maxStrangerMessagesPerDay: 15,
    enableAutoBlock: true,
    autoBlockCreepinessThreshold: 0.7,
  );

  static const ShieldConfig strict = ShieldConfig(
    mode: ShieldMode.strict,
    minMatchScoreForContact: 0.7,
    maxStrangerMessagesPerDay: 20,
    enableAutoBlock: true,
    autoBlockCreepinessThreshold: 0.6,
  );
}

class ShieldState {
  final String userId;
  final ShieldConfig config;
  final Set<String> blockedUserIds;
  final Set<String> allowedUserIds;
  final Map<String, int> dailyMessageCounts;
  final DateTime lastUpdated;

  const ShieldState({
    required this.userId,
    required this.config,
    this.blockedUserIds = const {},
    this.allowedUserIds = const {},
    this.dailyMessageCounts = const {},
    required this.lastUpdated,
  });

  ShieldState copyWith({
    String? userId,
    ShieldConfig? config,
    Set<String>? blockedUserIds,
    Set<String>? allowedUserIds,
    Map<String, int>? dailyMessageCounts,
    DateTime? lastUpdated,
  }) =>
      ShieldState(
        userId: userId ?? this.userId,
        config: config ?? this.config,
        blockedUserIds: blockedUserIds ?? this.blockedUserIds,
        allowedUserIds: allowedUserIds ?? this.allowedUserIds,
        dailyMessageCounts: dailyMessageCounts ?? this.dailyMessageCounts,
        lastUpdated: lastUpdated ?? this.lastUpdated,
      );
}

class ShieldDecision {
  final bool allowed;
  final String? reason;
  final bool shouldNotify;
  final String? notificationMessage;
  final ShieldMode effectiveMode;

  const ShieldDecision({
    required this.allowed,
    this.reason,
    required this.shouldNotify,
    this.notificationMessage,
    required this.effectiveMode,
  });
}

abstract class SocialShield {
  ShieldState getState(String userId);
  ShieldState setMode(String userId, ShieldConfig config);
  ShieldDecision evaluateIncoming(
    String userId,
    String strangerId, {
    double? matchScore,
    String? strangerGender,
    String? userGender,
    String? strangerCity,
    String? userCity,
    String? strangerMbti,
    String? message,
  });
  ShieldState blockUser(String userId, String strangerId);
  ShieldState unblockUser(String userId, String strangerId);
  ShieldState allowUser(String userId, String strangerId);
  void resetDailyCounts();
}

class DefaultSocialShield implements SocialShield {
  final PromptInjectionDefense _injectionDefense;
  final Map<String, ShieldState> _states = {};

  DefaultSocialShield({
    PromptInjectionDefense? injectionDefense,
  }) : _injectionDefense =
            injectionDefense ?? DefaultPromptInjectionDefense();

  @override
  ShieldState getState(String userId) {
    return _states[userId] ?? ShieldState(
      userId: userId,
      config: const ShieldConfig(),
      lastUpdated: DateTime.now(),
    );
  }

  @override
  ShieldState setMode(String userId, ShieldConfig config) {
    final current = getState(userId);
    final updated = current.copyWith(
      config: config,
      lastUpdated: DateTime.now(),
    );
    _states[userId] = updated;
    return updated;
  }

  @override
  ShieldDecision evaluateIncoming(
    String userId,
    String strangerId, {
    double? matchScore,
    String? strangerGender,
    String? userGender,
    String? strangerCity,
    String? userCity,
    String? strangerMbti,
    String? message,
  }) {
    final state = getState(userId);
    final config = state.config;

    if (config.mode == ShieldMode.invisible) {
      return ShieldDecision(
        allowed: false,
        reason: '护盾模式：隐身中',
        shouldNotify: false,
        effectiveMode: config.mode,
      );
    }

    if (state.blockedUserIds.contains(strangerId)) {
      return ShieldDecision(
        allowed: false,
        reason: '用户已被屏蔽',
        shouldNotify: false,
        effectiveMode: config.mode,
      );
    }

    if (state.allowedUserIds.contains(strangerId)) {
      return ShieldDecision(
        allowed: true,
        shouldNotify: true,
        notificationMessage: '你的好友$strangerId来找你的宠物了~',
        effectiveMode: config.mode,
      );
    }

    if (matchScore != null &&
        matchScore < config.minMatchScoreForContact) {
      return ShieldDecision(
        allowed: false,
        reason: '匹配度不足${(config.minMatchScoreForContact * 100).toInt()}%',
        shouldNotify: false,
        effectiveMode: config.mode,
      );
    }

    if (config.allowSameGenderOnly &&
        strangerGender != null &&
        userGender != null &&
        strangerGender != userGender) {
      return ShieldDecision(
        allowed: false,
        reason: '仅允许同性别搭讪',
        shouldNotify: false,
        effectiveMode: config.mode,
      );
    }

    if (config.allowSameCityOnly &&
        strangerCity != null &&
        userCity != null &&
        strangerCity != userCity) {
      return ShieldDecision(
        allowed: false,
        reason: '仅允许同城搭讪',
        shouldNotify: false,
        effectiveMode: config.mode,
      );
    }

    if (config.blockStrangersWithoutMbti && strangerMbti == null) {
      return ShieldDecision(
        allowed: false,
        reason: '对方未设置MBTI，已拦截',
        shouldNotify: false,
        effectiveMode: config.mode,
      );
    }

    final dailyCount = state.dailyMessageCounts[strangerId] ?? 0;
    if (dailyCount >= config.maxStrangerMessagesPerDay) {
      return ShieldDecision(
        allowed: false,
        reason: '今日消息上限已达',
        shouldNotify: false,
        effectiveMode: config.mode,
      );
    }

    if (message != null) {
      final scanResult = _injectionDefense.scan(message);
      if (scanResult.shouldBlock) {
        if (config.enableAutoBlock) {
          blockUser(userId, strangerId);
        }
        return ShieldDecision(
          allowed: false,
          reason: '检测到可疑内容：${scanResult.reason}',
          shouldNotify: true,
          notificationMessage:
              '⚠️ 有人试图对你的宠物说奇怪的话，已自动拦截！对方已被拉黑。',
          effectiveMode: config.mode,
        );
      }

      if (scanResult.shouldWarn) {
        return ShieldDecision(
          allowed: true,
          reason: '内容有轻微风险，已过滤',
          shouldNotify: true,
          notificationMessage: '有人向你的宠物搭讪，内容已安全过滤',
          effectiveMode: config.mode,
        );
      }
    }

    final updatedCounts = Map<String, int>.from(state.dailyMessageCounts);
    updatedCounts[strangerId] = dailyCount + 1;
    _states[userId] = state.copyWith(dailyMessageCounts: updatedCounts);

    return ShieldDecision(
      allowed: true,
      shouldNotify: true,
      notificationMessage: '有人向你的宠物搭讪了~',
      effectiveMode: config.mode,
    );
  }

  @override
  ShieldState blockUser(String userId, String strangerId) {
    final current = getState(userId);
    final blocked = Set<String>.from(current.blockedUserIds)..add(strangerId);
    final updated = current.copyWith(
      blockedUserIds: blocked,
      lastUpdated: DateTime.now(),
    );
    _states[userId] = updated;
    return updated;
  }

  @override
  ShieldState unblockUser(String userId, String strangerId) {
    final current = getState(userId);
    final blocked = Set<String>.from(current.blockedUserIds)..remove(strangerId);
    final updated = current.copyWith(
      blockedUserIds: blocked,
      lastUpdated: DateTime.now(),
    );
    _states[userId] = updated;
    return updated;
  }

  @override
  ShieldState allowUser(String userId, String strangerId) {
    final current = getState(userId);
    final allowed = Set<String>.from(current.allowedUserIds)..add(strangerId);
    final updated = current.copyWith(
      allowedUserIds: allowed,
      lastUpdated: DateTime.now(),
    );
    _states[userId] = updated;
    return updated;
  }

  @override
  void resetDailyCounts() {
    for (final userId in _states.keys) {
      _states[userId] = _states[userId]!.copyWith(
        dailyMessageCounts: {},
        lastUpdated: DateTime.now(),
      );
    }
  }
}
