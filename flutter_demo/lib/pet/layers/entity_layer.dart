import 'dart:math';

import 'package:flutter/material.dart';

import '../../ui/design/memory_design.dart';
import '../pet_store.dart';

class EntityLayer extends StatefulWidget {
  final PetStore store;

  const EntityLayer({super.key, required this.store});

  @override
  State<EntityLayer> createState() => _EntityLayerState();
}

class _EntityLayerState extends State<EntityLayer>
    with TickerProviderStateMixin {
  late final AnimationController _breathController;
  late final AnimationController _blinkController;
  late final AnimationController _orbitController;

  double _eyeTrackX = 0;
  double _eyeTrackY = 0;
  bool _isHeld = false;

  @override
  void initState() {
    super.initState();
    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat(reverse: true);
    _blinkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 140),
    );
    _orbitController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 18),
    )..repeat();

    _startBlinkLoop();
    widget.store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _breathController.dispose();
    _blinkController.dispose();
    _orbitController.dispose();
    widget.store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _animateBlink() {
    _blinkController.forward().then((_) {
      if (mounted) _blinkController.reverse();
    });
  }

  void _onStoreChanged() {
    if (!mounted) return;
    _updateTracking();
    _updateHeldState();
  }

  void _updateTracking() {
    final renderBox = context.findRenderObject() as RenderBox?;
    if (renderBox == null || !renderBox.hasSize) return;

    final center = renderBox.localToGlobal(
      Offset(renderBox.size.width / 2, renderBox.size.height / 2),
    );
    final lookAt = widget.store.lookAt;
    setState(() {
      _eyeTrackX = ((lookAt.dx - center.dx) / (renderBox.size.width / 2)).clamp(
        -1,
        1,
      );
      _eyeTrackY = ((lookAt.dy - center.dy) / (renderBox.size.height / 2))
          .clamp(-1, 1);
    });
  }

  void _updateHeldState() {
    final isPointerDown = widget.store.isPointerDown;
    if (isPointerDown == _isHeld) return;

    setState(() => _isHeld = isPointerDown);
    if (isPointerDown) {
      Future.delayed(const Duration(milliseconds: 260), () {
        if (mounted && widget.store.isPointerDown) {
          widget.store.setMood(PetMood.happy);
        }
      });
    } else {
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted && widget.store.mood == PetMood.happy) {
          widget.store.setMood(PetMood.idle);
        }
      });
    }
  }

  void _startBlinkLoop() {
    Future.delayed(Duration(milliseconds: 2600 + Random().nextInt(2400)), () {
      if (!mounted) return;
      _animateBlink();
      if (Random().nextDouble() > 0.82) {
        Future.delayed(const Duration(milliseconds: 260), () {
          if (mounted) _animateBlink();
        });
      }
      _startBlinkLoop();
    });
  }

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.of(context).size;
    final base = min(screen.width, screen.height);
    final personaSize = (base * 0.62).clamp(220.0, 420.0);

    return Center(
      child: SizedBox(
        width: personaSize,
        height: personaSize * 1.08,
        child: AnimatedBuilder(
          animation: Listenable.merge([
            _breathController,
            _blinkController,
            _orbitController,
          ]),
          builder: (context, _) {
            final breath = _breathController.value;
            final scale = 0.98 + breath * 0.025;
            final blink = 1 - _blinkController.value * 0.92;

            return Opacity(
              opacity: 1,
              child: Transform.rotate(
                angle: _eyeTrackX * 2.2 * pi / 180,
                child: Transform.scale(
                  scale: _isHeld ? scale * 0.97 : scale,
                  child: CustomPaint(
                    painter: _MemoryPersonaPainter(
                      breath: breath,
                      blink: blink,
                      orbit: _orbitController.value,
                      mood: widget.store.mood,
                      eyeTrack: Offset(_eyeTrackX, _eyeTrackY),
                      isHeld: _isHeld,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _MemoryPersonaPainter extends CustomPainter {
  final double breath;
  final double blink;
  final double orbit;
  final PetMood mood;
  final Offset eyeTrack;
  final bool isHeld;

  _MemoryPersonaPainter({
    required this.breath,
    required this.blink,
    required this.orbit,
    required this.mood,
    required this.eyeTrack,
    required this.isHeld,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.50);
    final radius = min(size.width, size.height) * 0.29;
    final pulse = 1 + breath * 0.06;

    _drawAura(canvas, size, center, radius, pulse);
    _drawRecallOrbit(canvas, center, radius, size);
    _drawPersonaBody(canvas, center, radius, pulse);
    _drawInnerXiang(canvas, center, radius);
    _drawPresence(canvas, center, radius);
    _drawMemoryThreads(canvas, center, radius, size);
    _drawInteractionParticles(canvas, center, radius);
  }

  void _drawAura(
    Canvas canvas,
    Size size,
    Offset center,
    double radius,
    double pulse,
  ) {
    final auraColors = _auraColors();
    final glowPaint = Paint()
      ..shader =
          RadialGradient(
            colors: auraColors,
            stops: const [0.0, 0.54, 1.0],
          ).createShader(
            Rect.fromCircle(center: center, radius: radius * 2.25 * pulse),
          );
    canvas.drawCircle(center, radius * 2.25 * pulse, glowPaint);

    final floorPaint = Paint()
      ..shader =
          RadialGradient(
            colors: [
              MemoryPalette.gold.withValues(alpha: 0.18),
              MemoryPalette.rust.withValues(alpha: 0.04),
              Colors.transparent,
            ],
          ).createShader(
            Rect.fromCenter(
              center: Offset(center.dx, size.height * 0.86),
              width: size.width * 0.74,
              height: size.height * 0.20,
            ),
          );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx, size.height * 0.86),
        width: size.width * 0.76,
        height: size.height * 0.17,
      ),
      floorPaint,
    );
  }

  void _drawRecallOrbit(
    Canvas canvas,
    Offset center,
    double radius,
    Size size,
  ) {
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = MemoryPalette.paper.withValues(alpha: 0.12);

    for (var i = 0; i < 3; i++) {
      final oval = Rect.fromCenter(
        center: center,
        width: radius * (2.75 + i * 0.34),
        height: radius * (1.56 + i * 0.22),
      );
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate((orbit * 2 * pi) + i * pi / 3);
      canvas.translate(-center.dx, -center.dy);
      canvas.drawOval(oval, stroke);
      canvas.restore();
    }

    final nodePaint = Paint()..color = MemoryPalette.gold;
    for (var i = 0; i < 7; i++) {
      final angle = orbit * 2 * pi + i * 2 * pi / 7;
      final orbitRadius = radius * (1.22 + (i % 3) * 0.16);
      final pos = Offset(
        center.dx + cos(angle) * orbitRadius,
        center.dy + sin(angle) * orbitRadius * 0.58,
      );
      final sizeMod = 2.8 + (i % 3) * 1.1 + breath * 1.8;
      canvas.drawCircle(pos, sizeMod, nodePaint);
      canvas.drawCircle(
        pos,
        sizeMod * 2.8,
        Paint()..color = MemoryPalette.gold.withValues(alpha: 0.08),
      );
    }
  }

  void _drawPersonaBody(
    Canvas canvas,
    Offset center,
    double radius,
    double pulse,
  ) {
    final bodyPath = Path()
      ..moveTo(center.dx, center.dy - radius * 1.22 * pulse)
      ..cubicTo(
        center.dx + radius * 0.92,
        center.dy - radius * 1.08,
        center.dx + radius * 1.02,
        center.dy - radius * 0.04,
        center.dx + radius * 0.74,
        center.dy + radius * 0.78,
      )
      ..cubicTo(
        center.dx + radius * 0.42,
        center.dy + radius * 1.34,
        center.dx - radius * 0.50,
        center.dy + radius * 1.18,
        center.dx - radius * 0.77,
        center.dy + radius * 0.63,
      )
      ..cubicTo(
        center.dx - radius * 1.14,
        center.dy - radius * 0.14,
        center.dx - radius * 0.72,
        center.dy - radius * 1.06,
        center.dx,
        center.dy - radius * 1.22 * pulse,
      )
      ..close();

    canvas.drawShadow(
      bodyPath,
      MemoryPalette.ink.withValues(alpha: 0.64),
      18,
      true,
    );

    final bodyPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          MemoryPalette.porcelain.withValues(alpha: 0.96),
          _bodyAccent().withValues(alpha: 0.92),
          MemoryPalette.umber.withValues(alpha: 0.98),
        ],
        stops: const [0.0, 0.46, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 1.3));
    canvas.drawPath(bodyPath, bodyPaint);

    final rimPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..color = MemoryPalette.paper.withValues(alpha: 0.38);
    canvas.drawPath(bodyPath, rimPaint);

    final innerGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          MemoryPalette.paper.withValues(alpha: 0.36),
          MemoryPalette.gold.withValues(alpha: 0.10),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 0.82));
    canvas.drawCircle(center, radius * 0.82, innerGlow);
  }

  void _drawInnerXiang(Canvas canvas, Offset center, double radius) {
    final linePaint = Paint()
      ..color = MemoryPalette.ink.withValues(alpha: 0.58)
      ..strokeWidth = radius * 0.035
      ..strokeCap = StrokeCap.round;
    final accentPaint = Paint()
      ..color = MemoryPalette.paper.withValues(alpha: 0.58)
      ..strokeWidth = radius * 0.014
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < 6; i++) {
      final y = center.dy - radius * 0.48 + i * radius * 0.17;
      final half = radius * (0.33 + (i.isEven ? 0.08 : -0.02));
      if (i == 1 || i == 4) {
        canvas.drawLine(
          Offset(center.dx - half, y),
          Offset(center.dx - radius * 0.09, y),
          linePaint,
        );
        canvas.drawLine(
          Offset(center.dx + radius * 0.09, y),
          Offset(center.dx + half, y),
          linePaint,
        );
      } else {
        canvas.drawLine(
          Offset(center.dx - half, y),
          Offset(center.dx + half, y),
          linePaint,
        );
      }
      canvas.drawLine(
        Offset(center.dx - half * 0.72, y + radius * 0.022),
        Offset(center.dx + half * 0.72, y + radius * 0.022),
        accentPaint,
      );
    }

    final corePaint = Paint()
      ..shader = RadialGradient(
        colors: [
          MemoryPalette.paper,
          MemoryPalette.gold.withValues(alpha: 0.65),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 0.24));
    canvas.drawCircle(center, radius * (0.18 + breath * 0.025), corePaint);
  }

  void _drawPresence(Canvas canvas, Offset center, double radius) {
    final eyePaint = Paint()
      ..color = MemoryPalette.ink.withValues(alpha: 0.80)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = radius * 0.046;
    final highlight = Paint()
      ..color = MemoryPalette.paper.withValues(alpha: 0.72)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = radius * 0.016;
    final y = center.dy + radius * 0.24 + eyeTrack.dy * radius * 0.035;
    final xShift = eyeTrack.dx * radius * 0.045;
    final eyeHalf = radius * 0.10;

    for (final side in [-1, 1]) {
      final eyeCenter = Offset(center.dx + side * radius * 0.23 + xShift, y);
      canvas.drawLine(
        Offset(eyeCenter.dx - eyeHalf, eyeCenter.dy),
        Offset(eyeCenter.dx + eyeHalf, eyeCenter.dy),
        eyePaint,
      );
      if (blink > 0.25) {
        canvas.drawCircle(
          Offset(
            eyeCenter.dx + side * radius * 0.025,
            eyeCenter.dy - radius * 0.025,
          ),
          radius * 0.025 * blink,
          highlight,
        );
      }
    }

    final mouthPaint = Paint()
      ..color = MemoryPalette.ink.withValues(alpha: 0.58)
      ..style = PaintingStyle.stroke
      ..strokeWidth = radius * 0.018
      ..strokeCap = StrokeCap.round;
    final mouth = Path()
      ..moveTo(center.dx - radius * 0.10, center.dy + radius * 0.43)
      ..quadraticBezierTo(
        center.dx,
        center.dy + radius * _mouthCurve(),
        center.dx + radius * 0.10,
        center.dy + radius * 0.43,
      );
    canvas.drawPath(mouth, mouthPaint);
  }

  void _drawMemoryThreads(
    Canvas canvas,
    Offset center,
    double radius,
    Size size,
  ) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8
      ..color = MemoryPalette.paper.withValues(alpha: 0.18)
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < 5; i++) {
      final angle = orbit * 2 * pi + i * 2 * pi / 5;
      final start = Offset(
        center.dx + cos(angle) * radius * 0.54,
        center.dy + sin(angle) * radius * 0.42,
      );
      final end = Offset(
        center.dx + cos(angle + 0.4) * radius * 1.35,
        center.dy + sin(angle + 0.2) * radius * 0.82,
      );
      final path = Path()
        ..moveTo(start.dx, start.dy)
        ..quadraticBezierTo(
          center.dx + cos(angle) * radius * 0.9,
          center.dy + sin(angle) * radius * 0.2,
          end.dx,
          end.dy,
        );
      canvas.drawPath(path, paint);
    }
  }

  void _drawInteractionParticles(Canvas canvas, Offset center, double radius) {
    if (isHeld || mood == PetMood.happy) {
      _drawSeedSparks(canvas, center, radius, MemoryPalette.moss);
    } else if (mood == PetMood.thinking) {
      _drawStillMarker(canvas, center, radius);
    }
  }

  void _drawSeedSparks(
    Canvas canvas,
    Offset center,
    double radius,
    Color color,
  ) {
    final paint = Paint()..color = color.withValues(alpha: 0.54);
    for (var i = 0; i < 6; i++) {
      final angle = orbit * 2 * pi + i * 2 * pi / 6;
      final pos = Offset(
        center.dx + cos(angle) * radius * (1.05 + breath * 0.12),
        center.dy + sin(angle) * radius * 0.72,
      );
      _drawDiamond(canvas, pos, 4 + (i % 2) * 1.5, paint);
    }
  }

  void _drawStillMarker(Canvas canvas, Offset center, double radius) {
    final rect = Rect.fromCircle(
      center: Offset(center.dx + radius * 0.82, center.dy - radius * 0.88),
      radius: radius * 0.12,
    );
    canvas.drawArc(
      rect,
      pi * 0.12,
      pi * 1.36,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..color = MemoryPalette.paper.withValues(alpha: 0.42),
    );
  }

  void _drawDiamond(Canvas canvas, Offset center, double radius, Paint paint) {
    final path = Path()
      ..moveTo(center.dx, center.dy - radius)
      ..lineTo(center.dx + radius, center.dy)
      ..lineTo(center.dx, center.dy + radius)
      ..lineTo(center.dx - radius, center.dy)
      ..close();
    canvas.drawPath(path, paint);
  }

  List<Color> _auraColors() {
    return [
      MemoryPalette.gold.withValues(alpha: 0.16),
      MemoryPalette.rust.withValues(alpha: 0.06),
      Colors.transparent,
    ];
  }

  Color _bodyAccent() {
    if (mood == PetMood.thinking) return MemoryPalette.moss;
    if (mood == PetMood.dizzy) return MemoryPalette.rust;
    return MemoryPalette.gold;
  }

  double _mouthCurve() {
    if (isHeld || mood == PetMood.happy) return 0.49;
    if (mood == PetMood.thinking) return 0.41;
    return 0.45;
  }

  @override
  bool shouldRepaint(covariant _MemoryPersonaPainter oldDelegate) =>
      breath != oldDelegate.breath ||
      blink != oldDelegate.blink ||
      orbit != oldDelegate.orbit ||
      mood != oldDelegate.mood ||
      eyeTrack != oldDelegate.eyeTrack ||
      isHeld != oldDelegate.isHeld;
}
