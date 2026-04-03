import { oramaSearchService } from './oramaSearchService';
import { memoryService } from './memoryService';
import { timeIndexService } from './timeIndexService';
import type { UnifiedCalendarItem } from '@/types/unified';
import type { MemoryItem, MemorySearchOptions } from '@/types/memory';
import { parseTimeQuery } from '@/lib/utils/nlpParserLegacy';
import type { SupportedLocale } from '@/lib/utils/i18n';

export interface HybridSearchResult {
  calendarItems: Array<{
    item: UnifiedCalendarItem;
    score: number;
    source: 'calendar';
    skipRatio?: number;
  }>;

  memories: Array<{
    item: MemoryItem;
    score: number;
    source: 'memory';
  }>;

  combined: Array<{
    item: UnifiedCalendarItem | MemoryItem;
    score: number;
    source: 'calendar' | 'memory';
    type: 'idea' | 'event' | 'memory';
  }>;

  metadata: {
    queryTime: number;
    calendarCount: number;
    memoryCount: number;
    totalCount: number;
    timeQuery?: string;
    skipRatio?: number;
  };
}

export interface HybridSearchOptions {
  query: string;
  locale?: SupportedLocale;

  calendarOptions?: {
    types?: Array<'idea' | 'event'>;
    status?: Array<'pending' | 'scheduled' | 'completed' | 'cancelled'>;
    limit?: number;
    similarity?: number;
  };

  memoryOptions?: MemorySearchOptions;

  mergeStrategy?: 'score' | 'time' | 'type' | 'time-aware';
  maxResults?: number;

  skipIndexing?: {
    enabled: boolean;
    preFilter?: boolean;
  };
}

function calculateDynamicSimilarity(query: string): number {
  const length = query.trim().length;

  if (length <= 3) {
    return 0.4;
  } else if (length <= 6) {
    return 0.5;
  } else if (length <= 10) {
    return 0.6;
  } else if (length <= 20) {
    return 0.7;
  } else {
    return 0.8;
  }
}

