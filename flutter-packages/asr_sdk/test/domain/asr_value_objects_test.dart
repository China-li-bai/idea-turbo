import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AsrLanguage', () {
    test('codes match sherpa-onnx expectations', () {
      expect(AsrLanguage.auto.code, 'auto');
      expect(AsrLanguage.zh.code, 'zh');
      expect(AsrLanguage.en.code, 'en');
      expect(AsrLanguage.yue.code, 'yue');
      expect(AsrLanguage.ja.code, 'ja');
      expect(AsrLanguage.ko.code, 'ko');
    });

    test('toString returns code', () {
      expect(AsrLanguage.zh.toString(), 'zh');
    });
  });

  group('AsrModelConfig', () {
    test('supportsLanguage returns true for listed languages', () {
      const config = AsrModelRegistry.senseVoiceSmallInt8;
      expect(config.supportsLanguage(AsrLanguage.zh), isTrue);
      expect(config.supportsLanguage(AsrLanguage.en), isTrue);
      expect(config.supportsLanguage(AsrLanguage.yue), isTrue);
    });

    test('supportsLanguage returns false for unlisted languages', () {
      const config = AsrModelRegistry.moonshineBaseV2;
      expect(config.supportsLanguage(AsrLanguage.en), isTrue);
      expect(config.supportsLanguage(AsrLanguage.zh), isFalse);
    });

    test('equality is by id', () {
      const a = AsrModelRegistry.senseVoiceSmallInt8;
      const b = AsrModelRegistry.senseVoiceSmallInt8;
      expect(a == b, isTrue);
      expect(a.hashCode, b.hashCode);
    });
  });

  group('TranscriptionRequest', () {
    test('isAutoDetect is true when language is null', () {
      const request = TranscriptionRequest(audioFilePath: '/tmp/a.wav');
      expect(request.isAutoDetect, isTrue);
    });

    test('isAutoDetect is true when language is auto', () {
      const request = TranscriptionRequest(
        audioFilePath: '/tmp/a.wav',
        language: AsrLanguage.auto,
      );
      expect(request.isAutoDetect, isTrue);
    });

    test('isAutoDetect is false for specific language', () {
      const request = TranscriptionRequest(
        audioFilePath: '/tmp/a.wav',
        language: AsrLanguage.zh,
      );
      expect(request.isAutoDetect, isFalse);
    });
  });

  group('TranscriptionResult', () {
    test('isEmpty is true for blank text', () {
      const result = TranscriptionResult(
        text: '   ',
        segments: [],
        processingTime: Duration.zero,
        detectedLanguage: AsrLanguage.auto,
      );
      expect(result.isEmpty, isTrue);
    });

    test('isEmpty is false for non-blank text', () {
      const result = TranscriptionResult(
        text: '你好',
        segments: [],
        processingTime: Duration.zero,
        detectedLanguage: AsrLanguage.zh,
      );
      expect(result.isEmpty, isFalse);
    });
  });

  group('TranscriptionChunk', () {
    test('partial chunk has no committed text', () {
      const chunk = TranscriptionChunk(partialText: 'hello');
      expect(chunk.committedText, isNull);
      expect(chunk.isEndpoint, isFalse);
    });

    test('endpoint chunk carries committed text', () {
      const chunk = TranscriptionChunk(
        partialText: 'hello world',
        committedText: 'hello world',
        isEndpoint: true,
      );
      expect(chunk.committedText, 'hello world');
      expect(chunk.isEndpoint, isTrue);
    });
  });
}
