import 'dart:async';

import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/services/asr_service.dart';
import '../design/memory_design.dart';

/// Debug page for end-to-end ASR verification.
///
/// Lifecycle:
///   1. On enter, looks for a streaming ASR model on disk. If none is
///      present, shows a banner and a "去下载 ASR 模型" button (Phase 2C
///      will wire the actual download flow; for now the button is a
///      placeholder that informs the user).
///   2. Once a model is ready, taps "开始录音" to start streaming
///      recognition. The partial text and committed (endpoint-finalized)
///      text are displayed in real time.
///   3. "停止" flushes trailing context and finalizes the session.
///
/// This page is intentionally bare-bones; it is not wired into the main
/// app shell and is reachable only through debug entry points.
class AsrDebugPage extends StatefulWidget {
  const AsrDebugPage({super.key});

  /// SharedPreferences key for the active ASR model id (set by the
  /// Phase 2C download flow).
  static const String selectedAsrModelIdKey = 'selected_asr_model_id';

  @override
  State<AsrDebugPage> createState() => _AsrDebugPageState();
}

class _AsrDebugPageState extends State<AsrDebugPage> {
  final AsrService _asrService = AsrService();
  SherpaOnnxAsrEngine? _engine;

  bool _initializing = true;
  String? _error;
  String _partial = '';
  final StringBuffer _committed = StringBuffer();

  StreamSubscription<TranscriptionChunk>? _chunkSub;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _chunkSub?.cancel();
    _asrService.dispose().then((_) => _engine?.dispose());
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final model = await _resolveStreamingModel();
      final engine = SherpaOnnxAsrEngine();
      await engine.initialize(model: model);
      if (!mounted) return;
      setState(() {
        _engine = engine;
        _initializing = false;
      });
    } catch (e, st) {
      if (!mounted) return;
      setState(() {
        _error = 'ASR 初始化失败：$e\n$st';
        _initializing = false;
      });
    }
  }

  /// Resolves the streaming ASR model to use.
  ///
  /// Strategy:
  ///   1. If a model id is stored in prefs and points to a present
  ///      streaming model on disk, use it.
  ///   2. Otherwise scan the model directory for any registry model
  ///      whose [AsrModelConfig.mode] is [AsrModelMode.streaming] and
  ///      whose files exist.
  ///   3. Fallback: throw a [StateError] telling the user no streaming
  ///      model is available yet.
  Future<AsrModelConfig> _resolveStreamingModel() async {
    final prefs = await SharedPreferences.getInstance();
    final storedId = prefs.getString(AsrDebugPage.selectedAsrModelIdKey);

    final loader = AsrModelLoader();
    AsrModelConfig? candidate;

    if (storedId != null && storedId.isNotEmpty) {
      final m = AsrModelRegistry.findById(storedId);
      if (m != null && m.mode == AsrModelMode.streaming) {
        candidate = m;
      }
    }

    candidate ??= AsrModelRegistry.all
        .where((m) => m.mode == AsrModelMode.streaming)
        .firstOrNull;

    if (candidate == null) {
      throw StateError('No streaming ASR model registered');
    }

    if (!await loader.isPresent(candidate)) {
      throw StateError(
        'Streaming ASR model "${candidate.id}" is not downloaded yet. '
        'Please download it first (Phase 2C flow).',
      );
    }
    return candidate;
  }

  Future<void> _startRecording() async {
    final engine = _engine;
    if (engine == null || _asrService.isRunning) return;

    setState(() {
      _partial = '';
      _committed.clear();
      _error = null;
    });

    final chunks = await _asrService.start(engine).then((_) => _asrService.chunks);
    if (chunks == null) return;

    _chunkSub = chunks.listen(
      (chunk) {
        if (!mounted) return;
        setState(() {
          _partial = chunk.partialText;
          if (chunk.isEndpoint) {
            final utterance = chunk.committedText;
            if (utterance != null && utterance.trim().isNotEmpty) {
              _committed.write(_committed.isEmpty ? '' : '\n');
              _committed.write(utterance.trim());
            }
          }
        });
      },
      onError: (Object e, StackTrace st) {
        if (!mounted) return;
        setState(() {
          _error = '识别错误：$e';
        });
      },
      onDone: () {
        if (!mounted) return;
        setState(() {
          // Session closed; keep last partial as a finalized line.
          if (_partial.trim().isNotEmpty) {
            _committed.write(_committed.isEmpty ? '' : '\n');
            _committed.write(_partial.trim());
            _partial = '';
          }
        });
      },
    );
  }

  Future<void> _stopRecording() async {
    await _asrService.stop();
    await _chunkSub?.cancel();
    _chunkSub = null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      appBar: AppBar(
        title: const Text('语音转写 · Debug'),
        backgroundColor: MemoryPalette.ink,
        foregroundColor: MemoryPalette.paper,
      ),
      body: SafeArea(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_initializing) {
      return const Center(
        child: CircularProgressIndicator(color: MemoryPalette.gold),
      );
    }

    if (_engine == null) {
      return _buildNoModelState();
    }

    final running = _asrService.isRunning;
    return Column(
      children: [
        if (_error != null) _Banner(text: _error!, color: MemoryPalette.rust),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _SectionLabel('已提交（端点）'),
                const SizedBox(height: 8),
                Expanded(
                  flex: 3,
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: _surfaceDecoration(),
                    child: SingleChildScrollView(
                      child: Text(
                        _committed.isEmpty
                            ? '（等待端点）'
                            : _committed.toString(),
                        style: const TextStyle(
                          color: MemoryPalette.paper,
                          fontSize: 15,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const _SectionLabel('实时部分'),
                const SizedBox(height: 8),
                Expanded(
                  flex: 2,
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: _surfaceDecoration(),
                    child: SingleChildScrollView(
                      child: Text(
                        _partial.isEmpty ? '（沉默中...）' : _partial,
                        style: TextStyle(
                          color: MemoryPalette.paper.withValues(alpha: 0.85),
                          fontSize: 14,
                          height: 1.5,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: running ? null : _startRecording,
                  icon: const Icon(Icons.mic),
                  label: const Text('开始录音'),
                  style: FilledButton.styleFrom(
                    backgroundColor: MemoryPalette.gold,
                    foregroundColor: MemoryPalette.ink,
                    disabledBackgroundColor:
                        MemoryPalette.paper.withValues(alpha: 0.10),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: running ? _stopRecording : null,
                  icon: const Icon(Icons.stop),
                  label: const Text('停止'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNoModelState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_download,
              size: 64,
              color: MemoryPalette.gold,
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? '尚未下载流式 ASR 模型',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: MemoryPalette.paper,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '请在 Phase 2C 模型下载流程里下载一个流式模型 '
              '（例如 Moonshine v2 Base）。',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: MemoryPalette.paper.withValues(alpha: 0.55),
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  BoxDecoration _surfaceDecoration() {
    return BoxDecoration(
      color: MemoryPalette.paper.withValues(alpha: 0.06),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(
        color: MemoryPalette.paper.withValues(alpha: 0.10),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        color: MemoryPalette.paper.withValues(alpha: 0.60),
        fontSize: 12,
        letterSpacing: 0.4,
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  final String text;
  final Color color;
  const _Banner({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: color.withValues(alpha: 0.18),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 12, height: 1.4),
      ),
    );
  }
}
