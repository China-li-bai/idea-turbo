'use client';

import { SherpaOnnxEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '@idea-turbo/sherpa-onnx';

export interface SpeechServiceConfig {
  language?: 'zh-CN' | 'en-US' | 'en-GB';
  continuous?: boolean;
  interimResults?: boolean;
  silenceTimeout?: number;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onVolumeChange?: (volume: number) => void;
  onStatusChange?: (status: string) => void;
}

export interface SpeechRecognitionState {
  isListening: boolean;
  isInitialized: boolean;
  status: string;
  currentTranscript: string;
  volume: number;
}

class SpeechService {
  private engine: SherpaOnnxEngine | null = null;
  private config: SpeechServiceConfig;
  private state: SpeechRecognitionState = {
    isListening: false,
    isInitialized: false,
    status: 'idle',
    currentTranscript: '',
    volume: 0,
  };
  private listeners: Set<(state: SpeechRecognitionState) => void> = new Set();

  constructor(config: SpeechServiceConfig = {}) {
    this.config = {
      language: 'zh-CN',
      continuous: true,
      interimResults: true,
      silenceTimeout: 3000,
      ...config,
    };
  }

  subscribe(listener: (state: SpeechRecognitionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  private updateState(updates: Partial<SpeechRecognitionState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      return;
    }

    this.updateState({ status: 'initializing' });

    const recognitionConfig: RecognitionConfig = {
      engine: 'sherpa-onnx',
      language: this.config.language || 'zh-CN',
      continuous: this.config.continuous ?? true,
      interimResults: this.config.interimResults ?? true,
      silenceTimeout: this.config.silenceTimeout || 3000,
      minConfidence: 0.5,
      enableVolumeDetection: true,
      enableRealtimePreview: true,
    };

    const callbacks: RecognitionCallbacks = {
      onResult: (result: RecognitionResult) => {
        this.handleResult(result);
      },
      onError: (error: string) => {
        this.handleError(error);
      },
      onVolumeChange: (volume: number) => {
        this.updateState({ volume });
        this.config.onVolumeChange?.(volume);
      },
      onStatus: (status: string) => {
        this.updateState({ status });
        this.config.onStatusChange?.(status);
      },
    };

    this.engine = new SherpaOnnxEngine(recognitionConfig, callbacks);

    try {
      await this.engine.initialize();
      this.updateState({ isInitialized: true, status: 'ready' });
    } catch (error) {
      this.handleError(`初始化失败: ${error}`);
      throw error;
    }
  }

  private handleResult(result: RecognitionResult): void {
    const { transcript, isFinal } = result;

    if (isFinal) {
      this.updateState({
        currentTranscript: this.state.currentTranscript + ' ' + transcript,
      });
    } else {
      this.updateState({
        currentTranscript: this.state.currentTranscript + ' ' + transcript,
      });
    }

    this.config.onResult?.(transcript, isFinal);
  }

  private handleError(error: string): void {
    this.updateState({ status: `error: ${error}` });
    this.config.onError?.(error);
  }

  async startListening(): Promise<void> {
    if (!this.state.isInitialized) {
      await this.initialize();
    }

    if (this.state.isListening) {
      return;
    }

    try {
      await this.engine?.start();
      this.updateState({ isListening: true, status: 'listening' });
    } catch (error) {
      this.handleError(`启动失败: ${error}`);
      throw error;
    }
  }

  async stopListening(): Promise<string> {
    if (!this.state.isListening || !this.engine) {
      return this.state.currentTranscript.trim();
    }

    try {
      await this.engine.stop();
      this.updateState({ isListening: false, status: 'stopped', volume: 0 });
      return this.state.currentTranscript.trim();
    } catch (error) {
      this.handleError(`停止失败: ${error}`);
      throw error;
    }
  }

  clearTranscript(): void {
    this.engine?.clearTranscript();
    this.updateState({ currentTranscript: '' });
  }

  setLanguage(language: 'zh-CN' | 'en-US' | 'en-GB'): void {
    this.config.language = language;
    this.engine?.setLanguage(language);
  }

  getState(): SpeechRecognitionState {
    return { ...this.state };
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return this.engine?.isSupported() ?? false;
  }

  destroy(): void {
    this.engine?.destroy();
    this.engine = null;
    this.listeners.clear();
    this.updateState({
      isListening: false,
      isInitialized: false,
      status: 'destroyed',
      currentTranscript: '',
      volume: 0,
    });
  }
}

export const speechService = new SpeechService();
export { SpeechService };
