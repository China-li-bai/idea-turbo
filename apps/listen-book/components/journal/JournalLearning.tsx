'use client';

import { useState, useEffect, useRef } from 'react';
import { JournalEntry } from '@/lib/journal/storage';
import { HybridTTSService } from '@/lib/tts/HybridTTSService';
import { TTSConfig } from '@/lib/tts/types';
import { SpeechEventHandlers } from '@/lib/tts/ITTSService';
import { TextSegmenter, TextSegment } from '@/lib/textSegmenter';
import { ttsManager } from '@/lib/tts/ttsServiceManager';

interface JournalLearningProps {
  entry: JournalEntry;
  onComplete?: () => void;
  ttsReady?: boolean;
  ttsLoading?: boolean;
}

export function JournalLearning({ entry, onComplete, ttsReady = false, ttsLoading = false }: JournalLearningProps) {
  const [currentLangIndex, setCurrentLangIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState(1.0);
  const [isReady, setIsReady] = useState(false);
  const [currentServiceType, setCurrentServiceType] = useState<'webspeech' | 'edgetts'>('webspeech');
  
  const ttsServiceRef = useRef<HybridTTSService | null>(null);
  const segmenterRef = useRef<TextSegmenter | null>(null);

  const languages = [
    { code: entry.originalLanguage, label: '原文', text: entry.originalText },
    ...entry.translations.map(t => ({ 
      code: t.language, 
      label: t.language.toUpperCase(), 
      text: t.text 
    }))
  ];

  const currentLang = languages[currentLangIndex];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      segmenterRef.current = new TextSegmenter();
      ttsServiceRef.current = ttsManager.getService();
      setIsReady(ttsReady);
    }

    return () => {
      ttsServiceRef.current?.stop();
    };
  }, [ttsReady]);

  useEffect(() => {
    if (segmenterRef.current && currentLang.text) {
      const segs = segmenterRef.current.segment(currentLang.text);
      setSegments(segs);
      setCurrentSegmentIndex(0);
    }
  }, [currentLang.text]);

  useEffect(() => {
    if (voices.length > 0) {
      let langVoice;
      if (currentServiceType === 'webspeech') {
        langVoice = voices[0];
      } else {
        langVoice = voices.find(v => v.lang.startsWith(currentLang.code));
      }
      if (langVoice && (!selectedVoice || !voices.find(v => v.voiceURI === selectedVoice))) {
        setSelectedVoice(langVoice.voiceURI);
      }
    }
  }, [currentLangIndex, currentServiceType, voices]);

  useEffect(() => {
    if (voices.length > 0) {
      let langVoice;
      if (currentServiceType === 'webspeech') {
        langVoice = voices[0];
      } else {
        langVoice = voices.find(v => v.lang.startsWith(currentLang.code));
      }
      if (langVoice && (!selectedVoice || !voices.find(v => v.voiceURI === selectedVoice))) {
        setSelectedVoice(langVoice.voiceURI);
      }
    }
  }, [currentLangIndex, currentServiceType, voices]);

  const loadVoices = async () => {
    if (!ttsServiceRef.current) return;
    
    const availableVoices = ttsServiceRef.current.getVoices();
    setVoices(availableVoices);
  };

  const handlePlay = async () => {
    if (!ttsServiceRef.current || segments.length === 0 || !isReady) return;

    if (isPaused) {
      await ttsServiceRef.current.resume();
      await ttsServiceRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    console.log('[JournalLearning] Playing with voice:', selectedVoice || 'auto');

    const config: TTSConfig = {
      voiceURI: selectedVoice || undefined,
      rate,
      volume: 1,
    };

    const handlers: SpeechEventHandlers = {
      onStart: () => setIsPlaying(true),
      onEnd: () => {
        setIsPlaying(false);
        if (currentLangIndex < languages.length - 1) {
          handleNextLanguage();
        }
      },
      onError: (error: SpeechSynthesisErrorEvent | Error) => {
        console.error('TTS error:', error);
        setIsPlaying(false);
      }
    };

    if (currentServiceType === 'webspeech') {
      await ttsServiceRef.current.speak(currentLang.text, config, handlers);
    } else {
      ttsServiceRef.current.setConfig(config);
      ttsServiceRef.current.setSegments(segments);
      ttsServiceRef.current.setHandlers(handlers);
      await ttsServiceRef.current.playQueue();
    }

    if (currentServiceType === 'webspeech') {
      await ttsServiceRef.current.speak(currentLang.text, config, handlers);
    } else {
      ttsServiceRef.current.setConfig(config);
      ttsServiceRef.current.setSegments(segments);
      ttsServiceRef.current.setHandlers(handlers);
      await ttsServiceRef.current.playQueue();
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (!ttsServiceRef.current) return;
    if (currentServiceType === 'webspeech') {
      ttsServiceRef.current.pause();
    } else {
      ttsServiceRef.current.pauseQueue();
    }
    if (currentServiceType === 'webspeech') {
      ttsServiceRef.current.pause();
    } else {
      ttsServiceRef.current.pauseQueue();
    }
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (!ttsServiceRef.current) return;
    if (currentServiceType === 'webspeech') {
      ttsServiceRef.current.stop();
    } else {
      ttsServiceRef.current.stopQueue();
    }
    if (currentServiceType === 'webspeech') {
      ttsServiceRef.current.stop();
    } else {
      ttsServiceRef.current.stopQueue();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSegmentIndex(0);
  };

  const handlePrevious = () => {
    if (currentSegmentIndex > 0) {
      if (currentServiceType === 'webspeech') {
        setCurrentSegmentIndex(prev => prev - 1);
      } else {
        ttsServiceRef.current?.seekQueue(currentSegmentIndex - 1);
        setCurrentSegmentIndex(prev => prev - 1);
      }
      if (currentServiceType === 'webspeech') {
        setCurrentSegmentIndex(prev => prev - 1);
      } else {
        ttsServiceRef.current?.seekQueue(currentSegmentIndex - 1);
        setCurrentSegmentIndex(prev => prev - 1);
      }
    }
  };

  const handleNext = () => {
    if (currentSegmentIndex < segments.length - 1) {
      if (currentServiceType === 'webspeech') {
        setCurrentSegmentIndex(prev => prev + 1);
      } else {
        ttsServiceRef.current?.seekQueue(currentSegmentIndex + 1);
        setCurrentSegmentIndex(prev => prev + 1);
      }
      if (currentServiceType === 'webspeech') {
        setCurrentSegmentIndex(prev => prev + 1);
      } else {
        ttsServiceRef.current?.seekQueue(currentSegmentIndex + 1);
        setCurrentSegmentIndex(prev => prev + 1);
      }
    }
  };

  const handleNextLanguage = () => {
    handleStop();
    if (currentLangIndex < languages.length - 1) {
      setCurrentLangIndex(prev => prev + 1);
    }
  };

  const handlePreviousLanguage = () => {
    handleStop();
    if (currentLangIndex > 0) {
      setCurrentLangIndex(prev => prev - 1);
    }
  };

  const handleSwitchService = async (serviceType: 'webspeech' | 'edgetts') => {
    if (!ttsServiceRef.current) return;
    
    handleStop();
    setCurrentServiceType(serviceType);
    ttsServiceRef.current.setServiceType(serviceType);
    
    if (serviceType === 'edgetts') {
      ttsServiceRef.current.enableQueueMode(true);
    }
    
    if (serviceType === 'edgetts') {
      ttsServiceRef.current.enableQueueMode(true);
    }
    
    await ttsServiceRef.current.refreshVoices();
    const availableVoices = ttsServiceRef.current.getVoices();
    setVoices(availableVoices);
  };

  const handleRateChange = async (newRate: number) => {
    setRate(newRate);
    
    if (!ttsServiceRef.current) return;
    
    if (currentServiceType === 'webspeech' && isPlaying) {
      const config: TTSConfig = {
        voiceURI: selectedVoice || undefined,
        rate: newRate,
        volume: 1,
      };
      
      const handlers: SpeechEventHandlers = {
        onStart: () => setIsPlaying(true),
        onEnd: () => {
          setIsPlaying(false);
          if (currentLangIndex < languages.length - 1) {
            handleNextLanguage();
          }
        },
        onError: (error: SpeechSynthesisErrorEvent | Error) => {
          console.error('TTS error:', error);
          setIsPlaying(false);
        }
      };
      
      await ttsServiceRef.current.speak(currentLang.text, config, handlers);
    } else if (currentServiceType === 'edgetts' && isPlaying) {
      const config: TTSConfig = {
        voiceURI: selectedVoice || undefined,
        rate: newRate,
        volume: 1,
      };
      
      const handlers: SpeechEventHandlers = {
        onStart: () => setIsPlaying(true),
        onEnd: () => {
          setIsPlaying(false);
          if (currentLangIndex < languages.length - 1) {
            handleNextLanguage();
          }
        },
        onError: (error: SpeechSynthesisErrorEvent | Error) => {
          console.error('TTS error:', error);
          setIsPlaying(false);
        }
      };
      
      handleStop();
      ttsServiceRef.current.setConfig(config);
      ttsServiceRef.current.setSegments(segments);
      ttsServiceRef.current.setHandlers(handlers);
      await ttsServiceRef.current.playQueue();
      setIsPlaying(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            学习日记
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleSwitchService('webspeech')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                currentServiceType === 'webspeech'
                  ? 'bg-green-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              浏览器TTS
            </button>
            <button
              onClick={() => handleSwitchService('edgetts')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                currentServiceType === 'edgetts'
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              高级Edge TTS
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {languages.map((lang, index) => (
            <button
              key={lang.code}
              onClick={() => {
                handleStop();
                setCurrentLangIndex(index);
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                currentLangIndex === index
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg min-h-[200px]">
          <p className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
            {currentLang.text}
          </p>
        </div>

        {currentServiceType === 'edgetts' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              <span>播放进度</span>
              <span>{currentSegmentIndex + 1} / {segments.length}</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${segments.length > 0 ? ((currentSegmentIndex + 1) / segments.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        {currentServiceType === 'edgetts' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              <span>播放进度</span>
              <span>{currentSegmentIndex + 1} / {segments.length}</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${segments.length > 0 ? ((currentSegmentIndex + 1) / segments.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={handlePreviousLanguage}
            disabled={currentLangIndex === 0}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handlePrevious}
            disabled={currentSegmentIndex === 0 || currentServiceType === 'webspeech'}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {isPlaying ? (
            <button
              onClick={handlePause}
              disabled={!isReady}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handlePlay}
              disabled={!isReady || segments.length === 0}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={currentSegmentIndex >= segments.length - 1 || currentServiceType === 'webspeech'}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={handleNextLanguage}
            disabled={currentLangIndex >= languages.length - 1}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={handleStop}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              语速: {rate}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              语音
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <option value="">自动选择</option>
              {voices.map(voice => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {onComplete && (
        <div className="flex justify-center">
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            完成学习
          </button>
        </div>
      )}
    </div>
  );
}
