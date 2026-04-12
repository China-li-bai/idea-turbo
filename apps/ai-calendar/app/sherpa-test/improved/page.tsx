'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SherpaOnnxEngine } from '@idea-turbo/sherpa-onnx';
import { RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '@idea-turbo/sherpa-onnx';

enum ListeningState {
  INACTIVE = 'inactive',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking'
}

interface TranscriptSegment {
  id: string;
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

const stateConfig: Record<ListeningState, {
  color: string;
  icon: string;
  label: string;
  description: string;
  pulse?: boolean;
  spinner?: boolean;
  wave?: boolean;
}> = {
  inactive: { 
    color: '#6b7280', 
    icon: '🎤', 
    label: '点击开始录音',
    description: '按下按钮开始语音识别'
  },
  listening: { 
    color: '#3b82f6', 
    icon: '👂', 
    label: '正在监听...',
    description: '请开始说话',
    pulse: true 
  },
  processing: { 
    color: '#fbbf24', 
    icon: '⚙️', 
    label: '处理中...',
    description: '正在识别您的语音',
    spinner: true 
  },
  speaking: { 
    color: '#4ade80', 
    icon: '🎙️', 
    label: '检测到语音',
    description: '继续说话或点击停止',
    wave: true 
  }
};

export default function ImprovedVoiceRecognition() {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<ListeningState>(ListeningState.INACTIVE);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [showHints, setShowHints] = useState(true);
  
  const engineRef = useRef<SherpaOnnxEngine | null>(null);
  const lastSoundTimeRef = useRef<number>(Date.now());
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const silenceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const config = stateConfig[state];

  useEffect(() => {
    let isMounted = true;
    
    const initEngine = async () => {
      try {
        const recognitionConfig: RecognitionConfig = {
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
              setInterimText(result.transcript);
              setState(ListeningState.SPEAKING);
              lastSoundTimeRef.current = Date.now();
            } else {
              if (result.transcript.trim()) {
                const newSegment: TranscriptSegment = {
                  id: Date.now().toString(),
                  text: result.transcript,
                  isFinal: true,
                  confidence: result.confidence || 0.9,
                  timestamp: Date.now()
                };
                setTranscriptSegments(prev => [...prev, newSegment]);
                setInterimText('');
              }
            }
          },
          onError: (err: string) => {
            if (!isMounted) return;
            setError(err);
            setState(ListeningState.INACTIVE);
          },
          onVolumeChange: (vol: number) => {
            if (!isMounted) return;
            setVolume(vol);
            if (vol > 10) {
              lastSoundTimeRef.current = Date.now();
            }
          },
          onStatus: (s: string) => {
            if (!isMounted) return;
            if (s === 'Ready') {
              setIsReady(true);
            }
          }
        };

        const engine = new SherpaOnnxEngine(recognitionConfig, callbacks);
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
      
      if (silenceCheckIntervalRef.current) {
        clearInterval(silenceCheckIntervalRef.current);
        silenceCheckIntervalRef.current = null;
      }
      
      if (engineRef.current) {
        try {
          engineRef.current.destroy();
          engineRef.current = null;
        } catch (err) {
          console.error('[VoiceRecognition] Error destroying engine:', err);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (state === ListeningState.LISTENING || state === ListeningState.SPEAKING) {
      silenceCheckIntervalRef.current = setInterval(() => {
        const silence = Date.now() - lastSoundTimeRef.current;
        
        if (silence > 500 && state === ListeningState.SPEAKING) {
          setState(ListeningState.LISTENING);
        }
      }, 500);
      
      return () => {
        if (silenceCheckIntervalRef.current) {
          clearInterval(silenceCheckIntervalRef.current);
          silenceCheckIntervalRef.current = null;
        }
      };
    }
  }, [state]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptSegments, interimText]);

  const handleStart = async () => {
    if (!engineRef.current || !isReady) return;

    try {
      setState(ListeningState.LISTENING);
      setError(null);
      lastSoundTimeRef.current = Date.now();
      
      await engineRef.current.start();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setState(ListeningState.INACTIVE);
    }
  };

  const handleStop = async () => {
    if (!engineRef.current) return;

    try {
      await engineRef.current.stop();
      setState(ListeningState.INACTIVE);
      setInterimText('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
    }
  };

  const handleClear = () => {
    setTranscriptSegments([]);
    setInterimText('');
    if (engineRef.current) {
      engineRef.current.clearTranscript();
    }
  };

  const handleUndo = () => {
    setTranscriptSegments(prev => prev.slice(0, -1));
  };

  const handleEdit = (id: string) => {
    const segment = transcriptSegments.find(s => s.id === id);
    if (segment) {
      const newText = prompt('编辑文本:', segment.text);
      if (newText !== null) {
        setTranscriptSegments(prev => 
          prev.map(s => s.id === id ? { ...s, text: newText } : s)
        );
      }
    }
  };

  const handleDelete = (id: string) => {
    setTranscriptSegments(prev => prev.filter(s => s.id !== id));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const fullTranscript = transcriptSegments.map(s => s.text).join('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🎙️ 智能语音识别
          </h1>
          <p className="text-gray-400">基于 Sherpa-ONNX 的高精度实时语音转文字</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className={`text-4xl ${config.pulse ? 'animate-pulse' : ''}`}
                style={{ filter: `drop-shadow(0 0 10px ${config.color})` }}
              >
                {config.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: config.color }}>
                  {config.label}
                </h2>
                <p className="text-sm text-gray-400">{config.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {state !== ListeningState.INACTIVE && (
                <>
                  <div className="audio-wave flex items-end gap-1 h-8">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className="w-1 bg-green-400 rounded-full"
                        style={{
                          height: '20px',
                          animation: state === ListeningState.SPEAKING ? 
                            `wave 0.5s ease-in-out infinite ${i * 0.1}s` : 'none'
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">
                    {Math.round(volume)}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-100 rounded-full"
              style={{
                width: `${volume}%`,
                background: `linear-gradient(90deg, ${config.color}, ${config.color}dd)`
              }}
            />
          </div>

          {showHints && state === ListeningState.LISTENING && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 提示：请开始说话，或点击"停止"结束录音
              </p>
            </div>
          )}

          {showHints && state === ListeningState.LISTENING && volume < 5 && (
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                ⚠️ 未检测到声音，请检查麦克风设置
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📝 识别结果</h3>
            <div className="flex gap-2">
              {transcriptSegments.length > 0 && (
                <>
                  <button
                    onClick={handleUndo}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    ↩️ 撤销
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    🗑️ 清空
                  </button>
                </>
              )}
              <button
                onClick={() => setShowHints(!showHints)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                {showHints ? '💡 隐藏提示' : '💡 显示提示'}
              </button>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto border border-gray-700">
            {transcriptSegments.length === 0 && !interimText ? (
              <p className="text-gray-500 text-center py-8">
                识别结果将显示在这里...
              </p>
            ) : (
              <div className="space-y-2">
                {transcriptSegments.map((segment) => (
                  <div
                    key={segment.id}
                    className="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="flex-1 text-base leading-relaxed">
                      {segment.text}
                    </span>
                    <span className={`text-xs ${getConfidenceColor(segment.confidence)}`}>
                      {Math.round(segment.confidence * 100)}%
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button
                        onClick={() => handleEdit(segment.id)}
                        className="p-1 hover:bg-gray-700 rounded text-xs"
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(segment.id)}
                        className="p-1 hover:bg-red-600/30 rounded text-xs text-red-400"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                
                {interimText && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border-l-4 border-yellow-500">
                    <span className="flex-1 text-base leading-relaxed text-yellow-300 animate-pulse">
                      {interimText}
                    </span>
                    <span className="text-xs text-yellow-400">识别中...</span>
                  </div>
                )}
                
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>

          {fullTranscript && (
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">完整文本：</span>
                <button
                  onClick={() => navigator.clipboard.writeText(fullTranscript)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  📋 复制
                </button>
              </div>
              <p className="text-sm text-gray-300">{fullTranscript}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4">
          {state === ListeningState.INACTIVE ? (
            <button
              onClick={handleStart}
              disabled={!isReady}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-none"
            >
              🎙️ 开始录音
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              ⏹️ 停止录音
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-400 mb-1">发生错误</h3>
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">✨ 2026 UI/UX 最佳实践</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">即时反馈</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">状态可视化</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">错误恢复</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">情境提示</span>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes wave {
            0%, 100% { transform: scaleY(0.5); }
            50% { transform: scaleY(1.5); }
          }
        `}</style>
      </div>
    </div>
  );
}
