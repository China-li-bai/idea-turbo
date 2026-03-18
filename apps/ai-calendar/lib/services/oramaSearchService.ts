"use client";

import { create, insert, search, remove, update, getByID } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import type { UnifiedCalendarItem, ItemType } from "@/types/unified";
import { 
  AIModelType, 
  AIModelConfig, 
  AI_MODELS, 
  DEFAULT_AI_MODEL,
  getModelConfig,
  formatTextForEmbedding,
  EmbeddingTask
} from "@/lib/utils/aiModels";

const env = await import("@huggingface/transformers").then(m => m.env);
const { pipeline } = await import("@huggingface/transformers");

if (typeof window !== 'undefined') {
  env.allowLocalModels = false;
  
  const isSecureContext = window.isSecureContext;
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  if (isSecureContext || isLocalhost) {
    env.useBrowserCache = true;
    console.log('[Transformers.js] Browser cache enabled (secure context)');
  } else {
    env.useBrowserCache = false;
    console.log('[Transformers.js] Browser cache disabled (non-secure context: IP access)');
  }
  
  const useMirror = localStorage.getItem('use-hf-mirror') !== 'false';
  if (useMirror) {
    env.remoteHost = 'https://hf-mirror.com';
    console.log('[Transformers.js] Using HF mirror: hf-mirror.com');
  }
}

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

const MODEL_CACHE_NAME = 'transformers-models-v1';

export async function getModelCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') {
    return null;
  }
  return caches.open(MODEL_CACHE_NAME);
}

export async function isModelCached(modelName: string): Promise<boolean> {
  const cache = await getModelCache();
  if (!cache) return false;
  
  const keys = await cache.keys();
  return keys.some(key => key.url.includes(modelName));
}

export async function getCacheStats(): Promise<{
  entryCount: number;
  totalSize: number;
  models: Set<string>;
}> {
  const cache = await getModelCache();
  if (!cache) {
    return { entryCount: 0, totalSize: 0, models: new Set() };
  }
  
  const keys = await cache.keys();
  const models = new Set<string>();
  let totalSize = 0;
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.clone().blob();
      totalSize += blob.size;
      
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const modelPart = pathParts.find(p => p.startsWith('Xenova') || p.includes('bge') || p.includes('e5'));
      if (modelPart) {
        models.add(modelPart);
      }
    }
  }
  
  return {
    entryCount: keys.length,
    totalSize,
    models
  };
}

export async function clearModelCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(MODEL_CACHE_NAME);
  console.log('Model cache cleared');
}

export async function getCacheSizeFormatted(): Promise<string> {
  const stats = await getCacheStats();
  const mb = stats.totalSize / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = stats.totalSize / 1024;
  return `${kb.toFixed(2)} KB`;
}

export class OramaSearchService {
  private currentModelType: AIModelType = DEFAULT_AI_MODEL;
  private modelConfig: AIModelConfig = AI_MODELS[DEFAULT_AI_MODEL];
  private db: any = null;
  private extractor: any = null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;

  get dimensions(): number {
    return this.modelConfig.dimensions;
  }

  get modelName(): string {
    return this.modelConfig.name;
  }

  get modelId(): AIModelType {
    return this.currentModelType;
  }

  get currentModel(): AIModelConfig {
    return this.modelConfig;
  }

  async switchModel(
    modelType: AIModelType,
    progressCallback?: (
      current: number,
      total: number,
      message?: string,
    ) => void,
  ): Promise<void> {
    if (this.currentModelType === modelType && this.isReady) {
      return;
    }

    this.currentModelType = modelType;
    this.modelConfig = getModelConfig(modelType);
    this.isReady = false;
    this.initPromise = null;
    this.db = null;
    this.extractor = null;

    await this.initialize(progressCallback);
  }

  async switchModelWithReindex(
    modelType: AIModelType,
    items: UnifiedCalendarItem[],
    progressCallback?: (
      current: number,
      total: number,
      message?: string,
    ) => void,
  ): Promise<void> {
    if (this.currentModelType === modelType && this.isReady) {
      return;
    }

    console.log(`[OramaSearchService] Switching model to ${modelType} and reindexing ${items.length} items`);

    this.currentModelType = modelType;
    this.modelConfig = getModelConfig(modelType);
    this.isReady = false;
    this.initPromise = null;
    this.db = null;
    this.extractor = null;

    await this.initialize(progressCallback);

    if (progressCallback) progressCallback(0, items.length + 3, '正在重建索引...');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const text = [
          item.title,
          item.content,
          item.metadata.location || '',
          item.metadata.description || '',
        ].filter(Boolean).join(' ');

        const newEmbedding = await this.embed(text);

        await insert(this.db, {
          id: item.id,
          type: item.type,
          title: item.title,
          content: text,
          startTime: item.startTime || 0,
          endTime: item.endTime || 0,
          isAllDay: item.isAllDay,
          embedding: newEmbedding,
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
          },
        });

