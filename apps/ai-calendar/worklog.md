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
