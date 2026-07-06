import 'dart:async';

import 'package:asr_sdk/src/core/asr_exception.dart';
import 'package:asr_sdk/src/domain/asr_model_config.dart';
import 'package:asr_sdk/src/infrastructure/asr_model_loader.dart';
import 'package:asr_sdk/src/infrastructure/sherpa_onnx_asr_engine.dart';

/// Lifecycle state of an ASR model under [AsrModelManager] control.
enum AsrModelState {
  /// No model selected or download was never attempted.
  notDownloaded,

  /// Archive is being downloaded / extracted.
  downloading,

  /// Archive is on disk; engine is not yet initialized.
  downloaded,

  /// Engine is loading the model into native memory.
  initializing,

  /// Engine is loaded and ready for transcription / streaming.
  ready,

  /// Download or initialization failed. See [AsrModelManager.lastError].
  failed,
}

/// One progress event emitted by [AsrModelManager.ensureReady].
sealed class AsrModelProgress {
  const AsrModelProgress();
}

/// Bytes downloaded so far. [totalBytes] may be null if the server
/// does not report Content-Length.
class AsrModelDownloadProgress extends AsrModelProgress {
  final int receivedBytes;
  final int? totalBytes;
  const AsrModelDownloadProgress(this.receivedBytes, this.totalBytes);

  /// 0..1 progress fraction, or null if total is unknown.
  double? get fraction =>
      totalBytes == null || totalBytes == 0 ? null : receivedBytes / totalBytes!;
}

/// Archive is being extracted (post-download).
class AsrModelExtracting extends AsrModelProgress {
  const AsrModelExtracting();
}

/// Engine is loading the model into native memory.
class AsrModelInitializing extends AsrModelProgress {
  const AsrModelInitializing();
}

/// Engine is ready for use.
class AsrModelReady extends AsrModelProgress {
  const AsrModelReady();
}

/// A step failed. See [AsrModelManager.lastError] for details.
class AsrModelFailed extends AsrModelProgress {
  final String message;
  const AsrModelFailed(this.message);
}

/// High-level facade combining [AsrModelRegistry], [AsrModelLoader], and
/// [SherpaOnnxAsrEngine] into a single check → download → init flow.
///
/// Architecture role:
///   flutter_demo (Presentation)
///       ↓ depends on
///   asr_sdk (this facade)
///       ↓ composes
///   AsrModelLoader + SherpaOnnxAsrEngine (Infrastructure)
///
/// Consumers (e.g. flutter_demo first-launch) call [ensureReady] with a
/// model config and observe the [progress] stream for state updates.
/// Once [state] becomes [AsrModelState.ready], the [engine] getter
/// returns a usable [SherpaOnnxAsrEngine].
///
/// Idempotency:
///   - Calling [ensureReady] with the same model id when already ready
///     is a no-op.
///   - Calling with a different model id disposes the previous engine
///     and re-runs the flow.
///   - Calling again after a failure retries from the failed step
///     (download if the model files are still missing, init otherwise).
///
/// This class is NOT thread-safe. Callers MUST serialize [ensureReady]
/// and [dispose] calls.
class AsrModelManager {
  AsrModelManager({
    SherpaOnnxAsrEngine? engine,
    AsrModelLoader? loader,
  })  : _engine = engine ?? SherpaOnnxAsrEngine(),
        _loader = loader ?? AsrModelLoader();

  final SherpaOnnxAsrEngine _engine;
  final AsrModelLoader _loader;

  AsrModelConfig? _model;
  AsrModelState _state = AsrModelState.notDownloaded;
  String? _lastError;

  // sync: true so progress events are delivered synchronously during
  // ensureReady(). This guarantees that listeners observe state changes
  // in the correct order (e.g. AsrModelReady arrives before ensureReady's
  // Future completes). Safe because listeners never reenter the controller.
  final StreamController<AsrModelProgress> _progressController =
      StreamController<AsrModelProgress>.broadcast(sync: true);

  /// Current state of the model under management.
  AsrModelState get state => _state;

  /// Active model, or null if [ensureReady] has not been called yet.
  AsrModelConfig? get model => _model;

  /// Last error message, only meaningful when [state] ==
  /// [AsrModelState.failed].
  String? get lastError => _lastError;

  /// Ready-to-use engine, or null when [state] != [AsrModelState.ready].
  SherpaOnnxAsrEngine? get engine =>
      _state == AsrModelState.ready ? _engine : null;

  /// Stream of progress events for the most recent (or in-flight)
  /// [ensureReady] call. Broadcast: multiple listeners are supported.
  Stream<AsrModelProgress> get progress => _progressController.stream;

