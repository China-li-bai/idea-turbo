import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import '../pet_store.dart';
import '../domain/vitality_phase.dart';
import '../narrative/narrative_engine.dart';
import '../narrative/first_time_narrative.dart';
import '../../ui/design/memory_design.dart';
import '../../ui/widgets/vitality_bar.dart';

class HUDLayer extends StatefulWidget {
  final PetStore store;
  final Future<({String response, dynamic memoryContext})> Function(String)
  onSendMessage;
  final VoidCallback? onOpenGallery;
  final VoidCallback? onOpenPersonality;
  final VoidCallback? onOpenDiary;

  const HUDLayer({
    super.key,
    required this.store,
    required this.onSendMessage,
    this.onOpenGallery,
    this.onOpenPersonality,
    this.onOpenDiary,
  });

  @override
  State<HUDLayer> createState() => _HUDLayerState();
}

class _HUDLayerState extends State<HUDLayer>
    with SingleTickerProviderStateMixin {
  late AnimationController _inputController;
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _isSending = false;
  bool _showVitality = false;

  NarrativeEngine? _narrativeEngine;
  StreamSubscription<NarrativeEvent>? _narrativeSub;
  String? _narrativeSubtitle;
  double _narrativeOpacity = 1.0;
  bool _showChoiceButtons = false;
  bool _showNamingInput = false;
  List<FirstTimeChoice> _choices = [];
  final TextEditingController _nameController = TextEditingController();
  String? _namingError;

  @override
  void initState() {
    super.initState();
    _inputController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void didUpdateWidget(HUDLayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.store != oldWidget.store) {
      _setupNarrativeEngine();
    }
  }

  void _setupNarrativeEngine() {
    _narrativeSub?.cancel();
    _narrativeEngine?.dispose();

    if (!widget.store.isFirstTime) return;

    _narrativeEngine = NarrativeEngine();
    _narrativeSub = _narrativeEngine!.events.listen(_onNarrativeEvent);
    _narrativeEngine!.start();
  }

  void _onNarrativeEvent(NarrativeEvent event) {
    if (!mounted) return;

    switch (event.type) {
      case NarrativeEventType.showText:
        setState(() {
          _narrativeSubtitle = event.text;
          _narrativeOpacity = event.opacity ?? 1.0;
        });
        break;

      case NarrativeEventType.showChoices:
        setState(() {
          _showChoiceButtons = true;
          _choices = event.choices ?? [];
        });
        break;

      case NarrativeEventType.hideChoices:
        setState(() => _showChoiceButtons = false);
        break;

      case NarrativeEventType.askNaming:
        setState(() => _showNamingInput = true);
        break;

      case NarrativeEventType.hideNamingInput:
        setState(() => _showNamingInput = false);
        break;

      case NarrativeEventType.completed:
        setState(() {
          _narrativeSubtitle = null;
          _showChoiceButtons = false;
          _showNamingInput = false;
        });
        widget.store.setPetName(_narrativeEngine!.petName ?? '镇岳');
        break;
    }
  }

  void _onSelectChoice(FirstTimeChoice choice) {
    widget.store.setFirstTimeChoice(choice);
    _narrativeEngine?.selectChoice(choice);
  }

  void _onSubmitName() {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    final result = NamingValidation.validate(name);
    if (!result.isValid) {
      setState(() => _namingError = result.error);
      return;
    }

    setState(() => _namingError = null);
    _narrativeEngine?.submitName(name);
  }

  @override
  void dispose() {
    _narrativeSub?.cancel();
    _narrativeEngine?.dispose();
    _inputController.dispose();
    _textController.dispose();
    _nameController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus && !widget.store.isInputOpen) {
      widget.store.setIsInputOpen(true);
      _inputController.forward();
    }
  }

  void _openInput() {
    widget.store.setIsInputOpen(true);
    _inputController.forward();
    Future.delayed(const Duration(milliseconds: 100), () {
      _focusNode.requestFocus();
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isSending) return;

    _textController.clear();
    _focusNode.unfocus();
    _inputController.reverse();
    widget.store.setIsInputOpen(false);

    final size = MediaQuery.of(context).size;
    widget.store.addSubtitle(
      text,
      size.width * 0.5 - 100,
      size.height - 200,
      isUser: true,
    );

    widget.store.setMood(PetMood.thinking);

    setState(() => _isSending = true);

    try {
      final result = await widget.onSendMessage(text);
      if (!mounted) return;
      widget.store.setMood(PetMood.speaking);
      widget.store.addSubtitle(
        result.response,
        size.width * 0.5 - 80,
        size.height * 0.35,
        isUser: false,
      );
      Future.delayed(const Duration(seconds: 3), () {
        if (widget.store.mood == PetMood.speaking) {
          widget.store.setMood(PetMood.idle);
        }
      });
    } catch (e) {
      if (!mounted) return;
      widget.store.setMood(PetMood.dizzy);
      widget.store.addSubtitle(
        '... 我的思绪断了。',
        size.width * 0.5 - 60,
        size.height * 0.35,
        isUser: false,
      );
      Future.delayed(const Duration(seconds: 3), () {
        if (widget.store.mood == PetMood.dizzy) {
          widget.store.setMood(PetMood.idle);
        }
      });
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _toggleListening() {
    if (widget.store.isListening) {
      widget.store.setIsListening(false);
      widget.store.setMood(PetMood.idle);
    } else {
      widget.store.setIsListening(true);
      widget.store.setMood(PetMood.listening);

      Future.delayed(const Duration(seconds: 3), () {
        if (!mounted) return;
        widget.store.setIsListening(false);
        final size = MediaQuery.of(context).size;
        widget.store.addSubtitle(
          '你好？',
          size.width * 0.5 - 50,
          size.height - 200,
          isUser: true,
        );
        widget.store.setMood(PetMood.thinking);

        Future.delayed(const Duration(seconds: 1), () async {
          if (!mounted) return;
          try {
            final result = await widget.onSendMessage('用户说了你好');
            widget.store.setMood(PetMood.speaking);
            widget.store.addSubtitle(
              result.response,
              size.width * 0.5 - 80,
              size.height * 0.35,
              isUser: false,
            );
            Future.delayed(const Duration(seconds: 3), () {
              if (widget.store.mood == PetMood.speaking) {
                widget.store.setMood(PetMood.idle);
              }
            });
          } catch (e) {
            widget.store.setMood(PetMood.dizzy);
          }
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      child: Stack(
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildTopBar(),
              _buildBottomControls(size, bottomPadding),
            ],
          ),
          if (_narrativeSubtitle != null) _buildNarrativeSubtitle(size),
          if (_showChoiceButtons) _buildChoiceButtons(size),
          if (_showNamingInput) _buildNamingInput(size),
        ],
      ),
    );
  }

  Widget _buildNarrativeSubtitle(Size size) {
    return Positioned(
      bottom: size.height * 0.3,
      left: 0,
      right: 0,
      child: Center(
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 500),
          opacity: _narrativeOpacity,
          child: MemorySurface(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
            radius: 14,
            color: MemoryPalette.ink.withValues(alpha: 0.58),
            child: Text(
              _narrativeSubtitle!,
              style: TextStyle(
                color: MemoryPalette.paper.withValues(alpha: 0.94),
                fontSize: 16,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChoiceButtons(Size size) {
    return Positioned(
      bottom: size.height * 0.15,
      left: 24,
      right: 24,
      child: Column(
        children: _choices.map((choice) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _ChoiceButton(
              text: choice.text,
              onTap: () => _onSelectChoice(choice),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildNamingInput(Size size) {
    return Positioned(
      bottom: size.height * 0.15,
      left: 24,
      right: 24,
      child: Column(
        children: [
          MemorySurface(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            radius: 16,
            color: MemoryPalette.ink.withValues(alpha: 0.68),
            child: TextField(
              controller: _nameController,
              style: const TextStyle(color: MemoryPalette.paper, fontSize: 16),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                hintText: '给这枚人格核心取个名字...',
                hintStyle: TextStyle(
                  color: MemoryPalette.paper.withValues(alpha: 0.42),
                  fontSize: 16,
                ),
                border: InputBorder.none,
              ),
              onSubmitted: (_) => _onSubmitName(),
            ),
          ),
          if (_namingError != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _namingError!,
                style: const TextStyle(color: MemoryPalette.rust, fontSize: 12),
              ),
            ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _onSubmitName,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              decoration: BoxDecoration(
                color: MemoryPalette.gold.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: MemoryPalette.gold.withValues(alpha: 0.36),
                ),
              ),
              child: const Text(
                '确认',
                style: TextStyle(
                  color: MemoryPalette.gold,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildMenuButton(),
            Row(
              children: [
                _buildVitalityPhaseIndicator(),
                const SizedBox(width: 8),
                if (widget.store.vitalityState case _) _buildVitalityToggle(),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVitalityPhaseIndicator() {
    final phase = widget.store.vitalityPhase;
    final phaseColor = _phaseColor(phase);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: phaseColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: phaseColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: phaseColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            widget.store.vitalityState.phaseLabel,
            style: TextStyle(
              color: phaseColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Color _phaseColor(VitalityPhase phase) {
    switch (phase) {
      case VitalityPhase.vibrant:
        return MemoryPalette.moss;
      case VitalityPhase.normal:
        return MemoryPalette.gold;
      case VitalityPhase.lethargic:
        return MemoryPalette.rust;
      case VitalityPhase.fragile:
        return const Color(0xFFB65A4E);
      case VitalityPhase.dormant:
        return MemoryPalette.muted;
    }
  }

  Widget _buildMenuButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: () => _showMenu(),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: MemoryPalette.paper.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: MemoryPalette.paper.withValues(alpha: 0.12),
                ),
              ),
              child: const Icon(
                Icons.menu,
                color: MemoryPalette.muted,
                size: 24,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVitalityToggle() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: () => setState(() => _showVitality = !_showVitality),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _showVitality
                    ? MemoryPalette.gold.withValues(alpha: 0.17)
                    : MemoryPalette.paper.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: _showVitality
                      ? MemoryPalette.gold.withValues(alpha: 0.36)
                      : MemoryPalette.paper.withValues(alpha: 0.12),
                ),
              ),
              child: Icon(
                Icons.favorite,
                color: _showVitality ? MemoryPalette.gold : MemoryPalette.muted,
                size: 22,
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: MemoryPalette.ink.withValues(alpha: 0.90),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
              border: Border.all(
                color: MemoryPalette.paper.withValues(alpha: 0.10),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: MemoryPalette.paper.withValues(alpha: 0.20),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 24),
                _menuItem(
                  icon: Icons.photo_album,
                  label: '相簿',
                  subtitle: '查看被相触发的情感记忆',
                  onTap: () {
                    Navigator.pop(ctx);
                    widget.onOpenGallery?.call();
                  },
                ),
                const SizedBox(height: 12),
                _menuItem(
                  icon: Icons.psychology,
                  label: '人格档案',
                  subtitle: '查看长期互动塑造的人格',
                  onTap: () {
                    Navigator.pop(ctx);
                    widget.onOpenPersonality?.call();
                  },
                ),
                const SizedBox(height: 12),
                _menuItem(
                  icon: Icons.auto_stories,
                  label: '内心独白',
                  subtitle: '阅读人格的日记与梦境',
                  onTap: () {
                    Navigator.pop(ctx);
                    widget.onOpenDiary?.call();
                  },
                ),
                const SizedBox(height: 12),
                _menuItem(
                  icon: Icons.share,
                  label: '记忆回执',
                  subtitle: '生成今日关系与记忆摘要',
                  onTap: () {
                    Navigator.pop(ctx);
                    _showSharePreview();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _menuItem({
    required IconData icon,
    required String label,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: MemoryPalette.paper.withValues(alpha: 0.055),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: MemoryPalette.paper.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: MemoryPalette.gold.withValues(alpha: 0.78),
                size: 24,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        color: MemoryPalette.paper,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: MemoryPalette.paper.withValues(alpha: 0.42),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: MemoryPalette.paper.withValues(alpha: 0.26),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSharePreview() {
    final vitality = widget.store.vitalityState;
    final personality = widget.store.personalityProfile;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    MemoryPalette.gold.withValues(alpha: 0.18),
                    MemoryPalette.ink.withValues(alpha: 0.94),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: MemoryPalette.paper.withValues(alpha: 0.12),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const MemoryGlyph(size: 58, compact: true),
                  const SizedBox(height: 12),
                  const Text(
                    '镇岳的今日记忆回执',
                    style: TextStyle(
                      color: MemoryPalette.paper,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (vitality case final v) ...[
                    _reportRow('⚡ 能量', '${(v.socialEnergy * 100).toInt()}%'),
                    _reportRow(
                      '💛 心情',
                      '${(v.emotionalBattery * 100).toInt()}%',
                    ),
                    _reportRow('💬 互动', '${widget.store.interactionCount} 次'),
                  ],
                  if (personality.hasAwakened) ...[
                    const SizedBox(height: 8),
                    _reportRow(
                      '🌟 人格',
                      _archetypeShortName(personality.currentArchetype),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('记忆回执已生成，长按保存图片分享'),
                            backgroundColor: MemoryPalette.umber,
                          ),
                        );
                      },
                      icon: const Icon(Icons.share),
                      label: const Text('分享回执'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: MemoryPalette.gold,
                        foregroundColor: MemoryPalette.ink,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _reportRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: MemoryPalette.paper.withValues(alpha: 0.62),
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: MemoryPalette.paper,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _archetypeShortName(PersonalityArchetype archetype) {
    switch (archetype) {
      case PersonalityArchetype.cyberpunkSarcastic:
        return '赛博毒舌';
      case PersonalityArchetype.zenPhilosopher:
        return '禅意哲学家';
      case PersonalityArchetype.socialButterfly:
        return '社交蝴蝶';
      case PersonalityArchetype.introvertPoet:
        return '内敛诗人';
      case PersonalityArchetype.chaosAgent:
        return '混沌使者';
      case PersonalityArchetype.nostalgiaElder:
        return '怀旧长者';
      case PersonalityArchetype.techEvangelist:
        return '科技布道者';
      case PersonalityArchetype.warmHealer:
        return '温暖治愈者';
      default:
        return '未觉醒';
    }
  }

  Widget _buildBottomControls(Size size, double bottomPadding) {
    return Padding(
      padding: EdgeInsets.only(bottom: 32 + bottomPadding),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_showVitality)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: VitalityBar(state: widget.store.vitalityState),
            ),
          AnimatedBuilder(
            animation: _inputController,
            builder: (context, _) {
              final inputOpen = _inputController.value > 0.5;

              if (inputOpen) {
                return _buildTextInput(size);
              } else {
                return _buildControlPills();
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTextInput(Size size) {
    final inputWidth = size.width * 0.85;

    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          width: inputWidth,
          height: 56,
          decoration: BoxDecoration(
            color: MemoryPalette.paper.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: MemoryPalette.paper.withValues(alpha: 0.18),
            ),
            boxShadow: [
              BoxShadow(
                color: MemoryPalette.ink.withValues(alpha: 0.38),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 24),
                  child: TextField(
                    controller: _textController,
                    focusNode: _focusNode,
                    style: const TextStyle(
                      color: MemoryPalette.paper,
                      fontSize: 16,
                    ),
                    decoration: InputDecoration(
                      hintText: '把此刻交给它记住...',
                      hintStyle: TextStyle(
                        color: MemoryPalette.paper.withValues(alpha: 0.42),
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
              ),
              if (_isSending)
                const Padding(
                  padding: EdgeInsets.only(right: 16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: MemoryPalette.muted,
                    ),
                  ),
                )
              else
                IconButton(
                  onPressed: _sendMessage,
                  icon: const Icon(
                    Icons.send,
                    color: MemoryPalette.muted,
                    size: 20,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControlPills() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildTextPill(),
        const SizedBox(width: 12),
        _buildLensButton(),
        const SizedBox(width: 12),
        _buildMicButton(),
      ],
    );
  }

  Widget _buildLensButton() {
    final isOpen = widget.store.isEmotionLensOpen;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: () => widget.store.toggleEmotionLens(),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: isOpen
                    ? MemoryPalette.moss.withValues(alpha: 0.22)
                    : MemoryPalette.paper.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: isOpen
                      ? MemoryPalette.moss.withValues(alpha: 0.48)
                      : MemoryPalette.paper.withValues(alpha: 0.16),
                ),
                boxShadow: isOpen
                    ? [
                        BoxShadow(
                          color: MemoryPalette.moss.withValues(alpha: 0.26),
                          blurRadius: 30,
                        ),
                      ]
                    : [],
              ),
              child: Icon(
                Icons.visibility,
                color: isOpen ? MemoryPalette.moss : MemoryPalette.muted,
                size: 22,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextPill() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: _openInput,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              height: 56,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              decoration: BoxDecoration(
                color: MemoryPalette.paper.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: MemoryPalette.paper.withValues(alpha: 0.12),
                ),
              ),
              child: Center(
                child: Text(
                  '记录',
                  style: TextStyle(
                    color: MemoryPalette.paper.withValues(alpha: 0.72),
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMicButton() {
    final isListening = widget.store.isListening;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: _toggleListening,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: isListening
                    ? MemoryPalette.moss.withValues(alpha: 0.22)
                    : MemoryPalette.paper.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: isListening
                      ? MemoryPalette.moss.withValues(alpha: 0.48)
                      : MemoryPalette.paper.withValues(alpha: 0.16),
                ),
                boxShadow: isListening
                    ? [
                        BoxShadow(
                          color: MemoryPalette.moss.withValues(alpha: 0.34),
                          blurRadius: 40,
                        ),
                        BoxShadow(
                          color: MemoryPalette.moss.withValues(alpha: 0.16),
                          blurRadius: 20,
                          offset: const Offset(0, 0),
                        ),
                      ]
                    : [],
              ),
              child: Icon(
                Icons.mic,
                color: isListening ? MemoryPalette.moss : MemoryPalette.muted,
                size: 24,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChoiceButton extends StatelessWidget {
  final String text;
  final VoidCallback onTap;

  const _ChoiceButton({required this.text, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          color: MemoryPalette.paper.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: MemoryPalette.paper.withValues(alpha: 0.14),
          ),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: MemoryPalette.paper,
            fontSize: 15,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
