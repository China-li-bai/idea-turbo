export interface Voice {
  id: string;
  name: string;
  lang: Language;
  gender: 'Male' | 'Female';
  targetQuality: string;
  overallGrade: string;
}

export interface Language {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  quantization: string;
  size: string;
}

export interface VoiceWeight {
  voiceId: string;
  weight: number;
}

export interface GenerateOptions {
  voice?: string;
  speed?: number;
  lang?: string;
  model?: string;
  acceleration?: 'cpu' | 'webgpu';
}

export interface TtsResult {
  audioBuffer: AudioBuffer;
  waveform: Float32Array;
  sampleRate: number;
  duration: number;
}

export interface TextChunk {
  type: 'text';
  content: string;
  tokens: number[];
}

export interface SilenceChunk {
  type: 'silence';
  durationSeconds: number;
}

export type TextProcessorChunk = TextChunk | SilenceChunk;

export interface ProgressInfo {
  status: 'downloading' | 'loading' | 'ready' | 'error';
  file?: string;
  progress: number;
  message?: string;
  fromCache?: boolean;
}

export type ProgressCallback = (info: ProgressInfo) => void;

export interface KokoroEngine {
  isReady: boolean;
  initialize(options?: InitOptions): Promise<void>;
  generate(text: string, options?: GenerateOptions): Promise<TtsResult>;
  speak(text: string, options?: GenerateOptions): Promise<void>;
  destroy(): void;
}

export interface InitOptions {
  model?: string;
  acceleration?: 'cpu' | 'webgpu' | 'auto';
  dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' | 'uint8' | 'uint8f16' | 'quantized' | 'q8f16';
}

export interface UseKokoroTtsOptions {
  defaultVoice?: string;
  autoInit?: boolean;
  acceleration?: 'cpu' | 'webgpu' | 'auto';
  dtype?: InitOptions['dtype'];
  debug?: boolean;
}

export interface UseKokoroTtsReturn {
  isReady: boolean;
  isLoading: boolean;
  loadProgress: number;
  error: string | null;
  voices: Voice[];
  currentVoice: Voice | null;
  languages: Language[];
  generate: (text: string, voiceId?: string, speed?: number) => Promise<TtsResult>;
  speak: (text: string, voiceId?: string, speed?: number) => Promise<void>;
  setVoice: (voiceId: string) => void;
  initialize: () => Promise<void>;
  destroy: () => void;
}
