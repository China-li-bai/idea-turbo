# 记忆系统集成改进任务计划

**创建日期**: 2026-04-01  
**基于**: ARCHITECTURE_INTEGRATION_REVIEW.md  
**目标**: 完善记忆系统与现有架构的集成

---

## 📊 任务概览

| 优先级 | 任务ID | 任务名称 | 预计时间 | 状态 |
|--------|--------|----------|----------|------|
| 🔴 高 | hybrid-search | 实现 HybridSearchService | 2 小时 | 待开始 |
| 🔴 高 | unified-store | 更新 UnifiedStore | 1.5 小时 | 待开始 |
| 🔴 高 | use-memories | 创建 useMemories Hook | 1 小时 | 待开始 |
| 🟡 中 | query-perf | 优化查询性能 | 2 小时 | 待开始 |
| 🟡 中 | encryption | 实现数据加密 | 1.5 小时 | 待开始 |
| 🟢 低 | access-control | 添加访问控制 | 1 小时 | 待开始 |

**总预计时间**: 9 小时

---

## 🔴 优先级 1: 集成层面

### 任务 1: 实现 HybridSearchService

**目标**: 统一日程和记忆的搜索接口

**实施步骤**:

#### 1.1 创建服务文件

**文件**: `lib/services/hybridSearchService.ts`

```typescript
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
  
  // 日程搜索选项
  calendarOptions?: {
    types?: Array<'idea' | 'event'>;
    status?: Array<'pending' | 'scheduled' | 'completed' | 'cancelled'>;
    limit?: number;
    similarity?: number;
  };
  
  // 记忆搜索选项
  memoryOptions?: MemorySearchOptions;
  
  // 合并选项
  mergeStrategy?: 'score' | 'time' | 'type';
  maxResults?: number;
}

class HybridSearchServiceImpl {
  async search(options: HybridSearchOptions): Promise<HybridSearchResult> {
    const startTime = Date.now();
    
    // 并行搜索日程和记忆
    const [calendarResults, memoryResults] = await Promise.all([
      this.searchCalendar(options),
      this.searchMemory(options),
    ]);
    
    // 合并结果
    const combined = this.mergeResults(
      calendarResults,
      memoryResults,
      options.mergeStrategy || 'score'
    );
    
    // 限制结果数量
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
      
      return results.map(result => ({
        item: result as UnifiedCalendarItem,
        score: result.score,
        source: 'calendar' as const,
      }));
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
    
    // 根据策略排序
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
```

#### 1.2 添加单元测试

**文件**: `lib/services/__tests__/hybridSearchService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hybridSearchService } from '../hybridSearchService';

vi.mock('../oramaSearchService', () => ({
  oramaSearchService: {
    search: vi.fn().mockResolvedValue([
      { id: '1', title: 'Test Event', score: 0.9, type: 'event' },
    ]),
  },
}));

vi.mock('../memoryService', () => ({
  memoryService: {
    searchMemories: vi.fn().mockResolvedValue({
      memories: [
        { id: 'm1', content: 'Test Memory', metadata: { confidence: 0.8 } },
      ],
    }),
  },
}));

describe('HybridSearchService', () => {
  it('应该合并日程和记忆搜索结果', async () => {
    const result = await hybridSearchService.search({
      query: 'test',
    });
    
    expect(result.calendarItems).toBeDefined();
    expect(result.memories).toBeDefined();
    expect(result.combined).toBeDefined();
  });
  
  it('应该按分数排序结果', async () => {
    const result = await hybridSearchService.search({
      query: 'test',
      mergeStrategy: 'score',
    });
    
    for (let i = 0; i < result.combined.length - 1; i++) {
      expect(result.combined[i].score).toBeGreaterThanOrEqual(
        result.combined[i + 1].score
      );
    }
  });
});
```

#### 1.3 验收标准

- ✅ 能够同时搜索日程和记忆
- ✅ 结果正确合并和排序
- ✅ 单元测试通过
- ✅ 类型检查通过

---

### 任务 2: 更新 UnifiedStore

**目标**: 在统一状态管理中添加记忆管理

**实施步骤**:

#### 2.1 扩展 UnifiedStore 接口

**文件**: `lib/stores/unifiedStore.ts`

```typescript
import { memoryService } from '@/lib/services/memoryService';
import type { MemoryItem, MemorySearchOptions, MemorySearchResult } from '@/types/memory';

interface UnifiedStore {
  // 现有字段
  items: UnifiedCalendarItem[];
  settings: {...};
  aiStatus: {...};
  
  // ✅ 新增：记忆管理
  memories: MemoryItem[];
  memoryStats: {
    shortTerm: number;
    longTerm: number;
    working: number;
    total: number;
  };
  
  // ✅ 新增：记忆操作
  addMemory: (memory: Omit<MemoryItem, 'id' | 'metadata'> & { metadata?: Partial<MemoryItem['metadata']> }) => Promise<MemoryItem>;
  updateMemory: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (options: MemorySearchOptions) => Promise<MemorySearchResult>;
  refreshMemoryStats: () => Promise<void>;
  
  // 现有方法
  // ...
}
```

