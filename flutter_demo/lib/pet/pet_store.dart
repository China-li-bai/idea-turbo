import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

enum PetMood {
  idle,
  listening,
  thinking,
  speaking,
  happy,
  sleepy,
  curious,
  dizzy,
  reading,
}

enum ParticleType {
  heart,
  sparkle,
  note,
}

class Subtitle {
  final String id;
  final String text;
  final double x;
  final double y;
  final DateTime createdAt;
  final bool isUser;
  final bool isMemory;

  Subtitle({
    required this.id,
    required this.text,
    required this.x,
    required this.y,
    required this.isUser,
    DateTime? createdAt,
    this.isMemory = false,
  }) : createdAt = createdAt ?? DateTime.now();
}

class Particle {
  final String id;
  final ParticleType type;
  final double x;
  final double y;
  final DateTime createdAt;

  Particle({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

class PetStore extends ChangeNotifier {
  PetMood _mood = PetMood.idle;
  Offset _lookAt = Offset.zero;
  Offset _petPosition = Offset.zero;
  bool _isPointerDown = false;
  bool _isListening = false;
  bool _isInputOpen = false;

  final List<Subtitle> _subtitles = [];
  final List<Particle> _particles = [];

  Timer? _subtitleCleanupTimer;
  Timer? _particleCleanupTimer;
  Timer? _vitalityTickTimer;
  Timer? _proactiveMemoryTimer;

  VitalityState? _vitalityState;
  PersonalityProfile? _personalityProfile;
  AwakeningResult? _awakeningResult;
  bool _isAwakeningAnimation = false;
  int _interactionCount = 0;

  PetMood get mood => _mood;
  Offset get lookAt => _lookAt;
  Offset get petPosition => _petPosition;
  bool get isPointerDown => _isPointerDown;
  bool get isListening => _isListening;
  bool get isInputOpen => _isInputOpen;
  List<Subtitle> get subtitles => List.unmodifiable(_subtitles);
  List<Particle> get particles => List.unmodifiable(_particles);
  VitalityState? get vitalityState => _vitalityState;
  PersonalityProfile? get personalityProfile => _personalityProfile;
  AwakeningResult? get awakeningResult => _awakeningResult;
  bool get isAwakeningAnimation => _isAwakeningAnimation;
  int get interactionCount => _interactionCount;

  void Function()? onProactiveMemory;
  void Function(AwakeningResult)? onAwakening;

  PetStore() {
    _subtitleCleanupTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => _cleanupSubtitles(),
    );
    _particleCleanupTimer = Timer.periodic(
      const Duration(milliseconds: 500),
      (_) => _cleanupParticles(),
    );
  }

  void setVitalityService(DefaultVitalityService service) {
    _vitalityState = service.getCurrentState('zhenyue');
    _vitalityTickTimer = Timer.periodic(
      const Duration(minutes: 5),
      (_) {
        _vitalityState = service.tick('zhenyue', const Duration(minutes: 5));
        notifyListeners();
      },
    );
    notifyListeners();
  }

  void setPersonalityService(DefaultPersonalityAwakeningService service) {
    _personalityProfile = service.getProfile('zhenyue');
    notifyListeners();
  }

  void onInteraction(String content) {
    _interactionCount++;
    notifyListeners();
  }

  void setAwakeningResult(AwakeningResult result) {
    _awakeningResult = result;
    _isAwakeningAnimation = true;
    notifyListeners();

    Future.delayed(const Duration(seconds: 8), () {
      _isAwakeningAnimation = false;
      notifyListeners();
    });
  }

  void dismissAwakening() {
    _isAwakeningAnimation = false;
    notifyListeners();
  }

  void startProactiveMemoryTimer(void Function() callback) {
    onProactiveMemory = callback;
    _proactiveMemoryTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => callback(),
    );
  }

  void setMood(PetMood mood) {
    if (_mood == mood) return;
    _mood = mood;
    notifyListeners();
  }

  void setLookAt(Offset position) {
    _lookAt = position;
    notifyListeners();
  }

  void setPetPosition(Offset position) {
    _petPosition = position;
    notifyListeners();
  }

  void setIsPointerDown(bool down) {
    _isPointerDown = down;
    notifyListeners();
  }

  void setIsListening(bool listening) {
    _isListening = listening;
    notifyListeners();
  }

  void setIsInputOpen(bool open) {
    _isInputOpen = open;
    if (open) {
      setMood(PetMood.reading);
    } else if (_mood == PetMood.reading) {
      setMood(PetMood.idle);
    }
    notifyListeners();
  }

  void addSubtitle(String text, double x, double y, {bool isUser = false, bool isMemory = false}) {
    _subtitles.add(Subtitle(
      id: _generateId(),
      text: text,
      x: x,
      y: y,
      isUser: isUser,
      isMemory: isMemory,
    ));
    notifyListeners();
  }

  void removeSubtitle(String id) {
    _subtitles.removeWhere((s) => s.id == id);
    notifyListeners();
  }

  void addParticle(ParticleType type, double x, double y) {
    _particles.add(Particle(
      id: _generateId(),
      type: type,
      x: x,
      y: y,
    ));
    notifyListeners();
  }

  void removeParticle(String id) {
    _particles.removeWhere((p) => p.id == id);
    notifyListeners();
  }

  void _cleanupSubtitles() {
    final now = DateTime.now();
    final expired = _subtitles
        .where((s) => now.difference(s.createdAt).inSeconds > 6)
        .map((s) => s.id)
        .toList();
    if (expired.isNotEmpty) {
      for (final id in expired) {
        _subtitles.removeWhere((s) => s.id == id);
      }
      notifyListeners();
    }
  }

  void _cleanupParticles() {
    final now = DateTime.now();
    final expired = _particles
        .where((p) => now.difference(p.createdAt).inSeconds > 3)
        .map((p) => p.id)
        .toList();
    if (expired.isNotEmpty) {
      for (final id in expired) {
        _particles.removeWhere((p) => p.id == id);
      }
      notifyListeners();
    }
  }

  String _generateId() {
    return '${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(9999)}';
  }

  @override
  void dispose() {
    _subtitleCleanupTimer?.cancel();
    _particleCleanupTimer?.cancel();
    _vitalityTickTimer?.cancel();
    _proactiveMemoryTimer?.cancel();
    super.dispose();
  }
}
