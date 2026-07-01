import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter_test/flutter_test.dart';

/// Unit tests for [SherpaOnnxAsrEngine] that exercise paths NOT requiring
/// native sherpa-onnx bindings.
///
/// Coverage:
///   - Lifecycle guard: calling transcribeFile/startStreamRecognition before
///     initialize() MUST throw [AsrNotInitializedException].
///   - These paths return early before any `sherpa.*` symbol is touched,
///     so the tests run safely under `flutter test` without a native lib.
///
/// What is NOT covered here (requires native lib + real model files):
///   - initialize() loading the native recognizer.
///   - transcribeFile() decoding a real WAV file.
///   - These are validated by the Phase 1 PoC integration script:
///       ASR_MODEL_DIR=/path/to/models flutter run -d macos test/poc/...
///     or by the consumer app (flutter_demo) on a real device.
void main() {
  group('SherpaOnnxAsrEngine (non-native paths)', () {
    late SherpaOnnxAsrEngine engine;

    setUp(() {
      engine = SherpaOnnxAsrEngine();
    });

    tearDown(() async {
      await engine.dispose();
    });

    test('isInitialized is false before initialize', () {
      expect(engine.isInitialized, isFalse);
      expect(engine.activeModel, isNull);
    });

    test('transcribeFile throws AsrNotInitializedException when not initialized',
        () async {
      const request = TranscriptionRequest(audioFilePath: '/tmp/nonexistent.wav');
      expect(
        () => engine.transcribeFile(request),
        throwsA(isA<AsrNotInitializedException>()),
      );
    });

    test(
        'startStreamRecognition throws AsrNotInitializedException when not '
        'initialized', () {
      expect(
        () => engine.startStreamRecognition().first,
        throwsA(isA<AsrNotInitializedException>()),
      );
    });

    test('dispose is safe to call on a never-initialized engine', () async {
      await engine.dispose();
      expect(engine.isInitialized, isFalse);
      expect(engine.activeModel, isNull);
    });
  });
}
