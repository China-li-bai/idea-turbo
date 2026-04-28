import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/xiang/xiang.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/core/constants.dart';

void main() {
  group('SensoryTag', () {
    test('should serialize and deserialize', () {
      final tag = SensoryTag(category: 'weather', value: 'rainy', intensity: 0.8);
      final json = tag.toJson();
      final restored = SensoryTag.fromJson(json);
      expect(restored.category, equals('weather'));
      expect(restored.value, equals('rainy'));
      expect(restored.intensity, equals(0.8));
    });

    test('should copy with new values', () {
      final tag = SensoryTag(category: 'mood', value: 'cozy');
      final copied = tag.copyWith(intensity: 0.5);
      expect(copied.category, equals('mood'));
      expect(copied.intensity, equals(0.5));
    });
  });

  group('XiangContext', () {
    test('should capture all fields', () {
      final ctx = XiangContext(
        weather: 'rainy',
        temperature: 'cold',
        activity: 'working',
        location: 'home',
        ambientMood: 'cozy',
        sensoryTags: [
          SensoryTag(category: 'sound', value: 'rain_drops', intensity: 0.7),
        ],
        capturedAt: DateTime(2026, 1, 15, 20),
      );

      expect(ctx.weather, equals('rainy'));
      expect(ctx.temperature, equals('cold'));
      expect(ctx.activity, equals('working'));
      expect(ctx.location, equals('home'));
      expect(ctx.ambientMood, equals('cozy'));
      expect(ctx.sensoryTags.length, equals(1));
    });

    test('should round-trip through JSON', () {
      final ctx = XiangContext(
        weather: 'sunny',
        activity: 'exercising',
        location: 'park',
        sensoryTags: [
          SensoryTag(category: 'scent', value: 'grass', intensity: 0.6),
        ],
        capturedAt: DateTime(2026, 3, 20, 10),
      );

      final json = ctx.toJson();
      final restored = XiangContext.fromJson(json);

      expect(restored.weather, equals('sunny'));
      expect(restored.activity, equals('exercising'));
      expect(restored.location, equals('park'));
      expect(restored.sensoryTags.length, equals(1));
      expect(restored.sensoryTags[0].value, equals('grass'));
    });

    test('should inject and extract from memory metadata', () {
      final ctx = XiangContext(
        weather: 'cloudy',
        activity: 'studying',
        capturedAt: DateTime(2026, 4, 1),
      );

      final memory = MemoryItem(
        id: 'test-1',
        content: 'Studying for exam',
        metadata: {'existing': 'data'},
      );

      final updatedMetadata = XiangContext.injectIntoMetadata(memory.metadata, ctx);
      final extracted = XiangContext.fromMemoryMetadata(updatedMetadata);

      expect(extracted, isNotNull);
      expect(extracted!.weather, equals('cloudy'));
      expect(extracted.activity, equals('studying'));
      expect(updatedMetadata['existing'], equals('data'));
    });

    test('should return null when no xiang data in metadata', () {
      final result = XiangContext.fromMemoryMetadata(null);
      expect(result, isNull);

      final result2 = XiangContext.fromMemoryMetadata({'other': 'data'});
      expect(result2, isNull);
    });

    test('allValues should collect all non-null values', () {
      final ctx = XiangContext(
        weather: 'rainy',
        activity: 'working',
        sensoryTags: [
          SensoryTag(category: 'sound', value: 'thunder'),
        ],
        capturedAt: DateTime(2026, 1, 1),
      );

      expect(ctx.allValues, containsAll(['rainy', 'working', 'thunder']));
    });
  });

  group('XiangDecayService', () {
    test('should compute profile with high clarity for recent memories', () {
      final service = DefaultXiangDecayService();
      final now = DateTime(2026, 4, 28, 12);
      final ctx = XiangContext(
        weather: 'sunny',
        activity: 'working',
        location: 'office',
        capturedAt: now.subtract(const Duration(hours: 1)),
      );

      final profile = service.computeProfile('mem-1', ctx, now);

      expect(profile.overallClarity, greaterThan(0.9));
      expect(profile.clarityFor('weather'), greaterThan(0.9));
      expect(profile.clarityFor('activity'), greaterThan(0.9));
      expect(profile.isVivid, isTrue);
    });

    test('should compute profile with low clarity for old memories', () {
      final service = DefaultXiangDecayService();
      final now = DateTime(2026, 4, 28, 12);
      final ctx = XiangContext(
        weather: 'rainy',
        activity: 'relaxing',
        capturedAt: now.subtract(const Duration(days: 60)),
      );

      final profile = service.computeProfile('mem-2', ctx, now);

      expect(profile.overallClarity, lessThan(0.5));
      expect(profile.isFuzzy, isTrue);
    });

    test('weather should decay faster than location', () {
      final service = DefaultXiangDecayService();
      final now = DateTime(2026, 4, 28, 12);
      final ctx = XiangContext(
        weather: 'cloudy',
        location: 'home',
        capturedAt: now.subtract(const Duration(days: 10)),
      );

      final profile = service.computeProfile('mem-3', ctx, now);

      expect(profile.clarityFor('location'), greaterThan(profile.clarityFor('weather')));
    });
  });

  group('XiangMatcherService', () {
    late DefaultXiangMatcherService matcher;
    late DefaultXiangDecayService decayService;

    setUp(() {
      matcher = DefaultXiangMatcherService();
      decayService = DefaultXiangDecayService();
    });

    test('should score identical contexts highest', () {
      final now = DateTime(2026, 4, 28);
      final ctx = XiangContext(
        weather: 'rainy',
        activity: 'working',
        location: 'home',
        ambientMood: 'peaceful',
        capturedAt: now,
      );

      final profile = decayService.computeProfile('mem-1', ctx, now);
      final score = matcher.matchScore(profile, ctx);

      expect(score, closeTo(1.0, 0.01));
    });

    test('should score similar weather higher than dissimilar', () {
      final now = DateTime(2026, 4, 28);
      final storedCtx = XiangContext(
        weather: 'rainy',
        capturedAt: now,
      );

      final profile = decayService.computeProfile('mem-1', storedCtx, now);

      final cloudyCtx = XiangContext(weather: 'cloudy', capturedAt: now);
      final sunnyCtx = XiangContext(weather: 'sunny', capturedAt: now);

      final cloudyScore = matcher.matchScore(profile, cloudyCtx);
      final sunnyScore = matcher.matchScore(profile, sunnyCtx);

      expect(cloudyScore, greaterThan(sunnyScore));
    });

    test('should score similar activities higher', () {
      final now = DateTime(2026, 4, 28);
      final storedCtx = XiangContext(
        activity: 'working',
        capturedAt: now,
      );

      final profile = decayService.computeProfile('mem-1', storedCtx, now);

      final codingCtx = XiangContext(activity: 'coding', capturedAt: now);
      final exercisingCtx = XiangContext(activity: 'exercising', capturedAt: now);

      final codingScore = matcher.matchScore(profile, codingCtx);
      final exercisingScore = matcher.matchScore(profile, exercisingCtx);

      expect(codingScore, greaterThan(exercisingScore));
    });

    test('should apply fuzziness boost for old memories', () {
      final now = DateTime(2026, 4, 28);
      final recentCtx = XiangContext(
        weather: 'cloudy',
        capturedAt: now.subtract(const Duration(hours: 1)),
      );
      final oldCtx = XiangContext(
        weather: 'cloudy',
        capturedAt: now.subtract(const Duration(days: 30)),
      );

      final currentCtx = XiangContext(weather: 'rainy', capturedAt: now);

      final recentProfile = decayService.computeProfile('mem-1', recentCtx, now);
      final oldProfile = decayService.computeProfile('mem-2', oldCtx, now);

      final recentScore = matcher.matchScore(recentProfile, currentCtx);
      final oldScore = matcher.matchScore(oldProfile, currentCtx);

      expect(oldScore, greaterThan(recentScore));
    });

    test('should support Chinese values', () {
      final now = DateTime(2026, 4, 28);
      final storedCtx = XiangContext(
        weather: '雨',
        activity: '工作',
        location: '家',
        capturedAt: now,
      );

      final profile = decayService.computeProfile('mem-1', storedCtx, now);

      final currentCtx = XiangContext(
        weather: '多云',
        activity: '写代码',
        location: '家',
        capturedAt: now,
      );

      final score = matcher.matchScore(profile, currentCtx);
      expect(score, greaterThan(0.3));
    });

    test('should return 0 when no overlapping fields', () {
      final now = DateTime(2026, 4, 28);
      final storedCtx = XiangContext(
        weather: 'sunny',
        capturedAt: now,
      );

      final profile = decayService.computeProfile('mem-1', storedCtx, now);

      final currentCtx = XiangContext(
        activity: 'working',
        capturedAt: now,
      );

      final score = matcher.matchScore(profile, currentCtx);
      expect(score, equals(0.0));
    });
  });

  group('XiangSceneTriggerService', () {
    late DefaultXiangSceneTriggerService trigger;
    late DateTime now;

    setUp(() {
      trigger = DefaultXiangSceneTriggerService();
      now = DateTime(2026, 4, 28, 20);
    });

    test('should trigger scene when context strongly resonates', () {
      final storedCtx = XiangContext(
        weather: 'rainy',
        activity: 'working',
        location: 'home',
        ambientMood: 'peaceful',
        capturedAt: now.subtract(const Duration(hours: 2)),
      );

      final currentCtx = XiangContext(
        weather: 'rainy',
        activity: 'working',
        location: 'home',
        ambientMood: 'peaceful',
        capturedAt: now,
      );

      final result = trigger.evaluate(
        'mem-1',
        storedCtx,
        currentCtx,
        null,
        null,
        now,
      );

      expect(result.isSceneTriggered, isTrue);
      expect(result.boost, greaterThan(1.0));
    });

    test('should not trigger scene for weak resonance', () {
      final storedCtx = XiangContext(
        weather: 'sunny',
        activity: 'exercising',
        capturedAt: now.subtract(const Duration(hours: 2)),
      );

      final currentCtx = XiangContext(
        weather: 'rainy',
        activity: 'working',
        capturedAt: now,
      );

      final result = trigger.evaluate(
        'mem-2',
        storedCtx,
        currentCtx,
        null,
        null,
        now,
      );

      expect(result.isSceneTriggered, isFalse);
    });

    test('should fall back to encoding context when no xiang context', () {
      final storedEncoding = EncodingContext(
        userMood: UserMood.happy,
        socialContext: SocialContext.withFriends,
        timeOfDay: TimeOfDay.evening,
      );

      final currentEncoding = EncodingContext(
        userMood: UserMood.happy,
        socialContext: SocialContext.withFriends,
        timeOfDay: TimeOfDay.evening,
      );

      final result = trigger.evaluate(
        'mem-3',
        null,
        XiangContext(capturedAt: now),
        storedEncoding,
        currentEncoding,
        now,
      );

      expect(result.resonanceScore, greaterThan(0.5));
    });

    test('should return no resonance when both contexts are null', () {
      final result = trigger.evaluate(
        'mem-4',
        null,
        XiangContext(capturedAt: now),
        null,
        null,
        now,
      );

      expect(result.resonanceScore, equals(0.0));
      expect(result.isSceneTriggered, isFalse);
    });
  });

  group('XiangPlugin', () {
    late XiangPlugin plugin;

    setUp(() {
      plugin = XiangPlugin();
    });

    test('should capture and inject context into memory', () {
      final ctx = plugin.captureContext(
        weather: 'rainy',
        activity: 'coding',
        location: 'office',
      );

      final memory = MemoryItem(
        id: 'test-1',
        content: 'Fixed a critical bug',
      );

      final enriched = plugin.injectContext(memory, ctx);
      final extracted = plugin.extractContext(enriched);

      expect(extracted, isNotNull);
      expect(extracted!.weather, equals('rainy'));
      expect(extracted.activity, equals('coding'));
      expect(extracted.location, equals('office'));
    });

    test('should rescore search results with resonance boost', () {
      final now = DateTime(2026, 4, 28, 20);

      final storedCtx = XiangContext(
        weather: 'rainy',
        activity: 'coding',
        location: 'office',
        ambientMood: 'tense',
        capturedAt: now.subtract(const Duration(hours: 3)),
      );

      final memory = MemoryItem(
        id: 'mem-1',
        content: 'Fixed critical bug in production',
        importance: 0.8,
        metadata: XiangContext.injectIntoMetadata({}, storedCtx),
      );

      final currentCtx = XiangContext(
        weather: 'rainy',
        activity: 'coding',
        location: 'office',
        ambientMood: 'tense',
        capturedAt: now,
      );

      final results = [
        MemorySearchResult(
          memory: memory,
          totalScore: 0.5,
          semanticScore: 0.3,
          keywordScore: 0.2,
        ),
      ];

      final rescored = plugin.rescore(results, null, currentCtx, now);

      expect(rescored.length, equals(1));
      expect(rescored[0].totalScore, greaterThan(0.5));
      expect(rescored[0].contextMatchScore, greaterThan(0.5));
    });

    test('should not modify results when no current context', () {
      final now = DateTime(2026, 4, 28);
      final memory = MemoryItem(id: 'mem-1', content: 'test');
      final results = [
        MemorySearchResult(memory: memory, totalScore: 0.5),
      ];

      final rescored = plugin.rescore(results, null, null, now);

      expect(rescored.length, equals(1));
      expect(rescored[0].totalScore, equals(0.5));
    });

    test('should compute profile for a memory', () {
      final now = DateTime(2026, 4, 28);
      final ctx = XiangContext(
        weather: 'sunny',
        activity: 'walking',
        location: 'park',
        capturedAt: now.subtract(const Duration(days: 5)),
      );

      final profile = plugin.computeProfile('mem-1', ctx, now);

      expect(profile.overallClarity, greaterThan(0.0));
      expect(profile.overallClarity, lessThan(1.0));
      expect(profile.memoryId, equals('mem-1'));
    });

    test('should allow custom service injection', () {
      final customConfig = XiangConfig(
        weatherDecayHalfLifeDays: 3.0,
        maxResonanceBoost: 3.0,
        sceneTriggerThreshold: 0.4,
      );

      final customPlugin = XiangPlugin(config: customConfig);

      expect(customPlugin.config.weatherDecayHalfLifeDays, equals(3.0));
      expect(customPlugin.config.maxResonanceBoost, equals(3.0));
    });
  });

  group('XiangContext + EncodingContext integration', () {
    test('should bridge xiang and encoding context in scene trigger', () {
      final now = DateTime(2026, 4, 28, 20);
      final trigger = DefaultXiangSceneTriggerService();

      final storedXiang = XiangContext(
        weather: 'rainy',
        activity: 'working',
        location: 'home',
        ambientMood: 'peaceful',
        capturedAt: now.subtract(const Duration(hours: 2)),
      );

      final storedEncoding = EncodingContext(
        userMood: UserMood.happy,
        timeOfDay: TimeOfDay.evening,
        socialContext: SocialContext.alone,
      );

      final currentXiang = XiangContext(
        weather: 'rainy',
        activity: 'working',
        location: 'home',
        ambientMood: 'peaceful',
        capturedAt: now,
      );

      final currentEncoding = EncodingContext(
        userMood: UserMood.happy,
        timeOfDay: TimeOfDay.evening,
        socialContext: SocialContext.alone,
      );

      final result = trigger.evaluate(
        'mem-1',
        storedXiang,
        currentXiang,
        storedEncoding,
        currentEncoding,
        now,
      );

      expect(result.isSceneTriggered, isTrue);
      expect(result.dimensionScores.containsKey('xiang'), isTrue);
      expect(result.dimensionScores.containsKey('encoding'), isTrue);
      expect(result.boost, greaterThan(1.5));
    });
  });
}
