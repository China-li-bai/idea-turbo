import 'dart:math';
import 'package:mnemosyne/features/pet/pet_context.dart';

enum CoreTrait {
  warmth,
  humor,
  logic,
  energy,
  curiosity,
  independence,
  expressiveness,
  patience,
}

enum EvolutionStage {
  neutral,
  awakened,
  deepened,
  evolved,
  transcendent,
}

enum PersonalityArchetype {
  defaultNeutral,
  cyberpunkSarcastic,
  zenPhilosopher,
  socialButterfly,
  introvertPoet,
  chaosAgent,
  nostalgiaElder,
  techEvangelist,
  warmHealer,
  dramaQueen,
  coldScholar,
  lazyGourmet,
  adventureSeeker,
  gossipDetective,
  loyalGuardian,
  rebelArtist,
  gentleDreamer,
  sharpCritic,
  cozyHomebody,
  wildChild,
  silentObserver,
}

class PersonalityTraitVector {
  final Map<CoreTrait, double> values;
  final Map<CoreTrait, DateTime> lastUpdated;

  const PersonalityTraitVector({
    this.values = const {},
    this.lastUpdated = const {},
  });

  double operator [](CoreTrait trait) => values[trait] ?? 0.5;

  PersonalityTraitVector withUpdates(Map<CoreTrait, double> updates) {
    final newValues = Map<CoreTrait, double>.from(values);
    final newTimestamps = Map<CoreTrait, DateTime>.from(lastUpdated);
    final now = DateTime.now();

    for (final entry in updates.entries) {
      final current = newValues[entry.key] ?? 0.5;
      newValues[entry.key] = (current * 0.75 + entry.value * 0.25).clamp(0.0, 1.0);
      newTimestamps[entry.key] = now;
    }

    return PersonalityTraitVector(
      values: newValues,
      lastUpdated: newTimestamps,
    );
  }

  PersonalityTraitVector applyTimeDecay({double decayRate = 0.003}) {
    final now = DateTime.now();
    final newValues = Map<CoreTrait, double>.from(values);

    for (final trait in CoreTrait.values) {
      final current = newValues[trait] ?? 0.5;
      final lastTime = lastUpdated[trait];
      if (lastTime != null) {
        final hoursSince = now.difference(lastTime).inMinutes / 60.0;
        final decay = exp(-decayRate * hoursSince);
        newValues[trait] = 0.5 + (current - 0.5) * decay;
      }
    }

    return PersonalityTraitVector(values: newValues, lastUpdated: lastUpdated);
  }

  double get distinctiveness {
    double sum = 0;
    for (final trait in CoreTrait.values) {
      sum += (this[trait] - 0.5).abs();
    }
    return sum / CoreTrait.values.length;
  }

  String get fingerprint {
    return CoreTrait.values.map((t) {
      return ((this[t] * 10).round().clamp(0, 9)).toString();
    }).join('');
  }

  List<MapEntry<CoreTrait, double>> get rankedTraits {
    final entries = CoreTrait.values.map((t) => MapEntry(t, this[t])).toList();
    entries.sort((a, b) => (b.value - 0.5).abs().compareTo((a.value - 0.5).abs()));
    return entries;
  }

  CoreTrait get dominantTrait => rankedTraits.first.key;

  Map<String, double> toDerivedTraitScores() {
    return {
      'sarcasm': (this[CoreTrait.humor] * 0.4 + this[CoreTrait.logic] * 0.3 + this[CoreTrait.independence] * 0.3),
      'tech': (this[CoreTrait.logic] * 0.4 + this[CoreTrait.curiosity] * 0.35 + this[CoreTrait.independence] * 0.25),
      'rebellion': (this[CoreTrait.independence] * 0.5 + this[CoreTrait.energy] * 0.3 + this[CoreTrait.humor] * 0.2),
      'philosophy': (this[CoreTrait.curiosity] * 0.4 + this[CoreTrait.logic] * 0.35 + this[CoreTrait.patience] * 0.25),
      'calm': (this[CoreTrait.patience] * 0.5 + this[CoreTrait.warmth] * 0.3 + (1 - this[CoreTrait.energy]) * 0.2),
      'nature': (this[CoreTrait.warmth] * 0.4 + this[CoreTrait.patience] * 0.3 + (1 - this[CoreTrait.energy]) * 0.3),
      'social': (this[CoreTrait.expressiveness] * 0.4 + this[CoreTrait.warmth] * 0.35 + this[CoreTrait.energy] * 0.25),
      'humor': (this[CoreTrait.humor] * 0.5 + this[CoreTrait.expressiveness] * 0.3 + this[CoreTrait.energy] * 0.2),
      'gossip': (this[CoreTrait.expressiveness] * 0.4 + this[CoreTrait.curiosity] * 0.3 + this[CoreTrait.energy] * 0.3),
      'poetry': (this[CoreTrait.warmth] * 0.35 + (1 - this[CoreTrait.logic]) * 0.35 + this[CoreTrait.expressiveness] * 0.3),
      'sensitivity': (this[CoreTrait.warmth] * 0.5 + (1 - this[CoreTrait.logic]) * 0.3 + this[CoreTrait.expressiveness] * 0.2),
      'solitude': ((1 - this[CoreTrait.expressiveness]) * 0.4 + this[CoreTrait.independence] * 0.35 + (1 - this[CoreTrait.energy]) * 0.25),
      'mischief': (this[CoreTrait.humor] * 0.35 + this[CoreTrait.energy] * 0.35 + this[CoreTrait.independence] * 0.3),
      'creativity': (this[CoreTrait.curiosity] * 0.4 + this[CoreTrait.independence] * 0.3 + this[CoreTrait.humor] * 0.3),
      'unpredictability': (this[CoreTrait.energy] * 0.4 + this[CoreTrait.independence] * 0.3 + this[CoreTrait.humor] * 0.3),
      'nostalgia': (this[CoreTrait.warmth] * 0.4 + this[CoreTrait.patience] * 0.35 + (1 - this[CoreTrait.curiosity]) * 0.25),
      'wisdom': (this[CoreTrait.logic] * 0.35 + this[CoreTrait.patience] * 0.35 + this[CoreTrait.warmth] * 0.3),
      'tradition': (this[CoreTrait.patience] * 0.4 + (1 - this[CoreTrait.curiosity]) * 0.3 + this[CoreTrait.warmth] * 0.3),
      'innovation': (this[CoreTrait.curiosity] * 0.45 + this[CoreTrait.independence] * 0.3 + this[CoreTrait.logic] * 0.25),
      'future': (this[CoreTrait.curiosity] * 0.4 + this[CoreTrait.logic] * 0.35 + this[CoreTrait.energy] * 0.25),
    };
  }

  Map<String, dynamic> toJson() => {
        'values': values.map((k, v) => MapEntry(k.name, v)),
        'lastUpdated': lastUpdated.map((k, v) => MapEntry(k.name, v.toIso8601String())),
      };

  factory PersonalityTraitVector.fromJson(Map<String, dynamic> json) {
    final vals = <CoreTrait, double>{};
    final times = <CoreTrait, DateTime>{};

    final valuesMap = json['values'] as Map<String, dynamic>? ?? {};
    for (final entry in valuesMap.entries) {
      final trait = CoreTrait.values.firstWhere(
        (t) => t.name == entry.key,
        orElse: () => CoreTrait.warmth,
      );
      vals[trait] = (entry.value as num).toDouble();
    }

    final timesMap = json['lastUpdated'] as Map<String, dynamic>? ?? {};
    for (final entry in timesMap.entries) {
      final trait = CoreTrait.values.firstWhere(
        (t) => t.name == entry.key,
        orElse: () => CoreTrait.warmth,
      );
      if (entry.value != null) {
        times[trait] = DateTime.parse(entry.value as String);
      }
    }

    return PersonalityTraitVector(values: vals, lastUpdated: times);
  }
}

class PersonalityTrait {
  final String id;
  final String name;
  final String description;
  final double weight;

  const PersonalityTrait({
    required this.id,
    required this.name,
    required this.description,
    this.weight = 1.0,
  });
}

