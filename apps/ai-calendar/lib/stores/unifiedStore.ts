import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';
import { oramaSearchService } from '@/lib/services/oramaSearchService';

interface UnifiedStore {
  items: UnifiedCalendarItem[];
  settings: {
    viewMode: 'boss' | 'secretary';
    theme: 'light' | 'dark' | 'system';
  };
  _initialized: boolean;
  
  initialize: () => Promise<void>;
  
  addItem: (item: UnifiedCalendarItem) => Promise<void>;
  updateItem: (id: string, updates: Partial<UnifiedCalendarItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  convertToEvent: (id: string, startTime: number, endTime: number, metadata?: Partial<UnifiedCalendarItem['metadata']>) => Promise<void>;
  convertToIdea: (id: string, metadata?: Partial<UnifiedCalendarItem['metadata']>) => Promise<void>;
  
  getItems: (type?: ItemType, status?: ItemStatus) => UnifiedCalendarItem[];
  getItemById: (id: string) => UnifiedCalendarItem | undefined;
  
  updateSettings: (settings: Partial<UnifiedStore['settings']>) => void;
}

export const useUnifiedStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      items: [],
      settings: {
        viewMode: 'boss',
        theme: 'light'
      },
      _initialized: false,
      
      initialize: async () => {
        if (get()._initialized) return;
        
        try {
          await oramaSearchService.initialize();
          set({ _initialized: true });
          console.log('Unified store initialized');
        } catch (error) {
          console.error('Failed to initialize unified store:', error);
        }
      },
      
      addItem: async (item) => {
        set((state) => ({
          items: [...state.items, item]
        }));
        
        try {
          await oramaSearchService.indexItem(item);
        } catch (error) {
          console.error('Failed to index item:', error);
        }
      },
      
      updateItem: async (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: Date.now() }
              : item
          )
        }));
        
        try {
          await oramaSearchService.updateDocument(id, updates);
        } catch (error) {
          console.error('Failed to update item in index:', error);
        }
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
      
      convertToEvent: async (id, startTime, endTime, metadata) => {
        const item = get().items.find((i) => i.id === id);
        if (!item || item.type !== 'idea') return;
        
        const updatedItem: UnifiedCalendarItem = {
          ...item,
          type: 'event',
          startTime,
          endTime,
          status: 'scheduled',
          updatedAt: Date.now(),
          metadata: {
            ...item.metadata,
            ...metadata,
            previousType: 'idea',
            convertedAt: Date.now()
          }
        };
        
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? updatedItem : i))
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
        
        const updatedItem: UnifiedCalendarItem = {
          ...item,
          type: 'idea',
          startTime: null,
          endTime: null,
          status: 'pending',
          updatedAt: Date.now(),
          metadata: {
            ...item.metadata,
            ...metadata,
            previousType: 'event',
            convertedAt: Date.now()
          }
        };
        
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? updatedItem : i))
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
      }
    }),
    {
      name: 'unified-calendar-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        settings: state.settings
      })
    }
  )
);
