import 'dart:ui';

import 'package:flutter/material.dart';
import '../pet_store.dart';

class SpatialUILayer extends StatelessWidget {
  final PetStore store;
  const SpatialUILayer({super.key, required this.store});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        return Stack(
          children: [
            ...store.subtitles.map((sub) => _SubtitleBubble(
                  key: ValueKey(sub.id),
                  subtitle: sub,
                  onDismiss: () => store.removeSubtitle(sub.id),
                )),
            ...store.particles.map((p) => _ParticleEffect(
                  key: ValueKey(p.id),
                  particle: p,
                  onDismiss: () => store.removeParticle(p.id),
                )),
          ],
        );
      },
    );
  }
}

class _SubtitleBubble extends StatefulWidget {
  final Subtitle subtitle;
  final VoidCallback onDismiss;

  const _SubtitleBubble({
    super.key,
    required this.subtitle,
    required this.onDismiss,
  });

  @override
  State<_SubtitleBubble> createState() => _SubtitleBubbleState();
}

class _SubtitleBubbleState extends State<_SubtitleBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacity;
  late Animation<double> _scale;
  late Animation<Offset> _slide;
  late Animation<double> _blur;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _opacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    _scale = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutBack,
      ),
    );

    _slide = Tween<Offset>(
      begin: const Offset(0, 20),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    _blur = Tween<double>(begin: 10, end: 0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();

    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        _controller.reverse().then((_) => widget.onDismiss());
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sub = widget.subtitle;
    final isUser = sub.isUser;

    return Positioned(
      left: sub.x,
      top: sub.y,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return Transform.translate(
            offset: _slide.value,
            child: Transform.scale(
              scale: _scale.value,
              child: Opacity(
                opacity: _opacity.value,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(
                      sigmaX: _blur.value,
                      sigmaY: _blur.value,
                    ),
                    child: Container(
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.7,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: isUser
                            ? Colors.white.withValues(alpha: 0.10)
                            : Colors.black.withValues(alpha: 0.40),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: isUser
                              ? Colors.white.withValues(alpha: 0.10)
                              : Colors.white.withValues(alpha: 0.05),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Text(
                        sub.text,
                        style: TextStyle(
                          color: isUser
                              ? Colors.white
                              : Colors.white.withValues(alpha: 0.9),
                          fontSize: 18,
                          fontWeight: FontWeight.w500,
                          height: 1.5,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ParticleEffect extends StatefulWidget {
  final Particle particle;
  final VoidCallback onDismiss;

  const _ParticleEffect({
    super.key,
    required this.particle,
    required this.onDismiss,
  });

  @override
  State<_ParticleEffect> createState() => _ParticleEffectState();
}

class _ParticleEffectState extends State<_ParticleEffect>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    _controller.forward().then((_) => widget.onDismiss());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _particleEmoji() {
    switch (widget.particle.type) {
      case ParticleType.heart:
        return '❤️';
      case ParticleType.sparkle:
        return '✨';
      case ParticleType.note:
        return '🎵';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: widget.particle.x,
      top: widget.particle.y,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final value = _controller.value;
          return Opacity(
            opacity: 1 - value,
            child: Transform.translate(
              offset: Offset(0, -100 * value),
              child: Transform.scale(
                scale: 0.5 + value * 1.5,
                child: Text(
                  _particleEmoji(),
                  style: const TextStyle(fontSize: 32),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
