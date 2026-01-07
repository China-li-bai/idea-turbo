export interface TextSegment {
  id: number;
  text: string;
  startIndex: number;
  endIndex: number;
  paragraphId: number;
}

export interface TextParagraph {
  id: number;
  startSegmentId: number;
  endSegmentId: number;
  segmentCount: number;
  charCount: number;
}

export interface TextDocument {
  id: string;
  rawText: string;
  processedText: string;
  segments: TextSegment[];
  paragraphs: TextParagraph[];
  metadata: {
    totalChars: number;
    totalSegments: number;
    totalParagraphs: number;
    createdAt: number;
    updatedAt: number;
  };
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSegmentId: number;
  currentParagraphId: number;
  playbackProgress: number;
  speed: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
  error: PlaybackError | null;
  startTime: number;
  pausedAt: number;
}

export interface PlaybackError {
  code: string;
  message: string;
  segmentId: number;
  timestamp: number;
  recoverable: boolean;
}

export interface TextInputSource {
  type: 'clipboard' | 'file' | 'manual';
  format: 'text' | 'markdown' | 'html' | 'unknown';
  name?: string;
  size?: number;
}

export interface FileImportResult {
  success: boolean;
  text?: string;
  format?: string;
  error?: string;
}

export interface TextProcessingResult {
  success: boolean;
  document?: TextDocument;
  error?: string;
  processingTime: number;
}

export interface PlaybackControlOptions {
  autoScroll: boolean;
  highlightCurrent: boolean;
  loop: boolean;
  skipEmpty: boolean;
}

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  lastConnectedAt: number | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}
