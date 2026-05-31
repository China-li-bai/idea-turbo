import 'dart:ui';

import 'package:flutter/material.dart';
import '../pet_store.dart';
import '../../ui/design/memory_design.dart';

class HUDLayer extends StatefulWidget {
  final PetStore store;
  final Future<String> Function(String) onSendMessage;
  final VoidCallback? onOpenModels;

  const HUDLayer({
    super.key,
    required this.store,
    required this.onSendMessage,
    this.onOpenModels,
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
      final response = await widget.onSendMessage(text);
      if (!mounted) return;
      widget.store.setMood(PetMood.speaking);
      widget.store.addSubtitle(
        response,
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
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Align(
          alignment: Alignment.centerLeft,
          child: _buildMenuButton(),
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
                  icon: Icons.memory,
                  label: '本地模型',
                  subtitle: '切换或下载本地模型',
                  onTap: () {
                    Navigator.pop(ctx);
                    widget.onOpenModels?.call();
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

  Widget _buildBottomControls(Size size, double bottomPadding) {
    return Padding(
      padding: EdgeInsets.only(bottom: 32 + bottomPadding),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
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
                      hintText: '输入消息...',
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
      children: [_buildTextPill()],
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
                  '聊天',
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
}
