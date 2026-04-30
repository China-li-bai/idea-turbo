enum SubscriptionTier {
  free,
  pro,
  premium,
}

class TierLimits {
  final int maxLocalMemories;
  final int maxCloudMemories;
  final int maxSocialInteractionsPerDay;
  final int maxPetCustomizations;
  final int maxVoicePacks;
  final bool enableCloudSync;
  final bool enableAdvancedPersonality;
  final bool enablePriorityMatching;
  final bool enableCustomVoice;
  final bool enableExtendedMemory;

  const TierLimits({
    required this.maxLocalMemories,
    required this.maxCloudMemories,
    required this.maxSocialInteractionsPerDay,
    required this.maxPetCustomizations,
    required this.maxVoicePacks,
    required this.enableCloudSync,
    required this.enableAdvancedPersonality,
    required this.enablePriorityMatching,
    required this.enableCustomVoice,
    required this.enableExtendedMemory,
  });

  static const TierLimits free = TierLimits(
    maxLocalMemories: 1000,
    maxCloudMemories: 0,
    maxSocialInteractionsPerDay: 20,
    maxPetCustomizations: 3,
    maxVoicePacks: 1,
    enableCloudSync: false,
    enableAdvancedPersonality: false,
    enablePriorityMatching: false,
    enableCustomVoice: false,
    enableExtendedMemory: false,
  );

  static const TierLimits pro = TierLimits(
    maxLocalMemories: 5000,
    maxCloudMemories: 10000,
    maxSocialInteractionsPerDay: 50,
    maxPetCustomizations: 10,
    maxVoicePacks: 5,
    enableCloudSync: true,
    enableAdvancedPersonality: true,
    enablePriorityMatching: false,
    enableCustomVoice: true,
    enableExtendedMemory: true,
  );

  static const TierLimits premium = TierLimits(
    maxLocalMemories: 50000,
    maxCloudMemories: 100000,
    maxSocialInteractionsPerDay: -1,
    maxPetCustomizations: -1,
    maxVoicePacks: -1,
    enableCloudSync: true,
    enableAdvancedPersonality: true,
    enablePriorityMatching: true,
    enableCustomVoice: true,
    enableExtendedMemory: true,
  );
}

class SubscriptionState {
  final String userId;
  final SubscriptionTier tier;
  final DateTime? expiresAt;
  final DateTime? startedAt;
  final bool isTrial;
  final Map<String, dynamic> metadata;

  const SubscriptionState({
    required this.userId,
    required this.tier,
    this.expiresAt,
    this.startedAt,
    this.isTrial = false,
    this.metadata = const {},
  });

  bool get isActive {
    if (tier == SubscriptionTier.free) return true;
    if (expiresAt == null) return false;
    return DateTime.now().isBefore(expiresAt!);
  }

  TierLimits get limits {
    switch (tier) {
      case SubscriptionTier.free:
        return TierLimits.free;
      case SubscriptionTier.pro:
        return TierLimits.pro;
      case SubscriptionTier.premium:
        return TierLimits.premium;
    }
  }

  SubscriptionState copyWith({
    String? userId,
    SubscriptionTier? tier,
    DateTime? expiresAt,
    DateTime? startedAt,
    bool? isTrial,
    Map<String, dynamic>? metadata,
  }) =>
      SubscriptionState(
        userId: userId ?? this.userId,
        tier: tier ?? this.tier,
        expiresAt: expiresAt ?? this.expiresAt,
        startedAt: startedAt ?? this.startedAt,
        isTrial: isTrial ?? this.isTrial,
        metadata: metadata ?? this.metadata,
      );
}

class SubscriptionService {
  final Map<String, SubscriptionState> _states = {};

  SubscriptionState getSubscription(String userId) {
    return _states[userId] ??
        SubscriptionState(
          userId: userId,
          tier: SubscriptionTier.free,
          startedAt: DateTime.now(),
        );
  }

  SubscriptionState upgrade(String userId, SubscriptionTier newTier,
      {Duration? duration, bool isTrial = false}) {
    final current = getSubscription(userId);
    final updated = current.copyWith(
      tier: newTier,
      startedAt: DateTime.now(),
      expiresAt: duration != null
          ? DateTime.now().add(duration)
          : null,
      isTrial: isTrial,
    );
    _states[userId] = updated;
    return updated;
  }

  bool checkFeature(String userId, String feature) {
    final sub = getSubscription(userId);
    if (!sub.isActive && sub.tier != SubscriptionTier.free) return false;
    final limits = sub.limits;

    switch (feature) {
      case 'cloudSync':
        return limits.enableCloudSync;
      case 'advancedPersonality':
        return limits.enableAdvancedPersonality;
      case 'priorityMatching':
        return limits.enablePriorityMatching;
      case 'customVoice':
        return limits.enableCustomVoice;
      case 'extendedMemory':
        return limits.enableExtendedMemory;
      default:
        return false;
    }
  }

  bool checkMemoryLimit(String userId, int currentCount) {
    final sub = getSubscription(userId);
    if (!sub.isActive && sub.tier != SubscriptionTier.free) return false;
    final limits = sub.limits;
    return currentCount < limits.maxLocalMemories;
  }

  bool checkSocialLimit(String userId, int todayCount) {
    final sub = getSubscription(userId);
    if (!sub.isActive && sub.tier != SubscriptionTier.free) return false;
    final limits = sub.limits;
    if (limits.maxSocialInteractionsPerDay < 0) return true;
    return todayCount < limits.maxSocialInteractionsPerDay;
  }
}
