export * from './types';
export * from './constants';

export { voices, voicesMap, voicesByLang, defaultVoice } from './voices';
export { languages, languagesMap } from './languages';
export { models, modelsMap, defaultModel } from './models';
export { modelCacheManager } from './cache';

export {
  initialize,
  generate,
  speak,
  destroy,
  isReady,
  getAcceleration,
  clearCache,
} from './engine';

export { useKokoroTts } from './hook';

export { tokenize, vocab } from './tokenizer';
export {
  phonemize,
  sanitizeText,
  segmentText,
  preprocessText,
  isSilenceMarker,
  extractSilenceDuration,
} from './textProcessor';

export {
  trimWaveform,
  createWavBuffer,
  createAudioBuffer,
  playAudioBuffer,
  detectWebGPU,
  checkWebGPUSupport,
} from './utils';
