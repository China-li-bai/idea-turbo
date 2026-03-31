"use client";

import { create, insert, search, remove, update, getByID } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { localforage } from "@/lib/storage";
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

const EMBEDDING_SCHEMA_VERSION = 2;

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

        const newEmbedding = await this.embed(text, 'passage');

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
      if (progressCallback) progressCallback(0, 4, `正在加载 ${this.modelConfig.name}...`);

      const cachedModel = await isModelCached(this.modelConfig.modelName);
      console.log(`[Transformers.js] Model ${this.modelConfig.modelName} cached:`, cachedModel);

      if (progressCallback) progressCallback(1, 4, `正在初始化模型 ${this.modelConfig.modelName}...`);

      this.extractor = await pipeline("feature-extraction", this.modelConfig.modelName);

      if (progressCallback) progressCallback(2, 4, "正在加载本地数据...");

      const loaded = await this._loadFromIndexedDB();
      
      if (loaded) {
        if (progressCallback) progressCallback(4, 4, "从本地数据恢复完成");
        this.isReady = true;
        console.log(`OramaSearchService restored from IndexedDB: ${this.modelConfig.modelName} (${this.modelConfig.dimensions}D)`);
        return;
      }

      if (progressCallback) progressCallback(3, 4, "正在创建数据库...");

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

      if (progressCallback) progressCallback(4, 4, "初始化完成");

      this.isReady = true;
      console.log(`OramaSearchService initialized with model: ${this.modelConfig.modelName} (${this.modelConfig.dimensions}D)`);
    } catch (error) {
      console.error("Failed to initialize OramaSearchService:", error);
      throw error;
    }
  }

  private async _loadFromIndexedDB(): Promise<boolean> {
    const dataKey = `OramaSearchDB_${this.currentModelType}_data`;
    const versionKey = `OramaSearchDB_${this.currentModelType}_version`;
    const backupKey = `OramaSearchDB_${this.currentModelType}_data_backup`;

    try {
      const [data, version] = await Promise.all([
        localforage.getItem<string>(dataKey),
        localforage.getItem<number>(versionKey)
      ]);

      if (version !== EMBEDDING_SCHEMA_VERSION) {
        console.log(`[OramaSearchService] Schema version mismatch (stored: ${version}, current: ${EMBEDDING_SCHEMA_VERSION}), clearing old data...`);
        await Promise.all([
          localforage.removeItem(dataKey),
          localforage.removeItem(versionKey)
        ]);
        return false;
      }

      if (!data) {
        return false;
      }

      try {
        this.db = await restore("json", data);

        if (!this.db || !this.db.schema) {
          throw new Error("Restored database has invalid schema");
        }

        return true;
      } catch (restoreError) {
        console.error(`[OramaSearchService] Failed to restore database, attempting backup recovery:`, restoreError);

        try {
          const backupData = await localforage.getItem<string>(backupKey);
          if (backupData) {
            this.db = await restore("json", backupData);
            if (this.db && this.db.schema) {
              console.log(`[OramaSearchService] Successfully restored from backup`);
              await this.save();
              return true;
            }
          }
        } catch (backupError) {
          console.error(`[OramaSearchService] Backup recovery also failed:`, backupError);
        }

        console.log(`[OramaSearchService] Creating backup of corrupted data for diagnostics...`);
        await localforage.setItem(backupKey, data).catch(() => {});

        await Promise.all([
          localforage.removeItem(dataKey),
          localforage.removeItem(versionKey)
        ]);

        return false;
      }
    } catch (error) {
      console.error(`[OramaSearchService] Error loading from IndexedDB:`, error);
      return false;
    }
  }

  private async _clearIndexedDB(dbName: string): Promise<void> {
    await Promise.all([
      localforage.removeItem(`${dbName}_data`),
      localforage.removeItem(`${dbName}_version`)
    ]);
    console.log(`[OramaSearchService] Cleared storage: ${dbName}`);
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

  async indexItem(item: UnifiedCalendarItem): Promise<{ embedding: number[]; embeddingUpdatedAt: number }> {
    await this.initialize();

    const text = [
      item.title,
      item.content,
      item.metadata.location || "",
      item.metadata.description || "",
    ]
      .filter(Boolean)
      .join(" ");

    const needsRegenerate = 
      item.embedding.length === 0 || 
      item.embedding.length !== this.dimensions;

    const embedding = needsRegenerate ? await this.embed(text, 'passage') : item.embedding;
    const embeddingUpdatedAt = needsRegenerate ? Date.now() : item.embeddingUpdatedAt;

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

    return { embedding, embeddingUpdatedAt };
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
    const similarity = options?.similarity || 0.8;

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
        if (hit.score < similarity) {
          return false;
        }

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
    const similarity = options?.similarity || 0.8;

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
        if (hit.score < similarity) {
          return false;
        }

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

  async updateDocument(id: string, updates: any): Promise<{ embedding?: number[]; embeddingUpdatedAt?: number }> {
    await this.initialize();

    const hasValidEmbedding = updates.embedding && Array.isArray(updates.embedding) && updates.embedding.length > 0;
    
    if (updates.embedding !== undefined && !hasValidEmbedding) {
      try {
        const existingDoc = await getByID(this.db, id);
        if (existingDoc) {
          const text = [
            updates.title || existingDoc.title,
            updates.content || existingDoc.content,
            updates.metadata?.location || existingDoc.metadata?.location || "",
            updates.metadata?.description || existingDoc.metadata?.description || "",
          ].filter(Boolean).join(" ");
          
          const embedding = await this.embed(text, 'passage');
          const embeddingUpdatedAt = Date.now();
          
          await remove(this.db, id);
          
          const updatedDoc = {
            ...existingDoc,
            ...updates,
            embedding,
          };
          
          await insert(this.db, updatedDoc);
          
          return { embedding, embeddingUpdatedAt };
        }
      } catch (error) {
        console.error('Failed to update document via remove/insert:', id, error);
      }
    } else if (hasValidEmbedding) {
      try {
        const existingDoc = await getByID(this.db, id);
        if (existingDoc) {
          await remove(this.db, id);
          
          const updatedDoc = {
            ...existingDoc,
            ...updates,
          };
          
          await insert(this.db, updatedDoc);
          
          return { embedding: updates.embedding, embeddingUpdatedAt: Date.now() };
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
    
    return {};
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
    const dataKey = `OramaSearchDB_${this.currentModelType}_${name}`;
    const versionKey = `OramaSearchDB_${this.currentModelType}_${name}_version`;

    await Promise.all([
      localforage.setItem(dataKey, data),
      localforage.setItem(versionKey, EMBEDDING_SCHEMA_VERSION)
    ]);
    
    console.log(`[OramaSearchService] Saved to localforage: ${dataKey}`);
  }

  async load(name: string = "ai-calendar-vectors"): Promise<boolean> {
    const dataKey = `OramaSearchDB_${this.currentModelType}_${name}`;
    const data = await localforage.getItem<string>(dataKey);

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

  getIsReady(): boolean {
    return this.isReady;
  }

  async clearModelData(): Promise<void> {
    const prefix = `OramaSearchDB_${this.currentModelType}`;
    
    await localforage.removeItem(`${prefix}_data`);
    await localforage.removeItem(`${prefix}_version`);
    await localforage.removeItem(`${prefix}_ai-calendar-vectors`);
    await localforage.removeItem(`${prefix}_ai-calendar-vectors_version`);
    
    console.log(`[OramaSearchService] Cleared localforage data for: ${prefix}`);
  }

  static async clearAllModelData(): Promise<void> {
    const modelTypes: AIModelType[] = ['zh-specific', 'multilingual', 'english'];
    
    for (const modelType of modelTypes) {
      const prefix = `OramaSearchDB_${modelType}`;
      await localforage.removeItem(`${prefix}_data`);
      await localforage.removeItem(`${prefix}_version`);
      await localforage.removeItem(`${prefix}_ai-calendar-vectors`);
      await localforage.removeItem(`${prefix}_ai-calendar-vectors_version`);
      console.log(`[OramaSearchService] Cleared localforage data for: ${prefix}`);
    }
  }
}

export const oramaSearchService = new OramaSearchService();
export type { EntityType, SearchOptions, HybridSearchOptions };
