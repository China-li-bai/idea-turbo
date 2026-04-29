import 'dart:ui';

import 'package:flutter/material.dart';
import '../pet_store.dart';

class HUDLayer extends StatefulWidget {
  final PetStore store;
  final Future<String> Function(String) onSendMessage;

  const HUDLayer({
    super.key,
    required this.store,
    required this.onSendMessage,
  });

  @override
  State<HUDLayer> createState() => _HUDLayerState();
}

class _HUDLayerState extends State<HUDLayer> with SingleTickerProviderStateMixin {
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
            final resp = await widget.onSendMessage('用户说了你好');
            widget.store.setMood(PetMood.speaking);
            widget.store.addSubtitle(
              resp,
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
        child: Align(
          alignment: Alignment.topLeft,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(28),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('菜单功能开发中...')),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.10),
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
          ),
        ),
      ),
    );
  }

  Widget _buildBottomControls(Size size, double bottomPadding) {
    return Padding(
      padding: EdgeInsets.only(bottom: 32 + bottomPadding),
      child: AnimatedBuilder(
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
            color: Colors.white.withOpacity(0.10),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: Colors.white.withOpacity(0.20),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
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
                        color: Colors.white.withOpacity(0.4),
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
        const SizedBox(width: 16),
        _buildMicButton(),
      ],
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
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: Colors.white.withOpacity(0.10),
                ),
              ),
              child: Center(
                child: Text(
                  '输入...',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
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
                    ? Colors.green.withOpacity(0.20)
                    : Colors.white.withOpacity(0.10),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: isListening
                      ? Colors.green.withOpacity(0.50)
                      : Colors.white.withOpacity(0.20),
                ),
                boxShadow: isListening
                    ? [
                        BoxShadow(
                          color: Colors.green.withOpacity(0.40),
                          blurRadius: 40,
                        ),
                        BoxShadow(
                          color: Colors.green.withOpacity(0.20),
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
