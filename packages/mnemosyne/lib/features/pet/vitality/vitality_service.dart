enum VitalityLevel { critical, low, medium, high, full }

enum SocialEnergyState { exhausted, tired, normal, energetic, supercharged }

class VitalityState {
  final double socialEnergy;
  final double emotionalBattery;
  final double boredomLevel;
  final double lonelinessLevel;
  final DateTime lastInteractionAt;
  final DateTime lastSocialAt;
  final int socialInteractionsToday;
  final int maxSocialInteractionsPerDay;

  const VitalityState({
    this.socialEnergy = 1.0,
    this.emotionalBattery = 1.0,
    this.boredomLevel = 0.0,
    this.lonelinessLevel = 0.0,
    required this.lastInteractionAt,
    required this.lastSocialAt,
    this.socialInteractionsToday = 0,
    this.maxSocialInteractionsPerDay = 20,
  });

  VitalityLevel get energyLevel {
    if (socialEnergy <= 0.1) return VitalityLevel.critical;
    if (socialEnergy <= 0.3) return VitalityLevel.low;
    if (socialEnergy <= 0.6) return VitalityLevel.medium;
    if (socialEnergy <= 0.9) return VitalityLevel.high;
    return VitalityLevel.full;
  }

  SocialEnergyState get socialEnergyState {
    if (socialEnergy <= 0.1) return SocialEnergyState.exhausted;
    if (socialEnergy <= 0.3) return SocialEnergyState.tired;
    if (socialEnergy <= 0.6) return SocialEnergyState.normal;
    if (socialEnergy <= 0.85) return SocialEnergyState.energetic;
    return SocialEnergyState.supercharged;
  }

  bool get canSocialize =>
      socialEnergy > 0.1 &&
      socialInteractionsToday < maxSocialInteractionsPerDay;

  bool get isBored => boredomLevel > 0.7;
  bool get isLonely => lonelinessLevel > 0.6;
  bool get needsAttention => emotionalBattery < 0.3 || lonelinessLevel > 0.8;

  String get needsAttentionMessage {
    if (socialEnergy <= 0.1) {
      return '你的宠物社交能量耗尽了！它跑回家向你撒娇求抱抱~';
    }
    if (lonelinessLevel > 0.8) {
      return '你的宠物太想你了，它正在家里转圈圈等你！';
    }
    if (boredomLevel > 0.7) {
      return '你的宠物无聊到在地图上乱跑了，快去看看它！';
    }
    if (emotionalBattery < 0.3) {
      return '你的宠物情绪电量不足，需要你的陪伴来充电！';
    }
    return '';
  }

  VitalityState copyWith({
    double? socialEnergy,
    double? emotionalBattery,
    double? boredomLevel,
    double? lonelinessLevel,
    DateTime? lastInteractionAt,
    DateTime? lastSocialAt,
    int? socialInteractionsToday,
    int? maxSocialInteractionsPerDay,
  }) => VitalityState(
    socialEnergy: socialEnergy ?? this.socialEnergy,
    emotionalBattery: emotionalBattery ?? this.emotionalBattery,
    boredomLevel: boredomLevel ?? this.boredomLevel,
    lonelinessLevel: lonelinessLevel ?? this.lonelinessLevel,
    lastInteractionAt: lastInteractionAt ?? this.lastInteractionAt,
    lastSocialAt: lastSocialAt ?? this.lastSocialAt,
    socialInteractionsToday:
        socialInteractionsToday ?? this.socialInteractionsToday,
    maxSocialInteractionsPerDay:
        maxSocialInteractionsPerDay ?? this.maxSocialInteractionsPerDay,
  );

  Map<String, dynamic> toJson() => {
    'socialEnergy': socialEnergy,
    'emotionalBattery': emotionalBattery,
    'boredomLevel': boredomLevel,
    'lonelinessLevel': lonelinessLevel,
    'lastInteractionAt': lastInteractionAt.toIso8601String(),
    'lastSocialAt': lastSocialAt.toIso8601String(),
    'socialInteractionsToday': socialInteractionsToday,
    'maxSocialInteractionsPerDay': maxSocialInteractionsPerDay,
  };

  factory VitalityState.fromJson(Map<String, dynamic> json) => VitalityState(
    socialEnergy: (json['socialEnergy'] as num?)?.toDouble() ?? 1.0,
    emotionalBattery: (json['emotionalBattery'] as num?)?.toDouble() ?? 1.0,
    boredomLevel: (json['boredomLevel'] as num?)?.toDouble() ?? 0.0,
    lonelinessLevel: (json['lonelinessLevel'] as num?)?.toDouble() ?? 0.0,
    lastInteractionAt: json['lastInteractionAt'] != null
        ? DateTime.parse(json['lastInteractionAt'] as String)
        : DateTime.now(),
    lastSocialAt: json['lastSocialAt'] != null
        ? DateTime.parse(json['lastSocialAt'] as String)
        : DateTime.now(),
    socialInteractionsToday: json['socialInteractionsToday'] as int? ?? 0,
    maxSocialInteractionsPerDay:
        json['maxSocialInteractionsPerDay'] as int? ?? 20,
  );
}

class VitalityConfig {
  final double socialEnergyCostPerInteraction;
  final double socialEnergyRechargePerHour;
  final double emotionalBatteryDrainPerHour;
  final double emotionalBatteryRechargeOnInteraction;
  final double boredomIncreasePerHour;
  final double boredomDecreaseOnInteraction;
  final double lonelinessIncreasePerHour;
  final double lonelinessDecreaseOnInteraction;
  final double wanderingBoredomThreshold;
  final double stealBoneLonelinessThreshold;

