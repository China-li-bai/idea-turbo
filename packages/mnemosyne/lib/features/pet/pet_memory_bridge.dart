import 'package:mnemosyne/mnemosyne_class.dart';
import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/xiang/xiang.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/pet_emotional_gating.dart';
import 'package:mnemosyne/features/pet/pet_scene_recall.dart';

class PetMemoryConfig {
  final bool enableEmotionalGating;
  final bool enableSceneRecall;
  final bool enableXiangContext;
  final double defaultImportance;
  final int recentInteractionLimit;
  final int proactiveRecallLimit;

  const PetMemoryConfig({
    this.enableEmotionalGating = true,
    this.enableSceneRecall = true,
    this.enableXiangContext = true,
    this.defaultImportance = 0.5,
    this.recentInteractionLimit = 20,
    this.proactiveRecallLimit = 3,
  });
}

class PetInteraction {
  final String id;
  final String content;
  final PetContext context;
  final DateTime timestamp;
  final String? emotionalTag;
  final double importance;

  const PetInteraction({
    required this.id,
    required this.content,
    required this.context,
    required this.timestamp,
    this.emotionalTag,
    this.importance = 0.5,
  });
}

class PetMemoryBridge {
  final Mnemosyne _mnemosyne;
  final PetMemoryConfig config;
  final PetEmotionalGating _emotionalGating;
  final PetSceneRecall _sceneRecall;
  DateTime? _lastProactiveTime;

  PetMemoryBridge({
    required Mnemosyne mnemosyne,
    this.config = const PetMemoryConfig(),
    PetEmotionalGating? emotionalGating,
    PetSceneRecall? sceneRecall,
  }) : _mnemosyne = mnemosyne,
       _emotionalGating = emotionalGating ?? DefaultPetEmotionalGating(),
       _sceneRecall =
           sceneRecall ?? DefaultPetSceneRecall(xiangPlugin: mnemosyne.xiang);

  Mnemosyne get mnemosyne => _mnemosyne;

  Future<String> rememberInteraction({
    required String content,
    required PetContext petContext,
    MemoryType type = MemoryType.episodic,
    MemorySource source = MemorySource.conversation,
    double? importance,
    List<String>? keywords,
    List<String>? entities,
    List<String>? topics,
    List<double>? embedding,
    String? innerState,
    String? relationshipState,
    String? eventShape,
    String? changeSignal,
    List<SensoryTag>? recallCues,
  }) async {
    double effectiveImportance = importance ?? config.defaultImportance;
    double emotionalValence = petContext.mood.valence;
    String? emotionalTag;

    if (config.enableEmotionalGating) {
      final emotionalResult = _emotionalGating.evaluateEncoding(
        petContext,
        baseImportance: effectiveImportance,
      );
      effectiveImportance = emotionalResult.adjustedImportance;
      emotionalValence = emotionalResult.adjustedEmotionalValence;
      emotionalTag = emotionalResult.emotionalTag;
    }

    Map<String, dynamic> metadata = {
      'petMood': petContext.mood.name,
      'petState': petContext.state.name,
      'timeOfDay': petContext.timeOfDay.name,
      'isWeekend': petContext.isWeekend,
      if (emotionalTag != null) 'emotionalTag': emotionalTag,
    };

    XiangContext? xiangContext;
    if (config.enableXiangContext) {
      final baseXiang = _sceneRecall.petContextToXiang(petContext);
      xiangContext = baseXiang.copyWith(
        innerState: innerState ?? baseXiang.innerState,
        relationshipState: relationshipState ?? baseXiang.relationshipState,
        eventShape: eventShape ?? baseXiang.eventShape,
        changeSignal: changeSignal ?? baseXiang.changeSignal,
        recallCues: recallCues ?? baseXiang.recallCues,
      );
    }

    return await _mnemosyne.remember(
      content: content,
      type: type,
      source: source,
      importance: effectiveImportance,
      emotionalValence: emotionalValence,
      keywords: keywords,
      entities: entities,
      topics: topics,
      embedding: embedding,
      xiangContext: xiangContext,
      weather: config.enableXiangContext ? petContext.weather : null,
      temperature: config.enableXiangContext ? petContext.temperature : null,
      activity: config.enableXiangContext
          ? petContext.activity ?? petContext.activityDescription
          : null,
      location: config.enableXiangContext
          ? petContext.location ?? petContext.locationDescription
          : null,
      ambientMood: config.enableXiangContext ? petContext.ambientMood : null,
      innerState: config.enableXiangContext ? innerState : null,
      relationshipState: config.enableXiangContext ? relationshipState : null,
      eventShape: config.enableXiangContext ? eventShape : null,
      changeSignal: config.enableXiangContext ? changeSignal : null,
      recallCues: config.enableXiangContext ? recallCues : null,
      metadata: metadata,
    );
  }

