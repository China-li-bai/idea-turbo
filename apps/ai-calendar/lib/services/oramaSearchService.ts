'use client';

import { create, insert, search, remove, update, getByID } from '@orama/orama';
import { persist, restore } from '@orama/plugin-data-persistence';
import type { UnifiedCalendarItem, ItemType } from '@/types/unified';

type EntityType = ItemType;

interface SearchOptions {
  k?: number;
  similarity?: number;
  filters?: {
    types?: EntityType[];
    dateRange?: { start: number; end: number };
  };
}

interface HybridSearchOptions extends SearchOptions {
  useHybrid?: boolean;
}

class OramaSearchService {
  private dimensions = 512;
  private modelName = 'Xenova/bge-small-zh-v1.5';
  private db: any = null;
  private extractor: any = null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;

  async initialize(progressCallback?: (current: number, total: number, message?: string) => void): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize(progressCallback);
    return this.initPromise;
  }

  private async _initialize(progressCallback?: (current: number, total: number, message?: string) => void): Promise<void> {
    try {
      if (progressCallback) progressCallback(0, 3, '正在加载向量模型...');

      const { pipeline } = await import('@huggingface/transformers');

      if (progressCallback) progressCallback(1, 3, '正在初始化 BGE 模型...');

      this.extractor = await pipeline('feature-extraction', this.modelName);

      if (progressCallback) progressCallback(2, 3, '正在创建数据库...');

      this.db = await create({
        schema: {
          id: 'string',
          type: 'string',
          title: 'string',
          content: 'string',
          startTime: 'number',
          endTime: 'number',
          isAllDay: 'boolean',
          embedding: `vector[${this.dimensions}]`,
          status: 'string',
          createdAt: 'number',
          updatedAt: 'number',
          metadata: {
            location: 'string',
            tags: 'string[]',
            priority: 'string',
            color: 'string',
            description: 'string',
            eventType: 'string',
          }
        }
      });

      if (progressCallback) progressCallback(3, 3, '初始化完成');

      this.isReady = true;
      console.log('OramaSearchService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OramaSearchService:', error);
      throw error;
    }
  }

  private async embed(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error('模型未初始化，请先调用 initialize()');
    }

    const output = await this.extractor(text, {
      pooling: 'mean',
      normalize: true
    });

    return Array.from(output.data);
  }

  async indexItem(item: UnifiedCalendarItem): Promise<void> {
    await this.initialize();

    const text = [
      item.title,
      item.content,
      item.metadata.location || '',
      item.metadata.description || '',
    ].filter(Boolean).join(' ');

    const embedding = item.embedding.length > 0 ? item.embedding : await this.embed(text);

    await insert(this.db, {
      id: item.id,
      type: item.type,
      title: item.title,
      content: text,
      startTime: item.startTime || 0,
      endTime: item.endTime || 0,
      isAllDay: item.isAllDay,
      embedding,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      metadata: {
        location: item.metadata.location || '',
        tags: item.metadata.tags || [],
        priority: item.metadata.priority || 'medium',
        color: item.metadata.color || '',
        description: item.metadata.description || '',
        eventType: item.metadata.eventType || 'regular',
      }
    });

    console.log(`Indexed ${item.type}: ${item.id}`);
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<Array<{ id: string; type: EntityType; score: number; title: string; content: string; metadata: any }>> {
    await this.initialize();

    const queryEmbedding = await this.embed(query);
    const k = options?.k || 10;
    const similarity = options?.similarity || 0.5;

    const searchOptions: any = {
      mode: 'vector',
      vector: {
        value: queryEmbedding,
        property: 'embedding'
      },
      similarity,
      limit: k,
      includeVectors: false
    };

    if (options?.filters?.types && options.filters.types.length === 1) {
      searchOptions.where = { type: options.filters.types[0] };
    }

    const results = await search(this.db, searchOptions);

    return results.hits
      .filter((hit: any) => {
        if (options?.filters?.types && options.filters.types.length > 1) {
          if (!options.filters.types.includes(hit.document.type)) {
            return false;
          }
        }

        if (options?.filters?.dateRange && hit.document.startTime > 0) {
          if (hit.document.startTime < options.filters.dateRange.start || 
              hit.document.startTime > options.filters.dateRange.end) {
            return false;
          }
        }

        return true;
      })
      .map((hit: any) => ({
        id: hit.id,
        type: hit.document.type as EntityType,
        score: hit.score,
        title: hit.document.title,
        content: hit.document.content,
        metadata: hit.document.metadata || {},
      }));
  }

  async hybridSearch(
    query: string,
    options?: HybridSearchOptions
  ): Promise<Array<{ id: string; type: EntityType; score: number; title: string; content: string; metadata: any }>> {
    await this.initialize();

    const queryEmbedding = await this.embed(query);
    const k = options?.k || 10;
    const similarity = options?.similarity || 0.5;

    const searchOptions: any = {
      mode: 'hybrid',
      term: query,
      vector: {
        value: queryEmbedding,
        property: 'embedding'
      },
      similarity,
      limit: k,
      includeVectors: false
    };

    if (options?.filters?.types && options.filters.types.length === 1) {
      searchOptions.where = { type: options.filters.types[0] };
    }

    const results = await search(this.db, searchOptions);

    return results.hits
      .filter((hit: any) => {
        if (options?.filters?.types && options.filters.types.length > 1) {
          if (!options.filters.types.includes(hit.document.type)) {
            return false;
          }
        }

        if (options?.filters?.dateRange && hit.document.startTime > 0) {
          if (hit.document.startTime < options.filters.dateRange.start || 
              hit.document.startTime > options.filters.dateRange.end) {
            return false;
          }
        }

        return true;
      })
      .map((hit: any) => ({
        id: hit.id,
        type: hit.document.type as EntityType,
        score: hit.score,
        title: hit.document.title,
        content: hit.document.content,
        metadata: hit.document.metadata || {},
      }));
  }

  async getDocument(id: string): Promise<any> {
    await this.initialize();

    try {
      return await getByID(this.db, id);
    } catch {
      return null;
    }
  }

  async updateDocument(id: string, updates: any): Promise<void> {
    await this.initialize();

    if (updates.content || updates.title) {
      updates.embedding = await this.embed(updates.content || updates.title || '');
    }

    await update(this.db, id, updates);
  }

  async deleteFromIndex(id: string): Promise<void> {
    await this.initialize();

    await remove(this.db, id);
    console.log('Deleted from index:', id);
  }

  async save(name: string = 'ai-calendar-vectors'): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const data = await persist(this.db, 'json');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OramaSearchDB', 1);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases');
        }
      };

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction(['databases'], 'readwrite');
        const store = tx.objectStore('databases');
        store.put(data, name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async load(name: string = 'ai-calendar-vectors'): Promise<boolean> {
    const data = await new Promise<string | undefined>((resolve, reject) => {
      const request = indexedDB.open('OramaSearchDB', 1);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases');
        }
      };

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction(['databases'], 'readonly');
        const store = tx.objectStore('databases');
        const getReq = store.get(name);

        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      };

      request.onerror = () => reject(request.error);
    });

    if (data) {
      this.db = await restore('json', data);
      this.isReady = true;
      return true;
    }

    return false;
  }

  getStats(): { totalDocuments: number; byType: Record<EntityType, number> } {
    const byType: Record<EntityType, number> = {
      idea: 0,
      event: 0,
    };

    return {
      totalDocuments: this.db?.data?.docs?.count || 0,
      byType,
    };
  }

  get isInitialized(): boolean {
    return this.isReady;
  }
}

export const oramaSearchService = new OramaSearchService();
export type { EntityType, SearchOptions, HybridSearchOptions };
