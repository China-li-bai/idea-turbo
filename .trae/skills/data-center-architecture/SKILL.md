---
name: "data-center-architecture"
description: "AI智能日历数据中心架构设计与实现。包括单向数据流、事件总线、IndexedDB存储、向量搜索集成。适用于需要规划本地优先数据层的场景。"
---

# 数据中心架构设计 (Data Center Architecture)

本 skill 提供 AI 智能日历项目的完整数据中心架构设计与实现方案。

---

## 一、核心设计原则

### 1.1 单向数据流 (Unidirectional Data Flow)

```
用户操作 → Service → Storage → 事件总线 → UI 重新查询
```

**关键原则：**
- **Storage 是唯一真相源 (Single Source of Truth)**
- 业务数据永远不在 Zustand 中
- Zustand 只管理 UI 状态

### 1.2 数据分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI 层 (React Components)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ CalendarView │  │ TaskList     │  │ Inspiration  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼─────────────────────┼─────────────────────┼────────────┘
          │                     │                     │
          │  useEvents()        │  useTasks()         │  useInspirations()
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    数据服务层 (Data Services)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ EventService   │ TaskService   │ InspirationService       │  │
│  │ - get()        │ - get()       │ - get()                  │  │
│  │ - getAll()     │ - getAll()    │ - getAll()               │  │
│  │ - create()     │ - create()    │ - create()               │  │
│  │ - update()     │ - update()    │ - update()               │  │
│  │ - delete()     │ - delete()    │ - delete()               │  │
│  └────────────┬───────────────────┬───────────────────┬───────┘  │
└───────────────┼───────────────────┼───────────────────┼──────────┘
                │                   │                   │
                │  写操作            │  写操作            │  写操作
                │  (触发数据变更)     │  (触发数据变更)     │  (触发数据变更)
                ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                  存储引擎层 (Storage Engine)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ IndexedDB (localforage)          EdgeVec (WASM)          │  │
│  │ - events                         - calendar-vectors        │  │
│  │ - tasks                                                   │  │
│  │ - inspirations                                           │  │
│  │ - settings                                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                ▲
                │
                │  数据变更通知 (发布订阅)
                │
┌─────────────────────────────────────────────────────────────────┐
│                  Zustand 状态层 (仅 UI 状态)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ UI 状态 (非业务数据):                                     │  │
│  │ - 当前视图: day/week/month                                │  │
│  │ - 选中的日程 ID                                           │  │
│  │ - 模态框显示状态                                          │  │
│  │ - 加载状态                                                │  │
│  │ - 筛选条件                                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、目录结构

```
apps/ai-calendar/
├── DATA_FLOW.md                    # 数据流转设计文档
├── DATA_CENTER.md                  # 数据中心完整设计
├── lib/
│   ├── storage/
│   │   └── index.ts                # IndexedDB 存储封装
│   ├── utils/
│   │   ├── eventBus.ts             # 事件总线
│   │   └── index.ts
│   ├── stores/
│   │   └── uiStore.ts              # 简化的 UI 状态
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   ├── useTasks.ts
│   │   ├── useInspirations.ts
│   │   └── index.ts
│   └── services/
│       ├── eventService.ts
│       ├── taskService.ts
│       ├── inspirationService.ts
│       ├── vectorService.ts
│       └── index.ts
└── types/
    └── index.ts                    # 完整数据模型
```

---

## 三、核心模块说明

### 3.1 事件总线 (EventBus)

**文件**: `lib/utils/eventBus.ts`

**功能**: 发布订阅模式，用于数据变更通知

```typescript
import { eventBus } from '@/lib/utils/eventBus';

// 订阅数据变更
const unsubscribe = eventBus.subscribe('event', (event) => {
  console.log('Event changed:', event);
});

// 发布数据变更
eventBus.publish({
  type: 'created',
  entityType: 'event',
  entityId: '123',
});
```

### 3.2 IndexedDB 存储封装

**文件**: `lib/storage/index.ts`

**功能**: 基于 localforage 的多 store 封装

```typescript
import { db, getAllFromStore } from '@/lib/storage';

// 写入数据
await db.events.setItem('event-id', eventData);

// 读取数据
const event = await db.events.getItem('event-id');

// 获取所有数据
const allEvents = await getAllFromStore<CalendarEvent>(db.events);
```

### 3.3 UI Store (Zustand)

**文件**: `lib/stores/uiStore.ts`

**功能**: 仅管理 UI 状态，不包含业务数据

```typescript
import { useUIStore } from '@/lib/stores/uiStore';

function MyComponent() {
  const { 
    currentView, 
    selectedDate, 
    setCurrentView 
  } = useUIStore();
  
  return (
    <div>
      <button onClick={() => setCurrentView('month')}>
        月视图
      </button>
    </div>
  );
}
```

