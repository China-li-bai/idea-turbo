


要实现“秘书井井有条的时间管理”，我们必须解决一个核心的计算机科学问题：**非结构化意图（灵感/随手记）与结构化时间（日历网格）之间的转换。**

在传统应用中，这是靠用户“手动填表”来完成的。而在我们的 **智程日历 (SmartJourney)** 中，这一切必须由系统在本地自动完成。

以下是针对“灵光捕捉”到“双视图统筹”的详细技术架构与底层设计解析。我们要把前端浏览器变成一个“微型 AI 操作系统”。

---

### 一、 宏观技术架构：双线程隔离模型 (The Dual-Thread Model)

为了保证乔布斯式的“丝滑交互”，绝对不能让沉重的 AI 推理和数据库检索卡住 UI 动画（比如拖拽胶囊时的 60fps 帧率）。

因此，整个 Web 应用必须分为**物理隔离的两个线程**：

1.  **主线程 (Main Thread - UI/Render)：**
    *   只负责渲染 DOM（React/Vue）。
    *   处理用户的点击、拖拽、双视图切换动画。
    *   没有任何复杂的业务逻辑，极其轻量。
2.  **Web Worker 线程 (The Engine Room - 后台引擎)：**
    *   这是真正的大脑。在这个隐藏的线程里，我们运行：
        *   `Transformers.js` (调用 WebGPU 跑 BGE-small-zh 向量模型)。
        *   `Orama DB` (驻留在内存中的混合检索引擎)。
        *   `Local NLP` (本地时间提取引擎，如定制版的 `chrono-node`)。

**数据流向：** 主线程把用户输入的字符串通过 `postMessage` 扔给 Worker -> Worker 瞬间处理完毕 -> 把结构化数据（JSON）扔回主线程渲染。

---

### 二、 灵光捕捉：数据漏斗与本地 NLP 解析

当用户在“灵光之池 (Canvas)”中输入一句话并按下回车时，数据如何被精确分类？

**详细处理管线 (Pipeline)：**

**Step 1: 本地时间实体提取 (Local NER)**
*   引擎不发网络请求，而是使用本地库（如经过中文优化的 `chrono-node` 或我们自己写的正则状态机）。
*   *测试用例 A：* “下周三下午两点和李总开会” -> 提取出 `time: { start: 1776578400 }`。
*   *测试用例 B：* “研究一下怎么用 WebGPU 加速” -> 提取出 `time: null`。

**Step 2: 路由分发 (Routing)**
*   如果有时间属性 -> 标记状态为 `Event` (已定日程)。
*   如果没有时间属性 -> 标记状态为 `Idea` (灵感胶囊)。

**Step 3: 向量化 (Embedding)**
*   无论它是 Event 还是 Idea，统统扔给 `BGE-small-zh` 模型，在 5 毫秒内计算出 512 维的浮点数组（Vector）。

**Step 4: 落盘 Orama**
```javascript
// Worker 线程内部的入库逻辑
async function processUserInput(rawText) {
  const timeIntent = localNLP.parse(rawText); 
  const vector = await embedModel(rawText); // WebGPU 计算

  const doc = {
    id: generateUUID(),
    title: extractTitle(rawText),
    content: rawText,
    type: timeIntent ? 'event' : 'idea',
    startTime: timeIntent ? timeIntent.start : 0,
    endTime: timeIntent ? timeIntent.end : 0,
    embedding: Array.from(vector),
    status: 'pending',
    createdAt: Date.now()
  };

  await insert(oramaDB, doc);
  return doc; // 返回给 UI 层
}
```

---

### 三、 双视图的“分离”与“合并” (核心逻辑)

我们定义的“统一 Schema”，在 Boss 视图中表现为**严格分离**，在 Secretary 视图中表现为**高度合并**。

#### 1. Boss 视图的“分离” (Data Separation)
Boss 视图不需要懂 AI，它只需要极速的标量查询（Scalar Query）。它像两个独立的管道：
*   **左侧时间轴 (Timeline)：** 实时监听 Orama，查询条件为 `type === 'event' && startTime 在今天内`。
*   **右侧灵感栏 (Idea Bin)：** 实时监听 Orama，查询条件为 `type === 'idea' && status === 'pending'`。
*   *转化机制：* 当用户手动把“灵感”拖拽到“时间轴”上时，前端发送一条 `Update` 指令给 Worker，把该条数据的 `type` 从 `idea` 改为 `event`，并附上拖拽落点的时间戳。数据瞬间分离并转移。