#### 2.2 实现记忆管理方法

```typescript
export const useUnifiedStore = create<UnifiedStore>()(
  persist(
    (set, get) => ({
      // 现有状态
      items: [],
      settings: {...},
      aiStatus: {...},
      
      // ✅ 新增：记忆状态
      memories: [],
      memoryStats: {
        shortTerm: 0,
        longTerm: 0,
        working: 0,
        total: 0,
      },
      
      // ✅ 新增：添加记忆
      addMemory: async (memory) => {
        const newMemory = await memoryService.addMemory(memory);
        
        set((state) => ({
          memories: [...state.memories, newMemory],
        }));
        
        await get().refreshMemoryStats();
        
        return newMemory;
      },
      
      // ✅ 新增：更新记忆
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
      
      // ✅ 新增：删除记忆
      deleteMemory: async (id) => {
        await memoryService.deleteMemory(id);
        
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));
        
        await get().refreshMemoryStats();
      },
      
      // ✅ 新增：搜索记忆
      searchMemories: async (options) => {
        return await memoryService.searchMemories(options);
      },
      
      // ✅ 新增：刷新统计
      refreshMemoryStats: async () => {
        const stats = await memoryService.getStats();
        
        set({ memoryStats: stats });
      },
      
      // 现有方法
      // ...
    }),
    {
      name: STATE_KEY,
      storage: localforageStorage,
      version: 2,  // ✅ 版本升级
      partialize: (state) => ({
        items: state.items,
        settings: state.settings,
        memories: state.memories,  // ✅ 新增
      }),
    }
  )
);
```

#### 2.3 验收标准

- ✅ 记忆状态正确管理
- ✅ CRUD 操作正常工作
- ✅ 状态持久化正常
- ✅ 类型检查通过

---

### 任务 3: 创建 useMemories Hook

**目标**: 提供响应式的记忆数据访问

**实施步骤**:

#### 3.1 创建 Hook 文件

**文件**: `lib/hooks/useMemories.ts`

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import type { MemoryItem, MemorySearchOptions, MemorySearchResult } from '@/types/memory';

export interface UseMemoriesOptions {
  autoLoad?: boolean;
  searchOptions?: MemorySearchOptions;
}

export interface UseMemoriesReturn {
  // 数据
  memories: MemoryItem[];
  stats: {
    shortTerm: number;
    longTerm: number;
    working: number;
    total: number;
  };
  
  // 状态
  isLoading: boolean;
  error: string | null;
  
  // 操作
  addMemory: (memory: Omit<MemoryItem, 'id' | 'metadata'> & { metadata?: Partial<MemoryItem['metadata']> }) => Promise<MemoryItem>;
  updateMemory: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (options: MemorySearchOptions) => Promise<MemorySearchResult>;
  refresh: () => Promise<void>;
}

