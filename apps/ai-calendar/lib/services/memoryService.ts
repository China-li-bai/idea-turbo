import { v4 as uuidv4 } from 'uuid';
import type {
  MemoryItem,
  MemorySystem,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryConsolidationOptions,
  MemoryConsolidationResult,
  MemoryStats,
  MemoryType,
  MemoryCategory,
} from '@/types/memory';
import {
  MemoryNotFoundError,
  MemoryValidationError,
  MemoryCountExceededError,
} from '@/types/memory.errors';
import { memoryStorage } from '@/lib/storage/memoryStorage';
import { validateMemoryItem, validateSearchOptions } from '@/types/memory.schemas';
import { MEMORY_CONSTANTS, MEMORY_LIMITS } from '@/types/memory.constants';

class MemoryServiceImpl implements MemorySystem {
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await memoryStorage.initialize();
    this.initialized = true;
  }

  async addMemory(
    memory: Omit<MemoryItem, 'id' | 'metadata'> & { metadata?: Partial<MemoryItem['metadata']> }
  ): Promise<MemoryItem> {
    if (!this.initialized) {
      await this.initialize();
    }

    const validation = validateMemoryItem({
      ...memory,
      id: 'test-id',
      metadata: {
        timestamp: Date.now(),
        source: memory.metadata?.source || 'user',
        confidence: memory.metadata?.confidence || 0.5,
        accessCount: 0,
        lastAccessedAt: Date.now(),
        importance: memory.metadata?.importance || 'medium',
        ...memory.metadata,
      },
    });

    if (!validation.success) {
      throw new MemoryValidationError(
        'Invalid memory data',
        { errors: validation.error.errors }
      );
    }

    await this.checkMemoryLimits(memory.type);

    const now = Date.now();
    const newMemory: MemoryItem = {
      ...memory,
      id: uuidv4(),
      metadata: {
        timestamp: now,
        source: memory.metadata?.source || 'user',
        confidence: memory.metadata?.confidence || 0.5,
        accessCount: 0,
        lastAccessedAt: now,
        importance: memory.metadata?.importance || 'medium',
        ...memory.metadata,
      },
    };

    await memoryStorage.save(newMemory);

    return newMemory;
  }

  async getMemory(id: string): Promise<MemoryItem | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await memoryStorage.get(id);
  }

  async updateMemory(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const existing = await this.getMemory(id);
    if (!existing) {
      throw new MemoryNotFoundError(id);
    }

    const updated = await memoryStorage.update(id, updates);
    return updated;
  }

  async deleteMemory(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await memoryStorage.delete(id);
  }

  async searchMemories(options: MemorySearchOptions): Promise<MemorySearchResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const validation = validateSearchOptions(options);
    if (!validation.success) {
      throw new MemoryValidationError(
        'Invalid search options',
        { errors: validation.error.issues }
      );
    }

    return await memoryStorage.query(options);
  }

  async getRelatedMemories(memoryId: string, limit: number = 10): Promise<MemoryItem[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const memory = await this.getMemory(memoryId);
    if (!memory) {
      throw new MemoryNotFoundError(memoryId);
    }

    const relatedIds = memory.metadata.relatedItemIds || [];
    const relatedMemories: MemoryItem[] = [];

    for (const id of relatedIds.slice(0, limit)) {
      const related = await this.getMemory(id);
      if (related) {
        relatedMemories.push(related);
      }
    }

    return relatedMemories;
  }

  async recordAccess(memoryId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const memory = await this.getMemory(memoryId);
    if (!memory) {
      throw new MemoryNotFoundError(memoryId);
    }

    await this.updateMemory(memoryId, {
      metadata: {
        ...memory.metadata,
        accessCount: memory.metadata.accessCount + 1,
        lastAccessedAt: Date.now(),
      },
    });
  }

  async consolidate(options?: MemoryConsolidationOptions): Promise<MemoryConsolidationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const maxAge = options?.maxAge || MEMORY_CONSTANTS.SHORT_TERM_MEMORY_TTL;
    const minAccessCount = options?.minAccessCount || 1;
    const minConfidence = options?.minConfidence || MEMORY_CONSTANTS.DEFAULT_CONFIDENCE_THRESHOLD;
    const preserveCategories = options?.preserveCategories || ['preference', 'pattern'];

    const allMemories = await memoryStorage.query({ limit: 10000 });
    const now = Date.now();

    let consolidated = 0;
    let archived = 0;
    let deleted = 0;
    const patterns: MemoryItem[] = [];

    for (const memory of allMemories.memories) {
      const age = now - memory.metadata.timestamp;
      const shouldDelete = 
        age > maxAge &&
        memory.metadata.accessCount < minAccessCount &&
        memory.metadata.confidence < minConfidence &&
        !preserveCategories.includes(memory.category);

      if (shouldDelete) {
        await this.deleteMemory(memory.id);
        deleted++;
      } else if (memory.type === 'short-term' && memory.metadata.confidence > 0.8) {
        await this.updateMemory(memory.id, {
          type: 'long-term',
          metadata: {
            ...memory.metadata,
            expiresAt: now + MEMORY_CONSTANTS.LONG_TERM_MEMORY_TTL,
          },
        });
        consolidated++;
      }

      if (memory.category === 'pattern') {
        patterns.push(memory);
      }
    }

    return {
      consolidated,
      archived,
      deleted,
      patterns: patterns as any,
      duration: Date.now() - startTime,
    };
  }

  async getStats(): Promise<MemoryStats> {
    if (!this.initialized) {
      await this.initialize();
    }

    const allMemories = await memoryStorage.query({ limit: 10000, includeEmbeddings: false });

    const byType: Record<MemoryType, number> = {
      'short-term': 0,
      'long-term': 0,
      'working': 0,
    };

    const byCategory: Record<MemoryCategory, number> = {
      query: 0,
      result: 0,
      feedback: 0,
      preference: 0,
      pattern: 0,
      context: 0,
    };

    let totalConfidence = 0;
    let oldestMemory = Date.now();
    let newestMemory = 0;
    let totalSize = 0;

    for (const memory of allMemories.memories) {
      byType[memory.type]++;
      byCategory[memory.category]++;
      totalConfidence += memory.metadata.confidence;
      oldestMemory = Math.min(oldestMemory, memory.metadata.timestamp);
      newestMemory = Math.max(newestMemory, memory.metadata.timestamp);
      totalSize += JSON.stringify(memory).length;
    }

    return {
      totalMemories: allMemories.total,
      byType,
      byCategory,
      averageConfidence: allMemories.total > 0 ? totalConfidence / allMemories.total : 0,
      oldestMemory,
      newestMemory,
      totalSize,
    };
  }

  async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await memoryStorage.clear();
  }

  async export(): Promise<MemoryItem[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const allMemories = await memoryStorage.query({ limit: 10000, includeEmbeddings: true });
    return allMemories.memories;
  }

  async import(memories: MemoryItem[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const memory of memories) {
      const validation = validateMemoryItem(memory);
      if (validation.success) {
        await memoryStorage.save(memory);
      }
    }
  }

  private async checkMemoryLimits(type: MemoryType): Promise<void> {
    const stats = await this.getStats();
    const count = stats.byType[type];
    const maxCount = type === 'short-term'
      ? MEMORY_CONSTANTS.MAX_SHORT_TERM_MEMORIES
      : type === 'long-term'
      ? MEMORY_CONSTANTS.MAX_LONG_TERM_MEMORIES
      : MEMORY_CONSTANTS.MAX_WORKING_MEMORIES;

    if (count >= maxCount) {
      throw new MemoryCountExceededError(count, maxCount, type);
    }
  }
}

export const memoryService = new MemoryServiceImpl();
