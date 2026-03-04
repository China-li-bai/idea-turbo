'use client';

import { useState } from 'react';
import { useKokoroTts, voicesByLang, defaultVoice } from '@idea-turbo/sherpa-onnx-tts';

export function KokoroTtsDemo() {
  const [text, setText] = useState('Hello, this is a test of Kokoro TTS. 你好，这是一个测试。');
  const [selectedVoiceId, setSelectedVoiceId] = useState(defaultVoice.id);

  const {
    isReady,
    isLoading,
    loadProgress,
    error,
    voices,
    currentVoice,
    languages,
    speak,
    setVoice,
    initialize,
    destroy,
  } = useKokoroTts({
    defaultVoice: selectedVoiceId,
    autoInit: false,
    acceleration: 'auto',
    dtype: 'q8f16',
    debug: true,
  });

  const handlePlay = async () => {
    if (!text.trim()) return;
    try {
      await speak(text, selectedVoiceId, 1.0);
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const chineseVoices = voicesByLang['cmn'] || [];
  const englishVoices = [...(voicesByLang['en-us'] || []), ...(voicesByLang['en-gb'] || [])];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Kokoro TTS Demo (WebGPU Accelerated)</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Text to speak</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-24 p-2 border rounded"
            placeholder="Enter text to speak..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Voice</label>
          <select
            value={selectedVoiceId}
            onChange={(e) => {
              setSelectedVoiceId(e.target.value);
              setVoice(e.target.value);
            }}
            className="w-full p-2 border rounded"
          >
            <optgroup label="English (US)">
              {voicesByLang['en-us']?.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender}) - Grade: {voice.overallGrade}
                </option>
              ))}
            </optgroup>
            <optgroup label="English (GB)">
              {voicesByLang['en-gb']?.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender}) - Grade: {voice.overallGrade}
                </option>
              ))}
            </optgroup>
            <optgroup label="Chinese">
              {chineseVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender})
                </option>
              ))}
            </optgroup>
            <optgroup label="Japanese">
              {voicesByLang['ja']?.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender})
                </option>
              ))}
            </optgroup>
          </select>
          {currentVoice && (
            <p className="text-sm text-gray-500 mt-1">
              Current: {currentVoice.name} ({currentVoice.lang.name}, {currentVoice.gender})
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!isReady && !isLoading && (
            <button
              onClick={initialize}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Initialize TTS Engine
            </button>
          )}

          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span>Loading... {Math.round(loadProgress * 100)}%</span>
            </div>
          )}

          {isReady && (
            <>
              <button
                onClick={handlePlay}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Play
              </button>
              <button
                onClick={destroy}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Destroy
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {isReady && (
          <div className="p-3 bg-green-100 text-green-700 rounded">
            TTS Engine ready! Model loaded with WebGPU acceleration.
          </div>
        )}
      </div>
    </div>
  );
}
