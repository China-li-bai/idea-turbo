import 'dart:async';

import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter/material.dart';

import '../../data/services/asr_model_bootstrap.dart';
import '../../data/services/asr_service.dart';

/// State of the voice input flow.
enum VoiceInputState {
  /// No active session. Button shows mic icon.
  idle,

  /// Model is being downloaded or engine is being initialized.
  /// Button shows a spinner; user cannot start listening yet.
  preparing,

  /// Microphone is recording and recognizer is producing partials.
  /// Button shows a pulsing icon; tapping again stops and commits.
  listening,

  /// A recoverable error occurred (model load failed, mic permission
  /// denied, etc.). Button is tinted; tapping retries from idle.
  error,
}

/// Encapsulates the human-in-the-loop interaction for voice input:
/// "tap to talk, tap to commit".
///
/// This controller wires together [AsrModelBootstrap] (model lifecycle)
/// and [AsrService] (mic + recognizer), exposing a single state machine
/// to UI consumers. It also synchronizes recognition output to an
/// attached [TextEditingController] so partial text shows live in the
/// user's input field, and the finalized text remains there as the
/// message draft.
///
/// Lifecycle:
///   - Construct with the [TextEditingController] of the composer.
///   - Call [toggle] from the mic button's onTap.
///   - Call [cancel] from an explicit cancel affordance (e.g. long-press
///     or a side X button) to discard the in-progress utterance and
///     restore the pre-listening draft.
///   - Call [dispose] when the host widget is torn down.
///
/// State transitions:
///   idle      → toggle → preparing (if model not ready) → listening
///   listening → toggle → idle (commits final text to controller)
///   listening → cancel → idle (restores pre-listening draft)
///   any       → error  → toggle → idle (clears error, retries)
///
/// Idempotency:
///   - [toggle] and [cancel] are safe to call multiple times.
///   - [dispose] is idempotent.
class VoiceInputController extends ChangeNotifier {
  VoiceInputController({required TextEditingController textController})
    : _textController = textController;

  final TextEditingController _textController;
  final AsrService _asrService = AsrService();

  VoiceInputState _state = VoiceInputState.idle;
  String _partialText = '';
  String? _error;
  String _draftBeforeListening = '';

  StreamSubscription<TranscriptionChunk>? _chunkSub;
  StreamSubscription<AsrModelProgress>? _progressSub;

  VoiceInputState get state => _state;
  String get partialText => _partialText;
  String? get error => _error;

  /// Whether the mic button should be interactable. The button is
  /// disabled only while the engine is preparing; in all other states
  /// a tap is meaningful (start / stop / retry).
  bool get isInteractive =>
      _state == VoiceInputState.idle || _state == VoiceInputState.listening;

  /// Toggles between listening and idle.
  ///
  /// - From [VoiceInputState.idle]: ensures the engine is ready (may
  ///   transition through [VoiceInputState.preparing]) and starts
  ///   recording. Partial text is streamed into [_textController].
  /// - From [VoiceInputState.listening]: stops the recorder, flushes the
  ///   final utterance, and leaves the committed text in [_textController].
  /// - From [VoiceInputState.error]: clears the error and retries from
  ///   idle.
  /// - From [VoiceInputState.preparing]: no-op (wait for engine).
  Future<void> toggle() async {
    switch (_state) {
      case VoiceInputState.idle:
        await _startListening();
      case VoiceInputState.listening:
        await _stopListening(commit: true);
      case VoiceInputState.error:
        _clearError();
        await _startListening();
      case VoiceInputState.preparing:
        // Engine is being set up; ignore taps until ready.
        break;
    }
  }

  /// Cancels the in-progress utterance and restores the draft that was
  /// in [_textController] before listening started. No-op if not
  /// listening.
  Future<void> cancel() async {
    if (_state != VoiceInputState.listening) return;
    await _stopListening(commit: false);
    _textController.text = _draftBeforeListening;
    _textController.selection = TextSelection.collapsed(
      offset: _draftBeforeListening.length,
    );
  }

