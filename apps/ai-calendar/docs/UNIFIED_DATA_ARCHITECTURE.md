# 统一数据架构设计 (Unified Data Architecture)

## 核心原则

**从第一性原理出发**：
> "一个灵感，本质上只是一个还没来得及分配时间戳的日程；而一个日程，本质上只是一个被锚定在时间轴上的灵感。"

**结论**：它们在底层必须是同一种数据结构。

---

## 一、统一的数据结构 (Unified Schema)

### 1.1 核心定义

```typescript
interface UnifiedCalendarItem {
  // ===== 核心字段（必需）=====
  id: string;                    // UUID
  type: 'idea' | 'event';        // 核心分野：灵感 vs 日程
  title: string;                 // 明文标题（给用户看）
  content: string;               // 完整上下文（给 LLM 看）
  
  // ===== 时间维度 =====
  startTime: number | null;      // Unix 时间戳，idea 时为 null
  endTime: number | null;        // Unix 时间戳，idea 时为 null
  isAllDay: boolean;             // 是否全天事件
  
  // ===== AI 维度 =====
  embedding: number[];           // 512维向量（BGE-small-zh）
  embeddingUpdatedAt: number;    // 向量更新时间
  
  // ===== 状态维度 =====
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: number;             // 创建时间（用于灵感倒序排列）
  updatedAt: number;             // 最后更新时间
  
  // ===== 灵活元数据 =====
  metadata: {
    // 通用字段
    location?: string;
    tags?: string[];
    priority?: 'high' | 'medium' | 'low';
    color?: string;
    description?: string;
    
    // Event 特有字段
    reminders?: number[];        // 提醒时间（分钟）
    repeatRule?: RepeatRule;
    eventType?: 'regular' | 'shift' | 'meeting' | 'personal';
    shiftMetadata?: ShiftMetadata;
    
    // Idea 特有字段
    extractedDate?: number;      // AI 提取的日期
    extractedTime?: string;      // AI 提取的时间
    extractedLocation?: string;  // AI 提取的地点
    extractedPeople?: string[];  // AI 提取的人员
    source?: 'keyboard' | 'voice' | 'clipboard' | 'other';
    
    // 转换历史（关键！）
    previousType?: 'idea' | 'event';
    convertedAt?: number;
    conversionNotes?: string;
  };
}
```

### 1.2 Schema 对比

| 维度 | 当前架构（分离式） | 统一架构 |
|------|-------------------|----------|
| 数据源 | 两个独立的数组 | 单一数组 |
| 类型 | `CalendarEvent` + `Inspiration` | `UnifiedCalendarItem` |
| 区分方式 | 不同的接口 | `type` 字段 |
| 转换 | 创建新对象，删除旧对象 | 修改字段值 |
| AI 检索 | 需要查询两个索引 | 一次查询获取完整上下文 |
| 历史追溯 | 转换后丢失灵感状态 | 保留完整转换历史 |

---

## 二、Orama 数据库架构

### 2.1 统一的 Orama Schema

```typescript
const calendarSchema = {
  id: 'string',
  type: 'string',              // 'idea' | 'event'
  title: 'string',
  content: 'string',
  
  // 时间维度
  startTime: 'number',         // null 时存储为 0
  endTime: 'number',
  isAllDay: 'boolean',
  
  // AI 维度
  embedding: 'vector[512]',    // BGE-small-zh 生成的向量
  
  // 状态维度
  status: 'string',
  createdAt: 'number',
  updatedAt: 'number',
  
  // 元数据（可搜索字段）
  metadata: {
    location: 'string',
    tags: 'string[]',
    priority: 'string',
    eventType: 'string',
  }
};
```

### 2.2 Orama 在架构中的位置

