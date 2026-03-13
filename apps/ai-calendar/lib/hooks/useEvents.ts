import { useState, useEffect, useCallback } from 'react';
import { eventService } from '@/lib/services';
import { eventBus } from '@/lib/utils/eventBus';
import type { CalendarEvent } from '@/types';

interface UseEventsOptions {
  dateRange?: { start: Date; end: Date };
  viewMode?: string;
}

export function useEvents(options?: UseEventsOptions) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await eventService.getAll(options);
      setEvents(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(options)]);

  useEffect(() => {
    loadEvents();

    const unsubscribe = eventBus.subscribe('event', () => {
      loadEvents();
    });

    return unsubscribe;
  }, [loadEvents]);

  return { events, isLoading, error, refresh: loadEvents };
}
