import 'package:mnemosyne/features/pet/pet_context.dart';

class EmotionalMemoryConfig {
  final double arousalDecayMultiplier;
  final double negativeValenceEncodingBoost;
  final double positiveValenceConsolidationBoost;
  final double highArousalThreshold;
  final double strongValenceThreshold;
  final double moodCongruencyWeight;

  const EmotionalMemoryConfig({
    this.arousalDecayMultiplier = 1.5,
    this.negativeValenceEncodingBoost = 0.15,
    this.positiveValenceConsolidationBoost = 0.10,
    this.highArousalThreshold = 0.7,
    this.strongValenceThreshold = 0.5,
    this.moodCongruencyWeight = 0.2,
  });
}

class EmotionalMemoryResult {
  final double adjustedImportance;
  final double adjustedEmotionalValence;
  final double decayResistance;
  final double moodCongruencyScore;
  final bool isHighArousal;
  final bool isStrongValence;
  final String emotionalTag;

  const EmotionalMemoryResult({
    required this.adjustedImportance,
    required this.adjustedEmotionalValence,
    required this.decayResistance,
    required this.moodCongruencyScore,
    required this.isHighArousal,
    required this.isStrongValence,
    required this.emotionalTag,
  });
}

abstract class PetEmotionalGating {
  EmotionalMemoryResult evaluateEncoding(PetContext context, {double baseImportance = 0.5});
  double computeDecayResistance(PetMood encodingMood, double emotionalValence);
  double computeMoodCongruency(PetMood currentMood, PetMood memoryMood);
}

class DefaultPetEmotionalGating implements PetEmotionalGating {
  final EmotionalMemoryConfig config;

  DefaultPetEmotionalGating({this.config = const EmotionalMemoryConfig()});

  @override
  EmotionalMemoryResult evaluateEncoding(
    PetContext context, {
    double baseImportance = 0.5,
  }) {
    final arousal = context.mood.arousalLevel;
    final valence = context.mood.valence;

    final isHighArousal = arousal >= config.highArousalThreshold;
    final isStrongValence = valence.abs() >= config.strongValenceThreshold;

    double importanceBoost = 0.0;
    if (isHighArousal) {
      importanceBoost += 0.15 * arousal;
    }
    if (valence < 0) {
      importanceBoost += config.negativeValenceEncodingBoost * valence.abs();
    } else if (valence > 0) {
      importanceBoost += config.positiveValenceConsolidationBoost * valence;
    }

    final adjustedImportance = (baseImportance + importanceBoost).clamp(0.0, 1.0);
    final decayResistance = computeDecayResistance(context.mood, valence);

    final emotionalTag = _generateEmotionalTag(context.mood, isHighArousal, isStrongValence);

    return EmotionalMemoryResult(
      adjustedImportance: adjustedImportance,
      adjustedEmotionalValence: valence,
      decayResistance: decayResistance,
      moodCongruencyScore: 1.0,
      isHighArousal: isHighArousal,
      isStrongValence: isStrongValence,
      emotionalTag: emotionalTag,
    );
  }

  @override
  double computeDecayResistance(PetMood encodingMood, double emotionalValence) {
    final arousal = encodingMood.arousalLevel;
    double resistance = 1.0;

    if (arousal >= config.highArousalThreshold) {
      resistance *= config.arousalDecayMultiplier;
    }

    if (emotionalValence.abs() >= config.strongValenceThreshold) {
      resistance *= 1.0 + (emotionalValence.abs() * 0.3);
    }

    return resistance;
  }

  @override
  double computeMoodCongruency(PetMood currentMood, PetMood memoryMood) {
    if (currentMood == memoryMood) return 1.0;

    final currentValence = currentMood.valence;
    final memoryValence = memoryMood.valence;
    final currentArousal = currentMood.arousalLevel;
    final memoryArousal = memoryMood.arousalLevel;

    final valenceSimilarity = 1.0 - (currentValence - memoryValence).abs() / 2.0;
    final arousalSimilarity = 1.0 - (currentArousal - memoryArousal).abs();

    return valenceSimilarity * 0.6 + arousalSimilarity * 0.4;
  }

  String _generateEmotionalTag(PetMood mood, bool isHighArousal, bool isStrongValence) {
    if (isHighArousal && isStrongValence) {
      return mood.valence > 0 ? 'intense_positive' : 'intense_negative';
    }
    if (isHighArousal) return 'high_arousal';
    if (isStrongValence) {
      return mood.valence > 0 ? 'mild_positive' : 'mild_negative';
    }
    return 'neutral';
  }
}
