export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  isInterim: boolean;
}

export interface RemoteResourceConfig {
  baseUrl: string;
  files: {
    data: string;
  };
}

export interface RecognitionConfig {
  engine: 'webspeech' | 'sherpa-onnx';
  language: string;
  continuous: boolean;
  interimResults: boolean;
  silenceTimeout: number;
  minConfidence: number;
  enableVolumeDetection: boolean;
  enableRealtimePreview: boolean;
  remoteResources?: RemoteResourceConfig;
  workerUrl?: string;
  wasmScriptsBaseUrl?: string;
}

export interface WorkerInitConfig {
  cdnBaseUrl: string;
  dataFile: string;
  wasmScriptsBaseUrl: string;
  language: string;
}

export type WorkerInMessage =
  | { type: 'init'; config: WorkerInitConfig }
  | { type: 'audio'; samples: ArrayBuffer; sampleRate: number }
  | { type: 'reset' }
  | { type: 'destroy' }
  | { type: 'forceUpdateModel' }
  | { type: 'clearModelCache' }
  | { type: 'getModelVersion' }

export type WorkerOutMessage =
  | { type: 'status'; message: string }
  | { type: 'error'; error: string }
  | { type: 'initialized' }
  | { type: 'result'; text: string; isEndpoint: boolean }
  | { type: 'reset' }
  | { type: 'destroyed' }
  | { type: 'modelVersion'; version: string }
  | { type: 'forceUpdateComplete' }
  | { type: 'clearCacheComplete' }
  | { type: 'preloadProgress'; current: number; total: number; url: string }

export interface RecognitionCallbacks {
  onResult: (result: RecognitionResult) => void;
  onError: (error: string) => void;
  onVolumeChange?: (volume: number) => void;
  onStatus?: (status: string) => void;
}

export abstract class RecognitionEngine {
  protected config: RecognitionConfig;
  protected callbacks: RecognitionCallbacks;
  protected isInitialized: boolean = false;

  constructor(config: RecognitionConfig, callbacks: RecognitionCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract setLanguage(language: string): void;
  abstract updateConfig(config: Partial<RecognitionConfig>): void;
  abstract getCurrentTranscript(): string;
  abstract clearTranscript(): void;
  abstract isSupported(): boolean;
  abstract destroy(): void;
  abstract getSupportedLanguages(): string[];
  abstract getLanguageName(code: string): string;

  protected emitResult(result: RecognitionResult): void {
    this.callbacks.onResult(result);
  }

  protected emitError(error: string): void {
    this.callbacks.onError(error);
  }

  protected emitVolumeChange(volume: number): void {
    if (this.callbacks.onVolumeChange) {
      this.callbacks.onVolumeChange(volume);
    }
  }

  protected emitStatus(status: string): void {
    if (this.callbacks.onStatus) {
      this.callbacks.onStatus(status);
    }
  }

  protected getIsInitialized(): boolean {
    return this.isInitialized;
  }

  protected setIsInitialized(value: boolean): void {
    this.isInitialized = value;
  }
}
