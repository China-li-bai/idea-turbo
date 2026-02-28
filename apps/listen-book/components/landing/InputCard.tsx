'use client';

import { useState } from 'react';
import { useI18n } from '../../lib/i18n/context';
import { useRouter } from 'next/navigation';

export function InputCard() {
  const { t } = useI18n();
  const router = useRouter();
  const [text, setText] = useState('');

  const handlePlay = () => {
    if (text.trim()) {
      localStorage.setItem('tts-input-text', text);
      router.push('/');
    }
  };

  return (
    <section className="px-4 mb-10">
      <div className="glass relative flex flex-col items-stretch justify-end rounded-2xl overflow-hidden p-6 shadow-2xl min-h-[220px]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-600/10 to-purple-500/5" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-slate-900 dark:text-white text-2xl font-bold leading-tight">
              {t.landing.inputTitle}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {t.landing.inputSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.landing.inputPlaceholder}
              className="flex-1 h-12 bg-white/5 dark:bg-black/20 rounded-lg border border-white/10 dark:border-white/5 flex items-center px-4 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              onClick={handlePlay}
              className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform active:scale-90 hover:bg-blue-700"
            >
              <span className="material-symbols-outlined">play_arrow</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