#### 2. 秘书视图的“合并” (Data Merging for AI)
这是“井井有条的时间管理”的终极体现。当用户切换到 Dark Mode（秘书视图），系统开始运作 **本地 RAG (检索增强生成) 架构**。

**真实场景推演：**
用户在底部输入框对秘书说：*“帮我找个时间把重构数据库的想法落实一下，最好在下周二，看看有没有空。”*

**技术解析 (RAG Pipeline)：**

*   **1. 意图与向量双线检索：**
    Worker 收到这句话。首先生成这句话的向量。然后在 Orama 中发起极其硬核的**混合查询 (Hybrid Search)**：
    ```javascript
    const contextData = await search(oramaDB, {
      mode: 'hybrid',
      term: "重构数据库", // 全文检索匹配字面
      vector: { value: queryVector, property: 'embedding' }, // 语义找回对应的 Idea
      where: {
        // 合并逻辑：同时查出下周二已有的 Events，用于判断冲突
        $or:[
          { type: 'idea' }, 
          { type: 'event', startTime: { between:[下周二零点, 下周二深夜] } }
        ]
      },
      limit: 10
    });
    ```
    *结果：* Orama 秒级返回了那个 `type: 'idea'` 的胶囊数据，以及下周二已经存在的 3 个 `type: 'event'` 数据。**在这里，灵感和现有日程被合并成了“上下文知识”。**

*   **2. 组装 Prompt (前端操作，保护隐私)：**
    将捞出来的数据喂给远程大模型（如 DeepSeek/Claude），要求其输出结构化的 JSON。
    ```text
    你是一个极其专业的私人秘书。请根据【已知上下文】，回答用户的【请求】。
    
    【已知上下文】：
    - 待办灵感：ID(123) "重构后端的向量检索逻辑"
    - 下周二已有日程：10:00-11:00 团队早会；14:00-15:00 见客户。
    
    【用户请求】：帮我找个时间把重构数据库的想法落实一下，最好在下周二...
    
    【输出要求】：请找出下周二的空闲时间，安排这个灵感。只输出 JSON，格式：
    {"reply": "话术", "proposedEvent": {"ideaId": "123", "newStartTime": 时间戳, "newEndTime": 时间戳}}
    ```

*   **3. UI 渲染“日程提案卡” (Proposal Card)：**
    大模型返回 JSON。前端 UI 拿到 JSON，不直接写入数据库，而是渲染出一张优雅的卡片：
    *“我已经为您查看了下周二的日程，下午 15:00 之后您有连续的空闲时间。是否将【重构数据库】安排在 15:30 - 17:30？”*
    卡片下方有两个大按钮：`[ 批准 Approve ]` / `[ 拒绝 Reject ]`。

*   **4. 闭环落盘：**
    用户点击“批准”。前端向 Worker 发送指令，根据 JSON 里的 `ideaId`，执行数据库 Update。灵感正式转化为日程，时间管理完成。

---

### 四、 达到“秘书级别”的几个关键技术细节

为了让这套系统不像个智障，而是像一个年薪百万的执行秘书，必须在底层架构中加入以下策略：

1.  **软删除与历史归档 (Soft Delete & Archiving)**
    日程是会改变的。不要在 Orama 里使用物理删除 (`delete`)。使用 `status: 'cancelled'` 或 `status: 'rescheduled'`。
    为什么？因为秘书必须拥有**记忆**。当老板问：“上个月那个取消的会议是关于什么的？” 如果你物理删除了，AI 就瞎了。保留状态，并在向量检索时利用标量过滤调取它们。

2.  **时间分块分配算法 (Time-blocking Heuristics)**
    纯靠 LLM 找空闲时间有时候会出错（幻觉）。最优的技术架构是：**本地计算空闲槽 + LLM 语义决策**。
    *   在把 Prompt 发给 LLM 之前，你的 Web Worker 应该运行一个极其简单的贪心算法，把下周二的 `[空闲时间段数组]`（例如：`[11:00-14:00, 15:00-18:00]`）算出来。
    *   把这个空闲数组连同上下文一起发给 LLM。LLM 只需要在这个数组里“挑”一个最合适的时间，这极大降低了 AI 排错时间的概率，这就是工程师思维与 AI 思维的完美结合。

