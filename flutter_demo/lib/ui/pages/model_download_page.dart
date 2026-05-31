import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/model_config.dart';
import '../../pet/pet_app_shell.dart';
import '../design/memory_design.dart';

class ModelDownloadPage extends StatefulWidget {
  const ModelDownloadPage({super.key});

  @override
  State<ModelDownloadPage> createState() => _ModelDownloadPageState();
}

class _ModelDownloadPageState extends State<ModelDownloadPage> {
  final Map<String, String> _downloadedPaths = {};

  CancelToken? _cancelToken;
  ModelConfig? _selectedModel;
  String? _selectedPath;
  String? _downloadingFilename;
  String? _status;
  double _downloadProgress = 0;
  bool _isLoading = true;

  bool get _isDownloading => _downloadingFilename != null;

  @override
  void initState() {
    super.initState();
    _loadModels();
  }

  @override
  void dispose() {
    _cancelToken?.cancel();
    super.dispose();
  }

  Future<void> _loadModels() async {
    final dir = await getApplicationDocumentsDirectory();
    final prefs = await SharedPreferences.getInstance();
    final preferredFilename = prefs.getString(selectedModelFilenamePrefsKey);

    _downloadedPaths.clear();
    for (final model in availableModels) {
      final file = File('${dir.path}/${model.filename}');
      if (await file.exists()) {
        _downloadedPaths[model.filename] = file.path;
      }
    }

    final preferredModel = findModelByFilename(preferredFilename);
    final preferredPath = preferredModel == null
        ? null
        : _downloadedPaths[preferredModel.filename];
    final fallback = _downloadedPaths.entries.firstOrNull;
    final fallbackModel = findModelByFilename(fallback?.key);

    if (!mounted) return;
    setState(() {
      if (preferredModel != null && preferredPath != null) {
        _selectedModel = preferredModel;
        _selectedPath = preferredPath;
        _status = '当前模型：${preferredModel.name}';
      } else if (fallback != null && fallbackModel != null) {
        _selectedModel = fallbackModel;
        _selectedPath = fallback.value;
        _status = '当前模型：${fallbackModel.name}';
      } else {
        _selectedModel = null;
        _selectedPath = null;
        _status = '还没有可用的本地模型';
      }
      _isLoading = false;
    });

    if (_selectedModel != null) {
      await prefs.setString(
        selectedModelFilenamePrefsKey,
        _selectedModel!.filename,
      );
    }
  }

  Future<void> _downloadModel(ModelConfig model) async {
    final dir = await getApplicationDocumentsDirectory();
    final savePath = '${dir.path}/${model.filename}';
    final token = CancelToken();

    setState(() {
      _cancelToken = token;
      _downloadingFilename = model.filename;
      _downloadProgress = 0;
      _status = '正在下载 ${model.name}';
    });

    try {
      await Dio().download(
        model.url,
        savePath,
        cancelToken: token,
        onReceiveProgress: (received, total) {
          if (total <= 0 || !mounted) return;
          setState(() {
            _downloadProgress = received / total;
            _status =
                '正在下载 ${model.name} ${(_downloadProgress * 100).toStringAsFixed(1)}%';
          });
        },
      );

      await _selectModel(model, savePath);
    } catch (e) {
      if (!mounted) return;
      final cancelled = e is DioException && e.type == DioExceptionType.cancel;
      setState(() {
        _status = cancelled ? '下载已取消' : '下载失败: $e';
        _downloadingFilename = null;
        _cancelToken = null;
      });
    }
  }

  Future<void> _selectModel(ModelConfig model, String path) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(selectedModelFilenamePrefsKey, model.filename);

