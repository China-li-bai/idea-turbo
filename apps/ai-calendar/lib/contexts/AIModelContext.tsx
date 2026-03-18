'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  AIModelType, 
  AIModelConfig, 
  AI_MODELS, 
  DEFAULT_AI_MODEL,
  getRecommendedModel,
  isModelCompatibleWithLocale 
} from '@/lib/utils/aiModels';
import { SupportedLocale } from '@/lib/utils/i18n';
import { oramaSearchService } from '@/lib/services/oramaSearchService';

interface AIModelContextType {
  currentModel: AIModelType;
  modelConfig: AIModelConfig;
  availableModels: AIModelConfig[];
  isLoading: boolean;
  isReady: boolean;
  switchModel: (modelType: AIModelType) => Promise<void>;
  switchModelWithReindex: (modelType: AIModelType, items: any[]) => Promise<void>;
  getRecommendedModelForLocale: (locale: SupportedLocale) => AIModelType;
  isModelCompatible: (modelType: AIModelType, locale: SupportedLocale) => boolean;
}

const AIModelContext = createContext<AIModelContextType | undefined>(undefined);

const STORAGE_KEY = 'ai-calendar-model';

export function AIModelProvider({ 
  children,
  initialLocale 
}: { 
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const [currentModel, setCurrentModel] = useState<AIModelType>(DEFAULT_AI_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const savedModel = localStorage.getItem(STORAGE_KEY) as AIModelType | null;
    if (savedModel && Object.keys(AI_MODELS).includes(savedModel)) {
      setCurrentModel(savedModel);
    } else if (initialLocale) {
      setCurrentModel(getRecommendedModel(initialLocale));
    }
  }, [initialLocale]);

  useEffect(() => {
    if (!mounted) return;

    const initModel = async () => {
      setIsLoading(true);
      try {
        await oramaSearchService.switchModel(currentModel, (current, total, message) => {
          console.log(`Model loading: ${current}/${total} - ${message}`);
        });
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize AI model:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initModel();
  }, [currentModel, mounted]);

  const switchModel = useCallback(async (modelType: AIModelType) => {
    if (modelType === currentModel && isReady) {
      return;
    }

    setIsLoading(true);
    setIsReady(false);
    
    try {
      await oramaSearchService.switchModel(modelType);
      setCurrentModel(modelType);
      localStorage.setItem(STORAGE_KEY, modelType);
      setIsReady(true);
    } catch (error) {
      console.error('Failed to switch AI model:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentModel, isReady]);

  const switchModelWithReindex = useCallback(async (modelType: AIModelType, items: any[]) => {
    if (modelType === currentModel && isReady) {
      return;
    }

    setIsLoading(true);
    setIsReady(false);
    
    try {
      await oramaSearchService.switchModelWithReindex(modelType, items, (current, total, message) => {
        console.log(`Model reindex: ${current}/${total} - ${message}`);
      });
      setCurrentModel(modelType);
      localStorage.setItem(STORAGE_KEY, modelType);
      setIsReady(true);
    } catch (error) {
      console.error('Failed to switch AI model with reindex:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentModel, isReady]);

  const getRecommendedModelForLocale = useCallback((locale: SupportedLocale): AIModelType => {
    return getRecommendedModel(locale);
  }, []);

  const isModelCompatible = useCallback((modelType: AIModelType, locale: SupportedLocale): boolean => {
    return isModelCompatibleWithLocale(modelType, locale);
  }, []);

  const value: AIModelContextType = {
    currentModel,
    modelConfig: AI_MODELS[currentModel],
    availableModels: Object.values(AI_MODELS),
    isLoading,
    isReady,
    switchModel,
    switchModelWithReindex,
    getRecommendedModelForLocale,
    isModelCompatible,
  };

  return (
    <AIModelContext.Provider value={value}>
      {children}
    </AIModelContext.Provider>
  );
}

export function useAIModel() {
  const context = useContext(AIModelContext);
  if (!context) {
    throw new Error('useAIModel must be used within an AIModelProvider');
  }
  return context;
}

export type { AIModelType, AIModelConfig };
