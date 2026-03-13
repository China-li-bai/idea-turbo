# AI 智能日历 - 数据中心架构设计

## 一、数据中心概述

本数据中心采用**本地优先 (Local-First)** 架构，所有数据存储在用户设备上，核心原则：

1. **数据永不上云** - 严格保护用户隐私
2. **分层存储** - 结构化数据 + 向量数据分离
3. **统一访问** - 通过数据服务层统一管理所有数据操作
4. **高性能** - EdgeVec 向量搜索 + IndexedDB 持久化

---

## 二、数据存储分层详解

### 2.1 应用数据层 (Application Data Layer)

#### 2.1.1 日程数据 (Calendar Events)

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
  linkedEventId?: string; // Boss日程关联到对应的秘书日程
  linkedTaskIds?: string[]; // 关联的任务ID列表
  
  // 向量搜索相关
  vectorId?: string; // EdgeVec 中的向量ID
  embeddingUpdatedAt?: Date; // Embedding 最后更新时间
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  color?: string;
}

interface RepeatRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[]; // 0-6, 0=周日
  monthDay?: number; // 1-31
  month?: number; // 0-11
}
```

#### 2.1.2 任务数据 (Tasks)

```typescript
interface Task {
  id: string;
  eventId?: string; // 关联的日程ID
  title: string;
  description?: string;
  dueTime?: Date;
  completed: boolean;
  completedAt?: Date;
  priority: 'high' | 'medium' | 'low';
  
  // 资源关联
  resources?: Resource[];
  
  // 依赖关系
  dependsOnTaskIds?: string[];
  
  // 向量搜索相关
  vectorId?: string;
  embeddingUpdatedAt?: Date;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

interface Resource {
  id: string;
  type: 'document' | 'vehicle' | 'hotel' | 'restaurant' | 'contact' | 'other';
  name: string;
  details?: string;
  contact?: string;
  url?: string;
  metadata?: Record<string, any>;
}
```

#### 2.1.3 灵光时刻数据 (Inspirations)

```typescript
interface Inspiration {
  id: string;
  content: string;
  captureTime: Date;
  type: 'todo' | 'event' | 'note' | 'raw';
  processed: boolean;
  processedAt?: Date;
  
  // 提取的信息
  extractedDate?: Date;
  extractedTime?: string;
  extractedLocation?: string;
  extractedPeople?: string[];
  
  // 处理结果
  convertedToEventId?: string;
  convertedToTaskId?: string;
  conversionNotes?: string;
  
  // 向量搜索相关
  vectorId?: string;
  embeddingUpdatedAt?: Date;
  
  // 元数据
  source?: 'keyboard' | 'voice' | 'clipboard' | 'other';
}
```

#### 2.1.4 班表数据 (Shift Schedules)

```typescript
interface ShiftSchedule {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  
  // 员工
  employees: Employee[];
  
  // 班次类型
  shiftTypes: ShiftType[];
  
  // 排班结果
  shifts: Shift[];
  
  // 规则
  rules: ScheduleRule[];
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  generatedBy?: 'manual' | 'ai' | 'hybrid';
}

interface Employee {
  id: string;
  name: string;
  color: string;
  email?: string;
  phone?: string;
  
  // 偏好
  preferences?: {
    preferredShifts?: string[];
    preferredDaysOff?: number[]; // 0-6
    maxShiftsPerWeek?: number;
    minRestDays?: number;
  };
  
  // 约束
  constraints?: {
    unavailableDates?: Date[];
    forbiddenShifts?: string[];
    maxConsecutiveShifts?: number;
  };
  
  // 历史统计
  stats?: {
    totalShifts?: number;
    shiftsThisWeek?: number;
    lastShiftDate?: Date;
  };
}

interface ShiftType {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  color: string;
  description?: string;
}

interface Shift {
  id: string;
  scheduleId: string;
  date: Date;
  shiftTypeId: string;
  employeeId: string;
  isLocked?: boolean; // 锁定后不被自动排班修改
  notes?: string;
}

interface ScheduleRule {
  id: string;
  type: 
    | 'maxShiftsPerWeek'
    | 'minRestDays'
    | 'requiredEmployee'
    | 'forbiddenEmployee'
    | 'minEmployeesPerShift'
    | 'maxEmployeesPerShift'
    | 'custom';
  value: number | string | string[];
  appliesTo?: string[]; // 员工ID或班次类型ID
  priority: number;
}
```

#### 2.1.5 用户设置 (User Settings)

```typescript
interface UserSettings {
  // 视图设置
  viewMode: 'boss' | 'assistant' | 'personal';
  defaultCalendarView: 'day' | 'week' | 'month' | 'agenda';
  firstDayOfWeek: number; // 0-6, 0=周日
  showWeekends: boolean;
  workingHours: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  
  // 主题
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  
  // 语言
  language: string; // 'zh-CN', 'en-US', etc.
  
