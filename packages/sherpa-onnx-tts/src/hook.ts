import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initialize as initEngine,
  generate as generateAudio,
  speak as speakAudio,
  destroy as destroyEngine,
  isReady as checkReady,
  getAcceleration,
} from './engine';
import { voices, voicesMap, defaultVoice, voicesByLang } from './voices';
import { languages } from './languages';
import { checkWebGPUSupport } from './utils';
import type {
  UseKokoroTtsOptions,
  UseKokoroTtsReturn,
  TtsResult,
  ProgressInfo,
} from './types';

export function useKokoroTts(options: UseKokoroTtsOptions = {}): UseKokoroTtsReturn {
  const {
    defaultVoice: defaultVoiceId = defaultVoice.id,
    autoInit = false,
    acceleration = 'auto',
    dtype,
    debug = false,
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentVoiceId, setCurrentVoiceId] = useState(defaultVoiceId);
  const [accelerationType, setAccelerationType] = useState<'cpu' | 'webgpu'>('cpu');

  const initRef = useRef(false);

  const currentVoice = voicesMap[currentVoiceId] || defaultVoice;

  const handleProgress = useCallback(
    (info: ProgressInfo) => {
      setLoadProgress(info.progress);
      if (debug) {
        console.log(`[useKokoroTts] ${info.status}: ${info.message || ''} (${Math.round(info.progress * 100)}%)`);
      }
    },
    [debug]
  );

  const initialize = useCallback(async () => {
    if (isLoading || isReady || initRef.current) return;

    initRef.current = true;
    setIsLoading(true);
    setError(null);
    setLoadProgress(0);

    try {
      let actualAcceleration = acceleration;
      if (acceleration === 'auto') {
        const hasWebGPU = await checkWebGPUSupport();
        actualAcceleration = hasWebGPU ? 'webgpu' : 'cpu';
      }

      if (debug) {
        console.log(`[useKokoroTts] Initializing with ${actualAcceleration.toUpperCase()}...`);
      }

      await initEngine(
        {
          acceleration: actualAcceleration as 'cpu' | 'webgpu',
          dtype,
        },
        handleProgress
      );

      setAccelerationType(getAcceleration());
      setIsReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      initRef.current = false;
      if (debug) {
        console.error('[useKokoroTts] Initialization error:', msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [acceleration, dtype, debug, isLoading, isReady, handleProgress]);

  const generate = useCallback(
    async (text: string, voiceId?: string, speed?: number): Promise<TtsResult> => {
      if (!isReady) {
        throw new Error('Engine not initialized');
      }

      const voice = voiceId || currentVoiceId;
      return generateAudio(text, { voice, speed });
    },
    [isReady, currentVoiceId]
  );

  const speak = useCallback(
    async (text: string, voiceId?: string, speed?: number): Promise<void> => {
      if (!isReady) {
        throw new Error('Engine not initialized');
      }

      const voice = voiceId || currentVoiceId;
      await speakAudio(text, { voice, speed });
    },
    [isReady, currentVoiceId]
  );

  const setVoice = useCallback((voiceId: string) => {
    if (voicesMap[voiceId]) {
      setCurrentVoiceId(voiceId);
    }
  }, []);

  const destroy = useCallback(() => {
    destroyEngine();
    setIsReady(false);
    setIsLoading(false);
    setLoadProgress(0);
    initRef.current = false;
  }, []);

  useEffect(() => {
    if (autoInit && !isReady && !isLoading && !initRef.current) {
      initialize();
    }
  }, [autoInit, isReady, isLoading, initialize]);

  useEffect(() => {
    return () => {
      if (isReady) {
        destroyEngine();
      }
    };
  }, [isReady]);

  return {
    isReady,
    isLoading,
    loadProgress,
    error,
    voices,
    currentVoice,
    languages,
    generate,
    speak,
    setVoice,
    initialize,
    destroy,
  };
}

export { voices, voicesMap, voicesByLang, defaultVoice };
export { languages, languagesMap } from './languages';
export { models, modelsMap, defaultModel } from './models';
