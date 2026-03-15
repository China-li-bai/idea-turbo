'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { speechService, SpeechRecognitionState } from '@/lib/services/speechService';
import styles from './VoiceInput.module.scss';

interface VoiceInputProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onFinalTranscript?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showVolumeIndicator?: boolean;
  showTranscript?: boolean;
  language?: 'zh-CN' | 'en-US' | 'en-GB';
  className?: string;
}

export default function VoiceInput({
  onTranscript,
  onFinalTranscript,
  placeholder = '点击麦克风开始语音输入...',
  disabled = false,
  showVolumeIndicator = true,
  showTranscript = true,
  language = 'zh-CN',
  className = '',
}: VoiceInputProps) {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    isInitialized: false,
    status: 'idle',
    currentTranscript: '',
    volume: 0,
  });
  const [isSupported, setIsSupported] = useState(false);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    setIsSupported(speechService.isSupported());

    const unsubscribe = speechService.subscribe((newState) => {
      setState(newState);
      
      if (newState.currentTranscript !== transcriptRef.current) {
        transcriptRef.current = newState.currentTranscript;
        onTranscript?.(newState.currentTranscript, false);
      }
    });

    return () => unsubscribe();
  }, [onTranscript]);

  useEffect(() => {
    speechService.setLanguage(language);
  }, [language]);

  const handleToggle = useCallback(async () => {
    if (disabled) return;

    try {
      if (state.isListening) {
        const finalTranscript = await speechService.stopListening();
        if (finalTranscript) {
          onFinalTranscript?.(finalTranscript);
        }
        speechService.clearTranscript();
      } else {
        if (!state.isInitialized) {
          await speechService.initialize();
        }
        await speechService.startListening();
      }
    } catch (error) {
      console.error('Voice input error:', error);
    }
  }, [disabled, state.isListening, state.isInitialized, onFinalTranscript]);

  const getStatusText = (): string => {
    switch (state.status) {
      case 'idle':
        return '点击开始';
      case 'initializing':
        return '初始化中...';
      case 'ready':
        return '准备就绪';
      case 'listening':
        return '正在聆听...';
      case 'stopped':
        return '已停止';
      case 'destroyed':
        return '已销毁';
      default:
        if (state.status.startsWith('error')) {
          return '出错了';
        }
        return state.status;
    }
  };

  const getButtonClass = (): string => {
    const classes = [styles.voiceButton];
    
    if (state.isListening) {
      classes.push(styles.listening);
    }
    if (disabled) {
      classes.push(styles.disabled);
    }
    if (!isSupported) {
      classes.push(styles.unsupported);
    }
    
    return classes.join(' ');
  };

  if (!isSupported) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.unsupportedMessage}>
          <span className={styles.unsupportedIcon}>🎤</span>
          <span>您的浏览器不支持语音识别</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.inputArea}>
        <button
          className={getButtonClass()}
          onClick={handleToggle}
          disabled={disabled || state.status === 'initializing'}
          aria-label={state.isListening ? '停止语音输入' : '开始语音输入'}
        >
          <div className={styles.buttonContent}>
            {state.isListening ? (
              <div className={styles.listeningIndicator}>
                <span className={styles.micIcon}>🎤</span>
                {showVolumeIndicator && (
                  <div className={styles.volumeBars}>
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <div
                        key={bar}
                        className={styles.volumeBar}
                        style={{
                          height: `${Math.min(100, (state.volume / 100) * 20 * (bar / 3))}px`,
                          opacity: state.volume > bar * 15 ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className={styles.micIcon}>🎤</span>
            )}
          </div>
        </button>

        <div className={styles.statusArea}>
          <span className={styles.statusText}>{getStatusText()}</span>
          {state.status === 'initializing' && (
            <div className={styles.loadingSpinner} />
          )}
        </div>
      </div>

      {showTranscript && state.currentTranscript && (
        <div className={styles.transcriptArea}>
          <div className={styles.transcriptLabel}>识别结果：</div>
          <div className={styles.transcriptText}>
            {state.currentTranscript}
            {state.isListening && <span className={styles.cursor} />}
          </div>
        </div>
      )}

      {!state.currentTranscript && !state.isListening && (
        <div className={styles.placeholder}>{placeholder}</div>
      )}
    </div>
  );
}
