import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/model_config.dart';
import '../../data/services/device_performance_service.dart';
import '../../pet/pet_app_shell.dart';
import '../design/memory_design.dart';

class ModelDownloadPage extends StatefulWidget {
  const ModelDownloadPage({super.key});

  @override
  State<ModelDownloadPage> createState() => _ModelDownloadPageState();
}

class _ModelDownloadPageState extends State<ModelDownloadPage> {
  String? _downloadStatus;
  double _downloadProgress = 0;
  bool _isDownloading = false;
  CancelToken? _cancelToken;
  String? _downloadingFilename;
  String? _modelPath;
  ModelConfig? _selectedModel;
  final Map<String, String> _downloadedPaths = {};
  DevicePerformance? _devicePerformance;
  bool _isEvaluating = true;
  bool _showAllModels = false;

  @override
  void initState() {
    super.initState();
    _evaluateDevice();
  }

  Future<void> _evaluateDevice() async {
    try {
      final perf = await evaluateDevicePerformance();
      setState(() {
        _devicePerformance = perf;
        _isEvaluating = false;
      });
      _checkExistingModel();
    } catch (e) {
      setState(() {
        _isEvaluating = false;
      });
    }
  }

  Future<void> _checkExistingModel() async {
    final dir = await getApplicationDocumentsDirectory();
    final prefs = await SharedPreferences.getInstance();
    _downloadedPaths.clear();

    for (final model in availableModels) {
      final file = File('${dir.path}/${model.filename}');
      if (await file.exists()) {
        _downloadedPaths[model.filename] = file.path;
      }
    }

    final preferredModel =
        findModelByFilename(prefs.getString(selectedModelFilenamePrefsKey)) ??
        defaultModelConfig;
    final selectedPath = _downloadedPaths[preferredModel.filename];
    final fallbackEntry = _downloadedPaths.entries.isEmpty
        ? null
        : _downloadedPaths.entries.first;
    final fallbackModel = findModelByFilename(fallbackEntry?.key);

    if (!mounted) return;
    setState(() {
      if (selectedPath != null) {
        _selectedModel = preferredModel;
        _modelPath = selectedPath;
        _downloadStatus = '当前使用: ${preferredModel.name}';
      } else if (fallbackEntry != null && fallbackModel != null) {
        _selectedModel = fallbackModel;
        _modelPath = fallbackEntry.value;
        _downloadStatus = '已下载: ${fallbackModel.name}';
      } else {
        _selectedModel = defaultModelConfig;
        _modelPath = null;
        _downloadStatus = '请选择并下载一个本地模型';
      }
    });

    if (_modelPath != null && _selectedModel != null) {
      await prefs.setString(
        selectedModelFilenamePrefsKey,
        _selectedModel!.filename,
      );
    }
  }

