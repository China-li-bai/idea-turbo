import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

import '../../data/models/model_config.dart';
import '../../data/services/device_performance_service.dart';
import '../../pet/pet_app_shell.dart';

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
  String? _modelPath;
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
    for (final model in availableModels) {
      final file = File('${dir.path}/${model.filename}');
      if (await file.exists()) {
        setState(() {
          _modelPath = file.path;
          _downloadStatus = '已下载: ${model.name}';
        });
        return;
      }
    }
  }

  Future<void> _downloadModel(ModelConfig model) async {
    setState(() {
      _isDownloading = true;
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
          if (total > 0) {
            setState(() {
              _downloadProgress = received / total;
              _downloadStatus =
                  '下载中: ${model.name} ${(_downloadProgress * 100).toStringAsFixed(1)}%';
            });
          }
        },
      );

      setState(() {
        _modelPath = savePath;
        _downloadStatus = '下载完成: ${model.name}';
        _isDownloading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${model.name} 下载完成！')),
        );
      }
    } catch (e) {
      if (e is DioException && e.type == DioExceptionType.cancel) {
        setState(() {
          _downloadStatus = '下载已取消';
        });
      } else {
        setState(() {
          _downloadStatus = '下载失败: $e';
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('下载失败: $e')),
          );
        }
      }
      setState(() {
        _isDownloading = false;
      });
    }
  }

  void _cancelDownload() {
    _cancelToken?.cancel();
  }

  void _goToChat() {
    if (_modelPath != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PetAppShell(modelPath: _modelPath!),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayModels = _showAllModels
        ? availableModels
        : _devicePerformance?.recommendedModels ?? availableModels;

    return Scaffold(
      appBar: AppBar(
        title: const Text('本地 LLM 模型下载'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_isEvaluating)
              const Center(child: CircularProgressIndicator())
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
                        Icon(Icons.phone_android, color: _devicePerformance!.color),
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
                    Text('推荐: ${_devicePerformance!.recommendedModels.length} 个模型'),
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
                            icon: Icon(_showAllModels ? Icons.visibility_off : Icons.visibility),
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
                  color: _modelPath != null ? Colors.green[100] : Colors.blue[100],
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
                icon: const Icon(Icons.pets),
                label: const Text('唤醒镇岳'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
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
                  final isRecommended = _devicePerformance?.recommendedModels.any((m) => m.name == model.name) ?? false;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: isRecommended ? Colors.green[50] : null,
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
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
                                .map((f) => Chip(
                                      label: Text(f),
                                      backgroundColor: Colors.deepPurple[50],
                                    ))
                                .toList(),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _isDownloading
                                      ? null
                                      : () => _downloadModel(model),
                                  icon: const Icon(Icons.download),
                                  label: const Text('下载'),
                                ),
                              ),
                              if (_isDownloading) ...[
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
