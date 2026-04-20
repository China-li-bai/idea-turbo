import { useState, useCallback, useEffect } from 'react';
import { aiConfigManager } from '@/lib/ai/config';
import { aiService } from '@/lib/ai';
import type { LocalLLMStatus } from '@/lib/ai/providers/localLLM';

export interface LocalModelState {
  localStatus: LocalLLMStatus | null;
  isAIConfigured: boolean | null;
  usingLocalModel: boolean;
}

export function useLocalModel() {
  const [localStatus, setLocalStatus] = useState<LocalLLMStatus | null>(null);
  const [isAIConfigured, setIsAIConfigured] = useState<boolean | null>(null);
  const [usingLocalModel, setUsingLocalModel] = useState(false);

  const checkAIConfig = useCallback(async () => {
    const config = await aiConfigManager.getConfig();
    const isLocal = config.defaultProvider === 'local';
    setUsingLocalModel(isLocal);

    if (isLocal) {
      setIsAIConfigured(true);
      return;
    }

    const providerConfig = config.providers[config.defaultProvider];
    const apiKey = providerConfig?.apiKey || '';
    setIsAIConfigured(apiKey.trim().length > 0);
  }, []);

  const watchLocalStatus = useCallback(async () => {
    await aiService.getProvider('local').catch(() => null);

    const localProvider = aiService.getLocalProvider();
    if (localProvider) {
      setLocalStatus(localProvider.status);
      localProvider.setStatusCallback((status: LocalLLMStatus) => {
        setLocalStatus({ ...status });
      });
    }
  }, []);

  const loadModel = useCallback(async () => {
    const localProvider = aiService.getLocalProvider();
    if (localProvider && !localProvider.status.isReady && !localProvider.status.isLoading) {
      try {
        await localProvider.initialize();
      } catch (error) {
        console.error('[useLocalModel] Model load failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    checkAIConfig();
    watchLocalStatus();
  }, [checkAIConfig, watchLocalStatus]);

  return {
    localStatus,
    isAIConfigured,
    usingLocalModel,
    loadModel,
    refreshConfig: checkAIConfig,
  };
}
