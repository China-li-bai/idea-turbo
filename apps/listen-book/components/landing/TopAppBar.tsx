'use client';

import { LanguageSwitcher } from '../LanguageSwitcher';

export function TopAppBar() {
  return (
    <header className="sticky top-0 z-50 bg-zinc-50/80 dark:bg-black/80 backdrop-blur-md">
      <div className="flex items-center p-4 justify-between max-w-xl mx-auto">
        <div className="text-blue-600 flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10">
          <span className="material-symbols-outlined">graphic_eq</span>
        </div>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">
          VOX PREMIER
        </h2>
        <div className="flex w-10 items-center justify-end">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
