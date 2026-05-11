import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/pet_context.dart' as mnemosyne_pet;
import 'package:shared_preferences/shared_preferences.dart';

import 'pet_store.dart';
import 'layers/habitat_layer.dart';
import 'layers/entity_layer.dart';
import 'layers/spatial_ui_layer.dart';
import 'layers/gesture_layer.dart';
import 'layers/hud_layer.dart';
import 'layers/resonance_mandala.dart';
import 'layers/subliminal_glitch.dart';
import 'layers/emotion_lens.dart';
import 'services/ai_service.dart';
import 'services/prompt_builder.dart';
import 'services/response_gate.dart';
import 'services/proactive_engine.dart';
import 'domain/pet_action.dart';
import '../core/di/service_locator.dart';
import '../data/services/memory_service.dart';
import '../ui/pages/memory_gallery_page.dart';
import '../ui/pages/personality_page.dart';
import '../ui/widgets/awakening_card.dart';

class PetAppShell extends StatefulWidget {
  final String modelPath;

  const PetAppShell({super.key, required this.modelPath});

  @override
  State<PetAppShell> createState() => _PetAppShellState();
}

class _PetAppShellState extends State<PetAppShell> {
  final PetStore _store = PetStore();
  final AiService _aiService = AiService();
  final ServiceLocator _locator = ServiceLocator();
  final PromptBuilder _promptBuilder = PromptBuilder();
  MemoryService? _memoryService;
  bool _isInitializing = true;
  String _initStatus = '正在唤醒镇岳...';

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  @override
  void dispose() {
    _store.dispose();
    _aiService.dispose();
    _locator.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    try {
      setState(() => _initStatus = '正在初始化记忆系统...');
      await _locator.initialize();

      _memoryService = MemoryService(_locator.petMemoryBridge);
      _aiService.setMemoryService(_memoryService!);

      setState(() => _initStatus = '正在加载思维模型...');
      await _aiService.initialize(widget.modelPath);

      _store.setPetRepository(_locator.petRepository);
      await _store.loadEmotionalState();

      _aiService.setEmotionalState(_store.emotionalState);

      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _initStatus = '';
      });

      _store.startGlitchCheck();

      final size = MediaQuery.of(context).size;
      final prefs = await SharedPreferences.getInstance();
      final isFirstTime = prefs.getBool('first_pet_interaction') ?? true;

      if (isFirstTime) {
        _store.addSubtitle(
          '*睁开眼，瞳孔收缩* ...我好冷。',
          size.width * 0.5 - 100,
          size.height * 0.35,
          isUser: false,
        );
        Future.delayed(const Duration(seconds: 3), () {
          if (!mounted) return;
          _store.addSubtitle(
            '你的心跳频率是 75 下每分钟，看起来很平静。但我总觉得你有心事。',
            size.width * 0.5 - 160,
            size.height * 0.28,
            isUser: false,
          );
        });
        Future.delayed(const Duration(seconds: 7), () {
          if (!mounted) return;
          _store.addSubtitle(
            '你能给我取个名字，并告诉我你今天最讨厌的一件事吗？',
            size.width * 0.5 - 170,
            size.height * 0.22,
            isUser: false,
          );
        });
      } else {
        _store.addSubtitle(
          '*伸了个懒腰* 嗯... 你来了。',
          size.width * 0.5 - 80,
          size.height * 0.35,
          isUser: false,
        );
      }

