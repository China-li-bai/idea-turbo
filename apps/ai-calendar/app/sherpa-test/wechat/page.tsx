'use client';

import { useState, useEffect, useRef } from 'react';
import { SherpaOnnxEngine } from '@idea-turbo/sherpa-onnx';
import { RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '@idea-turbo/sherpa-onnx';

export default function WeChatStyleVoiceInput() {
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSegment, setCurrentSegment] = useState('');
  const [segments, setSegments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  
  const engineRef = useRef<SherpaOnnxEngine | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initEngine = async () => {
      try {
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
            if (!isMounted) return;
            
            if (result.isInterim) {
              setCurrentSegment(result.transcript);
            } else if (result.isFinal) {
              if (result.transcript.trim()) {
                setSegments(prev => [...prev, result.transcript]);
                setCurrentSegment('');
              }
            }
          },
          onError: (err: string) => {
            if (!isMounted) return;
            setError(err);
            setIsRecording(false);
          },
          onVolumeChange: (vol: number) => {
            if (!isMounted) return;
            setVolume(vol);
          },
          onStatus: (s: string) => {
            if (!isMounted) return;
            if (s === 'Ready') {
              setIsReady(true);
            }
          }
        };

        const engine = new SherpaOnnxEngine(config, callbacks);
        engineRef.current = engine;
        await engine.initialize();
      } catch (err) {
        if (!isMounted) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
      }
    };

    initEngine();

    return () => {
      isMounted = false;
      if (engineRef.current) {
        try {
          engineRef.current.destroy();
          engineRef.current = null;
        } catch (err) {
          console.error('[VoiceInput] Error destroying engine:', err);
        }
      }
    };
  }, []);

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (!engineRef.current || !isReady || isRecording) return;

    try {
      setError(null);
      setCurrentSegment('');
      setIsRecording(true);
      await engineRef.current.start();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setIsRecording(false);
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (!engineRef.current || !isRecording) return;

    try {
      await engineRef.current.stop();
      setIsRecording(false);
      setCurrentSegment('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setIsRecording(false);
    }
  };

  const handlePointerLeave = async (e: React.PointerEvent) => {
    if (isRecording) {
      await handlePointerUp(e);
    }
  };

  const handleClear = () => {
    setSegments([]);
    setCurrentSegment('');
    if (engineRef.current) {
      engineRef.current.clearTranscript();
    }
  };

  const handleCopy = () => {
    const text = segments.join('');
    navigator.clipboard.writeText(text);
  };

  const fullText = segments.join('');
  const displayText = fullText + currentSegment;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <div className="flex-1 p-6 flex flex-col">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">语音输入</h1>
          <p className="text-sm text-gray-500 mt-1">按住下方按钮开始说话</p>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 min-h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">识别结果</span>
              {fullText && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    复制
                  </button>
                  <button
                    onClick={handleClear}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {displayText ? (
                <div className="text-lg leading-relaxed text-gray-800">
                  {fullText}
                  {currentSegment && (
                    <span className="text-gray-400 animate-pulse">{currentSegment}</span>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎤</div>
                    <p>按住下方按钮开始语音输入</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center">
            <button
              ref={buttonRef}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              disabled={!isReady}
              className={`
                relative w-32 h-32 rounded-full select-none touch-none
                transition-all duration-200 transform
                ${isRecording 
                  ? 'bg-red-500 scale-110 shadow-2xl' 
                  : 'bg-green-500 hover:bg-green-600 hover:scale-105 shadow-xl'
                }
                ${!isReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              style={{
                boxShadow: isRecording 
                  ? `0 0 ${Math.min(60, 20 + volume)}px rgba(239, 68, 68, 0.5)`
                  : '0 10px 30px rgba(34, 197, 94, 0.3)'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {isRecording ? (
                  <div className="text-white text-center">
                    <div className="text-4xl mb-1">🎙️</div>
                    <div className="text-xs font-medium">松开结束</div>
                  </div>
                ) : (
                  <div className="text-white text-center">
                    <div className="text-4xl mb-1">🎤</div>
                    <div className="text-xs font-medium">
                      {isReady ? '按住说话' : '初始化中...'}
                    </div>
                  </div>
                )}
              </div>
              
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-white animate-ping opacity-30" />
              )}
            </button>

            <div className="mt-4 text-center">
              {isRecording ? (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">正在录音...</span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">
                  {isReady ? '按住按钮开始录音' : '正在初始化语音引擎...'}
                </span>
              )}
            </div>

            {isRecording && (
              <div className="mt-4 w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${Math.min(100, volume)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6">
          <p>💡 提示：按住按钮说话，松开自动结束</p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
