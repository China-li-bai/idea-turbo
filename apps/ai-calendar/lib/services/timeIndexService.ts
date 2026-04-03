import type {
  TimeBlock,
  TimeBloomFilter,
  TimeGranularity,
  TimeIndexOptions,
  TimeWindow,
} from '@/lib/utils/timeIndexUtils';
import {
  DEFAULT_TIME_INDEX_OPTIONS,
  getTimeKey,
  buildBloomFilter,
  checkTimeRangeInBloom,
  parseTimeWindowFromQuery,
} from '@/lib/utils/timeIndexUtils';
import type { UnifiedCalendarItem } from '@/types/unified';
import { localforage } from '@/lib/storage';

const TIME_BLOCKS_KEY = 'TimeIndexService_blocks';
const TIME_INDEX_VERSION = 1;

export class TimeIndexService {
  private blocks: Map<string, TimeBlock> = new Map();
  private options: TimeIndexOptions;
  private isDirty: boolean = false;

  constructor(options: Partial<TimeIndexOptions> = {}) {
    this.options = { ...DEFAULT_TIME_INDEX_OPTIONS, ...options };
  }

  async initialize(): Promise<void> {
    try {
      const stored = await localforage.getItem<{ version: number; blocks: TimeBlock[] }>(TIME_BLOCKS_KEY);
      if (stored && stored.version === TIME_INDEX_VERSION) {
        this.blocks.clear();
        for (const block of stored.blocks) {
          this.blocks.set(block.id, block);
        }
      }
    } catch (error) {
      console.warn('[TimeIndexService] Failed to load from storage:', error);
    }
  }

  async save(): Promise<void> {
    if (!this.isDirty) return;

    try {
      const blocksArray = Array.from(this.blocks.values());
      await localforage.setItem(TIME_BLOCKS_KEY, {
        version: TIME_INDEX_VERSION,
        blocks: blocksArray,
      });
      this.isDirty = false;
    } catch (error) {
      console.error('[TimeIndexService] Failed to save:', error);
    }
  }

  private getOrCreateBlock(timeKey: string): TimeBlock {
    let block = this.blocks.get(timeKey);
    if (!block) {
      block = {
        id: `block_${timeKey}`,
        timeKey,
        itemIds: [],
        bloomFilter: {
          hourMask: 0,
          dayMask: 0,
          monthMask: 0,
          hasTimeData: false,
          itemCount: 0,
          lastUpdated: Date.now(),
        },
        timeRange: {
          earliest: Infinity,
          latest: -Infinity,
        },
      };
      this.blocks.set(timeKey, block);
      this.isDirty = true;
    }
    return block;
  }

  indexItem(item: UnifiedCalendarItem): void {
    if (!item.startTime) return;

    const startDate = new Date(item.startTime);
    const timeKey = getTimeKey(startDate, this.options.granularity);
    const block = this.getOrCreateBlock(timeKey);

    if (!block.itemIds.includes(item.id)) {
      block.itemIds.push(item.id);

      if (item.startTime < block.timeRange.earliest) {
        block.timeRange.earliest = item.startTime;
      }
      if (item.endTime && item.endTime > block.timeRange.latest) {
        block.timeRange.latest = item.endTime;
      } else if (!item.endTime && item.startTime > block.timeRange.latest) {
        block.timeRange.latest = item.startTime;
      }

      this.isDirty = true;
    }
  }

  indexItemWithData(item: UnifiedCalendarItem, existingItems: Map<string, UnifiedCalendarItem>): void {
    if (!item.startTime) return;

    const startDate = new Date(item.startTime);
    const timeKey = getTimeKey(startDate, this.options.granularity);
    const block = this.getOrCreateBlock(timeKey);

    existingItems.set(item.id, item);

    if (!block.itemIds.includes(item.id)) {
      block.itemIds.push(item.id);

      if (item.startTime < block.timeRange.earliest) {
        block.timeRange.earliest = item.startTime;
      }
      if (item.endTime && item.endTime > block.timeRange.latest) {
        block.timeRange.latest = item.endTime;
      } else if (!item.endTime && item.startTime > block.timeRange.latest) {
        block.timeRange.latest = item.startTime;
      }

      this.isDirty = true;
    }

    const blockItems = block.itemIds
      .map((id: string) => existingItems.get(id))
      .filter((i): i is UnifiedCalendarItem => i !== undefined);

    if (blockItems.length > 0) {
      block.bloomFilter = buildBloomFilter(blockItems);
    }
  }

