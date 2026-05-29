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

final List<ModelConfig> availableModels = [
  const ModelConfig(
    name: 'MiniCPM5-1B',
    description: '面壁智能 MiniCPM5 1B，2B以下AA榜单第一！超越Qwen3.5-2B，手机端极致轻量',
    url: 'https://www.modelscope.cn/models/OpenBMB/MiniCPM5-1B-GGUF/resolve/main/MiniCPM5-1B-Q4_K_M.gguf',
    filename: 'minicpm5-1b-q4_k_m.gguf',
    size: '656 MB',
    features: ['🔥新模型', 'AA榜单第一', '工具调用', 'Apache 2.0'],
    minRamGb: 2,
    tier: 'low',
  ),
  const ModelConfig(
    name: 'Qwen3.5-0.8B',
    description: '阿里巴巴 Qwen3.5 0.8B，极致轻量，极速推理！手机首选',
    url: 'https://www.modelscope.cn/models/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf',
    filename: 'qwen3.5-0.8b-q4_k_m.gguf',
    size: '508 MB',
    features: ['✅已验证', '极速推理', '中文优秀', 'Apache 2.0'],
    minRamGb: 2,
    tier: 'low',
  ),
  const ModelConfig(
    name: 'Qwen3-1.7B',
    description: 'Qwen3 1.7B，中文王者！速度质量完美平衡',
    url: 'https://www.modelscope.cn/models/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    filename: 'qwen3-1.7b-q4_k_m.gguf',
    size: '1.06 GB',
    features: ['✅已验证', '🔥强烈推荐', '中文最佳', 'Apache 2.0'],
    minRamGb: 3,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'Qwen3-4B',
    description: 'Qwen3 4B，性能飞跃！代码推理全能',
    url: 'https://www.modelscope.cn/models/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf',
    filename: 'qwen3-4b-q4_k_m.gguf',
    size: '2.3 GB',
    features: ['✅已验证', '代码强', '推理强', 'Apache 2.0'],
    minRamGb: 5,
    tier: 'high',
  ),
  const ModelConfig(
    name: 'Qwen3.5-4B',
    description: 'Qwen3.5 4B，最新一代！多模态原生支持，中文天花板',
    url: 'https://www.modelscope.cn/models/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf',
    filename: 'qwen3.5-4b-q4_k_m.gguf',
    size: '2.55 GB',
    features: ['✅已验证', '多模态', '代码生成', '中文最强'],
    minRamGb: 6,
    tier: 'high',
  ),
  const ModelConfig(
    name: 'Llama-3.2-3B',
    description: 'Meta Llama 3.2 3B，工具调用强，综合优秀',
    url: 'https://www.modelscope.cn/models/unsloth/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-3b-q4_k_m.gguf',
    size: '1.9 GB',
    features: ['✅已验证', '工具调用', '英文好', 'LLaMA 协议'],
    minRamGb: 5,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'Gemma-2-2B',
    description: 'Google Gemma 2 2B，轻量高效，多语言支持',
    url: 'https://www.modelscope.cn/models/CruiseTian/gemma-2b-gguf-quantized/resolve/main/gemma-2b-Q4_K_M.gguf',
    filename: 'gemma-2-2b-q4_k_m.gguf',
    size: '1.5 GB',
    features: ['✅已验证', 'Google', '多语言', '研究价值'],
    minRamGb: 4,
    tier: 'medium',
  ),
  const ModelConfig(
    name: 'DeepSeek-R1-14B',
    description: '深度求索 R1 蒸馏版，推理能力顶尖，思维链强',
    url: 'https://www.modelscope.cn/models/unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf',
    filename: 'deepseek-r1-14b-q4_k_m.gguf',
    size: '9 GB',
    features: ['✅已验证', '推理顶尖', '思维链', 'MIT协议'],
    minRamGb: 10,
    tier: 'high',
  ),
];
