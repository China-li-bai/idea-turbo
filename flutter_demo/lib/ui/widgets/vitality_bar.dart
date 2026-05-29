import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';

import '../design/memory_design.dart';

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
            color: MemoryPalette.paper.withValues(alpha: 0.055),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: MemoryPalette.paper.withValues(alpha: 0.09),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildRow(
                '能量',
                state.socialEnergy,
                _energyColor(state.socialEnergy),
              ),
              const SizedBox(height: 8),
              _buildRow(
                '情绪',
                state.emotionalBattery,
                _batteryColor(state.emotionalBattery),
              ),
              const SizedBox(height: 8),
              _buildRow(
                '新鲜度',
                1.0 - state.boredomLevel,
                _boredomColor(state.boredomLevel),
              ),
              const SizedBox(height: 8),
              _buildRow(
                '连接感',
                1.0 - state.lonelinessLevel,
                _lonelinessColor(state.lonelinessLevel),
              ),
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
          width: 64,
          child: Text(
            label,
            style: TextStyle(
              color: MemoryPalette.paper.withValues(alpha: 0.72),
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: value.clamp(0.0, 1.0),
              backgroundColor: MemoryPalette.paper.withValues(alpha: 0.10),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${(value * 100).toInt()}%',
          style: TextStyle(
            color: MemoryPalette.paper.withValues(alpha: 0.50),
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  Color _energyColor(double value) {
    if (value < 0.2) return MemoryPalette.rust;
    if (value < 0.5) return MemoryPalette.gold;
    return MemoryPalette.moss;
  }

  Color _batteryColor(double value) {
    if (value < 0.3) return MemoryPalette.rust;
    if (value < 0.6) return MemoryPalette.gold;
    return MemoryPalette.moss;
  }

  Color _boredomColor(double value) {
    if (value > 0.7) return MemoryPalette.rust;
    if (value > 0.4) return MemoryPalette.gold;
    return MemoryPalette.moss;
  }

  Color _lonelinessColor(double value) {
    if (value > 0.7) return MemoryPalette.rust;
    if (value > 0.4) return MemoryPalette.gold;
    return MemoryPalette.moss;
  }
}
