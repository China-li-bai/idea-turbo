import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';
import type { MemoryItem, MemorySearchOptions, MemorySearchResult, MemoryStats } from '@/types/memory';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import { unifiedItemService, type EmbeddingUpdate } from '@/lib/services/unifiedItemService';
import { memoryService } from '@/lib/services/memoryService';
import { selfHealingScheduler } from '@/lib/services/selfHealingScheduler';
import { liquidScheduler } from '@/lib/services/liquidSchedulerService';
import { notifyRescheduled, notifyScheduleFailed, notifyConflictDetected } from '@/lib/stores/notificationStore';
import { localforage } from '@/lib/storage';
import { calendarItemStorage } from '@/lib/storage/calendarItemStorage';
import { eventBus } from '@/lib/utils/eventBus';

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
  _isHealing: boolean;

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

  undoReschedule: (itemId: string) => boolean;

  updateSettings: (settings: Partial<UnifiedStore['settings']>) => void;

  addMemory: (memory: Omit<MemoryItem, 'id' | 'metadata'> & { metadata?: Partial<MemoryItem['metadata']> }) => Promise<MemoryItem>;
  updateMemory: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (options: MemorySearchOptions) => Promise<MemorySearchResult>;
  refreshMemoryStats: () => Promise<void>;
}

type StoreSet = (fn: (state: UnifiedStore) => Partial<UnifiedStore>) => void;
type StoreGet = () => UnifiedStore;

function applyHealingResult(
  healingResult: import('@/lib/services/selfHealingScheduler').SelfHealingResult,
  get: StoreGet,
  set: StoreSet
): void {
  if (healingResult.rescheduledItems.length === 0) return;

  const rescheduledUpdates = healingResult.rescheduledItems.map(r => ({
    id: r.rescheduledItem.id,
    updates: r.rescheduledItem
  }));

  set((state) => ({
    items: state.items.map((i) => {
      const reschedule = rescheduledUpdates.find(u => u.id === i.id);
      return reschedule ? reschedule.updates : i;
    })
  }));

  for (const reschedule of rescheduledUpdates) {
    calendarItemStorage.save(reschedule.updates).catch(error => {
      console.error(`Failed to save rescheduled item ${reschedule.id} to storage:`, error);
    });

    oramaSearchService.updateDocument(reschedule.id, reschedule.updates).catch(error => {
      console.error(`Failed to update rescheduled item ${reschedule.id}:`, error);
    });

    eventBus.publish({
      type: 'updated',
      entityType: 'calendarItem',
      entityId: reschedule.id,
      data: reschedule.updates,
      metadata: { action: 'self-healing-reschedule' },
    });

    notifyRescheduled(
      reschedule.updates.title,
      reschedule.id,
      reschedule.updates.metadata.originalSlotStart
        ? { start: reschedule.updates.metadata.originalSlotStart, end: reschedule.updates.metadata.originalSlotEnd || 0 }
        : null,
      { start: reschedule.updates.startTime || 0, end: reschedule.updates.endTime || 0 }
    );
  }

  for (const failed of healingResult.failedReschedules) {
    notifyScheduleFailed(failed.item.title, failed.item.id, failed.reason);
  }

  for (const conflict of healingResult.conflicts) {
    if (conflict.priorityComparison === 'existing_higher') {
      notifyConflictDetected(conflict.liquidItem.title, conflict.liquidItem.id);
    }
  }
}

function applyLiquidScheduleResult(
  scheduleResult: import('@/lib/services/liquidSchedulerService').ScheduleResult,
  get: StoreGet,
  set: StoreSet
): void {
  if (scheduleResult.scheduled.length === 0 && scheduleResult.promoted.length === 0) return;

  const currentItems = get().items;
  const updatedItems = liquidScheduler.applyScheduleResult(currentItems, scheduleResult);

  set(() => ({ items: updatedItems }));

  for (const scheduled of scheduleResult.scheduled) {
    const scheduledItem = {
      ...scheduled.item,
      startTime: scheduled.slot.start,
      endTime: scheduled.slot.end,
      status: 'scheduled' as const,
      metadata: {
        ...scheduled.item.metadata,
        liquidSchedule: {
          ...scheduled.item.metadata.liquidSchedule,
          liquidState: scheduled.state,
          scheduledBy: 'auto' as const,
          lastScheduledAt: Date.now(),
        }
      }
    };

    calendarItemStorage.save(scheduledItem).catch(error => {
      console.error(`Failed to save scheduled liquid item to storage:`, error);
    });

    oramaSearchService.indexItem(scheduledItem).catch(error => {
      console.error(`Failed to index scheduled liquid item:`, error);
    });

    eventBus.publish({
      type: 'updated',
      entityType: 'calendarItem',
      entityId: scheduled.item.id,
      data: scheduledItem,
      metadata: { action: 'liquid-schedule' },
    });
  }
}

