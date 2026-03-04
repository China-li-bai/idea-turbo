/**
 * ============================================================
 *   🎤 Kokoro TTS + sherpa-onnx 完整示例索引
 * ============================================================
 * 
 * 这个文件汇总了所有可用的示例和使用方法
 */

// ============ 文件说明 ============
export const EXAMPLES = {
  // 快速入门
  'run-all-in-one.js': {
    description: '一体化示例 - 无需安装依赖即可运行',
    features: ['自动模拟模式', '中英文支持', '多说话人', '语速调节'],
    command: 'node run-all-in-one.js',
    note: '推荐新手使用'
  },
  
  // 真实 TTS 示例
  'examples/quick-start.js': {
    description: '最简单的 TTS 示例',
    features: ['最小代码', '自动下载模型'],
    command: 'node examples/quick-start.js',
    requirements: ['npm install kokoro-js']
  },
  
  'examples/basic-tts.js': {
    description: '完整 TTS 功能演示',
    features: ['多说话人', '多语言', '语速调节', '长文本'],
    command: 'node examples/basic-tts.js',
    requirements: ['npm install kokoro-js']
  },
  
  'examples/onnx-direct.js': {
    description: '直接使用 ONNX Runtime',
    features: ['更接近 sherpa-onnx 用法', '手动加载模型'],
    command: 'node examples/onnx-direct.js',
    requirements: ['npm install onnxruntime-node']
  },
  
  'examples/browser-tts.js': {
    description: '浏览器端 TTS',
    features: ['WebAssembly 支持', '实时播放'],
    command: '配合 Vite/Webpack 使用',
    requirements: ['浏览器环境']
  }
};

// ============ 模型下载源 ============
export const MODEL_SOURCES = {
  // 推荐源
  'onnx-community': {
    url: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX',
    formats: ['fp32', 'fp16', 'q8', 'q4'],
    recommended: 'q8'
  },
  
  'thewh1teagle': {
    url: 'https://github.com/thewh1teagle/kokoro-onnx/releases',
    formats: ['fp32', 'fp16'],
    recommended: 'fp16'
  },
  
  'NeuML': {
    url: 'https://huggingface.co/NeuML/kokoro-fp16-onnx',
    formats: ['fp16'],
    recommended: 'fp16'
  },
  
  // sherpa-onnx 兼容
  'sherpa-onnx': {
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases',
    formats: ['fp32'],
    note: 'sherpa-onnx 官方模型'
  }
};

// ============ 量化格式对比 ============
export const QUANTIZATION = {
  fp32: { size: '~350MB', quality: '⭐⭐⭐⭐⭐', use: '桌面/服务器' },
  fp16: { size: '~170MB', quality: '⭐⭐⭐⭐⭐', use: '通用' },
  q8:   { size: '~100MB', quality: '⭐⭐⭐⭐', use: '移动端/浏览器 (推荐)' },
  q4:   { size: '~60MB',  quality: '⭐⭐⭐', use: '极限体积' },
  int8: { size: '~103MB', quality: '⭐⭐⭐⭐', use: 'sherpa-onnx 兼容' }
};

// ============ 可用说话人 ============
export const VOICES = {
  english_us_female: ['af_sky', 'af_bella', 'af_nicole', 'af_heart', 'af_jessica'],
  english_us_male: ['am_michael', 'am_adam', 'am_emmanuel'],
  english_uk_female: ['bf_emma', 'bf_alice', 'bf_lily'],
  english_uk_male: ['bm_george', 'bm_lewis', 'bm_daniel'],
};

// ============ 使用说明 ============
export const QUICK_START = `
# 快速开始

## 方法 1: 一体化示例 (推荐新手)
node run-all-in-one.js

## 方法 2: 安装 kokoro-js
npm install kokoro-js
node examples/quick-start.js

## 方法 3: 使用 ONNX Runtime
npm install onnxruntime-node
node examples/onnx-direct.js

# 模型下载

## 自动下载 (推荐)
首次运行时自动下载

## 手动下载
node scripts/download-model.js --dtype q8 --output ./models

# 下载预构建模型

## HuggingFace
wget https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_q8.onnx

## GitHub
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/v1.0/kokoro-v1.0.fp16.onnx
`;

console.log('📚 Kokoro TTS 示例索引');
console.log('详细使用方法请查看 README.md 或运行: node run-all-in-one.js');
