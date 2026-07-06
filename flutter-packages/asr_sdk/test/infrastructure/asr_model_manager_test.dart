import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockEngine extends Mock implements SherpaOnnxAsrEngine {}

class _MockLoader extends Mock implements AsrModelLoader {}

/// Wraps a [_MockEngine] so `isInitialized` / `activeModel` reflect the
/// actual initialize/dispose call sequence. mocktail Mocks return canned
/// values regardless of call order; this wrapper keeps them in sync.
class _EngineState {
  _EngineState(this._mock) {
    when(() => _mock.isInitialized).thenReturn(false);
    when(() => _mock.activeModel).thenReturn(null);
    when(() => _mock.dispose()).thenAnswer((_) async {
      when(() => _mock.isInitialized).thenReturn(false);
      when(() => _mock.activeModel).thenReturn(null);
    });
    when(() => _mock.initialize(model: any(named: 'model')))
        .thenAnswer((inv) async {
      final model =
          inv.namedArguments[#model] as AsrModelConfig?;
      when(() => _mock.isInitialized).thenReturn(true);
      when(() => _mock.activeModel).thenReturn(model);
    });
  }

  final _MockEngine _mock;

  /// Re-stub initialize to throw on the next call.
  void failNextInitialize(String message) {
    when(() => _mock.initialize(model: any(named: 'model')))
        .thenThrow(AsrInitializationException(message));
  }
}

void main() {
  const model = AsrModelRegistry.moonshineBaseV2;

  late _MockEngine mockEngine;
  late _EngineState engineState;
  late _MockLoader loader;
  late AsrModelManager manager;

  setUpAll(() {
    registerFallbackValue(model);
  });

  setUp(() {
    mockEngine = _MockEngine();
    engineState = _EngineState(mockEngine);
    loader = _MockLoader();
    manager = AsrModelManager(engine: mockEngine, loader: loader);

    // Default stubs: model is present, no download needed.
    when(() => loader.isPresent(any())).thenAnswer((_) async => true);
    when(() => loader.download(
          any(),
          onProgress: any(named: 'onProgress'),
        )).thenAnswer((_) async {});
  });

  tearDown(() async {
    await manager.dispose();
  });

  group('AsrModelManager initial state', () {
    test('starts in notDownloaded state with no model', () {
      expect(manager.state, AsrModelState.notDownloaded);
      expect(manager.model, isNull);
      expect(manager.engine, isNull);
      expect(manager.lastError, isNull);
    });

    test('isPresent delegates to loader when no model set', () async {
      expect(await manager.isPresent, isFalse);
    });

    test('isPresent reflects loader result after model is set', () async {
      when(() => loader.isPresent(model)).thenAnswer((_) async => true);
      await manager.ensureReady(model);
      expect(await manager.isPresent, isTrue);
    });
  });

  group('AsrModelManager.ensureDownloaded', () {
    test('emits download progress + extracting, ends in downloaded state',
        () async {
      when(() => loader.isPresent(model)).thenAnswer((_) async => false);
      when(() => loader.download(
            any(),
            onProgress: any(named: 'onProgress'),
          )).thenAnswer((inv) async {
        final cb = inv.namedArguments[#onProgress]
            as void Function(int, int?)?;
        cb?.call(50, 100);
      });

      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);
      await manager.ensureDownloaded(model);
      await sub.cancel();

      expect(received, hasLength(2));
      expect(received[0], isA<AsrModelDownloadProgress>());
      expect(received[1], isA<AsrModelExtracting>());
      expect(manager.state, AsrModelState.downloaded);
      expect(manager.model, model);
      // Engine MUST NOT be initialized by ensureDownloaded.
      verifyNever(() => mockEngine.initialize(model: any(named: 'model')));
    });

    test('is a no-op when model already on disk', () async {
      when(() => loader.isPresent(model)).thenAnswer((_) async => true);

      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);
      await manager.ensureDownloaded(model);
      await sub.cancel();

      expect(received, isEmpty);
      expect(manager.state, AsrModelState.downloaded);
      verifyNever(() => mockEngine.initialize(model: any(named: 'model')));
    });

    test('is idempotent when called twice with same model', () async {
      when(() => loader.isPresent(model)).thenAnswer((_) async => true);

      await manager.ensureDownloaded(model);
      verify(() => loader.isPresent(model)).called(1);

      // Second call: already in downloaded state, should skip even isPresent.
      await manager.ensureDownloaded(model);
      verifyNever(() => loader.isPresent(model));
    });

    test('on download failure, transitions to failed', () async {
      when(() => loader.isPresent(model)).thenAnswer((_) async => false);
      when(() => loader.download(
            any(),
            onProgress: any(named: 'onProgress'),
          )).thenThrow(
        AsrModelDownloadException(model.id, 'network timeout'),
      );

      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);
      await manager.ensureDownloaded(model);
      await sub.cancel();

      expect(manager.state, AsrModelState.failed);
      expect(manager.lastError, contains('Download failed'));
      expect(manager.lastError, contains('network timeout'));
      expect(received.last, isA<AsrModelFailed>());
    });
  });

  group('AsrModelManager.ensureReady (model already on disk)', () {
    test('emits AsrModelInitializing + AsrModelReady, then is ready',
        () async {
      // Subscribe BEFORE calling ensureReady, since progress is broadcast.
      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);

      await manager.ensureReady(model);
      await sub.cancel();

      // Model was present, so no download progress. We expect exactly
      // Initializing then Ready.
      expect(received, hasLength(2));
      expect(received[0], isA<AsrModelInitializing>());
      expect(received[1], isA<AsrModelReady>());
      expect(manager.state, AsrModelState.ready);
      expect(manager.model, model);
      expect(manager.engine, same(mockEngine));
    });

    test('does not re-initialize when called twice with same model',
        () async {
      await manager.ensureReady(model);
      verify(() => mockEngine.initialize(model: any(named: 'model')))
          .called(1);

      // Second call should be a no-op: state is already ready.
      await manager.ensureReady(model);
      verifyNever(() => mockEngine.initialize(model: any(named: 'model')));
    });

    test('emits AsrModelReady on idempotent second call', () async {
      await manager.ensureReady(model);

      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);
      await manager.ensureReady(model);
      await sub.cancel();

      expect(received, hasLength(1));
      expect(received.single, isA<AsrModelReady>());
    });
  });

  group('AsrModelManager.ensureReady (download required)', () {
    setUp(() {
      when(() => loader.isPresent(model)).thenAnswer((_) async => false);
    });

    test('emits download progress, extracting, initializing, ready',
        () async {
      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);

      // Drive the download callback with fake progress.
      when(() => loader.download(
            any(),
            onProgress: any(named: 'onProgress'),
          )).thenAnswer((inv) async {
        final namedArgs = inv.namedArguments;
        final cb = namedArgs[#onProgress] as void Function(int, int?)?;
        cb?.call(50, 100);
        cb?.call(100, 100);
      });

      await manager.ensureReady(model);
      await sub.cancel();

      // Expect: download progress x2, extracting, initializing, ready.
      expect(received, hasLength(5));
      expect(received[0], isA<AsrModelDownloadProgress>());
      expect((received[0] as AsrModelDownloadProgress).receivedBytes, 50);
      expect((received[0] as AsrModelDownloadProgress).totalBytes, 100);
      expect(received[1], isA<AsrModelDownloadProgress>());
      expect((received[1] as AsrModelDownloadProgress).receivedBytes, 100);
      expect(received[2], isA<AsrModelExtracting>());
      expect(received[3], isA<AsrModelInitializing>());
      expect(received[4], isA<AsrModelReady>());

      expect(manager.state, AsrModelState.ready);
    });

    test('on download failure, transitions to failed and sets lastError',
        () async {
      when(() => loader.download(
            any(),
            onProgress: any(named: 'onProgress'),
          )).thenThrow(
        AsrModelDownloadException(model.id, 'network down'),
      );

      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);

      await manager.ensureReady(model);
      await sub.cancel();

      expect(manager.state, AsrModelState.failed);
      expect(manager.engine, isNull);
      expect(manager.lastError, contains('Download failed'));
      expect(manager.lastError, contains('network down'));

      expect(received, isNotEmpty);
      expect(received.last, isA<AsrModelFailed>());
      expect((received.last as AsrModelFailed).message,
          contains('Download failed'));
    });

    test('on engine init failure, transitions to failed and sets lastError',
        () async {
      engineState.failNextInitialize('native load error');

      final received = <AsrModelProgress>[];
      final sub = manager.progress.listen(received.add);

      await manager.ensureReady(model);
      await sub.cancel();

      expect(manager.state, AsrModelState.failed);
      expect(manager.engine, isNull);
      expect(manager.lastError, contains('Initialization failed'));
      expect(manager.lastError, contains('native load error'));
      expect(received.last, isA<AsrModelFailed>());
    });

    test('can retry after download failure', () async {
      // First attempt: download throws.
      var downloadAttempts = 0;
      when(() => loader.download(
            any(),
            onProgress: any(named: 'onProgress'),
          )).thenAnswer((inv) async {
            downloadAttempts++;
            if (downloadAttempts == 1) {
              throw AsrModelDownloadException(model.id, 'first attempt fails');
            }
            // Second attempt: succeed (no-op).
          });

      await manager.ensureReady(model);
      expect(manager.state, AsrModelState.failed);
      expect(downloadAttempts, 1);

      // Second attempt: isPresent still false, so download is called again
      // and succeeds this time. Engine then initializes.
      await manager.ensureReady(model);
      expect(downloadAttempts, 2);
      expect(manager.state, AsrModelState.ready);
    });
  });

  group('AsrModelManager.ensureReady (model switching)', () {
    test('disposes previous engine when switching to a different model',
        () async {
      const firstModel = AsrModelRegistry.senseVoiceSmallInt8;
      const secondModel = AsrModelRegistry.moonshineBaseV2;

      // Pre-stub both models as present so we skip download.
      when(() => loader.isPresent(firstModel)).thenAnswer((_) async => true);
      when(() => loader.isPresent(secondModel))
          .thenAnswer((_) async => true);

      await manager.ensureReady(firstModel);
      expect(manager.state, AsrModelState.ready);
      expect(manager.model, firstModel);

      // Reset call history; the second ensureReady should dispose the
      // first engine and initialize the second.
      clearInteractions(mockEngine);
      // Re-stub dispose to update state (clearInteractions doesn't
      // remove the side-effect, but we need isInitialized to reflect
      // the dispose call during the switch).
      when(() => mockEngine.dispose()).thenAnswer((_) async {
        when(() => mockEngine.isInitialized).thenReturn(false);
        when(() => mockEngine.activeModel).thenReturn(null);
      });
      // Re-stub initialize to update active model to secondModel.
      when(() => mockEngine.initialize(model: any(named: 'model')))
          .thenAnswer((inv) async {
        final model =
            inv.namedArguments[#model] as AsrModelConfig?;
        when(() => mockEngine.isInitialized).thenReturn(true);
        when(() => mockEngine.activeModel).thenReturn(model);
      });

      await manager.ensureReady(secondModel);

      // Old engine should have been disposed exactly once before
      // initializing the new model.
      verify(() => mockEngine.dispose()).called(1);
      verify(() => mockEngine.initialize(model: secondModel)).called(1);
      expect(manager.state, AsrModelState.ready);
      expect(manager.model, secondModel);
    });
  });

  group('AsrModelManager.dispose', () {
    test('disposes engine and clears state', () async {
      await manager.ensureReady(model);
      expect(manager.state, AsrModelState.ready);

      await manager.dispose();

      expect(manager.state, AsrModelState.notDownloaded);
      expect(manager.model, isNull);
      expect(manager.engine, isNull);
      expect(manager.lastError, isNull);
    });

    test('is idempotent', () async {
      await manager.dispose();
      // Second dispose should not throw.
      await manager.dispose();
    });
  });
}