  // 提醒设置
  defaultReminders: number[]; // 分钟数, e.g., [60, 1440] = 提前1小时和1天
  reminderSound: boolean;
  reminderNotification: boolean;
  
  // AI 设置
  aiMode: 'local-only' | 'hybrid' | 'api-only';
  apiEndpoint?: string;
  apiKey?: string; // 加密存储
  
  // 向量搜索设置
  vectorSearchEnabled: boolean;
  autoSyncEmbeddings: boolean;
  embeddingModel: string;
  
  // 数据管理
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  lastBackupAt?: Date;
}
```

#### 2.1.6 搜索历史 (Search History)

```typescript
interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
  resultClickedIds?: string[];
  
  // 查询类型
  type: 'vector' | 'keyword' | 'hybrid';
  filters?: {
    dateRange?: { start: Date; end: Date };
    eventTypes?: string[];
    viewModes?: string[];
  };
}
```

---

### 2.2 向量数据层 (Vector Data Layer)

#### 2.2.1 向量文档 (Vector Documents)

```typescript
interface VectorDocument {
  id: string; // EdgeVec 内部 ID
  vector: Float32Array; // 384维向量
  
  // 元数据
  metadata: {
    originalId: string; // 原始数据ID (eventId, taskId, etc.)
    type: 'event' | 'task' | 'inspiration' | 'note';
    subtype?: string;
    
    // 索引字段
    title: string;
    content: string;
    keywords?: string[];
    
    // 时间字段
    date?: Date;
    createdAt: Date;
    updatedAt: Date;
    
    // 过滤字段
    viewMode?: string;
    isCompleted?: boolean;
    isProcessed?: boolean;
  };
}
```

#### 2.2.2 向量索引配置 (Vector Index Config)

```typescript
interface VectorIndexConfig {
  name: string;
  dimensions: number;
  modelName: string;
  version: string;
  
