'use client';

import React from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import type { WeChatVoiceInputProps } from '../types';

export function WeChatVoiceInput({
  className = '',
  style,
  showProgress = true,
  placeholder = '按住下方按钮开始说话',
  language,
  continuous,
  interimResults,
  silenceTimeout,
  minConfidence,
  enableVolumeDetection,
  autoInitialize = true,
  onResult,
  onError,
  onStatusChange,
  onReady,
  onRecordingStart,
  onRecordingEnd
}: WeChatVoiceInputProps) {
  const {
    state,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript,
    retry
  } = useVoiceRecognition({
    language,
    continuous,
    interimResults,
    silenceTimeout,
    minConfidence,
    enableVolumeDetection,
    autoInitialize,
    onResult,
    onError,
    onStatusChange,
    onReady,
    onRecordingStart,
    onRecordingEnd
  });

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    await startRecording();
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    e.preventDefault();
    await stopRecording();
  };

  const handlePointerLeave = async () => {
    if (state.isRecording) {
      await stopRecording();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript.fullText);
  };

  const handleRetry = () => {
    retry().catch(console.error);
  };

  const displayText = transcript.fullText + transcript.currentSegment;

  return (
    <div className={`voice-input-container ${className}`} style={style}>
      <div className="voice-input-header">
        <h1 className="voice-input-title">语音输入</h1>
        <p className="voice-input-subtitle">{placeholder}</p>
      </div>

      {!state.isReady && !state.error && showProgress && (
        <div className="voice-input-init-card">
          <div className="voice-input-init-content">
            <div className="voice-input-init-icon">🎤</div>
            <h2 className="voice-input-init-title">正在初始化</h2>
            <p className="voice-input-init-status">{state.initStatus}</p>
            
            <div className="voice-input-progress-bar">
              <div 
                className="voice-input-progress-fill"
                style={{ width: `${state.initProgress}%` }}
              />
            </div>
            <p className="voice-input-progress-text">{state.initProgress}%</p>
          </div>
        </div>
      )}

      {state.error && (
        <div className="voice-input-error-card">
          <div className="voice-input-error-content">
            <div className="voice-input-error-icon">⚠️</div>
            <h2 className="voice-input-error-title">初始化失败</h2>
            <p className="voice-input-error-message">{state.error}</p>
            
            <button onClick={handleRetry} className="voice-input-retry-button">
              重新加载
            </button>
          </div>
        </div>
      )}

      {state.isReady && (
        <>
          <div className="voice-input-result-card">
            <div className="voice-input-result-header">
              <span className="voice-input-result-label">识别结果</span>
              {transcript.fullText && (
                <div className="voice-input-result-actions">
                  <button onClick={handleCopy} className="voice-input-action-button">
                    复制
                  </button>
                  <button onClick={clearTranscript} className="voice-input-action-button danger">
                    清空
                  </button>
                </div>
              )}
            </div>
            
            <div className="voice-input-result-content">
              {displayText ? (
                <div className="voice-input-result-text">
                  {transcript.fullText}
                  {transcript.currentSegment && (
                    <span className="voice-input-interim-text">{transcript.currentSegment}</span>
                  )}
                </div>
              ) : (
                <div className="voice-input-empty-state">
                  <div className="voice-input-empty-icon">🎤</div>
                  <p>按住下方按钮开始语音输入</p>
                </div>
              )}
            </div>
          </div>

          <div className="voice-input-button-container">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              disabled={!state.isReady}
              className={`voice-input-record-button ${state.isRecording ? 'recording' : ''}`}
              style={{
                boxShadow: state.isRecording 
                  ? `0 0 ${Math.min(60, 20 + state.volume)}px rgba(239, 68, 68, 0.5)`
                  : undefined
              }}
            >
              <div className="voice-input-button-content">
                {state.isRecording ? (
                  <>
                    <div className="voice-input-button-icon">🎙️</div>
                    <div className="voice-input-button-text">松开结束</div>
                  </>
                ) : (
                  <>
                    <div className="voice-input-button-icon">🎤</div>
                    <div className="voice-input-button-text">按住说话</div>
                  </>
                )}
              </div>
              
              {state.isRecording && (
                <div className="voice-input-button-ping" />
              )}
            </button>

            <div className="voice-input-status-text">
              {state.isRecording ? (
                <div className="voice-input-recording-indicator">
                  <div className="voice-input-recording-dot" />
                  <span>正在录音...</span>
                </div>
              ) : (
                <span>按住按钮开始录音</span>
              )}
            </div>

            {state.isRecording && (
              <div className="voice-input-volume-bar">
                <div 
                  className="voice-input-volume-fill"
                  style={{ width: `${Math.min(100, state.volume)}%` }}
                />
              </div>
            )}
          </div>
        </>
      )}

      <div className="voice-input-hint">
        <p>💡 提示：按住按钮说话，松开自动结束</p>
      </div>
    </div>
  );
}