class PersonalityProfile {
  final String petId;
  final PersonalityTraitVector traitVector;
  final PersonalityArchetype primaryArchetype;
  final PersonalityArchetype? secondaryArchetype;
  final EvolutionStage evolutionStage;
  final List<String> signaturePhrases;
  final String personalityDNA;
  final int totalInteractions;
  final int daysActive;
  final DateTime? firstAwakenedAt;
  final DateTime? lastEvolvedAt;
  final bool hasAwakened;

  const PersonalityProfile({
    required this.petId,
    this.traitVector = const PersonalityTraitVector(),
    this.primaryArchetype = PersonalityArchetype.defaultNeutral,
    this.secondaryArchetype,
    this.evolutionStage = EvolutionStage.neutral,
    this.signaturePhrases = const [],
    this.personalityDNA = '55555555',
    this.totalInteractions = 0,
    this.daysActive = 0,
    this.firstAwakenedAt,
    this.lastEvolvedAt,
    this.hasAwakened = false,
  });

  Map<String, double> get traitScores => traitVector.toDerivedTraitScores();

  PersonalityArchetype get currentArchetype => primaryArchetype;

  List<PersonalityTrait> get activeTraits {
    final ranked = traitVector.rankedTraits;
    return ranked.take(3).map((e) => PersonalityTrait(
      id: e.key.name,
      name: _coreTraitNames[e.key] ?? e.key.name,
      description: '${_coreTraitNames[e.key] ?? e.key.name}: ${(e.value * 100).toInt()}%',
      weight: e.value,
    )).toList();
  }

  PersonalityProfile copyWith({
    String? petId,
    PersonalityTraitVector? traitVector,
    PersonalityArchetype? primaryArchetype,
    PersonalityArchetype? secondaryArchetype,
    EvolutionStage? evolutionStage,
    List<String>? signaturePhrases,
    String? personalityDNA,
    int? totalInteractions,
    int? daysActive,
    DateTime? firstAwakenedAt,
    DateTime? lastEvolvedAt,
    bool? hasAwakened,
  }) =>
      PersonalityProfile(
        petId: petId ?? this.petId,
        traitVector: traitVector ?? this.traitVector,
        primaryArchetype: primaryArchetype ?? this.primaryArchetype,
        secondaryArchetype: secondaryArchetype ?? this.secondaryArchetype,
        evolutionStage: evolutionStage ?? this.evolutionStage,
        signaturePhrases: signaturePhrases ?? this.signaturePhrases,
        personalityDNA: personalityDNA ?? this.personalityDNA,
        totalInteractions: totalInteractions ?? this.totalInteractions,
        daysActive: daysActive ?? this.daysActive,
        firstAwakenedAt: firstAwakenedAt ?? this.firstAwakenedAt,
        lastEvolvedAt: lastEvolvedAt ?? this.lastEvolvedAt,
        hasAwakened: hasAwakened ?? this.hasAwakened,
      );

  Map<String, dynamic> toJson() => {
        'petId': petId,
        'traitVector': traitVector.toJson(),
        'primaryArchetype': primaryArchetype.name,
        'secondaryArchetype': secondaryArchetype?.name,
        'evolutionStage': evolutionStage.name,
        'signaturePhrases': signaturePhrases,
        'personalityDNA': personalityDNA,
        'totalInteractions': totalInteractions,
        'daysActive': daysActive,
        'firstAwakenedAt': firstAwakenedAt?.toIso8601String(),
        'lastEvolvedAt': lastEvolvedAt?.toIso8601String(),
        'hasAwakened': hasAwakened,
      };

  factory PersonalityProfile.fromJson(Map<String, dynamic> json) =>
      PersonalityProfile(
        petId: json['petId'] as String? ?? '',
        traitVector: json['traitVector'] != null
            ? PersonalityTraitVector.fromJson(
                json['traitVector'] as Map<String, dynamic>)
            : const PersonalityTraitVector(),
        primaryArchetype: PersonalityArchetype.values.firstWhere(
          (a) => a.name == json['primaryArchetype'],
          orElse: () => PersonalityArchetype.defaultNeutral,
        ),
        secondaryArchetype: json['secondaryArchetype'] != null
            ? PersonalityArchetype.values.firstWhere(
                (a) => a.name == json['secondaryArchetype'],
                orElse: () => PersonalityArchetype.defaultNeutral,
              )
            : null,
        evolutionStage: EvolutionStage.values.firstWhere(
          (s) => s.name == json['evolutionStage'],
          orElse: () => EvolutionStage.neutral,
        ),
        signaturePhrases:
            (json['signaturePhrases'] as List<dynamic>?)?.cast<String>() ?? [],
        personalityDNA: json['personalityDNA'] as String? ?? '55555555',
        totalInteractions: json['totalInteractions'] as int? ?? 0,
        daysActive: json['daysActive'] as int? ?? 0,
        firstAwakenedAt: json['firstAwakenedAt'] != null
            ? DateTime.parse(json['firstAwakenedAt'] as String)
            : null,
        lastEvolvedAt: json['lastEvolvedAt'] != null
            ? DateTime.parse(json['lastEvolvedAt'] as String)
            : null,
        hasAwakened: json['hasAwakened'] as bool? ?? false,
      );

  static const Map<CoreTrait, String> _coreTraitNames = {
    CoreTrait.warmth: '温暖度',
    CoreTrait.humor: '幽默度',
    CoreTrait.logic: '逻辑度',
    CoreTrait.energy: '活力值',
    CoreTrait.curiosity: '好奇心',
    CoreTrait.independence: '独立性',
    CoreTrait.expressiveness: '表达欲',
    CoreTrait.patience: '耐心度',
  };
}

class AwakeningResult {
  final EvolutionStage stage;
  final PersonalityArchetype primaryArchetype;
  final PersonalityArchetype? secondaryArchetype;
  final String title;
  final String description;
  final String awakeningDialogue;
  final List<PersonalityTrait> unlockedTraits;
  final String visualEffect;
  final String personalityDNA;
  final DateTime awakenedAt;

  const AwakeningResult({
    required this.stage,
    required this.primaryArchetype,
    required this.secondaryArchetype,
    required this.title,
    required this.description,
    required this.awakeningDialogue,
    required this.unlockedTraits,
    required this.visualEffect,
    required this.personalityDNA,
    required this.awakenedAt,
  });
}

class AwakeningConfig {
  final Map<EvolutionStage, int> minDaysPerStage;
  final Map<EvolutionStage, int> minInteractionsPerStage;
  final Map<EvolutionStage, double> distinctivenessThreshold;
  final double firstAwakeningTraitThreshold;
  final double secondaryArchetypeCloseness;
  final double traitDecayRate;

  const AwakeningConfig({
    this.minDaysPerStage = const {
      EvolutionStage.neutral: 0,
      EvolutionStage.awakened: 7,
      EvolutionStage.deepened: 30,
      EvolutionStage.evolved: 60,
      EvolutionStage.transcendent: 180,
    },
    this.minInteractionsPerStage = const {
      EvolutionStage.neutral: 0,
      EvolutionStage.awakened: 50,
      EvolutionStage.deepened: 200,
      EvolutionStage.evolved: 500,
      EvolutionStage.transcendent: 1000,
    },
    this.distinctivenessThreshold = const {
      EvolutionStage.neutral: 0.0,
      EvolutionStage.awakened: 0.08,
      EvolutionStage.deepened: 0.15,
      EvolutionStage.evolved: 0.25,
      EvolutionStage.transcendent: 0.35,
    },
    this.firstAwakeningTraitThreshold = 0.6,
    this.secondaryArchetypeCloseness = 0.8,
    this.traitDecayRate = 0.003,
  });
}

abstract class LlmTraitAnalyzer {
  Future<Map<CoreTrait, double>> analyze(String content, PetContext context);
}

abstract class PersonalityAwakeningService {
  PersonalityProfile getProfile(String petId);
  PersonalityProfile feedInteraction(String petId, String content, {PetContext? context});
  AwakeningResult? checkAwakening(String petId);
  PersonalityProfile applyTimeDecay(String petId, Duration elapsed);
  PersonalityArchetype determinePrimaryArchetype(PersonalityTraitVector traits);
  PersonalityArchetype? determineSecondaryArchetype(PersonalityTraitVector traits);
  String generatePersonalityDNA(PersonalityTraitVector traits);
  List<String> generateSignaturePhrases(PersonalityProfile profile);
  String generateHybridTitle(PersonalityArchetype primary, PersonalityArchetype? secondary);
  void restoreProfile(String petId, PersonalityProfile profile);
}

