import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/domain/entities/pet_snapshot.dart';
import 'package:mnemosyne/features/pet/domain/repositories/pet_repository.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/resonance_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/emotional_state.dart';
import 'services/response_gate.dart';
import 'services/proactive_engine.dart';
import 'services/text_analysis.dart';
import 'domain/pet_action.dart';
import 'domain/vitality_phase.dart';
import 'narrative/first_time_narrative.dart';

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
  static const _defaultPetId = 'zhenyue';

  PetMood _mood = PetMood.idle;
  Offset _lookAt = Offset.zero;
  Offset _petPosition = Offset.zero;
  bool _isPointerDown = false;
  bool _isListening = false;
  bool _isInputOpen = false;
  bool _isGlitching = false;
  bool _isEmotionLensOpen = false;
  String _glitchForm = '';
  String _emotionLensLine = '';

  final List<Subtitle> _subtitles = [];
  final List<Particle> _particles = [];

  PetRepository? _petRepository;
  PetSnapshot? _snapshot;

  Timer? _subtitleCleanupTimer;
  Timer? _particleCleanupTimer;
  Timer? _vitalityTickTimer;
  Timer? _proactiveMemoryTimer;
  Timer? _glitchCheckTimer;

  AwakeningResult? _awakeningResult;
  bool _isAwakeningAnimation = false;
  int _interactionCount = 0;
  EmotionalState _emotionalState = EmotionalState.initial();
  DateTime _lastProactiveAt = DateTime.now();
  final StreamController<PetAction> _actionController =
      StreamController<PetAction>.broadcast();

  double _vitalityDecay = 0.0;
  DateTime _lastVitalityDecayAt = DateTime.now();
  bool _isFirstTime = true;
  FirstTimeChoice? _firstTimeChoice;
  String? _petName;

  PetMood get mood => _mood;
  Offset get lookAt => _lookAt;
  Offset get petPosition => _petPosition;
  bool get isPointerDown => _isPointerDown;
  bool get isListening => _isListening;
  bool get isInputOpen => _isInputOpen;
  bool get isGlitching => _isGlitching;
  bool get isEmotionLensOpen => _isEmotionLensOpen;
  String get glitchForm => _glitchForm;
  String get emotionLensLine => _emotionLensLine;
  List<Subtitle> get subtitles => List.unmodifiable(_subtitles);
  List<Particle> get particles => List.unmodifiable(_particles);
  AwakeningResult? get awakeningResult => _awakeningResult;
  bool get isAwakeningAnimation => _isAwakeningAnimation;
  int get interactionCount => _interactionCount;
  EmotionalState get emotionalState => _emotionalState;
  Stream<PetAction> get actionStream => _actionController.stream;
  bool get isFirstTime => _isFirstTime;
  FirstTimeChoice? get firstTimeChoice => _firstTimeChoice;
  String? get petName => _petName;

  void dispatchAction(PetAction action) {
    if (!_actionController.isClosed) {
      _actionController.add(action);
    }
  }

  void dispatchActions(List<PetAction> actions) {
    for (final action in actions) {
      dispatchAction(action);
    }
  }

  RelationshipState get relationshipState =>
      _snapshot?.relationship ?? RelationshipState.initial();

  VitalityState get vitalityState {
    final base = _snapshot?.vitality;
    if (base == null) {
      return VitalityState(
        lastInteractionAt: DateTime.now(),
        lastSocialAt: DateTime.now(),
      );
    }

    final decayedEnergy = (base.socialEnergy - _vitalityDecay).clamp(0.0, 1.0);
    final decayedBattery = (base.emotionalBattery - _vitalityDecay * 0.5).clamp(0.0, 1.0);

    return VitalityState(
      socialEnergy: decayedEnergy,
      emotionalBattery: decayedBattery,
      boredomLevel: base.boredomLevel,
      lonelinessLevel: base.lonelinessLevel,
      lastInteractionAt: base.lastInteractionAt,
      lastSocialAt: base.lastSocialAt,
    );
  }

  VitalityPhase get vitalityPhase => vitalityState.phase;

  PersonalityProfile get personalityProfile =>
      _snapshot?.personality ?? PersonalityProfile(petId: _defaultPetId);

  double get geneticInstability {
    if (_snapshot != null && _snapshot!.personality.hasAwakened) return 0.95;
    return relationshipState.geneticInstability;
  }

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

  void setPetRepository(PetRepository repository) {
    _petRepository = repository;
    _snapshot = repository.getCurrentSnapshot(_defaultPetId);
    _startVitalityTick();
    notifyListeners();
  }

  void _startVitalityTick() {
    _vitalityTickTimer = Timer.periodic(
      const Duration(minutes: 5),
      (_) {
        if (_petRepository == null) return;
        _snapshot = _petRepository!.onVitalityTick(
          _defaultPetId,
          const Duration(minutes: 5),
        );
        tickEmotionalState(const Duration(minutes: 5));
        _applyVitalityDecay();
        notifyListeners();
      },
    );
  }

  void _applyVitalityDecay() {
    final now = DateTime.now();
    final hoursSinceLastDecay = now.difference(_lastVitalityDecayAt).inMinutes / 60.0;
    _lastVitalityDecayAt = now;

    final currentPhase = vitalityState.phase;
    final decayRate = currentPhase == VitalityPhase.vibrant
        ? 0.02
        : currentPhase == VitalityPhase.normal
            ? 0.012
            : currentPhase == VitalityPhase.lethargic
                ? 0.005
                : 0.008;

    final hoursSinceLastInteraction = now.difference(vitalityState.lastInteractionAt).inHours;
    final isolationMultiplier = 1.0 + (hoursSinceLastInteraction * 0.1).clamp(0.0, 2.0);

    _vitalityDecay += decayRate * hoursSinceLastDecay * isolationMultiplier;
    _vitalityDecay = _vitalityDecay.clamp(0.0, 0.8);
  }

  void onInteraction(String content) {
    _interactionCount++;

    final prevMode = _emotionalState.mode;
    _emotionalState = _emotionalState.onUserMessage(content);
    if (_emotionalState.mode != prevMode) {
      _persistEmotionalState();
    }

    if (_petRepository != null) {
      _snapshot = _petRepository!.onInteraction(_defaultPetId, content);
    }

    _applyVitalityRecovery(content);

    notifyListeners();
  }

  void _applyVitalityRecovery(String content) {
    final isWarm = _detectWarmth(content);
    final isHurtful = _detectHurtful(content);

    double recovery = 0.03;

    if (isHurtful) {
      recovery = -0.15;
    } else if (isWarm) {
      recovery = 0.12;
    }

    _vitalityDecay = (_vitalityDecay - recovery).clamp(0.0, 0.8);
    _lastVitalityDecayAt = DateTime.now();
  }

  bool _detectWarmth(String content) => detectWarmth(content);

  bool _detectHurtful(String content) => detectHurtful(content);

  ResponseDecision gateResponse(String userMessage) {
    final gate = ResponseGate(_emotionalState, vitalityPhase: vitalityPhase);
    return gate.decide(userMessage);
  }

  void tickEmotionalState(Duration elapsed) {
    final previous = _emotionalState;
    _emotionalState = _emotionalState.onTick(elapsed);
    if (_emotionalState.mode != previous.mode) {
      _persistEmotionalState();
      notifyListeners();
    }
  }

  ProactiveTrigger? evaluateProactive() {
    final engine = ProactiveEngine(
      emotionalState: _emotionalState,
      timeSinceLastInteraction: DateTime.now().difference(
        _snapshot?.relationship.lastInteractionAt ?? DateTime.now(),
      ),
      timeSinceLastProactive: DateTime.now().difference(_lastProactiveAt),
      vitalityPhase: vitalityPhase,
    );
    return engine.evaluate();
  }

  void markProactiveSent() {
    _emotionalState = _emotionalState.onProactiveSent();
    _lastProactiveAt = DateTime.now();
    _persistEmotionalState();
    notifyListeners();
  }

  Future<void> loadEmotionalState() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString('emotional_state_v1');
    if (json != null) {
      try {
        _emotionalState = EmotionalState.fromJson(
          jsonDecode(json) as Map<String, dynamic>,
        );
      } catch (_) {
        _emotionalState = EmotionalState.initial();
      }
    }
  }

  void _persistEmotionalState() {
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('emotional_state_v1', jsonEncode(_emotionalState.toJson()));
    });
  }

  void triggerGlitch(String form) {
    _isGlitching = true;
    _glitchForm = form;
    notifyListeners();
    if (_petRepository != null) {
      _petRepository!.recordGlitch(_defaultPetId, form);
    }
    Future.delayed(const Duration(milliseconds: 100), () {
      _isGlitching = false;
      notifyListeners();
    });
  }

  void startGlitchCheck() {
    _glitchCheckTimer = Timer.periodic(const Duration(seconds: 45), (_) {
      if (_isGlitching) return;
      if (_petRepository == null) return;
      final form = _petRepository!.checkGlitchTrigger(_defaultPetId);
      if (form != null) {
        triggerGlitch(form);
      }
    });
  }

  void toggleEmotionLens() {
    _isEmotionLensOpen = !_isEmotionLensOpen;
    if (_isEmotionLensOpen) {
      _updateEmotionLensLine();
    }
    notifyListeners();
  }

  void _updateEmotionLensLine() {
    final depth = (relationshipState.echoDepth * 100).toStringAsFixed(1);
    final instability = (geneticInstability * 100).toStringAsFixed(1);
    final phase = relationshipState.phase.displayName;
    _emotionLensLine = '[分析交互流...] -> 回响深度: $depth% '
        '-> 当前阶段: $phase '
        '-> 回响数量: ${relationshipState.echoes.length} '
        '-> 基因不稳定性: $instability%';
  }

  void refreshEmotionLens() {
    if (_isEmotionLensOpen) {
      _updateEmotionLensLine();
      notifyListeners();
    }
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

  void setFirstTimeChoice(FirstTimeChoice choice) {
    _firstTimeChoice = choice;
    _persistFirstTime();
    notifyListeners();
  }

  void setPetName(String name) {
    _petName = name;
    _isFirstTime = false;
    _persistFirstTime();
    notifyListeners();
  }

  Future<void> _persistFirstTime() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('first_pet_interaction', false);
    if (_petName != null) {
      await prefs.setString('pet_name', _petName!);
    }
  }

  Future<void> loadFirstTimeState() async {
    final prefs = await SharedPreferences.getInstance();
    _isFirstTime = prefs.getBool('first_pet_interaction') ?? true;
    _petName = prefs.getString('pet_name');
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
    _actionController.close();
    _subtitleCleanupTimer?.cancel();
    _particleCleanupTimer?.cancel();
    _vitalityTickTimer?.cancel();
    _proactiveMemoryTimer?.cancel();
    _glitchCheckTimer?.cancel();
    super.dispose();
  }
}
