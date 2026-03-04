/**
 * 使用 ONNX Runtime 直接运行 Kokoro TTS
 * 更接近 sherpa-onnx 的使用方式
 * 
 * 运行: node examples/onnx-direct.js
 */

import * as ort from 'onnxruntime-node';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { huggingface_hub } from 'huggingface_hub';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============ 配置 ============
const CONFIG = {
  // HuggingFace 模型仓库
  modelRepo: 'thewh1teagle/kokoro-onnx',
  
  // 模型文件
  modelFile: 'kokoro-v1.0.fp16.onnx',  // 或 kokoro-v1.0.onnx (fp32)
  voicesFile: 'voices.bin',
  tokensFile: 'tokens.txt',
  
  // 本地缓存目录
  cacheDir: join(__dirname, '../models'),
};

// ============ Kokoro ONNX 引擎 ============
class KokoroOnnxEngine {
  constructor(config = CONFIG) {
    this.config = config;
    this.session = null;
    this.voices = null;
    this.tokens = null;
  }
  
  /**
   * 初始化引擎
   */
  async init() {
    console.log('🔄 初始化 Kokoro ONNX 引擎...\n');
    
    // 确保缓存目录存在
    if (!existsSync(this.config.cacheDir)) {
      const { mkdir } = await import('fs/promises');
      await mkdir(this.config.cacheDir, { recursive: true });
    }
    
    // 下载/加载模型
    const modelPath = await this.downloadModel();
    const voicesPath = await this.downloadVoices();
    const tokensPath = await this.downloadTokens();
    
    // 创建 ONNX Runtime session
    console.log('📦 加载 ONNX 模型...');
    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all'
    });
    console.log('✅ 模型加载完成!\n');
    
    // 加载 voices
    this.voices = await this.loadVoices(voicesPath);
    
    // 加载 tokens
    this.tokens = await this.loadTokens(tokensPath);
    
    return this;
  }
  
  /**
   * 下载模型文件
   */
  async downloadModel() {
    const localPath = join(this.config.cacheDir, this.config.modelFile);
    
    if (existsSync(localPath)) {
      console.log(`✅ 模型已存在: ${localPath}`);
      return localPath;
    }
    
    console.log(`⬇️  下载模型: ${this.config.modelFile}`);
    
    // 使用 huggingface_hub 下载
    const url = `https://huggingface.co/${this.config.modelRepo}/resolve/main/${this.config.modelFile}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(localPath, buffer);
    
    console.log(`✅ 模型已保存: ${localPath}`);
    return localPath;
  }
  
  async downloadVoices() {
    const localPath = join(this.config.cacheDir, this.config.voicesFile);
    
    if (existsSync(localPath)) {
      return localPath;
    }
    
    console.log(`⬇️  下载 voices...`);
    const url = `https://huggingface.co/${this.config.modelRepo}/resolve/main/${this.config.voicesFile}`;
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(localPath, buffer);
    
    return localPath;
  }
  
  async downloadTokens() {
    const localPath = join(this.config.cacheDir, this.config.tokensFile);
    
    if (existsSync(localPath)) {
      return localPath;
    }
    
    console.log(`⬇️  下载 tokens...`);
    const url = `https://huggingface.co/${this.config.modelRepo}/resolve/main/${this.config.tokensFile}`;
    const response = await fetch(url);
    const text = await response.text();
    await writeFile(localPath, text);
    
    return localPath;
  }
  
  /**
   * 加载 voices 数据
   */
  async loadVoices(path) {
    const buffer = await readFile(path);
    const float32View = new Float32Array(
      buffer.buffer, 
      buffer.byteOffset, 
      buffer.byteLength / 4
    );
    return float32View;
  }
  
  /**
   * 加载 tokens 映射
   */
  async loadTokens(path) {
    const text = await readFile(path, 'utf-8');
    const lines = text.split('\n').filter(l => l.trim());
    const tokenToId = new Map();
    const idToToken = new Map();
    
    lines.forEach((line, id) => {
      tokenToId.set(line.trim(), id);
      idToToken.set(id, line.trim());
    });
    
    return { tokenToId, idToToken };
  }
  
  /**
   * 文本转 token IDs
   */
  textToTokens(text) {
    // 简单的字符级分词 (实际应用中需要更复杂的处理)
    const tokens = [0]; // 开始 token
    
    for (const char of text) {
      const tokenId = this.tokens.tokenToId.get(char);
      if (tokenId !== undefined) {
        tokens.push(tokenId);
      }
    }
    
    tokens.push(0); // 结束 token
    return tokens;
  }
  
  /**
   * 生成语音
   */
  async generate(text, options = {}) {
    const voiceId = options.voiceId || 0;
    const speed = options.speed || 1.0;
    
    console.log(`🔊 生成语音: "${text.substring(0, 50)}..."`);
    
    // 获取输入 tokens
    const inputTokens = this.textToTokens(text);
    const tokenCount = BigInt(inputTokens.length);
    
    // 获取 style vector (从 voices 数据中提取)
    const styleDim = 256;
    const voiceOffset = voiceId * styleDim * 512; // 简化假设
    const style = new Float32Array(styleDim);
    
    // 填充 style (实际应从 voices 数据中读取)
    for (let i = 0; i < styleDim; i++) {
      style[i] = this.voices[(voiceOffset + i) % this.voices.length] || 0;
    }
    
    // 创建 ONNX 输入
    const inputs = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(inputTokens.map(BigInt)), [1, inputTokens.length]),
      style: new ort.Tensor('float32', style, [1, styleDim]),
      speed: new ort.Tensor('float32', [speed], [1]),
    };
    
    // 运行推理
    const startTime = Date.now();
    const results = await this.session.run(inputs);
    const inferTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`⏱️  推理时间: ${inferTime}s`);
    
    // 获取输出
    const output = results.output || results.waveform || Object.values(results)[0];
    const audioData = output.data;
    
    return {
      samples: audioData,
      sampleRate: 24000,
      duration: audioData.length / 24000
    };
  }
  
  /**
   * 保存为 WAV 文件
   */
  async saveWav(audio, filename) {
    const wav = this.createWav(audio.samples, audio.sampleRate);
    await writeFile(filename, wav);
    console.log(`💾 已保存: ${filename}`);
  }
  
  createWav(samples, sampleRate) {
    let floatSamples = samples instanceof Float32Array 
      ? samples 
      : new Float32Array(samples);
    
    const buffer = new ArrayBuffer(44 + floatSamples.length * 2);
    const view = new DataView(buffer);
    
    const write = (off, str) => str.split('').forEach((c, i) => 
      view.setUint8(off + i, c.charCodeAt(0)));
    
    write(0, 'RIFF');
    view.setUint32(4, buffer.byteLength - 8, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, floatSamples.length * 2, true);
    
    for (let i = 0; i < floatSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return Buffer.from(buffer);
  }
}

// ============ 主程序 ============
async function main() {
  console.log('='.repeat(60));
  console.log('       🎤 Kokoro ONNX 直接运行示例');
  console.log('='.repeat(60));
  console.log('');
  
  const engine = new KokoroOnnxEngine();
  await engine.init();
  
  // 生成测试语音
  const audio = await engine.generate(
    'Hello, this is a test of the Kokoro ONNX engine.',
    { voiceId: 0, speed: 1.0 }
  );
  
  await engine.saveWav(audio, join(__dirname, '../output/onnx-direct.wav'));
  
  console.log('\n✅ 完成!');
}

main().catch(console.error);
