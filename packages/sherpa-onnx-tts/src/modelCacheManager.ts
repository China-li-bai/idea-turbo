const DB_NAME = 'kokoro-tts-cache';
const DB_VERSION = 1;
const STORE_NAME = 'models';

export interface CachedModel {
  key: string;
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

export class ModelCacheManager {
  private db: IDBDatabase | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.openDatabase();
    await this.initPromise;
    this.isInitializing = false;
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  async get(key: string): Promise<ArrayBuffer | null> {
    await this.initialize();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedModel | undefined;
        resolve(result?.data || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get cached model: ${request.error}`));
      };
    });
  }

  async set(key: string, data: ArrayBuffer): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const cachedModel: CachedModel = {
        key,
        data,
        timestamp: Date.now(),
        size: data.byteLength,
      };

      const request = store.put(cachedModel);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to cache model: ${request.error}`));
      };
    });
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  async delete(key: string): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to delete cached model: ${request.error}`));
      };
    });
  }

  async clear(): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to clear cache: ${request.error}`));
      };
    });
  }

  async getCacheSize(): Promise<number> {
    await this.initialize();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as CachedModel[];
        const totalSize = results.reduce((sum, item) => sum + item.size, 0);
        resolve(totalSize);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get cache size: ${request.error}`));
      };
    });
  }

  destroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const modelCacheManager = new ModelCacheManager();
