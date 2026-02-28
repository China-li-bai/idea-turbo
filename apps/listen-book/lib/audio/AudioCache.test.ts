import { describe, it, expect, beforeEach } from 'vitest';
import { AudioCache } from './AudioCache';

describe('AudioCache', () => {
  let cache: AudioCache;

  beforeEach(() => {
    cache = new AudioCache({
      maxSize: 1024 * 1024,
      maxEntries: 10,
      ttl: 60000
    });
  });

  it('should store and retrieve audio blobs', () => {
    const key = 'test-key';
    const blob = new Blob(['test audio data'], { type: 'audio/mpeg' });

    const url = cache.set(key, blob);
    expect(url).toBeTruthy();

    const entry = cache.get(key);
    expect(entry).toBeTruthy();
    expect(entry?.blob).toBe(blob);
    expect(entry?.url).toBe(url);
  });

  it('should check if key exists', () => {
    const key = 'test-key';
    const blob = new Blob(['test audio data'], { type: 'audio/mpeg' });

    expect(cache.has(key)).toBe(false);
    cache.set(key, blob);
    expect(cache.has(key)).toBe(true);
  });

  it('should delete entries', () => {
    const key = 'test-key';
    const blob = new Blob(['test audio data'], { type: 'audio/mpeg' });

    cache.set(key, blob);
    expect(cache.has(key)).toBe(true);

    cache.delete(key);
    expect(cache.has(key)).toBe(false);
  });

  it('should clear all entries', () => {
    const blob = new Blob(['test audio data'], { type: 'audio/mpeg' });

    cache.set('key1', blob);
    cache.set('key2', blob);
    cache.set('key3', blob);

    expect(cache.size()).toBe(3);

    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('should evict oldest entries when max size is exceeded', () => {
    const smallBlob = new Blob(['small'], { type: 'audio/mpeg' });
    const largeData = new Array(1024 * 1024).fill('x').join('');
    const largeBlob = new Blob([largeData], { type: 'audio/mpeg' });

    cache.set('key1', smallBlob);
    cache.set('key2', smallBlob);
    cache.set('key3', largeBlob);

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
  });

  it('should evict oldest entries when max entries is exceeded', () => {
    const blob = new Blob(['test'], { type: 'audio/mpeg' });

    for (let i = 0; i < 15; i++) {
      cache.set(`key${i}`, blob);
    }

    expect(cache.size()).toBe(10);
    expect(cache.has('key0')).toBe(false);
    expect(cache.has('key4')).toBe(false);
    expect(cache.has('key5')).toBe(true);
    expect(cache.has('key14')).toBe(true);
  });

  it('should track current size', () => {
    const blob1 = new Blob(['test1'], { type: 'audio/mpeg' });
    const blob2 = new Blob(['test2'], { type: 'audio/mpeg' });

    cache.set('key1', blob1);
    const size1 = cache.getCurrentSize();

    cache.set('key2', blob2);
    const size2 = cache.getCurrentSize();

    expect(size2).toBeGreaterThan(size1);
  });
});
