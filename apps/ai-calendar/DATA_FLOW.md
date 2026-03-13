# 数据流转设计 - 单向数据流

## 核心原则

**数据即唯一真相，存储层是 Single Source of Truth**

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI 层 (React Components)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ CalendarView │  │ TaskList     │  │ Inspiration  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼─────────────────────┼─────────────────────┼────────────┘
          │                     │                     │
          │  读取数据(查询)     │  读取数据(查询)     │  读取数据(查询)
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

## 一、数据流转详解

### 1.1 单向数据流 (Unidirectional Data Flow)

```
用户操作 → 调用 Service 方法 → 更新 Storage → 通知 UI → UI 重新查询数据
```

### 1.2 读操作流程

```typescript
// 组件直接从 Service 读取数据
function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  useEffect(() => {
    // 初始加载
    loadEvents();
    
    // 订阅数据变更
    const unsubscribe = eventService.subscribe(loadEvents);
    return unsubscribe;
  }, []);
  
  const loadEvents = async () => {
    const data = await eventService.getAll({ dateRange: ... });
    setEvents(data);
  };
  
  return <div>{events.map(...)}</div>;
}
```

### 1.3 写操作流程

```typescript
// 组件调用 Service 方法
async function handleCreateEvent(eventData) {
  // 1. 创建数据
  const event = await eventService.create(eventData);
  
  // 2. Service 自动:
  //    - 写入 IndexedDB
  //    - 异步更新向量索引
  //    - 发布数据变更事件
  
  // 3. UI 自动收到通知并重新渲染
}
```

---

## 二、发布订阅机制

### 2.1 事件总线设计

```typescript
type DataChangeEvent = {
  type: 'created' | 'updated' | 'deleted';
  entityType: 'event' | 'task' | 'inspiration';
  entityId?: string;
};

class EventBus {
  private listeners = new Map<string, Set<(event: DataChangeEvent) => void>>();
  
  subscribe(entityType: string, callback: (event: DataChangeEvent) => void) {
    if (!this.listeners.has(entityType)) {
      this.listeners.set(entityType, new Set());
    }
    this.listeners.get(entityType)!.add(callback);
    
    return () => {
      this.listeners.get(entityType)!.delete(callback);
    };
  }
  
  publish(event: DataChangeEvent) {
    const listeners = this.listeners.get(event.entityType);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
    
    // 也可以发布到全局
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => callback(event));
    }
  }
}

export const eventBus = new EventBus();
```

### 2.2 Service 集成事件总线

```typescript
export class EventService {
  async create(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
    // 1. 生成 ID 和时间戳
    const now = new Date();
    const newEvent = {
      ...event,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    
    // 2. 写入 IndexedDB
    await this.db.events.put(newEvent);
    
    // 3. 异步更新向量索引 (不阻塞)
    this.updateVectorIndex(newEvent).catch(console.error);
    
    // 4. 发布变更事件
    eventBus.publish({
      type: 'created',
      entityType: 'event',
      entityId: newEvent.id,
    });
    
    return newEvent;
  }
  
  private async updateVectorIndex(event: CalendarEvent) {
    const text = `${event.title} ${event.description || ''}`;
    await vectorService.indexDocument('event', event.id, text, {
      date: event.startTime,
      viewMode: event.viewMode,
    });
  }
}
```

---

## 三、Zustand 的职责 - 仅管理 UI 状态

### 3.1 简化的 Zustand Store

