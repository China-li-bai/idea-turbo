import { RecognitionEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from './engine';
import { WebSpeechEngine } from './webSpeechEngine';
import { SherpaOnnxEngine } from './sherpaOnnxEngine';

export type { RecognitionConfig, RecognitionResult } from './engine';

export interface RecognitionManagerCallbacks extends RecognitionCallbacks {
  onEngineChange?: (engine: 'webspeech' | 'sherpa-onnx') => void;
  onStatus?: (status: string) => void;
}

export class RecognitionManager {
  private currentEngine: RecognitionEngine | null = null;
  private engines: Map<string, RecognitionEngine> = new Map();
  private config: RecognitionConfig;
  private callbacks: RecognitionManagerCallbacks;
  private isListening: boolean = false;

  constructor(config: RecognitionConfig, callbacks: RecognitionManagerCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    
    this.engines.set('webspeech', new WebSpeechEngine(config, callbacks));
    this.engines.set('sherpa-onnx', new SherpaOnnxEngine(config, callbacks));
  }

  async initialize(): Promise<void> {
    try {
      const engineName = this.config.engine;
      const engine = this.engines.get(engineName);
      
      if (!engine) {
        throw new Error(`Engine ${engineName} not found`);
      }

      if (engineName === 'sherpa-onnx') {
        const sherpaEngine = engine as any;
        await sherpaEngine.checkPackageAvailability();
      }

      await engine.initialize();
      this.currentEngine = engine;
      console.log(`RecognitionManager initialized with engine: ${engineName}`);
    } catch (error) {
      console.error('Failed to initialize RecognitionManager:', error);
      this.callbacks.onError(error instanceof Error ? error.message : '初始化失败');
    }
  }

  async switchEngine(engineName: 'webspeech' | 'sherpa-onnx'): Promise<void> {
    if (this.isListening) {
      await this.stop();
    }

    const newEngine = this.engines.get(engineName);
    
    if (!newEngine) {
      throw new Error(`Engine ${engineName} not found`);
    }

    try {
      this.currentEngine = newEngine;
      this.config.engine = engineName;
      
      if (this.callbacks.onEngineChange) {
        this.callbacks.onEngineChange(engineName);
      }
      
      console.log(`Switched to engine: ${engineName}`);
    } catch (error) {
      console.error(`Failed to switch to engine ${engineName}:`, error);
      this.callbacks.onError(`切换引擎失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async start(): Promise<void> {
    if (!this.currentEngine) {
      this.callbacks.onError('识别引擎未初始化');
      return;
    }

    try {
      await this.currentEngine.start();
      this.isListening = true;
      console.log('RecognitionManager started');
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.callbacks.onError('启动识别失败');
    }
  }

  async stop(): Promise<void> {
    if (!this.currentEngine) return;

    try {
      await this.currentEngine.stop();
      this.isListening = false;
      console.log('RecognitionManager stopped');
    } catch (error) {
      console.error('Failed to stop recognition:', error);
    }
  }

  setLanguage(language: string): void {
    this.config.language = language;
    this.currentEngine?.setLanguage(language);
  }

  updateConfig(newConfig: Partial<RecognitionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.engines.forEach((engine, name) => {
      engine.updateConfig(newConfig);
    });
  }

  getCurrentTranscript(): string {
    return this.currentEngine?.getCurrentTranscript() || '';
  }

  clearTranscript(): void {
    this.currentEngine?.clearTranscript();
  }

  isSupported(): boolean {
    return this.engines.get(this.config.engine)?.isSupported() ?? false;
  }

  isListeningActive(): boolean {
    return this.isListening;
  }

  getCurrentEngine(): 'webspeech' | 'sherpa-onnx' {
    return this.config.engine;
  }

  getSupportedLanguages(): string[] {
    return this.currentEngine?.getSupportedLanguages() || [];
  }

  getLanguageName(code: string): string {
    return this.currentEngine?.getLanguageName(code) || code;
  }

  async getAvailableEngines(): Promise<Array<{ name: string; supported: boolean; description: string }>> {
    const webSpeechEngine = this.engines.get('webspeech');
    const sherpaOnnxEngine = this.engines.get('sherpa-onnx');

    return [
      {
        name: 'webspeech',
        supported: webSpeechEngine?.isSupported() ?? false,
        description: '浏览器原生语音识别，零依赖，支持实时预览'
      },
      {
        name: 'sherpa-onnx',
        supported: sherpaOnnxEngine?.isSupported() ?? false,
        description: '离线高性能语音识别，中文识别优秀'
      }
    ];
  }

  destroy(): void {
    this.engines.forEach((engine) => {
      engine.destroy();
    });
    
    this.engines.clear();
    this.currentEngine = null;
    this.isListening = false;
  }

  getConfig(): RecognitionConfig {
    return { ...this.config };
  }
}
