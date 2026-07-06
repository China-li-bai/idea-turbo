import 'package:flutter/material.dart';

import '../design/memory_design.dart';
import 'voice_input_controller.dart';

/// A microphone button that reflects the state of a [VoiceInputController].
///
/// Visual states:
///   - [VoiceInputState.idle]: gold mic icon, tap to start listening.
///   - [VoiceInputState.preparing]: spinner overlay, disabled.
///   - [VoiceInputState.listening]: pulsing red dot, tap to commit and stop.
///   - [VoiceInputState.error]: rust-colored, tap to retry.
///
/// The button uses the same 48x48 touch target as the send button in the
/// composer, ensuring consistent ergonomics. A small badge in the
/// top-right corner indicates the current error count (if any) so the
/// user knows something went wrong even when the message draft looks
/// fine.
///
/// This widget is stateless except for animation; all interaction state
/// comes from the controller. Use [AnimatedBuilder] (via [ListenableBuilder])
/// to subscribe.
class VoiceInputButton extends StatelessWidget {
  final VoiceInputController controller;
  final VoidCallback? onCancel;

  const VoiceInputButton({
    super.key,
    required this.controller,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        return SizedBox(
          width: 48,
          height: 48,
          child: _buildContent(),
        );
      },
    );
  }

  Widget _buildContent() {
    switch (controller.state) {
      case VoiceInputState.idle:
        return _buildButton(
          icon: const Icon(Icons.mic_none_rounded),
          onTap: controller.toggle,
        );

      case VoiceInputState.preparing:
        return _buildButton(
          icon: const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: MemoryPalette.muted,
            ),
          ),
          onTap: null,
          background: MemoryPalette.paper.withValues(alpha: 0.06),
          foreground: MemoryPalette.muted,
        );

      case VoiceInputState.listening:
        return _buildListeningButton();

      case VoiceInputState.error:
        return _buildButton(
          icon: const Icon(Icons.mic_off_rounded),
          onTap: controller.toggle,
          background: MemoryPalette.rust.withValues(alpha: 0.18),
          foreground: MemoryPalette.rust,
          tooltip: controller.error,
        );
    }
  }

  Widget _buildListeningButton() {
    return Stack(
      alignment: Alignment.center,
      children: [
        _buildButton(
          icon: const _PulsingMicIcon(),
          onTap: () => controller.toggle(),
          background: MemoryPalette.rust.withValues(alpha: 0.22),
          foreground: MemoryPalette.rust,
        ),
        Positioned(
          right: 4,
          top: 4,
          child: _buildCancelBadge(),
        ),
      ],
    );
  }

  Widget _buildCancelBadge() {
    return GestureDetector(
      onTap: () async {
        await controller.cancel();
        onCancel?.call();
      },
      child: Container(
        width: 18,
        height: 18,
        decoration: BoxDecoration(
          color: MemoryPalette.ink,
          shape: BoxShape.circle,
          border: Border.all(color: MemoryPalette.paper.withValues(alpha: 0.40)),
        ),
        child: const Icon(
          Icons.close_rounded,
          size: 12,
          color: MemoryPalette.paper,
        ),
      ),
    );
  }

  Widget _buildButton({
    required Widget icon,
    Future<void> Function()? onTap,
    Color? background,
    Color? foreground,
    String? tooltip,
  }) {
    final isInteractive = onTap != null;
    final button = FilledButton(
      onPressed: isInteractive ? () => onTap() : null,
      style: FilledButton.styleFrom(
        padding: EdgeInsets.zero,
        backgroundColor: background ?? MemoryPalette.paper.withValues(alpha: 0.07),
        foregroundColor: foreground ?? MemoryPalette.paper,
        disabledBackgroundColor: MemoryPalette.paper.withValues(alpha: 0.04),
        disabledForegroundColor: MemoryPalette.muted,
      ),
      child: icon,
    );

    if (tooltip == null) return button;
    return Tooltip(message: tooltip, child: button);
  }
}

/// A mic icon that pulses softly while listening.
class _PulsingMicIcon extends StatefulWidget {
  const _PulsingMicIcon();

  @override
  State<_PulsingMicIcon> createState() => _PulsingMicIconState();
}

class _PulsingMicIconState extends State<_PulsingMicIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.45, end: 1.0).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
      ),
      child: const Icon(Icons.mic_rounded, size: 22),
    );
  }
}
