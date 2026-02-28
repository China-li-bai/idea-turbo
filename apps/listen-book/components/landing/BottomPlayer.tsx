'use client';

import { useI18n } from '../../lib/i18n/context';

export function BottomPlayer() {
  const { t } = useI18n();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 max-w-xl mx-auto">
      <div className="glass dark:bg-black/60 rounded-2xl p-4 shadow-2xl border-t border-white/20">
        <div className="flex items-center gap-4">
          <div className="flex gap-[2px] h-6 items-end">
            <div className="w-1 bg-blue-600 h-2 rounded-full" />
            <div className="w-1 bg-blue-600 h-5 rounded-full" />
            <div className="w-1 bg-blue-600 h-3 rounded-full" />
            <div className="w-1 bg-blue-600 h-6 rounded-full" />
            <div className="w-1 bg-blue-600 h-4 rounded-full" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
              {t.landing.nowPlaying}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Apollo (US) • {t.landing.premiumVoice}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-slate-500 hover:text-blue-600 transition-colors">
              <span className="material-symbols-outlined">skip_previous</span>
            </button>
            <button className="size-10 flex items-center justify-center bg-blue-600 rounded-full text-white shadow-md hover:bg-blue-700 transition-colors">
              <span className="material-symbols-outlined">pause</span>
            </button>
            <button className="text-slate-500 hover:text-blue-600 transition-colors">
              <span className="material-symbols-outlined">skip_next</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