export const useUnifiedStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      items: [],
      _isHealing: false,
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
          await calendarItemStorage.initialize();
          await memoryService.initialize();

          let items = await calendarItemStorage.getAll();

          if (items.length === 0) {
            const persistedItems = get().items;
            if (persistedItems.length > 0) {
              console.log(`[UnifiedStore] Migrating ${persistedItems.length} items from persist to calendarItemStorage...`);
              await calendarItemStorage.saveBatch(persistedItems);
              items = persistedItems;
            }
          }

          set({ items });

          const memoryResult = await memoryService.searchMemories({
            limit: 5000,
            includeEmbeddings: false,
          });
          set({ memories: memoryResult.memories });

          const stats = oramaSearchService.getStats();
          
          if (items.length > 0 && stats.totalDocuments !== items.length) {
            console.log(`[UnifiedStore] Data inconsistency detected: ${items.length} items in store, ${stats.totalDocuments} in Orama. Reindexing...`);
            
            const itemsWithoutEmbedding = items.filter(item => 
              !item.embedding || 
              item.embedding.length === 0 || 
              item.embedding.length !== oramaSearchService.dimensions
            );
            
            if (itemsWithoutEmbedding.length > 0) {
              console.log(`[UnifiedStore] Reindexing ${itemsWithoutEmbedding.length} items without valid embedding...`);
              
              for (const item of itemsWithoutEmbedding) {
                try {
                  const { embedding, embeddingUpdatedAt } = await oramaSearchService.indexItem(item);
                  
                  const updatedItem = { ...item, embedding, embeddingUpdatedAt };
                  set((state) => ({
                    items: state.items.map((i) =>
                      i.id === item.id ? updatedItem : i
                    )
                  }));
                  calendarItemStorage.save(updatedItem).catch(e => {
                    console.error(`[UnifiedStore] Failed to save reindexed item ${item.id}:`, e);
                  });
                } catch (error) {
                  console.error(`[UnifiedStore] Failed to reindex item ${item.id}:`, error);
                }
              }
            } else {
              for (const item of items) {
                try {
                  await oramaSearchService.indexItem(item);
                } catch (error) {
                  console.error(`[UnifiedStore] Failed to index item ${item.id}:`, error);
                }
              }
            }
          }

          await get().refreshMemoryStats();

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

        calendarItemStorage.save(item).catch(error => {
          console.error('Failed to save item to storage:', error);
        });

        try {
          const { embedding, embeddingUpdatedAt } = await oramaSearchService.indexItem(item);
          const updatedItem = { ...item, embedding, embeddingUpdatedAt };
          
          set((state) => ({
            items: state.items.map((i) =>
              i.id === item.id ? updatedItem : i
            )
          }));
          calendarItemStorage.save(updatedItem).catch(error => {
            console.error('Failed to save indexed item to storage:', error);
          });
        } catch (error) {
          console.error('Failed to index item:', error);
        }

        eventBus.publish({
          type: 'created',
          entityType: 'calendarItem',
          entityId: item.id,
          data: item,
        });

        if (item.type === 'event' && item.startTime && item.endTime && item.status === 'scheduled') {
          const allItems = get().items;
          const healingResult = selfHealingScheduler.processNewEvent(item, allItems);
          applyHealingResult(healingResult, get, set);
        }
      },

      updateItem: async (id, updates) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        const timeChanged = (
          (updates.startTime !== undefined && updates.startTime !== item.startTime) ||
          (updates.endTime !== undefined && updates.endTime !== item.endTime)
        );

        const oldStartTime = item.startTime;
        const oldEndTime = item.endTime;

        const updatedItem = unifiedItemService.updateItem(item, updates);

        set((state) => ({
          items: state.items.map((i) => i.id === id ? updatedItem : i)
        }));

        calendarItemStorage.save(updatedItem).catch(error => {
          console.error('Failed to save updated item to storage:', error);
        });

        try {
          const result = await oramaSearchService.updateDocument(id, updates);
          
          if (result.embedding && result.embeddingUpdatedAt) {
            const embeddedItem = {
              ...updatedItem,
              embedding: result.embedding,
              embeddingUpdatedAt: result.embeddingUpdatedAt,
            };
            set((state) => ({
              items: state.items.map((i) =>
                i.id === id ? embeddedItem : i
              )
            }));
            calendarItemStorage.save(embeddedItem).catch(error => {
              console.error('Failed to save embedded item to storage:', error);
            });
          }
        } catch (error) {
          console.error('Failed to update item in index:', error);
        }

        eventBus.publish({
          type: 'updated',
          entityType: 'calendarItem',
          entityId: id,
          data: updatedItem,
        });

        if (timeChanged && item.type === 'event' && updatedItem.startTime && updatedItem.endTime && !get()._isHealing) {
          set({ _isHealing: true });
          const allItems = get().items;
          const healingResult = selfHealingScheduler.processTimeChange(
            updatedItem, oldStartTime, oldEndTime, allItems
          );
          applyHealingResult(healingResult, get, set);
          set({ _isHealing: false });
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

        const item = get().items.find((i) => i.id === update.id);
        if (item) {
          calendarItemStorage.save({
            ...item,
            embedding: update.embedding,
            embeddingUpdatedAt: update.embeddingUpdatedAt,
          }).catch(error => {
            console.error('Failed to save embedding update to storage:', error);
          });
        }

        oramaSearchService.updateDocument(update.id, {
          embedding: update.embedding,
          embeddingUpdatedAt: update.embeddingUpdatedAt
        }).catch(error => {
          console.error('Failed to update embedding in index:', error);
        });
      },

      deleteItem: async (id) => {
        const deletedItem = get().items.find((i) => i.id === id);

        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        }));

        calendarItemStorage.delete(id).catch(error => {
          console.error('Failed to delete item from storage:', error);
        });

        try {
          await oramaSearchService.deleteFromIndex(id);
        } catch (error) {
          console.error('Failed to delete item from index:', error);
        }

        eventBus.publish({
          type: 'deleted',
          entityType: 'calendarItem',
          entityId: id,
          data: deletedItem,
        });

        if (deletedItem && deletedItem.type === 'event' && deletedItem.startTime && deletedItem.endTime) {
          const allItems = get().items;
          const deletionResult = selfHealingScheduler.processItemDeletion(deletedItem, allItems);

          if (deletionResult.freedTimeRedistributed && deletionResult.scheduledFromFreedTime.length > 0) {
            const rescheduledUpdates = deletionResult.scheduledFromFreedTime.map(r => ({
              id: r.rescheduledItem.id,
              updates: r.rescheduledItem
            }));

            set((state) => ({
              items: state.items.map((i) => {
                const update = rescheduledUpdates.find(u => u.id === i.id);
                return update ? update.updates : i;
              })
            }));

            for (const reschedule of rescheduledUpdates) {
              oramaSearchService.updateDocument(reschedule.id, reschedule.updates).catch(error => {
                console.error(`Failed to update rescheduled item ${reschedule.id}:`, error);
              });
              notifyRescheduled(
                reschedule.updates.title,
                reschedule.id,
                reschedule.updates.metadata.originalSlotStart
                  ? { start: reschedule.updates.metadata.originalSlotStart, end: reschedule.updates.metadata.originalSlotEnd || 0 }
                  : null,
                { start: reschedule.updates.startTime || 0, end: reschedule.updates.endTime || 0 }
              );
            }
          }
        }
      },

      addBatchItems: async (newItems) => {
        set((state) => ({
          items: [...state.items, ...newItems]
        }));

        calendarItemStorage.saveBatch(newItems).catch(error => {
          console.error('Failed to save batch items to storage:', error);
        });

        const results = await Promise.allSettled(
          newItems.map(item => oramaSearchService.indexItem(item))
        );

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to index item ${newItems[index].id}:`, result.reason);
          }
        });

        for (const item of newItems) {
          eventBus.publish({
            type: 'created',
            entityType: 'calendarItem',
            entityId: item.id,
            data: item,
          });
        }
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

        for (const update of updates) {
          const updatedItem = updatedItems.find(i => i.id === update.id);
          if (updatedItem) {
            calendarItemStorage.save(updatedItem).catch(error => {
              console.error(`Failed to save updated batch item ${update.id}:`, error);
            });
          }
        }

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

        for (const update of updates) {
          const updatedItem = updatedItems.find(i => i.id === update.id);
          eventBus.publish({
            type: 'updated',
            entityType: 'calendarItem',
            entityId: update.id,
            data: updatedItem,
          });
        }
      },

      deleteBatchItems: async (ids) => {
        const deletedItems = get().items.filter((item) => ids.includes(item.id));

        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id))
        }));

        calendarItemStorage.deleteBatch(ids).catch(error => {
          console.error('Failed to delete batch items from storage:', error);
        });

        const results = await Promise.allSettled(
          ids.map(id => oramaSearchService.deleteFromIndex(id))
        );

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to delete item ${ids[index]}:`, result.reason);
          }
        });

        for (const item of deletedItems) {
          eventBus.publish({
            type: 'deleted',
            entityType: 'calendarItem',
            entityId: item.id,
            data: item,
          });
        }
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

        const allItems = get().items;
        const healingResult = selfHealingScheduler.processNewEvent(updatedItem, allItems);
        applyHealingResult(healingResult, get, set);

        set((state) => ({
          items: state.items.map((i) => i.id === id ? updatedItem : i)
        }));

        calendarItemStorage.save(updatedItem).catch(error => {
          console.error('Failed to save converted item to storage:', error);
        });

        try {
          await oramaSearchService.updateDocument(id, updatedItem);
        } catch (error) {
          console.error('Failed to update converted item in index:', error);
        }

        eventBus.publish({
          type: 'updated',
          entityType: 'calendarItem',
          entityId: id,
          data: updatedItem,
          metadata: { conversion: 'idea-to-event' },
        });

        if (item.metadata.liquidSchedule?.liquidGroupId) {
          const scheduleResult = liquidScheduler.schedulePendingItems(get().items);
          applyLiquidScheduleResult(scheduleResult, get, set);
        }
      },

      convertToIdea: async (id, metadata) => {
        const item = get().items.find((i) => i.id === id);
        if (!item || item.type !== 'event') return;

        const updatedItem = unifiedItemService.transformToIdea(item, metadata);

        set((state) => ({
          items: state.items.map((i) => i.id === id ? updatedItem : i)
        }));

        calendarItemStorage.save(updatedItem).catch(error => {
          console.error('Failed to save converted item to storage:', error);
        });

        try {
          await oramaSearchService.updateDocument(id, updatedItem);
        } catch (error) {
          console.error('Failed to update converted item in index:', error);
        }

        eventBus.publish({
          type: 'updated',
          entityType: 'calendarItem',
          entityId: id,
          data: updatedItem,
          metadata: { conversion: 'event-to-idea' },
        });
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

      undoReschedule: (itemId: string): boolean => {
        const undoAction = selfHealingScheduler.getUndoAction(itemId);
        if (!undoAction) return false;

        const { originalSlot, originalState } = undoAction;

        const restoredItem = {
          ...get().items.find((item) => item.id === itemId)!,
          startTime: originalSlot.start,
          endTime: originalSlot.end,
          status: originalState as UnifiedCalendarItem['status'],
          updatedAt: Date.now(),
          metadata: {
            ...get().items.find((item) => item.id === itemId)!.metadata,
            liquidSchedule: {
              ...get().items.find((item) => item.id === itemId)!.metadata.liquidSchedule,
              stabilityScore: Math.max(0, (get().items.find((item) => item.id === itemId)!.metadata.liquidSchedule?.stabilityScore ?? 0) - 1),
            },
          },
        };

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? restoredItem : item
          )
        }));

        calendarItemStorage.save(restoredItem).catch(error => {
          console.error(`Failed to save undo-reschedule item ${itemId}:`, error);
        });

        oramaSearchService.updateDocument(itemId, {
          startTime: originalSlot.start,
          endTime: originalSlot.end,
          status: originalState as UnifiedCalendarItem['status'],
        }).catch(error => {
          console.error(`Failed to undo reschedule for item ${itemId}:`, error);
        });

        eventBus.publish({
          type: 'updated',
          entityType: 'calendarItem',
          entityId: itemId,
          data: restoredItem,
          metadata: { action: 'undo-reschedule' },
        });

        return true;
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

        eventBus.publish({
          type: 'created',
          entityType: 'memory',
          entityId: newMemory.id,
          data: newMemory,
        });
        
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

          eventBus.publish({
            type: 'updated',
            entityType: 'memory',
            entityId: id,
            data: updated,
          });
        }
      },

      deleteMemory: async (id) => {
        await memoryService.deleteMemory(id);
        
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));
        
        await get().refreshMemoryStats();

        eventBus.publish({
          type: 'deleted',
          entityType: 'memory',
          entityId: id,
        });
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
      version: 3,
      partialize: (state) => ({
        items: state.items,
        settings: state.settings,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<UnifiedStore>;
        
        if (version < 1) {
          console.log('[UnifiedStore] Migrating from version < 1');
          if (state.items) {
            state.items = state.items.map(item => ({
              ...item,
              metadata: item.metadata || {}
            }));
          }
        }
        
        if (version < 2) {
          console.log('[UnifiedStore] Migrating from version < 2');
          if (state.items) {
            state.items = state.items.map(item => ({
              ...item,
              embedding: item.embedding || [],
              embeddingUpdatedAt: item.embeddingUpdatedAt || 0
            }));
          }
        }

        if (version < 3) {
          console.log('[UnifiedStore] Migrating from version < 3: memories moved to memoryService');
          delete (state as any).memories;
        }
        
        return state;
      }
    }
  )
);