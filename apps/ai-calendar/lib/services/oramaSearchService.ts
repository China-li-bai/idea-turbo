'use client';

import { create, insert, search, remove, update, getByID } from '@orama/orama';
import { persist, restore } from '@orama/plugin-data-persistence';
import type { SearchResult, CalendarEvent, Task, Inspiration } from '@/types';

type EntityType = 'event' | 'task' | 'inspiration';

interface SearchOptions {
  k?: number;
  similarity?: number;
  filters?: {
    types?: EntityType[];
    dateRange?: { start: Date; end: Date };
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

      this.extractor = await pipeline('feature-extraction', this.modelName, {
        progress_callback: (progress: { status?: string; progress?: number }) => {
          if (progressCallback && progress.status === 'progress') {
            const percent = Math.round(progress.progress || 0);
            console.log(`模型加载进度: ${percent}%`);
          }
        }
      });

      if (progressCallback) progressCallback(2, 3, '正在创建数据库...');

      this.db = await create({
        schema: {
          id: 'string',
          type: 'string',
          title: 'string',
          content: 'string',
          timestamp: 'number',
          embedding: `vector[${this.dimensions}]`,
          tags: 'string[]',
          category: 'string',
          metadata: {
            date: 'string',
            priority: 'string',
            completed: 'boolean',
            location: 'string',
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

  async indexEvent(event: CalendarEvent): Promise<void> {
    await this.initialize();

    const text = [
      event.title,
      event.description || '',
      event.location || '',
    ].filter(Boolean).join(' ');

    const embedding = await this.embed(text);

    await insert(this.db, {
      id: event.id,
      type: 'event',
      title: event.title,
      content: text,
      timestamp: event.startTime?.getTime() || Date.now(),
      embedding,
      tags: [],
      category: event.eventType || 'regular',
      metadata: {
        date: event.startTime?.toISOString(),
        location: event.location,
        eventType: event.eventType,
      }
    });

    console.log(`Indexed event: ${event.id}`);
  }

  async indexTask(task: Task): Promise<void> {
    await this.initialize();

    const text = [
      task.title,
      task.description || '',
    ].filter(Boolean).join(' ');

    const embedding = await this.embed(text);

    await insert(this.db, {
      id: task.id,
      type: 'task',
      title: task.title,
      content: text,
      timestamp: task.createdAt?.getTime() || Date.now(),
      embedding,
      tags: [],
      category: task.priority || 'medium',
      metadata: {
        priority: task.priority,
        completed: task.completed,
      }
    });

    console.log(`Indexed task: ${task.id}`);
  }

  async indexInspiration(inspiration: Inspiration): Promise<void> {
    await this.initialize();

    const text = inspiration.content;
    const embedding = await this.embed(text);

    await insert(this.db, {
      id: inspiration.id,
      type: 'inspiration',
      title: inspiration.content.substring(0, 50),
      content: text,
      timestamp: inspiration.captureTime?.getTime() || Date.now(),
      embedding,
      tags: [],
      category: inspiration.type || 'thought',
      metadata: {
        date: inspiration.captureTime?.toISOString(),
      }
    });

    console.log(`Indexed inspiration: ${inspiration.id}`);
  }

  async indexDocument(
    type: EntityType,
    id: string,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    await this.initialize();

    const embedding = await this.embed(text);

    await insert(this.db, {
      id,
      type,
      title: (metadata?.title as string) || text.substring(0, 50),
      content: text,
      timestamp: (metadata?.timestamp as number) || Date.now(),
      embedding,
      tags: (metadata?.tags as string[]) || [],
      category: (metadata?.category as string) || 'default',
      metadata: metadata || {}
    });

    console.log(`Indexed ${type} document: ${id}`);
    return id;
  }

  async indexDocuments(
    documents: Array<{ type: EntityType; id: string; text: string; metadata?: Record<string, unknown> }>,
    progressCallback?: (current: number, total: number) => void
  ): Promise<string[]> {
    await this.initialize();
    const results: string[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const id = await this.indexDocument(doc.type, doc.id, doc.text, doc.metadata);
      results.push(id);

      if (progressCallback) {
        progressCallback(i + 1, documents.length);
      }
    }

    return results;
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
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

        if (options?.filters?.dateRange && hit.document.metadata?.date) {
          const docDate = new Date(hit.document.metadata.date);
          if (docDate < options.filters.dateRange.start || docDate > options.filters.dateRange.end) {
            return false;
          }
        }

        return true;
      })
      .map((hit: any) => ({
        id: hit.id,
        originalId: hit.id,
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
  ): Promise<SearchResult[]> {
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

        if (options?.filters?.dateRange && hit.document.metadata?.date) {
          const docDate = new Date(hit.document.metadata.date);
          if (docDate < options.filters.dateRange.start || docDate > options.filters.dateRange.end) {
            return false;
          }
        }

        return true;
      })
      .map((hit: any) => ({
        id: hit.id,
        originalId: hit.id,
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
      event: 0,
      task: 0,
      inspiration: 0,
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
