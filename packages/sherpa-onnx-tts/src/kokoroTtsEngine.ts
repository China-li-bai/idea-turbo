import {
  KokoroTtsConfig,
  KokoroModelConfig,
  TtsGenerationResult,
  TtsProgressCallback,
  ModelLoadStatus,
  KokoroTtsEngineOptions,
  DEFAULT_KOKORO_CONFIG,
  DEFAULT_MODEL_CONFIG,
  KOKORO_SPEAKERS,
  KokoroSpeaker,
} from './types';

let KokoroTTS: any = null;

export class KokoroTtsEngine {
  private config: KokoroTtsConfig;
  private modelConfig: KokoroModelConfig;
  private ttsInstance: any = null;
  private audioContext: AudioContext | null = null;
  private loadStatus: ModelLoadStatus = {
    isLoaded: false,
    isLoading: false,
    loadProgress: 0,
  };
  private debug: boolean;

  constructor(options: KokoroTtsEngineOptions = {}) {
    this.config = {
      ...DEFAULT_KOKORO_CONFIG,
      speakerId: options.defaultSpeakerId ?? DEFAULT_KOKORO_CONFIG.speakerId,
      speed: options.defaultSpeed ?? DEFAULT_KOKORO_CONFIG.speed,
    };
    this.modelConfig = {
      ...DEFAULT_MODEL_CONFIG,
      ...options.modelConfig,
    };
    this.debug = options.debug ?? false;
  }

  async initialize(callbacks?: TtsProgressCallback): Promise<void> {
    if (this.loadStatus.isLoaded) {
      this.log('Already initialized');
      return;
    }

    if (this.loadStatus.isLoading) {
      this.log('Initialization in progress');
      return;
    }

    this.loadStatus.isLoading = true;
    this.loadStatus.loadProgress = 0;

    try {
      callbacks?.onProgress(10, 'Loading kokoro-js library');
      await this.loadKokoroJs();

      callbacks?.onProgress(30, 'Loading Kokoro model');
      const { KokoroTTS: Koko } = await import('kokoro-js');
      KokoroTTS = Koko;

      callbacks?.onProgress(50, 'Initializing model');
      this.ttsInstance = await KokoroTTS.from_pretrained(
        this.modelConfig.modelUrl,
        {
          dtype: 'q8',
          device: 'wasm',
        }
      );

      callbacks?.onProgress(100, 'Ready');
      this.loadStatus.isLoaded = true;
      this.loadStatus.isLoading = false;
      this.loadStatus.loadProgress = 100;

      this.log('Initialization complete');
    } catch (error) {
      this.loadStatus.isLoading = false;
      this.loadStatus.error = (error as Error).message;
      callbacks?.onError(error as Error);
      throw error;
    }
  }

  private async loadKokoroJs(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('KokoroTtsEngine can only be used in browser environment');
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/transformers@latest/dist/transformers.min.js';
    
    return new Promise((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load transformers.js'));
      document.head.appendChild(script);
    });
  }

  async generate(
    text: string,
    speakerId?: number,
    speed?: number,
    callbacks?: TtsProgressCallback
  ): Promise<TtsGenerationResult> {
    if (!this.ttsInstance) {
      throw new Error('TTS engine not initialized. Call initialize() first.');
    }

    const voice = this.getVoiceById(speakerId ?? this.config.speakerId);
    const voiceName = voice?.name ?? 'af_heart';

    this.log(`Generating speech for: "${text}" (voice: ${voiceName})`);

    try {
      callbacks?.onProgress(0, 'Generating audio');

      const audio = await this.ttsInstance.generate(text, {
        voice: voiceName,
      });

      callbacks?.onProgress(50, 'Processing audio');

      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      const wavData = audio.toWav();
      const arrayBuffer = wavData.buffer.slice(
        wavData.byteOffset,
        wavData.byteOffset + wavData.byteLength
      );
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const duration = audioBuffer.duration;

      const result: TtsGenerationResult = {
        audioBuffer,
        sampleRate: audioBuffer.sampleRate,
        duration,
        text,
        speakerId: speakerId ?? this.config.speakerId,
      };

      callbacks?.onComplete(result);
      return result;
    } catch (error) {
      callbacks?.onError(error as Error);
      throw error;
    }
  }

  async play(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }

  async generateAndPlay(
    text: string,
    speakerId?: number,
    speed?: number
  ): Promise<void> {
    const result = await this.generate(text, speakerId, speed);
    await this.play(result.audioBuffer);
  }

  getLoadStatus(): ModelLoadStatus {
    return { ...this.loadStatus };
  }

  getSpeakers(): KokoroSpeaker[] {
    return KOKORO_SPEAKERS;
  }

  getSpeakersByLanguage(language: string): KokoroSpeaker[] {
    return KOKORO_SPEAKERS.filter((s) => s.language === language);
  }

  getSpeakerById(id: number): KokoroSpeaker | undefined {
    return KOKORO_SPEAKERS.find((s) => s.id === id);
  }

  private getVoiceById(id: number): KokoroSpeaker | undefined {
    return KOKORO_SPEAKERS.find((s) => s.id === id);
  }

  setDefaultSpeaker(speakerId: number): void {
    this.config.speakerId = speakerId;
  }

  setDefaultSpeed(speed: number): void {
    this.config.speed = speed;
  }

  isReady(): boolean {
    return this.loadStatus.isLoaded;
  }

  destroy(): void {
    this.ttsInstance = null;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.loadStatus = {
      isLoaded: false,
      isLoading: false,
      loadProgress: 0,
    };
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[KokoroTtsEngine]', ...args);
    }
  }
}
