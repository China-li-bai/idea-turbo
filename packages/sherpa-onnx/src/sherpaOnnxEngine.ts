import { RecognitionEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from './types';
import { setupCacheInterceptor, modelCacheManager, REMOTE_CONFIG } from './modelCacheManager';

interface SherpaOnnxModule {
  locateFile: (path: string, scriptDirectory?: string) => string;
  setStatus: (status: string) => void;
  onRuntimeInitialized: () => void;
}

declare global {
  interface Window {
    Module: SherpaOnnxModule;
    createOnlineRecognizer: (module: SherpaOnnxModule) => any;
  }
}

export class SherpaOnnxEngine extends RecognitionEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private currentTranscript: string = '';
  private isModelLoaded: boolean = false;
  private silenceTimer: number | null = null;
  private isPackageAvailable: boolean = false;
  private recognizer: any = null;
  private stream: any = null;
  private recordSampleRate: number = 16000;
  private readonly expectedSampleRate = 16000;
  private lastResult: string = '';
  private resultList: string[] = [];
  private originalConsole: { log: any; error: any; warn: any } | null = null;

  constructor(config: RecognitionConfig, callbacks: RecognitionCallbacks) {
    super(config, callbacks);
  }

  async checkPackageAvailability(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      if (typeof WebAssembly === 'undefined') {
        return false;
      }
      
      this.isPackageAvailable = true;
      return true;
    } catch (error) {
      this.isPackageAvailable = false;
      return false;
    }
  }

  private loadScript(src: string): Promise<void> {
    const scriptName = src.split('/').pop() || src;
    
    if ((window as any).__sherpaLoadedScripts?.has(scriptName)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        if (!(window as any).__sherpaLoadedScripts) {
          (window as any).__sherpaLoadedScripts = new Set();
        }
        (window as any).__sherpaLoadedScripts.add(scriptName);
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async initialize(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      if ((window as any).__sherpaInitialized) {
        console.log('[SherpaOnnx] Already initialized, reusing existing module');
        this.setIsInitialized(true);
        this.emitStatus('Ready (cached)');
        return;
      }

      console.log('[SherpaOnnx] Starting initialization...');
      this.emitStatus('Preloading models...');
      
      await modelCacheManager.init();
      setupCacheInterceptor();
      
      this.emitStatus('Preloading models (this may take a while)...');
      await modelCacheManager.preloadAllModels((current, total, url) => {
        const percent = Math.round((current / total) * 100);
        this.emitStatus(`Preloading: ${current}/${total} (${percent}%)`);
      });
      
      this.emitStatus('Loading WASM module...');
      await this.setupWasmModule();
      
      (window as any).__sherpaInitialized = true;
      console.log('[SherpaOnnx] Initialization complete');
    } catch (error) {
      this.emitError('Failed to initialize Sherpa-onnx: ' + String(error));
      console.error('[SherpaOnnx] Initialization error:', error);
    }
  }

  private async setupWasmModule(): Promise<void> {
    console.log('[SherpaOnnx] Setting up WASM module...');

    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    window.Module = {
      locateFile: (path: string, scriptDirectory: string = '') => {
        console.log('[SherpaOnnx] locateFile:', path);
        
        if (path.endsWith('.data')) {
          const url = `${REMOTE_CONFIG.baseUrl}/${REMOTE_CONFIG.files.data}`;
          const cachedBlobUrl = modelCacheManager.getBlobUrlSync(url);
          if (cachedBlobUrl) {
            console.log('[SherpaOnnx] Using cached blob URL for:', path);
            return cachedBlobUrl;
          }
          console.log('[SherpaOnnx] Using CDN URL for:', path);
          return url;
        }
        
        if (path.endsWith('.wasm')) {
          return path;
        }
        
        return scriptDirectory + path;
      },
      setStatus: (status: string) => {
        if (!status || !status.trim()) return;
        
        if (status === 'Running...') {
          this.emitStatus('模型加载完成，初始化识别器...');
          return;
        }

        if (status.includes('from cache') || status.includes('Using cached')) {
          this.emitStatus('从缓存加载模型...');
          return;
        }

        const downloadMatch = status.match(/Downloading data... \((\d+)\/(\d+)\)/);
        if (downloadMatch) {
          const downloaded = parseInt(downloadMatch[1], 10);
          const total = parseInt(downloadMatch[2], 10);
          const percent = total === 0 ? 0 : (downloaded * 10000 / total) / 100;
          const sizeMB = (total / 1024 / 1024).toFixed(1);
          this.emitStatus(`下载模型中... ${sizeMB}MB ${percent.toFixed(1)}%`);
          return;
        }
        
        this.emitStatus(status);
      },
      onRuntimeInitialized: () => {
        try {
          console.log('[SherpaOnnx] Creating recognizer...');
          this.recognizer = window.createOnlineRecognizer(window.Module);
          this.isModelLoaded = true;
          this.setIsInitialized(true);
          this.emitStatus('Ready');
          
          this.restoreConsole();
          console.log('[SherpaOnnx] Recognizer created successfully');
        } catch (error) {
          console.error('[SherpaOnnx] Failed to create recognizer:', error);
          this.restoreConsole();
          this.emitError('Failed to create recognizer');
        }
      }
    };

    await this.loadScript('/sherpa-onnx-asr.js');
    await this.loadScript('/sherpa-onnx-wasm-main-asr.js');
  }

  private restoreConsole(): void {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
    }
  }

  private downsampleBuffer(buffer: Float32Array | Float32Array<ArrayBufferLike>, exportSampleRate: number): Float32Array | Float32Array<ArrayBufferLike> {
    const recordSampleRate = this.recordSampleRate;
    if (exportSampleRate === recordSampleRate) {
      return new Float32Array(buffer.buffer);
    }
    const sampleRateRatio = recordSampleRate / exportSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  async start(): Promise<void> {
    try {
      console.log('[SherpaOnnx] Starting recognition...');
      
      if (!this.recognizer) {
        throw new Error('Recognizer not initialized');
      }

      this.stream = this.recognizer.createStream();
      
      this.microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.recordSampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({
        sampleRate: this.recordSampleRate
      });

      const source = this.audioContext.createMediaStreamSource(this.microphone);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.stream || !this.recognizer) return;

        const inputBuffer = e.inputBuffer;
        let samples = inputBuffer.getChannelData(0);
        
        if (this.config.enableVolumeDetection && this.analyser) {
          const dataArray = new Float32Array(this.analyser.frequencyBinCount);
          this.analyser.getFloatTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const volume = Math.min(100, Math.round(rms * 500));
          this.callbacks.onVolumeChange?.(volume);
        }

        samples = this.downsampleBuffer(samples as any, this.expectedSampleRate) as any;

        this.stream.acceptWaveform(this.expectedSampleRate, samples);

        while (this.recognizer.isReady(this.stream)) {
          this.recognizer.decode(this.stream);
        }

        if (this.recognizer.isEndpoint(this.stream)) {
          if (this.lastResult.trim()) {
            this.resultList.push(this.lastResult);
          }
          this.lastResult = '';
          this.recognizer.reset(this.stream);
        }

        const result = this.recognizer.getResult(this.stream);
        
        if (result.text && result.text !== this.lastResult) {
          this.lastResult = result.text;
          
          const isFinal = !this.recognizer.isEndpoint(this.stream);
          
          this.callbacks.onResult?.({
            transcript: result.text,
            isFinal,
            isInterim: !isFinal,
            confidence: result.tokens ? result.tokens.length / 100 : 0
          });
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      console.log('[SherpaOnnx] Recognition started');
    } catch (error) {
      console.error('[SherpaOnnx] Start error:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('[SherpaOnnx] Stopping recognition...');

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.microphone) {
      this.microphone.getTracks().forEach(track => track.stop());
      this.microphone = null;
    }

    if (this.stream && this.recognizer) {
      const result = this.recognizer.getResult(this.stream);
      if (result.text) {
        this.resultList.push(result.text);
      }
      this.stream = null;
    }

    console.log('[SherpaOnnx] Recognition stopped');
  }

  clearTranscript(): void {
    this.currentTranscript = '';
    this.lastResult = '';
    this.resultList = [];
  }

  setLanguage(language: string): void {
    this.config.language = language;
  }

  updateConfig(config: Partial<RecognitionConfig>): void {
    Object.assign(this.config, config);
  }

  getCurrentTranscript(): string {
    return this.resultList.join(' ') + ' ' + this.lastResult;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           typeof WebAssembly !== 'undefined' &&
           typeof navigator !== 'undefined' &&
           typeof navigator.mediaDevices !== 'undefined' &&
           typeof navigator.mediaDevices.getUserMedia !== 'undefined';
  }

  getSupportedLanguages(): string[] {
    return ['zh-CN', 'en-US', 'en-GB'];
  }

  getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'zh-CN': '中文(简体)',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)'
    };
    return names[code] || code;
  }

  destroy(): void {
    console.log('[SherpaOnnx] Destroying engine...');
    
    this.stop();
    
    if (this.recognizer) {
      this.recognizer.free();
      this.recognizer = null;
    }
    
    this.restoreConsole();
    console.log('[SherpaOnnx] Engine destroyed');
  }

  async forceUpdateModel(): Promise<void> {
    console.log('[SherpaOnnx] Force updating model...');
    this.emitStatus('强制更新模型...');

    try {
      const dataUrl = `${REMOTE_CONFIG.baseUrl}/${REMOTE_CONFIG.files.data}`;
      await modelCacheManager.forceUpdate(dataUrl);

      console.log('[SherpaOnnx] Model force updated successfully');
      this.emitStatus('模型更新完成，请刷新页面');
    } catch (error) {
      console.error('[SherpaOnnx] Failed to force update model:', error);
      this.emitError('模型更新失败');
    }
  }

  async clearModelCache(): Promise<void> {
    console.log('[SherpaOnnx] Clearing model cache...');
    this.emitStatus('清除模型缓存...');

    try {
      await modelCacheManager.clearAllCache();
      console.log('[SherpaOnnx] Model cache cleared successfully');
      this.emitStatus('缓存已清除，请刷新页面');
    } catch (error) {
      console.error('[SherpaOnnx] Failed to clear model cache:', error);
      this.emitError('清除缓存失败');
    }
  }

  getModelVersion(): string {
    return modelCacheManager.getModelVersion();
  }
}