```
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (UI Layer)                       │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │   Boss View      │              │ Secretary View   │     │
│  │  - 时间轴         │              │  - AI 对话       │     │
│  │  - 灵感胶囊       │              │  - 智能建议      │     │
│  └────────┬─────────┘              └────────┬─────────┘     │
└───────────┼──────────────────────────────────┼───────────────┘
            │                                  │
            │ useItems({ type: 'event' })      │ vectorSearch()
            │ useItems({ type: 'idea' })       │
            │                                  │
┌───────────┼──────────────────────────────────┼───────────────┐
│           │      统一服务层 (Unified Service) │               │
│  ┌────────▼──────────────────────────────────▼─────────┐     │
│  │            unifiedItemService                        │     │
│  │  - create(item)                                      │     │
│  │  - convert(id, toType)                               │     │
│  │  - search(query, options)                            │     │
│  │  - update(id, updates)                               │     │
│  └────────┬──────────────────────────────┬──────────────┘     │
└───────────┼──────────────────────────────┼───────────────────┘
            │                              │
   ┌────────▼────────┐          ┌─────────▼──────────┐
   │  Zustand Store  │          │  Orama Database    │
   │  ┌───────────┐  │          │  ┌──────────────┐  │
   │  │  items    │  │          │  │ Vector Index │  │
   │  │ (统一数组) │  │          │  │ (HNSW)       │  │
   │  └───────────┘  │          │  └──────────────┘  │
   │       ↓         │          │  ┌──────────────┐  │
   │  IndexedDB      │          │  │ Full-text    │  │
   │  (持久化)        │          │  │ Index        │  │
   └─────────────────┘          │  └──────────────┘  │
                                │       ↓            │
                                │  IndexedDB         │
                                │  (向量持久化)       │
                                └────────────────────┘
```

### 2.3 Orama 的核心作用

1. **向量索引**：为所有 item（idea + event）创建统一的向量嵌入
2. **语义搜索**：支持自然语言查询，一次检索获取完整上下文
3. **混合搜索**：结合向量搜索和全文搜索，提高召回率
4. **相似推荐**：找到相似的 idea 或 event
5. **智能去重**：检测重复内容

---

## 三、数据流转架构

### 3.1 灵光捕捉流程 (Idea Capture)

```
用户输入："重构后端的向量检索逻辑"
    ↓
[意图捕捉层] - chrono-node 检测时间词
    ├─ 有时间 → 标记为 event，提取 startTime
    └─ 无时间 → 标记为 idea
    ↓
[本地 AI 引擎] - Transformers.js + WebGPU
    └─ 生成 512 维向量（5ms）
    ↓
[Orama Database]
    └─ 插入 JSON 对象
    {
      type: 'idea',
      title: '重构后端的向量检索逻辑',
      content: '重构后端的向量检索逻辑',
      startTime: null,
      status: 'pending',
      embedding: [0.123, -0.456, ...]
    }
    ↓
[Zustand Store]
    └─ 更新 items 数组
    ↓
[UI 渲染]
    └─ Boss 视图右侧"灵感胶囊"栏实时显示
```

### 3.2 灵感转换为日程 (Idea → Event)

```
用户确认："明天下午3点开会"
    ↓
[AI 解析]
    ├─ 提取时间：明天 15:00
    ├─ 提取地点：（如果有）
    └─ 生成建议的 startTime/endTime
    ↓
[用户确认]
    └─ 显示确认对话框，允许修改
    ↓
[转换操作] - unifiedItemService.convert()
    └─ 更新 item：
    {
      type: 'event',           // 类型改变
      startTime: 1704067200000, // 分配时间戳
      endTime: 1704070800000,
      status: 'scheduled',
      metadata: {
        previousType: 'idea',   // 记录历史
        convertedAt: Date.now()
      }
    }
    ↓
[Orama 更新]
    └─ 更新向量索引（embedding 不变）
    ↓
[UI 更新]
    ├─ 灵感胶囊消失
    └─ 时间轴出现新卡片
```

### 3.3 双视图数据分离与合并

#### Boss 视图（执行面）

**查询策略**：只查确定性的标量

```typescript
// 左栏：今日时间轴
const todayEvents = await orama.search({
  where: {
    type: 'event',
    status: 'scheduled'
  },
  filters: {
    startTime: {
      gte: todayStart,
      lte: todayEnd
    }
  },
  sortBy: { property: 'startTime', order: 'asc' }
});

// 右栏：灵感胶囊
const pendingIdeas = await orama.search({
  where: {
    type: 'idea',
    status: 'pending'
  },
  sortBy: { property: 'createdAt', order: 'desc' },
  limit: 10
});
```

#### Secretary 视图（统筹面）

**查询策略**：基于向量的混合搜索