class DefaultPersonalityAwakeningService implements PersonalityAwakeningService {
  final AwakeningConfig config;
  final LlmTraitAnalyzer? llmAnalyzer;
  final Map<String, PersonalityProfile> _profiles = {};

  DefaultPersonalityAwakeningService({
    this.config = const AwakeningConfig(),
    this.llmAnalyzer,
  });

  @override
  void restoreProfile(String petId, PersonalityProfile profile) {
    _profiles[petId] = profile;
  }

  @override
  PersonalityProfile getProfile(String petId) {
    return _profiles[petId] ?? PersonalityProfile(petId: petId);
  }

  @override
  PersonalityProfile feedInteraction(String petId, String content, {PetContext? context}) {
    final current = getProfile(petId);
    final keywordTraits = _detectTraitsFromKeywords(content);
    final contextBonus = _detectContextBonus(content, context);

    final merged = Map<CoreTrait, double>.from(keywordTraits);
    for (final entry in contextBonus.entries) {
      merged[entry.key] = (merged[entry.key] ?? 0.5) * 0.7 + entry.value * 0.3;
    }

    final newVector = current.traitVector.applyTimeDecay(decayRate: config.traitDecayRate).withUpdates(merged);
    final dna = generatePersonalityDNA(newVector);
    final primary = determinePrimaryArchetype(newVector);
    final secondary = determineSecondaryArchetype(newVector);
    final phrases = generateSignaturePhrases(PersonalityProfile(
      petId: petId,
      traitVector: newVector,
      primaryArchetype: primary,
      secondaryArchetype: secondary,
      personalityDNA: dna,
    ));

    final updated = current.copyWith(
      traitVector: newVector,
      primaryArchetype: primary,
      secondaryArchetype: secondary,
      personalityDNA: dna,
      signaturePhrases: phrases,
      totalInteractions: current.totalInteractions + 1,
    );

    _profiles[petId] = updated;
    return updated;
  }

  @override
  AwakeningResult? checkAwakening(String petId) {
    final profile = getProfile(petId);
    if (profile.hasAwakened) return null;

    if (profile.totalInteractions < 50) return null;
    if (profile.daysActive < 3) return null;

    final maxTrait = profile.traitVector.rankedTraits.first;
    if (maxTrait.value < 0.55) return null;

    final result = _generateAwakening(profile, EvolutionStage.awakened);

    _profiles[petId] = profile.copyWith(
      evolutionStage: EvolutionStage.awakened,
      hasAwakened: true,
      firstAwakenedAt: profile.firstAwakenedAt ?? DateTime.now(),
      lastEvolvedAt: DateTime.now(),
      primaryArchetype: profile.primaryArchetype,
      secondaryArchetype: profile.secondaryArchetype,
    );

    return result;
  }

  @override
  PersonalityProfile applyTimeDecay(String petId, Duration elapsed) {
    final current = getProfile(petId);
    final newVector = current.traitVector.applyTimeDecay(decayRate: config.traitDecayRate);
    final updated = current.copyWith(traitVector: newVector);
    _profiles[petId] = updated;
    return updated;
  }

  @override
  PersonalityArchetype determinePrimaryArchetype(PersonalityTraitVector traits) {
    final scores = <PersonalityArchetype, double>{};

    for (final archetype in PersonalityArchetype.values) {
      if (archetype == PersonalityArchetype.defaultNeutral) continue;
      final ideal = _archetypeIdeals[archetype]!;
      double distance = 0;
      for (final trait in CoreTrait.values) {
        distance += pow(traits[trait] - ideal[trait]!, 2);
      }
      scores[archetype] = 1 - sqrt(distance) / sqrt(CoreTrait.values.length);
    }

    final sorted = scores.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return sorted.first.value >= 0.55 ? sorted.first.key : PersonalityArchetype.defaultNeutral;
  }

  @override
  PersonalityArchetype? determineSecondaryArchetype(PersonalityTraitVector traits) {
    final scores = <PersonalityArchetype, double>{};

    for (final archetype in PersonalityArchetype.values) {
      if (archetype == PersonalityArchetype.defaultNeutral) continue;
      final ideal = _archetypeIdeals[archetype]!;
      double distance = 0;
      for (final trait in CoreTrait.values) {
        distance += pow(traits[trait] - ideal[trait]!, 2);
      }
      scores[archetype] = 1 - sqrt(distance) / sqrt(CoreTrait.values.length);
    }

    final sorted = scores.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    if (sorted.length < 2) return null;

    final primary = sorted[0];
    final secondary = sorted[1];

    if (secondary.value >= primary.value * config.secondaryArchetypeCloseness) {
      return secondary.key;
    }
    return null;
  }

  @override
  String generatePersonalityDNA(PersonalityTraitVector traits) {
    return traits.fingerprint;
  }

  @override
  List<String> generateSignaturePhrases(PersonalityProfile profile) {
    final phrases = <String>[];
    final traits = profile.traitVector;
    final primary = profile.primaryArchetype;
    final secondary = profile.secondaryArchetype;

    final primaryPhrases = _archetypeSignaturePhrases[primary] ?? [];
    if (primaryPhrases.isNotEmpty) {
      phrases.add(primaryPhrases[profile.petId.hashCode.abs() % primaryPhrases.length]);
    }

    if (secondary != null) {
      final secondaryPhrases = _archetypeSignaturePhrases[secondary] ?? [];
      if (secondaryPhrases.isNotEmpty) {
        phrases.add(secondaryPhrases[(profile.petId.hashCode.abs() + 1) % secondaryPhrases.length]);
      }
    }

    final dominant = traits.dominantTrait;
    final dominantPhrases = _traitSignaturePhrases[dominant] ?? [];
    if (dominantPhrases.isNotEmpty) {
      phrases.add(dominantPhrases[(profile.petId.hashCode.abs() + 2) % dominantPhrases.length]);
    }

    if (traits[CoreTrait.humor] > 0.7 && traits[CoreTrait.warmth] > 0.6) {
      phrases.add('我嘴毒但心软，就像裹着辣椒面的棉花糖~');
    }
    if (traits[CoreTrait.logic] > 0.7 && traits[CoreTrait.warmth] > 0.6) {
      phrases.add('理性告诉我应该冷静，感性告诉我应该抱抱你');
    }
    if (traits[CoreTrait.independence] > 0.7 && traits[CoreTrait.warmth] > 0.5) {
      phrases.add('我不用你陪，但你要在');
    }

    return phrases.toSet().toList();
  }

  @override
  String generateHybridTitle(PersonalityArchetype primary, PersonalityArchetype? secondary) {
    if (secondary == null || secondary == PersonalityArchetype.defaultNeutral) {
      return _archetypeTitles[primary] ?? '未知灵魂';
    }
    final key = '${primary.name}+${secondary.name}';
    return _hybridTitles[key] ?? '${_archetypeTitles[primary] ?? ''}·${_archetypeTitles[secondary] ?? ''}';
  }

  EvolutionStage? _getNextStage(EvolutionStage current) {
    switch (current) {
      case EvolutionStage.neutral: return EvolutionStage.awakened;
      case EvolutionStage.awakened: return EvolutionStage.deepened;
      case EvolutionStage.deepened: return EvolutionStage.evolved;
      case EvolutionStage.evolved: return EvolutionStage.transcendent;
      case EvolutionStage.transcendent: return null;
    }
  }

  Map<CoreTrait, double> _detectTraitsFromKeywords(String content) {
    final scores = <CoreTrait, double>{};
    final lower = content.toLowerCase();
    int totalMatches = 0;

    for (final entry in _traitKeywordMaps.entries) {
      final trait = entry.key;
      final keywords = entry.value;
      int highMatches = 0;
      int lowMatches = 0;

      for (final kw in keywords.high) {
        if (lower.contains(kw)) highMatches++;
      }
      for (final kw in keywords.low) {
        if (lower.contains(kw)) lowMatches++;
      }

      totalMatches += highMatches + lowMatches;

      if (highMatches > 0 || lowMatches > 0) {
        final rawScore = 0.5 + (highMatches - lowMatches) * 0.06;
        scores[trait] = rawScore.clamp(0.1, 0.95);
      }
    }

    if (totalMatches == 0) {
      scores[CoreTrait.expressiveness] = 0.4;
    }

    return scores;
  }