  // 索引统计
  stats: {
    totalDocuments: number;
    lastIndexedAt: Date;
    indexSizeBytes: number;
  };
}
```

---

### 2.3 存储引擎层 (Storage Engine Layer)

#### 2.3.1 IndexedDB 存储结构

```typescript
// Database: ai-calendar
// Stores:
// - events: CalendarEvent[]
// - tasks: Task[]
// - inspirations: Inspiration[]
// - shiftSchedules: ShiftSchedule[]
// - settings: UserSettings (single record)
// - searchHistory: SearchHistory[]
// - vectorIndexConfig: VectorIndexConfig (single record)
```

#### 2.3.2 EdgeVec 存储结构

```typescript
// Index Name: calendar-vectors
// Dimensions: 384
// Model: Xenova/multilingual-e5-small
```

---

## 三、数据服务层设计

### 3.1 核心服务架构

```
DataCenter (统一入口)
├── EventService (日程服务)
├── TaskService (任务服务)
├── InspirationService (灵光时刻服务)
├── ShiftScheduleService (班表服务)
├── SettingsService (设置服务)
├── SearchService (搜索服务)
└── VectorService (向量服务)
```

### 3.2 服务接口定义

#### 3.2.1 EventService

```typescript
interface IEventService {
  create(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent>;
  get(id: string): Promise<CalendarEvent | null>;
  getAll(options?: {
    dateRange?: { start: Date; end: Date };
    viewMode?: string;
  }): Promise<CalendarEvent[]>;
  update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>;
  delete(id: string): Promise<void>;
  checkConflict(startTime: Date, endTime: Date, excludeEventId?: string): Promise<CalendarEvent[]>;
}
```

#### 3.2.2 VectorService

```typescript
interface IVectorService {
  initialize(): Promise<void>;
  indexDocument(type: 'event' | 'task' | 'inspiration', id: string, text: string, metadata?: any): Promise<string>;
  indexDocuments(documents: Array<{ type: string; id: string; text: string; metadata?: any }>): Promise<string[]>;
  search(query: string, options?: {
    k?: number;
    filters?: {
      types?: string[];
      dateRange?: { start: Date; end: Date };
    };
  }): Promise<SearchResult[]>;
  deleteFromIndex(id: string): Promise<void>;
  syncAll(): Promise<void>;
}

interface SearchResult {
  id: string;
  originalId: string;
  type: string;
  score: number;
  title: string;
  content: string;
  metadata: any;
}
```

---

## 四、数据同步策略

### 4.1 结构化数据与向量数据同步

```typescript
// 事件更新流程
1. 更新 EventService.update()
2. 触发 onEventUpdated 事件
3. VectorService.indexDocument() 异步更新向量
4. 更新 event.embeddingUpdatedAt

// 批量同步
VectorService.syncAll() {
  1. 获取所有未同步或已更新的文档
  2. 分批进行 Embedding
  3. 更新向量索引
  4. 更新 embeddingUpdatedAt 时间戳
}
```

### 4.2 增量同步策略

- 每次数据变更时触发向量更新
- 使用 Web Worker 不阻塞 UI
- 失败重试机制（指数退避）
- 后台批量同步（空闲时执行）

---

## 五、数据备份与恢复

### 5.1 备份格式

```typescript
interface BackupData {
  version: string;
  createdAt: Date;
  data: {
    events: CalendarEvent[];
    tasks: Task[];
    inspirations: Inspiration[];
    shiftSchedules: ShiftSchedule[];
    settings: UserSettings;
    searchHistory: SearchHistory[];
  };
  vectorIndex?: {
    config: VectorIndexConfig;
    // 向量数据可选，恢复时可重新生成
  };
}
```

### 5.2 恢复流程

1. 解析备份文件
2. 验证版本兼容性
3. 恢复结构化数据到 IndexedDB
4. 触发向量数据重新索引（可选）

---

## 六、数据迁移策略

### 6.1 版本迁移

```typescript
interface Migration {
  version: string;
 up: (db: IDBDatabase) => Promise<void>;
  down: (db: IDBDatabase) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: '1.0.0',
    up: async (db) => { /* 初始版本 */ },
    down: async (db) => { /* 回滚 */ }
  },
  // 后续迁移...
];
```

---

## 七、性能优化

### 7.1 索引策略

- IndexedDB 索引：
  - `events`: startTime, endTime, viewMode, createdAt
  - `tasks`: eventId, dueTime, completed, priority
  - `inspirations`: captureTime, processed, type
  - `searchHistory`: timestamp

### 7.2 缓存策略

- 内存缓存：最近使用的日程/任务
- 向量缓存：Embedding 结果
- 使用 LRU 策略管理缓存大小

### 7.3 分页与懒加载

- 历史数据分页加载
- 向量搜索结果分页
- 大时间范围数据按需加载

---

## 八、安全与隐私

### 8.1 数据加密

- API Key 加密存储
- 敏感字段可选加密
- 备份文件可选加密

### 8.2 数据隔离

- 每个用户独立数据库
- 向量索引与应用数据分离
- 无跨用户数据访问

---

## 九、监控与日志

### 9.1 数据操作日志

```typescript
interface DataOperationLog {
  id: string;
  timestamp: Date;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  changes?: any;
  duration: number;
  success: boolean;
  error?: string;
}
```

### 9.2 性能指标

- 查询响应时间
- 向量索引时间
- 存储使用量
- 同步状态

---

## 十、实现 roadmap

### Phase 1: 基础数据层
- [ ] 扩展 TypeScript 类型定义
- [ ] 创建 IndexedDB 存储封装
- [ ] 实现基础 CRUD 服务

### Phase 2: 向量数据层
- [ ] 集成 LocalAIStore
- [ ] 实现 VectorService
- [ ] 实现数据同步机制

### Phase 3: 高级功能
- [ ] 搜索服务
- [ ] 数据备份恢复
- [ ] 数据迁移

### Phase 4: 优化
- [ ] 性能优化
- [ ] 缓存策略
- [ ] 监控日志
