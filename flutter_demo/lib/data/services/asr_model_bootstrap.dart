import 'dart:async';

import 'package:asr_sdk/asr_sdk.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// App-level singleton that orchestrates first-launch background download
/// of the default streaming ASR model.
///
/// Architecture role (per .trae/rules/architecture.md):
///   flutter_demo (Presentation)
///       ↓ depends on
///   asr_sdk (AsrModelManager + AsrModelLoader)
///
/// Design goals:
///   1. **Non-blocking first launch**: [bootstrap] is fire-and-forget.
///      The user enters the main app immediately; the model downloads in
///      the background. If the model is already on disk, [bootstrap] is a
///      no-op.
///   2. **Download vs. init separation**: [bootstrap] only downloads the
///      model files (via [AsrModelManager.ensureDownloaded]). The native
///      engine is NOT initialized until [requestEngine] is called, to
///      avoid holding ~150MB of native memory while the user is just
///      chatting with the LLM.
///   3. **Persistence**: Once the model files are verified on disk, the
///      model id is persisted to SharedPreferences. On subsequent launches,
///      [bootstrap] reads this key and skips re-download.
///   4. **Idempotent**: [bootstrap] and [requestEngine] are both safe to
///      call multiple times.
class AsrModelBootstrap {
  AsrModelBootstrap._()
      : _manager = AsrModelManager(),
        _loader = AsrModelLoader();

  static final AsrModelBootstrap instance = AsrModelBootstrap._();

  final AsrModelManager _manager;
  final AsrModelLoader _loader;

  /// SharedPreferences key storing the id of the model whose files are
  /// verified on disk. Null/missing means "not yet downloaded".
  static const _readyModelIdKey = 'asr_model_ready_id';

  /// The default streaming model to download on first launch.
  ///
  /// Moonshine v2 Base: ~125MB, English-only, native streaming encoder.
  /// Chosen as the default because it is the only streaming model in
  /// [AsrModelRegistry] for Phase 2. When SenseVoice or other Chinese
  /// streaming models are added, this can be switched based on locale.
  static const AsrModelConfig defaultModel = AsrModelRegistry.moonshineBaseV2;

  bool _bootstrapped = false;
  AsrModelConfig? _targetModel;

  /// Current [AsrModelManager] state. Exposed so UI can show download
  /// progress / status without holding a separate stream subscription.
  AsrModelState get state => _manager.state;

  /// The model this bootstrap is currently targeting (downloading or has
  /// downloaded). Null before [bootstrap] is called.
  AsrModelConfig? get targetModel => _targetModel;

  /// Stream of download/init progress events. See [AsrModelProgress] for
  /// event types. Broadcast: safe to subscribe/unsubscribe at any time.
  Stream<AsrModelProgress> get progress => _manager.progress;

  /// The most recent error message, if any. Mirrors
  /// [AsrModelManager.lastError]. Useful for surfacing a failure reason
  /// after [requestEngine] returned null.
  String? get lastError => _manager.lastError;

  /// Whether [bootstrap] has been called (regardless of outcome).
  bool get isBootstrapped => _bootstrapped;

  /// Starts the background download if the model is not yet on disk.
  ///
  /// Safe to call multiple times: the first call triggers the download,
  /// subsequent calls are no-ops. Also safe to call after [requestEngine]
  /// has already completed the flow.
  ///
  /// This method does NOT block the caller: it kicks off the download and
  /// returns immediately. Subscribe to [progress] to observe the outcome,
  /// or call [requestEngine] later to block until ready.
  Future<void> bootstrap({AsrModelConfig? model}) async {
    if (_bootstrapped) return;
    _bootstrapped = true;

    final target = model ?? await _resolveTargetModel();
    _targetModel = target;

    // If the files are already on disk, there's nothing to do — engine
    // initialization is deferred to [requestEngine].
    if (await _loader.isPresent(target)) {
      if (_manager.state == AsrModelState.notDownloaded) {
        // Mark the manager as downloaded so [requestEngine] skips the
        // download check and goes straight to init.
        // We can't set _manager._state directly, so call ensureDownloaded
        // which is a no-op when files are present.
        await _manager.ensureDownloaded(target);
      }
      return;
    }

    // Fire-and-forget: do NOT await here. The caller (main.dart) should
    // not block on the download. We do, however, persist the model id
    // once the download succeeds.
    unawaited(_runBackgroundDownload(target));
  }

  Future<void> _runBackgroundDownload(AsrModelConfig target) async {
    await _manager.ensureDownloaded(target);
    if (_manager.state == AsrModelState.downloaded) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_readyModelIdKey, target.id);
    }
  }

  /// Returns a ready-to-use [SherpaOnnxAsrEngine], blocking until the
  /// download (if any) and initialization complete.
  ///
  /// Use this from UI entry points that need ASR (e.g. AsrDebugPage).
  /// If [bootstrap] already downloaded the model in the background, this
  /// call will only initialize the engine (~1-2s). If [bootstrap] was
  /// never called, this will trigger the full download + init flow.
  ///
  /// Returns null if the flow fails. Check [state] and
  /// [AsrModelManager.lastError] (via [progress]'s AsrModelFailed event)
  /// for details.
  Future<SherpaOnnxAsrEngine?> requestEngine() async {
    final target = _targetModel ?? await _resolveTargetModel();
    _targetModel = target;

    await _manager.ensureReady(target);

    if (_manager.state == AsrModelState.ready) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_readyModelIdKey, target.id);
      return _manager.engine;
    }
    return null;
  }

  /// Resolves which model to use based on persisted state.
  ///
  /// If a previously-downloaded model id is stored in prefs and still in
  /// the registry, use it. Otherwise fall back to [defaultModel].
  Future<AsrModelConfig> _resolveTargetModel() async {
    final prefs = await SharedPreferences.getInstance();
    final storedId = prefs.getString(_readyModelIdKey);
    if (storedId != null) {
      final stored = AsrModelRegistry.findById(storedId);
      if (stored != null) return stored;
    }
    return defaultModel;
  }

  /// Releases all native resources held by the internal [AsrModelManager].
  ///
  /// Call this when the app is shutting down or when ASR is no longer
  /// needed for an extended period (e.g. user disables voice features).
  /// After dispose, [bootstrap] can be called again to re-download if
  /// needed.
  Future<void> dispose() async {
    await _manager.dispose();
    _bootstrapped = false;
    _targetModel = null;
  }
}
