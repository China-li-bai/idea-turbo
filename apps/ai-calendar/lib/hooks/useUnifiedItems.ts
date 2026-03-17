import { useCallback, useMemo } from 'react';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import { unifiedItemService } from '@/lib/services/unifiedItemService';
import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';

export function useUnifiedItems(options?: {
  type?: ItemType;
  status?: ItemStatus;
}) {
  const allItems = useUnifiedStore((state) => state.items);
  const addItem = useUnifiedStore((state) => state.addItem);
  const updateItem = useUnifiedStore((state) => state.updateItem);
  const updateEmbedding = useUnifiedStore((state) => state.updateEmbedding);
  const deleteItem = useUnifiedStore((state) => state.deleteItem);
  const convertToEvent = useUnifiedStore((state) => state.convertToEvent);
  const convertToIdea = useUnifiedStore((state) => state.convertToIdea);

  const items = useMemo(() => {
    let filtered = allItems;
    if (options?.type) {
      filtered = filtered.filter((item) => item.type === options.type);
    }
    if (options?.status) {
      filtered = filtered.filter((item) => item.status === options.status);
    }
    return filtered;
  }, [allItems, options?.type, options?.status]);

  const createIdea = useCallback(async (content: string, metadata?: Partial<UnifiedCalendarItem['metadata']>) => {
    const idea = await unifiedItemService.createIdea(content, metadata, (update) => {
      updateEmbedding(update);
    });
    await addItem(idea);
    return idea;
  }, [addItem, updateEmbedding]);

  const createEvent = useCallback(async (
    title: string,
    startTime: number,
    endTime: number,
    metadata?: Partial<UnifiedCalendarItem['metadata']>
  ) => {
    const event = await unifiedItemService.createEvent(title, startTime, endTime, metadata, (update) => {
      updateEmbedding(update);
    });
    await addItem(event);
    return event;
  }, [addItem, updateEmbedding]);

  const update = useCallback(async (id: string, updates: Partial<UnifiedCalendarItem>) => {
    await updateItem(id, updates);
  }, [updateItem]);

  const remove = useCallback(async (id: string) => {
    await deleteItem(id);
  }, [deleteItem]);

  const toEvent = useCallback(async (
    id: string,
    startTime: number,
    endTime: number,
    metadata?: Partial<UnifiedCalendarItem['metadata']>
  ) => {
    await convertToEvent(id, startTime, endTime, metadata);
  }, [convertToEvent]);

  const toIdea = useCallback(async (id: string, metadata?: Partial<UnifiedCalendarItem['metadata']>) => {
    await convertToIdea(id, metadata);
  }, [convertToIdea]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.type === 'event' && b.type === 'event') {
        return (a.startTime || 0) - (b.startTime || 0);
      }
      if (a.type === 'idea' && b.type === 'idea') {
        return b.createdAt - a.createdAt;
      }
      return a.type === 'idea' ? 1 : -1;
    });
  }, [items]);

  return {
    items: sortedItems,
    createIdea,
    createEvent,
    update,
    remove,
    toEvent,
    toIdea
  };
}

export function useAIStatus() {
  return useUnifiedStore((state) => state.aiStatus);
}

export function useIdeas() {
  return useUnifiedItems({ type: 'idea' });
}

export function useEvents() {
  return useUnifiedItems({ type: 'event' });
}

export function usePendingIdeas() {
  return useUnifiedItems({ type: 'idea', status: 'pending' });
}

export function useScheduledEvents() {
  return useUnifiedItems({ type: 'event', status: 'scheduled' });
}

export function useTodayEvents() {
  const { items: events, ...rest } = useScheduledEvents();
  
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;
  
  const todayEvents = events.filter((event) => {
    const startTime = event.startTime || 0;
    return startTime >= todayStart && startTime < todayEnd;
  });
  
  return {
    items: todayEvents,
    ...rest
  };
}
