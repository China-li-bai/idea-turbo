export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxEntries: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxSize || 100;
    this.defaultTTL = options.ttl || 5 * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): {
    size: number;
    maxEntries: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    let totalHits = 0;
    const entries: Array<{ key: string; hits: number; age: number }> = [];
    
    this.cache.forEach((entry, key) => {
      totalHits += entry.hits;
      entries.push({
        key,
        hits: entry.hits,
        age: Date.now() - entry.timestamp,
      });
    });
    
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      entries,
    };
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestHits = Infinity;
    
    this.cache.forEach((entry, key) => {
      const score = entry.hits / (Date.now() - entry.timestamp + 1);
      
      if (score < lowestHits / (oldestTime + 1)) {
        oldestKey = key;
        oldestTime = Date.now() - entry.timestamp;
        lowestHits = entry.hits;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  pruneExpired(): number {
    let pruned = 0;
    
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        pruned++;
      }
    });
    
    return pruned;
  }
}

export const memoryCache = new MemoryCache({
  ttl: 5 * 60 * 1000,
  maxSize: 100,
});
