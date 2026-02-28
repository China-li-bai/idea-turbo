import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioQueue, QueueSegment } from './AudioQueue';

describe('AudioQueue - Preload Integration', () => {
  let audioQueue: AudioQueue;
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetchFn = vi.fn().mockImplementation(async (text: string, signal: AbortSignal) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Blob([text], { type: 'audio/mpeg' });
    });

    audioQueue = new AudioQueue(mockFetchFn, {
      cacheOptions: {
        maxSize: 50 * 1024 * 1024,
        maxEntries: 100,
        ttl: 30 * 60 * 1000
      },
      preloadOptions: {
        concurrentLimit: 2,
        preloadAhead: 3
      }
    });
  });

  it('should preload next segments when playing', async () => {
    const segments: QueueSegment[] = [
      { id: 'seg_0', text: 'Segment 0', index: 0 },
      { id: 'seg_1', text: 'Segment 1', index: 1 },
      { id: 'seg_2', text: 'Segment 2', index: 2 },
      { id: 'seg_3', text: 'Segment 3', index: 3 },
      { id: 'seg_4', text: 'Segment 4', index: 4 }
    ];

    audioQueue.setSegments(segments);

    const playPromise = audioQueue.play();

    await new Promise(resolve => setTimeout(resolve, 50));

    const cacheStats = audioQueue.getCacheStats();

    expect(cacheStats.size).toBeGreaterThan(0);
    expect(mockFetchFn).toHaveBeenCalled();
  });

  it('should preload exactly 3 segments ahead', async () => {
    const segments: QueueSegment[] = [
      { id: 'seg_0', text: 'Segment 0', index: 0 },
      { id: 'seg_1', text: 'Segment 1', index: 1 },
      { id: 'seg_2', text: 'Segment 2', index: 2 },
      { id: 'seg_3', text: 'Segment 3', index: 3 },
      { id: 'seg_4', text: 'Segment 4', index: 4 },
      { id: 'seg_5', text: 'Segment 5', index: 5 }
    ];

    audioQueue.setSegments(segments);

    audioQueue.play();

    await new Promise(resolve => setTimeout(resolve, 100));

    const cacheStats = audioQueue.getCacheStats();

    expect(cacheStats.size).toBeGreaterThanOrEqual(3);
    expect(cacheStats.size).toBeLessThanOrEqual(4);
  });

  it('should use cached audio for subsequent segments', async () => {
    const segments: QueueSegment[] = [
      { id: 'seg_0', text: 'Segment 0', index: 0 },
      { id: 'seg_1', text: 'Segment 1', index: 1 },
      { id: 'seg_2', text: 'Segment 2', index: 2 },
      { id: 'seg_3', text: 'Segment 3', index: 3 }
    ];

    audioQueue.setSegments(segments);

    audioQueue.play();

    await new Promise(resolve => setTimeout(resolve, 100));

    const initialFetchCount = mockFetchFn.mock.calls.length;

    await new Promise(resolve => setTimeout(resolve, 200));

    const finalFetchCount = mockFetchFn.mock.calls.length;

    expect(finalFetchCount).toBeLessThanOrEqual(initialFetchCount + 1);
  });

  it('should maintain cache while playing through queue', async () => {
    const segments: QueueSegment[] = Array.from({ length: 10 }, (_, i) => ({
      id: `seg_${i}`,
      text: `Segment ${i}`,
      index: i
    }));

    audioQueue.setSegments(segments);

    audioQueue.play();

    await new Promise(resolve => setTimeout(resolve, 50));

    const cacheStats1 = audioQueue.getCacheStats();

    await new Promise(resolve => setTimeout(resolve, 100));

    const cacheStats2 = audioQueue.getCacheStats();

    expect(cacheStats2.size).toBeGreaterThanOrEqual(cacheStats1.size);
  });
});