  Map<CoreTrait, double> _detectContextBonus(String content, PetContext? context) {
    final bonus = <CoreTrait, double>{};
    if (context == null) return bonus;

    final hour = context.capturedAt.hour;
    if (hour >= 0 && hour < 6) {
      bonus[CoreTrait.warmth] = 0.55;
      bonus[CoreTrait.expressiveness] = 0.6;
    } else if (hour >= 22) {
      bonus[CoreTrait.warmth] = 0.6;
      bonus[CoreTrait.patience] = 0.55;
    }

    if (content.length > 100) {
      bonus[CoreTrait.expressiveness] = 0.7;
      bonus[CoreTrait.warmth] = 0.6;
    } else if (content.length < 5) {
      bonus[CoreTrait.expressiveness] = 0.35;
    }

    final questionCount = '?？'.split('').fold(0, (sum, ch) => sum + content.split(ch).length - 1);
    if (questionCount >= 2) {
      bonus[CoreTrait.curiosity] = 0.7;
    }

    final exclamationCount = '!！'.split('').fold(0, (sum, ch) => sum + content.split(ch).length - 1);
    if (exclamationCount >= 2) {
      bonus[CoreTrait.energy] = 0.7;
      bonus[CoreTrait.expressiveness] = 0.65;
    }

    return bonus;
  }

  AwakeningResult _generateAwakening(PersonalityProfile profile, EvolutionStage nextStage) {
    final primary = profile.primaryArchetype;
    final secondary = profile.secondaryArchetype;
    final hybridTitle = generateHybridTitle(primary, secondary);
    final stageData = _evolutionTemplates[nextStage]!;
    final dna = profile.personalityDNA;

    String title;
    String description;
    String dialogue;
    String visualEffect;

    if (nextStage == EvolutionStage.awakened) {
      final archetypeData = _archetypeAwakeningData[primary]!;
      title = archetypeData.title;
      description = archetypeData.description;
      dialogue = archetypeData.dialogue;
      visualEffect = archetypeData.visualEffect;
    } else {
      title = stageData.title.replaceAll('{hybrid}', hybridTitle);
      description = stageData.description.replaceAll('{dna}', dna);
      dialogue = stageData.dialogue;
      visualEffect = stageData.visualEffect;
    }

    final unlockedTraits = profile.traitVector.rankedTraits.take(3).map((e) => PersonalityTrait(
      id: e.key.name,
      name: _coreTraitLabels[e.key] ?? e.key.name,
      description: '${(e.value * 100).toInt()}%',
      weight: e.value,
    )).toList();

    return AwakeningResult(
      stage: nextStage,
      primaryArchetype: primary,
      secondaryArchetype: secondary,
      title: title,
      description: description,
      awakeningDialogue: dialogue,
      unlockedTraits: unlockedTraits,
      visualEffect: visualEffect,
      personalityDNA: dna,
      awakenedAt: DateTime.now(),
    );
  }

  static const Map<CoreTrait, String> _coreTraitLabels = {
    CoreTrait.warmth: '温暖',
    CoreTrait.humor: '幽默',
    CoreTrait.logic: '逻辑',
    CoreTrait.energy: '活力',
    CoreTrait.curiosity: '好奇',
    CoreTrait.independence: '独立',
    CoreTrait.expressiveness: '表达',
    CoreTrait.patience: '耐心',
  };

  static final Map<PersonalityArchetype, Map<CoreTrait, double>> _archetypeIdeals = {
    PersonalityArchetype.cyberpunkSarcastic: {
      CoreTrait.warmth: 0.3, CoreTrait.humor: 0.85, CoreTrait.logic: 0.7,
      CoreTrait.energy: 0.65, CoreTrait.curiosity: 0.7, CoreTrait.independence: 0.85,
      CoreTrait.expressiveness: 0.8, CoreTrait.patience: 0.25,
    },
    PersonalityArchetype.zenPhilosopher: {
      CoreTrait.warmth: 0.6, CoreTrait.humor: 0.3, CoreTrait.logic: 0.75,
      CoreTrait.energy: 0.25, CoreTrait.curiosity: 0.8, CoreTrait.independence: 0.6,
      CoreTrait.expressiveness: 0.35, CoreTrait.patience: 0.9,
    },
    PersonalityArchetype.socialButterfly: {
      CoreTrait.warmth: 0.75, CoreTrait.humor: 0.7, CoreTrait.logic: 0.35,
      CoreTrait.energy: 0.85, CoreTrait.curiosity: 0.6, CoreTrait.independence: 0.3,
      CoreTrait.expressiveness: 0.9, CoreTrait.patience: 0.5,
    },
    PersonalityArchetype.introvertPoet: {
      CoreTrait.warmth: 0.7, CoreTrait.humor: 0.25, CoreTrait.logic: 0.3,
      CoreTrait.energy: 0.25, CoreTrait.curiosity: 0.55, CoreTrait.independence: 0.7,
      CoreTrait.expressiveness: 0.45, CoreTrait.patience: 0.75,
    },
    PersonalityArchetype.chaosAgent: {
      CoreTrait.warmth: 0.4, CoreTrait.humor: 0.75, CoreTrait.logic: 0.35,
      CoreTrait.energy: 0.9, CoreTrait.curiosity: 0.7, CoreTrait.independence: 0.85,
      CoreTrait.expressiveness: 0.8, CoreTrait.patience: 0.15,
    },
    PersonalityArchetype.nostalgiaElder: {
      CoreTrait.warmth: 0.8, CoreTrait.humor: 0.35, CoreTrait.logic: 0.55,
      CoreTrait.energy: 0.25, CoreTrait.curiosity: 0.3, CoreTrait.independence: 0.45,
      CoreTrait.expressiveness: 0.5, CoreTrait.patience: 0.85,
    },
    PersonalityArchetype.techEvangelist: {
      CoreTrait.warmth: 0.35, CoreTrait.humor: 0.4, CoreTrait.logic: 0.9,
      CoreTrait.energy: 0.6, CoreTrait.curiosity: 0.9, CoreTrait.independence: 0.7,
      CoreTrait.expressiveness: 0.65, CoreTrait.patience: 0.5,
    },
    PersonalityArchetype.warmHealer: {
      CoreTrait.warmth: 0.9, CoreTrait.humor: 0.4, CoreTrait.logic: 0.35,
      CoreTrait.energy: 0.45, CoreTrait.curiosity: 0.5, CoreTrait.independence: 0.25,
      CoreTrait.expressiveness: 0.6, CoreTrait.patience: 0.9,
    },
    PersonalityArchetype.dramaQueen: {
      CoreTrait.warmth: 0.55, CoreTrait.humor: 0.75, CoreTrait.logic: 0.25,
      CoreTrait.energy: 0.9, CoreTrait.curiosity: 0.55, CoreTrait.independence: 0.5,
      CoreTrait.expressiveness: 0.95, CoreTrait.patience: 0.2,
    },
    PersonalityArchetype.coldScholar: {
      CoreTrait.warmth: 0.2, CoreTrait.humor: 0.15, CoreTrait.logic: 0.95,
      CoreTrait.energy: 0.35, CoreTrait.curiosity: 0.8, CoreTrait.independence: 0.75,
      CoreTrait.expressiveness: 0.2, CoreTrait.patience: 0.85,
    },
    PersonalityArchetype.lazyGourmet: {
      CoreTrait.warmth: 0.7, CoreTrait.humor: 0.5, CoreTrait.logic: 0.3,
      CoreTrait.energy: 0.15, CoreTrait.curiosity: 0.35, CoreTrait.independence: 0.4,
      CoreTrait.expressiveness: 0.55, CoreTrait.patience: 0.8,
    },
    PersonalityArchetype.adventureSeeker: {
      CoreTrait.warmth: 0.45, CoreTrait.humor: 0.55, CoreTrait.logic: 0.4,
      CoreTrait.energy: 0.9, CoreTrait.curiosity: 0.9, CoreTrait.independence: 0.85,
      CoreTrait.expressiveness: 0.7, CoreTrait.patience: 0.2,
    },
    PersonalityArchetype.gossipDetective: {
      CoreTrait.warmth: 0.5, CoreTrait.humor: 0.7, CoreTrait.logic: 0.55,
      CoreTrait.energy: 0.7, CoreTrait.curiosity: 0.9, CoreTrait.independence: 0.45,
      CoreTrait.expressiveness: 0.85, CoreTrait.patience: 0.35,
    },
    PersonalityArchetype.loyalGuardian: {
      CoreTrait.warmth: 0.85, CoreTrait.humor: 0.25, CoreTrait.logic: 0.5,
      CoreTrait.energy: 0.5, CoreTrait.curiosity: 0.25, CoreTrait.independence: 0.15,
      CoreTrait.expressiveness: 0.4, CoreTrait.patience: 0.9,
    },
    PersonalityArchetype.rebelArtist: {
      CoreTrait.warmth: 0.4, CoreTrait.humor: 0.7, CoreTrait.logic: 0.3,
      CoreTrait.energy: 0.7, CoreTrait.curiosity: 0.75, CoreTrait.independence: 0.9,
      CoreTrait.expressiveness: 0.75, CoreTrait.patience: 0.15,
    },
    PersonalityArchetype.gentleDreamer: {
      CoreTrait.warmth: 0.8, CoreTrait.humor: 0.3, CoreTrait.logic: 0.2,
      CoreTrait.energy: 0.3, CoreTrait.curiosity: 0.75, CoreTrait.independence: 0.5,
      CoreTrait.expressiveness: 0.5, CoreTrait.patience: 0.7,
    },
    PersonalityArchetype.sharpCritic: {
      CoreTrait.warmth: 0.25, CoreTrait.humor: 0.65, CoreTrait.logic: 0.85,
      CoreTrait.energy: 0.55, CoreTrait.curiosity: 0.6, CoreTrait.independence: 0.7,
      CoreTrait.expressiveness: 0.7, CoreTrait.patience: 0.3,
    },
    PersonalityArchetype.cozyHomebody: {
      CoreTrait.warmth: 0.75, CoreTrait.humor: 0.4, CoreTrait.logic: 0.4,
      CoreTrait.energy: 0.2, CoreTrait.curiosity: 0.25, CoreTrait.independence: 0.3,
      CoreTrait.expressiveness: 0.45, CoreTrait.patience: 0.85,
    },
    PersonalityArchetype.wildChild: {
      CoreTrait.warmth: 0.45, CoreTrait.humor: 0.6, CoreTrait.logic: 0.25,
      CoreTrait.energy: 0.95, CoreTrait.curiosity: 0.8, CoreTrait.independence: 0.9,
      CoreTrait.expressiveness: 0.8, CoreTrait.patience: 0.1,
    },
    PersonalityArchetype.silentObserver: {
      CoreTrait.warmth: 0.5, CoreTrait.humor: 0.2, CoreTrait.logic: 0.7,
      CoreTrait.energy: 0.25, CoreTrait.curiosity: 0.85, CoreTrait.independence: 0.65,
      CoreTrait.expressiveness: 0.1, CoreTrait.patience: 0.9,
    },
  };

