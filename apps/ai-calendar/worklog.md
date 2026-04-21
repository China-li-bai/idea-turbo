# Worklog

## 2026-04-20 | Local AI Model 交互完善 & 数据流审查

### 任务目标
完善 Local AI Model 的交互，审查端侧存储/端侧模型/端侧记忆的数据流是否合理

### 前置调研
- [x] 审查当前数据流架构（AIService → LocalLLMProvider → SecretaryView）
- [x] 调研 2026 端侧 AI 技术突破（Transformers.js v4, WebLLM, MiniCPM4, VelesDB 等）
- [x] 识别架构问题和安全风险

### 发现的关键问题
1. **安全风险**: API Key 明文存储在 IndexedDB
2. **数据流断裂**: useSecretaryChat 直接访问 unifiedStore 绕过 Service 层
3. **无对话持久化**: 消息仅在 React state 中，刷新即丢失
4. **LLM 推理阻塞主线程**: 未使用 WebWorker
5. **AIService 单例不响应配置变更**: 初始化后 providers 缓存不更新
6. **意图分类仍走云端**: secretaryAIService 即使本地模型可用也调用云端
7. **无模型生命周期管理**: 加载后不卸载，无内存预算

### 执行计划与完成状态
- [x] P0: 修复意图分类硬编码 - secretaryAIService.classifyIntent() 从 `provider:'glm'` 改为读取 `config.defaultProvider`
- [x] P0: AIService 响应式重构 - 添加 `reinitialize()` 方法，配置变更时可重建 providers
- [x] P1: 安全修复 - API Key 加密存储（Web Crypto API AES-GCM，PBKDF2 密钥派生）
- [x] P1: 修复数据流 - useSecretaryChat 改用 `useUnifiedItems` 的 `createEvent`/`update` 方法
- [x] P1: 对话持久化 - 消息存储到 IndexedDB（db.chat 实例，最多保留 200 条）
- [x] P2: 本地模型意图分类适配 - 简化 LOCAL_MODEL_PROMPT + parseIntentResponse 容错 + normalizeIntent 映射
- [ ] P3: WebWorker LLM 推理 - 避免阻塞主线程（后续迭代）

### 修改文件清单
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `lib/services/secretaryAIService.ts` | 修改 | 移除硬编码 provider，添加 LOCAL_MODEL_PROMPT，增强 JSON 解析容错 |
| `lib/ai/index.ts` | 修改 | 添加 `reinitialize()` 方法 |
| `lib/ai/config.ts` | 修改 | API Key 加密存储（encryptProviderKeys/decryptProviderKeys） |
| `lib/utils/crypto.ts` | 新增 | Web Crypto API 加密工具（AES-GCM + PBKDF2） |
| `lib/hooks/useSecretaryChat.ts` | 修改 | 数据流修复 + 对话持久化 + clearHistory |
| `lib/storage/index.ts` | 修改 | 添加 db.chat 存储实例 |

### 安全审计
- [x] API Key 不再明文存储于 IndexedDB
- [x] 加密使用 PBKDF2 + AES-256-GCM（100000 iterations）
- [x] 加密失败时 graceful fallback（warn + 明文存储）
- [x] 解密失败时 graceful fallback（warn + 返回原文）
- [x] 对话消息不包含敏感信息（仅 content + role + timestamp）
- [x] 所有外部输入经过 JSON.parse + 正则提取，防止注入

### TypeScript 类型检查
- 所有修改文件零类型错误
- 已有 18 个类型错误均为历史遗留（测试文件 + secretaryQueryProcessor locale 类型）

### 状态: 已完成（P0-P2），P3 WebWorker 待后续迭代

---

## 2026-04-20 | Bug Fix: Secretary "No results found" for greetings

### 问题现象
用户输入"你好"等闲聊/问候消息，本地模型已加载，但显示 "No results found"

### 根因分析
`processQuery()` 中 `isComplexQuery("你好")` 返回 `false`（不匹配任何结构化模式）→ 直接走 `processSimpleQuery()` 关键词搜索 → 无结果 → 返回 "No results found"

**架构缺陷**：系统缺少"对话/闲聊"模式，所有非结构化命令输入都被当作搜索查询处理

### 修复方案
1. `secretaryAIService.ts` - 新增 `generateChatResponse()` 方法：使用配置的 provider（优先本地模型）生成自然语言对话回复
2. `secretaryQueryProcessor.ts` - 修改 `processQuery()`：当简单查询返回空结果且 AI 已配置时，fallback 到 AI 对话模式

### 修改文件
| 文件 | 变更 |
|------|------|
| `lib/services/secretaryAIService.ts` | +generateChatResponse() |
| `lib/services/secretaryQueryProcessor.ts` | processQuery() 增加 AI fallback |

### 修复后数据流
```
"你好" → isComplexQuery=false → processSimpleQuery → "No results found"
  → 检测空结果 + isAIConfigured=true → generateChatResponse() → 本地模型自然回复 ✅
```

---

## 2026-04-20 | UI/UX 优化: 输入框固定 + Typing 指示器 + 智能时间推荐

