import 'package:mnemosyne/features/xiang/xiang_context.dart';
import 'package:mnemosyne/features/xiang/xiang_config.dart';
import 'package:mnemosyne/features/xiang/xiang_profile.dart';
import 'package:mnemosyne/features/xiang/xiang_capture_service.dart';
import 'package:mnemosyne/features/xiang/xiang_decay_service.dart';
import 'package:mnemosyne/features/xiang/xiang_matcher_service.dart';
import 'package:mnemosyne/features/xiang/xiang_scene_trigger_service.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/services/retrieval_engine.dart';

abstract class MemoryScoringPlugin {
  String get name;

  List<MemorySearchResult> rescore(
    List<MemorySearchResult> results,
    EncodingContext? currentEncodingContext,
    XiangContext? currentXiangContext,
    DateTime now,
  );
}

class XiangPlugin implements MemoryScoringPlugin {
  @override
  final String name = 'xiang';

  final XiangConfig config;
  final XiangCaptureService captureService;
  final XiangDecayService decayService;
  final XiangMatcherService matcherService;
  final XiangSceneTriggerService sceneTriggerService;

  XiangPlugin({
    this.config = const XiangConfig(),
    XiangCaptureService? captureService,
    XiangDecayService? decayService,
    XiangMatcherService? matcherService,
    XiangSceneTriggerService? sceneTriggerService,
  })  : captureService = captureService ?? DefaultXiangCaptureService(),
        decayService = decayService ?? DefaultXiangDecayService(config: config),
        matcherService = matcherService ?? DefaultXiangMatcherService(config: config),
        sceneTriggerService = sceneTriggerService ??
            DefaultXiangSceneTriggerService(
              config: config,
              decayService: decayService ?? DefaultXiangDecayService(config: config),
              matcherService: matcherService ?? DefaultXiangMatcherService(config: config),
            );

  XiangContext captureContext({
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    List<SensoryTag>? sensoryTags,
  }) {
    return captureService.capture(
      weather: weather,
      temperature: temperature,
      activity: activity,
      location: location,
      ambientMood: ambientMood,
      sensoryTags: sensoryTags,
    );
  }

  MemoryItem injectContext(MemoryItem memory, XiangContext context) {
    final updatedMetadata = XiangContext.injectIntoMetadata(
      memory.metadata,
      context,
    );
    return memory.copyWith(metadata: updatedMetadata);
  }

  XiangContext? extractContext(MemoryItem memory) {
    return XiangContext.fromMemoryMetadata(memory.metadata);
  }

  XiangProfile computeProfile(String memoryId, XiangContext context, DateTime now) {
    return decayService.computeProfile(memoryId, context, now);
  }

  ResonanceResult evaluateResonance({
    required String memoryId,
    required XiangContext currentContext,
    EncodingContext? currentEncodingContext,
    required MemoryItem memory,
    required DateTime now,
  }) {
    final storedXiang = extractContext(memory);
    return sceneTriggerService.evaluate(
      memoryId,
      storedXiang,
      currentContext,
      memory.encodingContext,
      currentEncodingContext,
      now,
    );
  }

  @override
  List<MemorySearchResult> rescore(
    List<MemorySearchResult> results,
    EncodingContext? currentEncodingContext,
    XiangContext? currentXiangContext,
    DateTime now,
  ) {
    if (currentXiangContext == null && currentEncodingContext == null) {
      return results;
    }

    final rescored = <MemorySearchResult>[];

    for (final result in results) {
      if (currentXiangContext != null) {
        final resonance = evaluateResonance(
          memoryId: result.memory.id,
          currentContext: currentXiangContext,
          currentEncodingContext: currentEncodingContext,
          memory: result.memory,
          now: now,
        );

        rescored.add(result.copyWith(
          totalScore: result.totalScore * resonance.boost,
          contextMatchScore: resonance.resonanceScore,
        ));
      } else if (currentEncodingContext != null) {
        final encodingScore = result.memory.encodingContext
                ?.calculateMatchScore(currentEncodingContext) ??
            0.0;

        final boost = encodingScore >= config.sceneTriggerThreshold
            ? 1.0 + (encodingScore * (config.maxResonanceBoost - 1.0))
            : 1.0 + (encodingScore * 0.2);

        rescored.add(result.copyWith(
          totalScore: result.totalScore * boost,
          contextMatchScore: encodingScore,
        ));
      }
    }

    rescored.sort((a, b) => b.totalScore.compareTo(a.totalScore));
    return rescored;
  }
}

class XiangRetrievalEngine {
  final RetrievalEngine _inner;
  final XiangPlugin _plugin;

  XiangRetrievalEngine({
    required RetrievalEngine inner,
    required XiangPlugin plugin,
  })  : _inner = inner,
        _plugin = plugin;

  Future<List<MemorySearchResult>> retrieve({
    required String query,
    required List<double> queryEmbedding,
    EncodingContext? currentContext,
    XiangContext? currentXiangContext,
    DateTime? now,
    int limit = 10,
  }) async {
    now ??= DateTime.now();

    final overRetrievedLimit = (limit * _plugin.config.overRetrievalFactor).ceil();

    final rawResults = await _inner.retrieve(
      query: query,
      queryEmbedding: queryEmbedding,
      currentContext: currentContext,
      now: now,
      limit: overRetrievedLimit,
    );

    final rescored = _plugin.rescore(
      rawResults,
      currentContext,
      currentXiangContext,
      now,
    );

    return rescored.take(limit).toList();
  }

  RetrievalEngine get innerEngine => _inner;

  XiangPlugin get plugin => _plugin;
}