function calculateTimeProximityWeight(
  itemStartTime: number | null,
  query: string,
  locale: SupportedLocale = 'zh-CN'
): number {
  if (!itemStartTime || itemStartTime === 0) {
    return 0.3;
  }

  const timeQuery = parseTimeQuery(query, locale);

  if (!timeQuery) {
    return 0.5;
  }

  const now = Date.now();
  const itemTime = itemStartTime;

  if (timeQuery.type === 'short_relative') {
    const windowStart = timeQuery.windowStart.getTime();
    const windowEnd = timeQuery.windowEnd.getTime();

    if (itemTime >= windowStart && itemTime <= windowEnd) {
      return 1.0;
    }

    const distanceHours = Math.abs(itemTime - now) / (1000 * 60 * 60);

    if (distanceHours <= 24) {
      return 0.7;
    } else if (distanceHours <= 72) {
      return 0.5;
    }
    return 0.3;
  }

  if (timeQuery.type === 'time_range') {
    const targetDate = new Date();
    const queryHourStart = timeQuery.hourStart;
    const queryHourEnd = timeQuery.hourEnd;

    const itemDate = new Date(itemTime);
    const itemHour = itemDate.getHours();

    if (itemHour >= queryHourStart && itemHour < queryHourEnd) {
      return 1.0;
    }

    const hourDistance = Math.min(
      Math.abs(itemHour - queryHourStart),
      Math.abs(itemHour - queryHourEnd)
    );

    return Math.max(0.2, 1.0 - hourDistance * 0.15);
  }

  if (timeQuery.type === 'availability') {
    const targetDate = timeQuery.targetDate;
    const targetDayStart = new Date(targetDate);
    targetDayStart.setHours(0, 0, 0, 0);
    const targetDayEnd = new Date(targetDate);
    targetDayEnd.setDate(targetDayEnd.getDate() + 1);
    targetDayEnd.setHours(0, 0, 0, 0);

    if (itemTime >= targetDayStart.getTime() && itemTime < targetDayEnd.getTime()) {
      return 1.0;
    }

    const dayDistance = Math.floor(
      Math.abs(itemTime - targetDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDistance === 0) {
      return 0.8;
    } else if (dayDistance === 1) {
      return 0.6;
    } else if (dayDistance <= 7) {
      return 0.4;
    }
    return 0.2;
  }

  return 0.5;
}

class HybridSearchServiceImpl {
  async search(options: HybridSearchOptions): Promise<HybridSearchResult> {
    const startTime = Date.now();
    const locale = options.locale || 'zh-CN';
    const query = options.query;

    const dynamicSimilarity = calculateDynamicSimilarity(query);
    const effectiveSimilarity = options.calendarOptions?.similarity ?? dynamicSimilarity;

    const timeQuery = parseTimeQuery(query, locale);
    const timeQueryDescription = timeQuery
      ? `${timeQuery.type}:${timeQuery.matchedKeyword || ''}`
      : undefined;

    const [calendarResults, memoryResults] = await Promise.all([
      this.searchCalendar(options, effectiveSimilarity),
      this.searchMemory(options),
    ]);

    const combined = this.mergeResults(
      calendarResults,
      memoryResults,
      options.mergeStrategy || 'time-aware',
      query,
      locale
    );

    const maxResults = options.maxResults || 20;
    const limitedCombined = combined.slice(0, maxResults);

    const avgSkipRatio = calendarResults.length > 0
      ? calendarResults.reduce((sum, r) => sum + (r.skipRatio || 0), 0) / calendarResults.length
      : 0;

    return {
      calendarItems: calendarResults,
      memories: memoryResults,
      combined: limitedCombined,
      metadata: {
        queryTime: Date.now() - startTime,
        calendarCount: calendarResults.length,
        memoryCount: memoryResults.length,
        totalCount: limitedCombined.length,
        timeQuery: timeQueryDescription,
        skipRatio: avgSkipRatio > 0 ? avgSkipRatio : undefined,
      },
    };
  }

  private async searchCalendar(
    options: HybridSearchOptions,
    similarity: number
  ) {
    try {
      let candidateIds: Set<string> | undefined;
      let skipRatio = 0;

      if (options.skipIndexing?.enabled && options.skipIndexing.preFilter) {
        const ids = timeIndexService.getCandidateItemIds(options.query, options.locale);
        if (ids.length > 0) {
          candidateIds = new Set(ids);
          const totalEstimate = await this.estimateTotalItems();
          skipRatio = totalEstimate > 0 ? 1 - (ids.length / totalEstimate) : 0;
        }
      }

      const results = await oramaSearchService.search(options.query, {
        k: options.calendarOptions?.limit || 10,
        similarity: similarity,
        filters: options.calendarOptions?.types
          ? {
              types: options.calendarOptions.types,
            }
          : undefined,
      });

      const filteredResults = candidateIds
        ? results.filter(r => candidateIds!.has(r.id))
        : results;

      return filteredResults.map((result) => ({
        item: {
          ...result,
          embedding: [],
          embeddingUpdatedAt: 0,
        } as UnifiedCalendarItem,
        score: result.score,
        source: 'calendar' as const,
        skipRatio,
      }));
    } catch (error) {
      console.error('[HybridSearch] Calendar search failed:', error);
      return [];
    }
  }

  private async estimateTotalItems(): Promise<number> {
    const stats = timeIndexService.getBlockStatistics();
    return stats.totalItems || 100;
  }
  
  private async searchMemory(options: HybridSearchOptions) {
    try {
      const results = await memoryService.searchMemories({
        query: options.query,
        limit: options.memoryOptions?.limit || 10,
        minConfidence: options.memoryOptions?.minConfidence || 0.5,
        ...options.memoryOptions,
      });
      
      return results.memories.map(item => ({
        item,
        score: item.metadata.confidence,
        source: 'memory' as const,
      }));
    } catch (error) {
      console.error('[HybridSearch] Memory search failed:', error);
      return [];
    }
  }
  
  private mergeResults(
    calendarResults: Array<{ item: any; score: number; source: 'calendar' }>,
    memoryResults: Array<{ item: any; score: number; source: 'memory' }>,
    strategy: 'score' | 'time' | 'type' | 'time-aware',
    query?: string,
    locale?: SupportedLocale
  ) {
    const combined = [
      ...calendarResults.map(r => ({
        item: r.item,
        score: r.score,
        source: r.source,
        type: r.item.type as 'idea' | 'event',
      })),
      ...memoryResults.map(r => ({
        item: r.item,
        score: r.score,
        source: r.source,
        type: 'memory' as const,
      })),
    ];

    switch (strategy) {
      case 'score':
        return combined.sort((a, b) => b.score - a.score);

      case 'time':
        return combined.sort((a, b) => {
          const timeA = a.source === 'calendar'
            ? a.item.updatedAt
            : a.item.metadata.timestamp;
          const timeB = b.source === 'calendar'
            ? b.item.updatedAt
            : b.item.metadata.timestamp;
          return timeB - timeA;
        });

      case 'time-aware':
        if (!query || !locale) {
          return combined.sort((a, b) => b.score - a.score);
        }
        return combined.sort((a, b) => {
          const timeWeightA = calculateTimeProximityWeight(
            a.source === 'calendar' ? a.item.startTime : null,
            query,
            locale
          );
          const timeWeightB = calculateTimeProximityWeight(
            b.source === 'calendar' ? b.item.startTime : null,
            query,
            locale
          );

          const finalScoreA = a.score * 0.6 + timeWeightA * 0.4;
          const finalScoreB = b.score * 0.6 + timeWeightB * 0.4;

          return finalScoreB - finalScoreA;
        });

      case 'type':
        return combined.sort((a, b) => {
          const typeOrder = { 'event': 0, 'idea': 1, 'memory': 2 };
          return typeOrder[a.type] - typeOrder[b.type];
        });

      default:
        return combined;
    }
  }
}

export const hybridSearchService = new HybridSearchServiceImpl();
