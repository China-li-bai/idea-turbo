# AI Calendar 数据流架构

## 架构概览

本项目采用**单向数据流**架构，确保数据的一致性和可预测性。

```
┌─────────────────────────────────────────────────────────────┐
│                        视图层 (UI Layer)                      │
│  BossView, SecretaryView, CalendarView, etc.                │
└────────────────────┬────────────────────────────────────────┘
                     │ 使用 Hooks
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Hooks 层 (Hooks Layer)                    │
│  useEvents, useTasks, useInspirations, useSchedules         │
└────────────────────┬────────────────────────────────────────┘
                     │ 调用服务
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   服务层 (Service Layer)                     │
│  eventService, taskService, inspirationService              │
└────────────────────┬────────────────────────────────────────┘
                     │ 使用适配器
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               数据适配器层 (Adapter Layer)                   │
│  dataStoreAdapter - 统一的数据访问接口                       │
└────────────────────┬────────────────────────────────────────┘
                     │ 访问存储
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                 数据存储层 (Store Layer)                     │
│  Zustand Store + IndexedDB 持久化                           │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 数据存储层 (Store Layer)

**文件**: `lib/stores/dataStore.ts`

**职责**:
- 使用 Zustand 管理全局状态
- 使用 IndexedDB (通过 localforage) 实现数据持久化
- 提供响应式的数据访问接口

**核心数据结构**:
```typescript
interface DataState {
  events: CalendarEvent[];        // 日程事件
  tasks: Task[];                  // 任务列表
  inspirations: Inspiration[];    // 灵感记录
  schedules: ShiftSchedule[];     // 排班计划
  settings: UserSettings;         // 用户设置
  searchHistory: SearchHistory[]; // 搜索历史
}
```

**特性**:
- ✅ 自动持久化到 IndexedDB
- ✅ 类型安全的状态管理
- ✅ 内置向量索引集成

### 2. 数据适配器层 (Adapter Layer)

**文件**: `lib/services/dataStoreAdapter.ts`

**职责**:
- 提供统一的数据访问接口
- 封装复杂的数据查询逻辑
- 屏蔽底层存储实现细节

**核心方法**:
```typescript
class DataStoreAdapter {
  // 事件操作
  getAllEvents(options?): Promise<CalendarEvent[]>;
  getEventById(id): Promise<CalendarEvent | null>;
  addEvent(event): Promise<CalendarEvent>;
  updateEvent(id, updates): Promise<CalendarEvent | null>;
  deleteEvent(id): Promise<boolean>;
  
  // 任务操作
  getAllTasks(options?): Promise<Task[]>;
  addTask(task): Promise<Task>;
  updateTask(id, updates): Promise<Task | null>;
  
  // 灵感操作
  getAllInspirations(options?): Promise<Inspiration[]>;
  addInspiration(inspiration): Promise<Inspiration>;
  
  // 排班操作
  getAllSchedules(): Promise<ShiftSchedule[]>;
  
