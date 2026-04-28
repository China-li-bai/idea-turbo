import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/pet_emotional_gating.dart';
import 'package:mnemosyne/features/xiang/xiang_context.dart';
import 'package:mnemosyne/features/xiang/xiang_plugin.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';

class SceneRecallConfig {
  final double sceneTriggerThreshold;
  final double moodCongruencyThreshold;
  final double timeOfDayWeight;
  final double moodWeight;
  final double weatherWeight;
  final double activityWeight;
  final double locationWeight;
  final int maxProactiveMemories;
  final Duration minIntervalBetweenProactive;

  const SceneRecallConfig({
    this.sceneTriggerThreshold = 0.5,
    this.moodCongruencyThreshold = 0.6,
    this.timeOfDayWeight = 0.15,
    this.moodWeight = 0.30,
    this.weatherWeight = 0.20,
    this.activityWeight = 0.20,
    this.locationWeight = 0.15,
    this.maxProactiveMemories = 3,
    this.minIntervalBetweenProactive = const Duration(minutes: 30),
  });
}

class ProactiveMemory {
  final MemoryItem memory;
  final double sceneScore;
  final double moodCongruency;
  final List<String> triggeredDimensions;
  final String recallReason;
  final DateTime triggeredAt;

  const ProactiveMemory({
    required this.memory,
    required this.sceneScore,
    required this.moodCongruency,
    required this.triggeredDimensions,
    required this.recallReason,
    required this.triggeredAt,
  });

  bool get isStrongTrigger => sceneScore >= 0.7 && moodCongruency >= 0.5;
}

abstract class PetSceneRecall {
  SceneRecallConfig get sceneConfig;

  List<ProactiveMemory> evaluate(
    List<MemorySearchResult> candidates,
    PetContext currentContext,
  );

  ProactiveMemory? findBestTrigger(
    List<MemorySearchResult> candidates,
    PetContext currentContext,
  );

  XiangContext petContextToXiang(PetContext context);
}

class DefaultPetSceneRecall implements PetSceneRecall {
  final SceneRecallConfig config;
  final PetEmotionalGating emotionalGating;
  final XiangPlugin? xiangPlugin;

  DefaultPetSceneRecall({
    this.config = const SceneRecallConfig(),
    PetEmotionalGating? emotionalGating,
    this.xiangPlugin,
  }) : emotionalGating = emotionalGating ?? DefaultPetEmotionalGating();

  @override
  SceneRecallConfig get sceneConfig => config;

  @override
  List<ProactiveMemory> evaluate(
    List<MemorySearchResult> candidates,
    PetContext currentContext,
  ) {
    final proactiveMemories = <ProactiveMemory>[];
    final now = DateTime.now();

    for (final result in candidates) {
      final xiangCtx = XiangContext.fromMemoryMetadata(result.memory.metadata);
      final encodingMood = _extractEncodingMood(result.memory);

      final sceneScore = _computeSceneScore(
        xiangCtx,
        currentContext,
        result.memory,
      );

      final moodCongruency = emotionalGating.computeMoodCongruency(
        currentContext.mood,
        encodingMood,
      );

      final combinedScore = sceneScore * (1.0 - config.moodWeight) +
          moodCongruency * config.moodWeight;

      if (combinedScore < config.sceneTriggerThreshold) continue;

      final triggeredDims = _identifyTriggeredDimensions(xiangCtx, currentContext);
      final reason = _generateRecallReason(triggeredDims, currentContext, encodingMood);

      proactiveMemories.add(ProactiveMemory(
        memory: result.memory,
        sceneScore: combinedScore,
        moodCongruency: moodCongruency,
        triggeredDimensions: triggeredDims,
        recallReason: reason,
        triggeredAt: now,
      ));
    }

    proactiveMemories.sort((a, b) => b.sceneScore.compareTo(a.sceneScore));
    return proactiveMemories.take(config.maxProactiveMemories).toList();
  }

  @override
  ProactiveMemory? findBestTrigger(
    List<MemorySearchResult> candidates,
    PetContext currentContext,
  ) {
    final results = evaluate(candidates, currentContext);
    return results.isNotEmpty ? results.first : null;
  }

