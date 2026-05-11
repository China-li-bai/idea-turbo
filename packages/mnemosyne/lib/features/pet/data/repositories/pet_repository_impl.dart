import 'package:mnemosyne/features/pet/domain/entities/pet_snapshot.dart';
import 'package:mnemosyne/features/pet/domain/repositories/pet_repository.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/resonance_service.dart';
import 'package:mnemosyne/features/pet/data/datasources/pet_local_datasource.dart';

class PetRepositoryImpl implements PetRepository {
  final VitalityService _vitalityService;
  final PersonalityAwakeningService _personalityService;
  final ResonanceService _resonanceService;
  final PetLocalDataSource _localDataSource;

  final Map<String, PetSnapshot> _cache = {};

  PetRepositoryImpl({
    required VitalityService vitalityService,
    required PersonalityAwakeningService personalityService,
    required ResonanceService resonanceService,
    required PetLocalDataSource localDataSource,
  })  : _vitalityService = vitalityService,
        _personalityService = personalityService,
        _resonanceService = resonanceService,
        _localDataSource = localDataSource;

  @override
  Future<PetSnapshot> loadSnapshot(String petId) async {
    final cached = _cache[petId];
    if (cached != null) return cached;

    try {
      final data =
          await _localDataSource.read(PetLocalDataSource.snapshotKey(petId));
      if (data != null && data.isNotEmpty) {
        final snapshot = PetSnapshot.decode(data);
        _injectIntoServices(petId, snapshot);
        _cache[petId] = snapshot;
        return snapshot;
      }
    } catch (_) {}

    final snapshot = PetSnapshot.initial(petId);
    _injectIntoServices(petId, snapshot);
    _cache[petId] = snapshot;
    return snapshot;
  }

  @override
  Future<void> saveSnapshot(String petId, PetSnapshot snapshot) async {
    _cache[petId] = snapshot;
    await _localDataSource.write(
      PetLocalDataSource.snapshotKey(petId),
      snapshot.encode(),
    );
  }

  @override
  Future<VitalityState> loadVitality(String petId) async {
    final snapshot = await loadSnapshot(petId);
    return snapshot.vitality;
  }

  @override
  Future<void> saveVitality(String petId, VitalityState state) async {
    final snapshot = getCurrentSnapshot(petId);
    final updated = snapshot.copyWith(vitality: state);
    await saveSnapshot(petId, updated);
  }

  @override
  Future<PersonalityProfile> loadPersonality(String petId) async {
    final snapshot = await loadSnapshot(petId);
    return snapshot.personality;
  }

  @override
  Future<void> savePersonality(String petId, PersonalityProfile profile) async {
    final snapshot = getCurrentSnapshot(petId);
    final updated = snapshot.copyWith(personality: profile);
    await saveSnapshot(petId, updated);
  }

  @override
  Future<RelationshipState> loadRelationship(String petId) async {
    final snapshot = await loadSnapshot(petId);
    return snapshot.relationship;
  }

  @override
  Future<void> saveRelationship(String petId, RelationshipState state) async {
    final snapshot = getCurrentSnapshot(petId);
    final updated = snapshot.copyWith(relationship: state);
    await saveSnapshot(petId, updated);
  }

  @override
  PetSnapshot onInteraction(String petId, String content) {
    final vitality = _vitalityService.onOwnerInteraction(petId);
    final personality = _personalityService.feedInteraction(petId, content);
    final relationship = _resonanceService.feedInteraction(petId, content);

    final snapshot = getCurrentSnapshot(petId).copyWith(
      vitality: vitality,
      personality: personality,
      relationship: relationship,
      savedAt: DateTime.now(),
    );

    _cache[petId] = snapshot;
    _persistAsync(petId, snapshot);
    return snapshot;
  }

  @override
  PetSnapshot onVitalityTick(String petId, Duration elapsed) {
    final vitality = _vitalityService.tick(petId, elapsed);
    final personality = _personalityService.applyTimeDecay(petId, elapsed);
    final relationship = _resonanceService.applyTimeDecay(petId, elapsed);

    final snapshot = getCurrentSnapshot(petId).copyWith(
      vitality: vitality,
      personality: personality,
      relationship: relationship,
      savedAt: DateTime.now(),
    );

    _cache[petId] = snapshot;
    _persistAsync(petId, snapshot);
    return snapshot;
  }

  @override
  AwakeningResult? checkAwakening(String petId) {
    return _personalityService.checkAwakening(petId);
  }

  @override
  String? checkGlitchTrigger(String petId) {
    return _resonanceService.checkGlitchTrigger(petId);
  }

  @override
  void recordGlitch(String petId, String form) {
    _resonanceService.recordGlitch(petId, form);
  }

  @override
  PetSnapshot getCurrentSnapshot(String petId) {
    return _cache[petId] ?? PetSnapshot.initial(petId);
  }

  void _injectIntoServices(String petId, PetSnapshot snapshot) {
    _vitalityService.restoreState(petId, snapshot.vitality);
    _personalityService.restoreProfile(petId, snapshot.personality);
    _resonanceService.restoreState(petId, snapshot.relationship);
  }

  void _persistAsync(String petId, PetSnapshot snapshot) {
    saveSnapshot(petId, snapshot);
  }
}
