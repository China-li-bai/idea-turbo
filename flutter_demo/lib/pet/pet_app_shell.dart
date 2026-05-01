import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/pet_context.dart' as mnemosyne_pet;

import 'pet_store.dart';
import 'layers/habitat_layer.dart';
import 'layers/entity_layer.dart';
import 'layers/spatial_ui_layer.dart';
import 'layers/gesture_layer.dart';
import 'layers/hud_layer.dart';
import 'services/ai_service.dart';
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
  MemoryService? _memoryService;
  bool _isInitializing = true;
  String _initStatus = '正在唤醒镇岳...';
  int _interactionCountSinceLastCheck = 0;

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

      _store.setVitalityService(_locator.vitalityService);
      _store.setPersonalityService(_locator.personalityService);

      final profile = _locator.personalityService.getProfile('zhenyue');
      if (profile.hasAwakened) {
        _aiService.setPersonalityProfile(profile);
      }

      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _initStatus = '';
      });

      final size = MediaQuery.of(context).size;
      _store.addSubtitle(
        '*伸了个懒腰* 嗯... 你来了。',
        size.width * 0.5 - 80,
        size.height * 0.35,
        isUser: false,
      );

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
    final petContext = _buildPetContext();
    final result = await _aiService.generateResponse(
      message,
      petContext: petContext,
    );

    if (_memoryService != null) {
      unawaited(_memoryService!.rememberInteraction(
        userMessage: message,
        petResponse: result.response,
        petContext: petContext,
      ));
    }

    _store.onInteraction(message);
    _interactionCountSinceLastCheck++;

    _checkAwakening();

    return (response: result.response, memoryContext: result.memoryContext);
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
    if (_interactionCountSinceLastCheck < 10) return;

    _interactionCountSinceLastCheck = 0;

    final profile = _locator.personalityService.getProfile('zhenyue');
    if (profile.hasAwakened) return;

    final result = _locator.personalityService.checkAwakening('zhenyue');
    if (result != null) {
      _aiService.setPersonalityProfile(
        _locator.personalityService.getProfile('zhenyue'),
      );
      _store.setAwakeningResult(result);

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
    if (profile == null) return;
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
            EntityLayer(store: _store),
            SpatialUILayer(store: _store),
            GestureLayer(store: _store),
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
