'use client';

import { useState } from 'react';
import { useVoiceRecognition } from '@idea-turbo/voice-input';

export default function CustomVoiceInput() {
  const [text, setText] = useState('');
  
  const {
    state,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript
  } = useVoiceRecognition({
    language: 'zh-CN',
    autoInitialize: true,
    onResult: (result, isFinal) => {
      if (isFinal) {
        setText(prev => prev + result);
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">自定义语音输入示例</h1>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">状态: {state.initStatus}</p>
            <p className="text-sm text-gray-600 mb-2">进度: {state.initProgress}%</p>
            {state.error && (
              <p className="text-sm text-red-600">错误: {state.error}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">识别文本:</label>
            <textarea
              value={text || transcript.fullText}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 p-3 border rounded-lg"
              placeholder="语音识别结果将显示在这里..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              disabled={!state.isReady}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all
                ${state.isRecording 
                  ? 'bg-red-500 text-white' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {state.isRecording ? '录音中...' : '按住说话'}
            </button>
            
            <button
              onClick={clearTranscript}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              清空
            </button>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">💡 使用说明</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 这是一个完全自定义的语音输入示例</li>
            <li>• 使用 <code className="bg-blue-100 px-1 rounded">useVoiceRecognition</code> Hook</li>
            <li>• 可以完全控制UI和交互逻辑</li>
            <li>• 非阻塞设计，不会影响页面其他功能</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
