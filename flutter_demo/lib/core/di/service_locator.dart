import 'package:mnemosyne/mnemosyne.dart';
import 'package:mnemosyne/mnemosyne_class.dart';
import 'package:mnemosyne/features/pet/pet_memory_bridge.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

class ServiceLocator {
  static final ServiceLocator _instance = ServiceLocator._();
  factory ServiceLocator() => _instance;
  ServiceLocator._();

  Mnemosyne? _mnemosyne;
  PetMemoryBridge? _petMemoryBridge;
  DefaultVitalityService? _vitalityService;
  DefaultPersonalityAwakeningService? _personalityService;

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

  bool get isInitialized => _isInitialized;

  Future<void> initialize({String? directoryOverride}) async {
    if (_isInitialized) return;

    _mnemosyne = Mnemosyne(directoryOverride: directoryOverride);
    await _mnemosyne!.initialize();

    _petMemoryBridge = PetMemoryBridge(mnemosyne: _mnemosyne!);

    _vitalityService = DefaultVitalityService();
    _personalityService = DefaultPersonalityAwakeningService();

    _isInitialized = true;
  }

  Future<void> dispose() async {
    if (_mnemosyne != null) {
      await _mnemosyne!.close();
    }
    _mnemosyne = null;
    _petMemoryBridge = null;
    _vitalityService = null;
    _personalityService = null;
    _isInitialized = false;
  }
}
