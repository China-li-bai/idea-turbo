class LbsMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String targetPetId;
  final String content;
  final double senderLatitude;
  final double senderLongitude;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;

  const LbsMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.targetPetId,
    required this.content,
    required this.senderLatitude,
    required this.senderLongitude,
    required this.timestamp,
    this.metadata = const {},
  });
}

class LbsDeliveryResult {
  final String messageId;
  final bool delivered;
  final String? targetDeviceId;
  final String? error;
  final DateTime deliveredAt;

  const LbsDeliveryResult({
    required this.messageId,
    required this.delivered,
    this.targetDeviceId,
    this.error,
    required this.deliveredAt,
  });
}

class PetLocation {
  final String petId;
  final double latitude;
  final double longitude;
  final String? displayName;
  final bool isVisible;
  final DateTime updatedAt;

  const PetLocation({
    required this.petId,
    required this.latitude,
    required this.longitude,
    this.displayName,
    this.isVisible = true,
    required this.updatedAt,
  });
}

abstract class LbsRoutingService {
  Future<LbsDeliveryResult> routeMessage(LbsMessage message);
  Future<void> updatePetLocation(PetLocation location);
  Future<List<PetLocation>> getNearbyPets(double latitude, double longitude, {double radiusMeters = 5000});
  Stream<LbsMessage> listenForMessages(String petId);
  Future<void> setPetVisibility(String petId, bool visible);
}
