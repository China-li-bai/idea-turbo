'use client';

import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface EmbeddingUpdate {
  id: string;
  embedding: number[];
  embeddingUpdatedAt: number;
}

class UnifiedItemService {
  private isReady: boolean = true;
  private listeners: Set<(ready: boolean) => void> = new Set();

  async initialize(progressCallback?: (status: string) => void): Promise<void> {
    progressCallback?.('服务已就绪');
    this.isReady = true;
    this.notifyListeners(true);
    console.log('UnifiedItemService: Service initialized');
  }

  private notifyListeners(ready: boolean): void {
    this.listeners.forEach(listener => listener(ready));
  }

  onReadyChange(listener: (ready: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isReady);
    return () => this.listeners.delete(listener);
  }

  getIsReady(): boolean {
    return this.isReady;
  }

  createIdea(
    content: string,
    metadata?: Partial<UnifiedCalendarItem['metadata']>
  ): UnifiedCalendarItem {
    const now = Date.now();
    const id = generateUUID();

    return {
      id,
      type: 'idea',
      title: content.substring(0, 100),
      content,
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: [],
      embeddingUpdatedAt: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {}
    };
  }

  createEvent(
    title: string,
    startTime: number,
    endTime: number,
    metadata?: Partial<UnifiedCalendarItem['metadata']>
  ): UnifiedCalendarItem {
    const content = metadata?.description || title;
    const now = Date.now();
    const id = generateUUID();

    return {
      id,
      type: 'event',
      title,
      content,
      startTime,
      endTime,
      isAllDay: false,
      embedding: [],
      embeddingUpdatedAt: 0,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {}
    };
  }

  transformToEvent(
    item: UnifiedCalendarItem,
    startTime: number,
    endTime: number,
    additionalMetadata?: Partial<UnifiedCalendarItem['metadata']>
  ): UnifiedCalendarItem {
    if (item.type !== 'idea') {
      throw new Error('Only ideas can be converted to events');
    }

    return {
      ...item,
      type: 'event',
      startTime,
      endTime,
      status: 'scheduled',
      updatedAt: Date.now(),
      metadata: {
        ...item.metadata,
        ...additionalMetadata,
        previousType: 'idea',
        convertedAt: Date.now()
      }
    };
  }

  transformToIdea(
    item: UnifiedCalendarItem,
    additionalMetadata?: Partial<UnifiedCalendarItem['metadata']>
  ): UnifiedCalendarItem {
    if (item.type !== 'event') {
      throw new Error('Only events can be converted to ideas');
    }

    return {
      ...item,
      type: 'idea',
      startTime: null,
      endTime: null,
      status: 'pending',
      updatedAt: Date.now(),
      metadata: {
        ...item.metadata,
        ...additionalMetadata,
        previousType: 'event',
        convertedAt: Date.now()
      }
    };
  }

  updateItem(
    item: UnifiedCalendarItem,
    updates: Partial<UnifiedCalendarItem>
  ): UnifiedCalendarItem {
    return {
      ...item,
      ...updates,
      updatedAt: Date.now()
    };
  }

  updateEmbedding(
    item: UnifiedCalendarItem,
    embedding: number[]
  ): { item: UnifiedCalendarItem; embeddingUpdate: EmbeddingUpdate } {
    const embeddingUpdate: EmbeddingUpdate = {
      id: item.id,
      embedding,
      embeddingUpdatedAt: Date.now()
    };

    return {
      item: {
        ...item,
        embedding,
        embeddingUpdatedAt: embeddingUpdate.embeddingUpdatedAt
      },
      embeddingUpdate
    };
  }

  isIdea(item: UnifiedCalendarItem): boolean {
    return item.type === 'idea';
  }

  isEvent(item: UnifiedCalendarItem): boolean {
    return item.type === 'event';
  }

  isPending(item: UnifiedCalendarItem): boolean {
    return item.status === 'pending';
  }

  isScheduled(item: UnifiedCalendarItem): boolean {
    return item.status === 'scheduled';
  }

  isCompleted(item: UnifiedCalendarItem): boolean {
    return item.status === 'completed';
  }

  isCancelled(item: UnifiedCalendarItem): boolean {
    return item.status === 'cancelled';
  }
}

export const unifiedItemService = new UnifiedItemService();
export type { ItemType, ItemStatus };
