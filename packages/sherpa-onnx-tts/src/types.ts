export type KokoroLanguage = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'es' | 'hi' | 'it' | 'pt';

export interface KokoroSpeaker {
  id: number;
  name: string;
  language: KokoroLanguage;
  gender: 'male' | 'female';
  description?: string;
}

export interface KokoroTtsConfig {
  speakerId: number;
  speed: number;
  silenceDuration: number;
  modelProvider: 'local' | 'cdn';
  cdnBaseUrl?: string;
}

export interface KokoroModelConfig {
  modelUrl: string;
  dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
  device?: 'wasm' | 'webgpu' | 'cpu';
}

export interface TtsGenerationResult {
  audioBuffer: AudioBuffer;
  sampleRate: number;
  duration: number;
  text: string;
  speakerId: number;
}

export interface TtsProgressCallback {
  onProgress: (progress: number, stage: string) => void;
  onError: (error: Error) => void;
  onComplete: (result: TtsGenerationResult) => void;
}

export interface ModelLoadStatus {
  isLoaded: boolean;
  isLoading: boolean;
  loadProgress: number;
  error?: string;
}

export interface KokoroTtsEngineOptions {
  modelConfig?: Partial<KokoroModelConfig>;
  defaultSpeakerId?: number;
  defaultSpeed?: number;
  debug?: boolean;
}

export const KOKORO_SPEAKERS: KokoroSpeaker[] = [
  { id: 0, name: 'af_alloy', language: 'en', gender: 'female', description: 'American female - Alloy' },
  { id: 1, name: 'af_aoede', language: 'en', gender: 'female', description: 'American female - Aoede' },
  { id: 2, name: 'af_bella', language: 'en', gender: 'female', description: 'American female - Bella (Best)' },
  { id: 3, name: 'af_jessica', language: 'en', gender: 'female', description: 'American female - Jessica' },
  { id: 4, name: 'af_kore', language: 'en', gender: 'female', description: 'American female - Kore' },
  { id: 5, name: 'af_nicole', language: 'en', gender: 'female', description: 'American female - Nicole' },
  { id: 6, name: 'af_nova', language: 'en', gender: 'female', description: 'American female - Nova' },
  { id: 7, name: 'af_river', language: 'en', gender: 'female', description: 'American female - River' },
  { id: 8, name: 'af_sarah', language: 'en', gender: 'female', description: 'American female - Sarah' },
  { id: 9, name: 'af_sky', language: 'en', gender: 'female', description: 'American female - Sky' },
  { id: 10, name: 'am_adam', language: 'en', gender: 'male', description: 'American male - Adam' },
  { id: 11, name: 'am_echo', language: 'en', gender: 'male', description: 'American male - Echo' },
  { id: 12, name: 'am_eric', language: 'en', gender: 'male', description: 'American male - Eric' },
  { id: 13, name: 'am_fenrir', language: 'en', gender: 'male', description: 'American male - Fenrir' },
  { id: 14, name: 'am_liam', language: 'en', gender: 'male', description: 'American male - Liam' },
  { id: 15, name: 'am_michael', language: 'en', gender: 'male', description: 'American male - Michael' },
  { id: 16, name: 'am_onyx', language: 'en', gender: 'male', description: 'American male - Onyx' },
  { id: 17, name: 'am_puck', language: 'en', gender: 'male', description: 'American male - Puck' },
  { id: 18, name: 'am_santa', language: 'en', gender: 'male', description: 'American male - Santa' },
  { id: 19, name: 'bf_alice', language: 'en', gender: 'female', description: 'British female - Alice' },
  { id: 20, name: 'bf_emma', language: 'en', gender: 'female', description: 'British female - Emma (Best)' },
  { id: 21, name: 'bf_isabella', language: 'en', gender: 'female', description: 'British female - Isabella' },
  { id: 22, name: 'bf_lily', language: 'en', gender: 'female', description: 'British female - Lily' },
  { id: 23, name: 'bm_daniel', language: 'en', gender: 'male', description: 'British male - Daniel' },
  { id: 24, name: 'bm_fable', language: 'en', gender: 'male', description: 'British male - Fable' },
  { id: 25, name: 'bm_george', language: 'en', gender: 'male', description: 'British male - George' },
  { id: 26, name: 'bm_lewis', language: 'en', gender: 'male', description: 'British male - Lewis' },
  { id: 47, name: 'af_heart', language: 'en', gender: 'female', description: 'American female - Heart (Recommended)' },
];

export const DEFAULT_KOKORO_CONFIG: KokoroTtsConfig = {
  speakerId: 47,
  speed: 1.0,
  silenceDuration: 0.2,
  modelProvider: 'cdn',
};

export const DEFAULT_MODEL_CONFIG: KokoroModelConfig = {
  modelUrl: 'onnx-community/Kokoro-82M-v1.0-ONNX',
  dtype: 'q8',
  device: 'wasm',
};
