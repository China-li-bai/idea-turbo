import { RecognitionEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult, WorkerInMessage, WorkerOutMessage } from './types';
import { REMOTE_CONFIG } from './modelCacheManager';

export class SherpaOnnxEngine extends RecognitionEngine {
  private worker: Worker | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private currentTranscript: string = '';
  private silenceTimer: number | null = null;
  private isPackageAvailable: boolean = false;
  private recordSampleRate: number = 16000;
  private readonly expectedSampleRate = 16000;
  private lastResult: string = '';
  private resultList: string[] = [];
  private initResolve: ((value: void) => void) | null = null;
  private initReject: ((reason?: any) => void) | null = null;

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

      if (typeof Worker === 'undefined') {
        return false;
      }

      this.isPackageAvailable = true;
      return true;
    } catch (error) {
      this.isPackageAvailable = false;
      return false;
    }
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

      console.log('[SherpaOnnx] Starting initialization (Worker mode)...');
      this.emitStatus('初始化 Worker...');

      const workerUrl = this.config.workerUrl || '/sherpa-worker.js';
      this.worker = new Worker(workerUrl);

      this.worker.onerror = (e) => {
        const errorMsg = `Worker error: ${e.message}`;
        console.error('[SherpaOnnx]', errorMsg);
        this.emitError(errorMsg);
        if (this.initReject) {
          this.initReject(new Error(errorMsg));
          this.initResolve = null;
          this.initReject = null;
        }
      };

      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data as WorkerOutMessage);
      };

      await new Promise<void>((resolve, reject) => {
        this.initResolve = resolve;
        this.initReject = reject;

        const initConfig = {
          cdnBaseUrl: this.config.remoteResources?.baseUrl || REMOTE_CONFIG.baseUrl,
          dataFile: this.config.remoteResources?.files?.data || REMOTE_CONFIG.files.data,
          wasmScriptsBaseUrl: this.config.wasmScriptsBaseUrl || '',
          language: this.config.language,
        };

        this.sendToWorker({ type: 'init', config: initConfig });

        setTimeout(() => {
          if (this.initReject) {
            const error = new Error('Worker initialization timeout');
            this.initReject(error);
            this.initResolve = null;
            this.initReject = null;
          }
        }, 120000);
      });

      (window as any).__sherpaInitialized = true;
      console.log('[SherpaOnnx] Initialization complete (Worker mode)');
    } catch (error) {
      this.emitError('Failed to initialize Sherpa-onnx: ' + String(error));
      console.error('[SherpaOnnx] Initialization error:', error);
    }
  }

  private handleWorkerMessage(msg: WorkerOutMessage): void {
    switch (msg.type) {
      case 'status':
        this.emitStatus(msg.message);
        break;

      case 'error':
        this.emitError(msg.error);
        break;

      case 'initialized':
        this.setIsInitialized(true);
        if (this.initResolve) {
          this.initResolve();
          this.initResolve = null;
          this.initReject = null;
        }
        break;

      case 'result':
        this.handleWorkerResult(msg.text, msg.isEndpoint);
        break;

      case 'reset':
        console.log('[SherpaOnnx] Stream reset by worker');
        break;

      case 'destroyed':
        console.log('[SherpaOnnx] Worker destroyed');
        break;

      case 'modelVersion':
        (window as any).__sherpaModelVersion = msg.version;
        break;

      case 'forceUpdateComplete':
        this.emitStatus('模型更新完成，请刷新页面');
        break;

      case 'clearCacheComplete':
        this.emitStatus('缓存已清除，请刷新页面');
        break;

      case 'preloadProgress':
        const percent = Math.round((msg.current / msg.total) * 100);
        this.emitStatus(`Preloading: ${msg.current}/${msg.total} (${percent}%)`);
        break;
    }
  }

  private handleWorkerResult(text: string, isEndpoint: boolean): void {
    if (!text) return;

    const isFinal = isEndpoint;
    const isInterim = !isEndpoint;

    if (isFinal) {
      if (text.trim()) {
        this.resultList.push(text);
        this.lastResult = '';
      }
    } else {
      this.lastResult = text;
    }

    this.callbacks.onResult?.({
      transcript: text,
      isFinal,
      isInterim,
      confidence: 0.8
    });
  }

  private sendToWorker(msg: WorkerInMessage): void {
    if (this.worker) {
      if (msg.type === 'audio') {
        this.worker.postMessage(msg, [msg.samples]);
      } else {
        this.worker.postMessage(msg);
      }
    }
  }

  private downsampleBuffer(buffer: Float32Array, exportSampleRate: number): Float32Array {
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

      if (!this.worker) {
        throw new Error('Worker not initialized');
      }

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
        if (!this.worker) return;

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

        const copy = new Float32Array(samples);
        this.sendToWorker({
          type: 'audio',
          samples: copy.buffer,
          sampleRate: this.expectedSampleRate
        });
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

    if (this.worker) {
      this.sendToWorker({ type: 'reset' });
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
           typeof Worker !== 'undefined' &&
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

    if (this.worker) {
      this.sendToWorker({ type: 'destroy' });
      this.worker.terminate();
      this.worker = null;
    }

    (window as any).__sherpaInitialized = false;
    console.log('[SherpaOnnx] Engine destroyed');
  }

  async forceUpdateModel(): Promise<void> {
    console.log('[SherpaOnnx] Force updating model...');
    this.emitStatus('强制更新模型...');

    if (this.worker) {
      this.sendToWorker({ type: 'forceUpdateModel' });
    } else {
      this.emitError('Worker 未初始化');
    }
  }

  async clearModelCache(): Promise<void> {
    console.log('[SherpaOnnx] Clearing model cache...');
    this.emitStatus('清除模型缓存...');

    if (this.worker) {
      this.sendToWorker({ type: 'clearModelCache' });
    } else {
      this.emitError('Worker 未初始化');
    }
  }

  getModelVersion(): string {
    return (window as any).__sherpaModelVersion || '1.0.0';
  }
}