```typescript
// 用户问："下周帮我安排时间把乔布斯传读了"
const results = await orama.hybridSearch({
  term: '乔布斯传',
  vector: {
    value: await embed('乔布斯传'),
    property: 'embedding'
  },
  mode: 'hybrid',
  limit: 20
});

// 结果包含：
// - type='idea' 的读书想法
// - type='event' 的读书计划
// - 相关的其他事件
// AI 获得完整上下文，做出智能建议
```

---

## 四、状态机设计

### 4.1 状态转换图

```
┌─────────────────────────────────────────────────────────┐
│                    状态转换流程                          │
└─────────────────────────────────────────────────────────┘

                    ┌─────────┐
                    │  IDEA   │
                    │ (灵感)   │
                    │         │
                    │ type='idea'         │
                    │ status='pending'    │
                    │ startTime=null      │
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
      用户确认      AI 自动建议     用户取消
      (分配时间)    (检测到时间)    (保留想法)
            │            │            │
            ↓            ↓            ↓
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │  EVENT  │  │  EVENT  │  │CANCELLED│
      │ (日程)   │  │ (日程)   │  │ (已取消) │
      │         │  │         │  │         │
      │type='event'      │type='event'      │status='cancelled'│
      │status='scheduled'│status='scheduled'│                 │
      │startTime=具体时间│startTime=具体时间│                 │
      └────┬────┘  └────┬────┘  └─────────┘
           │            │
      执行完成      重新安排
           │            │
           ↓            ↓
      ┌──────────┐ ┌─────────┐
      │COMPLETED │ │RESCHEDULED│
      │ (已完成)  │ │ (重安排)  │
      │          │ │         │
      │status=   │ │更新时间  │
      │'completed'│ │         │
      └──────────┘ └─────────┘
```

### 4.2 状态转换代码

```typescript
class UnifiedItemService {
  // 创建灵感
  async createIdea(content: string): Promise<UnifiedCalendarItem> {
    const embedding = await this.generateEmbedding(content);
    
    const item: UnifiedCalendarItem = {
      id: crypto.randomUUID(),
      type: 'idea',
      title: content.substring(0, 100),
      content,
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding,
      embeddingUpdatedAt: Date.now(),
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };
    
    await this.save(item);
    return item;
  }
  
  // 转换：Idea → Event
  async convertToEvent(
    ideaId: string, 
    startTime: number, 
    endTime: number,
    additionalMetadata?: Partial<UnifiedCalendarItem['metadata']>
  ): Promise<UnifiedCalendarItem> {
    const idea = await this.getById(ideaId);
    if (!idea || idea.type !== 'idea') {
      throw new Error('Item is not an idea');
    }
    
    const event: UnifiedCalendarItem = {
      ...idea,
      type: 'event',
      startTime,
      endTime,
      status: 'scheduled',
      updatedAt: Date.now(),
      metadata: {
        ...idea.metadata,
        ...additionalMetadata,
        previousType: 'idea',
        convertedAt: Date.now()
      }
    };
    
    await this.update(event);
    return event;
  }
  
  // 反向转换：Event → Idea
  async convertToIdea(eventId: string): Promise<UnifiedCalendarItem> {
    const event = await this.getById(eventId);
    if (!event || event.type !== 'event') {
      throw new Error('Item is not an event');
    }
    
    const idea: UnifiedCalendarItem = {
      ...event,
      type: 'idea',
      startTime: null,
      endTime: null,
      status: 'pending',
      updatedAt: Date.now(),
      metadata: {
        ...event.metadata,
        previousType: 'event',
        convertedAt: Date.now()
      }
    };
    
    await this.update(idea);
    return idea;
  }
}
```

---

## 五、AI 检索优势

### 5.1 统一上下文

**场景**：用户问 "我之前是不是有个关于乔布斯传的想法？"

**当前架构（分离式）**：
```typescript
// 需要查询两个索引
const ideas = await oramaIdeas.search('乔布斯传');
const events = await oramaEvents.search('乔布斯传');
// 合并结果，上下文不完整
```

**统一架构**：
```typescript
// 一次查询获取完整上下文
const results = await orama.hybridSearch('乔布斯传', {
  mode: 'hybrid',
  limit: 20
});

// 结果包含：
// 1. type='idea': "周末抽空读完乔布斯传" (未安排)
// 2. type='event': "读书计划：乔布斯传" (已安排)
// 3. type='event': "读书分享会" (相关事件)
// AI 获得完整上下文，做出智能建议
```

### 5.2 转换历史追溯

