import { RecognitionEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from './engine';
import { modelCacheManager, CacheProgress, RemoteResourceConfig } from './modelCacheManager';

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
  private lastResultTime: number = 0;
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
        console.warn('Window not available');
        return false;
      }
      
      if (typeof WebAssembly === 'undefined') {
        console.warn('WebAssembly not supported');
        return false;
      }
      
      this.isPackageAvailable = true;
      console.log('sherpa-onnx environment is available');
      console.log('sherpa-onnx environment is available');
      return true;
    } catch (error) {
      this.isPackageAvailable = false;
      console.warn('sherpa-onnx environment is not available:', error);
      console.warn('sherpa-onnx environment is not available:', error);
      return false;
    }
  }

  private loadScript(src: string): Promise<void> {
    const scriptName = src.split('/').pop() || src;
    
    if ((window as any).__sherpaLoadedScripts?.has(scriptName)) {
      console.log(`Script ${scriptName} already loaded, skipping`);
      return Promise.resolve();
    }
    
    console.log(`Loading script: ${src}`);
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        if (!(window as any).__sherpaLoadedScripts) {
          (window as any).__sherpaLoadedScripts = new Set();
        }
        (window as any).__sherpaLoadedScripts.add(scriptName);
        console.log(`Script loaded successfully: ${scriptName}`);
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async initialize(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        console.warn('Sherpa-onnx not supported in this environment');
        return;
      }

      if ((window as any).__sherpaInitialized) {
        console.log('Sherpa-onnx already initialized, skipping');
        return;
      }

      this.emitStatus('Loading...');

      await modelCacheManager.init();

      if (this.config.remoteResources) {
        modelCacheManager.setRemoteConfig(this.config.remoteResources);
        console.log('[SherpaOnnx] Using remote resources:', this.config.remoteResources.baseUrl);
      }

      const remoteConfig = modelCacheManager.getRemoteConfig();

      this.originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn
      };

      const originalConsole = this.originalConsole;

      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;
      
      XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
        const urlString = url.toString();
        
        if (urlString.includes('sherpa-onnx-wasm-main-asr.data') || 
            urlString.includes('sherpa-onnx-wasm-main-asr.wasm')) {
          console.log(`[SherpaOnnx] XHR open intercepted: ${urlString}`);
          
          const rc = modelCacheManager.getRemoteConfig();
          if (rc) {
            const fileName = urlString.split('/').pop() || '';
            let newUrl = urlString;
            
            if (fileName.includes('.data')) {
              newUrl = `${rc.baseUrl}/${rc.files.data}`;
            } else if (fileName.includes('.wasm')) {
              newUrl = `${rc.baseUrl}/${rc.files.wasm}`;
            }
            
            console.log(`[SherpaOnnx] XHR redirect to: ${newUrl}`);
            return originalXHROpen.call(this, method, newUrl, async, username, password);
          }
        }
        
        return originalXHROpen.call(this, method, url, async, username, password);
      };
      
      XMLHttpRequest.prototype.send = async function(body?: Document | XMLHttpRequestBodyInit | null) {
        return originalXHRSend.call(this, body);
      };

      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input : input.toString();
        
        const isSherpaFile = url.includes('sherpa-onnx-wasm-main-asr.data') || 
                             url.includes('sherpa-onnx-wasm-main-asr.wasm') ||
                             url.includes('encoder-epoch-99-avg-1') ||
                             url.includes('decoder-epoch-99-avg-1') ||
                             url.includes('joiner-epoch-99-avg-1') ||
                             url.includes('tokens.txt');
        
        if (isSherpaFile) {
          console.log(`[SherpaOnnx] Intercepted fetch for: ${url}`);
          
          try {
            const cached = await modelCacheManager.getCachedModel(url);
            if (cached) {
              console.log(`[SherpaOnnx] Returning cached data: ${(cached.byteLength / 1024 / 1024).toFixed(2)}MB`);
              return new Response(cached, {
                status: 200,
                headers: {
                  'Content-Type': url.includes('.wasm') ? 'application/wasm' : 'application/octet-stream',
                  'Content-Length': cached.byteLength.toString()
                }
              });
            }
          } catch (error) {
            console.warn('[SherpaOnnx] Cache lookup failed:', error);
          }
        }
        
        const response = await originalFetch(input, init);
        
        if (isSherpaFile && response.ok) {
          const clonedResponse = response.clone();
          const data = await clonedResponse.arrayBuffer();
          
          console.log(`[SherpaOnnx] Caching model: ${(data.byteLength / 1024 / 1024).toFixed(2)}MB`);
          modelCacheManager.cacheModel(url, data).catch(error => {
            console.warn('[SherpaOnnx] Failed to cache model:', error);
          });
        }
        
        return response;
      };

      console.log = (...args: any[]) => {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && (
          firstArg.startsWith('/home/runner/work/sherpa-onnx') ||
          firstArg.includes('OnlineRecognizerConfig') ||
          firstArg.includes('encoder_dims') ||
          firstArg.includes('attention_dims')
        )) {
          return;
        }
        originalConsole.log.apply(console, args);
      };

      window.Module = {
        locateFile: (path: string, scriptDirectory: string = '') => {
          console.log(`locateFile: ${path}, scriptDirectory: ${scriptDirectory}`);
          
          if (path.endsWith('.wasm')) {
            if (remoteConfig) {
              return `${remoteConfig.baseUrl}/${remoteConfig.files.wasm}`;
            }
            return '/sherpa-onnx-wasm-main-asr.wasm';
          }
          
          if (path.endsWith('.data')) {
            if (remoteConfig) {
              return `${remoteConfig.baseUrl}/${remoteConfig.files.data}`;
            }
            return '/sherpa-onnx-wasm-main-asr.data';
          }
          
          return scriptDirectory + path;
        },
        setStatus: (status: string) => {
          console.log(`Module.setStatus: "${status}"`);
          
          if (!status || !status.trim()) {
            return;
          }
          
          if (status === 'Running...') {
            this.emitStatus('模型加载完成，初始化识别器...');
            return;
          }

          if (status.includes('from cache') || status.includes('Using cached')) {
            this.emitStatus('从缓存加载模型...');
            return;
          }

          if (status.includes('Caching model')) {
            this.emitStatus('缓存模型中...');
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
          console.log('WASM runtime initialized');
          try {
            this.recognizer = window.createOnlineRecognizer(window.Module);
            this.isModelLoaded = true;
            this.setIsInitialized(true);
            this.emitStatus('Ready');
            
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            
            (window as any).__sherpaInitialized = true;
          } catch (error) {
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.error('Failed to create recognizer:', error);
            this.emitError('Failed to create recognizer');
          }
        }
      };

      if (remoteConfig) {
        await this.loadScript(`${remoteConfig.baseUrl}/sherpa-onnx-asr.js`);
        await this.loadScript(`${remoteConfig.baseUrl}/sherpa-onnx-wasm-main-asr.js`);
      } else {
        await this.loadScript('/sherpa-onnx-asr.js');
        await this.loadScript('/sherpa-onnx-wasm-main-asr.js');
      }

      console.log('Sherpa-onnx engine initialized successfully');
    } catch (error) {
      if (this.originalConsole) {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
      }
      console.error('Failed to initialize Sherpa-onnx:', error);
      this.emitError('Failed to initialize Sherpa-onnx: ' + String(error));
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
      console.log('Sherpa-onnx started');
    } catch (error) {
      console.error('Failed to start Sherpa-onnx:', error);
      this.emitError('启动 Sherpa-onnx 失败');
    }
  }

  async stop(): Promise<void> {
    this.stopAudioCapture();
    this.clearSilenceTimer();
    console.log('Sherpa-onnx stopped');
  }

  setLanguage(language: string): void {
    this.config.language = language;
    console.log(`Language set to: ${language}`);
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
    try {
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
      console.log('Audio sample rate:', this.recordSampleRate);

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

        if (this.recognizer.config?.modelConfig?.paraformer?.encoder !== '') {
          const tailPaddings = new Float32Array(this.expectedSampleRate);
          this.stream.acceptWaveform(this.expectedSampleRate, tailPaddings as any);
          while (this.recognizer.isReady(this.stream)) {
            this.recognizer.decode(this.stream);
          }
          result = this.recognizer.getResult(this.stream).text;
        }

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
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
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
        console.log('Silence timeout, resetting recognition');
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
    console.log('[SherpaOnnx] Force updating model...');
    this.emitStatus('强制更新模型...');
    
    try {
      const wasmUrl = '/sherpa-onnx-wasm-main-asr.wasm';
      const dataUrl = '/sherpa-onnx-wasm-main-asr.data';
      
      await modelCacheManager.forceUpdate(wasmUrl);
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