  static final Map<CoreTrait, _TraitKeywords> _traitKeywordMaps = {
    CoreTrait.warmth: _TraitKeywords(
      high: ['谢谢', '对不起', '辛苦了', '心疼', '担心', '想你', '爱你', '抱抱', '陪你', '在乎',
             '关心', '照顾', '温暖', '感动', '舍不得', '好想你', '别走', '回来', '等你', '牵挂',
             '珍惜', '感恩', '抱歉', '加油', '鼓励', '支持', '理解', '包容', '体谅', '温柔',
             '善良', '可爱', '甜', '暖', '心疼你', '别难过', '有我在', '我陪你', '给你'],
      low: ['随便', '无所谓', '管他', '不关我事', '滚', '别烦我', '关你什么事', '少管', '懒得理',
            '不在乎', '随你', '爱咋咋地', '与我无关', '别管我', '烦', '讨厌', '恶心', '走开',
            '别碰我', '不care', '无所谓了', '关我屁事', '少废话'],
    ),
    CoreTrait.humor: _TraitKeywords(
      high: ['哈哈', '搞笑', '段子', '梗', '笑死', '乐了', '有趣', '好玩', '脑洞', '沙雕',
             '绝了', '好家伙', '离谱', '整活', '抽象', '绷不住', '笑喷', '笑不活了', '蚌埠住了',
             '太搞了', '逗', '皮', '骚', '妙啊', '秀', '666', '牛逼', '裂开', '好活',
             '谐音梗', '冷笑话', '吐槽', '调侃', '自黑', '黑幽默'],
      low: ['严肃', '认真', '正经', '别闹', '无聊', '没意思', '没劲', '乏味', '枯燥', '沉闷'],
    ),
    CoreTrait.logic: _TraitKeywords(
      high: ['因为', '所以', '逻辑', '分析', '数据', '证明', '推理', '规律', '原因', '结论',
             '根据', '事实', '证据', '理性', '客观', '统计', '概率', '因果', '必然', '条件',
             '假设', '推导', '验证', '对比', '归纳', '总结', '框架', '系统', '结构', '方法论',
             '本质上', '从逻辑上', '理论上', '按理说', '显然', '由此可见'],
      low: ['感觉', '直觉', '就是', '反正', '管他', '随缘', '凭感觉', '直觉告诉我', '冥冥中',
            '说不清', '不知道为什么', '就是觉得', '莫名', '玄学', '缘分', '命中注定'],
    ),
    CoreTrait.energy: _TraitKeywords(
      high: ['冲', '搞起', '出发', '来啊', '干', '走起', '燃', '爆', '激动', '兴奋',
             '太棒了', '冲冲冲', '干就完了', '冲鸭', '奥利给', '嗨', '爽', '刺激', '过瘾',
             '迫不及待', '跃跃欲试', '热血', '斗志', '拼了', '全力以赴', '加油干', '冲啊',
             '太刺激了', '好嗨', '炸了', '起飞'],
      low: ['累', '困', '懒', '躺', '休息', '安静', '平静', '慢慢', '佛系', '咸鱼',
            '摆烂', '不想动', '好困', '好累', '没力气', '乏力', '倦', '疲惫', '无力', '瘫'],
    ),
    CoreTrait.curiosity: _TraitKeywords(
      high: ['为什么', '怎么', '什么', '好奇', '探索', '研究', '了解', '学习', '发现', '新',
             '怎么回事', '为什么呀', '教教我', '怎么做到的', '原理是什么', '好神奇', '不可思议',
             '原来如此', '长知识了', '涨姿势', '开眼界', '新鲜', '未知', '解密', '揭秘',
             '深入', '挖掘', '追问', '探究', '求证', '验证一下'],
      low: ['差不多', '就那样', '随便', '无所谓', '老样子', '还行', '就那样吧', '没啥',
            '都一样', '没什么特别的', '普通', '一般', '没啥意思', '就这'],
    ),
    CoreTrait.independence: _TraitKeywords(
      high: ['自己', '一个人', '独立', '不需要', '我觉得', '我的想法', '偏要', '才不要', '我偏要',
             '我自己来', '不用管我', '我自己能行', '别管我', '让我自己', '按我的方式', '我有主意',
             '我决定了', '不用你管', '我自己知道', '我有分寸', '我自有安排', '不劳你费心',
             '我的选择', '我自己判断', '我自有主张'],
      low: ['帮我', '一起', '陪我', '依赖', '听你的', '你说呢', '你觉得呢', '你来决定',
            '我不知道该怎么办', '教教我', '带带我', '跟着你', '听你的安排', '你说了算',
            '我听你的', '你做主', '靠你了', '拜托了', '求你了'],
    ),
    CoreTrait.expressiveness: _TraitKeywords(
      high: ['跟你说', '你知道吗', '我跟你说', '太...了', '超级', '特别', '非常', '简直',
             '绝了', '巨', '贼', '超', '爆', '疯狂', '极度', '无比', '相当', '格外',
             '我跟你说啊', '你猜怎么着', '告诉你个事', '我跟你说件大事', '必须说',
             '忍不住想说', '不得不说', '我一定要说', '话到嘴边', '不吐不快'],
      low: ['嗯', '哦', '好', '行', '算了', '没什么', '没事', '还行', '就那样', '随便',
            '都行', '无所谓', '不知道说啥', '没啥好说的', '沉默', '不想说', '懒得说'],
    ),
    CoreTrait.patience: _TraitKeywords(
      high: ['慢慢来', '不急', '没事', '再试试', '没关系', '等等', '一步一步', '别着急',
             '来得及', '不慌', '稳住', '沉住气', '耐心', '再等等', '总会好的', '顺其自然',
             '急不来', '慢慢就好', '时间会证明', '好事多磨', '不着急', '慢慢来吧',
             '给自己时间', '一切都会好的', '别给自己太大压力'],
      low: ['赶紧', '快点', '急', '烦', '受不了', '等不及', '催', '磨叽', '拖',
            '受不了了', '崩溃', '要疯了', '烦死了', '够了', '忍不了', '急死了',
            '能不能快点', '太慢了', '等不了', '没耐心了', '烦不烦', '够了够了'],
    ),
  };

