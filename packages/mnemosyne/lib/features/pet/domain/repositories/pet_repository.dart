import 'package:mnemosyne/features/pet/domain/entities/pet_snapshot.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/resonance_service.dart';

abstract class PetRepository {
  Future<PetSnapshot> loadSnapshot(String petId);
  Future<void> saveSnapshot(String petId, PetSnapshot snapshot);

  Future<VitalityState> loadVitality(String petId);
  Future<void> saveVitality(String petId, VitalityState state);

  Future<PersonalityProfile> loadPersonality(String petId);
  Future<void> savePersonality(String petId, PersonalityProfile profile);

  Future<RelationshipState> loadRelationship(String petId);
  Future<void> saveRelationship(String petId, RelationshipState state);

  PetSnapshot onInteraction(String petId, String content);
  PetSnapshot onVitalityTick(String petId, Duration elapsed);
  AwakeningResult? checkAwakening(String petId);
  String? checkGlitchTrigger(String petId);
  void recordGlitch(String petId, String form);

  PetSnapshot getCurrentSnapshot(String petId);
}
