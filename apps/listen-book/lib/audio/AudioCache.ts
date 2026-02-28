export interface AudioCacheEntry {
  blob: Blob;
  url: string;
  timestamp: number;
  size: number;
}

export interface AudioCacheOptions {
  maxSize?: number;
  maxEntries?: number;
  ttl?: number;
}

export class AudioCache {
  private cache: Map<string, AudioCacheEntry> = new Map();
  private maxSize: number;
  private maxEntries: number;
  private ttl: number;
  private currentSize: number = 0;

  constructor(options: AudioCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 50 * 1024 * 1024;
    this.maxEntries = options.maxEntries ?? 100;
    this.ttl = options.ttl ?? 30 * 60 * 1000;
  }

  set(key: string, blob: Blob): string {
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.currentSize -= existingEntry.size;
      URL.revokeObjectURL(existingEntry.url);
    }

    const url = URL.createObjectURL(blob);
    const entry: AudioCacheEntry = {
      blob,
      url,
      timestamp: Date.now(),
      size: blob.size
    };

    this.cache.set(key, entry);
    this.currentSize += blob.size;

    this.evictIfNeeded();

    return url;
  }

  get(key: string): AudioCacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    return entry;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    URL.revokeObjectURL(entry.url);
    this.currentSize -= entry.size;
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    for (const [, entry] of this.cache) {
      URL.revokeObjectURL(entry.url);
    }
    this.cache.clear();
    this.currentSize = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getCurrentSize(): number {
    return this.currentSize;
  }

  private isExpired(entry: AudioCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  private evictIfNeeded(): void {
    while (this.shouldEvict()) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  private shouldEvict(): boolean {
    return this.cache.size > this.maxEntries || this.currentSize > this.maxSize;
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}
