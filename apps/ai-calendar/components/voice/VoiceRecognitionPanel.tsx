'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SherpaOnnxEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '@idea-turbo/sherpa-onnx';
import styles from './VoiceRecognitionPanel.module.scss';

export type SupportedLanguage = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR';

export interface VoiceRecognitionPanelProps {
  language?: SupportedLanguage;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: VoiceRecognitionStatus) => void;
  showLogs?: boolean;
  showVolumeIndicator?: boolean;
  compact?: boolean;
  className?: string;
}

export type VoiceRecognitionStatus = 
  | 'idle' 
  | 'initializing' 
  | 'ready' 
  | 'listening' 
  | 'stopped' 
  | 'error'
  | 'destroyed';

export interface VoiceRecognitionState {
  isReady: boolean;
  isListening: boolean;
  status: VoiceRecognitionStatus;
  statusText: string;
  volume: number;
  transcript: string;
  interimText: string;
  logs: string[];
  error: string | null;
}

const languageMap: Record<SupportedLanguage, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'en-US': 'en-US',
  'ja-JP': 'ja-JP',
  'ko-KR': 'ko-KR',
};

const statusTextMap: Record<string, string> = {
  'idle': '点击开始',
  'initializing': '初始化中...',
  'Ready': '准备就绪',
  'ready': '准备就绪',
  'listening': '正在聆听...',
  'stopped': '已停止',
  'destroyed': '已销毁',
};

