'use client';

import { useState } from 'react';
import { useKokoroTts, KOKORO_SPEAKERS } from '@idea-turbo/sherpa-onnx-tts';

export function KokoroTtsDemo() {
  const [text, setText] = useState('你好，这是一个 Kokoro TTS 测试。Hello, this is a Kokoro TTS test.');
  const [selectedSpeaker, setSelectedSpeaker] = useState(47);
  
  const {
    isReady,
    isLoading,
    loadProgress,
    error,
    speakers,
    currentSpeaker,
    generateAndPlay,
    setSpeaker,
    initialize,
  } = useKokoroTts({
    defaultSpeakerId: selectedSpeaker,
    debug: true,
  });

  const chineseSpeakers = speakers.filter((s: { language: string }) => s.language === 'zh');

  const handlePlay = async () => {
    if (!text.trim()) return;
    try {
      await generateAndPlay(text, selectedSpeaker, 1.0);
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Kokoro TTS Demo</h2>
      
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
          <label className="block text-sm font-medium mb-2">Speaker</label>
          <select
            value={selectedSpeaker}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              setSelectedSpeaker(id);
              setSpeaker(id);
            }}
            className="w-full p-2 border rounded"
          >
            {chineseSpeakers.map((speaker: { id: number; name: string; description?: string }) => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name} - {speaker.description}
              </option>
            ))}
          </select>
          {currentSpeaker && (
            <p className="text-sm text-gray-500 mt-1">
              Current: {currentSpeaker.name} ({currentSpeaker.gender})
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
              <span>Loading... {Math.round(loadProgress)}%</span>
            </div>
          )}
          
          {isReady && (
            <button
              onClick={handlePlay}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Play
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {isReady && (
          <div className="p-3 bg-green-100 text-green-700 rounded">
            TTS Engine ready! Model loaded successfully.
          </div>
        )}
      </div>
    </div>
  );
}
