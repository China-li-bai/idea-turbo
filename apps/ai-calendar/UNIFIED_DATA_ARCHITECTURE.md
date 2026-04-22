# 统一数据架构设计 v3

> 最后更新: 2026-04-22 | 架构版本: Storage-First

## 核心原则

**从第一性原理出发**：
> "一个灵感，本质上只是一个还没来得及分配时间戳的日程；而一个日程，本质上只是一个被锚定在时间轴上的灵感。"

**Storage-First 数据流**：
> Storage 为真相源，Zustand 为响应式缓存，EventBus 为变更通知总线。

---

## 一、统一的数据结构

### 1.1 UnifiedCalendarItem

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
    priority?: 'high' | 'medium' | 'low'; color?: string;
    reminders?: number[]; repeatRule?: RepeatRule;
    eventType?: 'regular' | 'shift' | 'meeting' | 'personal';
    shiftMetadata?: ShiftMetadata;
    extractedDate?: number; extractedTime?: string;
    extractedLocation?: string; extractedPeople?: string[];
    source?: 'keyboard' | 'voice' | 'clipboard' | 'other';
    previousType?: 'idea' | 'event';
    convertedAt?: number; conversionNotes?: string;
    liquidSchedule?: LiquidScheduleMetadata;
  };
}
```

### 1.2 MemoryItem（分层记忆）

```typescript
interface MemoryItem {
  id: string;
  type: 'short-term' | 'long-term' | 'working';
  category: 'query' | 'result' | 'feedback' | 'preference' | 'pattern' | 'context';
  content: string;
  embedding?: number[];

  metadata: {
    timestamp: number;
    sessionId?: string;
    source: 'user' | 'system' | 'consolidated';
    confidence: number;
    accessCount: number;
    lastAccessedAt: number;
    tags?: string[];
    relatedItemIds?: string[];
    importance: 'low' | 'medium' | 'high';
    expiresAt?: number;
    consolidatedFrom?: string[];
  };
}
```

### 1.3 Schema 对比：分离式 vs 统一式

| 维度 | 分离式（已废弃） | 统一架构 |
|------|----------------|----------|
| 数据源 | events[] + inspirations[] | items: UnifiedCalendarItem[] |
| 类型 | CalendarEvent + Inspiration | type 字段区分 |
| 转换 | 创建新对象+删除旧对象 | 修改字段值 |
| AI 检索 | 查询两个索引 | 一次查询完整上下文 |

---

## 二、存储层架构（v3 核心）

### 2.1 三层存储职责

```
┌─────────────────────────────────────────┐
│           IndexedDB (localforage)        │
│                                         │
│  ┌──────────────┐  ┌────────────────┐   │
│  │ calendarItems │  │ memory         │   │
│  │ storeName:    │  │ storeName:     │   │
│  │ calendar-items│  │ memory         │   │
│  ├──────────────┤  ├────────────────┤   │
│  │ 真相源       │  │ 真相源          │   │
│  │ 日历项 CRUD  │  │ 记忆 CRUD      │   │
│  └──────┬───────┘  └───────┬────────┘   │
│         │                  │             │
│  ┌──────▼───────┐  ┌──────▼────────┐    │
│  │ settings     │  │ oramaIndex    │    │
│  │ storeName:   │  │ storeName:    │    │
│  │ settings     │  │ oramasearch   │    │
│  ├──────────────┤  ├────────────────┤    │
│  │ Zustand persist│ │ 向量索引 blob  │    │
│  │ 管理          │ │ Orama 内部格式  │    │
│  └──────────────┘  └────────────────┘    │
└─────────────────────────────────────────┘
```

### 2.2 calendarItemStorage API

| 方法 | 说明 |
|------|------|
| `save(item)` | 写入/覆盖单个日历项 |
| `get(id)` | 按 ID 读取 |
| `update(id, updates)` | 部分更新（深合并 metadata） |
| `delete(id)` | 删除单个项 |
| `getAll()` | 获取全部日历项 |
| `saveBatch(items)` | 批量写入 |
| `deleteBatch(ids)` | 批量删除 |
| `count()` | 总数统计 |
| `clear()` | 清空存储 |

### 2.3 memoryService — 记忆独立管理

记忆系统完全由 `memoryService` 管理：
- **存储**: `db.memory` (IndexedDB)
- **CRUD**: addMemory / getMemory / updateMemory / deleteMemory
- **搜索**: searchMemories (支持类型/分类/时间/标签过滤)
- **合并**: consolidate (短期→长期记忆压缩)
- **Zustand 缓存**: unifiedStore.memories 仅作响应式视图，不参与持久化

### 2.4 Zustand Persist 配置

```typescript
persist(store, {
  name: 'unified-calendar-state',
  version: 3,
  partialize: (state) => ({
    items: state.items,       // 过渡期保留（旧数据迁移）
    settings: state.settings,
  }),
  migrate: (state, version) => {
    if (version < 3) delete (state as any).memories;
    return state;
  }
})
```

---

## 三、数据流架构

### 3.1 写入路径

```
UI 操作 → Store Action → set() 更新缓存
                      → calendarItemStorage.write() ← 真相源
                      → oramaSearchService.index/update/delete()
                      → eventBus.publish({ type, entityType, entityId })
```

### 3.2 读取路径

```
calendarItemStorage.getAll() → set({ items }) → Zustand selector → Hooks → Components
memoryService.searchMemories() → set({ memories }) → useMemories hook
```

### 3.3 初始化路径

```
initialize():
  ① oramaSearchService.initialize()
  ② calendarItemStorage.initialize()
  ③ memoryService.initialize()
  ④ items = await calendarItemStorage.getAll()
  ⑤ if empty && persistedItems > 0 → 迁移旧数据到 Storage
  ⑥ memories = await memoryService.searchMemories({ limit: 10000 })
  ⑦ 数据一致性检查 + 自动修复索引
