import { AudioCache } from './AudioCache';
import { AudioPreloader, PreloadRequest } from './AudioPreloader';

export interface QueueSegment {
  id: string;
  text: string;
  index: number;
}

export interface AudioQueueOptions {
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

export interface AudioQueueHandlers {
  onSegmentStart?: (segment: QueueSegment) => void;
  onSegmentEnd?: (segment: QueueSegment) => void;
  onQueueEnd?: () => void;
  onError?: (error: Error) => void;
}

export class AudioQueue {
  private cache: AudioCache;
  private preloader: AudioPreloader;
  private segments: QueueSegment[] = [];
  private currentIndex: number = 0;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private fetchFn: (text: string, signal: AbortSignal) => Promise<Blob>;
  private handlers: AudioQueueHandlers = {};

  constructor(
    fetchFn: (text: string, signal: AbortSignal) => Promise<Blob>,
    options: AudioQueueOptions = {}
  ) {
    this.fetchFn = fetchFn;
    this.cache = new AudioCache(options.cacheOptions);
    this.preloader = new AudioPreloader(
      fetchFn,
      options.preloadOptions,
      (id: string, blob: Blob) => {
        this.cache.set(id, blob);
      }
    );
  }

  setSegments(segments: QueueSegment[]): void {
    this.stop();
    this.segments = segments;
    this.currentIndex = 0;
  }

  setHandlers(handlers: AudioQueueHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  async play(): Promise<void> {
    if (this.isPlaying) {
      return;
    }

    if (this.isPaused && this.audioElement) {
      await this.audioElement.play();
      this.isPlaying = true;
      this.isPaused = false;
      return;
    }

    if (this.currentIndex >= this.segments.length) {
      this.currentIndex = 0;
    }

    this.isPlaying = true;
    this.isPaused = false;

    await this.playSegment(this.currentIndex);
  }

  pause(): void {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.isPaused = true;
      this.isPlaying = false;
    }
  }

  async resume(): Promise<void> {
    if (this.isPaused && this.audioElement) {
      await this.audioElement.play();
      this.isPaused = false;
      this.isPlaying = true;
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.preloader.cancelAll();
  }

  seek(index: number): void {
    if (index < 0 || index >= this.segments.length) {
      return;
    }

    this.stop();
    this.currentIndex = index;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  isQueuePlaying(): boolean {
    return this.isPlaying;
  }

  isQueuePaused(): boolean {
    return this.isPaused;
  }

  getCacheStats(): { size: number; currentSize: number } {
    return {
      size: this.cache.size(),
      currentSize: this.cache.getCurrentSize()
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async playSegment(index: number): Promise<void> {
    if (index >= this.segments.length) {
      this.isPlaying = false;
      this.handlers.onQueueEnd?.();
      return;
    }

    const segment = this.segments[index];
    this.handlers.onSegmentStart?.(segment);

    try {
      const audioUrl = await this.getAudioUrl(segment);
      this.setupAudioElement(audioUrl, segment);
      this.triggerPreload(index);
      await this.audioElement!.play();
    } catch (error) {
      console.error(`Failed to play segment ${index}:`, error);
      this.isPlaying = false;
      this.handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async getAudioUrl(segment: QueueSegment): Promise<string> {
    const cacheKey = this.getCacheKey(segment);

    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      return entry.url;
    }

    const blob = await this.fetchFn(segment.text, new AbortController().signal);
    return this.cache.set(cacheKey, blob);
  }

  private setupAudioElement(url: string, segment: QueueSegment): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    this.audioElement = new Audio(url);

    this.audioElement.onended = () => {
      this.handlers.onSegmentEnd?.(segment);
      this.currentIndex++;
      if (this.isPlaying) {
        this.playSegment(this.currentIndex);
      }
    };

    this.audioElement.onerror = (event) => {
      const audioError = this.audioElement?.error;
      const errorMessage = audioError ? {
        code: audioError.code,
        message: audioError.message,
        codeDescription: this.getAudioErrorCodeDescription(audioError.code)
      } : 'Unknown error';
      
      console.error('Audio playback error:', errorMessage, 'Event:', event);
      console.error('Audio URL:', url);
      console.error('Segment:', segment);
      
      this.isPlaying = false;
      const error = new Error(`Audio playback failed: ${audioError?.message || 'Unknown error'}`);
      this.handlers.onError?.(error);
    };
  }

  private getAudioErrorCodeDescription(code: number): string {
    const errorCodes: Record<number, string> = {
      1: 'MEDIA_ERR_ABORTED - The fetching process for the media resource was aborted by the user agent at the user\'s request',
      2: 'MEDIA_ERR_NETWORK - A network error of some description caused the user agent to stop fetching the media resource',
      3: 'MEDIA_ERR_DECODE - An error of some description occurred while decoding the media resource',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The media resource indicated by the src attribute was not suitable'
    };
    return errorCodes[code] || `Unknown error code: ${code}`;
  }

  private triggerPreload(currentIndex: number): void {
    const preloadRequests: PreloadRequest[] = [];
    const preloadAhead = 3;

    for (let i = 1; i <= preloadAhead; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex >= this.segments.length) {
        break;
      }

      const segment = this.segments[nextIndex];
      const cacheKey = this.getCacheKey(segment);

      if (!this.cache.has(cacheKey)) {
        preloadRequests.push({
          id: cacheKey,
          text: segment.text,
          priority: preloadAhead - i + 1
        });
      }
    }

    if (preloadRequests.length > 0) {
      this.preloader.preload(preloadRequests);
    }
  }

  private getCacheKey(segment: QueueSegment): string {
    return `segment_${segment.index}_${segment.text.slice(0, 50)}`;
  }
}