3.  **防抖与持久化 (Debounce & Persist)**
    用户在 Boss 视图中可能会连续拖拽三个灵感胶囊。Orama 在内存中更新极快，但如果你每次更新都往 IndexedDB 里写一次盘，浏览器会卡顿。
    *必须实现一个机制：* 内存中的 Orama 实时更新，但触发一个带有 2 秒防抖（Debounce）的 `serialize()` 存盘函数。哪怕用户在此期间关掉网页，利用 `beforeunload` 钩子也能保证最后一次状态安全落盘。

### 总结

这套架构的精髓在于**克制**与**各司其职**：
*   **Web Workers & Orama：** 充当极速的本地神经反射，负责处理时间抽取、向量索引、数据分离。
*   **大模型 API (RAG)：** 仅仅作为“推理大脑”，不掌握全局数据，只根据被喂食的局部上下文做决策和输出 JSON。
*   **UI 主线程：** 保持极其轻量，只负责展现乔布斯式的视觉魔法。

只要按照这个双线程 + 本地统一 Schema 的蓝图去敲代码，这个智程日历不仅能跑起来，而且在保护隐私和响应速度上，将对现有的所有云端日历形成降维打击。

---

## 五、实现进展记录 (2026-03-17)

### 5.1 已完成的关键改进

#### ✅ 时间分块分配算法 (Time-blocking Heuristics)

**问题**：之前 SecretaryView 中的时间建议是硬编码的：
```typescript
// 旧代码 - 硬编码明天下午2点
suggestedTime = new Date();
suggestedTime.setDate(suggestedTime.getDate() + 1);
suggestedTime.setHours(14, 0, 0, 0);
```

**解决方案**：实现 `smartScheduler.ts` 服务，借鉴 FullCalendar 的冲突解决算法：

```typescript
// 新代码 - 智能时间分块
const suggestion = smartScheduler.findBestTimeSlot(
  60,  // 持续时间（分钟）
  {
    preferredDate: item.metadata.extractedDate,
    preferredTime: item.metadata.extractedTime,
    avoidWeekends: true
  },
  allItems  // 用于冲突检测
);

// 返回结果包含：
// - suggestedStart / suggestedEnd: 最佳时间
// - alternatives: 备选时间
// - conflicts: 冲突事件
// - confidence: 置信度
// - reason: 建议原因
```

**核心算法**：

1. **空闲时间段识别** (`findFreeSlots`)：
   - 遍历工作日的工作时间（默认 9:00-18:00）
   - 按 30 分钟间隔生成时间槽
   - 使用 `date-fns.areIntervalsOverlapping` 检测冲突

2. **最佳时间选择** (`findBestTimeSlot`)：
   - 优先匹配用户偏好时间
   - 自动跳过周末（可配置）
   - 返回多个备选方案

3. **冲突检测** (`checkConflict`)：
   - 检查新事件是否与现有日程重叠
   - 返回冲突事件列表

**技术栈**：
- `date-fns`：轻量级日期操作库（替代 moment.js）
- 纯函数设计，无副作用，易于测试

#### ✅ 本地 NLP 解析 (chrono-node)

**问题**：`nlpParserLegacy.ts` 使用正则表达式，维护困难。

**解决方案**：集成 `chrono-node` 中文解析器：

```typescript
import { zh } from 'chrono-node';

const results = zh.parse("明天下午3点和王总开会", new Date());
// 结果: { start: { year: 2024, month: 3, day: 18, hour: 15 }, ... }
```

**支持的中文时间表达式**：
- "明天下午3点"
- "下周五"
- "3月15日下午2点"
- "后天上午"
- "从今天到明天"

### 5.2 架构差距分析

