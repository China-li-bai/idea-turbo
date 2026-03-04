'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  initialize,
  speak,
  isReady,
  destroy,
  voices,
  voicesMap,
  defaultVoice,
  checkWebGPUSupport,
} from '@idea-turbo/sherpa-onnx-tts';
import type { ProgressInfo } from '@idea-turbo/sherpa-onnx-tts';

export default function KokoroTtsPage() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo>({ status: 'loading', progress: 0 });
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('Hello, this is a test of Kokoro TTS with WebGPU acceleration.');
  const [voice, setVoice] = useState(defaultVoice.id);
  const [hasWebGPU, setHasWebGPU] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const log = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  useEffect(() => {
    checkWebGPUSupport().then(setHasWebGPU);
    return () => {
      destroy();
    };
  }, []);

  const handleInit = async () => {
    setLoading(true);
    setError(null);
    log('开始初始化...');

    try {
      await initialize(
        {
          acceleration: 'auto',
          dtype: 'q8f16',
        },
        (info: ProgressInfo) => {
          setProgress(info);
          if (info.status === 'downloading') {
            log(`下载 ${info.file || 'model'}: ${Math.round(info.progress * 100)}%`);
          } else if (info.status === 'loading') {
            log(`加载中: ${info.message || ''}`);
          }
        }
      );

      setReady(true);
      log('初始化完成! WebGPU: ' + hasWebGPU);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      log(`错误: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!text.trim()) return;

    setSpeaking(true);
    log(`生成: "${text}"`);

    try {
      await speak(text, { voice });
      log('播放完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      log(`错误: ${msg}`);
    } finally {
      setSpeaking(false);
    }
  };

  const handleDestroy = () => {
    destroy();
    setReady(false);
    log('引擎已销毁');
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>Kokoro TTS Test (WebGPU)</h1>

      <div
        style={{
          padding: 10,
          background: hasWebGPU ? '#d4edda' : '#f8d7da',
          borderRadius: 4,
          marginBottom: 20,
        }}
      >
        WebGPU Support: {hasWebGPU ? '✅ Yes' : '❌ No (will use WASM)'}
      </div>

      {!ready && !loading && (
        <button onClick={handleInit} style={{ padding: '10px 20px', fontSize: 16, marginBottom: 20 }}>
          Initialize TTS Engine
        </button>
      )}

      {loading && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ padding: 10, background: '#e9ecef', borderRadius: 4 }}>
            {progress.status}: {Math.round(progress.progress * 100)}%
            {progress.message && ` - ${progress.message}`}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 10, background: '#f8d7da', color: '#721c24', borderRadius: 4, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {ready && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>Voice:</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              style={{ padding: 8, width: '100%', maxWidth: 300 }}
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.lang.name}, {v.gender})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', height: 80, padding: 10 }}
              placeholder="输入文本..."
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSpeak}
              disabled={speaking || !text.trim()}
              style={{ padding: '10px 20px', fontSize: 16 }}
            >
              {speaking ? '播放中...' : '播放'}
            </button>
            <button
              onClick={handleDestroy}
              style={{ padding: '10px 20px', fontSize: 16, background: '#dc3545', color: 'white' }}
            >
              销毁引擎
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          background: '#f5f5f5',
          padding: 10,
          maxHeight: 200,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
