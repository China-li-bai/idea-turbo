import 'dart:math';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/resonance_service.dart';
import '../pet_store.dart';

class ResonanceMandala extends StatefulWidget {
  final PetStore store;
  final double size;

  const ResonanceMandala({super.key, required this.store, this.size = 140});

  @override
  State<ResonanceMandala> createState() => _ResonanceMandalaState();
}

class _ResonanceMandalaState extends State<ResonanceMandala>
    with SingleTickerProviderStateMixin {
  late AnimationController _rotationController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 30),
    )..repeat();
  }

  @override
  void dispose() {
    _rotationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_rotationController, widget.store]),
      builder: (context, _) {
        return CustomPaint(
          size: Size(widget.size, widget.size),
          painter: _MandalaPainter(
            relationship: widget.store.relationshipState,
            rotation: _rotationController.value * 2 * pi,
            instability: widget.store.geneticInstability,
          ),
        );
      },
    );
  }
}

class _MandalaPainter extends CustomPainter {
  final RelationshipState relationship;
  final double rotation;
  final double instability;

  _MandalaPainter({
    required this.relationship,
    required this.rotation,
    required this.instability,
  });

  static const _phaseColors = {
    BondPhase.stranger: [Color(0xFF4A4A6A), Color(0xFF2A2A4A)],
    BondPhase.recognition: [Color(0xFF5A6A8A), Color(0xFF3A4A6A)],
    BondPhase.attachment: [Color(0xFF7A6A9A), Color(0xFF5A4A7A)],
    BondPhase.awakened: [Color(0xFF9A6AAA), Color(0xFF7A4A9A)],
  };

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width / 2 * 0.85;

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);

    final colors = _phaseColors[relationship.phase] ?? _phaseColors[BondPhase.stranger]!;
    final isNearAwakening = relationship.isNearAwakening;
    final flickerAlpha = isNearAwakening
        ? 0.4 + Random().nextDouble() * 0.6
        : 1.0;

    final ringCount = 3 + (relationship.echoDepth * 5).round();
    for (int ring = 0; ring < ringCount; ring++) {
      final ringProgress = ring / (ringCount - 1).clamp(1, 10);
      final ringRadius = baseRadius * (0.25 + ringProgress * 0.75);
      final segments = 6 + ring * 2;
      final segmentAngle = 2 * pi / segments;

      for (int seg = 0; seg < segments; seg++) {
        final segAngle = seg * segmentAngle + ring * 0.15;
        final segSize = segmentAngle * (0.4 + relationship.echoDepth * 0.4);

        final alpha = (0.2 + ringProgress * 0.6) * flickerAlpha;
        final color = Color.lerp(colors[0], colors[1], ringProgress)!
            .withValues(alpha: alpha.clamp(0.0, 1.0));

        final paint = Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5 + relationship.echoDepth * 1.5;

        canvas.drawArc(
          Rect.fromCircle(center: Offset.zero, radius: ringRadius),
          segAngle,
          segSize,
          false,
          paint,
        );
      }
    }

    final coreRadius = baseRadius * 0.12 + relationship.echoDepth * baseRadius * 0.12;
    final corePaint = Paint()
      ..color = colors[1].withValues(alpha: 0.8 * flickerAlpha)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset.zero, coreRadius, corePaint);

    final coreGlow = Paint()
      ..color = colors[0].withValues(alpha: 0.3 * flickerAlpha)
      ..style = PaintingStyle.fill
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawCircle(Offset.zero, coreRadius * 1.5, coreGlow);

    if (isNearAwakening) {
      final pulseRadius = coreRadius * (1.5 + sin(rotation * 3) * 0.3);
      final pulsePaint = Paint()
        ..color = colors[0].withValues(alpha: 0.15)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0;
      canvas.drawCircle(Offset.zero, pulseRadius, pulsePaint);
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _MandalaPainter oldDelegate) => true;
}