        if (progressCallback && i % 5 === 0) {
          progressCallback(i + 1, items.length + 3, `正在重建索引 ${i + 1}/${items.length}...`);
        }
      } catch (error) {
        console.error(`Failed to reindex item ${item.id}:`, error);
      }
    }

    if (progressCallback) progressCallback(items.length + 3, items.length + 3, '索引重建完成');
    console.log(`[OramaSearchService] Reindexing completed for model ${modelType}`);
  }

  async initialize(
    progressCallback?: (
      current: number,
      total: number,
      message?: string,
    ) => void,
  ): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize(progressCallback);
    return this.initPromise;
  }

  private async _initialize(
    progressCallback?: (
      current: number,
      total: number,
      message?: string,
    ) => void,
  ): Promise<void> {
    try {
      if (progressCallback) progressCallback(0, 3, `正在加载 ${this.modelConfig.name}...`);

      const cachedModel = await isModelCached(this.modelConfig.modelName);
      console.log(`[Transformers.js] Model ${this.modelConfig.modelName} cached:`, cachedModel);

      if (progressCallback) progressCallback(1, 3, `正在初始化模型 ${this.modelConfig.modelName}...`);

      this.extractor = await pipeline("feature-extraction", this.modelConfig.modelName);

      if (progressCallback) progressCallback(2, 3, "正在创建数据库...");

      this.db = await create({
        schema: {
          id: "string",
          type: "string",
          title: "string",
          content: "string",
          startTime: "number",
          endTime: "number",
          isAllDay: "boolean",
          embedding: `vector[${this.modelConfig.dimensions}]`,
          status: "string",
          createdAt: "number",
          updatedAt: "number",
          metadata: {
            location: "string",
            tags: "string[]",
            priority: "string",
            color: "string",
            description: "string",
            eventType: "string",
          },
        },
      });

      if (progressCallback) progressCallback(3, 3, "初始化完成");

      this.isReady = true;
      console.log(`OramaSearchService initialized with model: ${this.modelConfig.modelName} (${this.modelConfig.dimensions}D)`);
    } catch (error) {
      console.error("Failed to initialize OramaSearchService:", error);
      throw error;
    }
  }

  private async embed(text: string, task: EmbeddingTask = 'passage'): Promise<number[]> {
    if (!this.extractor) {
      throw new Error("模型未初始化，请先调用 initialize()");
    }

    const formattedText = formatTextForEmbedding(text, task, this.modelConfig);

    const output = await this.extractor(formattedText, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data);
  }

  async indexItem(item: UnifiedCalendarItem): Promise<void> {
    await this.initialize();

    const text = [
      item.title,
      item.content,
      item.metadata.location || "",
      item.metadata.description || "",
    ]
      .filter(Boolean)
      .join(" ");

    const embedding =
      item.embedding.length > 0 ? item.embedding : await this.embed(text);

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
        location: item.metadata.location || "",
        tags: item.metadata.tags || [],
        priority: item.metadata.priority || "medium",
        color: item.metadata.color || "",
        description: item.metadata.description || "",
        eventType: item.metadata.eventType || "regular",
      },
    });
  }

  async search(
    query: string,
    options?: SearchOptions,
  ): Promise<
    Array<{
      id: string;
      type: EntityType;
      score: number;
      title: string;
      content: string;
      startTime: number | null;
      endTime: number | null;
      isAllDay: boolean;
      status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
      createdAt: number;
      updatedAt: number;
      metadata: any;
    }>
  > {
    await this.initialize();

    const queryEmbedding = await this.embed(query, 'query');
    const k = options?.k || 10;
    const similarity = options?.similarity || 0.5;

    const searchOptions: any = {
      mode: "vector",
      vector: {
        value: queryEmbedding,
        property: "embedding",
      },
      similarity,
      limit: k,
      includeVectors: false,
    };

    if (options?.filters?.types && options.filters.types.length === 1) {
      searchOptions.where = { type: options.filters.types[0] };
    }

    const results = await search(this.db, searchOptions);
    
    console.log('Orama raw results:', results);
    console.log('Hits count:', results.hits?.length);

    return results.hits
      .filter((hit: any) => {
        if (options?.filters?.types && options.filters.types.length > 1) {
          if (!options.filters.types.includes(hit.document.type)) {
            return false;
          }
        }

        if (options?.filters?.dateRange && hit.document.startTime > 0) {
          if (
            hit.document.startTime < options.filters.dateRange.start ||
            hit.document.startTime > options.filters.dateRange.end
          ) {
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
        startTime: hit.document.startTime || null,
        endTime: hit.document.endTime || null,
        isAllDay: hit.document.isAllDay || false,
        status: hit.document.status || 'pending',
        createdAt: hit.document.createdAt || Date.now(),
        updatedAt: hit.document.updatedAt || Date.now(),
        metadata: hit.document.metadata || {},
      }));
  }

  async hybridSearch(
    query: string,
    options?: HybridSearchOptions,
  ): Promise<
    Array<{
      id: string;
      type: EntityType;
      score: number;
      title: string;
      content: string;
      startTime: number | null;
      endTime: number | null;
      isAllDay: boolean;
      status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
      createdAt: number;
      updatedAt: number;
      metadata: any;
    }>
  > {
    await this.initialize();

    const queryEmbedding = await this.embed(query, 'query');
    const k = options?.k || 10;
    const similarity = options?.similarity || 0.5;

    const searchOptions: any = {
      mode: "hybrid",
      term: query,
      vector: {
        value: queryEmbedding,
        property: "embedding",
      },
      similarity,
      limit: k,
      includeVectors: false,
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
          if (
            hit.document.startTime < options.filters.dateRange.start ||
            hit.document.startTime > options.filters.dateRange.end
          ) {
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
        startTime: hit.document.startTime || null,
        endTime: hit.document.endTime || null,
        isAllDay: hit.document.isAllDay || false,
        status: hit.document.status || 'pending',
        createdAt: hit.document.createdAt || Date.now(),
        updatedAt: hit.document.updatedAt || Date.now(),
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

    if (updates.embedding) {
      try {
        const existingDoc = await getByID(this.db, id);
        if (existingDoc) {
          await remove(this.db, id);
          
          const updatedDoc = {
            ...existingDoc,
            ...updates,
          };
          
          await insert(this.db, updatedDoc);
        }
      } catch (error) {
        console.error('Failed to update document via remove/insert:', id, error);
      }
    } else {
      try {
        await update(this.db, id, updates);
      } catch (error) {
        console.error('Failed to update document:', id, error);
      }
    }
  }

  async deleteFromIndex(id: string): Promise<void> {
    await this.initialize();

    await remove(this.db, id);
    console.log("Deleted from index:", id);
  }

  async save(name: string = "ai-calendar-vectors"): Promise<void> {
    if (!this.db) {
      throw new Error("数据库未初始化");
    }

    const data = await persist(this.db, "json");
    const dbName = `OramaSearchDB_${this.currentModelType}`;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("databases")) {
          db.createObjectStore("databases");
        }
      };

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction(["databases"], "readwrite");
        const store = tx.objectStore("databases");
        store.put(data, name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async load(name: string = "ai-calendar-vectors"): Promise<boolean> {
    const dbName = `OramaSearchDB_${this.currentModelType}`;
    const data = await new Promise<string | undefined>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("databases")) {
          db.createObjectStore("databases");
        }
      };

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction(["databases"], "readonly");
        const store = tx.objectStore("databases");
        const getReq = store.get(name);

        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      };

      request.onerror = () => reject(request.error);
    });

    if (data) {
      this.db = await restore("json", data);
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

  async clearModelData(): Promise<void> {
    const dbName = `OramaSearchDB_${this.currentModelType}`;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => {
        console.log(`Deleted IndexedDB: ${dbName}`);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  static async clearAllModelData(): Promise<void> {
    const modelTypes: AIModelType[] = ['zh-specific', 'multilingual'];
    
    for (const modelType of modelTypes) {
      const dbName = `OramaSearchDB_${modelType}`;
      
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        
        request.onsuccess = () => {
          console.log(`Deleted IndexedDB: ${dbName}`);
          resolve();
        };
        
        request.onerror = () => reject(request.error);
      });
    }
  }
}

export const oramaSearchService = new OramaSearchService();
export type { EntityType, SearchOptions, HybridSearchOptions };
