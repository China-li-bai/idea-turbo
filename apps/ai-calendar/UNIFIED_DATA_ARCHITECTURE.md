# 统一数据架构设计

## 📋 概述

本项目采用**统一数据源 + 单向数据流**的架构设计，确保数据一致性和可维护性。

---

## 🏗️ 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                        UI 组件层                              │
│  (CalendarView, ShiftManager, CalendarShiftPage, 等)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 使用 Hooks
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   自定义 Hooks 层                            │
│  (useEvents, useTasks, useInspirations, useSchedules, 等) │
│         - 订阅数据变化                                        │
│         - 自动刷新数据                                        │
│         - 提供 loading 状态                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 订阅 EventBus
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   事件总线 (EventBus)                        │
│         - 发布/订阅模式                                        │
│         - 数据变更通知                                        │
│         - 跨组件通信                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 调用 Service
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据服务层 (Services)                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ UnifiedDataService (统一数据服务)                      │    │
│  │ - 所有数据的 CRUD 操作                                  │    │
│  │ - 自动更新向量索引                                      │    │
│  │ - 发布数据变更事件                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ EventService     │  │ ShiftService     │                  │
│  │ (委托给统一服务)  │  │ (排班专用逻辑)   │                  │
│  └──────────────────┘  └──────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 读写 Storage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   存储层 (Storage)                           │
│         - LocalForage (IndexedDB)                           │
│         - 统一的存储实例                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 核心数据结构

### 1. **CalendarEvent** - 日历通用事件
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  
  eventType: 'regular' | 'shift' | 'meeting' | 'personal';
  
  shiftMetadata?: {  // 仅当 eventType = 'shift' 时
    scheduleId: string;
    shiftId: string;
    employeeId: string;
    employeeName: string;
    shiftTypeId: string;
    shiftTypeName: string;
  };
}
```

### 2. **ShiftSchedule** - 排班专用数据
```typescript
interface ShiftSchedule {
  id: string;
  name: string;
  employees: Employee[];
  shiftTypes: ShiftType[];
  shifts: Shift[];
  rules: ScheduleRule[];
}
```

---

## 🔄 单向数据流

### 数据流向

```
用户操作
    ↓
UI 组件调用 Store 方法
    ↓
Store 委托给 UnifiedDataService
    ↓
UnifiedDataService 写入 Storage
    ↓
UnifiedDataService 更新向量索引
    ↓
UnifiedDataService 发布事件到 EventBus
    ↓
订阅该事件的 Hooks 收到通知
    ↓
Hooks 重新加载数据
    ↓
UI 组件自动更新
```

---

## 🛠️ 核心模块

### 1. **UnifiedDataService** (`lib/services/unifiedDataService.ts`)

统一数据服务，提供所有数据的 CRUD 操作，并自动更新向量索引。

**主要方法：**

#### 事件相关
- `getAllEvents(options?)` - 获取所有日历事件（支持过滤）
- `getEventById(id)` - 获取单个事件
- `addEvent(event)` - 添加事件（自动更新向量索引）
- `addEvents(events)` - 批量添加事件
- `updateEvent(id, updates)` - 更新事件
- `deleteEvent(id)` - 删除事件

#### 任务相关
- `getAllTasks(options?)` - 获取所有任务（支持过滤）
- `getTaskById(id)` - 获取单个任务
- `addTask(task)` - 添加任务（自动更新向量索引）
- `updateTask(id, updates)` - 更新任务
- `deleteTask(id)` - 删除任务

#### 灵感相关
- `getAllInspirations(options?)` - 获取所有灵感
- `getInspirationById(id)` - 获取单个灵感
- `addInspiration(inspiration)` - 添加灵感
- `updateInspiration(id, updates)` - 更新灵感
- `deleteInspiration(id)` - 删除灵感

#### 排班相关
- `getAllSchedules()` - 获取所有排班计划
- `getScheduleById(id)` - 获取单个排班计划
- `addSchedule(schedule)` - 添加排班计划
- `updateSchedule(id, updates)` - 更新排班计划
- `deleteSchedule(id)` - 删除排班计划

#### 设置相关
- `getSettings()` - 获取用户设置
- `saveSettings(settings)` - 保存用户设置
- `getAIConfig()` - 获取AI配置
- `saveAIConfig(config)` - 保存AI配置

#### 搜索历史
- `getAllSearchHistory()` - 获取搜索历史
- `addSearchHistory(history)` - 添加搜索历史
- `deleteSearchHistory(id)` - 删除搜索历史
- `clearAllSearchHistory()` - 清空搜索历史

### 2. **自定义 Hooks** (`lib/hooks/useUnifiedData.ts`)

提供响应式数据访问，自动订阅数据变化。

**可用 Hooks：**
- `useEvents()` - 获取日历事件
- `useTasks()` - 获取任务
- `useInspirations()` - 获取灵感
- `useSchedules()` - 获取排班计划
- `useScheduleById(id)` - 获取单个排班计划
- `useSettings()` - 获取用户设置
- `useSearchHistory()` - 获取搜索历史

**使用示例：**
```tsx
import { useEvents } from '@/lib/hooks';

