# AI Calendar 数据流架构 v3

> 最后更新: 2026-04-22 | 架构版本: Storage-First

## 核心原则

**Storage 为真相源，Zustand 为响应式缓存，EventBus 为变更通知总线。**

```
写入: UI → Store Action → IndexedDB/Storage (真相源) → Orama (搜索索引) → EventBus (通知)
读取: Storage → Zustand Store (缓存) → Hooks → Components
初始化: Storage.getAll() → Store.items (首次自动从旧 persist 迁移)
```

---

## 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                        视图层 (UI)                           │
│  BossView · SecretaryView · CalendarView                    │
└────────────────────┬────────────────────────────────────────┘
                     │ useUnifiedItems / useMemories / ...
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Hooks 层                               │
│  useUnifiedItems / useEvents / useIdeas / useTodayEvents    │
│  useMemories / useAIStatus                                   │
│  ── 订阅 Zustand store selector，响应式更新                   │
└────────────────────┬────────────────────────────────────────┘
                     │ 调用 store action
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   unifiedStore (Zustand)                     │
│  ┌───────────────────────────────────────────────────┐     │
│  │ items: UnifiedCalendarItem[]  ← 响应式缓存         │     │
│  │ memories: MemoryItem[]        ← 响应式缓存         │     │
│  │ settings: UserSettings       ← 持久化配置          │     │
│  │                                                   │     │
│  │ addItem / updateItem / deleteItem                  │     │
│  │ addMemory / updateMemory / deleteMemory            │     │
│  │ convertToEvent / convertToIdea                     │     │
│  └───────────┬───────────────────────┬───────────────┘     │
│              │ 写入                   │ EventBus 发布       │
│              ▼                       ▼                     │
│  ┌──────────────────┐    ┌──────────────────────┐          │
│  │ calendarItemStorage│   │ memoryService        │          │
│  │ (IndexedDB)      │   │ (IndexedDB)           │          │
│  │ ← 真相源          │   │ ← 真相源              │          │
│  └────────┬─────────┘    └──────────┬───────────┘          │
│           │                         │                       │
│           ▼                         ▼                       │
│  ┌──────────────────────────────────────────┐              │
│  │ oramaSearchService (Orama + BGE-M3)      │              │
│  │ 向量索引 + 全文索引 + 混合搜索             │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## 存储层架构

### 三大存储实例（localforage/IndexedDB）

| 实例名 | storeName | 用途 | 真相源 |
|--------|-----------|------|--------|
| `db.calendarItems` | `calendar-items` | 日历项 CRUD | ✅ |
| `db.memory` | `memory` | 记忆系统 | ✅ (memoryService 管理) |
| `db.settings` | `settings` | 用户设置 | ✅ (persist 管理辅助) |

### calendarItemStorage — 日历项专用存储

**文件**: `lib/storage/calendarItemStorage.ts`

```typescript
class CalendarItemStorageImpl {
  async save(item: UnifiedCalendarItem): Promise<void>;
  async get(id: string): Promise<UnifiedCalendarItem | null>;
  async update(id: string, updates: Partial<...>): Promise<...>;
  async delete(id: string): Promise<boolean>;
  async getAll(): Promise<UnifiedCalendarItem[]>;
  async saveBatch(items: ...): Promise<void>;      // 批量写入
  async deleteBatch(ids: string[]): Promise<number>; // 批量删除
  async count(): Promise<number>;
  async clear(): Promise<void>;
}
export const calendarItemStorage = new CalendarItemStorageImpl();
```

### memoryService — 记忆系统独立管理

**文件**: `lib/services/memoryService.ts`

记忆数据完全由 `memoryService` 管理，不再经过 Zustand persist。
`unifiedStore.memories` 仅作为响应式缓存，从 `memoryService.searchMemories()` 加载。

### Zustand Persist 配置

```typescript
persist(store, {
  name: 'unified-calendar-state',
  version: 3,
  partialize: (state) => ({
    items: state.items,      // 过渡期保留（旧数据迁移用）
    settings: state.settings,
    // ❌ memories 已移除 — 由 memoryService 独立管理
  }),
  migrate: (state, version) => {
    if (version < 3) {
      delete (state as any).memories;  // 清理旧 persist 中的记忆
    }
    return state;
  }
})
```

## EventBus 集成

### 支持的实体类型

```typescript
type EntityType =
  | 'calendarItem'    // 日历项增删改
  | 'memory'          // 记忆增删改
  | 'event' | 'task' | 'inspiration'
  | 'shiftSchedule' | 'settings' | 'searchHistory';
```

### 事件发布点

所有写操作后自动触发：

| 操作 | 事件 type | 触发位置 |
|------|-----------|---------|
| `addItem()` | `created` | unifiedStore.addItem |
| `updateItem()` | `updated` | unifiedStore.updateItem |
| `deleteItem()` | `deleted` | unifiedStore.deleteItem |
| `addMemory()` | `created` | unifiedStore.addMemory |
| `updateMemory()` | `updated` | unifiedStore.updateMemory |
| `deleteMemory()` | `deleted` | unifiedStore.deleteMemory |
| 自愈重排 | `updated` | applyHealingResult |
| 液态调度 | `updated` | applyLiquidScheduleResult |
| 类型转换 | `updated` | convertToEvent / convertToIdea |

### 使用示例