```typescript
import { create } from 'zustand';

interface UIState {
  // 视图状态
  currentView: 'day' | 'week' | 'month' | 'agenda';
  selectedDate: Date;
  viewMode: 'boss' | 'assistant' | 'personal';
  
  // 交互状态
  selectedEventId: string | null;
  isModalOpen: boolean;
  modalType: 'createEvent' | 'editEvent' | null;
  
  // 加载状态
  isLoading: boolean;
  
  // 筛选状态
  filters: {
    showCompleted: boolean;
    priorityFilter: 'all' | 'high' | 'medium' | 'low';
  };
  
  // Actions
  setCurrentView: (view: UIState['currentView']) => void;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: UIState['viewMode']) => void;
  selectEvent: (id: string | null) => void;
  openModal: (type: UIState['modalType']) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<UIState['filters']>) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'week',
  selectedDate: new Date(),
  viewMode: 'personal',
  selectedEventId: null,
  isModalOpen: false,
  modalType: null,
  isLoading: false,
  filters: {
    showCompleted: true,
    priorityFilter: 'all',
  },
  
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  selectEvent: (id) => set({ selectedEventId: id }),
  openModal: (type) => set({ isModalOpen: true, modalType: type }),
  closeModal: () => set({ isModalOpen: false, modalType: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
}));
```

### 3.2 业务数据不放在 Zustand

```typescript
// ❌ 错误做法：业务数据放在 Zustand
const useCalendarStore = create((set) => ({
  events: [],  // 业务数据不要放这里！
  addEvent: (event) => set(...)
}));

// ✅ 正确做法：组件自己管理业务数据的本地状态
function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  useEffect(() => {
    const load = async () => {
      const data = await eventService.getAll();
      setEvents(data);
    };
    load();
    
    const unsubscribe = eventService.subscribe('event', load);
    return unsubscribe;
  }, []);
  
  return ...;
}
```

---

## 四、自定义 Hook 封装数据查询

### 4.1 useEvents Hook

```typescript
import { useState, useEffect } from 'react';
import { eventService } from '@/lib/services';
import type { CalendarEvent } from '@/types';

export function useEvents(options?: {
  dateRange?: { start: Date; end: Date };
  viewMode?: string;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await eventService.getAll(options);
      setEvents(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    
    const unsubscribe = eventService.subscribe('event', loadEvents);
    return unsubscribe;
  }, [JSON.stringify(options)]);

  return { events, isLoading, error, refresh: loadEvents };
}
```

### 4.2 useTasks Hook

```typescript
export function useTasks(options?: {
  eventId?: string;
  completed?: boolean;
  priority?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = async () => {
    setIsLoading(true);
    const data = await taskService.getAll(options);
    setTasks(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTasks();
    const unsubscribe = taskService.subscribe('task', loadTasks);
    return unsubscribe;
  }, [JSON.stringify(options)]);

  return { tasks, isLoading, refresh: loadTasks };
}
```

---

## 五、完整示例组件

```typescript
import { useEvents } from '@/lib/hooks/useEvents';
import { useUIStore } from '@/lib/stores/uiStore';
import { eventService } from '@/lib/services';

function CalendarView() {
  // UI 状态来自 Zustand
  const { selectedDate, currentView, viewMode } = useUIStore();
  
  // 业务数据来自自定义 Hook
  const { events, isLoading } = useEvents({
    dateRange: getDateRange(selectedDate, currentView),
    viewMode,
  });

  const handleCreateEvent = async (eventData) => {
    await eventService.create(eventData);
    // 不需要手动更新状态，组件会自动重新渲染
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <Calendar 
        events={events}
        onSelectSlot={handleCreateEvent}
      />
    </div>
  );
}
```

---

## 六、优势总结

| 方面 | 传统方案 | 新方案 |
|------|----------|--------|
| **数据一致性** | 容易出现 Store vs Storage 不一致 | Storage 是唯一真相 |
| **状态管理复杂度** | 业务数据 + UI 状态都在 Store | 只有 UI 状态在 Store |
| **数据流** | 双向、混乱 | 单向、清晰 |
| **可测试性** | 需要 mock Store | Service 独立可测试 |
| **缓存策略** | Store 缓存，容易过期 | 组件自己管理，订阅更新 |
| **向量同步** | 需要手动触发 | Service 自动处理 |

---

## 七、关键规则

1. **业务数据永远不在 Zustand** - 只放 UI 状态
2. **Storage 是唯一真相** - 所有写操作都经过 Service → Storage
3. **单向数据流** - 用户操作 → Service → Storage → 通知 → UI 重查
4. **自动向量同步** - Service 写操作后自动更新向量索引
5. **组件订阅数据** - 通过事件总线自动刷新