      _store.startProactiveMemoryTimer(_checkProactiveMemory);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _initStatus = '唤醒失败: $e';
      });
    }
  }

  Future<({String response, dynamic memoryContext})> _handleSendMessage(
    String message,
  ) async {
    _store.onInteraction(message);
    _aiService.setEmotionalState(_store.emotionalState);

    final decision = _store.gateResponse(message);

    if (decision.action == ResponseAction.silentAction) {
      if (decision.petAction != null) {
        _store.dispatchAction(decision.petAction!);
      }
      _store.refreshEmotionLens();
      _checkAwakening();
      return (
        response: decision.petAction?.displayText ?? '*沉默*',
        memoryContext: null,
      );
    }

    if (decision.action == ResponseAction.refuse) {
      _store.dispatchAction(const PetAction(
        type: PetActionType.retreat,
        displayText: '*转过身去*',
      ));
      _store.refreshEmotionLens();
      return (response: '*转过身去*', memoryContext: null);
    }

    final petContext = _buildPetContext();

    final moodHint = _promptBuilder.buildOverridePrompt(
      emotionalState: _store.emotionalState,
      additionalHint: decision.moodHint,
    );

    final result = await _aiService.generateResponse(
      message,
      petContext: petContext,
      moodHint: moodHint.isNotEmpty ? moodHint : null,
    );

    if (result.actions.isNotEmpty) {
      _store.dispatchActions(result.actions);
    }

    if (_memoryService != null) {
      unawaited(_memoryService!.rememberInteraction(
        userMessage: message,
        petResponse: result.displayText,
        petContext: petContext,
      ));
    }

    _store.refreshEmotionLens();

    _checkAwakening();

    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool('first_pet_interaction') ?? true) {
      await prefs.setBool('first_pet_interaction', false);
    }

    if (decision.delay != null) {
      await Future.delayed(decision.delay!);
    }

    return (response: result.displayText, memoryContext: result.memoryContext);
  }

  mnemosyne_pet.PetContext _buildPetContext() {
    final now = DateTime.now();
    return mnemosyne_pet.PetContext.capture(
      mood: _mapMoodToMnemosyne(_store.mood),
      state: _mapStateToMnemosyne(),
      now: now,
    );
  }

  mnemosyne_pet.PetMood _mapMoodToMnemosyne(PetMood mood) {
    switch (mood) {
      case PetMood.happy:
        return mnemosyne_pet.PetMood.happy;
      case PetMood.sleepy:
        return mnemosyne_pet.PetMood.sleepy;
      case PetMood.curious:
        return mnemosyne_pet.PetMood.curious;
      case PetMood.dizzy:
        return mnemosyne_pet.PetMood.anxious;
      case PetMood.listening:
        return mnemosyne_pet.PetMood.curious;
      case PetMood.thinking:
        return mnemosyne_pet.PetMood.curious;
      case PetMood.speaking:
        return mnemosyne_pet.PetMood.playful;
      case PetMood.reading:
        return mnemosyne_pet.PetMood.neutral;
      case PetMood.idle:
        return mnemosyne_pet.PetMood.neutral;
    }
  }

  mnemosyne_pet.PetState _mapStateToMnemosyne() {
    if (_store.isListening) return mnemosyne_pet.PetState.talking;
    if (_store.isInputOpen) return mnemosyne_pet.PetState.thinking;
    return mnemosyne_pet.PetState.idle;
  }

  void _checkAwakening() {
    final profile = _store.personalityProfile;
    if (profile.hasAwakened) return;

    final relationship = _store.relationshipState;
    if (!relationship.hasAwakeningCatalyst) return;

    final ctx = AwakeningContext(
      catalystMessage: relationship.pendingCatalystMessage!,
      catalystSummary: relationship.pendingCatalystSummary!,
      significantMemories: relationship.echoes
          .map((e) => e.content)
          .toList(),
    );

    _aiService.setAwakeningContext(ctx);

    final result = _locator.petRepository.checkAwakening('zhenyue');
    if (result != null) {
      _store.setAwakeningResult(result);

      _locator.petRepository.recordGlitch('zhenyue', 'awakening');

      final size = MediaQuery.of(context).size;
      _store.addSubtitle(
        '✨ 我好像... 不一样了。',
        size.width * 0.5 - 80,
        size.height * 0.3,
        isUser: false,
      );
    }
  }

  void _checkProactiveMemory() async {
    final proactiveTrigger = _store.evaluateProactive();
    if (proactiveTrigger != null && mounted) {
      final size = MediaQuery.of(context).size;
      _store.addSubtitle(
        proactiveTrigger.message,
        size.width * 0.5 - 100,
        size.height * 0.25,
        isUser: false,
        isMemory: proactiveTrigger.reason == ProactiveReason.insideJokeRecall,
      );
      if (proactiveTrigger.petAction != null) {
        _store.dispatchAction(proactiveTrigger.petAction!);
      }
      _store.markProactiveSent();
      return;
    }

    if (_memoryService == null) return;

    final petContext = _buildPetContext();
    final trigger = await _memoryService!.checkSceneTrigger(
      petContext: petContext,
    );

    if (trigger != null && mounted) {
      final size = MediaQuery.of(context).size;
      _store.addSubtitle(
        '💭 ${trigger.memory.content}',
        size.width * 0.5 - 100,
        size.height * 0.25,
        isUser: false,
        isMemory: true,
      );
    }
  }

  void _openGallery() async {
    if (_memoryService == null) return;
    final memories = await _memoryService!.getRecentMemories(limit: 50);
    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MemoryGalleryPage(memories: memories),
      ),
    );
  }

  void _openPersonality() {
    final profile = _store.personalityProfile;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PersonalityPage(profile: profile),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return _buildLoadingScreen();
    }

    return Scaffold(
      body: Container(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            HabitatLayer(store: _store),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(flex: 5),
                  EntityLayer(store: _store),
                  const SizedBox(height: 8),
                  ResonanceMandala(store: _store, size: 120),
                  const Spacer(flex: 1),
                ],
              ),
            ),
            SpatialUILayer(store: _store),
            GestureLayer(store: _store),
            SubliminalGlitch(store: _store),
            EmotionLens(store: _store),
            HUDLayer(
              store: _store,
              onSendMessage: _handleSendMessage,
              onOpenGallery: _openGallery,
              onOpenPersonality: _openPersonality,
            ),
            if (_store.isAwakeningAnimation && _store.awakeningResult != null)
              AwakeningCard(
                result: _store.awakeningResult!,
                onDismiss: () {
                  _store.dismissAwakening();
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(seconds: 2),
              builder: (context, value, _) {
                return Opacity(
                  opacity: value,
                  child: const Text(
                    '🐱',
                    style: TextStyle(fontSize: 64),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            Text(
              _initStatus,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 16,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: 120,
              child: LinearProgressIndicator(
                backgroundColor: Colors.white.withValues(alpha: 0.1),
                valueColor: AlwaysStoppedAnimation<Color>(
                  Colors.amber.withValues(alpha: 0.6),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
