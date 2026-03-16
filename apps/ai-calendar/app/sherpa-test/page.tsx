'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SherpaOnnxEngine } from '@idea-turbo/sherpa-onnx';
import { RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '@idea-turbo/sherpa-onnx';

export default function SherpaTestPage() {
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('初始化中...');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const engineRef = useRef<SherpaOnnxEngine | null>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  }, []);

  useEffect(() => {
    const initEngine = async () => {
      try {
        addLog('开始初始化引擎...');

        const config: RecognitionConfig = {
          engine: 'sherpa-onnx',
          language: 'zh-CN',
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
              setInterimText(result.transcript);
              addLog(`[临时] ${result.transcript}`);
              return;
            }

            if (result.transcript.trim()) {
              setTranscript(prev => prev + result.transcript + '\n');
              addLog(`[最终] ${result.transcript}`);
            }
          },
          onError: (err: string) => {
            addLog(`[错误] ${err}`);
            setError(err);
          },
          onVolumeChange: (vol: number) => {
            setVolume(vol);
          },
          onStatus: (s: string) => {
            addLog(`[状态] ${s}`);
            setStatus(s);
            if (s === 'Ready') {
              setIsReady(true);
            }
          }
        };

        const engine = new SherpaOnnxEngine(config, callbacks);
        engineRef.current = engine;

        addLog('创建引擎实例成功');
        await engine.initialize();
        addLog('引擎初始化完成');

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        addLog(`[致命错误] ${errMsg}`);
        setError(errMsg);
      }
    };

    initEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        addLog('引擎已销毁');
      }
    };
  }, [addLog]);

  const handleStart = async () => {
    if (!engineRef.current) {
      addLog('[错误] 引擎未初始化');
      return;
    }

    try {
      await engineRef.current.start();
      setIsListening(true);
      addLog('开始识别');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`[启动错误] ${errMsg}`);
      setError(errMsg);
    }
  };

  const handleStop = async () => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.stop();
      setIsListening(false);
      addLog('停止识别');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`[停止错误] ${errMsg}`);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setInterimText('');
    if (engineRef.current) {
      engineRef.current.clearTranscript();
    }
    addLog('清除 Transcript');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1a1a2e', 
      color: '#eee',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        🎤 Sherpa-ONNX 测试页面
      </h1>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ 
          background: '#16213e', 
          borderRadius: '12px', 
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0 }}>状态</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#888' }}>引擎状态: </span>
              <span style={{ 
                color: isReady ? '#4ade80' : '#f87171',
                fontWeight: 'bold'
              }}>
                {status}
              </span>
            </div>
            <div>
              <span style={{ color: '#888' }}>监听中: </span>
              <span style={{ 
                color: isListening ? '#4ade80' : '#888',
                fontWeight: 'bold'
              }}>
                {isListening ? '是' : '否'}
              </span>
            </div>
            <div>
              <span style={{ color: '#888' }}>音量: </span>
              <span style={{ 
                color: volume > 10 ? '#4ade80' : '#888',
                fontWeight: 'bold'
              }}>
                {Math.round(volume)}%
              </span>
            </div>
          </div>

          <div style={{ 
            height: '8px', 
            background: '#0f3460', 
            borderRadius: '4px',
            marginTop: '15px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${volume}%`,
              background: volume > 10 ? '#4ade80' : '#3b82f6',
              transition: 'width 0.1s'
            }} />
          </div>
        </div>

        <div style={{ 
          background: '#16213e', 
          borderRadius: '12px', 
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0 }}>控制</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleStart}
              disabled={!isReady || isListening}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: isReady && !isListening ? '#4ade80' : '#333',
                color: isReady && !isListening ? '#000' : '#888',
                border: 'none',
                borderRadius: '8px',
                cursor: isReady && !isListening ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              🎙️ 开始识别
            </button>
            <button
              onClick={handleStop}
              disabled={!isListening}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: isListening ? '#f87171' : '#333',
                color: isListening ? '#fff' : '#888',
                border: 'none',
                borderRadius: '8px',
                cursor: isListening ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              ⏹️ 停止
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🗑️ 清除
            </button>
          </div>
        </div>

        <div style={{ 
          background: '#16213e', 
          borderRadius: '12px', 
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0 }}>识别结果</h2>
          <textarea
            value={transcript}
            readOnly
            placeholder="识别结果将显示在这里..."
            style={{
              width: '100%',
              height: '150px',
              background: '#0f3460',
              color: '#eee',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
          {interimText && (
            <div style={{ 
              marginTop: '10px', 
              color: '#fbbf24',
              fontStyle: 'italic'
            }}>
              识别中: {interimText}
            </div>
          )}
        </div>

        {error && (
          <div style={{ 
            background: '#7f1d1d', 
            borderRadius: '12px', 
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #ef4444'
          }}>
            <h2 style={{ marginTop: 0, color: '#fca5a5' }}>错误</h2>
            <p style={{ color: '#fecaca' }}>{error}</p>
          </div>
        )}

        <div style={{ 
          background: '#16213e', 
          borderRadius: '12px', 
          padding: '20px'
        }}>
          <h2 style={{ marginTop: 0 }}>日志</h2>
          <div style={{
            background: '#0f3460',
            borderRadius: '8px',
            padding: '12px',
            height: '200px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                {log}
              </div>
            ))}
            {logs.length === 0 && (
              <span style={{ color: '#666' }}>等待日志...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