  /// True if the model files are already on disk (no download needed).
  Future<bool> get isPresent async {
    final m = _model;
    if (m == null) return false;
    return _loader.isPresent(m);
  }

  /// Ensures the model archive is downloaded and extracted, but does NOT
  /// initialize the engine.
  ///
  /// Use this for background pre-download (e.g. on first app launch) so
  /// the engine can be initialized quickly later via [ensureReady].
  ///
  /// Emits:
  ///   - [AsrModelDownloadProgress] (0..N times during download)
  ///   - [AsrModelExtracting] (once, after download completes)
  ///   - [AsrModelFailed] (on failure)
  ///
  /// On success, [state] becomes [AsrModelState.downloaded]. On failure,
  /// [state] becomes [AsrModelState.failed] and [lastError] is set.
  ///
  /// Idempotent: if the model files are already on disk, returns immediately
  /// with [state] == [AsrModelState.downloaded].
  Future<void> ensureDownloaded(AsrModelConfig model) async {
    // If already downloaded for the same model, no-op.
    if (_state == AsrModelState.downloaded && _model?.id == model.id) {
      return;
    }

    _model = model;
    _lastError = null;

    try {
      final present = await _loader.isPresent(model);
      if (!present) {
        _setState(AsrModelState.downloading);
        await _loader.download(
          model,
          onProgress: (received, total) {
            _progressController.add(
              AsrModelDownloadProgress(received, total),
            );
          },
        );
        _progressController.add(const AsrModelExtracting());
      }
      _setState(AsrModelState.downloaded);
    } on AsrModelDownloadException catch (e) {
      _lastError = 'Download failed: ${e.message}';
      _setState(AsrModelState.failed);
      _progressController.add(AsrModelFailed(_lastError!));
    } catch (e) {
      _lastError = 'Unexpected error: $e';
      _setState(AsrModelState.failed);
      _progressController.add(AsrModelFailed(_lastError!));
    }
  }

  /// Ensures the given [model] is downloaded and the engine is initialized.
  ///
  /// Equivalent to `await ensureDownloaded(model)` followed by engine
  /// initialization. Use [ensureDownloaded] if you only need to pre-fetch
  /// the model files without loading the native engine.
  ///
  /// Emits progress events on [progress]:
  ///   - [AsrModelDownloadProgress] (0..N times during download)
  ///   - [AsrModelExtracting] (once, after download completes)
  ///   - [AsrModelInitializing] (once, before engine init)
  ///   - [AsrModelReady] (on success)
  ///   - [AsrModelFailed] (on failure, with [lastError] set)
  Future<void> ensureReady(AsrModelConfig model) async {
    // Idempotent: same model already ready.
    if (_state == AsrModelState.ready && _model?.id == model.id) {
      _progressController.add(const AsrModelReady());
      return;
    }

    // Switching models OR recovering from a failed init: dispose the
    // previous engine first so native memory is released before we
    // load the new one. We dispose whenever the engine is initialized
    // AND the active model differs from the requested one.
    if (_engine.isInitialized && _engine.activeModel?.id != model.id) {
      await _engine.dispose();
      _state = AsrModelState.notDownloaded;
    }

    // Step 1: download (skipped if already on disk).
    await ensureDownloaded(model);
    if (_state == AsrModelState.failed) {
      // ensureDownloaded already emitted AsrModelFailed.
      return;
    }

    // Step 2: initialize the engine.
    _progressController.add(const AsrModelInitializing());
    _setState(AsrModelState.initializing);

    try {
      if (!_engine.isInitialized) {
        await _engine.initialize(model: model);
      }
      _setState(AsrModelState.ready);
      _progressController.add(const AsrModelReady());
    } on AsrException catch (e) {
      _lastError = 'Initialization failed: ${e.message}';
      _setState(AsrModelState.failed);
      _progressController.add(AsrModelFailed(_lastError!));
    } catch (e) {
      _lastError = 'Unexpected error: $e';
      _setState(AsrModelState.failed);
      _progressController.add(AsrModelFailed(_lastError!));
    }
  }

  /// Releases all resources. After dispose, the manager can be reused
  /// by calling [ensureReady] again. Idempotent.
  Future<void> dispose() async {
    await _engine.dispose();
    _state = AsrModelState.notDownloaded;
    _model = null;
    _lastError = null;
    if (!_progressController.isClosed) {
      await _progressController.close();
    }
  }

  void _setState(AsrModelState next) {
    _state = next;
  }
}
