import 'package:mnemosyne/features/xiang/xiang_context.dart';

class XiangProfile {
  final String memoryId;
  final XiangContext originalContext;
  final Duration age;
  final double overallClarity;
  final Map<String, double> fieldClarity;
  final List<SensoryTag> blurredTags;

  const XiangProfile({
    required this.memoryId,
    required this.originalContext,
    required this.age,
    required this.overallClarity,
    required this.fieldClarity,
    required this.blurredTags,
  });

  double clarityFor(String category) =>
      fieldClarity[category] ?? overallClarity;

  bool get isFuzzy => overallClarity < 0.5;

  bool get isVivid => overallClarity >= 0.8;
}

class ResonanceResult {
  final String memoryId;
  final double resonanceScore;
  final double boost;
  final Map<String, double> dimensionScores;
  final List<String> triggeredDimensions;
  final bool isSceneTriggered;

  const ResonanceResult({
    required this.memoryId,
    required this.resonanceScore,
    required this.boost,
    required this.dimensionScores,
    required this.triggeredDimensions,
    required this.isSceneTriggered,
  });

  static ResonanceResult noResonance(String memoryId) => ResonanceResult(
    memoryId: memoryId,
    resonanceScore: 0.0,
    boost: 1.0,
    dimensionScores: const {},
    triggeredDimensions: const [],
    isSceneTriggered: false,
  );
}
