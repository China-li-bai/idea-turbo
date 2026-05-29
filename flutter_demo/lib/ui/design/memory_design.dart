import 'dart:math';
import 'dart:ui';

import 'package:flutter/material.dart';

class MemoryPalette {
  static const ink = Color(0xFF11100D);
  static const night = Color(0xFF151411);
  static const umber = Color(0xFF26211A);
  static const paper = Color(0xFFF1E8D8);
  static const muted = Color(0xFFB7AC98);
  static const gold = Color(0xFFC49A46);
  static const moss = Color(0xFF7E9B73);
  static const rust = Color(0xFF9E684D);
  static const porcelain = Color(0xFFE8DFCE);
}

class MemorySurface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? color;
  final Color? borderColor;

  const MemorySurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 18,
    this.color,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: color ?? MemoryPalette.paper.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: borderColor ?? MemoryPalette.paper.withValues(alpha: 0.10),
            ),
            boxShadow: [
              BoxShadow(
                color: MemoryPalette.ink.withValues(alpha: 0.24),
                blurRadius: 28,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}

class MemoryGlyph extends StatelessWidget {
  final double size;
  final double progress;
  final bool compact;

  const MemoryGlyph({
    super.key,
    this.size = 96,
    this.progress = 0.72,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.square(size),
      painter: _MemoryGlyphPainter(
        progress: progress.clamp(0.0, 1.0),
        compact: compact,
      ),
    );
  }
}

class _MemoryGlyphPainter extends CustomPainter {
  final double progress;
  final bool compact;

  _MemoryGlyphPainter({required this.progress, required this.compact});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide * 0.36;

    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          MemoryPalette.gold.withValues(alpha: 0.24),
          MemoryPalette.moss.withValues(alpha: 0.08),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 1.9));
    canvas.drawCircle(center, radius * 1.9, glow);

    final vessel = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [MemoryPalette.paper, MemoryPalette.gold, MemoryPalette.rust],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, vessel);

    final inner = Paint()
      ..color = MemoryPalette.ink.withValues(alpha: 0.82)
      ..style = PaintingStyle.stroke
      ..strokeWidth = max(1.2, size.width * 0.018)
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < 6; i++) {
      final angle = -pi / 2 + (i / 6) * 2 * pi + progress * 0.45;
      final start = Offset(
        center.dx + cos(angle) * radius * 0.22,
        center.dy + sin(angle) * radius * 0.22,
      );
      final end = Offset(
        center.dx + cos(angle) * radius * (compact ? 0.62 : 0.78),
        center.dy + sin(angle) * radius * (compact ? 0.62 : 0.78),
      );
      canvas.drawLine(start, end, inner);
      canvas.drawCircle(
        end,
        size.width * 0.018,
        Paint()..color = MemoryPalette.ink,
      );
    }

    final core = Paint()..color = MemoryPalette.paper.withValues(alpha: 0.92);
    canvas.drawCircle(center, radius * 0.18, core);
    canvas.drawCircle(
      center,
      radius * 0.08,
      Paint()..color = MemoryPalette.moss.withValues(alpha: 0.95),
    );
  }

  @override
  bool shouldRepaint(covariant _MemoryGlyphPainter oldDelegate) =>
      progress != oldDelegate.progress || compact != oldDelegate.compact;
}
