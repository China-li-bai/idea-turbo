import 'package:mnemosyne/mnemosyne.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/resonance_service.dart';
import 'package:mnemosyne/features/pet/domain/repositories/pet_repository.dart';
import 'package:mnemosyne/features/pet/data/datasources/pet_local_datasource.dart';
import 'package:mnemosyne/features/pet/data/repositories/pet_repository_impl.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ServiceLocator {
  static final ServiceLocator _instance = ServiceLocator._();
  factory ServiceLocator() => _instance;
  ServiceLocator._();

  Mnemosyne? _mnemosyne;
  PetMemoryBridge? _petMemoryBridge;
  DefaultVitalityService? _vitalityService;
  DefaultPersonalityAwakeningService? _personalityService;
  DefaultResonanceService? _resonanceService;
  PetRepositoryImpl? _petRepository;
  DefaultPetDiaryService? _diaryService;

  bool _isInitialized = false;

  Mnemosyne get mnemosyne {
    if (_mnemosyne == null) throw StateError('ServiceLocator not initialized');
    return _mnemosyne!;
  }

  PetMemoryBridge get petMemoryBridge {
    if (_petMemoryBridge == null) throw StateError('ServiceLocator not initialized');
    return _petMemoryBridge!;
  }

  DefaultVitalityService get vitalityService {
    if (_vitalityService == null) throw StateError('ServiceLocator not initialized');
    return _vitalityService!;
  }

  DefaultPersonalityAwakeningService get personalityService {
    if (_personalityService == null) throw StateError('ServiceLocator not initialized');
    return _personalityService!;
  }

  DefaultResonanceService get resonanceService {
    if (_resonanceService == null) throw StateError('ServiceLocator not initialized');
    return _resonanceService!;
  }

  PetRepository get petRepository {
    if (_petRepository == null) throw StateError('ServiceLocator not initialized');
    return _petRepository!;
  }

  DefaultPetDiaryService get diaryService {
    if (_diaryService == null) throw StateError('ServiceLocator not initialized');
    return _diaryService!;
  }

  bool get isInitialized => _isInitialized;

  Future<void> initialize({String? directoryOverride}) async {
    if (_isInitialized) return;

    _mnemosyne = Mnemosyne(directoryOverride: directoryOverride);
    await _mnemosyne!.initialize();

    _petMemoryBridge = PetMemoryBridge(mnemosyne: _mnemosyne!);

    _vitalityService = DefaultVitalityService();
    _personalityService = DefaultPersonalityAwakeningService();

    _diaryService = DefaultPetDiaryService();

    final prefs = await SharedPreferences.getInstance();
    _resonanceService = DefaultResonanceService(
      readPreference: (key) async => prefs.getString(key) ?? '',
      writePreference: (key, value) async => prefs.setString(key, value),
    );

    final localDataSource = PetLocalDataSource(
      read: (key) async => prefs.getString(key) ?? '',
      write: (key, value) async => prefs.setString(key, value),
    );

    _petRepository = PetRepositoryImpl(
      vitalityService: _vitalityService!,
      personalityService: _personalityService!,
      resonanceService: _resonanceService!,
      localDataSource: localDataSource,
    );

    await _petRepository!.loadSnapshot('zhenyue');

    _isInitialized = true;
  }

  Future<void> dispose() async {
    if (_petRepository != null) {
      final snapshot = _petRepository!.getCurrentSnapshot('zhenyue');
      await _petRepository!.saveSnapshot('zhenyue', snapshot);
    }
    if (_mnemosyne != null) {
      await _mnemosyne!.close();
    }
    _mnemosyne = null;
    _petMemoryBridge = null;
    _vitalityService = null;
    _personalityService = null;
    _resonanceService = null;
    _petRepository = null;
    _diaryService = null;
    _isInitialized = false;
  }
}