```typescript
import { eventBus } from '@/lib/utils/eventBus';

eventBus.subscribe((event) => {
  switch (event.type) {
    case 'created':
      console.log(`New ${event.entityType}: ${event.entityId}`);
      break;
    case 'updated':
      console.log(`Updated ${event.entityType}: ${event.entityId}`);
      break;
    case 'deleted':
      console.log(`Deleted ${event.entityType}: ${event.entityId}`);
      break;
  }
});
```

## 数据流示例

### 创建日历项

```
1. 用户在 BossView 输入 "明天下午3点开会"
2. NLP 解析 → createEvent()
3. unifiedStore.addItem(event):
   a. set({ items: [...items, event] })          ← 更新缓存
   b. calendarItemStorage.save(event)             ← 写入真相源
   c. oramaSearchService.indexItem(event)         ← 建立向量索引
   d. eventBus.publish({ type:'created', ... })   ← 发布事件
4. selfHealingScheduler.processNewEvent()        ← 冲突检测
5. UI 自动重新渲染
```

### 删除日历项

```
1. 用户点击删除按钮
2. unifiedStore.deleteItem(id):
   a. set({ items: items.filter(...) })
   b. calendarItemStorage.delete(id)              ← 从存储删除
   c. oramaSearchService.deleteFromIndex(id)      ← 删除向量索引
   d. eventBus.publish({ type:'deleted', ... })   ← 发布事件
3. UI 自动重新渲染
```

### 应用启动初始化

```
1. unifiedStore.initialize():
   a. oramaSearchService.initialize()             ← 初始化搜索引擎
   b. calendarItemStorage.initialize()            ← 初始化存储层
   c. memoryService.initialize()                  ← 初始化记忆服务
   d. items = await calendarItemStorage.getAll()  ← 从 Storage 加载
   e. if (items.length === 0 && persistedItems > 0):
      → 迁移旧 persist 数据到 calendarItemStorage  ← 兼容旧版
   f. set({ items })                              ← 设置缓存
   g. memories = await memoryService.searchMemories()  ← 从记忆服务加载
   h. set({ memories })                           ← 设置缓存
   i. 数据一致性检查 + 自动修复
```

## 统一数据结构

### UnifiedCalendarItem

```typescript
interface UnifiedCalendarItem {
  id: string;
  type: 'idea' | 'event';
  title: string;
  content: string;
  startTime: number | null;
  endTime: number | null;
  isAllDay: boolean;
  embedding?: number[];              // BGE-M3 1024维向量
  embeddingUpdatedAt: number;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  metadata: {
    location?: string; tags?: string[];
    priority?: 'high' | 'medium' | 'low';
    reminders?: number[]; repeatRule?: RepeatRule;
    eventType?: 'regular' | 'shift' | 'meeting' | 'personal';
    extractedDate?: number; extractedTime?: string;
    source?: 'keyboard' | 'voice' | 'clipboard';
    previousType?: 'idea' | 'event'; convertedAt?: number;
    liquidSchedule?: LiquidScheduleMetadata;
  };
}
```

### MemoryItem（分层记忆）

```typescript
interface MemoryItem {
  id: string;
  type: 'short-term' | 'long-term' | 'working';
  category: 'query' | 'result' | 'feedback' | 'preference' | 'pattern' | 'context';
  content: string;
  embedding?: number[];
  metadata: {
    timestamp: number;
    source: 'user' | 'system' | 'consolidated';
    confidence: number;
    accessCount: number;
    importance: 'low' | 'medium' | 'high';
    expiresAt?: number;
    consolidatedFrom?: string[];  // 合并来源追踪
  };
}
```

## 文件清单

### 新增文件
| 文件 | 职责 |
|------|------|
| `lib/storage/calendarItemStorage.ts` | 日历项 IndexedDB 存储层 |

### 核心修改文件
| 文件 | 变更 |
|------|------|
| `lib/stores/unifiedStore.ts` | 全部写操作同步 Storage + EventBus；initialize 从 Storage 加载；version 升至 3 |
| `lib/storage/index.ts` | 新增 `calendarItems` 存储实例 |
| `lib/utils/eventBus.ts` | 新增 `calendarItem` / `memory` 实体类型 |

### 未修改（保持不变）
| 文件 | 说明 |
|------|------|
| `lib/hooks/useUnifiedItems.ts` | 通过 Zustand selector 读取，无需修改 |
| `lib/services/memoryService.ts` | 已是独立真相源，无需修改 |
| `lib/services/oramaSearchService.ts` | 向量搜索服务不变 |
| `lib/services/unifiedItemService.ts` | 值对象工厂不变 |

## 最佳实践

### ✅ 正确做法

1. **写操作走 Store Action**
   ```typescript
   const { addItem } = useUnifiedStore();
   await addItem(newItem);  // 自动写 Storage + Orama + EventBus
   ```

2. **读操作走 Hooks**
   ```typescript
   const { items } = useUnifiedItems();  // 响应式订阅
   ```

3. **跨组件通信走 EventBus**
   ```typescript
   eventBus.subscribe((e) => { /* 处理变更 */ });
   ```

### ❌ 避免

1. **直接操作 Storage 跳过 Store** — 导致缓存不一致
2. **直接修改 State 对象** — 违反不可变原则
3. **绕过 EventBus 自行通知** — 其他组件无法感知变更

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v3 | 2026-04-22 | Storage-First 重构：calendarItemStorage 真相源、EventBus 接入、memories 双写修复 |
| v2 | 2026-04-20 | 统一数据结构：UnifiedCalendarItem、BGE-M3 向量模型升级 |
| v1 | 初始版 | 分离式数据架构（已废弃） |
