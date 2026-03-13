import { useState, useEffect, useCallback } from 'react';
import { inspirationService } from '@/lib/services';
import { eventBus } from '@/lib/utils/eventBus';
import type { Inspiration } from '@/types';

interface UseInspirationsOptions {
  processed?: boolean;
  type?: 'todo' | 'event' | 'note' | 'raw';
}

export function useInspirations(options?: UseInspirationsOptions) {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadInspirations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await inspirationService.getAll(options);
      setInspirations(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(options)]);

  useEffect(() => {
    loadInspirations();

    const unsubscribe = eventBus.subscribe('inspiration', () => {
      loadInspirations();
    });

    return unsubscribe;
  }, [loadInspirations]);

  return { inspirations, isLoading, error, refresh: loadInspirations };
}
