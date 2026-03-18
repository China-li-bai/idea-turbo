'use client';

import { useEffect, useCallback } from 'react';
import { useAIModel } from '@/lib/contexts/AIModelContext';
import { SupportedLocale } from '@/lib/utils/i18n';
import { getRecommendedModel } from '@/lib/utils/aiModels';

export function useLocaleModelSync(locale: SupportedLocale) {
  const { currentModel, switchModel, isReady, isLoading } = useAIModel();

  const syncModelWithLocale = useCallback(async () => {
    const recommendedModel = getRecommendedModel(locale);
    
    if (recommendedModel !== currentModel && !isLoading) {
      try {
        await switchModel(recommendedModel);
        console.log(`Switched to ${recommendedModel} model for locale ${locale}`);
      } catch (error) {
        console.error('Failed to sync model with locale:', error);
      }
    }
  }, [locale, currentModel, switchModel, isLoading]);

  useEffect(() => {
    syncModelWithLocale();
  }, [syncModelWithLocale]);

  return {
    currentModel,
    isReady,
    isLoading,
    syncModelWithLocale,
  };
}
