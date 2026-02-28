import { HybridTTSService, HybridTTSConfig, TTSServiceType } from './HybridTTSService';

export interface TTSManagerState {
  isReady: boolean;
  voices: SpeechSynthesisVoice[];
  currentServiceType: TTSServiceType;
  isLoading: boolean;
  error: string | null;
}

class TTSManager {
  private static instance: TTSManager;
  private service: HybridTTSService | null = null;
  private state: TTSManagerState;
  private listeners: Set<(state: TTSManagerState) => void> = new Set();
  private preloadPromise: Promise<void> | null = null;
  private config: HybridTTSConfig;

  private constructor(config: HybridTTSConfig = {}) {
    this.config = config;
    this.state = {
      isReady: false,
      voices: [],
      currentServiceType: config.preferredService || 'webspeech',
      isLoading: false,
      error: null
    };
  }

  static getInstance(config?: HybridTTSConfig): TTSManager {
    if (!TTSManager.instance) {
      TTSManager.instance = new TTSManager(config);
    }
    return TTSManager.instance;
  }

  private ensureService(): HybridTTSService {
    if (!this.service) {
      this.service = new HybridTTSService(this.config);
    }
    return this.service;
  }

  getState(): TTSManagerState {
    return { ...this.state };
  }

  subscribe(listener: (state: TTSManagerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  private updateState(partial: Partial<TTSManagerState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  async preloadVoices(serviceType?: TTSServiceType): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.updateState({ isLoading: true, error: null });

    this.preloadPromise = (async () => {
      try {
        const service = this.ensureService();
        
        if (serviceType) {
          service.setServiceType(serviceType);
          this.updateState({ currentServiceType: serviceType });
        }

        await service.refreshVoices();
        const voices = service.getVoices();

        this.updateState({
          isReady: true,
          voices,
          isLoading: false,
          error: null
        });

        console.log('[TTSManager] 语音预加载完成:', voices.length, '个语音');
      } catch (error) {
        console.error('[TTSManager] 语音预加载失败:', error);
        this.updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      } finally {
        this.preloadPromise = null;
      }
    })();

    return this.preloadPromise;
  }

  async switchService(serviceType: TTSServiceType): Promise<void> {
    if (this.state.currentServiceType === serviceType) {
      return;
    }

    this.updateState({ isLoading: true, currentServiceType: serviceType });
    const service = this.ensureService();
    service.setServiceType(serviceType);

    try {
      await service.refreshVoices();
      const voices = service.getVoices();

      this.updateState({
        voices,
        isLoading: false,
        isReady: true,
        error: null
      });

      console.log('[TTSManager] 服务切换完成:', serviceType, voices.length, '个语音');
    } catch (error) {
      console.error('[TTSManager] 服务切换失败:', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : '切换失败'
      });
    }
  }

  getService(): HybridTTSService {
    return this.ensureService();
  }

  getCurrentVoices(): SpeechSynthesisVoice[] {
    return this.state.voices;
  }

  isReady(): boolean {
    return this.state.isReady;
  }

  isLoading(): boolean {
    return this.state.isLoading;
  }

  getError(): string | null {
    return this.state.error;
  }

  getCurrentServiceType(): TTSServiceType {
    return this.state.currentServiceType;
  }
}

export const ttsManager = TTSManager.getInstance();
export default TTSManager;
