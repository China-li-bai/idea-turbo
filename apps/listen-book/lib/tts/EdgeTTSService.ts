import { ITTSService, SpeechEventHandlers } from './ITTSService';
import { TTSConfig } from './types';
import { TextSegment } from '../textSegmenter';
import { MediaSessionManager } from '../mediaSessionManager';
import { getEdgeTTSVoices } from './edgeTTSVoices';
import { AudioQueueManager } from '../audio/AudioQueueManager';

interface EdgeTTSVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'Male' | 'Female';
  locale?: string;
}

export class EdgeTTSService implements ITTSService {
  private proxyUrl: string;
  private mediaSessionManager: MediaSessionManager;
  private audioElement: HTMLAudioElement | null = null;
  private eventHandlers: SpeechEventHandlers = {};
  private currentText: string = '';
  private currentConfig: TTSConfig = {};
  private voices: EdgeTTSVoice[] = [];
  private isPlaying: boolean = false;
  private isPausedState: boolean = false;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private audioQueueManager: AudioQueueManager | null = null;
  private useQueueMode: boolean = false;
  private voicesCacheTime: number = 0;
  private voicesRefreshPromise: Promise<void> | null = null;
  private static readonly VOICES_CACHE_TTL = 30 * 60 * 1000;

  constructor(proxyUrl: string = 'https://shu.66666618.xyz') {
    this.proxyUrl = proxyUrl;
    this.mediaSessionManager = new MediaSessionManager();
    this.setupMediaSession();
    this.loadVoices();
  }

  enableQueueMode(enable: boolean = true): void {
    this.useQueueMode = enable;
    if (enable && !this.audioQueueManager) {
      this.audioQueueManager = new AudioQueueManager(
        async (text: string, signal: AbortSignal) => {
          const textLang = this.detectLanguage(text);
          const voiceName = this.currentConfig.voiceURI || this.getDefaultVoiceForLanguage(textLang);
          
          console.log('[EdgeTTS] Queue Mode - Text:', text.substring(0, 50), '| Lang:', textLang, '| Voice:', voiceName);
          
          const requestBody = {
            model: 'microsoft-tts',
            input: text,
            voice: voiceName
          };

          const response = await fetch(`${this.proxyUrl}/v1/audio/speech`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[EdgeTTS] Request failed:', response.status, response.statusText, errorText);
            throw new Error(`Edge-TTS request failed: ${response.statusText} - ${errorText}`);
          }

          return await response.blob();
        },
        {
          cacheOptions: {
            maxSize: 50 * 1024 * 1024,
            maxEntries: 100,
            ttl: 30 * 60 * 1000
          },
          preloadOptions: {
            concurrentLimit: 2,
            preloadAhead: 3
          }
        }
      );
    }
  }

  private setupMediaSession(): void {
    this.mediaSessionManager.setup({
      onPlay: () => {
        if (this.isPausedState && this.currentText) {
          this.resume();
        } else if (this.currentText) {
          this.speak(this.currentText, this.currentConfig, this.eventHandlers);
        }
      },
      onPause: () => {
        this.pause();
      },
      onStop: () => {
        this.stop();
      }
    });
  }

  private loadVoices(): void {
    this.cachedVoices = getEdgeTTSVoices();
  }

  private static refreshCallCount = 0;
  
