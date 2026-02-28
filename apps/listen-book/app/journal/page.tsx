'use client';

import { useState, useEffect } from 'react';
import { JournalInput } from '@/components/journal/JournalInput';
import { JournalList } from '@/components/journal/JournalList';
import { JournalLearning } from '@/components/journal/JournalLearning';
import { JournalEntry } from '@/lib/journal/storage';
import { ttsManager } from '@/lib/tts/ttsServiceManager';

type JournalView = 'list' | 'input' | 'learning';

export default function JournalPage() {
  const [currentView, setCurrentView] = useState<JournalView>('list');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [ttsReady, setTtsReady] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(true);

  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setCurrentView('learning');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEntry(null);
  };

  const handleComplete = () => {
    handleBackToList();
  };

  useEffect(() => {
    const edgeTTSProxyUrl = process.env.NEXT_PUBLIC_EDGE_TTS_PROXY_URL || 'https://shu.66666618.xyz';
    
    ttsManager.preloadVoices('webspeech').then(() => {
      setTtsReady(true);
      setTtsLoading(false);
    }).catch(error => {
      console.error('TTS 预加载失败:', error);
      setTtsLoading(false);
    });

    const unsubscribe = ttsManager.subscribe((state) => {
      setTtsReady(state.isReady);
      setTtsLoading(state.isLoading);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentView !== 'list' && (
                <button
                  onClick={handleBackToList}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {currentView === 'list' ? '日记' : currentView === 'input' ? '写日记' : '学习'}
              </h1>
            </div>
            
            {currentView === 'list' && (
              <button
                onClick={() => setCurrentView('input')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {currentView === 'list' && (
          <JournalList onSelectEntry={handleSelectEntry} />
        )}

        {currentView === 'input' && (
          <JournalInput onComplete={() => setCurrentView('list')} />
        )}

        {currentView === 'learning' && selectedEntry && (
          <JournalLearning 
            entry={selectedEntry} 
            onComplete={handleComplete}
            ttsReady={ttsReady}
            ttsLoading={ttsLoading}
          />
        )}
      </main>
    </div>
  );
}
