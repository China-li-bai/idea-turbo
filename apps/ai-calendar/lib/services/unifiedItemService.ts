'use client';

import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';

function generateEmptyEmbedding(): number[] {
  return new Array(512).fill(0).map(() => Math.random() * 0.001 - 0.0005);
}

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
  private extractor: any = null;
  private initPromise: Promise<void> | null = null;
  private isReady: boolean = false;
  private listeners: Set<(ready: boolean) => void> = new Set();

  async initialize(
    progressCallback?: (status: string) => void
  ): Promise<void> {
    if (this.extractor) return;
    
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize(progressCallback);
    return this.initPromise;
  }

  private async _initialize(
    progressCallback?: (status: string) => void
  ): Promise<void> {
    try {
      progressCallback?.('正在加载 AI 模型...');
      
      const { pipeline } = await import('@huggingface/transformers');
      this.extractor = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5');
      
      this.isReady = true;
      this.notifyListeners(true);
      
      console.log('UnifiedItemService: AI engine initialized');
    } catch (error) {
      console.warn('UnifiedItemService: Failed to initialize embedding model:', error);
      this.isReady = false;
      this.notifyListeners(false);
    }
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

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      await this.initialize();
      
      if (this.extractor) {
        const output = await this.extractor(text, {
          pooling: 'mean',
          normalize: true
        });
        return Array.from(output.data);
      }
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
    }
    
    return generateEmptyEmbedding();
  }

  async createIdea(
    content: string,
    metadata?: Partial<UnifiedCalendarItem['metadata']>,
    onEmbeddingUpdate?: (update: EmbeddingUpdate) => void
  ): Promise<UnifiedCalendarItem> {
    const now = Date.now();
    const id = generateUUID();
    
    const item: UnifiedCalendarItem = {
      id,
      type: 'idea',
      title: content.substring(0, 100),
      content,
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {}
    };
    
    this.generateEmbedding(content).then(embedding => {
      if (onEmbeddingUpdate) {
        onEmbeddingUpdate({
          id,
          embedding,
          embeddingUpdatedAt: Date.now()
        });
      }
    }).catch(console.error);
    
    return item;
  }

  async createEvent(
    title: string,
    startTime: number,
    endTime: number,
    metadata?: Partial<UnifiedCalendarItem['metadata']>,
    onEmbeddingUpdate?: (update: EmbeddingUpdate) => void
  ): Promise<UnifiedCalendarItem> {
    const content = metadata?.description || title;
    const now = Date.now();
    const id = generateUUID();
    
    const item: UnifiedCalendarItem = {
      id,
      type: 'event',
      title,
      content,
      startTime,
      endTime,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: now,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {}
    };
    
    this.generateEmbedding(content).then(embedding => {
      if (onEmbeddingUpdate) {
        onEmbeddingUpdate({
          id,
          embedding,
          embeddingUpdatedAt: Date.now()
        });
      }
    }).catch(console.error);
    
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
    updates: Partial<UnifiedCalendarItem>,
    onEmbeddingUpdate?: (update: EmbeddingUpdate) => void
  ): Promise<UnifiedCalendarItem> {
    const updatedItem: UnifiedCalendarItem = {
      ...item,
      ...updates,
      updatedAt: Date.now()
    };
    
    if (updates.title || updates.content) {
      const newContent = updates.content || item.content;
      this.generateEmbedding(newContent).then(embedding => {
        updatedItem.embedding = embedding;
        updatedItem.embeddingUpdatedAt = Date.now();
        
        if (onEmbeddingUpdate) {
          onEmbeddingUpdate({
            id: updatedItem.id,
            embedding,
            embeddingUpdatedAt: updatedItem.embeddingUpdatedAt
          });
        }
      }).catch(console.error);
    }
    
    return updatedItem;
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