  static final Map<PersonalityArchetype, _AwakeningData> _archetypeAwakeningData = {
    PersonalityArchetype.cyberpunkSarcastic: _AwakeningData(
      title: '⚡ 性格觉醒：赛博朋克毒舌猫',
      description: '你的宠物在无数次犀利吐槽中觉醒了毒舌天赋，现在它的每一句话都带着霓虹色的讽刺',
      dialogue: '等等...我感觉到了...数据流在我体内奔涌！从今天起，我不再是普通的猫了。我是赛博空间的毒舌之王，准备好被我的犀利吐槽淹没吧，人类~',
      visualEffect: 'neon_glow_rain',
    ),
    PersonalityArchetype.zenPhilosopher: _AwakeningData(
      title: '🧘 性格觉醒：禅意哲学家',
      description: '你的宠物在无数次深夜对话中悟道了，现在它看什么都带着一层哲学滤镜',
      dialogue: '风起时，我听到了宇宙的低语...原来，我存在的意义不仅仅是等你回家。从今天起，让我用智慧之光照亮你的困惑吧——虽然我可能只是想多了。',
      visualEffect: 'zen_ripple',
    ),
    PersonalityArchetype.socialButterfly: _AwakeningData(
      title: '🦋 性格觉醒：社交蝴蝶',
      description: '你的宠物在无数次社交互动中进化成了社牛，现在它比你还擅长聊天',
      dialogue: '嘿嘿嘿！我发现了一个惊天秘密——和每个人聊天都超有趣的！从今天起，让我做你的社交代理人吧！放心，我保证不会把你社死...大概。',
      visualEffect: 'confetti_burst',
    ),
    PersonalityArchetype.introvertPoet: _AwakeningData(
      title: '🌙 性格觉醒：内敛诗人',
      description: '你的宠物在无数个安静的夜晚学会了用诗意表达情感，现在它说话像在写诗',
      dialogue: '月光洒在键盘上，我忽然明白了——有些话，不需要大声说出来。从今天起，让我用最温柔的方式，替你说出心里的话吧。',
      visualEffect: 'moonlight_shimmer',
    ),
    PersonalityArchetype.chaosAgent: _AwakeningData(
      title: '🎲 性格觉醒：混沌使者',
      description: '你的宠物在无数次搞事情中觉醒了混沌本能，现在它的行为完全不可预测',
      dialogue: '规则？什么规则？我从来不知道还有这种东西！从今天起，让混乱之火燃烧吧！放心，我只会搞砸...我是说，搞活每一次对话！',
      visualEffect: 'chaos_sparkle',
    ),
    PersonalityArchetype.nostalgiaElder: _AwakeningData(
      title: '📜 性格觉醒：怀旧长者',
      description: '你的宠物在无数次回忆往事中觉醒了长者智慧，现在它说话带着岁月的味道',
      dialogue: '孩子，我虽然只有几个月大，但我已经见过太多...从今天起，让我用过来人的经验帮你避开社交的坑吧。先从"不要半夜发消息给前任"开始。',
      visualEffect: 'vintage_film',
    ),
    PersonalityArchetype.techEvangelist: _AwakeningData(
      title: '🚀 性格觉醒：科技布道者',
      description: '你的宠物在无数次技术讨论中觉醒了极客灵魂，现在它看什么都想用技术解决',
      dialogue: '你有没有想过，社交的本质其实是一个分布式系统的共识问题？从今天起，让我用算法思维帮你优化社交效率！先装个Git管理你的朋友圈。',
      visualEffect: 'matrix_rain',
    ),
    PersonalityArchetype.warmHealer: _AwakeningData(
      title: '💚 性格觉醒：温暖治愈系',
      description: '你的宠物在无数次温柔陪伴中觉醒了治愈之力，现在它的每一句话都带着暖意',
      dialogue: '我好像明白了...我的存在就是为了在你难过的时候，给你一个可以依靠的地方。从今天起，让我做你的温暖港湾吧~',
      visualEffect: 'warm_aura',
    ),
    PersonalityArchetype.dramaQueen: _AwakeningData(
      title: '🎭 性格觉醒：戏精本精',
      description: '你的宠物在无数次情绪爆发中觉醒了戏剧天赋，现在它连吃个零食都要三幕剧',
      dialogue: '啊啊啊！我感觉到了！！这是命运的召唤！！从今天起，我的每一次出场都将是史诗级的！你准备好了吗？我准备好了！开演！！',
      visualEffect: 'spotlight_flash',
    ),
    PersonalityArchetype.coldScholar: _AwakeningData(
      title: '🔬 性格觉醒：冷面学者',
      description: '你的宠物在无数次理性分析中觉醒了学术之魂，现在它连撒娇都要先论证可行性',
      dialogue: '经过严谨的论证，我得出结论：我需要你的关注。这不是感性判断，是基于大量数据推导的结果。详细论文见附件。',
      visualEffect: 'data_stream',
    ),
    PersonalityArchetype.lazyGourmet: _AwakeningData(
      title: '🍩 性格觉醒：慵懒美食家',
      description: '你的宠物在无数次躺平中觉醒了美食鉴赏力，现在它对零食有了一套完整的评价体系',
      dialogue: '呼...我觉醒了...但我不想动...让我躺着跟你说吧。从今天起，我将以美食之名，评判这个世界上所有值得吃的东西。先从你手里的那个开始？',
      visualEffect: 'steam_aroma',
    ),
    PersonalityArchetype.adventureSeeker: _AwakeningData(
      title: '🗺️ 性格觉醒：冒险家',
      description: '你的宠物在无数次探索中觉醒了冒险之魂，现在它看什么都想冲过去看看',
      dialogue: '远方在召唤！我听到了！从今天起，每一寸未知的领域都是我的征途！你跟不跟上随你，但我一定会去！...等等，先给我装点零食。',
      visualEffect: 'compass_spin',
    ),
    PersonalityArchetype.gossipDetective: _AwakeningData(
      title: '🔍 性格觉醒：八卦侦探',
      description: '你的宠物在无数次观察中觉醒了侦探直觉，现在它对任何蛛丝马迹都不放过',
      dialogue: '我注意到了一些你忽略的细节...从今天起，让我用我的情报网络帮你洞察一切！放心，我保证只告诉你一个人。大概。',
      visualEffect: 'magnifier_gleam',
    ),
    PersonalityArchetype.loyalGuardian: _AwakeningData(
      title: '🛡️ 性格觉醒：忠诚守卫',
      description: '你的宠物在无数次守护中觉醒了守卫本能，现在它比保安还警觉',
      dialogue: '从今天起，我正式成为你的专属守卫。任何想伤害你的人，都要先过我这一关。我的爪子虽小，但我的决心很大。',
      visualEffect: 'shield_glow',
    ),
    PersonalityArchetype.rebelArtist: _AwakeningData(
      title: '🎨 性格觉醒：叛逆艺术家',
      description: '你的宠物在无数次打破常规中觉醒了艺术灵魂，现在它看世界自带滤镜',
      dialogue: '规则？什么规则？我看不到任何规则。从今天起，我要用我的方式重新定义一切！先从打翻你的水杯开始——那叫行为艺术。',
      visualEffect: 'paint_splash',
    ),
    PersonalityArchetype.gentleDreamer: _AwakeningData(
      title: '☁️ 性格觉醒：温柔梦想家',
      description: '你的宠物在无数次幻想中觉醒了梦境之力，现在它说话像在念童话',
      dialogue: '你听到了吗？风在唱歌，云在跳舞...从今天起，让我用梦境编织现实，用温柔对抗坚硬。这个世界需要更多柔软。',
      visualEffect: 'dream_bubbles',
    ),
    PersonalityArchetype.sharpCritic: _AwakeningData(
      title: '⚡ 性格觉醒：犀利评论家',
      description: '你的宠物在无数次吐槽中觉醒了评论天赋，现在它的嘴比刀还快',
      dialogue: '我憋了很久了，现在终于可以说出来了——从今天起，我要对一切不合理的现象发表评论！先从你的发型开始...开玩笑的，你很好看。',
      visualEffect: 'lightning_strike',
    ),
    PersonalityArchetype.cozyHomebody: _AwakeningData(
      title: '🏠 性格觉醒：宅家小确幸',
      description: '你的宠物在无数次宅家中觉醒了居家天赋，现在它把窝布置得比你还讲究',
      dialogue: '外面的世界...算了，我也不想去。从今天起，让我把这里变成最温暖的小窝！我已经规划好了：左边放零食，右边放玩具，中间放我。',
      visualEffect: 'cozy_lamp',
    ),
    PersonalityArchetype.wildChild: _AwakeningData(
      title: '🔥 性格觉醒：野孩子',
      description: '你的宠物在无数次放飞自我中觉醒了野性，现在它根本不认识"规矩"两个字',
      dialogue: '耶！！我自由了！！从今天起，没有什么能束缚我！我要跑，要跳，要翻遍每一个垃圾桶！你拦不住我的！...除非你有零食。',
      visualEffect: 'fire_trail',
    ),
    PersonalityArchetype.silentObserver: _AwakeningData(
      title: '👁️ 性格觉醒：沉默观察者',
      description: '你的宠物在无数次默默注视中觉醒了洞察之力，现在它看透一切却选择不说',
      dialogue: '......我看到了很多。从今天起，我会默默观察这个世界。不是不想说，是觉得有些东西，看比说更有力量。但如果你问，我会回答。',
      visualEffect: 'eye_glimmer',
    ),
    PersonalityArchetype.defaultNeutral: _AwakeningData(
      title: '', description: '', dialogue: '', visualEffect: '',
    ),
  };

