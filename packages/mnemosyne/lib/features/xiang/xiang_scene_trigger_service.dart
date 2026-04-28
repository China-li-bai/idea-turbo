import 'package:mnemosyne/features/xiang/xiang_context.dart';
import 'package:mnemosyne/features/xiang/xiang_profile.dart';
import 'package:mnemosyne/features/xiang/xiang_config.dart';
import 'package:mnemosyne/features/xiang/xiang_matcher_service.dart';
import 'package:mnemosyne/features/xiang/xiang_decay_service.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';

abstract class XiangSceneTriggerService {
  ResonanceResult evaluate(
    String memoryId,
    XiangContext? storedContext,
    XiangContext currentContext,
    EncodingContext? storedEncodingContext,
    EncodingContext? currentEncodingContext,
    DateTime now,
  );
}

class DefaultXiangSceneTriggerService implements XiangSceneTriggerService {
  final XiangConfig config;
  final XiangDecayService decayService;
  final XiangMatcherService matcherService;

  DefaultXiangSceneTriggerService({
    this.config = const XiangConfig(),
    XiangDecayService? decayService,
    XiangMatcherService? matcherService,
  })  : decayService = decayService ?? DefaultXiangDecayService(config: config),
        matcherService = matcherService ?? DefaultXiangMatcherService(config: config);

  @override
  ResonanceResult evaluate(
    String memoryId,
    XiangContext? storedContext,
    XiangContext currentContext,
    EncodingContext? storedEncodingContext,
    EncodingContext? currentEncodingContext,
    DateTime now,
  ) {
    if (storedContext == null) {
      return _evaluateEncodingOnly(
        memoryId,
        storedEncodingContext,
        currentEncodingContext,
      );
    }

    final profile = decayService.computeProfile(memoryId, storedContext, now);
    final xiangScore = matcherService.matchScore(profile, currentContext);

    final encodingScore = _encodingContextScore(
      storedEncodingContext,
      currentEncodingContext,
    );

    final dimensionScores = <String, double>{
      'xiang': xiangScore,
      'encoding': encodingScore,
    };

    final combinedScore = xiangScore * (1.0 - config.encodingContextBridgeWeight) +
        encodingScore * config.encodingContextBridgeWeight;

    final triggeredDimensions = <String>[];
    if (xiangScore >= config.resonanceThreshold) {
      triggeredDimensions.add('xiang');
    }
    if (encodingScore >= 0.5) {
      triggeredDimensions.add('encoding');
    }

    final isSceneTriggered = combinedScore >= config.sceneTriggerThreshold;

    final boost = isSceneTriggered
        ? 1.0 + (combinedScore * (config.maxResonanceBoost - 1.0))
        : 1.0 + (combinedScore * 0.3);

    return ResonanceResult(
      memoryId: memoryId,
      resonanceScore: combinedScore,
      boost: boost,
      dimensionScores: dimensionScores,
      triggeredDimensions: triggeredDimensions,
      isSceneTriggered: isSceneTriggered,
    );
  }

  ResonanceResult _evaluateEncodingOnly(
    String memoryId,
    EncodingContext? stored,
    EncodingContext? current,
  ) {
    if (stored == null || current == null) {
      return ResonanceResult.noResonance(memoryId);
    }

    final score = stored.calculateMatchScore(current);
    final isTriggered = score >= config.sceneTriggerThreshold;

    return ResonanceResult(
      memoryId: memoryId,
      resonanceScore: score,
      boost: isTriggered
          ? 1.0 + (score * (config.maxResonanceBoost - 1.0))
          : 1.0 + (score * 0.2),
      dimensionScores: {'encoding': score},
      triggeredDimensions: isTriggered ? ['encoding'] : [],
      isSceneTriggered: isTriggered,
    );
  }

  double _encodingContextScore(
    EncodingContext? stored,
    EncodingContext? current,
  ) {
    if (stored == null || current == null) return 0.0;
    return stored.calculateMatchScore(current);
  }
}
