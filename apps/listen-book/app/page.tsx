'use client';

import { useState, useEffect, useRef } from 'react';
import { TextSegmenter, TextSegment } from '../lib/textSegmenter';
import { SpeechService, HybridTTSService, TTSServiceType } from '../lib/speechService';
import { PlaybackStateManager, PlaybackState } from '../lib/playbackState';
import { TTSConfig } from '../lib/tts/types';
import { TextInputSection } from '../components/TextInputSection';
import { PlaybackControlSection } from '../components/PlaybackControlSection';
import { ConfigSection } from '../components/ConfigSection';
import { CookieConsent } from '../components/CookieConsent';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { VoiceConversation } from '../components/VoiceConversation';
import { useI18n } from '../lib/i18n/context';

export default function Home() {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsServiceType, setTTSServiceType] = useState<TTSServiceType>('auto');
  const [currentServiceName, setCurrentServiceName] = useState<string>('Web Speech API');
  const [activeTab, setActiveTab] = useState<'reader' | 'conversation'>('reader');
  
  const segmenterRef = useRef<TextSegmenter | null>(null);
  const speechServiceRef = useRef<SpeechService | HybridTTSService | null>(null);
  const playbackManagerRef = useRef<PlaybackStateManager | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        segmenterRef.current = new TextSegmenter();
        
        const edgeTTSProxyUrl = process.env.NEXT_PUBLIC_EDGE_TTS_PROXY_URL || 'https://shu.66666618.xyz';
        
        speechServiceRef.current = new HybridTTSService({
          edgeTTSProxyUrl,
          enableAutoSwitch: true,
          autoSwitchThreshold: 100,
          preferredService: 'auto'
        });
        
        speechServiceRef.current.enableQueueMode(true);
        
        playbackManagerRef.current = new PlaybackStateManager();

        const unsubscribe = playbackManagerRef.current.subscribe((state) => {
          setPlaybackState(state);
        });

        const loadVoices = () => {
          if (speechServiceRef.current) {
            setVoices(speechServiceRef.current.getVoices());
            setCurrentServiceName(speechServiceRef.current.getServiceName());
          }
        };

        loadVoices();
        
        if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = () => {
            if (speechServiceRef.current && (ttsServiceType === 'auto' || ttsServiceType === 'webspeech')) {
              loadVoices();
            }
          };
        }

        const savedText = localStorage.getItem('tts-input-text');
        if (savedText) {
          setText(savedText);
          localStorage.removeItem('tts-input-text');
        }

        return () => {
          unsubscribe();
          if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    }
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (speechServiceRef.current) {
        const voices = speechServiceRef.current.getVoices();
        setVoices(voices);
        setCurrentServiceName(speechServiceRef.current.getServiceName());
      }
    };

    if (ttsServiceType === 'edgetts' && speechServiceRef.current instanceof HybridTTSService) {
      speechServiceRef.current.refreshVoices().then(() => {
        loadVoices();
      });
    } else {
      loadVoices();
    }
  }, [ttsServiceType]);

  const handleTTSServiceChange = (type: TTSServiceType) => {
    setTTSServiceType(type);
    if (speechServiceRef.current instanceof HybridTTSService) {
      speechServiceRef.current.setServiceType(type);
      setCurrentServiceName(speechServiceRef.current.getServiceName());
    }
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (playbackManagerRef.current && segmenterRef.current) {
      playbackManagerRef.current.setText(newText);
      if (newText.trim()) {
        const segments = segmenterRef.current.segment(newText);
        playbackManagerRef.current.setSegments(segments);
      }
    }
  };

  const handlePlay = async () => {
    if (!speechServiceRef.current || !playbackManagerRef.current) return;

    const state = playbackManagerRef.current.getState();
    
    if (state.isPaused) {
      await speechServiceRef.current.resume();
      playbackManagerRef.current.setPaused(false);
      return;
    }

    let startIndex = 0;
    if (state.currentSegmentId !== null) {
      startIndex = state.currentSegmentId;
    } else if (state.segments.length > 0) {
      startIndex = 0;
      playbackManagerRef.current.setCurrentSegmentId(0);
    }

    if (state.segments.length > 0) {
      playbackManagerRef.current.setPlaying(true);
      
      if (speechServiceRef.current instanceof HybridTTSService) {
        speechServiceRef.current.playAllSegments(state.segments, startIndex, state.config, {
          onStart: () => {},
          onEnd: () => {
            playbackManagerRef.current?.setPlaying(false);
          },
          onError: (error: SpeechSynthesisErrorEvent | Error) => {
            console.error('Speech error:', error);
            playbackManagerRef.current?.setPlaying(false);
          }
        });
      } else {
        const segment = state.segments[startIndex];
        speechServiceRef.current.speakSegment(segment, state.config, {
          onStart: () => {},
          onEnd: () => {
            handleNextSegment();
          },
          onError: (error: SpeechSynthesisErrorEvent | Error) => {
            console.error('Speech error:', error);
            playbackManagerRef.current?.setPlaying(false);
          }
        });
      }
    }
  };

  const handlePause = () => {
    if (!speechServiceRef.current || !playbackManagerRef.current) return;
    speechServiceRef.current.pause();
    playbackManagerRef.current.setPaused(true);
  };

  const handleStop = () => {
    if (!speechServiceRef.current || !playbackManagerRef.current) return;
    speechServiceRef.current.stop();
    playbackManagerRef.current.setPlaying(false);
    playbackManagerRef.current.setPaused(false);
  };

  const handleNextSegment = () => {
    if (!playbackManagerRef.current || !speechServiceRef.current) return;

    const nextSegment = playbackManagerRef.current.getNextSegment();
    if (nextSegment) {
      playbackManagerRef.current.setCurrentSegmentId(nextSegment.id);
      const state = playbackManagerRef.current.getState();
      speechServiceRef.current.speakSegment(nextSegment, state.config, {
        onEnd: () => {
          handleNextSegment();
        },
        onError: (error) => {
          console.error('Speech error:', error);
          playbackManagerRef.current?.setPlaying(false);
        }
      });
    } else {
      playbackManagerRef.current.setPlaying(false);
    }
  };

  const handlePreviousSegment = () => {
    if (!playbackManagerRef.current || !speechServiceRef.current) return;

    const previousSegment = playbackManagerRef.current.getPreviousSegment();
    if (previousSegment) {
      speechServiceRef.current.stop();
      playbackManagerRef.current.setCurrentSegmentId(previousSegment.id);
      playbackManagerRef.current.setPlaying(false);
    }
  };

  const handleConfigChange = (config: Partial<TTSConfig>) => {
    if (playbackManagerRef.current) {
      playbackManagerRef.current.setConfig(config);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-between py-8 px-4 bg-white dark:bg-black">
        <div className="w-full space-y-6 flex-grow">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-center text-black dark:text-zinc-50 flex-1">
              {t.page.title}
            </h1>
            <LanguageSwitcher />
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('reader')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'reader'
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              文本朗读
            </button>
            <button
              onClick={() => setActiveTab('conversation')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'conversation'
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              语音对话
            </button>
          </div>

          {activeTab === 'reader' ? (
            <>
              <TextInputSection
                value={text}
                onChange={handleTextChange}
                placeholder={t.page.placeholder}
              />

              {playbackState && playbackState.segments.length > 0 && (
                <div className="space-y-4">
                  <PlaybackControlSection
                    playbackState={playbackState}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onStop={handleStop}
                    onNext={handleNextSegment}
                    onPrevious={handlePreviousSegment}
                  />

                  <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      {t.service.title}
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => handleTTSServiceChange('auto')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          ttsServiceType === 'auto'
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {t.service.auto}
                      </button>
                      <button
                        onClick={() => handleTTSServiceChange('webspeech')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          ttsServiceType === 'webspeech'
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {t.service.webspeech}
                      </button>
                      <button
                        onClick={() => handleTTSServiceChange('edgetts')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          ttsServiceType === 'edgetts'
                            ? 'bg-blue-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {t.service.edgetts}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t.service.currentService}: {currentServiceName}
                      {ttsServiceType === 'auto' && ` ${t.service.autoSelect}`}
                    </p>
                  </div>

                  <ConfigSection
                    config={playbackState.config}
                    voices={voices}
                    onConfigChange={handleConfigChange}
                    currentServiceName={currentServiceName}
                    serviceType={ttsServiceType}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="h-[600px]">
              <VoiceConversation />
            </div>
          )}
        </div>

        <footer className="w-full mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.footer.copyright}
            </p>
            <div className="flex gap-4 text-sm">
              <a
                href="/journal"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                日记
              </a>
              <span className="text-zinc-400">|</span>
              <a
                href="/privacy"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                {t.footer.privacy}
              </a>
              <span className="text-zinc-400">|</span>
              <a
                href="/terms"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                {t.footer.terms}
              </a>
              <span className="text-zinc-400">|</span>
              <a
                href="/cookies"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                {t.footer.cookies}
              </a>
            </div>
          </div>
        </footer>
        <CookieConsent />
      </main>
    </div>
  );
}
