import { RecognitionEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from './types';

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
        return;
      }

      this.emitStatus('Loading...');
      await this.initModelCache();
      await this.setupWasmModule();
      (window as any).__sherpaInitialized = true;
    } catch (error) {
      this.emitError('Failed to initialize Sherpa-onnx: ' + String(error));
    }
  }

  private async initModelCache(): Promise<void> {
    const { modelCacheManager } = await import('./modelCacheManager');
    await modelCacheManager.init();

    const CLOUDFLARE_WORKER = 'https://sherpa-onnx-cdn.1272679088.workers.dev';
    
    const forcedRemoteConfig = {
      baseUrl: CLOUDFLARE_WORKER,
      files: {
        wasm: 'sherpa-onnx-wasm-main-asr.wasm',
        data: 'sherpa-onnx-wasm-main-asr.data',
      }
    };
    
    modelCacheManager.setRemoteConfig(forcedRemoteConfig);
  }

  private async setupWasmModule(): Promise<void> {
    const { modelCacheManager } = await import('./modelCacheManager');
    const remoteConfig = modelCacheManager.getRemoteConfig();

    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    this.interceptXHR(remoteConfig);
    this.interceptFetch(modelCacheManager);

    window.Module = {
      locateFile: (path: string, scriptDirectory: string = '') => {
        if (path.endsWith('.wasm') && remoteConfig) {
          return `${remoteConfig.baseUrl}/${remoteConfig.files.wasm}`;
        }
        if (path.endsWith('.data') && remoteConfig) {
          return `${remoteConfig.baseUrl}/${remoteConfig.files.data}`;
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
          this.recognizer = window.createOnlineRecognizer(window.Module);
          this.isModelLoaded = true;
          this.setIsInitialized(true);
          this.emitStatus('Ready');
          
          this.restoreConsole();
        } catch (error) {
          this.restoreConsole();
          this.emitError('Failed to create recognizer');
        }
      }
    };

    if (remoteConfig) {
      await this.loadScript(`${remoteConfig.baseUrl}/sherpa-onnx-asr.js`);
      await this.loadScript(`${remoteConfig.baseUrl}/sherpa-onnx-wasm-main-asr.js`);
    }
  }

  private interceptXHR(remoteConfig: any): void {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      const urlString = url.toString();
      
      if (urlString.includes('sherpa-onnx-wasm-main-asr.data') || 
          urlString.includes('sherpa-onnx-wasm-main-asr.wasm')) {
        if (remoteConfig) {
          const fileName = urlString.split('/').pop() || '';
          let newUrl = urlString;
          
          if (fileName.includes('.data')) {
            newUrl = `${remoteConfig.baseUrl}/${remoteConfig.files.data}`;
          } else if (fileName.includes('.wasm')) {
            newUrl = `${remoteConfig.baseUrl}/${remoteConfig.files.wasm}`;
          }
          
          return originalXHROpen.call(this, method, newUrl, async, username, password);
        }
      }
      
      return originalXHROpen.call(this, method, url, async, username, password);
    };
  }

  private interceptFetch(cacheManager: any): void {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      
      const isSherpaFile = url.includes('sherpa-onnx-wasm-main-asr.data') || 
                           url.includes('sherpa-onnx-wasm-main-asr.wasm');
      
      if (isSherpaFile) {
        const cached = await cacheManager.getCachedModel(url);
        if (cached) {
          return new Response(cached, {
            status: 200,
            headers: {
              'Content-Type': url.includes('.wasm') ? 'application/wasm' : 'application/octet-stream',
              'Content-Length': cached.byteLength.toString()
            }
          });
        }
      }
      
      const response = await originalFetch(input, init);
      
      if (isSherpaFile && response.ok) {
        const clonedResponse = response.clone();
        const data = await clonedResponse.arrayBuffer();
        cacheManager.cacheModel(url, data).catch(() => {});
      }
      
      return response;
    };
  }

  private restoreConsole(): void {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
    }
  }

  private downsampleBuffer(buffer: Float32Array, exportSampleRate: number): Float32Array {
    const recordSampleRate = this.recordSampleRate;
    if (exportSampleRate === recordSampleRate) {
      return new Float32Array(buffer);
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
    if (!this.getIsInitialized()) {
      this.emitError('Sherpa-onnx 未初始化');
      return;
    }

    if (!this.isModelLoaded || !this.recognizer) {
      this.emitError('Sherpa-onnx 模型未加载');
      return;
    }

    try {
      await this.startAudioCapture();
    } catch (error) {
      this.emitError('启动 Sherpa-onnx 失败');
    }
  }

  async stop(): Promise<void> {
    this.stopAudioCapture();
    this.clearSilenceTimer();
  }

  setLanguage(language: string): void {
    this.config.language = language;
  }

  updateConfig(config: Partial<RecognitionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  clearTranscript(): void {
    this.currentTranscript = '';
    this.lastResult = '';
    this.resultList = [];
    if (this.recognizer && this.stream) {
      this.recognizer.reset(this.stream);
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           typeof Worker !== 'undefined' &&
           typeof WebAssembly !== 'undefined' &&
           typeof AudioContext !== 'undefined' &&
           this.isPackageAvailable;
  }

  destroy(): void {
    this.stop();
    this.recognizer = null;
    this.stream = null;
  }

  private async startAudioCapture(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: this.expectedSampleRate,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    this.microphone = stream;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.expectedSampleRate
    });
    
    this.recordSampleRate = this.audioContext.sampleRate;

    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    
    this.mediaStreamSource.connect(this.analyser);
    
    const bufferSize = 4096;
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 2);
    
    this.stream = this.recognizer.createStream();

    this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!this.recognizer || !this.stream) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const samplesCopy = new Float32Array(inputData.length);
      samplesCopy.set(inputData);
      const samples = this.downsampleBuffer(samplesCopy, this.expectedSampleRate);

      this.stream.acceptWaveform(this.expectedSampleRate, samples as any);
      
      while (this.recognizer.isReady(this.stream)) {
        this.recognizer.decode(this.stream);
      }

      const isEndpoint = this.recognizer.isEndpoint(this.stream);
      let result = this.recognizer.getResult(this.stream).text;

      if (result.length > 0 && this.lastResult !== result) {
        this.lastResult = result;
        this.currentTranscript = this.getDisplayResult() + result;
        this.emitResult({
          transcript: result,
          confidence: 0.9,
          isFinal: false,
          isInterim: true
        });
      }

      if (isEndpoint) {
        if (this.lastResult.length > 0) {
          this.resultList.push(this.lastResult);
          this.emitResult({
            transcript: this.lastResult,
            confidence: 0.9,
            isFinal: true,
            isInterim: false
          });
          this.lastResult = '';
        }
        this.recognizer.reset(this.stream);
      }
    };
    
    this.mediaStreamSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    
    this.startVolumeDetection();
  }

  private getDisplayResult(): string {
    let ans = '';
    for (const s of this.resultList) {
      if (s === '') continue;
      ans += s + '\n';
    }
    return ans;
  }

  private stopAudioCapture(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.microphone) {
      this.microphone.getTracks().forEach(track => track.stop());
      this.microphone = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.stream = null;
    this.stopVolumeDetection();
  }

  private startVolumeDetection(): void {
    if (!this.analyser || !this.config.enableVolumeDetection) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detectVolume = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      
      const average = sum / bufferLength;
      const volume = Math.min(100, (average / 255) * 100);
      
      this.emitVolumeChange(volume);
      
      requestAnimationFrame(detectVolume);
    };

    detectVolume();
  }

  private stopVolumeDetection(): void {
    this.emitVolumeChange(0);
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    
    if (this.config.silenceTimeout > 0) {
      this.silenceTimer = window.setTimeout(() => {
        this.clearTranscript();
      }, this.config.silenceTimeout);
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  getSupportedLanguages(): string[] {
    return [
      'zh-CN', 'en-US', 'ja-JP', 'ko-KR',
      'fr-FR', 'de-DE', 'es-ES', 'it-IT'
    ];
  }

  getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      'zh-CN': '中文（简体）',
      'en-US': '英语（美国）',
      'ja-JP': '日语',
      'ko-KR': '韩语',
      'fr-FR': '法语',
      'de-DE': '德语',
      'es-ES': '西班牙语',
      'it-IT': '意大利语'
    };
    
    return languages[code] || code;
  }

  async forceUpdateModel(): Promise<void> {
    this.emitStatus('强制更新模型...');
    
    try {
      const { modelCacheManager } = await import('./modelCacheManager');
      const wasmUrl = '/sherpa-onnx-wasm-main-asr.wasm';
      const dataUrl = '/sherpa-onnx-wasm-main-asr.data';
      
      await modelCacheManager.forceUpdate(wasmUrl);
      await modelCacheManager.forceUpdate(dataUrl);
      
      this.emitStatus('模型更新完成，请刷新页面');
    } catch (error) {
      this.emitError('模型更新失败');
    }
  }

  async clearModelCache(): Promise<void> {
    this.emitStatus('清除模型缓存...');
    
    try {
      const { modelCacheManager } = await import('./modelCacheManager');
      await modelCacheManager.clearCache();
      this.emitStatus('缓存已清除，请刷新页面');
    } catch (error) {
      this.emitError('清除缓存失败');
    }
  }
}
