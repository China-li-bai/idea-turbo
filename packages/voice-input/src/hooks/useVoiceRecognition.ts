'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SherpaOnnxEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '@idea-turbo/sherpa-onnx';
import type { VoiceInputState, TranscriptState, UseVoiceRecognitionOptions } from '../types';

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const {
    language = 'zh-CN',
    continuous = true,
    interimResults = true,
    silenceTimeout = 3000,
    minConfidence = 0.5,
    enableVolumeDetection = true,
    autoInitialize = true,
    onResult,
    onError,
    onStatusChange,
    onReady,
    onRecordingStart,
    onRecordingEnd
  } = options;

  const [state, setState] = useState<VoiceInputState>({
    isReady: false,
    isRecording: false,
    isInitializing: false,
    error: null,
    volume: 0,
    initProgress: 0,
    initStatus: '准备初始化...'
  });

  const [transcript, setTranscript] = useState<TranscriptState>({
    segments: [],
    currentSegment: '',
    fullText: ''
  });

  const engineRef = useRef<SherpaOnnxEngine | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const initialize = useCallback(async () => {
    if (engineRef.current || initPromiseRef.current) {
      return initPromiseRef.current;
    }

    setState(prev => ({ 
      ...prev, 
      isInitializing: true, 
      error: null,
      initStatus: '正在初始化语音引擎...',
      initProgress: 10
    }));

    initPromiseRef.current = (async () => {
      try {
        const config: RecognitionConfig = {
          engine: 'sherpa-onnx',
          language,
          continuous,
          interimResults,
          silenceTimeout,
          minConfidence,
          enableVolumeDetection,
          enableRealtimePreview: true,
        };

        const callbacks: RecognitionCallbacks = {
          onResult: (result: RecognitionResult) => {
            if (result.isInterim) {
              setTranscript(prev => ({
                ...prev,
                currentSegment: result.transcript
              }));
            } else if (result.isFinal) {
              if (result.transcript.trim()) {
                setTranscript(prev => {
                  const newSegments = [...prev.segments, result.transcript];
                  return {
                    segments: newSegments,
                    currentSegment: '',
                    fullText: newSegments.join('')
                  };
                });
              }
            }
            onResult?.(result.transcript, result.isFinal);
          },
          onError: (err: string) => {
            setState(prev => ({ ...prev, error: err }));
            onError?.(err);
          },
          onVolumeChange: (vol: number) => {
            setState(prev => ({ ...prev, volume: vol }));
          },
          onStatus: (s: string) => {
            setState(prev => ({
              ...prev,
              initStatus: s,
              initProgress: s.includes('下载') ? 30 : 
                           s.includes('加载') ? 60 : 
                           s.includes('Ready') ? 100 : prev.initProgress
            }));
            onStatusChange?.(s);
            
            if (s === 'Ready') {
              setState(prev => ({ 
                ...prev, 
                isReady: true, 
                isInitializing: false 
              }));
              onReady?.();
            }
          }
        };

        setState(prev => ({
          ...prev,
          initStatus: '正在加载模型文件（首次需要下载约30MB）...',
          initProgress: 30
        }));

        const engine = new SherpaOnnxEngine(config, callbacks);
        engineRef.current = engine;
        
        await engine.initialize();
        
        setState(prev => ({
          ...prev,
          initStatus: '初始化完成！',
          initProgress: 100
        }));

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        
        setState(prev => ({
          ...prev,
          error: errMsg.includes('timeout') 
            ? '模型加载超时。可能原因：\n1. 网络连接慢\n2. CDN 无法访问\n\n建议：请检查网络连接后刷新页面重试'
            : '初始化失败: ' + errMsg,
          isInitializing: false,
          initProgress: 0
        }));
        
        throw err;
      }
    })();

    return initPromiseRef.current;
  }, [language, continuous, interimResults, silenceTimeout, minConfidence, enableVolumeDetection, onResult, onError, onStatusChange, onReady]);

  const startRecording = useCallback(async () => {
    if (!engineRef.current || !state.isReady || state.isRecording) return;

    try {
      setState(prev => ({ ...prev, error: null }));
      setTranscript(prev => ({ ...prev, currentSegment: '' }));
      
      await engineRef.current.start();
      
      setState(prev => ({ ...prev, isRecording: true }));
      onRecordingStart?.();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errMsg }));
      throw err;
    }
  }, [state.isReady, state.isRecording, onRecordingStart]);

  const stopRecording = useCallback(async () => {
    if (!engineRef.current || !state.isRecording) return;

    try {
      await engineRef.current.stop();
      
      setState(prev => ({ ...prev, isRecording: false }));
      
      setTranscript(prev => {
        if (prev.currentSegment.trim()) {
          const newSegments = [...prev.segments, prev.currentSegment];
          return {
            segments: newSegments,
            currentSegment: '',
            fullText: newSegments.join('')
          };
        }
        return { ...prev, currentSegment: '' };
      });
      
      onRecordingEnd?.();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errMsg }));
      throw err;
    }
  }, [state.isRecording, onRecordingEnd]);

  const clearTranscript = useCallback(() => {
    setTranscript({ segments: [], currentSegment: '', fullText: '' });
    if (engineRef.current) {
      engineRef.current.clearTranscript();
    }
  }, []);

  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      initProgress: 0,
      initStatus: '准备重新初始化...'
    }));
    initPromiseRef.current = null;
    return initialize();
  }, [initialize]);

  useEffect(() => {
    if (autoInitialize) {
      initialize().catch(console.error);
    }

    return () => {
      if (engineRef.current) {
        try {
          engineRef.current.destroy();
          engineRef.current = null;
        } catch (err) {
          console.error('[useVoiceRecognition] Error destroying engine:', err);
        }
      }
      initPromiseRef.current = null;
    };
  }, [autoInitialize, initialize]);

  return {
    state,
    transcript,
    initialize,
    startRecording,
    stopRecording,
    clearTranscript,
    retry
  };
}
