import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioPreloader } from './AudioPreloader';

describe('AudioPreloader', () => {
  let preloader: AudioPreloader;
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetchFn = vi.fn().mockImplementation(async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Blob([text], { type: 'audio/mpeg' });
    });

    preloader = new AudioPreloader(mockFetchFn, {
      concurrentLimit: 2,
      preloadAhead: 3
    });
  });

  it('should preload requests', async () => {
    const requests = [
      { id: '1', text: 'Hello', priority: 1 },
      { id: '2', text: 'World', priority: 2 }
    ];

    preloader.preload(requests);

    expect(preloader.getActiveCount()).toBe(2);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
  });

  it('should respect concurrent limit', async () => {
    const requests = [
      { id: '1', text: 'Text 1', priority: 1 },
      { id: '2', text: 'Text 2', priority: 2 },
      { id: '3', text: 'Text 3', priority: 3 },
      { id: '4', text: 'Text 4', priority: 4 }
    ];

    preloader.preload(requests);

    expect(preloader.getActiveCount()).toBe(2);

    await new Promise(resolve => setTimeout(resolve, 5));

    expect(preloader.getActiveCount()).toBe(2);

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(preloader.getActiveCount()).toBe(0);
    expect(mockFetchFn).toHaveBeenCalledTimes(4);
  });

  it('should cancel specific preload task', async () => {
    const requests = [
      { id: '1', text: 'Text 1', priority: 1 },
      { id: '2', text: 'Text 2', priority: 2 }
    ];

    preloader.preload(requests);

    preloader.cancel('1');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(mockFetchFn).toHaveBeenCalledWith('Text 1', expect.any(AbortSignal));
    expect(mockFetchFn).toHaveBeenCalledWith('Text 2', expect.any(AbortSignal));
  });

  it('should cancel all tasks', () => {
    const requests = [
      { id: '1', text: 'Text 1', priority: 1 },
      { id: '2', text: 'Text 2', priority: 2 },
      { id: '3', text: 'Text 3', priority: 3 }
    ];

    preloader.preload(requests);

    preloader.cancelAll();

    expect(preloader.getActiveCount()).toBe(0);
  });

  it('should get active count', () => {
    const requests = [
      { id: '1', text: 'Text 1', priority: 1 },
      { id: '2', text: 'Text 2', priority: 2 }
    ];

    expect(preloader.getActiveCount()).toBe(0);

    preloader.preload(requests);

    expect(preloader.getActiveCount()).toBe(2);
  });
});
