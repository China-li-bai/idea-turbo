'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { VoiceInputButton } from './VoiceInputButton';
import { VoiceTextEditModal } from './VoiceTextEditModal';
import { AIConversationService } from '../../lib/aiConversationService';
import { HybridTTSService } from '../../lib/speechService';

export interface VoiceConversationV2Props {
  apiKey?: string;
  model?: string;
  onMessageSent?: (text: string) => void;
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export function VoiceConversationV2({
  apiKey,
  model = 'gpt-4o-mini',
  onMessageSent,
  className = ''
}: VoiceConversationV2Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pendingText, setPendingText] = useState('');

  const aiServiceRef = useRef<AIConversationService | null>(null);
  const ttsServiceRef = useRef<HybridTTSService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleFinalResult = useCallback((text: string) => {
    if (!text.trim()) return;
    
    setPendingText(text);
    setShowEditModal(true);
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    setError(`语音错误: ${errorMsg}`);
  }, []);

  const {
    isReady,
    isListening,
    isProcessing: isRecognizing,
    interimText,
    volume,
    engineStatus,
    startListening,
    stopListening,
    clearError: clearVoiceError,
    engine
  } = useVoiceRecognition({
    language: 'zh-CN',
    silenceTimeout: 3000,
    callbacks: {
      onFinalResult: handleFinalResult,
      onError: handleError
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const key = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    
    if (key) {
      aiServiceRef.current = new AIConversationService({
        apiKey: key,
        model
      });
    }

    const edgeTTSProxyUrl = process.env.NEXT_PUBLIC_EDGE_TTS_PROXY_URL || 'https://shu.66666618.xyz';
    ttsServiceRef.current = new HybridTTSService({
      edgeTTSProxyUrl,
      enableAutoSwitch: true,
      preferredService: 'auto'
    });
  }, [apiKey, model]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimText, scrollToBottom]);

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
        onError: (err) => {
          console.error('TTS 错误:', err);
          setIsSpeaking(false);
        }
      });
    } catch (err) {
      console.error('TTS 错误:', err);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !aiServiceRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);
    setError(null);
    onMessageSent?.(text.trim());

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.text
      }));

      const aiResponse = await aiServiceRef.current.generateResponse(text.trim(), conversationHistory);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiResponse,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      playAIResponse(aiResponse);
    } catch (err) {
      console.error('AI 生成错误:', err);
      setError(err instanceof Error ? err.message : '生成回复失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditConfirm = (text: string) => {
    setShowEditModal(false);
    setPendingText('');
    sendMessage(text);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setPendingText('');
  };

  const handleRetry = () => {
    setShowEditModal(false);
    setPendingText('');
    startListening();
  };

  const handleTextInputSubmit = () => {
    if (textInput.trim()) {
      sendMessage(textInput);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError(null);
    engine?.clearTranscript();
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">AI 语音对话</h2>
        <div className="flex gap-2 items-center">
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
            onClick={() => {
              setError(null);
              clearVoiceError();
            }} 
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
            <p className="text-sm mt-2 opacity-70">按住麦克风按钮说话，识别后可编辑再发送</p>
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

            {isListening && interimText && (
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
          <VoiceInputButton
            isReady={isReady}
            isProcessing={isRecognizing}
            volume={volume}
            interimText={interimText}
            onStart={startListening}
            onStop={stopListening}
            disabled={isSpeaking || isProcessing}
            size="md"
            showVolumeWave={true}
          />
        </div>
      </div>

      <VoiceTextEditModal
        isOpen={showEditModal}
        initialText={pendingText}
        onConfirm={handleEditConfirm}
        onCancel={handleEditCancel}
        onRetry={handleRetry}
        title="确认发送内容"
      />
    </div>
  );
}
