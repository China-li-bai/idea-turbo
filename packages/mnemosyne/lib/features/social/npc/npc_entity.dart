import 'dart:math' show atan2, sqrt;

enum NpcType {
  brand,
  landmark,
  cultural,
  seasonal,
  community,
}

enum NpcRarity {
  common,
  rare,
  epic,
  legendary,
}

class NpcPersonality {
  final String name;
  final String species;
  final String catchphrase;
  final String personalityDesc;
  final List<String> dialoguePool;
  final List<String> interests;
  final Map<String, String> brandInfo;

  const NpcPersonality({
    required this.name,
    required this.species,
    required this.catchphrase,
    required this.personalityDesc,
    this.dialoguePool = const [],
    this.interests = const [],
    this.brandInfo = const {},
  });

  NpcPersonality copyWith({
    String? name,
    String? species,
    String? catchphrase,
    String? personalityDesc,
    List<String>? dialoguePool,
    List<String>? interests,
    Map<String, String>? brandInfo,
  }) =>
      NpcPersonality(
        name: name ?? this.name,
        species: species ?? this.species,
        catchphrase: catchphrase ?? this.catchphrase,
        personalityDesc: personalityDesc ?? this.personalityDesc,
        dialoguePool: dialoguePool ?? this.dialoguePool,
        interests: interests ?? this.interests,
        brandInfo: brandInfo ?? this.brandInfo,
      );
}

class NpcLocation {
  final double latitude;
  final double longitude;
  final String displayName;
  final String? poiName;
  final double radiusMeters;

  const NpcLocation({
    required this.latitude,
    required this.longitude,
    required this.displayName,
    this.poiName,
    this.radiusMeters = 500,
  });

  bool isNearby(double userLat, double userLng, {double maxDistanceMeters = 500}) {
    final distance = haversineDistance(latitude, longitude, userLat, userLng);
    return distance <= maxDistanceMeters;
  }

  static double haversineDistance(
      double lat1, double lon1, double lat2, double lon2) {
    const r = 6371000.0;
    final dLat = _toRad(lat2 - lat1);
    final dLon = _toRad(lon2 - lon1);
    final a = (dLat / 2) * (dLat / 2) +
        _toRad(lat1) * _toRad(lat2) * (dLon / 2) * (dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return r * c;
  }

  static double _toRad(double deg) => deg * 0.017453293;
}

class NpcEntity {
  final String id;
  final NpcType type;
  final NpcRarity rarity;
  final NpcPersonality personality;
  final NpcLocation location;
  final String? couponId;
  final DateTime? availableFrom;
  final DateTime? availableUntil;
  final int interactionCount;
  final int maxDailyInteractions;
  final bool isActive;

  const NpcEntity({
    required this.id,
    required this.type,
    required this.rarity,
    required this.personality,
    required this.location,
    this.couponId,
    this.availableFrom,
    this.availableUntil,
    this.interactionCount = 0,
    this.maxDailyInteractions = 100,
    this.isActive = true,
  });

  bool get isAvailable {
    if (!isActive) return false;
    final now = DateTime.now();
    if (availableFrom != null && now.isBefore(availableFrom!)) return false;
    if (availableUntil != null && now.isAfter(availableUntil!)) return false;
    return interactionCount < maxDailyInteractions;
  }

  NpcEntity copyWith({
    String? id,
    NpcType? type,
    NpcRarity? rarity,
    NpcPersonality? personality,
    NpcLocation? location,
    String? couponId,
    DateTime? availableFrom,
    DateTime? availableUntil,
    int? interactionCount,
    int? maxDailyInteractions,
    bool? isActive,
  }) =>
      NpcEntity(
        id: id ?? this.id,
        type: type ?? this.type,
        rarity: rarity ?? this.rarity,
        personality: personality ?? this.personality,
        location: location ?? this.location,
        couponId: couponId ?? this.couponId,
        availableFrom: availableFrom ?? this.availableFrom,
        availableUntil: availableUntil ?? this.availableUntil,
        interactionCount: interactionCount ?? this.interactionCount,
        maxDailyInteractions: maxDailyInteractions ?? this.maxDailyInteractions,
        isActive: isActive ?? this.isActive,
      );
}
