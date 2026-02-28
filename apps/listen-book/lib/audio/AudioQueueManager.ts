import { AudioQueue, QueueSegment, AudioQueueHandlers } from './AudioQueue';
import { TextSegment } from '../textSegmenter';
import { TTSConfig } from '../tts/types';
import { SpeechEventHandlers } from '../tts/ITTSService';

export class AudioQueueManager {
  private audioQueue: AudioQueue;
  private segments: TextSegment[] = [];
  private currentConfig: TTSConfig = {};
  private eventHandlers: SpeechEventHandlers = {};
  private fetchFn: (text: string, signal: AbortSignal) => Promise<Blob>;

  constructor(
    fetchFn: (text: string, signal: AbortSignal) => Promise<Blob>,
    options?: {
      cacheOptions?: {
        maxSize?: number;
        maxEntries?: number;
        ttl?: number;
      };
      preloadOptions?: {
        concurrentLimit?: number;
        preloadAhead?: number;
      };
    }
  ) {
    this.fetchFn = fetchFn;
    this.audioQueue = new AudioQueue(fetchFn, options);
    this.setupQueueHandlers();
  }

  setSegments(segments: TextSegment[]): void {
    this.segments = segments;
    const queueSegments: QueueSegment[] = segments.map((seg, index) => ({
      id: `segment_${index}`,
      text: seg.text,
      index
    }));
    this.audioQueue.setSegments(queueSegments);
  }

  setConfig(config: TTSConfig): void {
    this.currentConfig = config;
  }

  setHandlers(handlers: SpeechEventHandlers): void {
    this.eventHandlers = handlers;
  }

  async play(): Promise<void> {
    await this.audioQueue.play();
  }

  pause(): void {
    this.audioQueue.pause();
  }

  async resume(): Promise<void> {
    await this.audioQueue.resume();
  }

  stop(): void {
    this.audioQueue.stop();
  }

  seek(index: number): void {
    this.audioQueue.seek(index);
  }

  getCurrentIndex(): number {
    return this.audioQueue.getCurrentIndex();
  }

  isPlaying(): boolean {
    return this.audioQueue.isQueuePlaying();
  }

  isPaused(): boolean {
    return this.audioQueue.isQueuePaused();
  }

  getCacheStats(): { size: number; currentSize: number } {
    return this.audioQueue.getCacheStats();
  }

  clearCache(): void {
    this.audioQueue.clearCache();
  }

  private setupQueueHandlers(): void {
    const queueHandlers: AudioQueueHandlers = {
      onSegmentStart: (_segment) => {
        this.eventHandlers.onStart?.();
      },
      onSegmentEnd: (_segment) => {
        this.eventHandlers.onEnd?.();
      },
      onQueueEnd: () => {
        this.eventHandlers.onEnd?.();
      },
      onError: (error) => {
        this.eventHandlers.onError?.(error);
      }
    };
    this.audioQueue.setHandlers(queueHandlers);
  }
}
