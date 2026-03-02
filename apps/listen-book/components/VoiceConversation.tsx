'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SherpaOnnxEngine, RecognitionConfig, RecognitionCallbacks, RecognitionResult } from '@idea-turbo/sherpa-onnx';
import { AIConversationService } from '../lib/aiConversationService';
import { HybridTTSService } from '../lib/speechService';
import { useI18n } from '../lib/i18n/context';

export function VoiceConversation() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; timestamp: number }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [engineStatus, setEngineStatus] = useState<string>('初始化中...');
  const [isReady, setIsReady] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [modelVersion, setModelVersion] = useState<string>('');

  const recognitionEngineRef = useRef<SherpaOnnxEngine | null>(null);
  const aiServiceRef = useRef<AIConversationService | null>(null);
  const ttsServiceRef = useRef<HybridTTSService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const playAIResponse = async (text: string) => {
    if (!ttsServiceRef.current) return;

    setIsSpeaking(true);
    try {
      await ttsServiceRef.current.speak(text, {
        rate: 1,
        pitch: 1,
        volume: 1
      }, {
        onEnd: () => setIsSpeaking(false),
        onError: (error) => {
          console.error('TTS 错误:', error);
          setIsSpeaking(false);
        }
      });
    } catch (err) {
      console.error('TTS 错误:', err);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    console.log('VoiceConversation useEffect called');
    if (typeof window !== 'undefined') {
      console.log('Window is available');
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
      
      console.log('API Key:', apiKey ? 'Loaded' : 'Missing');

      console.log('Setting up callbacks');
      const callbacks: RecognitionCallbacks = {
        onResult: (result: RecognitionResult) => {
          if (result.isInterim) {
            setInterimText(result.transcript);
            return;
          }

          if (!result.transcript.trim()) return;

          setInterimText('');

          const userMessage = {
            id: Date.now().toString(),
            role: 'user' as const,
            text: result.transcript,
            timestamp: Date.now()
          };

          setMessages(prev => [...prev, userMessage]);
          setError(null);

          if (aiServiceRef.current && apiKey) {
            setIsProcessing(true);
            (async () => {
              try {
                setMessages(currentMsgs => {
                  const conversationHistory = currentMsgs.map(msg => ({
                    role: msg.role,
                    content: msg.text
                  }));
                  aiServiceRef.current!.generateResponse(result.transcript, conversationHistory).then(aiResponse => {
                    const assistantMessage = {
                      id: (Date.now() + 1).toString(),
                      role: 'assistant' as const,
                      text: aiResponse,
                      timestamp: Date.now()
                    };
                    setMessages(prev => [...prev, assistantMessage]);
                    playAIResponse(aiResponse);
                  }).catch(err => {
                    console.error('AI 生成错误:', err);
                    setError(err instanceof Error ? err.message : '生成回复失败');
                  }).finally(() => {
                    setIsProcessing(false);
                  });
                  return currentMsgs;
                });
              } catch (err) {
                console.error('AI 生成错误:', err);
                setError(err instanceof Error ? err.message : '生成回复失败');
                setIsProcessing(false);
              }
            })();
          }
        },
        onError: (error: string) => {
          console.error('语音识别错误:', error);
          setError(`语音错误: ${error}`);
          setIsListening(false);
        },
        onVolumeChange: (vol) => setVolume(vol),
        onStatus: (status) => {
          console.log('Engine status:', status);
          setEngineStatus(status);
          if (status === 'Ready') {
            setIsReady(true);
            setEngineStatus('就绪');
          }
        }
      };

      const recognitionConfig: RecognitionConfig = {
        engine: 'sherpa-onnx',
        language: 'zh-CN',
        continuous: true,
        interimResults: true,
        silenceTimeout: 3000,
        minConfidence: 0.5,
        enableVolumeDetection: true,
        enableRealtimePreview: true,
        remoteResources: process.env.NEXT_PUBLIC_SHERPA_ONNX_CDN ? {
          baseUrl: process.env.NEXT_PUBLIC_SHERPA_ONNX_CDN,
          files: {
            data: 'sherpa-onnx-wasm-main-asr.data',
          }
        } : undefined
      };

      console.log('Creating SherpaOnnxEngine');
      const engine = new SherpaOnnxEngine(recognitionConfig, callbacks);
      recognitionEngineRef.current = engine;

      console.log('Initializing Sherpa-onnx engine...');
      engine.initialize().then(() => {
        console.log('Sherpa-onnx engine initialized successfully');
        setModelVersion(engine.getModelVersion());
      }).catch(err => {
        console.error('Engine init error:', err);
        setError('语音识别初始化失败');
      });

      console.log('Setting up AI service');
      aiServiceRef.current = new AIConversationService({
        apiKey,
        model: 'gpt-4o-mini'
      });

      const edgeTTSProxyUrl = process.env.NEXT_PUBLIC_EDGE_TTS_PROXY_URL || 'https://shu.66666618.xyz';
      ttsServiceRef.current = new HybridTTSService({
        edgeTTSProxyUrl,
        enableAutoSwitch: true,
        preferredService: 'auto'
      });
    }

    return () => {
      recognitionEngineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimText, scrollToBottom]);

  const toggleListening = async () => {
    const engine = recognitionEngineRef.current;
    
    if (!engine) {
      setError('语音识别引擎未初始化');
      return;
    }

    if (isListening) {
      await engine.stop();
      setIsListening(false);
      setInterimText('');
      setVolume(0);
    } else {
      try {
        await engine.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error('启动识别失败:', err);
        setError('启动识别失败: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleTextInputSubmit = () => {
    if (textInput.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        text: textInput,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMessage]);
      setTextInput('');
      setIsProcessing(true);
      setError(null);
      
      (async () => {
        try {
          if (!aiServiceRef.current) {
            throw new Error('AI 服务未初始化');
          }
          
          setMessages(currentMsgs => {
            const conversationHistory = currentMsgs.map(msg => ({
              role: msg.role,
              content: msg.text
            }));
            aiServiceRef.current!.generateResponse(userMessage.text, conversationHistory).then(aiResponse => {
              const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                text: aiResponse,
                timestamp: Date.now()
              };
              setMessages(prev => [...prev, assistantMessage]);
              playAIResponse(aiResponse);
            }).catch(err => {
              console.error('AI 生成错误:', err);
              setError(err instanceof Error ? err.message : '生成回复失败');
            }).finally(() => {
              setIsProcessing(false);
            });
            return currentMsgs;
          });
        } catch (err) {
          console.error('AI 生成错误:', err);
          setError(err instanceof Error ? err.message : '生成回复失败');
          setIsProcessing(false);
        }
      })();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError(null);
    setInterimText('');
    recognitionEngineRef.current?.clearTranscript();
  };

  const handleForceUpdateModel = async () => {
    const engine = recognitionEngineRef.current;
    if (!engine) return;
    
    await engine.forceUpdateModel();
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handleClearModelCache = async () => {
    const engine = recognitionEngineRef.current;
    if (!engine) return;
    
    await engine.clearModelCache();
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">AI 语音对话</h2>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <button 
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="text-xs text-blue-300 px-2 py-1 bg-blue-500/20 rounded flex items-center gap-1 hover:bg-blue-500/30 transition-colors"
            >
              <span>模型</span>
              <span className="text-[10px]">▼</span>
            </button>
            
            {showModelMenu && (
              <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 min-w-[200px]">
                <div className="p-2 space-y-1">
                  <div className="text-xs text-white/50 px-2 py-1">
                    版本: {modelVersion}
                  </div>
                  <button 
                    onClick={handleForceUpdateModel}
                    className="w-full px-3 py-2 text-sm text-white hover:bg-blue-500/30 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span>🔄</span>
                    <span>强制更新模型</span>
                  </button>
                  <button 
                    onClick={handleClearModelCache}
                    className="w-full px-3 py-2 text-sm text-white hover:bg-red-500/30 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    <span>清除模型缓存</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <span className="text-xs text-blue-300 px-2 py-1 bg-blue-500/20 rounded">
            {engineStatus}
          </span>
          <button 
            onClick={clearConversation}
            className="px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-300">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-red-300 hover:text-red-100 text-xl leading-none"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !interimText ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">开始与 AI 进行语音对话吧！</p>
            <p className="text-sm mt-2 opacity-70">点击麦克风按钮开始说话，或直接输入文字</p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-500/30' : 'bg-green-500/30'
                }`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className="text-xs text-white/50 mb-1">
                    {msg.role === 'user' ? '你' : 'AI 助手'}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-500/30 text-white rounded-tr-sm' 
                      : 'bg-white/10 text-white/90 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}

            {interimText && (
              <div className="flex gap-3 flex-row-reverse">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-blue-500/30">
                  👤
                </div>
                <div className="max-w-[70%] text-right">
                  <div className="text-xs text-white/50 mb-1">你</div>
                  <div className="px-4 py-2 bg-blue-500/20 text-white/70 rounded-2xl rounded-tr-sm italic">
                    {interimText}
                    <span className="animate-pulse">|</span>
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-green-500/30">
                  🤖
                </div>
                <div className="px-4 py-3 bg-white/10 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 space-y-3">
        {isListening && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100"
                style={{ width: `${volume}%` }}
              />
            </div>
            <span className="text-xs text-white/40 w-16 text-right">
              正在聆听...
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTextInputSubmit()}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-xl focus:outline-none focus:border-blue-400"
            disabled={isSpeaking}
          />
          <button
            onClick={handleTextInputSubmit}
            disabled={!textInput.trim() || isSpeaking}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            发送
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={toggleListening}
            disabled={isSpeaking || !isReady}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : isSpeaking || !isReady
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
            }`}
          >
            {isListening ? '🔴' : '🎤'}
          </button>
        </div>
      </div>
    </div>
  );
}
