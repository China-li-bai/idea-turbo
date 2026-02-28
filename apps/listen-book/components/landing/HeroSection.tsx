'use client';

import { useI18n } from '../../lib/i18n/context';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const { t } = useI18n();
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/');
  };

  return (
    <section className="relative px-4 pt-8 pb-12 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center gap-6 py-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl @[480px]:text-6xl font-black leading-[1.1] tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t.landing.heroTitle}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base @[480px]:text-lg max-w-xs mx-auto font-medium">
            {t.landing.heroSubtitle}
          </p>
        </div>
        <button
          onClick={handleGetStarted}
          className="glow-button flex min-w-[160px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 bg-blue-600 text-white text-base font-bold leading-normal tracking-wide transition-transform active:scale-95 hover:bg-blue-700"
        >
          {t.landing.getStarted}
        </button>
      </div>
    </section>
  );
}
