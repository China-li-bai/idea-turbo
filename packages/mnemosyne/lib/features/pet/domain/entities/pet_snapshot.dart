import 'dart:convert';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/resonance_service.dart';

class PetSnapshot {
  final String petId;
  final VitalityState vitality;
  final PersonalityProfile personality;
  final RelationshipState relationship;
  final DateTime savedAt;

  const PetSnapshot({
    required this.petId,
    required this.vitality,
    required this.personality,
    required this.relationship,
    required this.savedAt,
  });

  factory PetSnapshot.initial(String petId) => PetSnapshot(
        petId: petId,
        vitality: VitalityState(
          lastInteractionAt: DateTime.now(),
          lastSocialAt: DateTime.now(),
        ),
        personality: PersonalityProfile(petId: petId),
        relationship: RelationshipState.initial(),
        savedAt: DateTime.now(),
      );

  PetSnapshot copyWith({
    String? petId,
    VitalityState? vitality,
    PersonalityProfile? personality,
    RelationshipState? relationship,
    DateTime? savedAt,
  }) =>
      PetSnapshot(
        petId: petId ?? this.petId,
        vitality: vitality ?? this.vitality,
        personality: personality ?? this.personality,
        relationship: relationship ?? this.relationship,
        savedAt: savedAt ?? this.savedAt,
      );

  Map<String, dynamic> toJson() => {
        'petId': petId,
        'vitality': vitality.toJson(),
        'personality': personality.toJson(),
        'relationship': relationship.toJson(),
        'savedAt': savedAt.toIso8601String(),
      };

  factory PetSnapshot.fromJson(Map<String, dynamic> json) => PetSnapshot(
        petId: json['petId'] as String? ?? '',
        vitality: json['vitality'] != null
            ? VitalityState.fromJson(json['vitality'] as Map<String, dynamic>)
            : VitalityState(
                lastInteractionAt: DateTime.now(),
                lastSocialAt: DateTime.now(),
              ),
        personality: json['personality'] != null
            ? PersonalityProfile.fromJson(
                json['personality'] as Map<String, dynamic>)
            : PersonalityProfile(petId: json['petId'] as String? ?? ''),
        relationship: json['relationship'] != null
            ? RelationshipState.fromJson(
                json['relationship'] as Map<String, dynamic>)
            : RelationshipState.initial(),
        savedAt: json['savedAt'] != null
            ? DateTime.parse(json['savedAt'] as String)
            : DateTime.now(),
      );

  String encode() => jsonEncode(toJson());

  static PetSnapshot decode(String data) {
    if (data.isEmpty) {
      return PetSnapshot.initial('');
    }
    return PetSnapshot.fromJson(jsonDecode(data) as Map<String, dynamic>);
  }
}
