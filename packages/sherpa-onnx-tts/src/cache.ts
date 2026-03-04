export interface CachedModel {
  url: string;
  data: ArrayBuffer;
  version: string;
  timestamp: number;
  size: number;
}

export interface CacheProgress {
  loaded: number;
  total: number;
  percent: number;
  fromCache: boolean;
}

export type CacheProgressCallback = (progress: CacheProgress) => void;

const DB_NAME = 'KokoroTTSModelCache';
const STORE_NAME = 'models';
const DB_VERSION = 1;
const MODEL_VERSION = '1.0.0';

class ModelCacheManager {
  private static instance: ModelCacheManager;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): ModelCacheManager {
    if (!ModelCacheManager.instance) {
      ModelCacheManager.instance = new ModelCacheManager();
    }
    return ModelCacheManager.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        }
      };
    });
  }

  async get(url: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const cached = request.result as CachedModel | undefined;
        resolve(cached?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async set(url: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const cachedModel: CachedModel = {
        url,
        data,
        version: MODEL_VERSION,
        timestamp: Date.now(),
        size: data.byteLength,
      };

      const request = store.put(cachedModel);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async has(url: string): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result as CachedModel[];
        resolve(models.reduce((acc, m) => acc + m.size, 0));
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const modelCacheManager = ModelCacheManager.getInstance();
