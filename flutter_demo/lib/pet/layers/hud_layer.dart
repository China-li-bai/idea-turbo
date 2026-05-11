import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import '../pet_store.dart';
import '../../ui/widgets/vitality_bar.dart';

class HUDLayer extends StatefulWidget {
  final PetStore store;
  final Future<({String response, dynamic memoryContext})> Function(String) onSendMessage;
  final VoidCallback? onOpenGallery;
  final VoidCallback? onOpenPersonality;

  const HUDLayer({
    super.key,
    required this.store,
    required this.onSendMessage,
    this.onOpenGallery,
    this.onOpenPersonality,
  });

  @override
  State<HUDLayer> createState() => _HUDLayerState();
}

class _HUDLayerState extends State<HUDLayer> with SingleTickerProviderStateMixin {
  late AnimationController _inputController;
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _isSending = false;
  bool _showVitality = false;

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
  void dispose() {
    _inputController.dispose();
    _textController.dispose();
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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildTopBar(),
          _buildBottomControls(size, bottomPadding),
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
            if (widget.store.vitalityState != null)
              _buildVitalityToggle(),
          ],
        ),
      ),
    );
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
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.10),
                ),
              ),
              child: const Icon(
                Icons.menu,
                color: Colors.white54,
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
                    ? Colors.amber.withValues(alpha: 0.15)
                    : Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: _showVitality
                      ? Colors.amber.withValues(alpha: 0.3)
                      : Colors.white.withValues(alpha: 0.10),
                ),
              ),
              child: Icon(
                Icons.favorite,
                color: _showVitality ? Colors.amber : Colors.white54,
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
              color: Colors.black.withValues(alpha: 0.85),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 24),
                _menuItem(
                  icon: Icons.photo_album,
                  label: '记忆画廊',
                  subtitle: '查看宠物的所有记忆',
                  onTap: () {
                    Navigator.pop(ctx);
                    widget.onOpenGallery?.call();
                  },
                ),
                const SizedBox(height: 12),
                _menuItem(
                  icon: Icons.psychology,
                  label: '人格档案',
                  subtitle: '查看宠物的性格特质',
                  onTap: () {
                    Navigator.pop(ctx);
                    widget.onOpenPersonality?.call();
                  },
                ),
                const SizedBox(height: 12),
                _menuItem(
                  icon: Icons.share,
                  label: '分享战报',
                  subtitle: '生成今日互动报告',
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
            color: Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
          child: Row(
            children: [
              Icon(icon, color: Colors.white54, size: 24),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.white.withValues(alpha: 0.3)),
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
                    Colors.deepPurple.withValues(alpha: 0.3),
                    Colors.black.withValues(alpha: 0.9),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('🐱', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 12),
                  const Text(
                    '镇岳的今日战报',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (vitality != null) ...[
                    _reportRow('⚡ 能量', '${(vitality.socialEnergy * 100).toInt()}%'),
                    _reportRow('💛 心情', '${(vitality.emotionalBattery * 100).toInt()}%'),
                    _reportRow('💬 互动', '${widget.store.interactionCount} 次'),
                  ],
                  if (personality != null && personality.hasAwakened) ...[
                    const SizedBox(height: 8),
                    _reportRow('🌟 人格', _archetypeShortName(personality.currentArchetype)),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('战报已生成！长按保存图片分享'),
                            backgroundColor: Colors.deepPurple,
                          ),
                        );
                      },
                      icon: const Icon(Icons.share),
                      label: const Text('分享到朋友圈'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.deepPurple,
                        foregroundColor: Colors.white,
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
          Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 14)),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  String _archetypeShortName(PersonalityArchetype archetype) {
    switch (archetype) {
      case PersonalityArchetype.cyberpunkSarcastic: return '赛博毒舌';
      case PersonalityArchetype.zenPhilosopher: return '禅意哲学家';
      case PersonalityArchetype.socialButterfly: return '社交蝴蝶';
      case PersonalityArchetype.introvertPoet: return '内敛诗人';
      case PersonalityArchetype.chaosAgent: return '混沌使者';
      case PersonalityArchetype.nostalgiaElder: return '怀旧长者';
      case PersonalityArchetype.techEvangelist: return '科技布道者';
      case PersonalityArchetype.warmHealer: return '温暖治愈者';
      default: return '未觉醒';
    }
  }

  Widget _buildBottomControls(Size size, double bottomPadding) {
    return Padding(
      padding: EdgeInsets.only(bottom: 32 + bottomPadding),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_showVitality && widget.store.vitalityState != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: VitalityBar(state: widget.store.vitalityState!),
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
            color: Colors.white.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.20),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
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
                      color: Colors.white,
                      fontSize: 16,
                    ),
                    decoration: InputDecoration(
                      hintText: '说点什么...',
                      hintStyle: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
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
                      color: Colors.white54,
                    ),
                  ),
                )
              else
                IconButton(
                  onPressed: _sendMessage,
                  icon: const Icon(Icons.send, color: Colors.white54, size: 20),
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
                    ? Colors.cyan.withValues(alpha: 0.20)
                    : Colors.white.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: isOpen
                      ? Colors.cyan.withValues(alpha: 0.50)
                      : Colors.white.withValues(alpha: 0.20),
                ),
                boxShadow: isOpen
                    ? [
                        BoxShadow(
                          color: Colors.cyan.withValues(alpha: 0.30),
                          blurRadius: 30,
                        ),
                      ]
                    : [],
              ),
              child: Icon(
                Icons.visibility,
                color: isOpen ? Colors.cyanAccent : Colors.white54,
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
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.10),
                ),
              ),
              child: Center(
                child: Text(
                  '输入...',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 1,
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
                    ? Colors.green.withValues(alpha: 0.20)
                    : Colors.white.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: isListening
                      ? Colors.green.withValues(alpha: 0.50)
                      : Colors.white.withValues(alpha: 0.20),
                ),
                boxShadow: isListening
                    ? [
                        BoxShadow(
                          color: Colors.green.withValues(alpha: 0.40),
                          blurRadius: 40,
                        ),
                        BoxShadow(
                          color: Colors.green.withValues(alpha: 0.20),
                          blurRadius: 20,
                          offset: const Offset(0, 0),
                        ),
                      ]
                    : [],
              ),
              child: Icon(
                Icons.mic,
                color: isListening ? Colors.greenAccent : Colors.white54,
                size: 24,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
