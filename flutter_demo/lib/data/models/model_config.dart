import 'package:flutter/material.dart';

class DevicePerformance {
  final int totalRamGb;
  final String cpuModel;
  final String recommendedTier;
  final List<ModelConfig> recommendedModels;

  const DevicePerformance({
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

const selectedModelFilenamePrefsKey = 'selected_model_filename';
const defaultModelFilename = 'minicpm5-1b-q4_k_m.gguf';

ModelConfig get defaultModelConfig => availableModels.firstWhere(
  (model) => model.filename == defaultModelFilename,
  orElse: () => availableModels.first,
);

ModelConfig? findModelByFilename(String? filename) {
  if (filename == null || filename.isEmpty) return null;

  for (final model in availableModels) {
    if (model.filename == filename) return model;
  }

  return null;
}

final List<ModelConfig> availableModels = [
  const ModelConfig(
    name: 'MiniCPM5-1B',
    description:
        '面壁智能 MiniCPM5 1B，端侧推理。'
        '内置 Hybrid Reasoning（<think> 块），中英文均衡，'
        '1B 甜点级，最低 2GB 内存即可。'
        '原生上下文 128K，移动端建议 4K-8K。',
    url:
        'https://www.modelscope.cn/models/OpenBMB/MiniCPM5-1B-GGUF/resolve/main/MiniCPM5-1B-Q4_K_M.gguf',
    filename: 'minicpm5-1b-q4_k_m.gguf',
    size: '656 MB',
    features: ['端侧优先', 'Hybrid Reasoning', '128K 上下文', 'Apache 2.0'],
    minRamGb: 2,
    tier: 'low',
  ),
  const ModelConfig(
    name: 'Qwen3.5-0.8B',
    description: '阿里巴巴 Qwen3.5 0.8B，轻量，适合低内存设备。',
    url:
        'https://www.modelscope.cn/models/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf',
    filename: 'qwen3.5-0.8b-q4_k_m.gguf',
    size: '508 MB',
    features: ['轻量', '中文', 'Apache 2.0'],
    minRamGb: 2,
    tier: 'low',
  ),
  const ModelConfig(
    name: 'Qwen3-1.7B',
    description: 'Qwen3 1.7B，中文能力和推理速度相对均衡。',
    url:
        'https://www.modelscope.cn/models/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    filename: 'qwen3-1.7b-q4_k_m.gguf',
    size: '1.06 GB',
    features: ['中文', '均衡', 'Apache 2.0'],
    minRamGb: 3,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'Qwen3-4B',
    description: 'Qwen3 4B，质量更高，但对内存和速度要求也更高。',
    url:
        'https://www.modelscope.cn/models/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf',
    filename: 'qwen3-4b-q4_k_m.gguf',
    size: '2.3 GB',
    features: ['代码', '推理', 'Apache 2.0'],
    minRamGb: 5,
    tier: 'high',
  ),
  const ModelConfig(
    name: 'Qwen3.5-4B',
    description: 'Qwen3.5 4B，质量较高，适合性能更好的设备。',
    url:
        'https://www.modelscope.cn/models/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf',
    filename: 'qwen3.5-4b-q4_k_m.gguf',
    size: '2.55 GB',
    features: ['中文', '代码', '高质量'],
    minRamGb: 6,
    tier: 'high',
  ),
  const ModelConfig(
    name: 'Llama-3.2-3B',
    description: 'Meta Llama 3.2 3B，英文和通用任务表现稳定。',
    url:
        'https://www.modelscope.cn/models/unsloth/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-3b-q4_k_m.gguf',
    size: '1.9 GB',
    features: ['通用', '英文', 'LLaMA 协议'],
    minRamGb: 5,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'Gemma-2-2B',
    description: 'Google Gemma 2 2B，轻量，多语言支持。',
    url:
        'https://www.modelscope.cn/models/CruiseTian/gemma-2b-gguf-quantized/resolve/main/gemma-2b-Q4_K_M.gguf',
    filename: 'gemma-2-2b-q4_k_m.gguf',
    size: '1.5 GB',
    features: ['Google', '多语言', '轻量'],
    minRamGb: 4,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'DeepSeek-R1-14B',
    description: 'DeepSeek R1 蒸馏版，推理能力强，但体积大，不适合普通手机。',
    url:
        'https://www.modelscope.cn/models/unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf',
    filename: 'deepseek-r1-14b-q4_k_m.gguf',
    size: '9 GB',
    features: ['推理', '大模型', 'MIT'],
    minRamGb: 10,
    tier: 'high',
  ),
];
