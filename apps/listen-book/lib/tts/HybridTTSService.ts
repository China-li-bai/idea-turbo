import { ITTSService, SpeechEventHandlers } from './ITTSService';
import { TTSConfig } from './types';
import { TextSegment } from '../textSegmenter';
import { WebSpeechTTS } from './WebSpeechTTS';
import { EdgeTTSService } from './EdgeTTSService';

export type TTSServiceType = 'auto' | 'webspeech' | 'edgetts';

export interface HybridTTSConfig {
  edgeTTSProxyUrl?: string;
  autoSwitchThreshold?: number;
  enableAutoSwitch?: boolean;
  preferredService?: TTSServiceType;
}

export class HybridTTSService implements ITTSService {
  private webSpeechTTS: WebSpeechTTS;
  private edgeTTSService: EdgeTTSService;
  private currentService: ITTSService;
  private serviceType: TTSServiceType;
  private config: HybridTTSConfig;
  private useQueueMode: boolean = false;

  constructor(config: HybridTTSConfig = {}) {
    this.config = {
      edgeTTSProxyUrl: config.edgeTTSProxyUrl || 'https://shu.66666618.xyz',
      autoSwitchThreshold: config.autoSwitchThreshold || 100,
      enableAutoSwitch: config.enableAutoSwitch !== false,
      preferredService: config.preferredService || 'edgetts'
    };

    this.webSpeechTTS = new WebSpeechTTS();
    this.edgeTTSService = new EdgeTTSService(this.config.edgeTTSProxyUrl);
    
    this.serviceType = this.config.preferredService!;
    this.currentService = this.getServiceByType(this.serviceType);
  }

  private getServiceByType(type: TTSServiceType): ITTSService {
    if (type === 'edgetts') {
      return this.edgeTTSService;
    }
    return this.webSpeechTTS;
  }

  getVoices(): SpeechSynthesisVoice[] {
    const voices = this.currentService.getVoices();
    return voices || [];
  }

  async refreshVoices(): Promise<void> {
    if (this.currentService.refreshVoices) {
      await this.currentService.refreshVoices();
    }
  }

  async speak(text: string, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): Promise<void> {
    const service = this.selectService(text);
    this.currentService = service;
    await service.speak(text, config, handlers);
  }

  private selectService(text: string): ITTSService {
    if (this.serviceType === 'webspeech') {
      return this.webSpeechTTS;
    }
    
    if (this.serviceType === 'edgetts') {
      return this.edgeTTSService;
    }

    if (!this.config.enableAutoSwitch) {
      return this.webSpeechTTS;
    }

    const textLength = text.length;
    const threshold = this.config.autoSwitchThreshold || 100;

    if (textLength <= threshold) {
      return this.webSpeechTTS;
    }

    return this.edgeTTSService;
  }

  pause(): void {
    this.currentService.pause();
  }

  async resume(): Promise<void> {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      await this.edgeTTSService.resumeQueue();
    } else {
      this.currentService.resume();
    }
  }

  stop(): void {
    this.currentService.stop();
  }

  isSpeaking(): boolean {
    return this.currentService.isSpeaking();
  }

  isPaused(): boolean {
    return this.currentService.isPaused();
  }

  speakSegment(segment: TextSegment, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.setSegments([segment]);
      this.edgeTTSService.playQueue();
      return;
    }
    this.speak(segment.text, config, handlers);
  }

  playAllSegments(segments: TextSegment[], startIndex: number = 0, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.setSegments(segments);
      this.edgeTTSService.setConfig(config);
      this.edgeTTSService.setHandlers(handlers);
      this.edgeTTSService.playQueue();
      return;
    }
    this.speak(segments[startIndex].text, config, handlers);
  }

  getServiceName(): string {
    return this.currentService.getServiceName();
  }

  getCurrentServiceType(): TTSServiceType {
    return this.serviceType;
  }

  setServiceType(type: TTSServiceType): void {
    this.serviceType = type;
    this.currentService = this.getServiceByType(type);
  }

  updateConfig(config: Partial<HybridTTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): HybridTTSConfig {
    return { ...this.config };
  }

  enableQueueMode(enable: boolean): void {
    this.useQueueMode = enable;
    this.edgeTTSService.enableQueueMode(enable);
  }

  setSegments(segments: TextSegment[]): void {
    this.edgeTTSService.setSegments(segments);
  }

  setConfig(config: TTSConfig): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.setConfig(config);
    }
  }

  setHandlers(handlers: SpeechEventHandlers): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.setHandlers(handlers);
    }
  }

  async playQueue(): Promise<void> {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      await this.edgeTTSService.playQueue();
    } else {
      throw new Error('Queue mode is only available with Edge-TTS service');
    }
  }

  pauseQueue(): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.pauseQueue();
    }
  }

  resumeQueue(): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.resumeQueue();
    }
  }

  stopQueue(): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.stopQueue();
    }
  }

  seekQueue(index: number): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.edgeTTSService.seekQueue(index);
    }
  }

  isQueueModeEnabled(): boolean {
    return this.useQueueMode;
  }
}
