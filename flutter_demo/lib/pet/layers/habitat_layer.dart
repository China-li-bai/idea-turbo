import 'dart:ui';

import 'package:flutter/material.dart';

import '../../ui/design/memory_design.dart';
import '../pet_store.dart';

class HabitatLayer extends StatefulWidget {
  final PetStore store;
  const HabitatLayer({super.key, required this.store});

  @override
  State<HabitatLayer> createState() => _HabitatLayerState();
}

class _HabitatLayerState extends State<HabitatLayer>
    with SingleTickerProviderStateMixin {
  late AnimationController _breathController;
  Offset _parallaxOffset = Offset.zero;

  @override
  void initState() {
    super.initState();
    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat(reverse: true);

    widget.store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _breathController.dispose();
    widget.store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (!mounted) return;
    final lookAt = widget.store.lookAt;
    final size = MediaQuery.of(context).size;
    final dx = (lookAt.dx - size.width / 2) / size.width * -0.05;
    final dy = (lookAt.dy - size.height / 2) / size.height * -0.05;
    setState(() {
      _parallaxOffset = Offset(dx * size.width, dy * size.height);
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return AnimatedBuilder(
      animation: _breathController,
      builder: (context, _) {
        final breathVal = _breathController.value;
        final glowScale = 0.92 + breathVal * 0.10;

        return Container(
          width: size.width,
          height: size.height,
          color: MemoryPalette.ink,
          child: Stack(
            children: [
              Transform.translate(
                offset: _parallaxOffset,
                child: Container(
                  width: size.width * 1.2,
                  height: size.height * 1.2,
                  decoration: const BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment(-0.24, -0.62),
                      radius: 1.18,
                      colors: [
                        Color(0xFF322B21),
                        Color(0xFF191713),
                        MemoryPalette.ink,
                      ],
                      stops: [0.0, 0.58, 1.0],
                    ),
                  ),
                ),
              ),
              BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 44, sigmaY: 44),
                child: Container(
                  color: MemoryPalette.ink.withValues(alpha: 0.16),
                ),
              ),
              CustomPaint(
                size: size,
                painter: _MemoryFieldPainter(
                  breath: breathVal,
                  parallaxOffset: _parallaxOffset,
                ),
              ),
              Positioned(
                top: -size.height * 0.15,
                left: size.width * 0.06,
                child: AnimatedScale(
                  scale: glowScale,
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    width: size.width * 0.86,
                    height: size.height * 0.56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          MemoryPalette.gold.withValues(alpha: 0.11),
                          MemoryPalette.gold.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: -size.height * 0.1,
                left: -size.width * 0.1,
                child: Container(
                  width: size.width * 0.5,
                  height: size.height * 0.3,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        MemoryPalette.moss.withValues(alpha: 0.06),
                        MemoryPalette.moss.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: -size.height * 0.05,
                right: -size.width * 0.1,
                child: Container(
                  width: size.width * 0.4,
                  height: size.height * 0.25,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        MemoryPalette.rust.withValues(alpha: 0.05),
                        MemoryPalette.rust.withValues(alpha: 0.0),
                      ],
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
}

class _MemoryFieldPainter extends CustomPainter {
  final double breath;
  final Offset parallaxOffset;

  _MemoryFieldPainter({required this.breath, required this.parallaxOffset});

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = MemoryPalette.paper.withValues(alpha: 0.025)
      ..strokeWidth = 1;
    const spacing = 42.0;
    final dx = parallaxOffset.dx % spacing;
    final dy = parallaxOffset.dy % spacing;

    for (double x = dx - spacing; x < size.width + spacing; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = dy - spacing; y < size.height + spacing; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final arcPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = MemoryPalette.gold.withValues(alpha: 0.06 + breath * 0.03);
    final center = Offset(size.width * 0.50, size.height * 0.49);
    for (var i = 0; i < 4; i++) {
      final radius = size.shortestSide * (0.24 + i * 0.12 + breath * 0.01);
      canvas.drawCircle(center, radius, arcPaint);
    }

    final grainPaint = Paint()
      ..color = MemoryPalette.paper.withValues(alpha: 0.018);
    for (var i = 0; i < 90; i++) {
      final x = (i * 53.0 + parallaxOffset.dx * 0.2) % size.width;
      final y = (i * 97.0 + parallaxOffset.dy * 0.2) % size.height;
      canvas.drawCircle(Offset(x, y), i.isEven ? 0.7 : 0.45, grainPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _MemoryFieldPainter oldDelegate) =>
      breath != oldDelegate.breath ||
      parallaxOffset != oldDelegate.parallaxOffset;
}