### 3.4 自定义 Hooks

**文件**: `lib/hooks/useEvents.ts`, `useTasks.ts`, `useInspirations.ts`

**功能**: 封装数据查询和订阅逻辑

```typescript
import { useEvents } from '@/lib/hooks/useEvents';

function CalendarView() {
  const { events, isLoading, error } = useEvents({
    dateRange: { start: weekStart, end: weekEnd },
    viewMode: 'boss',
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMsg error={error} />;
  
  return <Calendar events={events} />;
}
```

### 3.5 数据服务层

**文件**: `lib/services/eventService.ts`, `taskService.ts`, etc.

**功能**: 统一数据操作接口

```typescript
import { eventService } from '@/lib/services';

// 创建日程
const newEvent = await eventService.create({
  title: '团队会议',
  startTime: new Date(),
  endTime: new Date(Date.now() + 3600000),
  isAllDay: false,
  viewMode: 'personal',
  reminders: [60],
});

// 更新日程
await eventService.update(eventId, {
  title: '更新后的标题',
});

// 删除日程
await eventService.delete(eventId);
```

---

## 四、完整使用示例

### 4.1 组件集成示例

```typescript
import { useEvents } from '@/lib/hooks/useEvents';
import { useUIStore } from '@/lib/stores/uiStore';
import { eventService } from '@/lib/services';

function CalendarPage() {
  // UI 状态来自 Zustand
  const { selectedDate, currentView, viewMode } = useUIStore();
  
  // 业务数据来自 Hook
  const { events, isLoading } = useEvents({
    viewMode,
    dateRange: getDateRange(selectedDate, currentView),
  });

  const handleCreateEvent = async (eventData) => {
    // 只需要调用 Service
    await eventService.create(eventData);
    // UI 会自动刷新！
  };

  const handleUpdateEvent = async (id, updates) => {
    await eventService.update(id, updates);
    // UI 会自动刷新！
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <Calendar 
        events={events}
        onSelectSlot={handleCreateEvent}
        onSelectEvent={(event) => handleUpdateEvent(event.id, { ... })}
      />
    </div>
  );
}
```

---

## 五、数据模型扩展

### 5.1 CalendarEvent (日程)

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isAllDay: boolean;
  repeatRule?: RepeatRule;
  reminders: number[];
  
  // Boss/秘书视角
  viewMode: 'boss' | 'assistant' | 'personal';
  linkedEventId?: string;
  linkedTaskIds?: string[];
  
  // 向量搜索相关
  vectorId?: string;
  embeddingUpdatedAt?: Date;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  color?: string;
}
```

### 5.2 Task (任务)

```typescript
interface Task {
  id: string;
  eventId?: string;
  title: string;
  description?: string;
  dueTime?: Date;
  completed: boolean;
  completedAt?: Date;
  priority: 'high' | 'medium' | 'low';
  
  resources?: Resource[];
  dependsOnTaskIds?: string[];
  
  vectorId?: string;
  embeddingUpdatedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3 Inspiration (灵光时刻)

```typescript
interface Inspiration {
  id: string;
  content: string;
  captureTime: Date;
  type: 'todo' | 'event' | 'note' | 'raw';
  processed: boolean;
  processedAt?: Date;
  
  extractedDate?: Date;
  extractedTime?: string;
  extractedLocation?: string;
  extractedPeople?: string[];
  
  convertedToEventId?: string;
  convertedToTaskId?: string;
  conversionNotes?: string;
  
  vectorId?: string;
  embeddingUpdatedAt?: Date;
  
  source?: 'keyboard' | 'voice' | 'clipboard' | 'other';
}
```

---

## 六、关键规则

1. **业务数据永远不在 Zustand** - 只放 UI 状态
2. **Storage 是唯一真相** - 所有写操作都经过 Service → Storage
3. **单向数据流** - 用户操作 → Service → Storage → 通知 → UI 重查
4. **自动向量同步** - Service 写操作后自动更新向量索引
5. **组件订阅数据** - 通过事件总线自动刷新

---

## 七、优势总结

| 方面 | 传统方案 | 新方案 |
|------|----------|--------|
| **数据一致性** | 容易出现 Store vs Storage 不一致 | Storage 是唯一真相 |
| **状态管理复杂度** | 业务数据 + UI 状态都在 Store | 只有 UI 状态在 Store |
| **数据流** | 双向、混乱 | 单向、清晰 |
| **可测试性** | 需要 mock Store | Service 独立可测试 |
| **缓存策略** | Store 缓存，容易过期 | 组件自己管理，订阅更新 |
| **向量同步** | 需要手动触发 | Service 自动处理 |

---

## 八、参考文档

- `DATA_CENTER.md` - 数据中心完整设计文档
- `DATA_FLOW.md` - 数据流转详细设计
- 项目类型定义: `types/index.ts`
