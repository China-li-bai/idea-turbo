import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';

enum VitalityPhase {
  vibrant,
  normal,
  lethargic,
  fragile,
  dormant,
}

extension VitalityPhaseExtension on VitalityState {
  VitalityPhase get phase {
    if (socialEnergy < 0.15) return VitalityPhase.dormant;
    if (socialEnergy < 0.35) return VitalityPhase.lethargic;
    if (emotionalBattery < 0.25) return VitalityPhase.fragile;
    if (socialEnergy > 0.75 && emotionalBattery > 0.65) return VitalityPhase.vibrant;
    return VitalityPhase.normal;
  }

  String get phaseLabel {
    switch (phase) {
      case VitalityPhase.vibrant:
        return '活力充沛';
      case VitalityPhase.normal:
        return '状态正常';
      case VitalityPhase.lethargic:
        return '有些疲惫';
      case VitalityPhase.fragile:
        return '情绪脆弱';
      case VitalityPhase.dormant:
        return '休眠中';
    }
  }

  String get phaseEmoji {
    switch (phase) {
      case VitalityPhase.vibrant:
        return '✨';
      case VitalityPhase.normal:
        return '😊';
      case VitalityPhase.lethargic:
        return '😴';
      case VitalityPhase.fragile:
        return '💔';
      case VitalityPhase.dormant:
        return '💤';
    }
  }

  double get decayRate {
    switch (phase) {
      case VitalityPhase.vibrant:
        return 0.02;
      case VitalityPhase.normal:
        return 0.012;
      case VitalityPhase.lethargic:
        return 0.005;
      case VitalityPhase.fragile:
        return 0.008;
      case VitalityPhase.dormant:
        return 0.002;
    }
  }

  bool get canBeProactive {
    switch (phase) {
      case VitalityPhase.vibrant:
        return true;
      case VitalityPhase.normal:
        return true;
      case VitalityPhase.lethargic:
        return false;
      case VitalityPhase.fragile:
        return false;
      case VitalityPhase.dormant:
        return false;
    }
  }

  Duration get responseDelay {
    switch (phase) {
      case VitalityPhase.vibrant:
        return Duration.zero;
      case VitalityPhase.normal:
        return const Duration(milliseconds: 500);
      case VitalityPhase.lethargic:
        return const Duration(seconds: 2);
      case VitalityPhase.fragile:
        return const Duration(milliseconds: 300);
      case VitalityPhase.dormant:
        return const Duration(seconds: 5);
    }
  }

  int get maxResponseLength {
    switch (phase) {
      case VitalityPhase.vibrant:
        return 50;
      case VitalityPhase.normal:
        return 30;
      case VitalityPhase.lethargic:
        return 15;
      case VitalityPhase.fragile:
        return 20;
      case VitalityPhase.dormant:
        return 5;
    }
  }
}
