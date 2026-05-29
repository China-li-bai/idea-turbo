import 'dart:math';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

import '../design/memory_design.dart';

class AwakeningCard extends StatefulWidget {
  final AwakeningResult result;
  final VoidCallback onDismiss;

  const AwakeningCard({
    super.key,
    required this.result,
    required this.onDismiss,
  });

  @override
  State<AwakeningCard> createState() => _AwakeningCardState();
}

class _AwakeningCardState extends State<AwakeningCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;
  late Animation<double> _opacity;
  late Animation<double> _glowOpacity;
  final List<_Sparkle> _sparkles = [];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    _scale = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut),
      ),
    );

    _opacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.4, curve: Curves.easeOut),
      ),
    );

    _glowOpacity = Tween<double>(begin: 0.0, end: 0.6).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.3, 0.8, curve: Curves.easeInOut),
      ),
    );

    final rng = Random(42);
    for (var i = 0; i < 30; i++) {
      _sparkles.add(
        _Sparkle(
          x: rng.nextDouble(),
          y: rng.nextDouble(),
          size: 4 + rng.nextDouble() * 8,
          delay: rng.nextDouble() * 1.5,
          duration: 1.0 + rng.nextDouble() * 2.0,
        ),
      );
    }

    _controller.forward();

    Future.delayed(const Duration(seconds: 7), () {
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
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Container(
          color: MemoryPalette.ink.withValues(alpha: _opacity.value * 0.86),
          child: Stack(
            children: [
              ..._sparkles.map((s) => _buildSparkle(s)),
              Center(
                child: Transform.scale(
                  scale: _scale.value,
                  child: Opacity(
                    opacity: _opacity.value,
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 32),
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            _glowColor().withValues(alpha: 0.3),
                            MemoryPalette.ink.withValues(alpha: 0.92),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: _glowColor().withValues(alpha: 0.4),
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _glowColor().withValues(
                              alpha: _glowOpacity.value,
                            ),
                            blurRadius: 60,
                            spreadRadius: 10,
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          MemoryGlyph(size: 58, compact: true, progress: 0.9),
                          const SizedBox(height: 16),
                          Text(
                            widget.result.title,
                            style: TextStyle(
                              color: _glowColor(),
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            widget.result.description,
                            style: TextStyle(
                              color: MemoryPalette.paper.withValues(
                                alpha: 0.72,
                              ),
                              fontSize: 14,
                              height: 1.5,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 20),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: MemoryPalette.paper.withValues(
                                alpha: 0.06,
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '"${widget.result.awakeningDialogue}"',
                              style: TextStyle(
                                color: MemoryPalette.paper.withValues(
                                  alpha: 0.86,
                                ),
                                fontSize: 13,
                                fontStyle: FontStyle.italic,
                                height: 1.6,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: widget.result.unlockedTraits.map((trait) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: _glowColor().withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _glowColor().withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Text(
                                  trait.name,
                                  style: TextStyle(
                                    color: _glowColor(),
                                    fontSize: 12,
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSparkle(_Sparkle s) {
    final progress =
        (_controller.value -
                s.delay / _controller.duration!.inSeconds.toDouble())
            .clamp(0.0, 1.0);
    if (progress <= 0) return const SizedBox.shrink();

    final sparkleProgress =
        (progress * _controller.duration!.inSeconds / s.duration).clamp(
          0.0,
          1.0,
        );
    final size = MediaQuery.of(context).size;

    return Positioned(
      left: s.x * size.width,
      top: s.y * size.height,
      child: Opacity(
        opacity: (1.0 - sparkleProgress).clamp(0.0, 1.0),
        child: Transform.scale(
          scale: 0.5 + sparkleProgress * 1.5,
          child: Container(
            width: s.size,
            height: s.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _glowColor().withValues(alpha: 0.8),
              boxShadow: [
                BoxShadow(
                  color: _glowColor().withValues(alpha: 0.6),
                  blurRadius: s.size * 2,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _glowColor() {
    switch (widget.result.primaryArchetype) {
      case PersonalityArchetype.cyberpunkSarcastic:
        return MemoryPalette.moss;
      case PersonalityArchetype.zenPhilosopher:
        return const Color(0xFF9A8F74);
      case PersonalityArchetype.socialButterfly:
        return const Color(0xFFB48276);
      case PersonalityArchetype.introvertPoet:
        return const Color(0xFF8E9A8A);
      case PersonalityArchetype.chaosAgent:
        return MemoryPalette.rust;
      case PersonalityArchetype.nostalgiaElder:
        return MemoryPalette.gold;
      case PersonalityArchetype.techEvangelist:
        return const Color(0xFF8FA67D);
      case PersonalityArchetype.warmHealer:
        return MemoryPalette.moss;
      default:
        return MemoryPalette.muted;
    }
  }
}

class _Sparkle {
  final double x;
  final double y;
  final double size;
  final double delay;
  final double duration;

  const _Sparkle({
    required this.x,
    required this.y,
    required this.size,
    required this.delay,
    required this.duration,
  });
}