  removeItem(itemId: string, itemStartTime: number | null): void {
    if (!itemStartTime) return;

    const startDate = new Date(itemStartTime);
    const timeKey = getTimeKey(startDate, this.options.granularity);
    const block = this.blocks.get(timeKey);

    if (block) {
      block.itemIds = block.itemIds.filter(id => id !== itemId);

      if (block.itemIds.length === 0) {
        this.blocks.delete(timeKey);
      } else {
        block.bloomFilter.lastUpdated = Date.now();
      }

      this.isDirty = true;
    }
  }

  queryBlocks(timeWindow: TimeWindow): TimeBlock[] {
    const matchingBlocks: TimeBlock[] = [];

    for (const block of this.blocks.values()) {
      if (block.timeRange.earliest > timeWindow.end.getTime()) {
        continue;
      }
      if (block.timeRange.latest < timeWindow.start.getTime()) {
        continue;
      }

      if (!checkTimeRangeInBloom(block.bloomFilter, timeWindow.start, timeWindow.end)) {
        continue;
      }

      matchingBlocks.push(block);
    }

    return matchingBlocks;
  }

  queryBlocksByQueryString(query: string, locale?: string): TimeBlock[] {
    const timeWindow = parseTimeWindowFromQuery(query, locale);
    if (!timeWindow) {
      return Array.from(this.blocks.values());
    }
    return this.queryBlocks(timeWindow);
  }

  getCandidateItemIds(query: string, locale?: string): string[] {
    const blocks = this.queryBlocksByQueryString(query, locale);
    const itemIds = new Set<string>();

    for (const block of blocks) {
      for (const id of block.itemIds) {
        itemIds.add(id);
      }
    }

    return Array.from(itemIds);
  }

  getBlockStatistics(): {
    totalBlocks: number;
    totalItems: number;
    blocksByGranularity: Record<TimeGranularity, number>;
    bloomFilterStats: {
      avgItemsPerBlock: number;
      blocksWithData: number;
    };
  } {
    let totalItems = 0;
    let blocksWithData = 0;

    for (const block of this.blocks.values()) {
      totalItems += block.itemIds.length;
      if (block.bloomFilter.hasTimeData) {
        blocksWithData++;
      }
    }

    return {
      totalBlocks: this.blocks.size,
      totalItems,
      blocksByGranularity: {
        hour: this.options.granularity === 'hour' ? this.blocks.size : 0,
        day: this.options.granularity === 'day' ? this.blocks.size : 0,
        week: this.options.granularity === 'week' ? this.blocks.size : 0,
        month: this.options.granularity === 'month' ? this.blocks.size : 0,
      },
      bloomFilterStats: {
        avgItemsPerBlock: this.blocks.size > 0 ? totalItems / this.blocks.size : 0,
        blocksWithData,
      },
    };
  }

  async rebuildIndex(items: UnifiedCalendarItem[]): Promise<void> {
    this.blocks.clear();
    this.isDirty = true;

    const itemsByTimeKey = new Map<string, UnifiedCalendarItem[]>();

    for (const item of items) {
      if (!item.startTime) continue;

      const startDate = new Date(item.startTime);
      const timeKey = getTimeKey(startDate, this.options.granularity);

      if (!itemsByTimeKey.has(timeKey)) {
        itemsByTimeKey.set(timeKey, []);
      }
      itemsByTimeKey.get(timeKey)!.push(item);
    }

    for (const [timeKey, blockItems] of itemsByTimeKey) {
      const block: TimeBlock = {
        id: `block_${timeKey}`,
        timeKey,
        itemIds: blockItems.map(i => i.id),
        bloomFilter: buildBloomFilter(blockItems),
        timeRange: {
          earliest: Math.min(...blockItems.map(i => i.startTime || Infinity)),
          latest: Math.max(...blockItems.map(i => i.endTime || i.startTime || 0)),
        },
      };

      this.blocks.set(timeKey, block);
    }

    await this.save();
  }

  clear(): void {
    this.blocks.clear();
    this.isDirty = true;
  }
}

export const timeIndexService = new TimeIndexService();
