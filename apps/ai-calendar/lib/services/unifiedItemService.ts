'use client';

import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';
import { oramaSearchService } from './oramaSearchService';

class UnifiedItemService {
  private extractor: any = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.extractor) return;
    
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      const { pipeline } = await import('@huggingface/transformers');
      this.extractor = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5');
      console.log('UnifiedItemService initialized');
    } catch (error) {
      console.error('Failed to initialize UnifiedItemService:', error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    
    const output = await this.extractor(text);
    return Array.from(output.data);
  }

  async createIdea(
    content: string,
    metadata?: Partial<UnifiedCalendarItem['metadata']>
  ): Promise<UnifiedCalendarItem> {
    const embedding = await this.generateEmbedding(content);
    
    const item: UnifiedCalendarItem = {
      id: crypto.randomUUID(),
      type: 'idea',
      title: content.substring(0, 100),
      content,
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding,
      embeddingUpdatedAt: Date.now(),
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: metadata || {}
    };
    
    return item;
  }

  async createEvent(
    title: string,
    startTime: number,
    endTime: number,
    metadata?: Partial<UnifiedCalendarItem['metadata']>
  ): Promise<UnifiedCalendarItem> {
    const content = metadata?.description || title;
    const embedding = await this.generateEmbedding(content);
    
    const item: UnifiedCalendarItem = {
      id: crypto.randomUUID(),
      type: 'event',
      title,
      content,
      startTime,
      endTime,
      isAllDay: false,
      embedding,
      embeddingUpdatedAt: Date.now(),
      status: 'scheduled',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: metadata || {}
    };
    
    return item;
  }

  async convertToEvent(
    item: UnifiedCalendarItem,
    startTime: number,
    endTime: number,
    additionalMetadata?: Partial<UnifiedCalendarItem['metadata']>
  ): Promise<UnifiedCalendarItem> {
    if (item.type !== 'idea') {
      throw new Error('Only ideas can be converted to events');
    }
    
    const event: UnifiedCalendarItem = {
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
    
    return event;
  }

  async convertToIdea(
    item: UnifiedCalendarItem,
    additionalMetadata?: Partial<UnifiedCalendarItem['metadata']>
  ): Promise<UnifiedCalendarItem> {
    if (item.type !== 'event') {
      throw new Error('Only events can be converted to ideas');
    }
    
    const idea: UnifiedCalendarItem = {
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
    
    return idea;
  }

  async updateItem(
    item: UnifiedCalendarItem,
    updates: Partial<UnifiedCalendarItem>
  ): Promise<UnifiedCalendarItem> {
    const updatedItem: UnifiedCalendarItem = {
      ...item,
      ...updates,
      updatedAt: Date.now()
    };
    
    if (updates.title || updates.content) {
      const newContent = updates.content || item.content;
      updatedItem.embedding = await this.generateEmbedding(newContent);
      updatedItem.embeddingUpdatedAt = Date.now();
    }
    
    return updatedItem;
  }

  async searchItems(
    query: string,
    options?: {
      types?: ItemType[];
      status?: ItemStatus[];
      limit?: number;
      useHybrid?: boolean;
    }
  ): Promise<UnifiedCalendarItem[]> {
    await oramaSearchService.initialize();
    
    const searchResults = options?.useHybrid
      ? await oramaSearchService.hybridSearch(query, {
          k: options?.limit || 10,
          filters: options?.types ? { types: options.types } : undefined
        })
      : await oramaSearchService.search(query, {
          k: options?.limit || 10,
          filters: options?.types ? { types: options.types } : undefined
        });
    
    return searchResults.map(result => ({
      id: result.id,
      type: result.type as ItemType,
      title: result.title,
      content: result.content,
      startTime: result.metadata.date ? new Date(result.metadata.date).getTime() : null,
      endTime: null,
      isAllDay: false,
      embedding: [],
      embeddingUpdatedAt: Date.now(),
      status: (result.metadata.status as ItemStatus) || 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: result.metadata
    }));
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
