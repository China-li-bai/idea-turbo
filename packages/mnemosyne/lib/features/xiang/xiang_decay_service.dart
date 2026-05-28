import 'dart:math';
import 'package:mnemosyne/features/xiang/xiang_context.dart';
import 'package:mnemosyne/features/xiang/xiang_profile.dart';
import 'package:mnemosyne/features/xiang/xiang_config.dart';

abstract class XiangDecayService {
  XiangProfile computeProfile(
    String memoryId,
    XiangContext context,
    DateTime now,
  );
}

class DefaultXiangDecayService implements XiangDecayService {
  final XiangConfig config;

  DefaultXiangDecayService({this.config = const XiangConfig()});

  @override
  XiangProfile computeProfile(
    String memoryId,
    XiangContext context,
    DateTime now,
  ) {
    final age = now.difference(context.capturedAt);
    final fieldClarity = <String, double>{};
    final blurredTags = <SensoryTag>[];

    if (context.weather != null) {
      fieldClarity['weather'] = _decayClarity(
        age,
        config.weatherDecayHalfLifeDays,
      );
    }
    if (context.temperature != null) {
      fieldClarity['temperature'] = _decayClarity(
        age,
        config.weatherDecayHalfLifeDays * 0.8,
      );
    }
    if (context.activity != null) {
      fieldClarity['activity'] = _decayClarity(
        age,
        config.activityDecayHalfLifeDays,
      );
    }
    if (context.location != null) {
      fieldClarity['location'] = _decayClarity(
        age,
        config.locationDecayHalfLifeDays,
      );
    }
    if (context.ambientMood != null) {
      fieldClarity['ambientMood'] = _decayClarity(
        age,
        config.ambientMoodDecayHalfLifeDays,
      );
    }
    if (context.innerState != null) {
      fieldClarity['innerState'] = _decayClarity(
        age,
        config.innerStateDecayHalfLifeDays,
      );
    }
    if (context.relationshipState != null) {
      fieldClarity['relationshipState'] = _decayClarity(
        age,
        config.relationshipStateDecayHalfLifeDays,
      );
    }
    if (context.eventShape != null) {
      fieldClarity['eventShape'] = _decayClarity(
        age,
        config.eventShapeDecayHalfLifeDays,
      );
    }
    if (context.changeSignal != null) {
      fieldClarity['changeSignal'] = _decayClarity(
        age,
        config.changeSignalDecayHalfLifeDays,
      );
    }

    for (final tag in context.sensoryTags) {
      final halfLife = config.decayHalfLifeFor(tag.category);
      final clarity = _decayClarity(age, halfLife);
      blurredTags.add(tag.copyWith(intensity: tag.intensity * clarity));
    }
    for (final cue in context.recallCues) {
      final clarity = _decayClarity(age, config.recallCueDecayHalfLifeDays);
      blurredTags.add(
        cue.copyWith(
          category: cue.category == 'recallCue' ? cue.category : 'recallCue',
          intensity: cue.intensity * clarity,
        ),
      );
    }

    final overallClarity = fieldClarity.isEmpty
        ? _decayClarity(age, config.sensoryTagDecayHalfLifeDays)
        : fieldClarity.values.reduce((a, b) => a + b) / fieldClarity.length;

    return XiangProfile(
      memoryId: memoryId,
      originalContext: context,
      age: age,
      overallClarity: overallClarity,
      fieldClarity: fieldClarity,
      blurredTags: blurredTags,
    );
  }

  double _decayClarity(Duration age, double halfLifeDays) {
    final ageDays = age.inSeconds / 86400.0;
    return exp(-0.693 * ageDays / halfLifeDays);
  }
}
