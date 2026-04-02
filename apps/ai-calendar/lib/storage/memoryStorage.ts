import { db } from './index';
import type { 
  MemoryItem, 
  MemorySearchOptions, 
  MemorySearchResult,
  MemoryType,
  MemoryCategory,
} from '@/types/memory';
import type { MemoryStorage } from '@/types/memory';
import { 
  MemoryStorageError,
} from '@/types/memory.errors';
import { MEMORY_CONSTANTS } from '@/types/memory.constants';

class MemoryStorageImpl implements MemoryStorage {
  private store: LocalForage;
  private indexStore: LocalForage;
  private initialized: boolean = false;

  constructor() {
    this.store = db.memory;
    this.indexStore = db.memoryIndex;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.store.ready();
      await this.indexStore.ready();
      this.initialized = true;
    } catch (error) {
      throw new MemoryStorageError(
        'Failed to initialize memory storage',
        { error }
      );
    }
  }

  async save(memory: MemoryItem): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.store.setItem(memory.id, memory);
      await this.updateIndices(memory);
    } catch (error) {
      throw new MemoryStorageError(
        `Failed to save memory ${memory.id}`,
        { memoryId: memory.id, error }
      );
    }
  }

  async get(id: string): Promise<MemoryItem | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const memory = await this.store.getItem<MemoryItem>(id);
      return memory;
    } catch (error) {
      throw new MemoryStorageError(
        `Failed to get memory ${id}`,
        { memoryId: id, error }
      );
    }
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const existing = await this.get(id);
      if (!existing) {
        return null;
      }

      const updated: MemoryItem = {
        ...existing,
        ...updates,
        id: existing.id,
        metadata: {
          ...existing.metadata,
          ...updates.metadata,
        },
      };

      await this.save(updated);
      return updated;
    } catch (error) {
      throw new MemoryStorageError(
        `Failed to update memory ${id}`,
        { memoryId: id, error }
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const memory = await this.get(id);
      if (!memory) {
        return false;
      }

      await this.store.removeItem(id);
      await this.removeFromIndices(memory);
      return true;
    } catch (error) {
      throw new MemoryStorageError(
        `Failed to delete memory ${id}`,
        { memoryId: id, error }
      );
    }
  }

  async query(options: MemorySearchOptions): Promise<MemorySearchResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      let candidateIds: Set<string> | null = null;

      if (options.types && options.types.length > 0) {
        const typeIndex = await this.getIndex<Record<MemoryType, string[]>>('type') || {} as Record<MemoryType, string[]>;
        const ids = new Set<string>();
        
        for (const type of options.types) {
          const typeIds = typeIndex[type] || [];
          typeIds.forEach((id: string) => ids.add(id));
        }
        
        if (candidateIds === null) {
          candidateIds = ids;
        } else {
          candidateIds = new Set([...candidateIds].filter(id => ids.has(id)));
        }
      }

      if (options.categories && options.categories.length > 0) {
        const categoryIndex = await this.getIndex<Record<MemoryCategory, string[]>>('category') || {} as Record<MemoryCategory, string[]>;
        const ids = new Set<string>();
        
        for (const category of options.categories) {
          const categoryIds = categoryIndex[category] || [];
          categoryIds.forEach((id: string) => ids.add(id));
        }
        
        if (candidateIds === null) {
          candidateIds = ids;
        } else {
          candidateIds = new Set([...candidateIds].filter(id => ids.has(id)));
        }
      }

      let memories: MemoryItem[];
      
      if (candidateIds !== null) {
        memories = [];
        const limit = options.limit || MEMORY_CONSTANTS.DEFAULT_SEARCH_LIMIT;
        const maxFetch = limit * 2;
        let fetched = 0;
        
        for (const id of candidateIds) {
          if (fetched >= maxFetch) break;
          
          const memory = await this.get(id);
          if (memory) {
            memories.push(memory);
            fetched++;
          }
        }
      } else {
        memories = await this.getAllMemories();
      }

      if (options.tags && options.tags.length > 0) {
        memories = memories.filter(m => 
          m.metadata.tags && 
          options.tags!.some(tag => m.metadata.tags!.includes(tag))
        );
      }

      if (options.timeRange) {
        memories = memories.filter(m => 
          m.metadata.timestamp >= options.timeRange!.start &&
          m.metadata.timestamp <= options.timeRange!.end
        );
      }

      if (options.minConfidence !== undefined) {
        memories = memories.filter(m => 
          m.metadata.confidence >= options.minConfidence!
        );
      }

      memories.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);

      const total = memories.length;
      const limit = options.limit || MEMORY_CONSTANTS.DEFAULT_SEARCH_LIMIT;
      const hasMore = total > limit;
      const paginatedMemories = memories.slice(0, limit);

      if (!options.includeEmbeddings) {
        paginatedMemories.forEach(m => {
          if (m.embedding) {
            m.embedding = undefined;
          }
        });
      }

      return {
        memories: paginatedMemories,
        total,
        hasMore,
        queryTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new MemoryStorageError(
        'Failed to query memories',
        { options, error }
      );
    }
  }

  async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.store.clear();
      await this.indexStore.clear();
    } catch (error) {
      throw new MemoryStorageError(
        'Failed to clear memory storage',
        { error }
      );
    }
  }

  async count(): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await this.store.length();
    } catch (error) {
      throw new MemoryStorageError(
        'Failed to count memories',
        { error }
      );
    }
  }

  async getStats(): Promise<{
    totalMemories: number;
    byType: Record<MemoryType, number>;
    byCategory: Record<MemoryCategory, number>;
    averageConfidence: number;
    oldestMemory: number;
    newestMemory: number;
    totalSize: number;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const allMemories = await this.getAllMemories();
      
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
      
      for (const memory of allMemories) {
        byType[memory.type]++;
        byCategory[memory.category]++;
        totalConfidence += memory.metadata.confidence;
        oldestMemory = Math.min(oldestMemory, memory.metadata.timestamp);
        newestMemory = Math.max(newestMemory, memory.metadata.timestamp);
        totalSize += JSON.stringify(memory).length;
      }
      
      return {
        totalMemories: allMemories.length,
        byType,
        byCategory,
        averageConfidence: allMemories.length > 0 ? totalConfidence / allMemories.length : 0,
        oldestMemory,
        newestMemory,
        totalSize,
      };
    } catch (error) {
      throw new MemoryStorageError(
        'Failed to get stats',
        { error }
      );
    }
  }

  private async getAllMemories(): Promise<MemoryItem[]> {
    const memories: MemoryItem[] = [];
    
    await this.store.iterate<MemoryItem, void>((memory) => {
      memories.push(memory);
    });

    return memories;
  }

  private async updateIndices(memory: MemoryItem): Promise<void> {
    try {
      const typeIndex = await this.getIndex<Record<MemoryType, string[]>>('type') || {} as Record<MemoryType, string[]>;
      if (!typeIndex[memory.type]) {
        typeIndex[memory.type] = [];
      }
      if (!typeIndex[memory.type].includes(memory.id)) {
        typeIndex[memory.type].push(memory.id);
      }
      await this.indexStore.setItem('type', typeIndex);

      const categoryIndex = await this.getIndex<Record<MemoryCategory, string[]>>('category') || {} as Record<MemoryCategory, string[]>;
      if (!categoryIndex[memory.category]) {
        categoryIndex[memory.category] = [];
      }
      if (!categoryIndex[memory.category].includes(memory.id)) {
        categoryIndex[memory.category].push(memory.id);
      }
      await this.indexStore.setItem('category', categoryIndex);

      if (memory.metadata.tags) {
        const tagIndex = await this.getIndex<Record<string, string[]>>('tags') || {};
        for (const tag of memory.metadata.tags) {
          if (!tagIndex[tag]) {
            tagIndex[tag] = [];
          }
          if (!tagIndex[tag].includes(memory.id)) {
            tagIndex[tag].push(memory.id);
          }
        }
        await this.indexStore.setItem('tags', tagIndex);
      }
    } catch (error) {
      console.error('[MemoryStorage] Failed to update indices:', error);
    }
  }

  private async removeFromIndices(memory: MemoryItem): Promise<void> {
    try {
      const typeIndex = await this.getIndex<Record<MemoryType, string[]>>('type');
      if (typeIndex && typeIndex[memory.type]) {
        typeIndex[memory.type] = typeIndex[memory.type].filter((id: string) => id !== memory.id);
        await this.indexStore.setItem('type', typeIndex);
      }

      const categoryIndex = await this.getIndex<Record<MemoryCategory, string[]>>('category');
      if (categoryIndex && categoryIndex[memory.category]) {
        categoryIndex[memory.category] = categoryIndex[memory.category].filter((id: string) => id !== memory.id);
        await this.indexStore.setItem('category', categoryIndex);
      }

      if (memory.metadata.tags) {
        const tagIndex = await this.getIndex<Record<string, string[]>>('tags');
        if (tagIndex) {
          for (const tag of memory.metadata.tags) {
            if (tagIndex[tag]) {
              tagIndex[tag] = tagIndex[tag].filter((id: string) => id !== memory.id);
            }
          }
          await this.indexStore.setItem('tags', tagIndex);
        }
      }
    } catch (error) {
      console.error('[MemoryStorage] Failed to remove from indices:', error);
    }
  }

  private async getIndex<T>(indexName: string): Promise<T | null> {
    try {
      return await this.indexStore.getItem<T>(indexName);
    } catch {
      return null;
    }
  }
}

export const memoryStorage = new MemoryStorageImpl();
