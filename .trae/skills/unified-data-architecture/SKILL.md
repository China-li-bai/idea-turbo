---
name: "unified-data-architecture"
description: "Refactors分离式 data models into unified architecture with single source of truth. Invoke when consolidating multiple data stores or resolving data sync issues."
---

# 统一数据架构重构经验

## 核心原则

**"一个灵感，本质上只是一个还没来得及分配时间戳的日程；而一个日程，本质上只是一个被锚定在时间轴上的灵感。"**

**结论**：本质相同的数据应该使用同一种数据结构。

---

## 重构流程

### 第一步：分析现有数据流

**检查清单**：
- [ ] 有哪些数据存储层？（localforage, Zustand, IndexedDB...）
- [ ] 是否存在分离式的数据模型？（Event + Inspiration, Task + ...）
- [ ] 数据流是否清晰？（谁写入，谁读取，谁同步）
- [ ] 是否有两套并行的存储系统？

**分析方法**：
```bash
# 搜索存储相关代码
grep -r "localforage" lib/
grep -r "Zustand\|create(" lib/stores/

# 检查类型定义
cat types/unified.ts
cat types/index.ts

# 追踪数据流
grep -r "unifiedItemService\|unifiedStore" lib/
```

---

### 第二步：设计统一数据结构

**原则**：
1. 单一数据源 — 所有数据存储在同一个地方
2. type 字段区分 — 用 `type: 'idea' | 'event'` 而非两个独立数组
3. metadata 扩展 — 通用字段 + 类型特有字段
4. 转换历史追溯 — `previousType`, `convertedAt` 保留转换记录

**示例**：
```typescript
interface UnifiedCalendarItem {
  id: string;
  type: 'idea' | 'event';     // 核心分野

  // 时间维度（idea 时为 null）
  startTime: number | null;
  endTime: number | null;

  // AI 维度
  embedding: number[];

  // 状态维度
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';

  // 灵活元数据
  metadata: {
    // 通用字段
    location?: string;
    tags?: string[];

    // Idea 特有
    extractedDate?: number;

    // Event 特有
    reminders?: number[];

    // 转换历史
    previousType?: 'idea' | 'event';
    convertedAt?: number;
  };
}
```

---

### 第三步：分层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    unifiedItemService                        │
│  - 值对象工厂（createIdea / createEvent）                   │
│  - 纯转换规则（transformToEvent / transformToIdea）        │
│  - 不做存储，只做数据变换                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    useUnifiedStore                          │
│  - 单一数据源（items: UnifiedCalendarItem[]）               │
│  - 状态管理（Zustand）                                      │
│  - 自动同步到索引（Orama / 搜索服务）                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
         ┌─────────────────┼─────────────────┐
         ↓                 ↓                 ↓
   localStorage      oramaSearchService    其他索引
   (Zustand persist)  (vector + full-text)
```

**职责划分**：
| 层级 | 职责 | 例子 |
|------|------|------|
| Service | 值对象工厂 + 转换规则 | `createIdea()`, `transformToEvent()` |
| Store | 状态管理 + 索引同步 | `addItem()`, `updateItem()` |
| Storage | 持久化 | Zustand persist, localforage |

---

### 第四步：增量实施

**推荐顺序**：
1. 定义统一类型 — `types/unified.ts`
2. 创建 Service 层 — 值对象工厂
3. 创建 Store 层 — Zustand + 持久化
4. 创建 Hooks 层 — `useUnifiedItems()`
5. 更新 UI 层 — 使用新 Hooks
6. 清理旧代码 — 删除遗留的分离式存储

**不要做的事**：
- ❌ 同时重构数据和 UI（风险太大）
- ❌ 保留两套并行存储（数据不一致的根源）
- ❌ 在 Service 层做存储（职责不清）

---

### 第五步：验证数据流

**检查点**：
1. 所有数据操作都通过 Store
2. Service 层只做数据变换，不直接操作存储
3. 索引（Orama 等）与 Store 保持同步
4. 没有两套并行的存储系统

**代码审查清单**：
```typescript
// ✅ 正确：通过 Store 操作数据
const idea = unifiedItemService.createIdea(content);
await addItem(idea);

// ❌ 错误：直接操作存储
await db.events.setItem(id, event);

// ✅ 正确：Store 委托给 Service 做转换
convertToEvent(id, startTime, endTime) {
  const item = this.items.find(i => i.id === id);
  const updated = unifiedItemService.transformToEvent(item, ...);
  this.setState({ items: ... });
}
```

---

## 常见问题与解决

### Q1：遗留的分离式存储还在被使用？

**处理方式**：
1. 先搜索所有引用：`grep -r "db.events\|db.tasks" lib/`
2. 如果只有旧代码引用，标记为 `@deprecated`
3. 确认没有被新架构使用后，删除或精简

### Q2：两套存储系统如何取舍？

**决策树**：
```
数据是否需要跨组件共享？
├── 否 → 可以用组件本地状态
└── 是 → 是否需要向量搜索？
    ├── 是 → Zustand Store（主数据源）+ Orama（搜索索引）
    └── 否 → 只用 Zustand Store（已含 persist）
```

### Q3：Orama 索引与 Zustand Store 如何同步？

**推荐模式**：
```typescript
// Store 层负责同步
addItem: async (item) => {
  set(state => ({ items: [...state.items, item] }));
  try {
    await oramaSearchService.indexItem(item);
  } catch (error) {
    console.error('索引失败', error);
  }
},
```

### Q4：如何处理持久化冲突？

**版本校验 + 备份恢复**：
```typescript
private async _loadFromIndexedDB(): Promise<boolean> {
  const [data, version] = await Promise.all([
    localforage.getItem(dataKey),
    localforage.getItem(versionKey)
  ]);

  if (version !== CURRENT_VERSION) {
    // 版本不一致，清除旧数据
    await clearOldData();
    return false;
  }

  try {
    this.db = await restore("json", data);
    return true;
  } catch (error) {
    // 恢复失败，尝试备份
    const backup = await localforage.getItem(backupKey);
    if (backup) {
      this.db = await restore("json", backup);
      return true;
    }
    return false;
  }
}
```

---

## 经验总结

| 原则 | 说明 |
|------|------|
| **单一数据源** | 所有状态存储在一个 Store，避免同步问题 |
| **Service 负责变换** | Service 是纯函数层，只做数据变换，不做存储 |
| **Store 负责同步** | Store 调用 Service 做变换，然后更新状态和索引 |
| **增量重构** | 先定义类型，再建 Service，再建 Store，最后更新 UI |
| **清理死代码** | 旧存储确认无用后立即删除，避免混淆 |

---

## 适用场景

- 合并多个相似的数据模型（Event + Inspiration, Task + Note...）
- 解决数据不一致问题（两套存储系统数据不同步）
- 重构数据层时（从分散式到集中式）
- 设计新的数据架构时（确保单一数据源）
