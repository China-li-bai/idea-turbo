import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late FakeAsrEngine engine;

  setUp(() {
    engine = FakeAsrEngine();
  });

  tearDown(() async {
    await engine.dispose();
  });

  group('FakeAsrEngine lifecycle', () {
    test('isInitialized is false before initialize', () {
      expect(engine.isInitialized, isFalse);
      expect(engine.activeModel, isNull);
    });

    test('initialize sets active model and flag', () async {
      await engine.initialize(model: AsrModelRegistry.senseVoiceSmallInt8);
      expect(engine.isInitialized, isTrue);
      expect(engine.activeModel, AsrModelRegistry.senseVoiceSmallInt8);
    });

    test('dispose resets state', () async {
      await engine.initialize(model: AsrModelRegistry.senseVoiceSmallInt8);
      await engine.dispose();
      expect(engine.isInitialized, isFalse);
      expect(engine.activeModel, isNull);
    });
  });

  group('FakeAsrEngine transcribeFile', () {
    test('throws when not initialized', () async {
      const request = TranscriptionRequest(audioFilePath: '/tmp/a.wav');
      expect(
        () => engine.transcribeFile(request),
        throwsA(isA<AsrNotInitializedException>()),
      );
    });

    test('returns scripted response', () async {
      await engine.initialize(model: AsrModelRegistry.senseVoiceSmallInt8);
      engine.scriptResponses(['你好世界', '今天天气不错']);

      final r1 = await engine.transcribeFile(
        const TranscriptionRequest(audioFilePath: '/tmp/a.wav'),
      );
      expect(r1.text, '你好世界');
      expect(r1.segments, hasLength(1));
      expect(r1.detectedLanguage, AsrLanguage.auto);

      final r2 = await engine.transcribeFile(
        const TranscriptionRequest(audioFilePath: '/tmp/b.wav'),
      );
      expect(r2.text, '今天天气不错');
    });

    test('cycles scripted responses', () async {
      await engine.initialize(model: AsrModelRegistry.senseVoiceSmallInt8);
      engine.scriptResponses(['only']);

      final r1 = await engine.transcribeFile(
        const TranscriptionRequest(audioFilePath: '/tmp/a.wav'),
      );
      final r2 = await engine.transcribeFile(
        const TranscriptionRequest(audioFilePath: '/tmp/b.wav'),
      );
      expect(r1.text, 'only');
      expect(r2.text, 'only');
    });

    test('uses default placeholder when no script set', () async {
      await engine.initialize(model: AsrModelRegistry.senseVoiceSmallInt8);
      final result = await engine.transcribeFile(
        const TranscriptionRequest(audioFilePath: '/tmp/a.wav'),
      );
      expect(result.text, 'fake transcription');
    });

    test('throws for unsupported language', () async {
      // Moonshine is English-only.
      await engine.initialize(model: AsrModelRegistry.moonshineBaseV2);
      expect(
        () => engine.transcribeFile(
          const TranscriptionRequest(
            audioFilePath: '/tmp/a.wav',
            language: AsrLanguage.zh,
          ),
        ),
        throwsA(isA<AsrUnsupportedLanguageException>()),
      );
    });
  });

  group('FakeAsrEngine startStreamRecognition', () {
    test('emits partial then endpoint chunk', () async {
      await engine.initialize(model: AsrModelRegistry.senseVoiceSmallInt8);
      final chunks = await engine.startStreamRecognition().toList();

      expect(chunks, hasLength(2));
      expect(chunks.first.isEndpoint, isFalse);
      expect(chunks.first.partialText, 'hello');
      expect(chunks.last.isEndpoint, isTrue);
      expect(chunks.last.committedText, 'hello world');
    });

    test('throws when not initialized', () {
      expect(
        () => engine.startStreamRecognition().first,
        throwsA(isA<AsrNotInitializedException>()),
      );
    });
  });
}