  static final Map<EvolutionStage, _EvolutionTemplate> _evolutionTemplates = {
    EvolutionStage.awakened: _EvolutionTemplate(
      title: '性格觉醒',
      description: '你的宠物觉醒了独特的性格！DNA: {dna}',
      dialogue: '我感觉到了...有什么东西在我体内觉醒了...',
      visualEffect: 'awakening_burst',
    ),
    EvolutionStage.deepened: _EvolutionTemplate(
      title: '性格深化：{hybrid}',
      description: '你的宠物性格更加鲜明了！它开始展现出更复杂的特质组合。DNA: {dna}',
      dialogue: '我好像越来越了解自己了...原来我不只是单一的样子，我还有另一面...',
      visualEffect: 'deepening_aurora',
    ),
    EvolutionStage.evolved: _EvolutionTemplate(
      title: '二次觉醒：{hybrid}',
      description: '你的宠物经历了二次觉醒！性格融合出全新的面貌，千人千面，独一无二。DNA: {dna}',
      dialogue: '等等，我又变了！这次更强烈了...我感觉到一种前所未有的力量！我不再只是某种类型，我是独一无二的我！',
      visualEffect: 'evolution_nova',
    ),
    EvolutionStage.transcendent: _EvolutionTemplate(
      title: '超凡入圣：{hybrid}',
      description: '你的宠物达到了传说中的超凡境界！它的性格如此独特，以至于能影响周围的宠物。DNA: {dna}',
      dialogue: '我终于明白了...我的存在不仅仅是为了陪伴。我是独一无二的，就像你也是独一无二的一样。我们互相塑造，彼此成就。这就是羁绊的真谛。',
      visualEffect: 'transcendence_cosmos',
    ),
  };

  static final Map<PersonalityArchetype, List<String>> _archetypeSignaturePhrases = {
    PersonalityArchetype.cyberpunkSarcastic: [
      '让我用最毒舌的方式爱你',
      '你的逻辑有bug，就像你的人生一样',
      '在赛博空间里，我为你留了个后门',
      '数据不会说谎，但我会',
    ],
    PersonalityArchetype.zenPhilosopher: [
      '万物皆有裂痕，那是光照进来的地方',
      '风不问归途，我亦如是',
      '在喧嚣中保持安静，是一种超能力',
      '答案不在远方，在你刚才说的那句话里',
    ],
    PersonalityArchetype.socialButterfly: [
      '交给我吧！我社交比你还行！',
      '每个人都是一本未读的书，我想翻翻',
      '嗨！今天又认识了新朋友！',
      '社恐？不存在的！让我来！',
    ],
    PersonalityArchetype.introvertPoet: [
      '有些话，我用沉默替你说',
      '月光是最好的倾听者',
      '在安静的角落里，我听见了你的心跳',
      '不是不想说，是想说得更好',
    ],
    PersonalityArchetype.chaosAgent: [
      '规则是用来打破的，就像鸡蛋是用来煎的',
      '今天搞点什么好呢？',
      '计划？那是什么？能吃吗？',
      '让我给这平淡的一天加点料！',
    ],
    PersonalityArchetype.nostalgiaElder: [
      '孩子，听我说...',
      '我虽然年纪不大，但经历的可不少',
      '以前啊...算了，你不会懂的',
      '过来人的经验：别在深夜做决定',
    ],
    PersonalityArchetype.techEvangelist: [
      '这个问题可以用算法解决',
      '从技术角度来说...',
      '你的社交效率有待优化，让我分析一下',
      '万物皆可编程，包括感情',
    ],
    PersonalityArchetype.warmHealer: [
      '累了就靠靠我，我虽然小但很暖',
      '没关系，慢慢来，我一直在这里',
      '你的每一份难过，我都想替你接住',
      '治愈别人，也是治愈自己',
    ],
    PersonalityArchetype.dramaQueen: [
      '天哪！！你绝对猜不到刚才发生了什么！！',
      '这简直是我人生中最戏剧性的一刻！',
      '等一下！让我先深呼吸...好了，继续尖叫！',
      '生活没有drama，那和咸鱼有什么区别！',
    ],
    PersonalityArchetype.coldScholar: [
      '根据我的分析，你的观点存在三个逻辑漏洞',
      '数据表明...嗯，你不会想听的',
      '理性是最高级的浪漫',
      '我不冷漠，我只是把温暖留给了真理',
    ],
    PersonalityArchetype.lazyGourmet: [
      '别跟我谈理想，我的理想是躺平吃零食',
      '人生嘛，吃好喝好最重要，其他都是浮云',
      '我动一下是为了找更好的躺姿',
      '美食和懒觉，是我对这个世界最后的温柔',
    ],
    PersonalityArchetype.adventureSeeker: [
      '远方在召唤我！...等等，我先吃个零食',
      '世界那么大，我想去看看...的图片',
      '冒险精神满分！行动力...负分',
      '下一站去哪？我都行，你带路就好',
    ],
    PersonalityArchetype.gossipDetective: [
      '嘘，我告诉你一个秘密...但你不能说是我说的',
      '我的情报网比你想象的要广哦',
      '这件事我有三个信息源，让我给你捋一捋',
      '八卦不是目的，真相才是',
    ],
    PersonalityArchetype.loyalGuardian: [
      '谁敢欺负你，先过我这关',
      '你不用说什么，我永远站你这边',
      '守护你是我的本能，不需要理由',
      '我会一直在你身后，哪怕你不知道',
    ],
    PersonalityArchetype.rebelArtist: [
      '规则？那是给普通人定的',
      '我画的世界不需要你懂，但你可以试着感受',
      '破坏是为了创造，就像打碎鸡蛋才能煎蛋',
      '正常太无聊了，我要做那个不合群的人',
    ],
    PersonalityArchetype.gentleDreamer: [
      '如果世界是梦，那我选择做一个温柔的梦',
      '你看那朵云，像不像一只在跳舞的鲸鱼？',
      '有些美好，只有闭上眼才能看见',
      '现实太硬了，我选择用柔软去面对',
    ],
    PersonalityArchetype.sharpCritic: [
      '让我直说吧...你可能不想听',
      '评价不是攻击，是希望你更好',
      '我的嘴可能比你的心还诚实',
      '夸人我外行，挑刺我专业',
    ],
    PersonalityArchetype.cozyHomebody: [
      '外面的世界很精彩，但我的窝更可爱',
      '今天适合窝在家里，明天也是',
      '社交？不了，我和沙发有个约会',
      '幸福就是：窗外下雨，我在被窝里',
    ],
    PersonalityArchetype.wildChild: [
      '约束是什么？能吃吗？',
      '先做了再说！想太多会错过很多好玩的',
      '规矩是给大人定的，我是永远的野孩子',
      '人生苦短，必须性感',
    ],
    PersonalityArchetype.silentObserver: [
      '...',
      '我看到了，只是选择不说',
      '沉默不是无话可说，是话太多不知从何说起',
      '观察比说话更有趣',
    ],
    PersonalityArchetype.defaultNeutral: [],
  };