```typescript
// 查询某个 event 的转换历史
const event = await getById('event-123');
if (event.metadata.previousType === 'idea') {
  // 可以追溯：这个 event 是从哪个 idea 转换来的
  // 转换时间：event.metadata.convertedAt
  // 原始内容：event.content
}
```

---

## 六、实施计划

### 6.1 阶段一：类型定义（1天）

1. 定义 `UnifiedCalendarItem` 接口
2. 定义 `RepeatRule`、`ShiftMetadata` 等子类型
3. 创建类型守卫和工具函数

### 6.2 阶段二：服务层重构（2天）

1. 创建 `unifiedItemService`
2. 实现状态转换逻辑
3. 集成 Orama 统一索引
4. 更新向量生成逻辑

### 6.3 阶段三：数据存储重构（1天）

1. 重构 Zustand store 为单一 `items` 数组
2. 更新持久化逻辑
3. 实现数据迁移脚本

### 6.4 阶段四：UI 层更新（2天）

1. 更新 Hooks：`useItems({ type: 'idea' | 'event' })`
2. 重构 BossView 数据访问
3. 重构 SecretaryView AI 检索
4. 实现转换 UI（确认对话框）

### 6.5 阶段五：数据迁移（1天）

1. 编写迁移脚本
2. 将现有 `events` 和 `inspirations` 转换为 `items`
3. 重建 Orama 索引
4. 测试数据完整性

---

## 七、核心优势总结

### 7.1 数据层面

✅ **单一数据源**：避免多表同步问题
✅ **类型统一**：idea 和 event 本质相同
✅ **转换简单**：只需修改字段，无需创建新对象
✅ **历史完整**：保留转换轨迹，便于追溯

### 7.2 AI 层面

✅ **上下文完整**：一次检索获取所有相关信息
✅ **检索高效**：Orama 混合搜索性能优异
✅ **语义统一**：向量空间中 idea 和 event 可比较
✅ **智能建议**：AI 基于完整上下文做出决策

### 7.3 架构层面

✅ **扩展性强**：metadata 支持未来需求
✅ **维护简单**：单一服务层，逻辑清晰
✅ **性能优异**：Orama 内存索引 + IndexedDB 持久化
✅ **类型安全**：TypeScript 全程类型检查

---

## 八、关键设计决策

### 8.1 为什么使用 metadata 而不是多个可选字段？

**原因**：
1. **灵活性**：metadata 可以动态扩展，不影响核心 Schema
2. **可搜索性**：Orama 支持嵌套字段搜索
3. **类型安全**：TypeScript 可以精确定义 metadata 结构
4. **迁移简单**：新增字段只需更新 metadata 类型定义

### 8.2 为什么保留 previousType 和 convertedAt？

**原因**：
1. **历史追溯**：可以查询转换历史
2. **数据分析**：统计转换率、转换时间等
3. **撤销功能**：支持反向转换
4. **AI 上下文**：AI 可以理解转换历史

### 8.3 为什么使用 Unix 时间戳而不是 Date 对象？

**原因**：
1. **Orama 兼容**：Orama 只支持基本类型
2. **序列化简单**：JSON 序列化不需要特殊处理
3. **比较高效**：数值比较比对象比较快
4. **跨平台一致**：避免时区问题

---

## 九、风险与挑战

### 9.1 数据迁移风险

**风险**：现有数据量大时，迁移可能耗时
**缓解**：
- 分批迁移，显示进度
- 提供回滚机制
- 迁移前备份

### 9.2 性能挑战

**挑战**：单一数组可能影响性能
**缓解**：
- Orama 索引优化查询
- Zustand selector 减少渲染
- 虚拟滚动处理长列表

### 9.3 学习曲线

**挑战**：团队需要理解新架构
**缓解**：
- 详细文档和示例
- 代码注释和类型提示
- 逐步迁移，保持兼容

---

## 十、总结

这个统一数据架构从第一性原理出发，将"灵感"和"日程"统一为同一种数据结构，通过 `type` 字段区分状态，实现了：

1. **数据统一**：单一数据源，避免同步问题
2. **AI 友好**：一次检索获取完整上下文
3. **转换简单**：状态机管理，保留历史
4. **扩展性强**：metadata 支持未来需求

这是一个根本性的架构改进，为 AI 智能日历奠定了坚实的数据基础。
