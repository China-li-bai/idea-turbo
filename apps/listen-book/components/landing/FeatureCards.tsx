'use client';

import { useI18n } from '../../lib/i18n/context';

export function FeatureCards() {
  const { t } = useI18n();

  const features = [
    {
      icon: 'graphic_eq',
      title: t.landing.featureStudioVoices,
      description: t.landing.featureStudioVoicesDesc
    },
    {
      icon: 'offline_pin',
      title: t.landing.featureOfflineMode,
      description: t.landing.featureOfflineModeDesc
    },
    {
      icon: 'psychology',
      title: t.landing.featureNeuralAI,
      description: t.landing.featureNeuralAIDesc
    }
  ];

  return (
    <>
      <div className="px-4">
        <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight flex items-center gap-2">
          <span className="w-1 h-6 bg-blue-600 rounded-full" />
          {t.landing.featuresTitle}
        </h2>
      </div>
      <section className="grid grid-cols-1 @[480px]:grid-cols-3 gap-4 p-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 p-5 transition-colors hover:border-blue-600/50 group"
          >
            <div className="text-blue-600 size-10 flex items-center justify-center rounded-lg bg-blue-600/10 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <span className="material-symbols-outlined">{feature.icon}</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-slate-900 dark:text-white text-base font-bold leading-tight">
                {feature.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
