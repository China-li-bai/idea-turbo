import * as ort from 'onnxruntime-web';
import { CDN_BASE_URL, ONNX_RUNTIME_WASM_URL, SAMPLE_RATE, MODEL_CONTEXT_WINDOW } from './constants';
import { preprocessText } from './textProcessor';
import { trimWaveform, createWavBuffer, createAudioBuffer, playAudioBuffer, checkWebGPUSupport } from './utils';
import { voicesMap, defaultVoice } from './voices';
import { defaultModel } from './models';
import { modelCacheManager } from './cache';
import type { TtsResult, GenerateOptions, InitOptions, ProgressCallback, ProgressInfo } from './types';

ort.env.wasm.wasmPaths = ONNX_RUNTIME_WASM_URL;

const memoryCache = new Map<string, ArrayBuffer>();
const voiceCache = new Map<string, number[][][]>();

let session: ort.InferenceSession | null = null;
let audioContext: AudioContext | null = null;
let currentAcceleration: 'cpu' | 'webgpu' = 'cpu';
let isInitialized = false;

async function fetchWithProgress(url: string, onProgress?: ProgressCallback, file?: string): Promise<ArrayBuffer> {
  if (memoryCache.has(url)) {
    onProgress?.({ status: 'downloading', file, progress: 1, fromCache: true });
    return memoryCache.get(url)!;
  }

  const cached = await modelCacheManager.get(url);
  if (cached) {
    memoryCache.set(url, cached);
    onProgress?.({ status: 'downloading', file, progress: 1, fromCache: true });
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    memoryCache.set(url, buffer);
    await modelCacheManager.set(url, buffer);
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (onProgress && total > 0) {
      onProgress({
        status: 'downloading',
        file,
        progress: loaded / total,
      });
    }
  }

  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  const arrayBuffer = buffer.buffer as ArrayBuffer;
  memoryCache.set(url, arrayBuffer);
  await modelCacheManager.set(url, arrayBuffer);

  return arrayBuffer;
}

async function loadModel(modelId: string, acceleration: 'cpu' | 'webgpu', onProgress?: ProgressCallback): Promise<ort.InferenceSession> {
  const url = `${CDN_BASE_URL}/onnx/${modelId}.onnx`;

  onProgress?.({
    status: 'downloading',
    file: 'model',
    progress: 0,
    message: `Loading model: ${modelId}`,
  });

  const modelBuffer = await fetchWithProgress(url, onProgress, 'model');

  onProgress?.({
    status: 'loading',
    file: 'model',
    progress: 0.5,
    message: 'Creating inference session...',
  });

  const sess = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: [acceleration],
  });

  return sess;
}

async function loadVoice(voiceId: string, onProgress?: ProgressCallback): Promise<number[][][]> {
  if (voiceCache.has(voiceId)) {
    return voiceCache.get(voiceId)!;
  }

  const url = `${CDN_BASE_URL}/voices/${voiceId}.bin`;

  onProgress?.({
    status: 'downloading',
    file: `voice:${voiceId}`,
    progress: 0,
    message: `Loading voice: ${voiceId}`,
  });

  const voiceBuffer = await fetchWithProgress(url, onProgress, `voice:${voiceId}`);
  const voiceArray = new Float32Array(voiceBuffer);

  const reshaped: number[][][] = [];
  for (let from = 0; from < voiceArray.length; from += 256) {
    const to = Math.min(from + 256, voiceArray.length);
    const chunk = Array.from(voiceArray.slice(from, to));
    reshaped.push([chunk]);
  }

  voiceCache.set(voiceId, reshaped);
  return reshaped;
}

export async function initialize(options: InitOptions = {}, onProgress?: ProgressCallback): Promise<void> {
  if (isInitialized && session) {
    onProgress?.({ status: 'ready', progress: 1 });
    return;
  }

  const { model = defaultModel.id, acceleration = 'auto', dtype } = options;

  let actualAcceleration: 'cpu' | 'webgpu' = 'cpu';

  if (acceleration === 'auto') {
    const hasWebGPU = await checkWebGPUSupport();
    actualAcceleration = hasWebGPU ? 'webgpu' : 'cpu';
  } else {
    actualAcceleration = acceleration;
  }

  currentAcceleration = actualAcceleration;

  onProgress?.({
    status: 'loading',
    progress: 0,
    message: `Initializing with ${actualAcceleration.toUpperCase()}...`,
  });

  const modelId = dtype ? getModelIdFromDtype(dtype) : model;
  session = await loadModel(modelId, actualAcceleration, onProgress);

  const defaultVoiceData = await loadVoice(defaultVoice.id, onProgress);

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  isInitialized = true;

  onProgress?.({
    status: 'ready',
    progress: 1,
    message: 'Engine ready!',
  });
}

