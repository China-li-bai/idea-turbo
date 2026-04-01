import { oramaSearchService } from './oramaSearchService';
import { memoryService } from './memoryService';
import type { UnifiedCalendarItem } from '@/types/unified';
import type { MemoryItem, MemorySearchOptions } from '@/types/memory';

export interface HybridSearchResult {
  calendarItems: Array<{
    item: UnifiedCalendarItem;
    score: number;
    source: 'calendar';
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
  };
}

export interface HybridSearchOptions {
  query: string;
  
  calendarOptions?: {
    types?: Array<'idea' | 'event'>;
    status?: Array<'pending' | 'scheduled' | 'completed' | 'cancelled'>;
    limit?: number;
    similarity?: number;
  };
  
  memoryOptions?: MemorySearchOptions;
  
  mergeStrategy?: 'score' | 'time' | 'type';
  maxResults?: number;
}

class HybridSearchServiceImpl {
  async search(options: HybridSearchOptions): Promise<HybridSearchResult> {
    const startTime = Date.now();
    
    const [calendarResults, memoryResults] = await Promise.all([
      this.searchCalendar(options),
      this.searchMemory(options),
    ]);
    
    const combined = this.mergeResults(
      calendarResults,
      memoryResults,
      options.mergeStrategy || 'score'
    );
    
    const maxResults = options.maxResults || 20;
    const limitedCombined = combined.slice(0, maxResults);
    
    return {
      calendarItems: calendarResults,
      memories: memoryResults,
      combined: limitedCombined,
      metadata: {
        queryTime: Date.now() - startTime,
        calendarCount: calendarResults.length,
        memoryCount: memoryResults.length,
        totalCount: limitedCombined.length,
      },
    };
  }
  
  private async searchCalendar(options: HybridSearchOptions) {
    try {
      const results = await oramaSearchService.search(
        options.query,
        {
          k: options.calendarOptions?.limit || 10,
          similarity: options.calendarOptions?.similarity || 0.7,
          filters: options.calendarOptions?.types ? {
            types: options.calendarOptions.types,
          } : undefined,
        }
      );
      
      return results.map(result => {
        const { score, ...item } = result;
        return {
          item: item as UnifiedCalendarItem,
          score,
          source: 'calendar' as const,
        };
      });
    } catch (error) {
      console.error('[HybridSearch] Calendar search failed:', error);
      return [];
    }
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
    strategy: 'score' | 'time' | 'type'
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
