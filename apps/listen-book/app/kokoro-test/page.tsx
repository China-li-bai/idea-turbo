'use client';

import { useState, useEffect, useCallback } from 'react';
import { KokoroTTS, VOICES } from '@idea-turbo/sherpa-onnx-tts';

export default function KokoroTtsPage() {
  const [tts, setTts] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [text, setText] = useState('你好，这是一个中文语音测试。');
  const [voice, setVoice] = useState('zf_xiaoxiao');
  const [logs, setLogs] = useState<string[]>([]);

  const log = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  useEffect(() => {
    async function loadModel() {
      setIsLoading(true);
      log('开始加载模型...');

      try {
        const instance = await KokoroTTS.from_pretrained(
          'onnx-community/Kokoro-82M-v1.0-ONNX',
          {
            dtype: 'q8',
            device: 'webgpu',
            progress_callback: (progress: any) => {
              if (progress.status === 'downloading') {
                log(`下载 ${progress.file}: ${Math.round((progress.progress || 0) * 100)}%`);
              } else if (progress.status === 'loading') {
                log(`加载模型中...`);
              }
            },
          }
        );

        setTts(instance);
        log('模型加载完成!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(new Error(msg));
        log(`错误: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadModel();
  }, [log]);

  const handleSpeak = async () => {
    if (!text.trim() || !tts) return;

    setIsGenerating(true);
    log(`生成: "${text}"`);

    try {
      const audio = await tts.generate(text, { voice });
      log('开始播放...');

      const audioContext = new AudioContext(24000);
      const audioBuffer = audioContext.createBuffer(1, audio.data.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(audio.data);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

      source.onended = () => {
        log('播放完成');
        setIsGenerating(false);
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`错误: ${msg}`);
      setIsGenerating(false);
    }
  };

  const voiceOptions = Object.entries(VOICES).map(([id, info]: [string, any]) => ({
    id,
    name: info.name,
    language: info.language,
    gender: info.gender,
    grade: info.overallGrade,
  }));

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>Kokoro TTS Test (官方核心 + 中文支持)</h1>

      <div
        style={{
          padding: 10,
          background: isLoading ? '#fff3cd' : tts ? '#d4edda' : '#f8d7da',
          borderRadius: 4,
          marginBottom: 20,
        }}
      >
        Status: {isLoading ? '⏳ Loading...' : tts ? '✅ Ready' : '❌ Not initialized'}
      </div>

      {error && (
        <div style={{ padding: 10, background: '#f8d7da', color: '#721c24', borderRadius: 4, marginBottom: 20 }}>
          {error.message}
        </div>
      )}

      {tts && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>Voice:</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              style={{ padding: 8, width: '100%', maxWidth: 400 }}
            >
              <optgroup label="中文语音 (Chinese)">
                {voiceOptions
                  .filter((v) => v.language === 'zh')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.gender}, Grade: {v.grade})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="英语语音 (English)">
                {voiceOptions
                  .filter((v) => v.language === 'en-us' || v.language === 'en-gb')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.language === 'en-us' ? 'US' : 'GB'}, {v.gender}, Grade: {v.grade})
                    </option>
                  ))}
              </optgroup>
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
              disabled={isGenerating || !text.trim()}
              style={{ padding: '10px 20px', fontSize: 16 }}
            >
              {isGenerating ? '生成中...' : '播放'}
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