export default function VoiceRecognitionPanel({
  language = 'zh-CN',
  onTranscript,
  onFinalTranscript,
  onError,
  onStatusChange,
  showLogs = false,
  showVolumeIndicator = true,
  compact = false,
  className = '',
}: VoiceRecognitionPanelProps) {
  const [state, setState] = useState<VoiceRecognitionState>({
    isReady: false,
    isListening: false,
    status: 'idle',
    statusText: '初始化中...',
    volume: 0,
    transcript: '',
    interimText: '',
    logs: [],
    error: null,
  });

  const engineRef = useRef<SherpaOnnxEngine | null>(null);
  const logsRef = useRef<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    const logEntry = `[${time}] ${msg}`;
    logsRef.current = [...logsRef.current.slice(-99), logEntry];
    setState(prev => ({
      ...prev,
      logs: logsRef.current,
    }));
  }, []);

  const updateStatus = useCallback((status: string) => {
    const statusText = statusTextMap[status] || status;
    let voiceStatus: VoiceRecognitionStatus = 'idle';
    
    if (status === 'Ready' || status === 'ready') voiceStatus = 'ready';
    else if (status === 'listening') voiceStatus = 'listening';
    else if (status === 'stopped') voiceStatus = 'stopped';
    else if (status.startsWith('error')) voiceStatus = 'error';
    else if (status === 'destroyed') voiceStatus = 'destroyed';
    else if (status === 'initializing') voiceStatus = 'initializing';

    setState(prev => ({
      ...prev,
      status: voiceStatus,
      statusText,
      isReady: voiceStatus === 'ready' || voiceStatus === 'listening',
    }));
    onStatusChange?.(voiceStatus);
  }, [onStatusChange]);

  useEffect(() => {
    const initEngine = async () => {
      try {
        setState(prev => ({ ...prev, status: 'initializing', statusText: '初始化中...' }));
        addLog('开始初始化引擎...');

        const config: RecognitionConfig = {
          engine: 'sherpa-onnx',
          language: languageMap[language],
          continuous: true,
          interimResults: true,
          silenceTimeout: 3000,
          minConfidence: 0.5,
          enableVolumeDetection: true,
          enableRealtimePreview: true,
        };

        const callbacks: RecognitionCallbacks = {
          onResult: (result: RecognitionResult) => {
            if (result.isInterim) {
              setState(prev => ({ ...prev, interimText: result.transcript }));
              addLog(`[临时] ${result.transcript}`);
              return;
            }

            if (result.transcript.trim()) {
              setState(prev => ({
                ...prev,
                transcript: prev.transcript + result.transcript + '\n',
                interimText: '',
              }));
              addLog(`[最终] ${result.transcript}`);
              onTranscript?.(result.transcript, true);
              onFinalTranscript?.(result.transcript);
            }
          },
          onError: (err: string) => {
            addLog(`[错误] ${err}`);
            setState(prev => ({ ...prev, error: err, status: 'error', statusText: '出错了' }));
            onError?.(err);
          },
          onVolumeChange: (vol: number) => {
            setState(prev => ({ ...prev, volume: vol }));
          },
          onStatus: (s: string) => {
            addLog(`[状态] ${s}`);
            updateStatus(s);
          },
        };

        const engine = new SherpaOnnxEngine(config, callbacks);
        engineRef.current = engine;

        addLog('创建引擎实例成功');
        await engine.initialize();
        addLog('引擎初始化完成');
        setState(prev => ({ ...prev, isReady: true }));

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog(`[致命错误] ${errMsg}`);
        setState(prev => ({ ...prev, error: errMsg, status: 'error', statusText: '初始化失败' }));
        onError?.(errMsg);
      }
    };

    initEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        addLog('引擎已销毁');
      }
    };
  }, [language, onTranscript, onFinalTranscript, onError, updateStatus, addLog]);

  const handleStart = async () => {
    if (!engineRef.current) {
      addLog('[错误] 引擎未初始化');
      return;
    }

    try {
      await engineRef.current.start();
      setState(prev => ({ ...prev, isListening: true, status: 'listening', statusText: '正在聆听...' }));
      addLog('开始识别');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`[启动错误] ${errMsg}`);
      setState(prev => ({ ...prev, error: errMsg }));
      onError?.(errMsg);
    }
  };

  const handleStop = async () => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.stop();
      setState(prev => ({ ...prev, isListening: false, status: 'stopped', statusText: '已停止', volume: 0 }));
      addLog('停止识别');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`[停止错误] ${errMsg}`);
    }
  };

  const handleClear = () => {
    setState(prev => ({ ...prev, transcript: '', interimText: '' }));
    if (engineRef.current) {
      engineRef.current.clearTranscript();
    }
    addLog('清除 Transcript');
  };

  const handleToggle = () => {
    if (state.isListening) {
      handleStop();
    } else {
      handleStart();
    }
  };

  return (
    <div className={`${styles.panel} ${compact ? styles.compact : ''} ${className}`}>
      <div className={styles.statusSection}>
        <div className={styles.statusRow}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>引擎状态:</span>
            <span className={`${styles.statusValue} ${state.isReady ? styles.ready : styles.notReady}`}>
              {state.statusText}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>监听中:</span>
            <span className={`${styles.statusValue} ${state.isListening ? styles.listening : ''}`}>
              {state.isListening ? '是' : '否'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>音量:</span>
            <span className={`${styles.statusValue} ${state.volume > 10 ? styles.volumeActive : ''}`}>
              {Math.round(state.volume)}%
            </span>
          </div>
        </div>

        {showVolumeIndicator && (
          <div className={styles.volumeBar}>
            <div 
              className={styles.volumeFill}
              style={{ 
                width: `${state.volume}%`,
                background: state.volume > 10 ? 'var(--gold)' : 'var(--blue)',
              }} 
            />
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <button
          className={`${styles.button} ${styles.startButton} ${state.isListening ? styles.active : ''}`}
          onClick={handleToggle}
          disabled={!state.isReady && state.status !== 'initializing'}
        >
          <span className={styles.buttonIcon}>
            {state.isListening ? '⏹️' : '🎤'}
          </span>
          <span className={styles.buttonText}>
            {state.isListening ? '停止' : '开始识别'}
          </span>
        </button>

        <button
          className={`${styles.button} ${styles.clearButton}`}
          onClick={handleClear}
        >
          <span className={styles.buttonIcon}>🗑️</span>
          <span className={styles.buttonText}>清除</span>
        </button>
      </div>

      <div className={styles.transcriptSection}>
        <textarea
          className={styles.transcriptArea}
          value={state.transcript}
          readOnly
          placeholder="识别结果将显示在这里..."
        />
        {state.interimText && (
          <div className={styles.interimText}>
            识别中: {state.interimText}
          </div>
        )}
      </div>

      {state.error && (
        <div className={styles.errorSection}>
          <div className={styles.errorTitle}>错误</div>
          <div className={styles.errorText}>{state.error}</div>
        </div>
      )}

      {showLogs && (
        <div className={styles.logsSection}>
          <div className={styles.logsTitle}>日志</div>
          <div className={styles.logsContent}>
            {state.logs.map((log, i) => (
              <div key={i} className={styles.logEntry}>{log}</div>
            ))}
            {state.logs.length === 0 && (
              <div className={styles.logEmpty}>等待日志...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
