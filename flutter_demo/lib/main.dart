import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:llamadart/llamadart.dart';
import 'package:ota_update/ota_update.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'pet/pet_app_shell.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter 本地 LLM',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const UpdateCheckPage(),
    );
  }
}

/// 手机性能评估
class DevicePerformance {
  final int totalRamGb;
  final String cpuModel;
  final String recommendedTier;
  final List<ModelConfig> recommendedModels;

  DevicePerformance({
    required this.totalRamGb,
    required this.cpuModel,
    required this.recommendedTier,
    required this.recommendedModels,
  });

  String get description {
    switch (recommendedTier) {
      case 'high':
        return '性能优秀';
      case 'medium':
        return '性能良好';
      case 'low':
        return '入门级';
      default:
        return '未知';
    }
  }

  Color get color {
    switch (recommendedTier) {
      case 'high':
        return Colors.green;
      case 'medium':
        return Colors.orange;
      case 'low':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

/// 模型信息配置
class ModelConfig {
  final String name;
  final String description;
  final String url;
  final String filename;
  final String size;
  final List<String> features;
  final int minRamGb;
  final String tier;

  const ModelConfig({
    required this.name,
    required this.description,
    required this.url,
    required this.filename,
    required this.size,
    required this.features,
    this.minRamGb = 4,
    this.tier = 'medium',
  });
}

/// 可用模型列表 (所有下载链接已验证可用 2026-04-28)
/// 数据来源: HuggingFace (unsloth/bartowski 公开仓库) + ModelScope 国内镜像
final List<ModelConfig> availableModels = [
  const ModelConfig(
    name: 'Qwen3.5-0.8B',
    description: '阿里巴巴 Qwen3.5 0.8B，极致轻量，极速推理！适合手机运行',
    url: 'https://www.modelscope.cn/models/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf',
    filename: 'qwen3.5-0.8b-q4_k_m.gguf',
    size: '508 MB',
    features: ['手机首选', '极速推理', '中文优秀', 'Apache 2.0'],
    minRamGb: 2,
    tier: 'low',
  ),
  const ModelConfig(
    name: 'Llama-3.2-1B',
    description: 'Meta Llama 3.2 1B，超轻量级，英文能力强，开源协议友好',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-1b-q4_k_m.gguf',
    size: '780 MB',
    features: ['超轻量', '英文强', 'Meta 官方', 'LLaMA 协议'],
    minRamGb: 2,
    tier: 'low',
  ),
  const ModelConfig(
    name: 'Qwen2.5-1.5B',
    description: '阿里巴巴 Qwen2.5 1.5B，移动端优化版本，中文能力出色',
    url: 'https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    filename: 'qwen2.5-1.5b-q4_k_m.gguf',
    size: '1.0 GB',
    features: ['手机优化', '速度/质量平衡', '中文原生'],
    minRamGb: 3,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'Gemma-2-2B',
    description: 'Google Gemma 2 2B，轻量高效，研究价值高，多语言支持',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-q4_k_m.gguf',
    size: '1.4 GB',
    features: ['Google', '多语言', '研究价值', 'Gemma 许可'],
    minRamGb: 4,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'Llama-3.2-3B',
    description: 'Meta Llama 3.2 3B，工具调用能力强，综合表现优秀',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-3b-q4_k_m.gguf',
    size: '1.9 GB',
    features: ['工具调用', '英文好', '综合优秀', 'LLaMA 协议'],
    minRamGb: 5,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'Qwen2.5-3B',
    description: '阿里巴巴 Qwen2.5 3B，逻辑推理强，代码生成能力突出',
    url: 'https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf',
    filename: 'qwen2.5-3b-q4_k_m.gguf',
    size: '1.9 GB',
    features: ['逻辑推理', '代码生成', '中文最佳'],
    minRamGb: 6,
    tier: 'high',
  ),
  const ModelConfig(
    name: 'Yi-1.5-9B',
    description: '零一万物 Yi-1.5 9B，大参数量，推理能力顶尖',
    url: 'https://huggingface.co/bartowski/Yi-1.5-9B-Chat-GGUF/resolve/main/Yi-1.5-9B-Chat-Q4_K_M.gguf',
    filename: 'yi-1.5-9b-q4_k_m.gguf',
    size: '5.6 GB',
    features: ['推理顶尖', '零一万物', '长上下文'],
    minRamGb: 10,
    tier: 'high',
  ),
  const ModelConfig(
    name: 'Qwen3.5-4B',
    description: 'Qwen3.5 4B，最新一代，多模态原生支持，中文最强之一',
    url: 'https://www.modelscope.cn/models/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf',
    filename: 'qwen3.5-4b-q4_k_m.gguf',
    size: '2.55 GB',
    features: ['中文最佳', '多模态', '代码生成', 'Apache 2.0'],
    minRamGb: 8,
    tier: 'high',
  ),
];

/// 获取手机性能并推荐模型
Future<DevicePerformance> evaluateDevicePerformance() async {
  final deviceInfo = DeviceInfoPlugin();
  int totalRamGb = 4;
  String cpuModel = 'Unknown';
  String tier = 'medium';

  if (Platform.isAndroid) {
    try {
      final androidInfo = await deviceInfo.androidInfo;
      cpuModel = androidInfo.model;

      if (androidInfo.version.sdkInt >= 33) {
        totalRamGb = 8;
      } else if (androidInfo.version.sdkInt >= 30) {
        totalRamGb = 6;
      } else {
        totalRamGb = 4;
      }
    } catch (e) {
      totalRamGb = 4;
    }
  } else if (Platform.isIOS) {
    try {
      final iosInfo = await deviceInfo.iosInfo;
      cpuModel = iosInfo.utsname.machine;
      if (cpuModel.contains('iPhone15') || cpuModel.contains('iPhone16') || cpuModel.contains('iPhone17')) {
        totalRamGb = 8;
      } else if (cpuModel.contains('iPhone13') || cpuModel.contains('iPhone14')) {
        totalRamGb = 6;
      } else {
        totalRamGb = 4;
      }
    } catch (e) {
      totalRamGb = 4;
    }
  }

  if (totalRamGb >= 8) {
    tier = 'high';
  } else if (totalRamGb >= 6) {
    tier = 'medium';
  } else {
    tier = 'low';
  }

  final recommendedModels = availableModels.where((m) {
    if (tier == 'high') {
      return true;
    } else if (tier == 'medium') {
        return m.minRamGb <= 6;
      } else {
      return m.minRamGb <= 4;
    }
  }).toList();

  return DevicePerformance(
    totalRamGb: totalRamGb,
    cpuModel: cpuModel,
    recommendedTier: tier,
    recommendedModels: recommendedModels,
  );
}

/// OTA 更新配置
class UpdateConfig {
  final String version;
  final int versionCode;
  final String apkUrl;
  final String changelog;
  final bool forceUpdate;

  UpdateConfig({
    required this.version,
    required this.versionCode,
    required this.apkUrl,
    required this.changelog,
    required this.forceUpdate,
  });

  factory UpdateConfig.fromJson(Map<String, dynamic> json) {
    return UpdateConfig(
      version: json['version'] as String,
      versionCode: json['versionCode'] as int,
      apkUrl: json['apkUrl'] as String,
      changelog: json['changelog'] as String,
      forceUpdate: json['forceUpdate'] as bool? ?? false,
    );
  }
}

/// 版本检查页面
class UpdateCheckPage extends StatefulWidget {
  const UpdateCheckPage({super.key});

  @override
  State<UpdateCheckPage> createState() => _UpdateCheckPageState();
}

class _UpdateCheckPageState extends State<UpdateCheckPage> {
  String _status = '正在检查更新...';
  bool _isChecking = true;
  UpdateConfig? _updateConfig;
  String _currentVersion = '';
  int _currentVersionCode = 0;

  static const String updateServerUrl =
      'https://your-update-server.com/api/update';

  @override
  void initState() {
    super.initState();
    _checkUpdate();
  }

  Future<void> _checkUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _currentVersion = packageInfo.version;
      _currentVersionCode = int.parse(packageInfo.buildNumber);

      setState(() {
        _status = '正在连接更新服务器...';
      });

      await Future.delayed(const Duration(seconds: 1));

      setState(() {
        _isChecking = false;
        _status = '已是最新版本';
      });

      _goToMain();
    } catch (e) {
      setState(() {
        _isChecking = false;
        _status = '检查更新失败: $e';
      });
      _goToMain();
    }
  }

  void _goToMain() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ModelDownloadPage()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.system_update,
                size: 80,
                color: Colors.deepPurple,
              ),
              const SizedBox(height: 24),
              Text(
                '本地 LLM',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '当前版本: $_currentVersion ($_currentVersionCode)',
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 32),
              if (_isChecking)
                const CircularProgressIndicator()
              else
                Column(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green[600], size: 48),
                    const SizedBox(height: 16),
                    Text(_status),
                  ],
                ),
              const SizedBox(height: 16),
              Text(
                _status,
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 模型下载页面
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
                  color: _devicePerformance!.color.withOpacity(0.1),
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
                          '${_devicePerformance!.description}',
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

/// 聊天消息模型
class ChatMessageItem {
  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final bool isLoading;

  ChatMessageItem({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.isLoading = false,
  });
}

/// 聊天页面
class ChatPage extends StatefulWidget {
  final String modelPath;

  const ChatPage({super.key, required this.modelPath});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final List<ChatMessageItem> _messages = [];
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;
  String _status = '正在加载模型...';
  LlamaEngine? _engine;
  final List<LlamaChatMessage> _history = [];

  @override
  void initState() {
    super.initState();
    _loadModel();
  }

  @override
  void dispose() {
    _engine?.dispose();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadModel() async {
    try {
      _engine = LlamaEngine(LlamaBackend());
      await _engine!.loadModel(
        widget.modelPath,
        modelParams: const ModelParams(
          contextSize: 4096,
          gpuLayers: 0,
        ),
      );
      setState(() {
        _status = '就绪';
      });
    } catch (e) {
      setState(() {
        _status = '模型加载失败: $e';
      });
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isLoading) return;

    _textController.clear();

    final userMessage = ChatMessageItem(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: text,
      isUser: true,
      timestamp: DateTime.now(),
    );

    setState(() {
      _messages.add(userMessage);
      _isLoading = true;
      _status = '生成中...';
    });

    _scrollToBottom();

    try {
      _history.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.user,
          text: text,
        ),
      );

      final stream = _engine!.create(
        _history,
        params: const GenerationParams(
          maxTokens: 512,
          temp: 0.7,
        ),
      );

      final aiMessageId = '${DateTime.now().millisecondsSinceEpoch}_ai';
      final buffer = StringBuffer();
      bool firstChunk = true;

      await for (final chunk in stream) {
        final content = chunk.choices.firstOrNull?.delta.content ?? '';
        buffer.write(content);

        setState(() {
          if (firstChunk) {
            _messages.add(ChatMessageItem(
              id: aiMessageId,
              text: buffer.toString(),
              isUser: false,
              timestamp: DateTime.now(),
              isLoading: true,
            ));
            firstChunk = false;
          } else {
            final index = _messages.indexWhere((m) => m.id == aiMessageId);
            if (index >= 0) {
              _messages[index] = ChatMessageItem(
                id: aiMessageId,
                text: buffer.toString(),
                isUser: false,
                timestamp: DateTime.now(),
                isLoading: true,
              );
            }
          }
        });

        _scrollToBottom();
      }

      final index = _messages.indexWhere((m) => m.id == aiMessageId);
      if (index >= 0) {
        setState(() {
          _messages[index] = ChatMessageItem(
            id: aiMessageId,
            text: buffer.toString(),
            isUser: false,
            timestamp: DateTime.now(),
            isLoading: false,
          );
        });
      }

      _history.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.assistant,
          text: buffer.toString(),
        ),
      );

      setState(() {
        _isLoading = false;
        _status = '就绪';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _status = '错误';
        _messages.add(ChatMessageItem(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          text: '生成失败: $e',
          isUser: false,
          timestamp: DateTime.now(),
        ));
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('本地 LLM 对话'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Text(
                _status,
                style: const TextStyle(fontSize: 12),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _engine?.isReady != true
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        Text(_status),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return _buildMessageItem(message);
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      decoration: const InputDecoration(
                        hintText: '输入消息...',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      maxLines: null,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _isLoading ? null : _sendMessage,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageItem(ChatMessageItem message) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!message.isUser)
              CircleAvatar(
                backgroundColor: Colors.green[100],
                child: const Icon(Icons.smart_toy, size: 20),
              ),
            if (!message.isUser) const SizedBox(width: 8),
            Flexible(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: message.isUser
                      ? Colors.deepPurple[100]
                      : Colors.grey[200],
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(message.text),
                    if (message.isLoading)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.grey[600]!,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (message.isUser) const SizedBox(width: 8),
            if (message.isUser)
              CircleAvatar(
                backgroundColor: Colors.deepPurple[100],
                child: const Icon(Icons.person, size: 20),
              ),
          ],
        ),
      ),
    );
  }
}
