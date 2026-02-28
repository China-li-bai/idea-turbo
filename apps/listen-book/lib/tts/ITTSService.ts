import { TTSConfig } from './types';
import { TextSegment } from '../textSegmenter';

export interface SpeechEventHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent | Error) => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

export interface ITTSService {
  getVoices(): SpeechSynthesisVoice[];
  speak(text: string, config: TTSConfig, handlers: SpeechEventHandlers): void | Promise<void>;
  speakSegment(segment: TextSegment, config: TTSConfig, handlers: SpeechEventHandlers): void;
  pause(): void;
  resume(): void;
  stop(): void;
  isSpeaking(): boolean;
  isPaused(): boolean;
  getServiceName(): string;
  refreshVoices?(): void | Promise<void>;
}