| 架构要点 | 文档设计 | 当前实现 | 状态 |
|---------|---------|---------|------|
| 双线程隔离 | Web Worker 运行 AI + Orama | 全部在主线程 | 🔴 待实现 |
| 本地 NLP | chrono-node 中文优化 | ✅ 已实现 | ✅ 完成 |
| 向量生成 | WebGPU + Worker | 主线程 Transformers.js | 🟡 部分完成 |
| Orama 索引 | Worker 内存驻留 | 主线程内存 | 🟡 部分完成 |
| Boss 视图分离 | 标量查询分离 | ✅ 已实现 | ✅ 完成 |
| Secretary RAG | 混合检索 + LLM 推理 | 简单搜索 + 提案 | 🟡 部分完成 |
| 软删除归档 | status: cancelled 保留记忆 | 有 status 但未完整使用 | 🟡 部分完成 |
| 时间分块算法 | 本地贪心算法 + LLM 挑选 | ✅ 已实现 | ✅ 完成 |
| 防抖持久化 | 2秒防抖 + beforeunload | 直接同步写入 | 🟡 部分完成 |

### 5.3 下一步计划

**P1 - Web Worker 隔离**（预计 3 天）：
```
lib/workers/
├── aiWorker.ts           # AI 引擎 Worker
├── workerMessageTypes.ts # 消息类型定义
└── workerPool.ts         # Worker 池管理
```

**P2 - 完整 RAG 流程**（预计 2 天）：
- 增强 Orama 混合搜索的 where 条件
- 实现时间范围精确过滤
- 集成远程 LLM API（DeepSeek/Claude）

**P3 - 防抖持久化**（预计 0.5 天）：
- 实现 2 秒防抖的 serialize()
- 添加 beforeunload 钩子

### 5.4 关键文件变更

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `lib/services/smartScheduler.ts` | 🆕 新增 | 时间分块分配算法服务 |
| `lib/utils/nlpParserLegacy.ts` | 🔧 重构 | 使用 chrono-node 替代正则 |
| `lib/hooks/useUnifiedItems.ts` | 🔧 重构 | createIdea 集成 NLP 解析 |
| `components/ui/SecretaryView.tsx` | 🔧 重构 | 集成 smartScheduler |
| `package.json` | 🔧 更新 | 添加 date-fns 依赖 |

### 5.5 Bug 修复记录

#### 🐛 Schedule Proposal 时间不正确 (2026-03-17)

**问题**：用户输入"今天晚上12点睡觉"，返回的时间建议是"3月17日 09:00"，而不是用户期望的晚上12点。

**原因分析**：
1. `createIdea` 函数没有调用 NLP 解析，导致 `metadata.extractedDate` 和 `metadata.extractedTime` 为空
2. `smartScheduler` 只在工作时间（9:00-18:00）内寻找空闲时间，忽略了用户指定的非工作时间

**修复方案**：

1. **useUnifiedItems.ts** - 在创建 idea 时调用 NLP 解析：
```typescript
const createIdea = useCallback(async (content: string, metadata?: ...) => {
  // 先调用 NLP 解析提取时间信息
  const nlpResult = await parseNaturalLanguage(content);
  
  // 将提取的信息存入 metadata
  const enrichedMetadata = {
    ...metadata,
    extractedDate: nlpResult.date ? nlpResult.date.getTime() : undefined,
    extractedTime: nlpResult.time,
    extractedLocation: nlpResult.location,
    extractedPeople: nlpResult.people,
  };
  
  const idea = await unifiedItemService.createIdea(content, enrichedMetadata, ...);
  // ...
});
```

2. **smartScheduler.ts** - 优先使用用户指定的时间：
```typescript
findBestTimeSlot(duration, preferences, allItems) {
  // 如果用户指定了时间，先检查是否可用（不管是否在工作时间内）
  if (preferences.preferredDate || preferences.preferredTime) {
    const preferredStart = this.buildPreferredDateTime(preferences);
    const preferredEnd = addMinutes(preferredStart, duration);
    const conflicts = this.checkConflict(preferredStart, preferredEnd, events);
    
    // 如果没有冲突，直接返回用户指定的时间
    if (conflicts.length === 0) {
      return {
        suggestedStart: preferredStart,
        suggestedEnd: preferredEnd,
        confidence: 0.95,
        reason: `按照您指定的时间安排：...`
      };
    }
  }
  
  // 否则在工作时间内寻找替代时间
  // ...
}
```

**修复后效果**：
- 用户输入"今天晚上12点睡觉" → 提取时间 → 返回"今天 00:00"（凌晨）
- 用户输入"明天下午3点开会" → 提取时间 → 返回"明天 15:00"
- 如果指定时间有冲突 → 在工作时间内寻找替代时间并提示