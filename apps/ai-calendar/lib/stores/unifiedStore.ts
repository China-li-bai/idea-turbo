import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';
import type { MemoryItem, MemorySearchOptions, MemorySearchResult, MemoryStats } from '@/types/memory';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import { unifiedItemService, type EmbeddingUpdate } from '@/lib/services/unifiedItemService';
import { memoryService } from '@/lib/services/memoryService';
import { localforage } from '@/lib/storage';

const STATE_KEY = 'unified-calendar-state';

const localforageStorage = createJSONStorage(() => localforage);

interface AIStatus {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UnifiedStore {
  items: UnifiedCalendarItem[];
  memories: MemoryItem[];
  memoryStats: MemoryStats;
  settings: {
    viewMode: 'boss' | 'secretary';
    theme: 'light' | 'dark' | 'system';
  };
  aiStatus: AIStatus;
  _initialized: boolean;

  initialize: () => Promise<void>;

  addItem: (item: UnifiedCalendarItem) => Promise<void>;
  updateItem: (id: string, updates: Partial<UnifiedCalendarItem>) => Promise<void>;
  updateEmbedding: (update: EmbeddingUpdate) => void;
  deleteItem: (id: string) => Promise<void>;

  addBatchItems: (items: UnifiedCalendarItem[]) => Promise<void>;
  updateBatchItems: (updates: Array<{ id: string; updates: Partial<UnifiedCalendarItem> }>) => Promise<void>;
  deleteBatchItems: (ids: string[]) => Promise<void>;

  convertToEvent: (id: string, startTime: number, endTime: number, metadata?: Partial<UnifiedCalendarItem['metadata']>) => Promise<void>;
  convertToIdea: (id: string, metadata?: Partial<UnifiedCalendarItem['metadata']>) => Promise<void>;

  getItems: (type?: ItemType, status?: ItemStatus) => UnifiedCalendarItem[];
  getItemById: (id: string) => UnifiedCalendarItem | undefined;

  updateSettings: (settings: Partial<UnifiedStore['settings']>) => void;

  addMemory: (memory: Omit<MemoryItem, 'id' | 'metadata'> & { metadata?: Partial<MemoryItem['metadata']> }) => Promise<MemoryItem>;
  updateMemory: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (options: MemorySearchOptions) => Promise<MemorySearchResult>;
  refreshMemoryStats: () => Promise<void>;
}

export const useUnifiedStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      items: [],
      memories: [],
      memoryStats: {
        totalMemories: 0,
        byType: {
          'short-term': 0,
          'long-term': 0,
          'working': 0,
        },
        byCategory: {
          'query': 0,
          'result': 0,
          'feedback': 0,
          'preference': 0,
          'pattern': 0,
          'context': 0,
        },
        averageConfidence: 0,
        totalSize: 0,
        oldestMemory: 0,
        newestMemory: 0,
      },
      settings: {
        viewMode: 'boss',
        theme: 'light'
      },
      aiStatus: {
        isReady: false,
        isLoading: true,
        error: null
      },
      _initialized: false,

      initialize: async () => {
        if (get()._initialized) return;

        set({ aiStatus: { isReady: false, isLoading: true, error: null } });

        try {
          await oramaSearchService.initialize();

          set({
            _initialized: true,
            aiStatus: {
              isReady: oramaSearchService.getIsReady(),
              isLoading: false,
              error: null
            }
          });
          console.log('Unified store initialized');
        } catch (error) {
          console.error('Failed to initialize unified store:', error);
          set({
            aiStatus: {
              isReady: false,
              isLoading: false,
              error: error instanceof Error ? error.message : '初始化失败'
            }
          });
        }
      },

      addItem: async (item) => {
        set((state) => ({
          items: [...state.items, item]
        }));

        try {
          const { embedding, embeddingUpdatedAt } = await oramaSearchService.indexItem(item);
          
          set((state) => ({
            items: state.items.map((i) =>
              i.id === item.id
                ? { ...i, embedding, embeddingUpdatedAt }
                : i
            )
          }));
        } catch (error) {
          console.error('Failed to index item:', error);
        }
      },

      updateItem: async (id, updates) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        const updatedItem = unifiedItemService.updateItem(item, updates);

        set((state) => ({
          items: state.items.map((i) => i.id === id ? updatedItem : i)
        }));

