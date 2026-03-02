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

const CLOUDFLARE_WORKER = 'https://sherpa-onnx-cdn.1272679088.workers.dev';

export const MODEL_FILES = {
  cdnUrl: CLOUDFLARE_WORKER,
  dataFile: 'sherpa-onnx-wasm-main-asr.data',
  modelPath: '/models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23',
};

export const ALL_MODEL_URLS = [
  `${CLOUDFLARE_WORKER}/sherpa-onnx-wasm-main-asr.data`,
];

export const REMOTE_CONFIG: RemoteResourceConfig = {
  baseUrl: CLOUDFLARE_WORKER,
  files: {
    data: 'sherpa-onnx-wasm-main-asr.data',
  }
};

class ModelCacheManager {
  private static instance: ModelCacheManager;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SherpaOnnxModelCache';
  private readonly STORE_NAME = 'models';
  private readonly DB_VERSION = 1;
  private readonly MODEL_VERSION = '1.0.0';
  private initPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;
  private blobUrls: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): ModelCacheManager {
    if (!ModelCacheManager.instance) {
      ModelCacheManager.instance = new ModelCacheManager();
    }
    return ModelCacheManager.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ModelCache] Already initialized, skipping...');
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    console.log('[ModelCache] Initializing...');
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('[ModelCache] Failed to open IndexedDB:', request.error);
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[ModelCache] IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[ModelCache] Creating object stores...');
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

      request.onsuccess = () => {
        this.blobUrls.forEach(url => URL.revokeObjectURL(url));
        this.blobUrls.clear();
        resolve();
      };
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

  async hasCache(url: string): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        resolve(!!request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async preloadAllModels(onProgress?: (current: number, total: number, url: string) => void): Promise<void> {
    console.log('[ModelCache] Starting preload of all models...');
    
    const urls = ALL_MODEL_URLS;
    let loaded = 0;
    const total = urls.length;

    for (const url of urls) {
      const cached = await this.getCachedModel(url);
      
      if (cached) {
        console.log(`[ModelCache] Preload: ${url} (cached)`);
        
        if (!this.blobUrls.has(url)) {
          const blob = new Blob([cached], {
            type: url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'
          });
          const blobUrl = URL.createObjectURL(blob);
          this.blobUrls.set(url, blobUrl);
          console.log(`[ModelCache] Created blob URL for cached: ${url}`);
        }
        
        loaded++;
        onProgress?.(loaded, total, url);
        continue;
      }

      console.log(`[ModelCache] Preload: downloading ${url}...`);
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`[ModelCache] Failed to download ${url}: ${response.status}`);
          continue;
        }
        
        const data = await response.arrayBuffer();
        await this.cacheModel(url, data);
        
        const blob = new Blob([data], {
          type: url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'
        });
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.set(url, blobUrl);
        console.log(`[ModelCache] Preload: cached ${url} (${(data.byteLength / 1024 / 1024).toFixed(2)}MB)`);
      } catch (error) {
        console.error(`[ModelCache] Error downloading ${url}:`, error);
      }

      loaded++;
      onProgress?.(loaded, total, url);
    }

    console.log('[ModelCache] Preload complete!');
  }

  async getBlobUrl(url: string): Promise<string | null> {
    if (this.blobUrls.has(url)) {
      return this.blobUrls.get(url)!;
    }

    const cached = await this.getCachedModel(url);
    if (!cached) {
      return null;
    }

    const blob = new Blob([cached], {
      type: url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'
    });
    const blobUrl = URL.createObjectURL(blob);
    this.blobUrls.set(url, blobUrl);
    
    return blobUrl;
  }

  getBlobUrlSync(url: string): string | null {
    if (this.blobUrls.has(url)) {
      return this.blobUrls.get(url)!;
    }
    return null;
  }

  getModelVersion(): string {
    return this.MODEL_VERSION;
  }

  async forceUpdate(url: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    
    console.log(`[ModelCache] Force updating: ${url}`);
    
    const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    await store.delete(url);
    
    await new Promise<void>((resolve, reject) => {
      const request = fetch(url);
      request.then(async (response) => {
        if (!response.ok) {
          reject(new Error(`Failed to download ${url}`));
          return;
        }
        const data = await response.arrayBuffer();
        await this.cacheModel(url, data);
        resolve();
      }).catch(reject);
    });
  }

  async clearAllCache(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    
    console.log('[ModelCache] Clearing all cache...');
    
    const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    await store.clear();
    
    this.blobUrls.clear();
    console.log('[ModelCache] All cache cleared');
  }
}

export const modelCacheManager = ModelCacheManager.getInstance();

export function setupCacheInterceptor(): void {
  console.log('[SherpaOnnx] Setting up cache interceptor...');
  const cacheManager = ModelCacheManager.getInstance();

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    const isModelFile = url.includes('sherpa-onnx-wasm-main-asr.data');
    
    if (isModelFile) {
      console.log(`[SherpaOnnx] Fetch: ${url}`);
      
      const cached = await cacheManager.getCachedModel(url);
      if (cached) {
        console.log(`[SherpaOnnx] Cache HIT: ${url} (${(cached.byteLength / 1024 / 1024).toFixed(2)}MB)`);
        return new Response(cached, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': cached.byteLength.toString()
          }
        });
      } else {
        console.log(`[SherpaOnnx] Cache MISS: ${url}`);
      }
    }
    
    const response = await originalFetch(input, init);
    
    if (isModelFile && response.ok) {
      const clonedResponse = response.clone();
      const data = await clonedResponse.arrayBuffer();
      console.log(`[SherpaOnnx] Caching: ${url} (${(data.byteLength / 1024 / 1024).toFixed(2)}MB)`);
      cacheManager.cacheModel(url, data).catch((err) => console.error('[SherpaOnnx] Cache error:', err));
    }
    
    return response;
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
    const urlString = url.toString();
    console.log(`[SherpaOnnx] XHR: ${method} ${urlString}`);
    
    const isModelFile = 
      urlString.includes('sherpa-onnx-wasm-main-asr.data');

    if (isModelFile) {
      let newUrl = urlString;
      const fileName = urlString.split('/').pop() || '';
      const cdnUrl = MODEL_FILES.cdnUrl;

      if (fileName.includes('.data')) {
        newUrl = `${cdnUrl}/${MODEL_FILES.dataFile}`;
      }

      console.log(`[SherpaOnnx] XHR redirect to: ${newUrl}`);
      return originalXHROpen.call(this, method, newUrl, async, username, password);
    }
    
    return originalXHROpen.call(this, method, urlString, async, username, password);
  };

  console.log('[SherpaOnnx] Cache interceptor set up successfully');
}
