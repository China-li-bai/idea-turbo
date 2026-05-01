import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';

class VitalityBar extends StatelessWidget {
  final VitalityState state;

  const VitalityBar({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildRow('⚡ 能量', state.socialEnergy, _energyColor(state.socialEnergy)),
              const SizedBox(height: 8),
              _buildRow('💛 心情', state.emotionalBattery, _batteryColor(state.emotionalBattery)),
              const SizedBox(height: 8),
              _buildRow('🎮 无聊', 1.0 - state.boredomLevel, _boredomColor(state.boredomLevel)),
              const SizedBox(height: 8),
              _buildRow('💬 社交', 1.0 - state.lonelinessLevel, _lonelinessColor(state.lonelinessLevel)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String label, double value, Color color) {
    return Row(
      children: [
        SizedBox(
          width: 60,
          child: Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: value.clamp(0.0, 1.0),
              backgroundColor: Colors.white.withValues(alpha: 0.1),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${(value * 100).toInt()}%',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  Color _energyColor(double value) {
    if (value < 0.2) return Colors.redAccent;
    if (value < 0.5) return Colors.orangeAccent;
    return Colors.greenAccent;
  }

  Color _batteryColor(double value) {
    if (value < 0.3) return Colors.redAccent;
    if (value < 0.6) return Colors.amberAccent;
    return Colors.cyanAccent;
  }

  Color _boredomColor(double value) {
    if (value > 0.7) return Colors.redAccent;
    if (value > 0.4) return Colors.orangeAccent;
    return Colors.greenAccent;
  }

  Color _lonelinessColor(double value) {
    if (value > 0.7) return Colors.purpleAccent;
    if (value > 0.4) return Colors.blueAccent;
    return Colors.tealAccent;
  }
}