  async refreshVoices(): Promise<void> {
    EdgeTTSService.refreshCallCount++;
    const callNum = EdgeTTSService.refreshCallCount;
    console.log(`[EdgeTTSService] refreshVoices 第 ${callNum} 次调用`);
    
    // 有缓存直接返回
    if (this.cachedVoices.length > 0 && Date.now() - this.voicesCacheTime < EdgeTTSService.VOICES_CACHE_TTL) {
      console.log(`[EdgeTTSService] 第 ${callNum} 次 - 缓存有效，直接返回`);
      return;
    }
    
    // 已有请求在进行中，等待它完成
    if (this.voicesRefreshPromise) {
      console.log(`[EdgeTTSService] 第 ${callNum} 次 - 等待已有请求完成`);
      await this.voicesRefreshPromise;
      console.log(`[EdgeTTSService] 第 ${callNum} 次 - 请求完成，返回`);
      return;
    }
    
    // 发起新请求
    console.log(`[EdgeTTSService] 第 ${callNum} 次 - 开始请求 API`);
    
    let resolvePromise: () => void;
    this.voicesRefreshPromise = new Promise(resolve => { resolvePromise = resolve; });
    
    try {
      const response = await fetch(`${this.proxyUrl}/v1/voices`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const responseData = await response.json();
      const edgeVoices = responseData.data || responseData;
      
      this.cachedVoices = edgeVoices.map((voice: { name?: string; DisplayName?: string; LocalName?: string; ShortName?: string; lang?: string; locale?: string; Locale?: string; id?: string }) => ({
        name: voice.name || voice.DisplayName || voice.LocalName || voice.ShortName,
        lang: voice.lang || voice.locale || voice.Locale,
        voiceURI: voice.id || voice.ShortName,
        default: false,
        localService: false
      }));

      this.voicesCacheTime = Date.now();
      
      console.log('[EdgeTTSService] 语音列表刷新成功，已缓存');
    } catch (error) {
      console.error('[EdgeTTSService] 获取语音列表失败:', error);
      this.cachedVoices = getEdgeTTSVoices();
    } finally {
      this.voicesRefreshPromise = null;
      resolvePromise!();
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0) {
      this.cachedVoices = getEdgeTTSVoices();
    }
    return this.cachedVoices;
  }

  private detectLanguage(text: string): string {
    const chineseRegex = /[\u4e00-\u9fa5]/;
    return chineseRegex.test(text) ? 'zh-CN' : 'en-US';
  }

  private getDefaultVoiceForLanguage(lang: string): string {
    switch (lang) {
      case 'zh-CN':
        return 'zh-CN-XiaoxiaoNeural';
      case 'en-US':
      default:
        return 'en-US-AriaNeural';
    }
  }

  speak(text: string, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): Promise<void> {
    this.stop();
    
    this.currentText = text;
    this.currentConfig = config;
    this.eventHandlers = handlers;
    this.isPlaying = true;
    this.isPausedState = false;

    this.eventHandlers.onStart?.();

    return new Promise<void>((resolve, reject) => {
      (async () => {
        try {
          const detectedLang = this.detectLanguage(text);
          const voiceName = config.voiceURI || this.getDefaultVoiceForLanguage(detectedLang);

          const requestBody = {
            model: 'microsoft-tts',
            input: text,
            voice: voiceName
          };

          const response = await fetch(`${this.proxyUrl}/v1/audio/speech`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edge-TTS request failed: ${response.statusText} - ${errorText}`);
          }

          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);

          this.audioElement = new Audio(audioUrl);
          
          this.audioElement.onplay = () => {
            this.mediaSessionManager.setPlaybackState('playing');
            this.mediaSessionManager.setMetadata({
              title: '文本朗读',
              artist: 'Edge-TTS',
              album: 'Listen Book'
            });
          };

          this.audioElement.onended = () => {
            this.isPlaying = false;
            this.isPausedState = false;
            this.mediaSessionManager.setPlaybackState('none');
            this.eventHandlers.onEnd?.();
            URL.revokeObjectURL(audioUrl);
            this.audioElement = null;
            resolve();
          };

          this.audioElement.onerror = (event) => {
            console.error('Audio playback error:', event);
            this.isPlaying = false;
            this.isPausedState = false;
            this.mediaSessionManager.setPlaybackState('none');
            const error = new Error('Audio playback failed');
            this.eventHandlers.onError?.(error);
            reject(error);
          };

          this.audioElement.play();
        } catch (error) {
          this.isPlaying = false;
          this.isPausedState = false;
          this.mediaSessionManager.setPlaybackState('none');
          this.eventHandlers.onError?.(error instanceof Error ? error : new Error(String(error)));
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    });
  }

  pause(): void {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.isPausedState = true;
      this.mediaSessionManager.setPlaybackState('paused');
    }
  }

  resume(): void {
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play();
      this.isPausedState = false;
      this.mediaSessionManager.setPlaybackState('playing');
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    this.isPlaying = false;
    this.isPausedState = false;
    this.eventHandlers = {};
    this.mediaSessionManager.setPlaybackState('none');
  }

  isSpeaking(): boolean {
    return this.isPlaying;
  }

  isPaused(): boolean {
    return this.isPausedState;
  }

  speakSegment(segment: TextSegment, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): void {
    this.speak(segment.text, config, handlers);
  }

  setSegments(segments: TextSegment[]): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.setSegments(segments);
      this.audioQueueManager.setConfig(this.currentConfig);
      this.audioQueueManager.setHandlers(this.eventHandlers);
    }
  }

  setConfig(config: TTSConfig): void {
    this.currentConfig = config;
    if (this.audioQueueManager) {
      this.audioQueueManager.setConfig(config);
    }
  }

  setHandlers(handlers: SpeechEventHandlers): void {
    this.eventHandlers = handlers;
    if (this.audioQueueManager) {
      this.audioQueueManager.setHandlers(handlers);
    }
  }

  async playQueue(): Promise<void> {
    if (this.audioQueueManager) {
      await this.audioQueueManager.play();
    }
  }

  pauseQueue(): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.pause();
    }
  }

  async resumeQueue(): Promise<void> {
    if (this.audioQueueManager) {
      await this.audioQueueManager.resume();
    }
  }

  stopQueue(): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.stop();
    }
  }

  seekQueue(index: number): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.seek(index);
    }
  }

  getQueueCurrentIndex(): number {
    return this.audioQueueManager?.getCurrentIndex() ?? 0;
  }

  getCacheStats(): { size: number; currentSize: number } | null {
    return this.audioQueueManager?.getCacheStats() ?? null;
  }

  clearCache(): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.clearCache();
    }
  }

  getServiceName(): string {
    return 'Edge-TTS';
  }
}
