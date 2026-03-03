import { useState, useEffect, useRef, useCallback } from 'react';
import { KokoroTtsEngine } from './kokoroTtsEngine';
import {
  TtsGenerationResult,
  ModelLoadStatus,
  KokoroSpeaker,
  KOKORO_SPEAKERS,
  KokoroTtsEngineOptions,
} from './types';

export interface UseKokoroTtsOptions extends KokoroTtsEngineOptions {
  autoInitialize?: boolean;
}

export interface UseKokoroTtsReturn {
  isReady: boolean;
  isLoading: boolean;
  loadProgress: number;
  error: string | null;
  speakers: KokoroSpeaker[];
  currentSpeaker: KokoroSpeaker | undefined;
  generate: (text: string, speakerId?: number, speed?: number) => Promise<TtsGenerationResult>;
  generateAndPlay: (text: string, speakerId?: number, speed?: number) => Promise<void>;
  play: (audioBuffer: AudioBuffer) => Promise<void>;
  setSpeaker: (speakerId: number) => void;
  setSpeed: (speed: number) => void;
  initialize: () => Promise<void>;
  getSpeakersByLanguage: (language: string) => KokoroSpeaker[];
}

export function useKokoroTts(options: UseKokoroTtsOptions = {}): UseKokoroTtsReturn {
  const { autoInitialize = false, defaultSpeakerId = 47, ...engineOptions } = options;
  
  const engineRef = useRef<KokoroTtsEngine | null>(null);
  const [loadStatus, setLoadStatus] = useState<ModelLoadStatus>({
    isLoaded: false,
    isLoading: false,
    loadProgress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<number>(defaultSpeakerId);

  useEffect(() => {
    engineRef.current = new KokoroTtsEngine(engineOptions);
    
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const initialize = useCallback(async () => {
    if (!engineRef.current) return;
    
    setError(null);
    
    try {
      await engineRef.current.initialize({
        onProgress: (progress: number, _stage: string) => {
          setLoadStatus((prev: ModelLoadStatus) => ({
            ...prev,
            loadProgress: progress,
          }));
        },
        onError: (err: Error) => {
          setError(err.message);
        },
        onComplete: () => {
          setLoadStatus({
            isLoaded: true,
            isLoading: false,
            loadProgress: 100,
          });
        },
      });
      
      setLoadStatus(engineRef.current.getLoadStatus());
    } catch (err) {
      setError((err as Error).message);
      setLoadStatus((prev: ModelLoadStatus) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    if (autoInitialize && engineRef.current && !loadStatus.isLoaded && !loadStatus.isLoading) {
      initialize();
    }
  }, [autoInitialize, initialize, loadStatus.isLoaded, loadStatus.isLoading]);

  const generate = useCallback(async (
    text: string,
    speakerId?: number,
    speed?: number
  ): Promise<TtsGenerationResult> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }
    
    if (!engineRef.current.isReady()) {
      await initialize();
    }
    
    return engineRef.current.generate(text, speakerId, speed);
  }, [initialize]);

  const play = useCallback(async (audioBuffer: AudioBuffer): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }
    return engineRef.current.play(audioBuffer);
  }, []);

  const generateAndPlay = useCallback(async (
    text: string,
    speakerId?: number,
    speed?: number
  ): Promise<void> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }
    
    if (!engineRef.current.isReady()) {
      await initialize();
    }
    
    return engineRef.current.generateAndPlay(text, speakerId, speed);
  }, [initialize]);

  const setSpeaker = useCallback((speakerId: number) => {
    setCurrentSpeakerId(speakerId);
    engineRef.current?.setDefaultSpeaker(speakerId);
  }, []);

  const setSpeed = useCallback((speed: number) => {
    engineRef.current?.setDefaultSpeed(speed);
  }, []);

  const getSpeakersByLanguage = useCallback((language: string): KokoroSpeaker[] => {
    return KOKORO_SPEAKERS.filter((s) => s.language === language);
  }, []);

  const currentSpeaker = KOKORO_SPEAKERS.find((s) => s.id === currentSpeakerId);

  return {
    isReady: loadStatus.isLoaded,
    isLoading: loadStatus.isLoading,
    loadProgress: loadStatus.loadProgress,
    error: error || loadStatus.error || null,
    speakers: KOKORO_SPEAKERS,
    currentSpeaker,
    generate,
    generateAndPlay,
    play,
    setSpeaker,
    setSpeed,
    initialize,
    getSpeakersByLanguage,
  };
}
