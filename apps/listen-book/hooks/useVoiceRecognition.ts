import { useState, useEffect, useRef, useCallback } from 'react';
import { SherpaOnnxEngine } from '../lib/recognition/sherpaOnnxEngine';
import { RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '../lib/recognition/engine';

export interface VoiceRecognitionState {
  isReady: boolean;
  isListening: boolean;
  isProcessing: boolean;
  interimText: string;
  finalText: string;
  volume: number;
  error: string | null;
  engineStatus: string;
}

export interface VoiceRecognitionCallbacks {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  onVolumeChange?: (volume: number) => void;
}

export interface UseVoiceRecognitionOptions {
  language?: string;
  silenceTimeout?: number;
  callbacks?: VoiceRecognitionCallbacks;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const { language = 'zh-CN', silenceTimeout = 3000, callbacks = {} } = options;
  
  const [state, setState] = useState<VoiceRecognitionState>({
    isReady: false,
    isListening: false,
    isProcessing: false,
    interimText: '',
    finalText: '',
    volume: 0,
    error: null,
    engineStatus: '初始化中...'
  });

  const engineRef = useRef<SherpaOnnxEngine | null>(null);
  const isInitializedRef = useRef(false);

  const initialize = useCallback(async () => {
    if (isInitializedRef.current || typeof window === 'undefined') return;

    const recognitionCallbacks: RecognitionCallbacks = {
      onResult: (result: RecognitionResult) => {
        if (result.isInterim) {
          setState(prev => ({ ...prev, interimText: result.transcript }));
          callbacks.onInterimResult?.(result.transcript);
        } else {
          setState(prev => ({ 
            ...prev, 
            finalText: result.transcript,
            interimText: '',
            isProcessing: false
          }));
          callbacks.onFinalResult?.(result.transcript);
        }
      },
      onError: (error: string) => {
        setState(prev => ({ 
          ...prev, 
          error, 
          isListening: false,
          isProcessing: false 
        }));
        callbacks.onError?.(error);
      },
      onVolumeChange: (vol: number) => {
        setState(prev => ({ ...prev, volume: vol }));
        callbacks.onVolumeChange?.(vol);
      },
      onStatus: (status: string) => {
        setState(prev => ({ ...prev, engineStatus: status }));
        callbacks.onStatusChange?.(status);
        
        if (status === 'Ready') {
          setState(prev => ({ ...prev, isReady: true, engineStatus: '就绪' }));
        }
      }
    };

    const recognitionConfig: RecognitionConfig = {
      engine: 'sherpa-onnx',
      language,
      continuous: false,
      interimResults: true,
      silenceTimeout,
      minConfidence: 0.5,
      enableVolumeDetection: true,
      enableRealtimePreview: true
    };

    try {
      const engine = new SherpaOnnxEngine(recognitionConfig, recognitionCallbacks);
      await engine.initialize();
      engineRef.current = engine;
      isInitializedRef.current = true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '初始化失败';
      setState(prev => ({ ...prev, error: errorMsg }));
      callbacks.onError?.(errorMsg);
    }
  }, [language, silenceTimeout, callbacks]);

  const startListening = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !state.isReady) {
      setState(prev => ({ ...prev, error: '引擎未初始化' }));
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isListening: true, 
        isProcessing: true,
        interimText: '',
        finalText: '',
        error: null 
      }));
      await engine.start();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '启动失败';
      setState(prev => ({ 
        ...prev, 
        error: errorMsg, 
        isListening: false,
        isProcessing: false 
      }));
      callbacks.onError?.(errorMsg);
    }
  }, [state.isReady, callbacks]);

  const stopListening = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.stop();
      setState(prev => ({ 
        ...prev, 
        isListening: false,
        volume: 0 
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '停止失败';
      setState(prev => ({ ...prev, error: errorMsg }));
      callbacks.onError?.(errorMsg);
    }
  }, [callbacks]);

  const clearText = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      interimText: '', 
      finalText: '' 
    }));
    engineRef.current?.clearTranscript();
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    initialize();

    return () => {
      engineRef.current?.destroy();
    };
  }, [initialize]);

  return {
    ...state,
    startListening,
    stopListening,
    clearText,
    clearError,
    engine: engineRef.current
  };
}