  Future<void> _startListening() async {
    assert(_state == VoiceInputState.idle || _state == VoiceInputState.error);
    _clearError();
    _setState(VoiceInputState.preparing);

    // Subscribe to download/init progress so we surface errors that
    // happen while preparing. We don't need to render progress here —
    // the composer button shows a spinner while in `preparing`.
    _progressSub = AsrModelBootstrap.instance.progress.listen(
      _onProgress,
      onError: (Object e, StackTrace st) => _fail('$e'),
    );

    try {
      final engine = await AsrModelBootstrap.instance.requestEngine();
      if (!isAttached) return;

      if (engine == null) {
        _fail(
          AsrModelBootstrap.instance.state == AsrModelState.failed
              ? 'ASR 模型不可用：${AsrModelBootstrap.instance.lastError ?? "未知错误"}'
              : 'ASR 引擎不可用',
        );
        return;
      }

      // Snapshot the current draft so [cancel] can restore it.
      _draftBeforeListening = _textController.text;
      _partialText = '';

      final chunks = await _asrService
          .start(engine)
          .then((_) => _asrService.chunks);
      if (!isAttached || chunks == null) {
        _fail('无法启动录音');
        return;
      }

      _setState(VoiceInputState.listening);

      _chunkSub = chunks.listen(
        _onChunk,
        onError: (Object e, StackTrace _) => _fail('识别错误：$e'),
        onDone: _onChunksDone,
      );
    } catch (e) {
      _fail('启动失败：$e');
    }
  }

  Future<void> _stopListening({required bool commit}) async {
    if (_state != VoiceInputState.listening) return;

    await _chunkSub?.cancel();
    _chunkSub = null;
    await _asrService.stop();

    if (commit) {
      // The AsrService's stop() flushed the trailing partial via the
      // session's stop, which emitted a final endpoint chunk. The
      // last partial text is what we leave in the input field.
      final text = _partialText.trim();
      if (text.isNotEmpty) {
        final base = _draftBeforeListening.trim();
        _textController.text = base.isEmpty
            ? text
            : '$base $text';
        _textController.selection = TextSelection.collapsed(
          offset: _textController.text.length,
        );
      }
    }

    _partialText = '';
    _setState(VoiceInputState.idle);
  }

  void _onChunk(TranscriptionChunk chunk) {
    if (!isAttached) return;
    _partialText = chunk.partialText;

    // Live-update the input field with the current partial so the user
    // sees recognition in progress. We append to the pre-listening
    // draft so previously-typed text is preserved.
    final base = _draftBeforeListening.trim();
    final partial = chunk.partialText.trim();
    _textController.text = base.isEmpty
        ? partial
        : (partial.isEmpty ? base : '$base $partial');
    _textController.selection = TextSelection.collapsed(
      offset: _textController.text.length,
    );

    // If an endpoint fired, the partial is already part of committed
    // text — we keep accumulating into the same input field. The final
    // commit happens on stop().
  }

  void _onChunksDone() {
    if (!isAttached) return;
    if (_state != VoiceInputState.listening) return;
    // Stream closed unexpectedly (e.g. recorder died). Surface as error.
    _fail('录音流意外结束');
  }

  void _onProgress(AsrModelProgress event) {
    if (!isAttached) return;
    if (event is AsrModelFailed) {
      _fail(event.message);
    }
    // Download/init progress is not surfaced here; the composer button
    // shows a generic spinner while in `preparing` state.
  }

  void _fail(String message) {
    if (!isAttached) return;
    _error = message;
    _partialText = '';
    _progressSub?.cancel();
    _progressSub = null;
    _chunkSub?.cancel();
    _chunkSub = null;
    // Best-effort teardown; ignore errors.
    // ignore: unawaited_futures
    _asrService.stop();
    _setState(VoiceInputState.error);
  }

  void _clearError() {
    if (_error != null) {
      _error = null;
      notifyListeners();
    }
  }

  void _setState(VoiceInputState next) {
    if (_state == next) return;
    _state = next;
    notifyListeners();
  }

  /// Whether this controller is still attached (not disposed). Used to
  /// short-circuit async callbacks that fire after dispose.
  bool get isAttached => !_disposed;

  bool _disposed = false;

  @override
  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _progressSub?.cancel();
    _chunkSub?.cancel();
    // ignore: unawaited_futures
    _asrService.dispose();
    super.dispose();
  }
}
