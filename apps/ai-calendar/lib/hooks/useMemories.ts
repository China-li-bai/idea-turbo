import { useCallback, useEffect, useState } from 'react';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import type { MemoryItem, MemorySearchOptions, MemorySearchResult } from '@/types/memory';

export interface UseMemoriesOptions {
  autoLoad?: boolean;
}

export interface UseMemoriesReturn {
  memories: MemoryItem[];
  stats: {
    totalMemories: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    averageConfidence: number;
  };
  
  isLoading: boolean;
  error: string | null;
  
  addMemory: (memory: Omit<MemoryItem, 'id' | 'metadata'> & { metadata?: Partial<MemoryItem['metadata']> }) => Promise<MemoryItem>;
  updateMemory: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (options: MemorySearchOptions) => Promise<MemorySearchResult>;
  refresh: () => Promise<void>;
}

export function useMemories(options: UseMemoriesOptions = {}): UseMemoriesReturn {
  const { autoLoad = true } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const memories = useUnifiedStore((state) => state.memories);
  const memoryStats = useUnifiedStore((state) => state.memoryStats);
  const addMemoryStore = useUnifiedStore((state) => state.addMemory);
  const updateMemoryStore = useUnifiedStore((state) => state.updateMemory);
  const deleteMemoryStore = useUnifiedStore((state) => state.deleteMemory);
  const searchMemoriesStore = useUnifiedStore((state) => state.searchMemories);
  const refreshMemoryStats = useUnifiedStore((state) => state.refreshMemoryStats);
  
  const loadMemories = useCallback(async () => {
    if (!autoLoad) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await refreshMemoryStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [autoLoad, refreshMemoryStats]);
  
  const addMemory = useCallback(async (memory: Omit<MemoryItem, 'id' | 'metadata'> & { metadata?: Partial<MemoryItem['metadata']> }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await addMemoryStore(memory);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addMemoryStore]);
  
  const updateMemory = useCallback(async (id: string, updates: Partial<MemoryItem>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateMemoryStore(id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [updateMemoryStore]);
  
  const deleteMemory = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteMemoryStore(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [deleteMemoryStore]);
  
  const searchMemories = useCallback(async (searchOpts: MemorySearchOptions) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await searchMemoriesStore(searchOpts);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [searchMemoriesStore]);
  
  const refresh = useCallback(async () => {
    await loadMemories();
  }, [loadMemories]);
  
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);
  
  return {
    memories,
    stats: memoryStats,
    isLoading,
    error,
    addMemory,
    updateMemory,
    deleteMemory,
    searchMemories,
    refresh,
  };
}