  // 设置操作
  getSettings(): Promise<UserSettings | null>;
  saveSettings(settings): Promise<UserSettings>;
}
```

### 3. 服务层 (Service Layer)

**文件**: `lib/services/*.ts`

**职责**:
- 实现业务逻辑
- 数据验证和转换
- 跨实体操作

**核心服务**:

#### EventService
```typescript
class EventService {
  create(event): Promise<CalendarEvent>;
  get(id): Promise<CalendarEvent | null>;
  getAll(options?): Promise<CalendarEvent[]>;
  update(id, updates): Promise<CalendarEvent>;
  delete(id): Promise<void>;
  checkConflict(startTime, endTime): Promise<CalendarEvent[]>;
}
```

#### InspirationService
```typescript
class InspirationService {
  create(inspiration): Promise<Inspiration>;
  get(id): Promise<Inspiration | null>;
  getAll(options?): Promise<Inspiration[]>;
  update(id, updates): Promise<Inspiration>;
  delete(id): Promise<void>;
  markProcessed(id, conversionData?): Promise<Inspiration>;
}
```

#### TaskService
```typescript
class TaskService {
  create(task): Promise<Task>;
  get(id): Promise<Task | null>;
  getAll(options?): Promise<Task[]>;
  update(id, updates): Promise<Task>;
  toggleComplete(id): Promise<void>;
}
```

### 4. Hooks 层 (Hooks Layer)

**文件**: `lib/hooks/useUnifiedData.ts`

**职责**:
- 提供响应式的数据访问接口
- 封装常用的数据操作
- 与 React 组件生命周期集成

**核心 Hooks**:

#### useEvents
```typescript
function useEvents() {
  return {
    events: CalendarEvent[];
    loading: boolean;
    addEvent: (event) => Promise<CalendarEvent>;
    updateEvent: (id, updates) => Promise<CalendarEvent | null>;
    deleteEvent: (id) => Promise<boolean>;
    getEventById: (id) => CalendarEvent | undefined;
  };
}
```

#### useInspirations
```typescript
function useInspirations() {
  return {
    inspirations: Inspiration[];
    loading: boolean;
    addInspiration: (inspiration) => Promise<Inspiration>;
    updateInspiration: (id, updates) => Promise<Inspiration | null>;
    deleteInspiration: (id) => Promise<boolean>;
    processInspiration: (id) => Promise<void>;
  };
}
```

#### useTasks
```typescript
function useTasks() {
  return {
    tasks: Task[];
    loading: boolean;
    addTask: (task) => Promise<Task>;
    updateTask: (id, updates) => Promise<Task | null>;
    deleteTask: (id) => Promise<boolean>;
    toggleTaskComplete: (id) => Promise<void>;
  };
}
```

### 5. 视图层 (UI Layer)

**文件**: `components/ui/*.tsx`

**职责**:
- 渲染用户界面
- 响应用户交互
- 调用 Hooks 进行数据操作

**核心组件**:

#### BossView
```typescript
export default function BossView() {
  const { events, deleteEvent } = useEvents();
  const { inspirations, addInspiration, deleteInspiration } = useInspirations();
  
  // 处理用户输入
  const processInput = async (text: string) => {
    const result = await parseNaturalLanguage(text);
    if (result.type === 'event') {
      await eventService.create({ ... });
    } else {
      await inspirationService.create({ content: text, ... });
    }
  };
  
  return (
    <section>
      {/* 时间轴显示今日事件 */}
      {/* 灵感胶囊显示未处理灵感 */}
    </section>
  );
}
```

#### SecretaryView
```typescript
export default function SecretaryView() {
  const { events } = useEvents();
  const [messages, setMessages] = useState<Message[]>([]);
  
  // 处理用户指令
  const handleSend = async () => {
    const response = await aiService.chat([...]);
    setMessages([...messages, response]);
  };
  
  return (
    <section>
      {/* AI 对话界面 */}
    </section>
  );
}
```

## 数据流示例

### 示例 1: 创建新事件

```typescript
// 1. 用户在 BossView 输入框输入
const userInput = "明天下午3点开会讨论项目进度";

// 2. BossView 调用 AI 解析服务
const result = await parseNaturalLanguage(userInput);

// 3. 根据解析结果调用事件服务
if (result.type === 'event') {
  const event = await eventService.create({
    title: result.title,
    startTime: result.date,
    endTime: new Date(result.date.getTime() + 60 * 60000),
    // ...
  });
}

// 4. eventService 调用 dataStoreAdapter
const savedEvent = await dataStoreAdapter.addEvent(event);

// 5. dataStoreAdapter 更新 Zustand store
useDataStore.getState().addEvent(event);

// 6. Zustand 自动触发组件重新渲染
// BossView 中的 events 列表自动更新
```

### 示例 2: 删除灵感

```typescript
// 1. 用户点击删除按钮
const handleDeleteInspiration = async (id: string) => {
  await deleteInspiration(id);
};

// 2. deleteInspiration 来自 useInspirations hook
const { deleteInspiration } = useInspirations();

// 3. hook 调用 Zustand store 的 deleteInspiration
useDataStore.getState().deleteInspiration(id);

// 4. Zustand 更新状态并自动持久化到 IndexedDB
// 5. 组件自动重新渲染，灵感从列表中移除
```

### 示例 3: 查询今日事件

```typescript
// 1. BossView 组件挂载
const { events } = useEvents();

// 2. 过滤今日事件
const todayEvents = events.filter(e => {
  const eventDate = new Date(e.startTime);
  return eventDate.toDateString() === today.toDateString();
});

// 3. 按时间排序
todayEvents.sort((a, b) => 
  new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
);

