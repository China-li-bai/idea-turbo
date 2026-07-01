import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AsrModelRegistry', () {
    test('all contains curated defaults', () {
      expect(AsrModelRegistry.all, contains(AsrModelRegistry.senseVoiceSmallInt8));
      expect(AsrModelRegistry.all, contains(AsrModelRegistry.moonshineBaseV2));
      expect(AsrModelRegistry.all.length, greaterThanOrEqualTo(2));
    });

    test('findById returns model for known id', () {
      final model = AsrModelRegistry.findById('sensevoice-small-int8');
      expect(model, isNotNull);
      expect(model!.type, AsrModelType.senseVoice);
      expect(model.mode, AsrModelMode.offline);
    });

    test('findById returns null for unknown id', () {
      expect(AsrModelRegistry.findById('nonexistent'), isNull);
    });

    test('forLanguage returns Chinese-capable models for zh', () {
      final models = AsrModelRegistry.forLanguage(AsrLanguage.zh);
      expect(models, contains(AsrModelRegistry.senseVoiceSmallInt8));
      // Moonshine is English-only, should NOT be in the zh list.
      expect(models, isNot(contains(AsrModelRegistry.moonshineBaseV2)));
    });

    test('forLanguage returns English-capable models for en', () {
      final models = AsrModelRegistry.forLanguage(AsrLanguage.en);
      expect(models, contains(AsrModelRegistry.senseVoiceSmallInt8));
      expect(models, contains(AsrModelRegistry.moonshineBaseV2));
    });

    test('defaultForDeviceTier returns SenseVoice for any tier', () {
      // SenseVoice int8 is the universal default; tier only affects whether
      // the optional Moonshine streaming model is offered.
      expect(
        AsrModelRegistry.defaultForDeviceTier(1),
        AsrModelRegistry.senseVoiceSmallInt8,
      );
      expect(
        AsrModelRegistry.defaultForDeviceTier(3),
        AsrModelRegistry.senseVoiceSmallInt8,
      );
    });

    test('senseVoiceSmallInt8 supports all product languages', () {
      const m = AsrModelRegistry.senseVoiceSmallInt8;
      for (final lang in [
        AsrLanguage.zh,
        AsrLanguage.en,
        AsrLanguage.yue,
        AsrLanguage.ja,
        AsrLanguage.ko,
      ]) {
        expect(m.supportsLanguage(lang), isTrue, reason: 'should support $lang');
      }
    });

    test('moonshineBaseV2 is streaming mode', () {
      expect(
        AsrModelRegistry.moonshineBaseV2.mode,
        AsrModelMode.streaming,
      );
    });
  });
}