  Future<List<MemorySearchResult>> recallInteractions({
    required String query,
    required PetContext currentContext,
    List<double>? queryEmbedding,
    int limit = 10,
  }) async {
    XiangContext? xiangContext;
    if (config.enableXiangContext) {
      xiangContext = _sceneRecall.petContextToXiang(currentContext);
    }

    return await _mnemosyne.recall(
      query: query,
      queryEmbedding: queryEmbedding,
      currentXiangContext: xiangContext,
      limit: limit,
    );
  }

  Future<List<ProactiveMemory>> getProactiveMemories({
    required PetContext currentContext,
    String? queryHint,
    List<double>? queryEmbedding,
  }) async {
    if (!config.enableSceneRecall) return [];

    final now = DateTime.now();
    if (_lastProactiveTime != null) {
      final elapsed = now.difference(_lastProactiveTime!);
      if (elapsed < _sceneRecall.sceneConfig.minIntervalBetweenProactive) {
        return [];
      }
    }

    final query = queryHint ?? _generateProactiveQuery(currentContext);
    final results = await _mnemosyne.recall(
      query: query,
      queryEmbedding: queryEmbedding,
      currentXiangContext: _sceneRecall.petContextToXiang(currentContext),
      limit: config.proactiveRecallLimit * 3,
    );

    final proactiveMemories = _sceneRecall.evaluate(results, currentContext);

    if (proactiveMemories.isNotEmpty) {
      _lastProactiveTime = now;
    }

    return proactiveMemories;
  }

  Future<ProactiveMemory?> checkSceneTrigger({
    required PetContext currentContext,
    String? queryHint,
    List<double>? queryEmbedding,
  }) async {
    final memories = await getProactiveMemories(
      currentContext: currentContext,
      queryHint: queryHint,
      queryEmbedding: queryEmbedding,
    );
    return _sceneRecall.findBestTrigger(
      memories
          .map(
            (m) => MemorySearchResult(
              memory: m.memory,
              totalScore: m.sceneScore,
              semanticScore: m.sceneScore,
              keywordScore: 0.0,
              recencyScore: 0.0,
              importanceScore: 0.0,
              contextMatchScore: m.moodCongruency,
            ),
          )
          .toList(),
      currentContext,
    );
  }

  Future<List<MemoryItem>> getRecentInteractions({int? limit}) async {
    return await _mnemosyne.getRecent(
      limit: limit ?? config.recentInteractionLimit,
    );
  }

  Future<List<MemoryItem>> getImportantInteractions({int? limit}) async {
    return await _mnemosyne.getImportant(
      limit: limit ?? config.recentInteractionLimit,
    );
  }

  Future<PetMood> inferMoodFromRecentMemories() async {
    final recent = await _mnemosyne.getRecent(limit: 10);
    if (recent.isEmpty) return PetMood.neutral;

    double totalValence = 0.0;
    double totalArousal = 0.0;
    int count = 0;

    for (final memory in recent) {
      totalValence += memory.emotionalValence;
      final arousal = memory.encodingContext?.arousalLevel ?? 0.4;
      totalArousal += arousal;
      count++;
    }

    final avgValence = totalValence / count;
    final avgArousal = totalArousal / count;

    if (avgValence > 0.3 && avgArousal > 0.6) return PetMood.excited;
    if (avgValence > 0.2) return PetMood.happy;
    if (avgValence < -0.3 && avgArousal > 0.6) return PetMood.anxious;
    if (avgValence < -0.2) return PetMood.sad;
    if (avgArousal < 0.2) return PetMood.sleepy;
    if (avgArousal > 0.5) return PetMood.curious;
    return PetMood.neutral;
  }

  String _generateProactiveQuery(PetContext context) {
    final parts = <String>[];

    if (context.weather != null) parts.add(context.weather!);
    if (context.activity != null) parts.add(context.activity!);
    parts.add(context.activityDescription);
    parts.add(context.timeOfDay.displayName);

    return parts.join(' ');
  }

  Future<void> initialize() async {
    await _mnemosyne.initialize();
  }

  Future<void> close() async {
    await _mnemosyne.close();
  }
}
