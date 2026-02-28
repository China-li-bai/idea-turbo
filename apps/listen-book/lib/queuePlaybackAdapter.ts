import { HybridTTSService } from './tts/HybridTTSService';
import { PlaybackStateManager } from './playbackState';
import { TextSegment } from './textSegmenter';
import { TTSConfig } from './tts/types';
import { SpeechEventHandlers } from './tts/ITTSService';

export interface QueuePlaybackOptions {
  enableQueueMode?: boolean;
  autoSwitchToQueue?: boolean;
  fallbackToTraditional?: boolean;
}

export class QueuePlaybackAdapter {
  private hybridTTSService: HybridTTSService;
  private playbackStateManager: PlaybackStateManager;
  private options: QueuePlaybackOptions;

  constructor(
    hybridTTSService: HybridTTSService,
    playbackStateManager: PlaybackStateManager,
    options: QueuePlaybackOptions = {}
  ) {
    this.hybridTTSService = hybridTTSService;
    this.playbackStateManager = playbackStateManager;
    this.options = {
      enableQueueMode: options.enableQueueMode ?? true,
      autoSwitchToQueue: options.autoSwitchToQueue ?? true,
      fallbackToTraditional: options.fallbackToTraditional ?? true
    };
  }

  enableQueueMode(enable: boolean): void {
    this.options.enableQueueMode = enable;
    this.hybridTTSService.enableQueueMode(enable);
  }

  isQueueModeEnabled(): boolean {
    return (this.options.enableQueueMode ?? false) && this.hybridTTSService.isQueueModeEnabled();
  }

  isQueueAvailable(): boolean {
    return (
      (this.options.enableQueueMode ?? false) &&
      this.hybridTTSService.getCurrentServiceType() === 'edgetts'
    );
  }

  async play(): Promise<void> {
    const state = this.playbackStateManager.getState();

    if (state.isPaused) {
      this.resume();
      return;
    }

    if (this.isQueueAvailable()) {
      await this.playWithQueue();
    } else {
      await this.playWithTraditionalMethod();
    }
  }

  private async playWithQueue(): Promise<void> {
    const state = this.playbackStateManager.getState();

    this.hybridTTSService.setSegments(state.segments);

    try {
      await this.hybridTTSService.playQueue();
      this.playbackStateManager.setPlaying(true);
    } catch (error) {
      console.error('Queue play error:', error);

      if (this.options.fallbackToTraditional) {
        await this.playWithTraditionalMethod();
      } else {
        throw error;
      }
    }
  }

  private async playWithTraditionalMethod(): Promise<void> {
    const state = this.playbackStateManager.getState();

    let segmentToPlay: TextSegment | undefined;

    if (state.currentSegmentId !== null) {
      segmentToPlay = this.playbackStateManager.getCurrentSegment();
    } else if (state.segments.length > 0) {
      segmentToPlay = state.segments[0];
      this.playbackStateManager.setCurrentSegmentId(0);
    }

    if (segmentToPlay) {
      this.playbackStateManager.setPlaying(true);

      const handlers: SpeechEventHandlers = {
        onStart: () => {},
        onEnd: () => {
          this.handleNextSegment();
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.playbackStateManager.setPlaying(false);
        }
      };

      this.hybridTTSService.speakSegment(segmentToPlay, state.config, handlers);
    }
  }

  pause(): void {
    if (this.isQueueAvailable()) {
      this.hybridTTSService.pauseQueue();
    } else {
      this.hybridTTSService.pause();
    }
    this.playbackStateManager.setPaused(true);
  }

  resume(): void {
    if (this.isQueueAvailable()) {
      this.hybridTTSService.resumeQueue();
    } else {
      this.hybridTTSService.resume();
    }
    this.playbackStateManager.setPaused(false);
  }

  stop(): void {
    if (this.isQueueAvailable()) {
      this.hybridTTSService.stopQueue();
    } else {
      this.hybridTTSService.stop();
    }
    this.playbackStateManager.setPlaying(false);
    this.playbackStateManager.setPaused(false);
  }

  next(): void {
    if (this.isQueueAvailable()) {
      const state = this.playbackStateManager.getState();
      const nextIndex = (state.currentSegmentId ?? -1) + 1;
      if (nextIndex < state.segments.length) {
        this.hybridTTSService.seekQueue(nextIndex);
      }
    } else {
      this.handleNextSegment();
    }
  }

  previous(): void {
    if (this.isQueueAvailable()) {
      const state = this.playbackStateManager.getState();
      const previousIndex = (state.currentSegmentId ?? 0) - 1;
      if (previousIndex >= 0) {
        this.hybridTTSService.seekQueue(previousIndex);
      }
    } else {
      this.handlePreviousSegment();
    }
  }

  seek(index: number): void {
    if (this.isQueueAvailable()) {
      this.hybridTTSService.seekQueue(index);
    } else {
      this.handleSeek(index);
    }
  }

  private handleNextSegment(): void {
    const nextSegment = this.playbackStateManager.getNextSegment();
    if (nextSegment) {
      this.playbackStateManager.setCurrentSegmentId(nextSegment.id);
      const state = this.playbackStateManager.getState();

      const handlers: SpeechEventHandlers = {
        onEnd: () => {
          this.handleNextSegment();
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.playbackStateManager.setPlaying(false);
        }
      };

      this.hybridTTSService.speakSegment(nextSegment, state.config, handlers);
    } else {
      this.playbackStateManager.setPlaying(false);
    }
  }

  private handlePreviousSegment(): void {
    const previousSegment = this.playbackStateManager.getPreviousSegment();
    if (previousSegment) {
      this.hybridTTSService.stop();
      this.playbackStateManager.setCurrentSegmentId(previousSegment.id);
      this.playbackStateManager.setPlaying(false);
    }
  }

  private handleSeek(index: number): void {
    const state = this.playbackStateManager.getState();
    const segment = state.segments.find(s => s.id === index);

    if (segment) {
      this.hybridTTSService.stop();
      this.playbackStateManager.setCurrentSegmentId(index);
      this.playbackStateManager.setPlaying(false);
    }
  }

  updateConfig(config: Partial<TTSConfig>): void {
    this.playbackStateManager.setConfig(config);
  }

  getOptions(): QueuePlaybackOptions {
    return { ...this.options };
  }

  updateOptions(options: Partial<QueuePlaybackOptions>): void {
    this.options = { ...this.options, ...options };
    this.hybridTTSService.enableQueueMode(this.options.enableQueueMode ?? false);
  }
}