// 4. 渲染事件列表
todayEvents.map(event => <EventCard event={event} />);
```

## 数据持久化

### IndexedDB 存储

```typescript
// 使用 localforage 配置 IndexedDB
localforage.config({
  name: 'ai-calendar',
  version: 1.0,
  storeName: 'zustand_store',
});

// Zustand persist 中间件自动同步
persist(
  storeImplementation,
  {
    name: 'ai-calendar-data',
    storage: createJSONStorage(() => createIndexedDBStorage('data')),
  }
)
```

### 数据同步流程

```
用户操作 → Zustand State → IndexedDB
    ↑                        ↓
    └──── 自动同步 ──────────┘
```

## 向量搜索集成

### 自动索引

```typescript
// 在 dataStore 中自动索引新数据
addEvent: async (event) => {
  const newEvent = { ...event, id: crypto.randomUUID() };
  
  // 自动创建向量索引
  try {
    await vectorService.indexEvent(newEvent);
  } catch (error) {
    console.error('Failed to index event:', error);
  }
  
  set((state) => ({ events: [...state.events, newEvent] }));
  return newEvent;
}
```

### 向量搜索流程

```
用户搜索 → vectorService.search() → Orama + BGE → 返回相似结果
```

## 最佳实践

### ✅ 推荐做法

1. **始终使用 Hooks 访问数据**
   ```typescript
   // ✅ 正确
   const { events } = useEvents();
   
   // ❌ 错误
   const events = useDataStore.getState().events;
   ```

2. **使用服务层进行业务操作**
   ```typescript
   // ✅ 正确
   await eventService.create(event);
   
   // ❌ 错误
   await dataStoreAdapter.addEvent(event);
   ```

3. **保持数据不可变性**
   ```typescript
   // ✅ 正确
   await updateEvent(id, { title: 'New Title' });
   
   // ❌ 错误
   event.title = 'New Title';
   ```

4. **处理异步操作错误**
   ```typescript
   try {
     await eventService.create(event);
   } catch (error) {
     console.error('Failed to create event:', error);
     // 显示错误提示
   }
   ```

### ❌ 避免的做法

1. **直接修改状态**
   ```typescript
   // ❌ 错误
   events.push(newEvent);
   ```

2. **绕过服务层**
   ```typescript
   // ❌ 错误
   useDataStore.setState({ events: [...events, newEvent] });
   ```

3. **忽略类型检查**
   ```typescript
   // ❌ 错误
   const event: any = { title: 'Event' };
   ```

## 性能优化

### 1. 使用 Selector 优化渲染

```typescript
// ✅ 只订阅需要的数据
const events = useDataStore(state => state.events);

// ❌ 订阅整个 store
const store = useDataStore();
```

### 2. 批量操作

```typescript
// ✅ 批量添加事件
await dataStoreAdapter.addEvents(events);

// ❌ 循环单个添加
for (const event of events) {
  await dataStoreAdapter.addEvent(event);
}
```

### 3. 延迟加载

```typescript
// 使用 React.lazy 延迟加载大型组件
const CalendarView = React.lazy(() => import('./CalendarView'));
```

## 测试策略

### 单元测试

```typescript
describe('EventService', () => {
  it('should create event', async () => {
    const event = await eventService.create({
      title: 'Test Event',
      startTime: new Date(),
      endTime: new Date(),
    });
    
    expect(event.id).toBeDefined();
    expect(event.title).toBe('Test Event');
  });
});
```

### 集成测试

```typescript
describe('Data Flow', () => {
  it('should sync data to IndexedDB', async () => {
    const { addEvent } = useDataStore.getState();
    await addEvent(mockEvent);
    
    const stored = await localforage.getItem('ai-calendar-data');
    expect(stored.events).toContainEqual(mockEvent);
  });
});
```

## 总结

本项目的数据流架构具有以下优势：

1. **单向数据流** - 数据流向清晰，易于调试
2. **类型安全** - 全程 TypeScript 类型检查
3. **自动持久化** - IndexedDB 自动同步
4. **向量搜索** - 集成 Orama + BGE 实现语义搜索
5. **响应式更新** - Zustand 自动触发组件更新
6. **易于测试** - 分层架构便于单元测试和集成测试

通过遵循这套架构，可以确保数据的一致性、可预测性和可维护性。