  Future<void> _downloadModel(ModelConfig model) async {
    setState(() {
      _isDownloading = true;
      _downloadingFilename = model.filename;
      _downloadProgress = 0;
      _downloadStatus = '正在下载 ${model.name}...';
    });

    _cancelToken = CancelToken();

    try {
      final dir = await getApplicationDocumentsDirectory();
      final savePath = '${dir.path}/${model.filename}';

      final dio = Dio();
      await dio.download(
        model.url,
        savePath,
        cancelToken: _cancelToken,
        onReceiveProgress: (received, total) {
          if (total > 0 && mounted) {
            setState(() {
              _downloadProgress = received / total;
              _downloadStatus =
                  '下载中: ${model.name} ${(_downloadProgress * 100).toStringAsFixed(1)}%';
            });
          }
        },
      );

      await _selectDownloadedModel(model, savePath);

      if (!mounted) return;
      setState(() {
        _downloadStatus = '下载完成，当前使用: ${model.name}';
      });

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('${model.name} 下载完成！')));
      }
    } catch (e) {
      if (!mounted) return;
      if (e is DioException && e.type == DioExceptionType.cancel) {
        setState(() {
          _downloadStatus = '下载已取消';
        });
      } else {
        setState(() {
          _downloadStatus = '下载失败: $e';
        });
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('下载失败: $e')));
        }
      }
      if (!mounted) return;
      setState(() {
        _isDownloading = false;
        _downloadingFilename = null;
      });
    }
  }

  Future<void> _selectDownloadedModel(ModelConfig model, String path) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(selectedModelFilenamePrefsKey, model.filename);

    if (!mounted) return;
    setState(() {
      _downloadedPaths[model.filename] = path;
      _selectedModel = model;
      _modelPath = path;
      _isDownloading = false;
      _downloadingFilename = null;
      _downloadStatus = '当前使用: ${model.name}';
    });
  }

  void _cancelDownload() {
    _cancelToken?.cancel();
  }

  void _goToChat() {
    if (_modelPath != null) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => PetAppShell(modelPath: _modelPath!),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayModels =
        (_showAllModels
                ? availableModels
                : _devicePerformance?.recommendedModels ?? availableModels)
            .toList();
    final selectedModel = _selectedModel;
    if (selectedModel != null &&
        !displayModels.any(
          (model) => model.filename == selectedModel.filename,
        )) {
      displayModels.insert(0, selectedModel);
    }

    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      appBar: AppBar(
        title: const Text('本地人格核心'),
        backgroundColor: MemoryPalette.ink,
        foregroundColor: MemoryPalette.paper,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_isEvaluating)
              const Center(
                child: CircularProgressIndicator(color: MemoryPalette.gold),
              )
            else if (_devicePerformance != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _devicePerformance!.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _devicePerformance!.color),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.phone_android,
                          color: _devicePerformance!.color,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _devicePerformance!.description,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _devicePerformance!.color,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text('设备: ${_devicePerformance!.cpuModel}'),
                    Text('内存: ${_devicePerformance!.totalRamGb} GB+'),
                    const SizedBox(height: 8),
                    Text(
                      '推荐: ${_devicePerformance!.recommendedModels.length} 个模型',
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              setState(() {
                                _showAllModels = !_showAllModels;
                              });
                            },
                            icon: Icon(
                              _showAllModels
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                            ),
                            label: Text(_showAllModels ? '只看推荐' : '显示全部'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            if (_downloadStatus != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _modelPath != null
                      ? MemoryPalette.moss.withValues(alpha: 0.16)
                      : MemoryPalette.gold.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Text(
                      _downloadStatus!,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (_isDownloading) ...[
                      const SizedBox(height: 8),
                      LinearProgressIndicator(value: _downloadProgress),
                      const SizedBox(height: 4),
                      Text('${(_downloadProgress * 100).toStringAsFixed(1)}%'),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: 16),
            if (_modelPath != null)
              ElevatedButton.icon(
                onPressed: _goToChat,
                icon: const Icon(Icons.memory),
                label: const Text('唤醒镇岳'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: MemoryPalette.gold,
                  foregroundColor: MemoryPalette.ink,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            if (_modelPath != null) const SizedBox(height: 16),
            const Text(
              '选择要下载的模型：',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: displayModels.length,
                itemBuilder: (context, index) {
                  final model = displayModels[index];
                  final isRecommended =
                      _devicePerformance?.recommendedModels.any(
                        (m) => m.name == model.name,
                      ) ??
                      false;
                  final downloadedPath = _downloadedPaths[model.filename];
                  final isDownloaded = downloadedPath != null;
                  final isCurrent =
                      isDownloaded &&
                      _selectedModel?.filename == model.filename &&
                      _modelPath == downloadedPath;
                  final isDownloadingThis =
                      _isDownloading && _downloadingFilename == model.filename;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: isCurrent
                        ? MemoryPalette.gold.withValues(alpha: 0.16)
                        : isRecommended
                        ? MemoryPalette.moss.withValues(alpha: 0.12)
                        : MemoryPalette.paper.withValues(alpha: 0.05),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Text(
                                  model.name,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (isRecommended)
                                    Container(
                                      margin: const EdgeInsets.only(right: 8),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.green[600],
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Text(
                                        '推荐',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  if (isCurrent)
                                    Container(
                                      margin: const EdgeInsets.only(right: 8),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: MemoryPalette.gold,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Text(
                                        '当前',
                                        style: TextStyle(
                                          color: MemoryPalette.ink,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  Text(
                                    model.size,
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(model.description),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: model.features
                                .map(
                                  (f) => Chip(
                                    label: Text(f),
                                    backgroundColor: MemoryPalette.gold
                                        .withValues(alpha: 0.12),
                                  ),
                                )
                                .toList(),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _isDownloading
                                      ? null
                                      : isCurrent
                                      ? null
                                      : isDownloaded
                                      ? () => _selectDownloadedModel(
                                          model,
                                          downloadedPath,
                                        )
                                      : () => _downloadModel(model),
                                  icon: Icon(
                                    isCurrent
                                        ? Icons.check_circle
                                        : isDownloaded
                                        ? Icons.memory
                                        : Icons.download,
                                  ),
                                  label: Text(
                                    isCurrent
                                        ? '正在使用'
                                        : isDownloaded
                                        ? '使用这个模型'
                                        : '下载并使用',
                                  ),
                                ),
                              ),
                              if (isDownloadingThis) ...[
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  onPressed: _cancelDownload,
                                  icon: const Icon(Icons.cancel),
                                  label: const Text('取消'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.red,
                                    foregroundColor: Colors.white,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