function getModelIdFromDtype(dtype: string): string {
  const mapping: Record<string, string> = {
    fp32: 'model',
    fp16: 'model_fp16',
    q8: 'model_quantized',
    q4: 'model_q4',
    q4f16: 'model_q4f16',
    uint8: 'model_uint8',
    uint8f16: 'model_uint8f16',
    quantized: 'model_quantized',
    q8f16: 'model_q8f16',
  };
  return mapping[dtype] || 'model_q8f16';
}

export function isReady(): boolean {
  return isInitialized && session !== null;
}

export async function generate(text: string, options: GenerateOptions = {}): Promise<TtsResult> {
  if (!session) {
    throw new Error('Engine not initialized. Call initialize() first.');
  }

  const voiceId = options.voice || defaultVoice.id;
  const speed = options.speed || 1.0;
  const lang = options.lang || 'en-us';

  const voice = voicesMap[voiceId] || defaultVoice;
  const voiceLang = voice.lang.id;

  console.log('[KokoroTTS] Generating audio for:', text);
  console.log('[KokoroTTS] Voice:', voiceId, 'Lang:', voiceLang);

  const voiceData = await loadVoice(voiceId);
  console.log('[KokoroTTS] Voice data loaded, shape:', voiceData.length);

  const tokensPerChunk = MODEL_CONTEXT_WINDOW - 2;
  const chunks = await preprocessText(text, voiceLang, tokensPerChunk);
  console.log('[KokoroTTS] Preprocessed chunks:', chunks.length);

  const waveforms: Float32Array[] = [];
  let waveformsLen = 0;

  for (const chunk of chunks) {
    if (chunk.type === 'silence') {
      console.log('[KokoroTTS] Silence chunk:', chunk.durationSeconds, 's');
      const silenceLength = Math.floor(chunk.durationSeconds * SAMPLE_RATE);
      const silenceWave = new Float32Array(silenceLength);
      waveforms.push(silenceWave);
      waveformsLen += silenceLength;
    }

    if (chunk.type === 'text' && chunk.tokens && chunk.tokens.length > 0) {
      console.log('[KokoroTTS] Text chunk:', chunk.content, 'tokens:', chunk.tokens.length);
      
      const tokens = chunk.tokens;
      const ref_s = voiceData[tokens.length - 1][0];
      const paddedTokens = [0, ...tokens, 0];

      const input_ids = new ort.Tensor('int64', paddedTokens, [1, paddedTokens.length]);
      const style = new ort.Tensor('float32', ref_s, [1, ref_s.length]);
      const speedTensor = new ort.Tensor('float32', [1], [1]);

      const result = await session.run({ input_ids, style, speed: speedTensor });
      let waveform = result.waveform.data as Float32Array;
      
      console.log('[KokoroTTS] Raw waveform length:', waveform.length, 'max:', Math.max(...waveform));
      
      waveform = trimWaveform(waveform);
      console.log('[KokoroTTS] Trimmed waveform length:', waveform.length);

      waveforms.push(waveform);
      waveformsLen += waveform.length;
    }
  }

  if (waveforms.length === 0) {
    throw new Error('No waveforms generated');
  }

  console.log('[KokoroTTS] Total waveforms:', waveforms.length, 'total length:', waveformsLen);

  const finalWaveform = new Float32Array(waveformsLen);
  let offset = 0;
  for (const waveform of waveforms) {
    finalWaveform.set(waveform, offset);
    offset += waveform.length;
  }

  console.log('[KokoroTTS] Final waveform length:', finalWaveform.length, 'duration:', finalWaveform.length / SAMPLE_RATE, 's');

  const audioBuffer = createAudioBuffer(finalWaveform, SAMPLE_RATE);

  return {
    audioBuffer,
    waveform: finalWaveform,
    sampleRate: SAMPLE_RATE,
    duration: audioBuffer.duration,
  };
}

export async function speak(text: string, options: GenerateOptions = {}): Promise<void> {
  const result = await generate(text, options);
  await playAudioBuffer(result.audioBuffer);
}

export function destroy(): void {
  if (session) {
    session = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isInitialized = false;
}

export function getAcceleration(): 'cpu' | 'webgpu' {
  return currentAcceleration;
}

export function clearCache(): void {
  memoryCache.clear();
  voiceCache.clear();
}

export { ort };