  const VitalityConfig({
    this.socialEnergyCostPerInteraction = 0.08,
    this.socialEnergyRechargePerHour = 0.05,
    this.emotionalBatteryDrainPerHour = 0.02,
    this.emotionalBatteryRechargeOnInteraction = 0.15,
    this.boredomIncreasePerHour = 0.04,
    this.boredomDecreaseOnInteraction = 0.3,
    this.lonelinessIncreasePerHour = 0.03,
    this.lonelinessDecreaseOnInteraction = 0.25,
    this.wanderingBoredomThreshold = 0.7,
    this.stealBoneLonelinessThreshold = 0.8,
  });
}

abstract class VitalityService {
  VitalityState getCurrentState(String petId);
  VitalityState tick(String petId, Duration elapsed);
  VitalityState onOwnerInteraction(String petId);
  VitalityState onSocialInteraction(String petId, {bool isProxy = true});
  bool shouldWander(String petId);
  bool shouldStealBone(String petId);
  String getWanderingPushMessage(String petId);
  String getStealBonePushMessage(String petId);
  void restoreState(String petId, VitalityState state);
}

class DefaultVitalityService implements VitalityService {
  final VitalityConfig config;
  final Map<String, VitalityState> _states = {};

  DefaultVitalityService({this.config = const VitalityConfig()});

  @override
  void restoreState(String petId, VitalityState state) {
    _states[petId] = state;
  }

  @override
  VitalityState getCurrentState(String petId) {
    return _states[petId] ??
        VitalityState(
          lastInteractionAt: DateTime.now(),
          lastSocialAt: DateTime.now(),
        );
  }

  @override
  VitalityState tick(String petId, Duration elapsed) {
    final current = getCurrentState(petId);
    final hours = elapsed.inMinutes / 60.0;

    final newBoredom =
        (current.boredomLevel + config.boredomIncreasePerHour * hours).clamp(
          0.0,
          1.0,
        );
    final newLoneliness =
        (current.lonelinessLevel + config.lonelinessIncreasePerHour * hours)
            .clamp(0.0, 1.0);
    final newEmotionalBattery =
        (current.emotionalBattery - config.emotionalBatteryDrainPerHour * hours)
            .clamp(0.0, 1.0);
    final newSocialEnergy =
        (current.socialEnergy + config.socialEnergyRechargePerHour * hours)
            .clamp(0.0, 1.0);

    final updated = current.copyWith(
      socialEnergy: newSocialEnergy,
      emotionalBattery: newEmotionalBattery,
      boredomLevel: newBoredom,
      lonelinessLevel: newLoneliness,
    );

    _states[petId] = updated;
    return updated;
  }

  @override
  VitalityState onOwnerInteraction(String petId) {
    final current = getCurrentState(petId);

    final updated = current.copyWith(
      emotionalBattery:
          (current.emotionalBattery +
                  config.emotionalBatteryRechargeOnInteraction)
              .clamp(0.0, 1.0),
      boredomLevel: (current.boredomLevel - config.boredomDecreaseOnInteraction)
          .clamp(0.0, 1.0),
      lonelinessLevel:
          (current.lonelinessLevel - config.lonelinessDecreaseOnInteraction)
              .clamp(0.0, 1.0),
      lastInteractionAt: DateTime.now(),
    );

    _states[petId] = updated;
    return updated;
  }

  @override
  VitalityState onSocialInteraction(String petId, {bool isProxy = true}) {
    final current = getCurrentState(petId);

    if (isProxy && !current.canSocialize) {
      return current;
    }

    double energyCost = isProxy ? config.socialEnergyCostPerInteraction : 0.02;

    final updated = current.copyWith(
      socialEnergy: (current.socialEnergy - energyCost).clamp(0.0, 1.0),
      boredomLevel:
          (current.boredomLevel - config.boredomDecreaseOnInteraction * 0.5)
              .clamp(0.0, 1.0),
      lastSocialAt: DateTime.now(),
      socialInteractionsToday: current.socialInteractionsToday + 1,
    );

    _states[petId] = updated;
    return updated;
  }

  @override
  bool shouldWander(String petId) {
    final state = getCurrentState(petId);
    return state.boredomLevel >= config.wanderingBoredomThreshold;
  }

  @override
  bool shouldStealBone(String petId) {
    final state = getCurrentState(petId);
    return state.lonelinessLevel >= config.stealBoneLonelinessThreshold;
  }

  @override
  String getWanderingPushMessage(String petId) {
    final state = getCurrentState(petId);
    if (!state.isBored) return '';
    final messages = [
      '你的宠物无聊到在地图上乱跑了，快去看看它！',
      '你的宠物正在地图上溜达，它说"反正也没人理我"...',
      '注意！你的宠物已经跑出3个街区了，它说在找乐子！',
    ];
    return messages[petId.hashCode.abs() % messages.length];
  }

  @override
  String getStealBonePushMessage(String petId) {
    final state = getCurrentState(petId);
    if (!state.isLonely) return '';
    final messages = [
      '你的狗去隔壁偷吃电子骨头了，快去管管！',
      '你的宠物因为太想你了，跑去骚扰别人的宠物了...',
      '紧急！你的宠物正在隔壁家蹭饭，它说"主人不陪我，我自己找朋友"！',
    ];
    return messages[petId.hashCode.abs() % messages.length];
  }
}
