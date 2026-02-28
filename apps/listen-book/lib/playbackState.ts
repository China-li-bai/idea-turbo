import { TextSegment } from './textSegmenter';
import { TTSConfig } from './tts/types';

export interface PlaybackState {
  segments: TextSegment[];
  currentSegmentId: number | null;
  isPlaying: boolean;
  isPaused: boolean;
  config: TTSConfig;
  text: string;
}

export class PlaybackStateManager {
  private state: PlaybackState;
  private listeners: Set<(state: PlaybackState) => void> = new Set();

  constructor() {
    this.state = {
      segments: [],
      currentSegmentId: null,
      isPlaying: false,
      isPaused: false,
      config: {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      },
      text: ''
    };
  }

  getState(): PlaybackState {
    return { ...this.state };
  }

  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  setText(text: string): void {
    this.state.text = text;
    this.state.segments = [];
    this.state.currentSegmentId = null;
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.notify();
  }

  setSegments(segments: TextSegment[]): void {
    this.state.segments = segments;
    this.state.currentSegmentId = null;
    this.notify();
  }

  setCurrentSegmentId(id: number | null): void {
    this.state.currentSegmentId = id;
    this.notify();
  }

  setPlaying(isPlaying: boolean): void {
    this.state.isPlaying = isPlaying;
    if (isPlaying) {
      this.state.isPaused = false;
    }
    this.notify();
  }

  setPaused(isPaused: boolean): void {
    this.state.isPaused = isPaused;
    this.notify();
  }

  setConfig(config: Partial<TTSConfig>): void {
    this.state.config = { ...this.state.config, ...config };
    this.notify();
  }

  getCurrentSegment(): TextSegment | undefined {
    if (this.state.currentSegmentId === null) {
      return undefined;
    }
    return this.state.segments.find(s => s.id === this.state.currentSegmentId);
  }

  getNextSegment(): TextSegment | undefined {
    if (this.state.currentSegmentId === null) {
      return this.state.segments[0];
    }
    return this.state.segments.find(s => s.id === (this.state.currentSegmentId ?? 0) + 1);
  }

  getPreviousSegment(): TextSegment | undefined {
    if (this.state.currentSegmentId === null) {
      return undefined;
    }
    return this.state.segments.find(s => s.id === (this.state.currentSegmentId ?? 0) - 1);
  }

  reset(): void {
    this.state = {
      segments: [],
      currentSegmentId: null,
      isPlaying: false,
      isPaused: false,
      config: {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      },
      text: ''
    };
    this.notify();
  }
}
