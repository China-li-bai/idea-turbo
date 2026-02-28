import { ITTSService, SpeechEventHandlers } from './ITTSService';
import { TTSConfig } from './types';
import { TextSegment } from '../textSegmenter';
import { MediaSessionManager } from '../mediaSessionManager';

export class WebSpeechTTS implements ITTSService {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private eventHandlers: SpeechEventHandlers = {};
  private mediaSessionManager: MediaSessionManager;
  private currentText: string = '';
  private currentConfig: TTSConfig = {};
  private isPlaying: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoadPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      throw new Error('Speech synthesis is not supported in this browser');
    }
    this.synthesis = window.speechSynthesis;
    this.mediaSessionManager = new MediaSessionManager();
    this.setupMediaSession();
    this.setupVoices();
  }

  private setupVoices(): void {
    const loadVoices = () => {
      this.voices = this.synthesis.getVoices();
    };

    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  private setupMediaSession(): void {
    this.mediaSessionManager.setup({
      onPlay: () => {
        if (this.isPaused()) {
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

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  async refreshVoices(): Promise<void> {
    if (this.voicesLoadPromise) {
      return this.voicesLoadPromise;
    }
    
    this.voicesLoadPromise = new Promise<void>((resolve) => {
      const checkVoices = () => {
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          this.voices = voices;
          this.voicesLoadPromise = null;
          resolve();
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      checkVoices();
    });
    
    return this.voicesLoadPromise;
  }

  speak(text: string, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): Promise<void> {
    this.stop();
    
    this.currentText = text;
    this.currentConfig = config;
    this.eventHandlers = handlers;
    this.currentUtterance = new SpeechSynthesisUtterance(text);

    if (config.voiceURI) {
      const voice = this.getVoices().find(v => v.voiceURI === config.voiceURI);
      if (voice) {
        this.currentUtterance.voice = voice;
      }
    }

    if (config.rate !== undefined) {
      this.currentUtterance.rate = config.rate;
    }

    if (config.pitch !== undefined) {
      this.currentUtterance.pitch = config.pitch;
    }

    if (config.volume !== undefined) {
      this.currentUtterance.volume = config.volume;
    }

    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      this.mediaSessionManager.setPlaybackState('playing');
      this.mediaSessionManager.setMetadata({
        title: '文本朗读',
        artist: 'Web Speech API',
        album: 'Listen Book'
      });
      this.eventHandlers.onStart?.();
    };

    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.mediaSessionManager.setPlaybackState('none');
      this.eventHandlers.onEnd?.();
      this.currentUtterance = null;
    };

    this.currentUtterance.onerror = (event) => {
      this.isPlaying = false;
      this.mediaSessionManager.setPlaybackState('none');
      this.eventHandlers.onError?.(event);
      this.currentUtterance = null;
    };

    this.currentUtterance.onboundary = (event) => {
      this.eventHandlers.onBoundary?.(event);
    };

    this.synthesis.speak(this.currentUtterance);
    return Promise.resolve();
  }

  pause(): void {
    this.synthesis.pause();
    this.mediaSessionManager.setPlaybackState('paused');
  }

  resume(): void {
    this.synthesis.resume();
    this.mediaSessionManager.setPlaybackState('playing');
  }

  stop(): void {
    if (this.currentUtterance) {
      this.eventHandlers = {};
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  isPaused(): boolean {
    return this.synthesis.paused;
  }

  speakSegment(segment: TextSegment, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): void {
    this.speak(segment.text, config, handlers);
  }

  getServiceName(): string {
    return 'Web Speech API';
  }
}
