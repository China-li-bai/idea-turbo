import type {
  PlaybackState,
  PlaybackError,
  TextSegment,
  TextParagraph,
  VoiceOption,
  PlaybackControlOptions,
} from '../types';
import { generateId } from '../utils';

export interface PlaybackConfig {
  defaultSpeed: number;
  defaultVolume: number;
  minSpeed: number;
  maxSpeed: number;
  minVolume: number;
  maxVolume: number;
  segmentDelay: number;
  autoPlay: boolean;
}

export const defaultPlaybackConfig: PlaybackConfig = {
  defaultSpeed: 1,
  defaultVolume: 1,
  minSpeed: 0.25,
  maxSpeed: 3,
  minVolume: 0,
  maxVolume: 1,
  segmentDelay: 100,
  autoPlay: false,
};

export class PlaybackController {
  private state: PlaybackState;
  private config: PlaybackConfig;
  private options: PlaybackControlOptions;
  private segments: TextSegment[] = [];
  private paragraphs: TextParagraph[] = [];
  private speechSynthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(config: Partial<PlaybackConfig> = {}, options: Partial<PlaybackControlOptions> = {}) {
    this.config = { ...defaultPlaybackConfig, ...config };
    this.options = {
      autoScroll: true,
      highlightCurrent: true,
      loop: false,
      skipEmpty: true,
      ...options,
    };
    this.speechSynthesis = window.speechSynthesis;
    this.state = this.createInitialState();
  }

  private createInitialState(): PlaybackState {
    return {
      isPlaying: false,
      isPaused: false,
      currentSegmentId: 0,
      currentParagraphId: 0,
      playbackProgress: 0,
      speed: this.config.defaultSpeed,
      volume: this.config.defaultVolume,
      voice: null,
      error: null,
      startTime: 0,
      pausedAt: 0,
    };
  }

  setContent(segments: TextSegment[], paragraphs: TextParagraph[]): void {
    console.log('PlaybackController.setContent:', { segments: segments.length, paragraphs: paragraphs.length });
    this.segments = segments;
    this.paragraphs = paragraphs;
    this.state.currentSegmentId = 0;
    this.state.currentParagraphId = this.getParagraphForSegment(0)?.id ?? 0;
    this.state.playbackProgress = this.calculateProgress(0);
  }

  getState(): PlaybackState {
    return { ...this.state };
  }

  getAvailableVoices(): VoiceOption[] {
    const voices = this.speechSynthesis.getVoices();
    return voices.map(voice => ({
      id: voice.voiceURI || generateId(),
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default,
    }));
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this.state.voice = voice;
    if (this.state.isPaused && this.currentUtterance) {
      this.currentUtterance.voice = voice;
    }
  }

  setSpeed(speed: number): void {
    const clampedSpeed = Math.max(this.config.minSpeed, Math.min(this.config.maxSpeed, speed));
    this.state.speed = clampedSpeed;
    if (this.currentUtterance) {
      this.currentUtterance.rate = clampedSpeed;
    }
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(this.config.minVolume, Math.min(this.config.maxVolume, volume));
    this.state.volume = clampedVolume;
    if (this.currentUtterance) {
      this.currentUtterance.volume = clampedVolume;
    }
  }

  get speed(): number {
    return this.state.speed;
  }

  get volume(): number {
    return this.state.volume;
  }

  get voice(): SpeechSynthesisVoice | null {
    return this.state.voice;
  }

  getSegments(): TextSegment[] {
    return this.segments;
  }

  getParagraphs(): TextParagraph[] {
    return this.paragraphs;
  }

  get isPlaying(): boolean {
    return this.state.isPlaying;
  }

  get isPaused(): boolean {
    return this.state.isPaused;
  }

  play(): Promise<void> {
    console.log('PlaybackController.play called', {
      isPlaying: this.state.isPlaying,
      segments: this.segments.length,
      currentSegmentId: this.state.currentSegmentId,
    });

    return new Promise((resolve, reject) => {
      if (this.state.isPlaying) {
        console.log('Already playing, resolving');
        resolve();
        return;
      }

      if (this.segments.length === 0) {
        console.error('No content to play');
        this.setError('NO_CONTENT', '没有可播放的内容', 0, true);
        reject(new Error('No content to play'));
        return;
      }

      const currentSegment = this.segments[this.state.currentSegmentId];
      if (!currentSegment) {
        console.error('Invalid segment at index:', this.state.currentSegmentId);
        this.state.currentSegmentId = 0;
        this.setError('INVALID_SEGMENT', '当前段落无效', this.state.currentSegmentId, true);
        reject(new Error('Invalid segment'));
        return;
      }

      console.log('Playing segment:', currentSegment);

      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.state.error = null;
      this.state.startTime = Date.now();

      this.speakSegment(currentSegment)
        .then(() => {
          console.log('Segment completed');
          this.handleSegmentComplete();
          resolve();
        })
        .catch((error) => {
          console.error('Segment error:', error);
          this.handlePlaybackError(error);
          reject(error);
        });
    });
  }

