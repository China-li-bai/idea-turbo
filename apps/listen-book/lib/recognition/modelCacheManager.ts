export interface CachedModel {
  url: string;
  data: ArrayBuffer;
  version: string;
  timestamp: number;
  size: number;
  etag?: string;
  lastModified?: string;
}

export interface RemoteResourceConfig {
  baseUrl: string;
  files: {
    wasm: string;
    data: string;
    encoder?: string;
    encoderInt8?: string;
    decoder?: string;
    decoderInt8?: string;
    joiner?: string;
    joinerInt8?: string;
    tokens?: string;
  };
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
    console.log('[ModelCache] Remote config set:', config.baseUrl);
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

        console.log(`[ModelCache] Cache hit for ${url}, size: ${(cached.size / 1024 / 1024).toFixed(2)}MB`);
        resolve(cached.data);
      };

      request.onerror = () => {
        console.error('[ModelCache] Failed to get cached model:', request.error);
        resolve(null);
      };
    });
  }

  async cacheModel(
    url: string,
    data: ArrayBuffer,
    onProgress?: CacheProgressCallback,
    etag?: string,
    lastModified?: string
  ): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const cachedModel: CachedModel = {
      url,
      data,
      version: this.MODEL_VERSION,
      timestamp: Date.now(),
      size: data.byteLength,
      etag,
      lastModified
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(cachedModel);

      request.onsuccess = () => {
        console.log(`[ModelCache] Cached model: ${url}, size: ${(cachedModel.size / 1024 / 1024).toFixed(2)}MB`);
        resolve();
      };

      request.onerror = () => {
        console.error('[ModelCache] Failed to cache model:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteModel(url: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(url);

      request.onsuccess = () => {
        console.log(`[ModelCache] Deleted cached model: ${url}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[ModelCache] Failed to delete model:', request.error);
        reject(request.error);
      };
    });
  }

  async clearExpiredCache(): Promise<void> {
    console.log('[ModelCache] No expiry check needed for static model files');
    return Promise.resolve();
  }

  private async deleteMultipleModels(urls: string[]): Promise<void> {
    if (urls.length === 0) {
      return;
    }

    const promises = urls.map(url => this.deleteModel(url));
    await Promise.all(promises);
    console.log(`[ModelCache] Cleared ${urls.length} expired models`);
  }

  async getCacheStats(): Promise<{ count: number; totalSize: number }> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result as CachedModel[];
        const totalSize = models.reduce((sum, model) => sum + model.size, 0);
        
        resolve({
          count: models.length,
          totalSize
        });
      };

      request.onerror = () => {
        console.error('[ModelCache] Failed to get cache stats:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAllCache(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[ModelCache] Cleared all cache');
        resolve();
      };

      request.onerror = () => {
        console.error('[ModelCache] Failed to clear cache:', request.error);
        reject(request.error);
      };
    });
  }

  async forceUpdate(url: string, onProgress?: CacheProgressCallback): Promise<ArrayBuffer> {
    console.log(`[ModelCache] Force updating: ${url}`);
    
    await this.deleteModel(url);
    return this.fetchWithCache(url, onProgress);
  }

  async checkVersion(url: string): Promise<boolean> {
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
          resolve(false);
          return;
        }

        const isOutdated = cached.version !== this.MODEL_VERSION;
        
        if (isOutdated) {
          console.log(`[ModelCache] Model outdated: ${cached.version} -> ${this.MODEL_VERSION}`);
          this.deleteModel(url);
        }
        
        resolve(isOutdated);
      };

      request.onerror = () => {
        console.error('[ModelCache] Failed to check version:', request.error);
        reject(request.error);
      };
    });
  }

  getModelVersion(): string {
    return this.MODEL_VERSION;
  }

  async fetchWithCache(
    url: string,
    onProgress?: CacheProgressCallback
  ): Promise<ArrayBuffer> {
    const startTime = Date.now();

    const cached = await this.getCachedModel(url);
    if (cached) {
      if (onProgress) {
        onProgress({
          loaded: cached.byteLength,
          total: cached.byteLength,
          percent: 100,
          fromCache: true
        });
      }
      console.log(`[ModelCache] Loaded from cache in ${Date.now() - startTime}ms`);
      return cached;
    }

    let fetchUrl = url;
    
    if (this.remoteConfig && !url.startsWith('http')) {
      const fileName = url.split('/').pop() || '';
      
      if (fileName.includes('wasm')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.wasm}`;
      } else if (fileName.includes('data')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.data}`;
      } else if (fileName.includes('encoder') && fileName.includes('int8')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.encoderInt8}`;
      } else if (fileName.includes('encoder')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.encoder}`;
      } else if (fileName.includes('decoder') && fileName.includes('int8')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.decoderInt8}`;
      } else if (fileName.includes('decoder')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.decoder}`;
      } else if (fileName.includes('joiner') && fileName.includes('int8')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.joinerInt8}`;
      } else if (fileName.includes('joiner')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.joiner}`;
      } else if (fileName.includes('tokens')) {
        fetchUrl = `${this.remoteConfig.baseUrl}/${this.remoteConfig.files.tokens}`;
      }
      
      console.log(`[ModelCache] Using remote URL: ${fetchUrl}`);
    }

    console.log(`[ModelCache] Fetching from network: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.statusText}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    const chunks: Uint8Array[] = [];
    const reader = response.body?.getReader();

    if (!reader) {
      const data = await response.arrayBuffer();
      await this.cacheModel(url, data, onProgress);
      return data;
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;
      
      if (onProgress && total > 0) {
        onProgress({
          loaded,
          total,
          percent: (loaded / total) * 100,
          fromCache: false
        });
      }
    }

    const data = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    const arrayBuffer = data.buffer;
    await this.cacheModel(url, arrayBuffer, onProgress);
    
    console.log(`[ModelCache] Loaded from network in ${Date.now() - startTime}ms`);
    return arrayBuffer;
  }
}

export const modelCacheManager = ModelCacheManager.getInstance();
export default ModelCacheManager;
