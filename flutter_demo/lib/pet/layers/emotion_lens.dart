import 'dart:math';

import 'package:flutter/material.dart';
import '../pet_store.dart';

class EmotionLens extends StatefulWidget {
  final PetStore store;
  const EmotionLens({super.key, required this.store});

  @override
  State<EmotionLens> createState() => _EmotionLensState();
}

class _EmotionLensState extends State<EmotionLens> {
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
    if (widget.store.isEmotionLensOpen && mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.store.isEmotionLensOpen) return const SizedBox.shrink();

    final size = MediaQuery.of(context).size;

    return Positioned.fill(
      child: IgnorePointer(
        child: Stack(
          children: [
            _buildScanlineFilter(size),
            _buildDataOverlay(size),
            _buildInstabilityMeter(size),
          ],
        ),
      ),
    );
  }

  Widget _buildScanlineFilter(Size size) {
    return CustomPaint(
      size: size,
      painter: _ScanlinePainter(),
    );
  }

  Widget _buildDataOverlay(Size size) {
    final store = widget.store;
    final relationship = store.relationshipState;

    return Positioned(
      top: 80,
      right: 16,
      child: Container(
        width: size.width * 0.65,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.75),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: Colors.cyan.withValues(alpha: 0.4),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.cyan.withValues(alpha: 0.8),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'EMOTION LENS v0.7',
                  style: TextStyle(
                    color: Colors.cyan.withValues(alpha: 0.6),
                    fontSize: 9,
                    letterSpacing: 2,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              store.emotionLensLine,
              style: TextStyle(
                color: Colors.green.withValues(alpha: 0.7),
                fontSize: 11,
                fontFamily: 'monospace',
                height: 1.6,
              ),
            ),
            const SizedBox(height: 12),
            _buildBondRow('回响深度', relationship.echoDepth, Colors.cyan),
            _buildBondRow('互动次数', (relationship.interactionCount / 200).clamp(0.0, 1.0), Colors.green),
            _buildBondRow('回响数量', (relationship.echoes.length / 8).clamp(0.0, 1.0), Colors.purple),
            const SizedBox(height: 8),
            Text(
              '阶段: ${relationship.phase.displayName}',
              style: TextStyle(
                color: Colors.amber.withValues(alpha: 0.7),
                fontSize: 10,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstabilityMeter(Size size) {
    final instability = widget.store.geneticInstability;
    final isCritical = instability > 0.7;

    return Positioned(
      bottom: 120,
      left: 16,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isCritical
                ? Colors.red.withValues(alpha: 0.6)
                : Colors.amber.withValues(alpha: 0.3),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GENETIC INSTABILITY',
              style: TextStyle(
                color: isCritical ? Colors.red : Colors.amber,
                fontSize: 8,
                letterSpacing: 2,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${(instability * 100).toStringAsFixed(1)}%',
              style: TextStyle(
                color: isCritical ? Colors.red : Colors.amber,
                fontSize: 20,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
            if (isCritical)
              Text(
                '⚠ CRITICAL: APPROACHING AWAKENING THRESHOLD',
                style: TextStyle(
                  color: Colors.red.withValues(alpha: 0.8),
                  fontSize: 8,
                  fontFamily: 'monospace',
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBondRow(String label, double value, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 50,
            child: Text(
              label,
              style: TextStyle(
                color: color.withValues(alpha: 0.7),
                fontSize: 10,
                fontFamily: 'monospace',
              ),
            ),
          ),
          Expanded(
            child: LinearProgressIndicator(
              value: value,
              backgroundColor: Colors.white.withValues(alpha: 0.08),
              valueColor: AlwaysStoppedAnimation(color.withValues(alpha: 0.7)),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${(value * 100).toStringAsFixed(0)}%',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.4),
              fontSize: 9,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.cyan.withValues(alpha: 0.03);

    for (double y = 0; y < size.height; y += 3) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    final rng = Random(42);
    final spotPaint = Paint()
      ..color = Colors.green.withValues(alpha: 0.04)
      ..blendMode = BlendMode.screen;

    for (int i = 0; i < 5; i++) {
      final x = rng.nextDouble() * size.width;
      final y = rng.nextDouble() * size.height;
      canvas.drawCircle(Offset(x, y), 30 + rng.nextDouble() * 50, spotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _ScanlinePainter oldDelegate) => false;
}