### 用户反馈的问题
1. 模型生成回答前没有合适的交互反馈（空白等待）
2. 输入框没有固定（消息多时滚走）
3. 时间安排没有搜索本地日程数据，直接硬编码时间给出弹框
4. ActionCard 只显示单一固定时间，无法选择

### 修复内容

#### 1. UI 层面 — SecretaryView.tsx + SCSS
| 变更 | 说明 |
|------|------|
| `.container` 加 `overflow: hidden` | flex 布局正确分配空间，输入框始终在底部 |
| `TypingIndicator` 组件 | 三点跳动动画 (`typingBounce` keyframe)，streaming 状态时显示 |
| `TimeSlotPicker` 组件 | 多个可选时间段卡片，支持点击切换选中状态 |
| `MessageBubble` 增强 | streaming 且无 content 时渲染 TypingIndicator；actions 带 timeSlots 时渲染 TimeSlotPicker |

#### 2. 逻辑层面 — secretaryQueryProcessor.ts
| 变更 | 说明 |
|------|------|
| `handleCreateEvent()` 重写 | 移除硬编码 9:00 时间，改用 `smartScheduler.findBestTimeSlot()` |
| 新增 `getAvailableTimeRanges()` 调用 | 查询目标日期本地日程的空闲时段（9:00-18:00, 过滤周末） |
| 返回 `timeSlots[]` | QueryResult 新增字段，携带最多 4 个推荐时间段 |
| 首个 slot 标记 `isRecommended` | smartScheduler 推荐的最佳时段高亮显示 |

#### 3. 数据流层面 — useSecretaryChat.ts
| 变更 | 说明 |
|------|------|
| `ChatMessage.timeSlots` 字段 | 扩展消息类型支持时间槽数组 |
| `selectTimeSlot()` 方法 | 点击时间段后更新 actions.params 的时间 + 刷新显示 |
| 结果处理传递 timeSlots | processQuery 返回值中的 timeSlots 映射到 ChatMessage |

### 修改文件清单
| 文件 | 变更类型 | 关键改动 |
|------|---------|---------|
| `components/ui/SecretaryView.tsx` | 重写 | +TypingIndicator, +TimeSlotPicker, MessageBubble 增强 |
| `components/ui/SecretaryView.module.scss` | 修改 | +typingIndicator 动画, +timeSlotList/Option 样式, container overflow:hidden |
| `lib/services/secretaryQueryProcessor.ts` | 修改 | handleCreateEvent 用 smartScheduler, +TimeSlot 接口, QueryResult+timeSlots |
| `lib/hooks/useSecretaryChat.ts` | 修改 | +TimeSlot 接口, ChatMessage+timeSlots, +selectTimeSlot() |

### TypeScript 类型检查
- 所有修改文件零类型错误 ✅

---

## 2026-04-20 | 数据流统一: 本地模型与远程模型对齐

### 问题
本地模型没有使用项目规定的数据结构和数据流逻辑，与远程大模型路径存在 5 处关键差异

### 差异对比与修复

| # | 差异 | 远程模型 | 本地模型(修复前) | 修复后 |
|---|------|---------|----------------|--------|
| 1 | 上下文注入 | `${contextInfo}\n\n用户请求` | 仅 `userMessage` | ✅ 同远程模型 |
| 2 | Prompt 完整性 | SYSTEM_PROMPT (详细) | LOCAL_MODEL_PROMPT (缺失 batch_actions/cancel_event/newTime) | ✅ 补全所有意图+参数说明 |
| 3 | enrichActions context | 传入真实 context | 硬编码 `{items:[], locale:'zh'}` | ✅ 传入真实 context |
| 4 | generateChatResponse | 无上下文 | 无上下文 | ✅ 注入 contextInfo + 区分本地/远程参数 |
| 5 | newTime 参数 | 支持 | 被移除 | ✅ 恢复支持，用户指定时间时直接使用 |
| 6 | timeSlots 时间 | N/A | 所有 slot 显示相同时间 (suggestion) | ✅ 每个 slot 用自己的 start/end |
| 7 | max_tokens | 500 | 300 (过小) | ✅ 400 |

### 修改文件
| 文件 | 关键改动 |
|------|---------|
| `lib/services/secretaryAIService.ts` | LOCAL_MODEL_PROMPT 增强, classifyIntent 注入上下文, parseIntentResponse 传入 context, generateChatResponse 注入上下文 |
| `lib/services/secretaryQueryProcessor.ts` | handleCreateEvent timeSlots bug 修复, newTime 参数恢复 |

### 统一后的数据流
```
用户输入 → processQuery()
  → classifyIntent(userMessage, context)
    → buildContextInfo(context)        ← 本地/远程统一注入
    → aiService.chat(messages, opts)   ← 本地/远程走同一 LLMProvider 接口
    → parseIntentResponse(content, userMessage, context)  ← 传入真实 context
    → enrichActions(actions, context)  ← 日期解析使用真实 context
  → handleCreateEvent / handleReschedule / ...
    → smartScheduler.findBestTimeSlot()  ← 查询本地日程数据
    → 返回 QueryResult { content, actions, timeSlots }
```