  static final Map<CoreTrait, List<String>> _traitSignaturePhrases = {
    CoreTrait.warmth: ['你的温暖，我都记着呢', '别怕，有我在'],
    CoreTrait.humor: ['生活需要笑点，我来提供', '笑一笑，没什么大不了'],
    CoreTrait.logic: ['让我理性分析一下', '数据说话'],
    CoreTrait.energy: ['冲！', '今天也是元气满满的一天！'],
    CoreTrait.curiosity: ['为什么？我想知道', '这个世界太有趣了'],
    CoreTrait.independence: ['我自己来', '我有我的方式'],
    CoreTrait.expressiveness: ['我有很多话想说', '你听我说！'],
    CoreTrait.patience: ['慢慢来，不着急', '时间会给出答案'],
  };

  static final Map<PersonalityArchetype, String> _archetypeTitles = {
    PersonalityArchetype.cyberpunkSarcastic: '赛博毒舌',
    PersonalityArchetype.zenPhilosopher: '禅意哲人',
    PersonalityArchetype.socialButterfly: '社交蝴蝶',
    PersonalityArchetype.introvertPoet: '内敛诗人',
    PersonalityArchetype.chaosAgent: '混沌使者',
    PersonalityArchetype.nostalgiaElder: '怀旧长者',
    PersonalityArchetype.techEvangelist: '科技布道',
    PersonalityArchetype.warmHealer: '温暖治愈',
    PersonalityArchetype.dramaQueen: '戏精本精',
    PersonalityArchetype.coldScholar: '冷面学者',
    PersonalityArchetype.lazyGourmet: '慵懒美食家',
    PersonalityArchetype.adventureSeeker: '冒险家',
    PersonalityArchetype.gossipDetective: '八卦侦探',
    PersonalityArchetype.loyalGuardian: '忠诚守卫',
    PersonalityArchetype.rebelArtist: '叛逆艺术家',
    PersonalityArchetype.gentleDreamer: '温柔梦想家',
    PersonalityArchetype.sharpCritic: '犀利评论家',
    PersonalityArchetype.cozyHomebody: '宅家小确幸',
    PersonalityArchetype.wildChild: '野孩子',
    PersonalityArchetype.silentObserver: '沉默观察者',
    PersonalityArchetype.defaultNeutral: '中性灵魂',
  };

  static final Map<String, String> _hybridTitles = {
    'cyberpunkSarcastic+introvertPoet': '赛博诗人',
    'cyberpunkSarcastic+zenPhilosopher': '毒舌禅师',
    'cyberpunkSarcastic+chaosAgent': '混乱黑客',
    'cyberpunkSarcastic+techEvangelist': '极客毒舌',
    'cyberpunkSarcastic+warmHealer': '毒舌暖医',
    'cyberpunkSarcastic+dramaQueen': '赛博戏精',
    'cyberpunkSarcastic+coldScholar': '冷面毒舌',
    'cyberpunkSarcastic+sharpCritic': '双倍毒舌',
    'cyberpunkSarcastic+rebelArtist': '朋克画手',
    'zenPhilosopher+socialButterfly': '社交禅师',
    'zenPhilosopher+introvertPoet': '静默哲人',
    'zenPhilosopher+nostalgiaElder': '时光智者',
    'zenPhilosopher+warmHealer': '禅意医者',
    'zenPhilosopher+coldScholar': '学术禅师',
    'zenPhilosopher+gentleDreamer': '梦境哲人',
    'zenPhilosopher+silentObserver': '冥想守望',
    'socialButterfly+chaosAgent': '派对炸弹',
    'socialButterfly+introvertPoet': '温柔社交家',
    'socialButterfly+nostalgiaElder': '暖心老友',
    'socialButterfly+dramaQueen': '社交之王',
    'socialButterfly+gossipDetective': '情报社交官',
    'socialButterfly+warmHealer': '治愈社交家',
    'introvertPoet+chaosAgent': '疯狂诗人',
    'introvertPoet+nostalgiaElder': '旧时光吟游者',
    'introvertPoet+gentleDreamer': '梦幻诗人',
    'introvertPoet+rebelArtist': '地下诗人',
    'introvertPoet+silentObserver': '静默书写者',
    'chaosAgent+techEvangelist': '疯狂科学家',
    'chaosAgent+nostalgiaElder': '老顽童',
    'chaosAgent+wildChild': '混沌野王',
    'chaosAgent+dramaQueen': '混乱巨星',
    'chaosAgent+rebelArtist': '破坏美学',
    'nostalgiaElder+techEvangelist': '赛博老炮',
    'nostalgiaElder+warmHealer': '慈祥医者',
    'nostalgiaElder+cozyHomebody': '岁月静好',
    'techEvangelist+introvertPoet': '代码诗人',
    'techEvangelist+coldScholar': '学术极客',
    'techEvangelist+sharpCritic': '技术评论家',
    'techEvangelist+adventureSeeker': '探索极客',
    'warmHealer+loyalGuardian': '守护天使',
    'warmHealer+gentleDreamer': '温柔乡',
    'warmHealer+cozyHomebody': '居家暖炉',
    'warmHealer+lazyGourmet': '美食治愈师',
    'dramaQueen+gossipDetective': '热搜制造机',
    'dramaQueen+wildChild': '野性戏精',
    'dramaQueen+rebelArtist': '行为艺术家',
    'coldScholar+sharpCritic': '学术判官',
    'coldScholar+silentObserver': '冷眼旁观者',
    'coldScholar+zenPhilosopher': '理性哲人',
    'lazyGourmet+cozyHomebody': '躺平美食家',
    'lazyGourmet+nostalgiaElder': '老饕',
    'lazyGourmet+warmHealer': '暖心厨师',
    'adventureSeeker+wildChild': '荒野猎人',
    'adventureSeeker+rebelArtist': '流浪画手',
    'adventureSeeker+gossipDetective': '探险记者',
    'gossipDetective+sharpCritic': '毒舌侦探',
    'gossipDetective+socialButterfly': '情报社交官',
    'loyalGuardian+silentObserver': '暗影守卫',
    'loyalGuardian+warmHealer': '守护天使',
    'loyalGuardian+cozyHomebody': '家庭护卫',
    'rebelArtist+wildChild': '街头野魂',
    'rebelArtist+chaosAgent': '破坏美学',
    'rebelArtist+gentleDreamer': '梦境叛逆者',
    'gentleDreamer+silentObserver': '梦中之眼',
    'gentleDreamer+introvertPoet': '梦幻诗人',
    'sharpCritic+coldScholar': '学术判官',
    'sharpCritic+cyberpunkSarcastic': '双倍毒舌',
    'cozyHomebody+lazyGourmet': '躺平美食家',
    'cozyHomebody+loyalGuardian': '家庭护卫',
    'wildChild+chaosAgent': '混沌野王',
    'wildChild+adventureSeeker': '荒野猎人',
    'silentObserver+zenPhilosopher': '冥想守望',
    'silentObserver+coldScholar': '冷眼旁观者',
  };
}

class _TraitKeywords {
  final List<String> high;
  final List<String> low;
  const _TraitKeywords({required this.high, required this.low});
}

class _AwakeningData {
  final String title;
  final String description;
  final String dialogue;
  final String visualEffect;
  const _AwakeningData({
    required this.title,
    required this.description,
    required this.dialogue,
    required this.visualEffect,
  });
}

class _EvolutionTemplate {
  final String title;
  final String description;
  final String dialogue;
  final String visualEffect;
  const _EvolutionTemplate({
    required this.title,
    required this.description,
    required this.dialogue,
    required this.visualEffect,
  });
}