  pause(): void {
    if (!this.state.isPlaying) return;

    this.speechSynthesis.pause();
    this.state.isPaused = true;
    this.state.pausedAt = Date.now();

    this.emit('pause', { timestamp: this.state.pausedAt });
  }

  resume(): void {
    if (!this.state.isPaused || !this.state.isPlaying) return;

    this.speechSynthesis.resume();
    this.state.isPaused = false;
    this.state.pausedAt = 0;

    this.emit('resume', { timestamp: Date.now() });
  }

  stop(): void {
    this.speechSynthesis.cancel();
    this.currentUtterance = null;

    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.startTime = 0;
    this.state.pausedAt = 0;

    const lastSegmentId = this.state.currentSegmentId;
    this.state.currentSegmentId = 0;

    this.emit('stop', { timestamp: Date.now(), segmentId: lastSegmentId });
  }

  seek(segmentId: number): void {
    const targetSegment = this.segments[segmentId];
    if (!targetSegment) {
      this.setError('INVALID_SEGMENT', `段落 ${segmentId} 不存在`, segmentId, false);
      return;
    }

    const wasPlaying = this.state.isPlaying;
    this.stop();

    this.state.currentSegmentId = segmentId;
    this.state.currentParagraphId = this.getParagraphForSegment(segmentId)?.id ?? 0;
    this.state.playbackProgress = this.calculateProgress(segmentId);

    this.emit('seek', { segmentId, paragraphId: this.state.currentParagraphId });

    if (wasPlaying) {
      this.play().catch(() => {});
    }
  }

  nextParagraph(): void {
    const nextParagraph = this.getNextParagraph();
    if (nextParagraph) {
      this.seek(nextParagraph.startSegmentId);
    }
  }

  previousParagraph(): void {
    const previousParagraph = this.getPreviousParagraph();
    if (previousParagraph) {
      this.seek(previousParagraph.startSegmentId);
    }
  }

  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  private speakSegment(segment: TextSegment): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.options.skipEmpty && !segment.text.trim()) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(segment.text);
      this.currentUtterance = utterance;

      utterance.rate = this.state.speed;
      utterance.volume = this.state.volume;
      utterance.voice = this.state.voice ?? null;

      utterance.onstart = () => {
        this.emit('segmentStart', { segment });
        this.state.playbackProgress = this.calculateProgress(segment.id);
      };

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
          this.setError(
            'SPEECH_ERROR',
            `语音合成错误: ${event.error}`,
            segment.id,
            false
          );
        }
        reject(new Error(event.error));
      };

      this.speechSynthesis.speak(utterance);
    });
  }

  private handleSegmentComplete(): void {
    const completedSegmentId = this.state.currentSegmentId;
    const nextSegmentId = completedSegmentId + 1;

    this.emit('segmentComplete', { segmentId: completedSegmentId });

    if (nextSegmentId >= this.segments.length) {
      if (this.options.loop) {
        this.seek(0);
        return;
      }
      this.stop();
      this.emit('complete', { totalSegments: this.segments.length });
      return;
    }

    this.state.currentSegmentId = nextSegmentId;
    const nextParagraph = this.getParagraphForSegment(nextSegmentId);
    if (nextParagraph && nextParagraph.id !== this.state.currentParagraphId) {
      this.state.currentParagraphId = nextParagraph.id;
      this.emit('paragraphChange', { paragraph: nextParagraph });
    }

    setTimeout(() => {
      if (this.state.isPlaying && !this.state.isPaused) {
        this.play().catch(() => {});
      }
    }, this.config.segmentDelay);
  }

  private handlePlaybackError(error: Error): void {
    this.state.isPlaying = false;
    this.state.isPaused = false;

    this.emit('error', { error: this.state.error, originalError: error });
  }

  private getParagraphForSegment(segmentId: number): TextParagraph | null {
    for (const paragraph of this.paragraphs) {
      if (segmentId >= paragraph.startSegmentId && segmentId <= paragraph.endSegmentId) {
        return paragraph;
      }
    }
    return null;
  }

  private getNextParagraph(): TextParagraph | null {
    if (this.state.currentParagraphId >= this.paragraphs.length - 1) {
      return null;
    }
    return this.paragraphs[this.state.currentParagraphId + 1];
  }

  private getPreviousParagraph(): TextParagraph | null {
    if (this.state.currentParagraphId <= 0) {
      return null;
    }
    return this.paragraphs[this.state.currentParagraphId - 1];
  }

  private calculateProgress(segmentId: number): number {
    if (this.segments.length === 0) return 0;
    return (segmentId / this.segments.length) * 100;
  }

  private setError(code: string, message: string, segmentId: number, recoverable: boolean): void {
    this.state.error = {
      code,
      message,
      segmentId,
      timestamp: Date.now(),
      recoverable,
    };
    this.emit('error', { error: this.state.error });
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  destroy(): void {
    this.stop();
    this.eventHandlers.clear();
  }

  static create(config?: Partial<PlaybackConfig>, options?: Partial<PlaybackControlOptions>): PlaybackController {
    return new PlaybackController(config, options);
  }
}