  @override
  XiangContext petContextToXiang(PetContext context) {
    return XiangContext(
      weather: context.weather,
      temperature: context.temperature,
      activity: context.activity ?? context.activityDescription,
      location: context.location ?? context.locationDescription,
      ambientMood: context.ambientMood,
      sensoryTags: [
        SensoryTag(category: 'petMood', value: context.mood.name, intensity: context.mood.arousalLevel),
        SensoryTag(category: 'timeOfDay', value: context.timeOfDay.name),
        if (context.isWeekend)
          const SensoryTag(category: 'dayType', value: 'weekend'),
      ],
      capturedAt: context.capturedAt,
    );
  }

  double _computeSceneScore(
    XiangContext? storedXiang,
    PetContext currentContext,
    MemoryItem memory,
  ) {
    final plugin = xiangPlugin;
    if (plugin != null && storedXiang != null) {
      final currentXiang = petContextToXiang(currentContext);
      final profile = plugin.computeProfile(memory.id, storedXiang, DateTime.now());
      return plugin.matcherService.matchScore(profile, currentXiang);
    }

    double score = 0.0;
    double totalWeight = 0.0;

    final encodingCtx = memory.encodingContext;
    if (encodingCtx != null) {
      final timeScore = _timeOfDayMatch(encodingCtx, currentContext);
      score += timeScore * config.timeOfDayWeight;
      totalWeight += config.timeOfDayWeight;
    }

    if (storedXiang != null) {
      if (storedXiang.weather != null && currentContext.weather != null) {
        score += (storedXiang.weather == currentContext.weather ? 1.0 : 0.3) * config.weatherWeight;
        totalWeight += config.weatherWeight;
      }

      if (storedXiang.activity != null) {
        final currentActivity = currentContext.activity ?? currentContext.activityDescription;
        score += (storedXiang.activity == currentActivity ? 1.0 : 0.2) * config.activityWeight;
        totalWeight += config.activityWeight;
      }

      if (storedXiang.location != null) {
        final currentLocation = currentContext.location ?? currentContext.locationDescription;
        score += (storedXiang.location == currentLocation ? 1.0 : 0.2) * config.locationWeight;
        totalWeight += config.locationWeight;
      }
    }

    return totalWeight > 0 ? (score / totalWeight).clamp(0.0, 1.0) : 0.0;
  }

  double _timeOfDayMatch(dynamic encodingContext, PetContext currentContext) {
    final hour = currentContext.capturedAt.hour;
    return 1.0 - (hour / 24.0 * 0.5);
  }

  PetMood _extractEncodingMood(MemoryItem memory) {
    final metadata = memory.metadata;
    if (metadata == null) return PetMood.neutral;

    final moodStr = metadata['petMood'] as String?;
    if (moodStr != null) return PetMood.fromString(moodStr);

    if (memory.emotionalValence > 0.3) return PetMood.happy;
    if (memory.emotionalValence < -0.3) return PetMood.sad;
    return PetMood.neutral;
  }

  List<String> _identifyTriggeredDimensions(XiangContext? stored, PetContext current) {
    final dims = <String>[];

    if (stored != null) {
      if (stored.weather != null && current.weather != null && stored.weather == current.weather) {
        dims.add('weather');
      }
      if (stored.activity != null) {
        final currentActivity = current.activity ?? current.activityDescription;
        if (stored.activity == currentActivity) dims.add('activity');
      }
      if (stored.location != null) {
        final currentLocation = current.location ?? current.locationDescription;
        if (stored.location == currentLocation) dims.add('location');
      }
      if (stored.ambientMood != null && current.ambientMood != null && stored.ambientMood == current.ambientMood) {
        dims.add('ambientMood');
      }
    }

    dims.add('timeOfDay');
    return dims;
  }

  String _generateRecallReason(
    List<String> dimensions,
    PetContext currentContext,
    PetMood encodingMood,
  ) {
    if (dimensions.isEmpty) return '突然想起了什么...';

    final reasons = <String>[];
    for (final dim in dimensions) {
      switch (dim) {
        case 'weather':
          reasons.add('现在的天气让我想起了');
        case 'activity':
          reasons.add('正在${currentContext.activityDescription}，让我想起了');
        case 'location':
          reasons.add('在这里让我想起了');
        case 'ambientMood':
          reasons.add('这种氛围让我想起了');
        case 'timeOfDay':
          reasons.add('这个时间让我想起了');
      }
    }

    final moodCongruency = emotionalGating.computeMoodCongruency(currentContext.mood, encodingMood);
    if (moodCongruency > 0.7) {
      reasons.add('现在的心情也和那时很像');
    }

    return reasons.take(2).join('，');
  }
}