export function useMemories(options: UseMemoriesOptions = {}): UseMemoriesReturn {
  const { autoLoad = true, searchOptions } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const memories = useUnifiedStore((state) => state.memories);
  const memoryStats = useUnifiedStore((state) => state.memoryStats);
  const addMemoryStore = useUnifiedStore((state) => state.addMemory);
  const updateMemoryStore = useUnifiedStore((state) => state.updateMemory);
  const deleteMemoryStore = useUnifiedStore((state) => state.deleteMemory);
  const searchMemoriesStore = useUnifiedStore((state) => state.searchMemories);
  const refreshMemoryStats = useUnifiedStore((state) => state.refreshMemoryStats);
  
  // 加载记忆
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
  
  // 添加记忆
  const addMemory = useCallback(async (memory) => {
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
  
  // 更新记忆
  const updateMemory = useCallback(async (id, updates) => {
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
  
  // 删除记忆
  const deleteMemory = useCallback(async (id) => {
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
  
  // 搜索记忆
  const searchMemories = useCallback(async (searchOpts) => {
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
  
  // 刷新
  const refresh = useCallback(async () => {
    await loadMemories();
  }, [loadMemories]);
  
  // 自动加载
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
```

#### 3.2 添加到 hooks 导出

**文件**: `lib/hooks/index.ts`

```typescript
export { useMemories } from './useMemories';
export type { UseMemoriesOptions, UseMemoriesReturn } from './useMemories';

// 现有导出
export { useUnifiedItems } from './useUnifiedItems';
// ...
```

#### 3.3 验收标准

- ✅ Hook 提供响应式数据
- ✅ 操作方法正常工作
- ✅ 错误处理完善
- ✅ 类型检查通过

---

## 🟡 优先级 2: 性能优化

### 任务 4: 优化查询性能

**目标**: 使用索引加速查询，降低查询复杂度

**实施步骤**:

#### 4.1 优化 memoryStorage.ts

**文件**: `lib/storage/memoryStorage.ts`

```typescript
class MemoryStorageImpl implements MemoryStorage {
  // 现有代码...
  
  // ✅ 优化：使用索引加速查询
  async query(options: MemorySearchOptions): Promise<MemorySearchResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    try {
      let memories: MemoryItem[] = [];
      
      // ✅ 优化：使用索引快速定位
      if (options.types && options.types.length === 1) {
        const typeIndex = await this.getIndex<Record<MemoryType, string[]>>('type');
        if (typeIndex && typeIndex[options.types[0]]) {
          const ids = typeIndex[options.types[0]];
          memories = await Promise.all(
            ids.map(id => this.get(id))
          );
          memories = memories.filter((m): m is MemoryItem => m !== null);
        }
      } else if (options.categories && options.categories.length === 1) {
        const categoryIndex = await this.getIndex<Record<MemoryCategory, string[]>>('category');
        if (categoryIndex && categoryIndex[options.categories[0]]) {
          const ids = categoryIndex[options.categories[0]];
          memories = await Promise.all(
            ids.map(id => this.get(id))
          );
          memories = memories.filter((m): m is MemoryItem => m !== null);
        }
      } else {
        // 回退到全量加载
        memories = await this.getAllMemories();
      }
      
      // 后续过滤...
      if (options.tags && options.tags.length > 0) {
        memories = memories.filter(m => 
          m.metadata.tags && 
          options.tags!.some(tag => m.metadata.tags!.includes(tag))
        );
      }
      
      // 其他过滤逻辑...
      
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
  
  // ✅ 新增：批量获取
  private async batchGet(ids: string[]): Promise<MemoryItem[]> {
    const memories = await Promise.all(
      ids.map(id => this.get(id))
    );
    return memories.filter((m): m is MemoryItem => m !== null);
  }
}
```

#### 4.2 实现查询缓存

**文件**: `lib/storage/memoryStorage.ts`

```typescript
class MemoryStorageImpl implements MemoryStorage {
  private cache: Map<string, { data: MemoryItem; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 分钟
  
  async get(id: string): Promise<MemoryItem | null> {
    // 检查缓存
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // 从存储加载
    const memory = await this.store.getItem<MemoryItem>(id);
    
    // 更新缓存
    if (memory) {
      this.cache.set(id, {
        data: memory,
        timestamp: Date.now(),
      });
    }
    
    return memory;
  }
  
  async save(memory: MemoryItem): Promise<void> {
    await this.store.setItem(memory.id, memory);
    await this.updateIndices(memory);
    
    // 更新缓存
    this.cache.set(memory.id, {
      data: memory,
      timestamp: Date.now(),
    });
  }
  
  async delete(id: string): Promise<boolean> {
    const result = await this.store.removeItem(id);
    
    // 清除缓存
    this.cache.delete(id);
    
    return result;
  }
}
```

#### 4.3 验收标准

- ✅ 查询复杂度从 O(n) 降低到 O(log n) 或 O(1)
- ✅ 缓存命中率 > 80%
- ✅ 查询时间 < 100ms
- ✅ 类型检查通过

---

## 🟡 优先级 2: 安全增强

### 任务 5: 实现数据加密

**目标**: 使用 Web Crypto API 加密敏感数据

**实施步骤**:

#### 5.1 创建加密工具

**文件**: `lib/utils/encryption.ts`

```typescript
export class EncryptionUtil {
  private key: CryptoKey | null = null;
  
  async initialize(password: string, salt?: Uint8Array): Promise<void> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    
    this.key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async encrypt(data: string): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }
    
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoder.encode(data)
    );
    
    return { encrypted, iv };
  }
  
  async decrypt(encrypted: ArrayBuffer, iv: Uint8Array): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}

export const encryptionUtil = new EncryptionUtil();
```

#### 5.2 集成到 memoryStorage

**文件**: `lib/storage/memoryStorage.ts`

```typescript
import { encryptionUtil } from '@/lib/utils/encryption';

class MemoryStorageImpl implements MemoryStorage {
  private encryptionEnabled: boolean = false;
  
  async enableEncryption(password: string): Promise<void> {
    await encryptionUtil.initialize(password);
    this.encryptionEnabled = true;
  }
  
  async save(memory: MemoryItem): Promise<void> {
    let dataToStore = memory;
    
    // 加密敏感字段
    if (this.encryptionEnabled && this.isSensitive(memory)) {
      const { encrypted, iv } = await encryptionUtil.encrypt(memory.content);
      dataToStore = {
        ...memory,
        content: '',  // 清空明文
        _encrypted: Array.from(new Uint8Array(encrypted)),
        _iv: Array.from(iv),
      };
    }
    
    await this.store.setItem(memory.id, dataToStore);
    await this.updateIndices(memory);
  }
  
  async get(id: string): Promise<MemoryItem | null> {
    const memory = await this.store.getItem<MemoryItem>(id);
    
    if (!memory) return null;
    
    // 解密敏感字段
    if (memory._encrypted && memory._iv) {
      const decrypted = await encryptionUtil.decrypt(
        new Uint8Array(memory._encrypted).buffer,
        new Uint8Array(memory._iv)
      );
      
      memory.content = decrypted;
      delete memory._encrypted;
      delete memory._iv;
    }
    
    return memory;
  }
  
  private isSensitive(memory: MemoryItem): boolean {
    return memory.category === 'preference' || 
           memory.metadata.confidence > 0.8;
  }
}
```

#### 5.3 验收标准

- ✅ 敏感数据正确加密
- ✅ 加密数据正确解密
- ✅ 性能影响 < 50ms
- ✅ 类型检查通过

---

## 🟢 优先级 3: 访问控制

### 任务 6: 添加访问控制

**目标**: 实现权限级别和访问日志

**实施步骤**:

#### 6.1 定义权限级别

**文件**: `types/memory.ts`

```typescript
export type MemoryAccessLevel = 'public' | 'private' | 'restricted';

export interface MemoryAccessLog {
  memoryId: string;
  action: 'create' | 'read' | 'update' | 'delete';
  timestamp: number;
  userId?: string;
  sessionId?: string;
}
```

#### 6.2 实现访问控制

**文件**: `lib/services/memoryService.ts`

```typescript
class MemoryServiceImpl implements MemorySystem {
  private accessLog: MemoryAccessLog[] = [];
  
  async getMemory(id: string): Promise<MemoryItem | null> {
    const memory = await memoryStorage.get(id);
    
    if (memory) {
      // 记录访问
      await this.recordAccess(id, 'read');
      
      // 检查权限
      if (!this.checkAccess(memory)) {
        throw new MemoryAccessDeniedError(id);
      }
    }
    
    return memory;
  }
  
  private checkAccess(memory: MemoryItem): boolean {
    // 实现权限检查逻辑
    return true;
  }
  
  private async recordAccess(
    memoryId: string,
    action: 'create' | 'read' | 'update' | 'delete'
  ): Promise<void> {
    this.accessLog.push({
      memoryId,
      action,
      timestamp: Date.now(),
    });
    
    // 持久化日志
    await this.persistAccessLog();
  }
  
  private async persistAccessLog(): Promise<void> {
    // 实现日志持久化
  }
}
```

#### 6.3 验收标准

- ✅ 访问权限正确检查
- ✅ 访问日志正确记录
- ✅ 日志持久化正常
- ✅ 类型检查通过

---

## 📝 执行计划

### 第 1 天 (4 小时)

- ✅ 任务 1: HybridSearchService (2 小时)
- ✅ 任务 2: UnifiedStore (1.5 小时)
- ✅ 任务 3: useMemories Hook (0.5 小时)

### 第 2 天 (3 小时)

- ⚠️ 任务 4: 查询性能优化 (2 小时)
- ⚠️ 任务 5: 数据加密 (1 小时)

### 第 3 天 (2 小时)

- ⚠️ 任务 6: 访问控制 (1 小时)
- ⚠️ 集成测试和文档更新 (1 小时)

---

## 📊 验收清单

### 集成层面

- [ ] HybridSearchService 能够搜索日程和记忆
- [ ] UnifiedStore 正确管理记忆状态
- [ ] useMemories Hook 提供响应式数据
- [ ] 所有单元测试通过
- [ ] 类型检查通过

### 性能层面

- [ ] 查询复杂度优化到 O(log n) 或 O(1)
- [ ] 缓存命中率 > 80%
- [ ] 查询时间 < 100ms
- [ ] 内存使用合理

### 安全层面

- [ ] 敏感数据正确加密
- [ ] 访问权限正确检查
- [ ] 访问日志正确记录
- [ ] 无安全漏洞

---

**创建人**: AI Assistant  
**创建日期**: 2026-04-01  
**预计完成**: 2026-04-03
