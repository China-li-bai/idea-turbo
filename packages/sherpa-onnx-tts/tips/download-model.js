/**
 * 模型下载脚本
 * 
 * 用法: node scripts/download-model.js [options]
 * 
 * 选项:
 *   --model    模型名称 (默认: kokoro-v1.0)
 *   --dtype    精度: fp32, fp16, int8 (默认: fp16)
 *   --output   输出目录 (默认: ./models)
 */

import { writeFile, mkdir, access } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// ============ 模型配置 ============
const MODELS = {
  // thewh1teagle/kokoro-onnx
  'thewh1teagle': {
    repo: 'thewh1teagle/kokoro-onnx',
    baseUrl: 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/v1.0',
    files: {
      fp32: 'kokoro-v1.0.onnx',
      fp16: 'kokoro-v1.0.fp16.onnx',
    },
    voices: 'voices.bin',
    tokens: 'tokens.txt',
  },
  
  // onnx-community/Kokoro-82M-ONNX
  'onnx-community': {
    repo: 'onnx-community/Kokoro-82M-ONNX',
    baseUrl: 'https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main',
    files: {
      fp32: 'onnx/model.onnx',
      fp16: 'onnx/model.fp16.onnx',
      int8: 'onnx/model.int8.onnx',
      q8: 'onnx/model_q8.onnx',
      q4: 'onnx/model_q4.onnx',
    },
    voices: 'voices.bin',
    tokens: 'tokens.txt',
  },
  
  // NeuML/kokoro-fp16-onnx
  'neuml': {
    repo: 'NeuML/kokoro-fp16-onnx',
    baseUrl: 'https://huggingface.co/NeuML/kokoro-fp16-onnx/resolve/main',
    files: {
      fp16: 'model.onnx',
    },
    voices: 'voices.bin',
  },
};

// ============ 下载器 ============
class ModelDownloader {
  constructor(outputDir = './models') {
    this.outputDir = outputDir;
  }
  
  async download(url, filename, showProgress = true) {
    const filepath = join(this.outputDir, filename);
    
    if (existsSync(filepath)) {
      console.log(`✅ 已存在: ${filename}`);
      return filepath;
    }
    
    console.log(`⬇️  下载: ${filename}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }
    
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    let downloaded = 0;
    
    const chunks = [];
    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      downloaded += value.length;
      
      if (showProgress && contentLength > 0) {
        const percent = ((downloaded / contentLength) * 100).toFixed(1);
        const mb = (downloaded / 1024 / 1024).toFixed(2);
        const total = (contentLength / 1024 / 1024).toFixed(2);
        process.stdout.write(`\r   进度: ${percent}% (${mb}/${total} MB)`);
      }
    }
    
    console.log('\n');
    
    const buffer = Buffer.concat(chunks);
    await writeFile(filepath, buffer);
    
    return filepath;
  }
  
  async ensureDir() {
    if (!existsSync(this.outputDir)) {
      await mkdir(this.outputDir, { recursive: true });
    }
  }
}

// ============ 主程序 ============
async function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  const getArg = (name, defaultValue) => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : defaultValue;
  };
  
  const modelSource = getArg('--source', 'thewh1teagle');
  const dtype = getArg('--dtype', 'fp16');
  const outputDir = getArg('--output', './models');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('              📦 Kokoro ONNX 模型下载器');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const config = MODELS[modelSource];
  if (!config) {
    console.error(`❌ 未知的模型源: ${modelSource}`);
    console.log('可用的模型源:', Object.keys(MODELS).join(', '));
    process.exit(1);
  }
  
  console.log(`📋 模型源: ${config.repo}`);
  console.log(`🎯 精度: ${dtype}`);
  console.log(`📁 输出目录: ${outputDir}\n`);
  
  const downloader = new ModelDownloader(outputDir);
  await downloader.ensureDir();
  
  // 下载模型文件
  const modelFile = config.files[dtype];
  if (!modelFile) {
    console.error(`❌ 不支持的精度: ${dtype}`);
    console.log('可用的精度:', Object.keys(config.files).join(', '));
    process.exit(1);
  }
  
  const modelUrl = `${config.baseUrl}/${modelFile}`;
  await downloader.download(modelUrl, modelFile.split('/').pop());
  
  // 下载 voices
  if (config.voices) {
    try {
      const voicesUrl = `${config.baseUrl}/${config.voices}`;
      await downloader.download(voicesUrl, config.voices);
    } catch (e) {
      console.log(`⚠️  voices 下载失败，尝试其他源...`);
      // 尝试从其他源下载 voices
      const altVoicesUrl = 'https://huggingface.co/thewh1teagle/kokoro-onnx/resolve/main/voices.bin';
      await downloader.download(altVoicesUrl, 'voices.bin').catch(() => {});
    }
  }
  
  // 下载 tokens
  if (config.tokens) {
    try {
      const tokensUrl = `${config.baseUrl}/${config.tokens}`;
      await downloader.download(tokensUrl, config.tokens);
    } catch (e) {
      console.log(`⚠️  tokens 下载失败`);
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('                 ✅ 下载完成!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📁 模型保存在: ${outputDir}`);
}

main().catch((err) => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
