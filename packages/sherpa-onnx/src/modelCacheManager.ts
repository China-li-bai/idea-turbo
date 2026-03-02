import { RemoteResourceConfig } from './types';

export interface CachedModel {
  url: string;
  data: ArrayBuffer;
  version: string;
  timestamp: number;
  size: number;
  etag?: string;
  lastModified?: string;
}

export interface CacheProgress {
  loaded: number;
  total: number;
  percent: number;
  fromCache: boolean;
}

export type CacheProgressCallback = (progress: CacheProgress) => void;

class ModelCacheManager {
  private static instance: ModelCacheManager;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SherpaOnnxModelCache';
  private readonly STORE_NAME = 'models';
  private readonly DB_VERSION = 1;
  private readonly MODEL_VERSION = '1.0.0';
  private remoteConfig: RemoteResourceConfig | null = null;

  private constructor() {}

  setRemoteConfig(config: RemoteResourceConfig): void {
    this.remoteConfig = config;
  }

  getRemoteConfig(): RemoteResourceConfig | null {
    return this.remoteConfig;
  }

  static getInstance(): ModelCacheManager {
    if (!ModelCacheManager.instance) {
      ModelCacheManager.instance = new ModelCacheManager();
    }
    return ModelCacheManager.instance;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getCachedModel(url: string): Promise<ArrayBuffer | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const cached = request.result as CachedModel | undefined;
        
        if (!cached) {
          resolve(null);
          return;
        }

        resolve(cached.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async cacheModel(url: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const cachedModel: CachedModel = {
        url,
        data,
        version: this.MODEL_VERSION,
        timestamp: Date.now(),
        size: data.byteLength
      };

      const request = store.put(cachedModel);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result as CachedModel[];
        const totalSize = models.reduce((acc, model) => acc + model.size, 0);
        resolve(totalSize);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async forceUpdate(url: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(url);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export const modelCacheManager = ModelCacheManager.getInstance();