function MyComponent() {
  const { events, loading, refresh } = useEvents();
  
  if (loading) return <div>加载中...</div>;
  
  return (
    <div>
      {events.map(event => (
        <div key={event.id}>{event.title}</div>
      ))}
    </div>
  );
}
```

### 3. **EventBus** (`lib/utils/eventBus.ts`)

事件总线，用于数据变更通知和跨组件通信。

**使用示例：**
```typescript
import { eventBus } from '@/lib/utils/eventBus';

// 订阅事件
const unsubscribe = eventBus.subscribe((event) => {
  console.log('收到事件:', event);
});

// 取消订阅
unsubscribe();
```

---

## 🔗 排班与日历的统一

### 数据转换

`ShiftService` 提供 `convertShiftToEvent` 方法，将排班数据转换为日历事件：

```typescript
convertShiftToEvent(
  shift: Shift,
  schedule: ShiftSchedule
): CalendarEvent | null
```

### 同步机制

- **自动同步**：每次排班数据变更时，自动同步到日历事件
- **手动同步**：`shiftService.syncAllShiftsToCalendar()` 全量同步

---

## 📁 统一导出入口

### 从 `lib/index.ts` 导入
```typescript
// 所有服务和Hooks
import { 
  unifiedDataService, 
  useEvents, 
  useTasks,
  shiftService 
} from '@/lib';
```

### 从 `lib/services/index.ts` 导入
```typescript
// 所有服务
import { 
  unifiedDataService, 
  eventService, 
  taskService,
  shiftService 
} from '@/lib/services';
```

### 从 `lib/hooks/index.ts` 导入
```typescript
// 所有Hooks
import { 
  useEvents, 
  useTasks, 
  useSchedules 
} from '@/lib/hooks';
```

---

## ✅ 最佳实践

### 1. **使用 Hooks 获取数据**
```typescript
// ✅ 推荐
const { events } = useEvents();

// ❌ 不推荐（旧方式）
const { events } = useCalendarStore();
```

### 2. **通过 Store 方法修改数据**
```typescript
// ✅ 推荐
const { addEvent } = useCalendarStore();
await addEvent(newEvent);

// ❌ 不推荐（直接调用服务）
await unifiedDataService.addEvent(newEvent);
```

### 3. **处理 Loading 状态**
```tsx
const { events, loading } = useEvents();

if (loading) {
  return <Spinner />;
}

return <EventList events={events} />;
```

### 4. **使用过滤选项**
```typescript
// 获取特定日期范围的事件
const { events } = useEvents();
const filteredEvents = events.filter(e => 
  e.startTime >= startDate && e.endTime <= endDate
);

// 或使用服务的过滤功能
const events = await unifiedDataService.getAllEvents({
  dateRange: { start: startDate, end: endDate },
  eventType: 'shift'
});
```

---

## 📁 文件结构

```
lib/
├── index.ts                      # 统一导出入口
├── services/
│   ├── index.ts                  # 服务导出入口
│   ├── unifiedDataService.ts     # 统一数据服务 ⭐
│   ├── eventService.ts           # 事件服务（委托）
│   ├── taskService.ts            # 任务服务（委托）
│   ├── inspirationService.ts     # 灵感服务（委托）
│   ├── shiftService.ts           # 排班专用服务
│   └── vectorService.ts          # 向量索引服务
├── hooks/
│   ├── index.ts                  # Hooks导出入口
│   ├── useUnifiedData.ts         # 统一数据Hooks ⭐
│   ├── useEvents.ts              # 事件Hook（旧）
│   ├── useTasks.ts               # 任务Hook（旧）
│   └── useShiftSchedules.ts      # 排班Hook
├── stores/
│   ├── index.ts                  # Store导出入口
│   └── calendarStore.ts          # Zustand Store
├── storage/
│   └── index.ts                  # Storage配置
└── utils/
    └── eventBus.ts               # 事件总线
```

---

## 🎯 优势

1. **单一数据源** - 所有数据通过 `unifiedDataService` 访问
2. **自动向量索引** - 数据变更时自动更新向量索引
3. **自动响应式更新** - Hooks 自动订阅 EventBus
4. **类型安全** - 完整的 TypeScript 类型定义
5. **易于维护** - 清晰的分层架构和统一入口
6. **易于扩展** - 添加新数据类型只需扩展服务
7. **向后兼容** - 旧的服务和Hooks仍然可用