    if (!mounted) return;
    setState(() {
      _downloadedPaths[model.filename] = path;
      _selectedModel = model;
      _selectedPath = path;
      _downloadingFilename = null;
      _cancelToken = null;
      _downloadProgress = 0;
      _status = '当前模型：${model.name}';
    });
  }

  void _cancelDownload() {
    _cancelToken?.cancel();
  }

  void _openChat() {
    final path = _selectedPath;
    if (path == null) return;

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => PetAppShell(modelPath: path)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      appBar: AppBar(
        title: const Text('本地模型'),
        backgroundColor: MemoryPalette.ink,
        foregroundColor: MemoryPalette.paper,
        actions: [
          TextButton(
            onPressed: _selectedPath == null ? null : _openChat,
            child: const Text('进入聊天'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: MemoryPalette.gold),
            )
          : Column(
              children: [
                _buildStatus(),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: availableModels.length,
                    itemBuilder: (context, index) {
                      final model = availableModels[index];
                      final path = _downloadedPaths[model.filename];
                      final isDownloaded = path != null;
                      final isSelected =
                          _selectedModel?.filename == model.filename &&
                          _selectedPath == path;
                      final isDownloading =
                          _downloadingFilename == model.filename;

                      return _ModelTile(
                        model: model,
                        isDownloaded: isDownloaded,
                        isSelected: isSelected,
                        isDownloading: isDownloading,
                        progress: _downloadProgress,
                        disabled: _isDownloading && !isDownloading,
                        onSelect: isDownloaded
                            ? () => _selectModel(model, path)
                            : null,
                        onDownload: () => _downloadModel(model),
                        onCancel: _cancelDownload,
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatus() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: MemoryPalette.paper.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: MemoryPalette.paper.withValues(alpha: 0.10)),
      ),
      child: Text(
        _status ?? '',
        style: const TextStyle(color: MemoryPalette.paper, fontSize: 14),
      ),
    );
  }
}

class _ModelTile extends StatelessWidget {
  final ModelConfig model;
  final bool isDownloaded;
  final bool isSelected;
  final bool isDownloading;
  final bool disabled;
  final double progress;
  final VoidCallback? onSelect;
  final VoidCallback onDownload;
  final VoidCallback onCancel;

  const _ModelTile({
    required this.model,
    required this.isDownloaded,
    required this.isSelected,
    required this.isDownloading,
    required this.disabled,
    required this.progress,
    required this.onSelect,
    required this.onDownload,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isSelected
            ? MemoryPalette.gold.withValues(alpha: 0.14)
            : MemoryPalette.paper.withValues(alpha: 0.055),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isSelected
              ? MemoryPalette.gold.withValues(alpha: 0.45)
              : MemoryPalette.paper.withValues(alpha: 0.08),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  model.name,
                  style: const TextStyle(
                    color: MemoryPalette.paper,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                model.size,
                style: TextStyle(
                  color: MemoryPalette.paper.withValues(alpha: 0.56),
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            model.description,
            style: TextStyle(
              color: MemoryPalette.paper.withValues(alpha: 0.68),
              fontSize: 13,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: model.features
                .map(
                  (feature) => Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: MemoryPalette.paper.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      feature,
                      style: TextStyle(
                        color: MemoryPalette.paper.withValues(alpha: 0.64),
                        fontSize: 12,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          if (isDownloading) ...[
            const SizedBox(height: 14),
            LinearProgressIndicator(value: progress),
            const SizedBox(height: 6),
            Text(
              '${(progress * 100).toStringAsFixed(1)}%',
              style: TextStyle(
                color: MemoryPalette.paper.withValues(alpha: 0.62),
                fontSize: 12,
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: disabled || isSelected
                      ? null
                      : isDownloaded
                      ? onSelect
                      : onDownload,
                  icon: Icon(
                    isSelected
                        ? Icons.check_circle
                        : isDownloaded
                        ? Icons.folder_open
                        : Icons.download,
                  ),
                  label: Text(
                    isSelected
                        ? '正在使用'
                        : isDownloaded
                        ? '使用这个模型'
                        : '下载',
                  ),
                ),
              ),
              if (isDownloading) ...[
                const SizedBox(width: 8),
                OutlinedButton(onPressed: onCancel, child: const Text('取消')),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