```

---

## 四、EventBus 事件总线

### 4.1 支持的事件

```typescript
type DataChangeEvent = {
  type: 'created' | 'updated' | 'deleted';
  entityType: 'calendarItem' | 'memory' | 'event' | ...;
  entityId: string;
  data?: any;
  metadata?: Record<string, any>;
};
```

### 4.2 发布点清单

所有写操作后自动发布事件，包括：
- addItem / updateItem / deleteItem / addBatchItems / updateBatchItems / deleteBatchItems
- convertToEvent / convertToIdea / undoReschedule
- addMemory / updateMemory / deleteMemory
- applyHealingResult (自愈重排)
- applyLiquidScheduleResult (液态调度)

---

## 五、状态机设计

### 5.1 状态转换图

```
                    ┌─────────┐
                    │  IDEA   │
                    │ pending │
                    │ 无时间戳 │
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            │ 用户确认    │ AI 建议    │ 取消
            ↓            ↓            ↓
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │  EVENT   │ │  EVENT   │ │CANCELLED │
      │ scheduled│ │ scheduled│ │ cancelled│
      └────┬─────┘ └────┬─────┘ └──────────┘
           │ 完成完成    │ 重安排
           ↓            ↓
      ┌──────────┐ ┌──────────┐
      │COMPLETED │ │RESCHEDULE│
      └──────────┘ └──────────┘
```

### 5.2 Idea ↔ Event 转换

转换只修改字段值，不创建/删除对象：
- `transformToEvent(idea, startTime, endTime)`: type→'event', status→'scheduled', 记录 previousType
- `transformToIdea(event)`: type→'idea', startTime/endTime→null, status→'pending'

---

## 六、分层记忆系统

### 6.1 当前实现

项目已有完整的分层记忆基础设施：

| 层级 | 类型 | 存储位置 | 生命周期 |
|------|------|---------|---------|
| 工作记忆 | working | memoryService | 会话内有效 |
| 短期记忆 | short-term | memoryService | 可配置过期 |
| 长期记忆 | long-term | memoryService | 持久化 + 合并压缩 |

### 6.2 记忆类别

| category | 用途 | 示例 |
|----------|------|------|
| query | 用户查询记录 | "查一下明天的日程" |
| result | 查询结果反馈 | 返回了 3 个事件 |
| feedback | 用户正负反馈 | "这个推荐不错" |
| preference | 用户偏好学习 | 偏好下午开会 |
| pattern | 行为模式识别 | 每周五固定例会 |
| context | 任务/会话上下文 | 当前正在做的项目 |

### 6.3 合并机制

`memoryService.consolidate()` 将短期记忆压缩为长期记忆：
- 基于访问频率和置信度筛选
- 提取 PatternMemory 作为行为模式
- 低价值记忆归档或删除

### 6.4 与 Mnemosyne/MemOS 的关系

当前实现的 `short-term` / `long-term` / `working` 三层结构已经对齐 MemOS 的核心概念。未来可扩展方向：

| 方向 | 当前状态 | 扩展路径 |
|------|---------|---------|
| Sensory Memory | 未实现 | 输入预处理缓冲（语音/文本原始输入） |
| Core Memory | 部分（preference） | 固定人格/身份记忆，不可遗忘 |
| 向量检索增强 | memoryService 有 embedding | 接入 Orama 实现语义记忆搜索 |
| Recall 机制 | accessCount 计时 | 加权衰减算法（Recency × Frequency × Relevance） |
| Episodic Memory | 未实现 | 事件序列记忆（"上次开会讨论了什么"） |

---

## 七、文件结构

```
lib/
├── stores/
│   └── unifiedStore.ts          ⭐ Zustand + Storage 同步 + EventBus
├── storage/
│   ├── index.ts                 localforage 实例定义
│   ├── calendarItemStorage.ts   ⭐ 新增 - 日历项专用存储
│   ├── memoryStorage.ts         记忆存储底层
│   └── secureMemoryStorage.ts   加密记忆存储
├── services/
│   ├── oramaSearchService.ts    Orama + BGE-M3 向量搜索
│   ├── memoryService.ts         记忆 CRUD + 合并
│   ├── unifiedItemService.ts    值对象工厂 + 类型转换
│   ├── selfHealingScheduler.ts  自愈调度器
│   └── liquidSchedulerService.ts 液态调度器
├── hooks/
│   └── useUnifiedItems.ts       响应式数据 Hook
├── utils/
│   └── eventBus.ts              ⭐ 事件总线
└── types/
    ├── unified.ts               UnifiedCalendarItem 定义
    └── memory.ts                MemoryItem + 分层类型定义
```

---

## 八、实施状态

| 阶段 | 内容 | 状态 |
|------|------|------|
| 类型定义 | UnifiedCalendarItem + MemoryItem | ✅ 完成 |
| 值对象工厂 | unifiedItemService | ✅ 完成 |
| 向量搜索 | Orama + BGE-M3 | ✅ 完成 |
| Storage-First 重构 | calendarItemStorage + EventBus | ✅ 完成 (2026-04-22) |
| 记忆双写修复 | memories 从 persist 移除 | ✅ 完成 (2026-04-22) |
| UI 层适配 | BossView / SecretaryView | ✅ 完成 |
| 数据迁移 | version 3 migrate | ✅ 完成 |
| Sensory Memory | 输入缓冲层 | 📋 待规划 |
| Core Memory | 人格/身份记忆 | 📋 待规划 |
| Episodic Memory | 事件序列记忆 | 📋 待规划 |
