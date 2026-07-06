import 'dart:async';

import 'package:asr_sdk/asr_sdk.dart';
import 'package:flutter/material.dart';

import '../../data/services/asr_model_bootstrap.dart';
import '../../data/services/asr_service.dart';
import '../design/memory_design.dart';

/// Debug page for end-to-end ASR verification.
///
/// Lifecycle:
///   1. On enter, calls [AsrModelBootstrap.requestEngine] which blocks
///      until the model is downloaded (if needed) and the engine is
///      initialized. Download progress is shown in real time.
///   2. Once the engine is ready, taps "开始录音" to start streaming
///      recognition. The partial text and committed (endpoint-finalized)
///      text are displayed in real time.
///   3. "停止" flushes trailing context and finalizes the session.
///
/// This page is intentionally bare-bones; it is not wired into the main
/// app shell and is reachable only through debug entry points.
class AsrDebugPage extends StatefulWidget {
  const AsrDebugPage({super.key});

  @override
  State<AsrDebugPage> createState() => _AsrDebugPageState();
}

class _AsrDebugPageState extends State<AsrDebugPage> {
  final AsrService _asrService = AsrService();

  bool _initializing = true;
  String? _error;
  String _partial = '';
  final StringBuffer _committed = StringBuffer();

  // Download progress display
  double? _downloadFraction;
  String _statusText = '';

  StreamSubscription<AsrModelProgress>? _progressSub;
  StreamSubscription<TranscriptionChunk>? _chunkSub;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _progressSub?.cancel();
    _chunkSub?.cancel();
    _asrService.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    // Subscribe to progress BEFORE calling requestEngine so we don't miss
    // events emitted during the synchronous parts of ensureReady.
    _progressSub = AsrModelBootstrap.instance.progress.listen(
      _onProgress,
      onError: (Object e, StackTrace st) {
        if (!mounted) return;
        setState(() {
          _error = '$e';
          _initializing = false;
        });
      },
    );

    try {
      final engine = await AsrModelBootstrap.instance.requestEngine();
      if (!mounted) return;

      if (engine == null) {
        setState(() {
          _error = AsrModelBootstrap.instance.state == AsrModelState.failed
              ? 'ASR 准备失败：${AsrModelBootstrap.instance.state.name}'
              : 'ASR 引擎不可用';
          _initializing = false;
        });
        return;
      }

      setState(() {
        _initializing = false;
        _statusText = '';
        _downloadFraction = null;
      });
    } catch (e, st) {
      if (!mounted) return;
      setState(() {
        _error = 'ASR 初始化失败：$e\n$st';
        _initializing = false;
      });
    }
  }

  void _onProgress(AsrModelProgress event) {
    if (!mounted) return;

    switch (event) {
      case AsrModelDownloadProgress(:final fraction):
        setState(() {
          _downloadFraction = fraction;
          _statusText = fraction == null
              ? '正在下载 ASR 模型…'
              : '正在下载 ASR 模型 ${(fraction * 100).toStringAsFixed(0)}%';
        });
      case AsrModelExtracting():
        setState(() {
          _downloadFraction = null;
          _statusText = '正在解压模型…';
        });
      case AsrModelInitializing():
        setState(() {
          _downloadFraction = null;
          _statusText = '正在加载引擎…';
        });
      case AsrModelReady():
        // requestEngine() will return shortly; no action needed here.
        break;
      case AsrModelFailed(:final message):
        setState(() {
          _error = message;
          _initializing = false;
        });
    }
  }

  Future<void> _startRecording() async {
    if (_asrService.isRunning) return;

    final engine = await AsrModelBootstrap.instance.requestEngine();
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
      return _buildInitializingState();
    }

    final state = AsrModelBootstrap.instance.state;
    if (state != AsrModelState.ready) {
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

  Widget _buildInitializingState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_downloadFraction != null) ...[
              SizedBox(
                width: 200,
                child: LinearProgressIndicator(
                  value: _downloadFraction,
                  color: MemoryPalette.gold,
                  backgroundColor:
                      MemoryPalette.paper.withValues(alpha: 0.10),
                ),
              ),
            ] else
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  color: MemoryPalette.gold,
                  strokeWidth: 2.5,
                ),
              ),
            const SizedBox(height: 16),
            Text(
              _statusText.isEmpty ? '正在准备 ASR…' : _statusText,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: MemoryPalette.paper,
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
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
              Icons.error_outline,
              size: 64,
              color: MemoryPalette.rust,
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'ASR 模型不可用',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: MemoryPalette.paper,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _retry,
              icon: const Icon(Icons.refresh),
              label: const Text('重试'),
              style: FilledButton.styleFrom(
                backgroundColor: MemoryPalette.gold,
                foregroundColor: MemoryPalette.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _retry() async {
    setState(() {
      _initializing = true;
      _error = null;
      _statusText = '';
      _downloadFraction = null;
    });
    await _progressSub?.cancel();
    await AsrModelBootstrap.instance.dispose();
    await _bootstrap();
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
