import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../pet_store.dart';

class SubliminalGlitch extends StatefulWidget {
  final PetStore store;
  const SubliminalGlitch({super.key, required this.store});

  @override
  State<SubliminalGlitch> createState() => _SubliminalGlitchState();
}

class _SubliminalGlitchState extends State<SubliminalGlitch> {
  String _lastGlitchForm = '';
  bool _showPostGlitchDialog = false;

  @override
  void initState() {
    super.initState();
    widget.store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    widget.store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (widget.store.isGlitching && widget.store.glitchForm != _lastGlitchForm) {
      _lastGlitchForm = widget.store.glitchForm;
      HapticFeedback.heavyImpact();
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.store.isGlitching) return const SizedBox.shrink();

    return _buildGlitchOverlay();
  }

  Widget _buildGlitchOverlay() {
    final form = widget.store.glitchForm;
    final size = MediaQuery.of(context).size;

    return Positioned.fill(
      child: Stack(
        children: [
          _buildScreenTear(size),
          _buildGlitchEntity(form, size),
        ],
      ),
    );
  }

  Widget _buildScreenTear(Size size) {
    final rng = Random();
    return CustomPaint(
      size: size,
      painter: _ScreenTearPainter(rng: rng),
    );
  }

  Widget _buildGlitchEntity(String form, Size size) {
    final center = Offset(size.width / 2, size.height * 0.4);

    return Positioned(
      left: center.dx - 80,
      top: center.dy - 80,
      child: SizedBox(
        width: 160,
        height: 160,
        child: CustomPaint(
          painter: _GlitchFormPainter(form: form),
        ),
      ),
    );
  }
}

class _ScreenTearPainter extends CustomPainter {
  final Random rng;

  _ScreenTearPainter({required this.rng});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white.withValues(alpha: 0.15);

    for (int i = 0; i < 8; i++) {
      final y = rng.nextDouble() * size.height;
      final h = 1.0 + rng.nextDouble() * 3;
      canvas.drawRect(
        Rect.fromLTWH(0, y, size.width, h),
        paint,
      );
    }

    final colorPaint = Paint()
      ..color = Colors.red.withValues(alpha: 0.1)
      ..blendMode = BlendMode.screen;
    canvas.drawRect(
      Rect.fromLTWH(rng.nextDouble() * 10, 0, size.width, size.height),
      colorPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ScreenTearPainter oldDelegate) => true;
}

class _GlitchFormPainter extends CustomPainter {
  final String form;

  _GlitchFormPainter({required this.form});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    switch (form) {
      case 'divine':
        _drawDivine(canvas, center, size);
        break;
      case 'abyss':
        _drawAbyss(canvas, center, size);
        break;
      case 'circuit':
        _drawCircuit(canvas, center, size);
        break;
      case 'lotus':
        _drawLotus(canvas, center, size);
        break;
      case 'void':
        _drawVoid(canvas, center, size);
        break;
    }
  }

  void _drawDivine(Canvas canvas, Offset center, Size size) {
    final paint = Paint()
      ..color = Colors.amber.withValues(alpha: 0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    for (int i = 0; i < 6; i++) {
      final angle = (i / 6) * 2 * pi - pi / 2;
      final r = 50.0;
      final x = center.dx + cos(angle) * r;
      final y = center.dy + sin(angle) * r;
      canvas.drawCircle(Offset(x, y), 12, paint);
    }

    final glowPaint = Paint()
      ..color = Colors.amber.withValues(alpha: 0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20);
    canvas.drawCircle(center, 60, glowPaint);
  }

  void _drawAbyss(Canvas canvas, Offset center, Size size) {
    final paint = Paint()
      ..color = Colors.red.withValues(alpha: 0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    for (int i = 0; i < 3; i++) {
      final r = 30.0 + i * 20;
      canvas.drawCircle(center, r, paint);
    }

    final eyePaint = Paint()..color = Colors.red.withValues(alpha: 0.8);
    canvas.drawCircle(Offset(center.dx - 15, center.dy), 8, eyePaint);
    canvas.drawCircle(Offset(center.dx + 15, center.dy), 8, eyePaint);
    final pupilPaint = Paint()..color = Colors.black;
    canvas.drawCircle(Offset(center.dx - 15, center.dy), 4, pupilPaint);
    canvas.drawCircle(Offset(center.dx + 15, center.dy), 4, pupilPaint);
  }

  void _drawCircuit(Canvas canvas, Offset center, Size size) {
    final paint = Paint()
      ..color = Colors.cyan.withValues(alpha: 0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final path = Path();
    for (int i = 0; i < 8; i++) {
      final x = center.dx - 40 + (i % 4) * 25.0;
      final y = center.dy - 30 + (i ~/ 4) * 60.0;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, paint);

    final nodePaint = Paint()..color = Colors.cyan.withValues(alpha: 0.8);
    for (int i = 0; i < 8; i++) {
      final x = center.dx - 40 + (i % 4) * 25.0;
      final y = center.dy - 30 + (i ~/ 4) * 60.0;
      canvas.drawCircle(Offset(x, y), 4, nodePaint);
    }
  }

  void _drawLotus(Canvas canvas, Offset center, Size size) {
    final paint = Paint()
      ..color = Colors.pink.withValues(alpha: 0.8)
      ..style = PaintingStyle.fill;

    for (int i = 0; i < 8; i++) {
      final angle = (i / 8) * 2 * pi;
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(angle);
      final path = Path();
      path.moveTo(0, 0);
      path.cubicTo(-12, -25, -6, -50, 0, -55);
      path.cubicTo(6, -50, 12, -25, 0, 0);
      canvas.drawPath(path, paint);
      canvas.restore();
    }

    final corePaint = Paint()..color = Colors.white.withValues(alpha: 0.6);
    canvas.drawCircle(center, 8, corePaint);
  }

  void _drawVoid(Canvas canvas, Offset center, Size size) {
    final paint = Paint()
      ..color = Colors.purple.withValues(alpha: 0.8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    for (int ring = 0; ring < 4; ring++) {
      final r = 15.0 + ring * 15;
      for (int i = 0; i < 6; i++) {
        final startAngle = (i / 6) * 2 * pi + ring * 0.3;
        final sweepAngle = pi / 4;
        canvas.drawArc(
          Rect.fromCircle(center: center, radius: r),
          startAngle,
          sweepAngle,
          false,
          paint,
        );
      }
    }

    final voidPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.8);
    canvas.drawCircle(center, 10, voidPaint);
  }

  @override
  bool shouldRepaint(covariant _GlitchFormPainter oldDelegate) => true;
}
