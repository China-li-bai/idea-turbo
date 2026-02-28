import { TTSConfig } from './tts/types';
import { TextSegment } from './textSegmenter';
import { MediaSessionManager } from './mediaSessionManager';
import { WebSpeechTTS } from './tts/WebSpeechTTS';
import { EdgeTTSService } from './tts/EdgeTTSService';
import { HybridTTSService, HybridTTSConfig } from './tts/HybridTTSService';

export interface SpeechEventHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

export class SpeechService extends WebSpeechTTS {
  constructor() {
    super();
  }
}

export { WebSpeechTTS, EdgeTTSService, HybridTTSService };
export type { HybridTTSConfig, TTSServiceType } from './tts/HybridTTSService';
export type { ITTSService } from './tts/ITTSService';