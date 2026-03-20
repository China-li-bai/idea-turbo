import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUnifiedStore } from '../unifiedStore';
import type { UnifiedCalendarItem } from '@/types/unified';

vi.mock('@/lib/services/oramaSearchService', () => ({
  oramaSearchService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    indexItem: vi.fn().mockResolvedValue(undefined),
    updateDocument: vi.fn().mockResolvedValue(undefined),
    deleteFromIndex: vi.fn().mockResolvedValue(undefined),
    getIsReady: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('@/lib/storage', () => ({
  localforage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined)
  }
}));

const createTestItem = (
  id: string,
  type: 'idea' | 'event' = 'event',
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' = 'scheduled'
): UnifiedCalendarItem => ({
  id,
  type,
  title: `Item ${id}`,
  content: `Content for ${id}`,
  startTime: type === 'event' ? Date.now() : null,
  endTime: type === 'event' ? Date.now() + 3600000 : null,
  isAllDay: false,
  embedding: [],
  embeddingUpdatedAt: 0,
  status,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {}
});

describe('UnifiedStore - 批量操作', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUnifiedStore.setState({
      items: [],
      settings: { viewMode: 'boss', theme: 'light' },
      aiStatus: { isReady: false, isLoading: false, error: null },
      _initialized: false
    });
  });

  describe('addBatchItems - 批量添加', () => {
    it('应该批量添加多个项目', async () => {
      const items = [
        createTestItem('item-1'),
        createTestItem('item-2'),
        createTestItem('item-3')
      ];
      
      await useUnifiedStore.getState().addBatchItems(items);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(3);
      expect(state.items.map(i => i.id)).toEqual(['item-1', 'item-2', 'item-3']);
    });

    it('应该保留现有项目', async () => {
      const existingItem = createTestItem('existing');
      useUnifiedStore.setState({ items: [existingItem] });
      
      const newItems = [createTestItem('new-1'), createTestItem('new-2')];
      await useUnifiedStore.getState().addBatchItems(newItems);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(3);
      expect(state.items.find(i => i.id === 'existing')).toBeDefined();
    });

    it('应该处理空数组', async () => {
      await useUnifiedStore.getState().addBatchItems([]);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(0);
    });

    it('应该正确处理 idea 和 event 类型', async () => {
      const items = [
        createTestItem('idea-1', 'idea'),
        createTestItem('event-1', 'event')
      ];
      
      await useUnifiedStore.getState().addBatchItems(items);
      
      const state = useUnifiedStore.getState();
      expect(state.items.filter(i => i.type === 'idea')).toHaveLength(1);
      expect(state.items.filter(i => i.type === 'event')).toHaveLength(1);
    });
  });

  describe('updateBatchItems - 批量更新', () => {
    it('应该批量更新多个项目', async () => {
      const items = [
        createTestItem('item-1'),
        createTestItem('item-2'),
        createTestItem('item-3')
      ];
      useUnifiedStore.setState({ items });
      
      const updates = [
        { id: 'item-1', updates: { title: 'Updated Item 1' } },
        { id: 'item-2', updates: { status: 'completed' as const } }
      ];
      
      await useUnifiedStore.getState().updateBatchItems(updates);
      
      const state = useUnifiedStore.getState();
      expect(state.items.find(i => i.id === 'item-1')?.title).toBe('Updated Item 1');
      expect(state.items.find(i => i.id === 'item-2')?.status).toBe('completed');
      expect(state.items.find(i => i.id === 'item-3')?.title).toBe('Item item-3');
    });

    it('应该更新 updatedAt 时间戳', async () => {
      const item = createTestItem('item-1');
      const oldUpdatedAt = item.updatedAt;
      useUnifiedStore.setState({ items: [item] });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await useUnifiedStore.getState().updateBatchItems([
        { id: 'item-1', updates: { title: 'Updated' } }
      ]);
      
      const state = useUnifiedStore.getState();
      const updatedItem = state.items.find(i => i.id === 'item-1');
      expect(updatedItem?.updatedAt).toBeGreaterThan(oldUpdatedAt);
    });

    it('应该忽略不存在的项目', async () => {
      const items = [createTestItem('item-1')];
      useUnifiedStore.setState({ items });
      
      await useUnifiedStore.getState().updateBatchItems([
        { id: 'non-existent', updates: { title: 'Updated' } }
      ]);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(1);
    });

    it('应该处理空更新数组', async () => {
      const items = [createTestItem('item-1')];
      useUnifiedStore.setState({ items });
      
      await useUnifiedStore.getState().updateBatchItems([]);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(1);
    });

    it('应该支持更新 metadata', async () => {
      const item = createTestItem('item-1');
      useUnifiedStore.setState({ items: [item] });
      
      await useUnifiedStore.getState().updateBatchItems([
        { 
          id: 'item-1', 
          updates: { 
            metadata: { priority: 'high', tags: ['important'] } 
          } 
        }
      ]);
      
      const state = useUnifiedStore.getState();
      const updatedItem = state.items.find(i => i.id === 'item-1');
      expect(updatedItem?.metadata.priority).toBe('high');
      expect(updatedItem?.metadata.tags).toEqual(['important']);
    });
  });

  describe('deleteBatchItems - 批量删除', () => {
    it('应该批量删除多个项目', async () => {
      const items = [
        createTestItem('item-1'),
        createTestItem('item-2'),
        createTestItem('item-3')
      ];
      useUnifiedStore.setState({ items });
      
      await useUnifiedStore.getState().deleteBatchItems(['item-1', 'item-3']);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('item-2');
    });

    it('应该处理不存在的 ID', async () => {
      const items = [createTestItem('item-1')];
      useUnifiedStore.setState({ items });
      
      await useUnifiedStore.getState().deleteBatchItems(['non-existent', 'item-1']);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(0);
    });

    it('应该处理空 ID 数组', async () => {
      const items = [createTestItem('item-1')];
      useUnifiedStore.setState({ items });
      
      await useUnifiedStore.getState().deleteBatchItems([]);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(1);
    });

    it('应该正确删除所有项目', async () => {
      const items = [
        createTestItem('item-1'),
        createTestItem('item-2')
      ];
      useUnifiedStore.setState({ items });
      
      await useUnifiedStore.getState().deleteBatchItems(['item-1', 'item-2']);
      
      const state = useUnifiedStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('数据一致性', () => {
    it('批量操作后 getItems 应返回正确结果', async () => {
      const items = [
        createTestItem('idea-1', 'idea', 'pending'),
        createTestItem('event-1', 'event', 'scheduled'),
        createTestItem('event-2', 'event', 'completed')
      ];
      await useUnifiedStore.getState().addBatchItems(items);
      
      const state = useUnifiedStore.getState();
      
      expect(state.getItems('idea')).toHaveLength(1);
      expect(state.getItems('event')).toHaveLength(2);
      expect(state.getItems(undefined, 'completed')).toHaveLength(1);
      expect(state.getItems('event', 'scheduled')).toHaveLength(1);
    });

    it('getItemById 应返回正确的项目', async () => {
      const items = [createTestItem('item-1'), createTestItem('item-2')];
      await useUnifiedStore.getState().addBatchItems(items);
      
      const state = useUnifiedStore.getState();
      const found = state.getItemById('item-1');
      
      expect(found).toBeDefined();
      expect(found?.id).toBe('item-1');
    });

    it('批量更新后 getItemById 应返回更新后的数据', async () => {
      const items = [createTestItem('item-1')];
      useUnifiedStore.setState({ items });
      
      await useUnifiedStore.getState().updateBatchItems([
        { id: 'item-1', updates: { title: 'Updated Title' } }
      ]);
      
      const state = useUnifiedStore.getState();
      const found = state.getItemById('item-1');
      
      expect(found?.title).toBe('Updated Title');
    });
  });

  describe('状态管理', () => {
    it('settings 应正确更新', () => {
      useUnifiedStore.getState().updateSettings({ viewMode: 'secretary' });
      
      const state = useUnifiedStore.getState();
      expect(state.settings.viewMode).toBe('secretary');
    });

    it('settings 应部分更新', () => {
      useUnifiedStore.setState({ settings: { viewMode: 'boss', theme: 'light' } });
      
      useUnifiedStore.getState().updateSettings({ theme: 'dark' });
      
      const state = useUnifiedStore.getState();
      expect(state.settings.viewMode).toBe('boss');
      expect(state.settings.theme).toBe('dark');
    });
  });
});