        try {
          const result = await oramaSearchService.updateDocument(id, updates);
          
          if (result.embedding && result.embeddingUpdatedAt) {
            set((state) => ({
              items: state.items.map((i) =>
                i.id === id
                  ? { ...i, embedding: result.embedding!, embeddingUpdatedAt: result.embeddingUpdatedAt! }
                  : i
              )
            }));
          }
        } catch (error) {
          console.error('Failed to update item in index:', error);
        }
      },

      updateEmbedding: (update: EmbeddingUpdate) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === update.id
              ? {
                  ...item,
                  embedding: update.embedding,
                  embeddingUpdatedAt: update.embeddingUpdatedAt
                }
              : item
          )
        }));

        oramaSearchService.updateDocument(update.id, {
          embedding: update.embedding,
          embeddingUpdatedAt: update.embeddingUpdatedAt
        }).catch(error => {
          console.error('Failed to update embedding in index:', error);
        });
      },

      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        }));

        try {
          await oramaSearchService.deleteFromIndex(id);
        } catch (error) {
          console.error('Failed to delete item from index:', error);
        }
      },

      addBatchItems: async (newItems) => {
        set((state) => ({
          items: [...state.items, ...newItems]
        }));

        const results = await Promise.allSettled(
          newItems.map(item => oramaSearchService.indexItem(item))
        );

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to index item ${newItems[index].id}:`, result.reason);
          }
        });
      },

      updateBatchItems: async (updates) => {
        const currentItems = get().items;
        const updatedItems = currentItems.map(item => {
          const update = updates.find(u => u.id === item.id);
          if (update) {
            return unifiedItemService.updateItem(item, update.updates);
          }
          return item;
        });

        set({ items: updatedItems });

        const results = await Promise.allSettled(
          updates.map(updateItem => 
            oramaSearchService.updateDocument(updateItem.id, updateItem.updates)
          )
        );

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to update item ${updates[index].id}:`, result.reason);
          }
        });
      },

      deleteBatchItems: async (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id))
        }));

        const results = await Promise.allSettled(
          ids.map(id => oramaSearchService.deleteFromIndex(id))
        );

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to delete item ${ids[index]}:`, result.reason);
          }
        });
      },

      convertToEvent: async (id, startTime, endTime, metadata) => {
        const item = get().items.find((i) => i.id === id);
        if (!item || item.type !== 'idea') return;

        const updatedItem = unifiedItemService.transformToEvent(
          item,
          startTime,
          endTime,
          metadata
        );

        set((state) => ({
          items: state.items.map((i) => i.id === id ? updatedItem : i)
        }));

        try {
          await oramaSearchService.updateDocument(id, updatedItem);
        } catch (error) {
          console.error('Failed to update converted item in index:', error);
        }
      },

      convertToIdea: async (id, metadata) => {
        const item = get().items.find((i) => i.id === id);
        if (!item || item.type !== 'event') return;

        const updatedItem = unifiedItemService.transformToIdea(item, metadata);

        set((state) => ({
          items: state.items.map((i) => i.id === id ? updatedItem : i)
        }));

        try {
          await oramaSearchService.updateDocument(id, updatedItem);
        } catch (error) {
          console.error('Failed to update converted item in index:', error);
        }
      },

      getItems: (type, status) => {
        let items = get().items;

        if (type) {
          items = items.filter((item) => item.type === type);
        }

        if (status) {
          items = items.filter((item) => item.status === status);
        }

        return items;
      },

      getItemById: (id) => {
        return get().items.find((item) => item.id === id);
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },

      addMemory: async (memory) => {
        const newMemory = await memoryService.addMemory(memory);
        
        set((state) => ({
          memories: [...state.memories, newMemory],
        }));
        
        await get().refreshMemoryStats();
        
        return newMemory;
      },

      updateMemory: async (id, updates) => {
        const updated = await memoryService.updateMemory(id, updates);
        
        if (updated) {
          set((state) => ({
            memories: state.memories.map((m) =>
              m.id === id ? updated : m
            ),
          }));
        }
      },

      deleteMemory: async (id) => {
        await memoryService.deleteMemory(id);
        
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));
        
        await get().refreshMemoryStats();
      },

      searchMemories: async (options) => {
        return await memoryService.searchMemories(options);
      },

      refreshMemoryStats: async () => {
        const stats = await memoryService.getStats();
        
        set({ memoryStats: stats });
      },
    }),
    {
      name: STATE_KEY,
      storage: localforageStorage,
      version: 2,
      partialize: (state) => ({
        items: state.items,
        settings: state.settings,
        memories: state.memories,
      })
    }
  )
);