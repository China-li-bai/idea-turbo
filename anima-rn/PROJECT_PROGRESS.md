# Anima-RN 项目架构文档 & 进度总览

> **"AI 数字分身宠物 + LBS 地图社交 + 破冰嘴替"** — 端侧全量 AI，本地记忆，隐私优先

---

## 一、项目定位

核心愿景：三级记忆分层 + Letta 归档决策 + PI 安全防护 + 访客社交模式

技术选型（方案A：极致性能跨平台组合）：
- 端侧推理：llama.rn (GGUF) / SmolLM-360M-Instruct
- Embedding：BGE-Micro-v2 ONNX → Keyword 128d 降级
- 存储：expo-sqlite (WAL) + 向量扩展
- 框架：Expo React Native + TypeScript + Zustand

---

## 二、架构全景图

```
┌─────────────────────────────────────────────────────────────┐
│                     App.tsx (UI Layer)                       │
│  聊天界面 | 系统面板 | 思维链展示 | 初始化入口                 │
├─────────────────────────────────────────────────────────────┤
│                  store/index.ts (Zustand)                    │
│  Pet/Message/Memory/ShareLink/View/SystemStatus 状态管理     │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│AnimaCore │PrivacyGuard│MemorySystem│EmbeddingEngine│LocalBrain│
│(协调器)   │(安全层)    │(三层记忆)  │(双引擎)      │(推理层)   │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                      LocalDB.ts (SQLite)                     │
│  pets | episodic_memories | semantic_facts | conversations   │
├─────────────────────────────────────────────────────────────┤
│              Native Bridge (Mocked in Test)                   │
│  llama.rn | expo-sqlite | onnxruntime-rn | expo-vector-search│
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入 "今天老板又让我加班"
       │
       ▼
┌─ AnimaCore.chat() ─────────────────────────────┐
│ 1. detectPromptInjection() → safe               │ ← PrivacyGuard
│ 2. addToWorkingMemory()                          │ ← MemorySystem
│ 3. trackConversation()                           │ ← AnimaCore
│ 4. generatePetReply()                            │
│    ├→ buildMemoryPromptContext() → RAG上下文      │ ← MemorySystem
│    ├→ buildSystemPrompt() → 角色Prompt           │ ← LocalBrain
│    ├→ runCompletion() → llama.rn 推理            │ ← LocalBrain
│    └→ extractAndClassify() → 提取新记忆           │ ← MemorySystem
│ 5. shouldArchive() → 关键词触发归档               │ ← AnimaCore
│ 6. return { reply, thinkingSteps, piBlocked }     │
└──────────────────────────────────────────────────┘
```

---

## 三、模块清单

| 模块 | 文件 | 行数 | 职责 |
|------|------|------|------|
| AnimaCore | src/lib/AnimaCore.ts | 409 | 三步初始化链 / Chat流水线 / 归档决策 / 对话追踪 |
| LocalBrain | src/lib/LocalBrain.ts | ~560+ | llama.rn 推理 / 宠物回复生成 / 访客模式 / 回退模板系统 |
| MemorySystem | src/lib/MemorySystem.ts | 563 | 工作记忆 / 情节记忆 / 语义记忆 / 提取分类 / 向量检索 / 整理GC |
| LocalDB | src/lib/LocalDB.ts | 347 | SQLite Schema / CRUD / 索引 / 隐私过滤 / 配置KV |
| EmbeddingEngine | src/lib/EmbeddingEngine.ts | 227 | Keyword(128d) + ONNX(BGE-Micro) 双引擎 / 相似度检索 |
| PrivacyGuard | src/lib/PrivacyGuard.ts | 197 | PI检测9模式 / 3级隐私分级 / 输出消毒 / 安全Prompt |
| OnnxEmbeddingEngine | src/lib/OnnxEmbeddingEngine.ts | — | ONNX Runtime BGE-Micro 嵌入 (真机备用) |
| UI | App.tsx | 563 | 聊天界面 / 系统状态面板 / 思维步骤条 / 输入区 |
| Types | src/types/index.ts | 182 | 15+ 接口 / 枚举 / 配置常量 (Pet/Message/Memory/Privacy) |
| Store | src/store/index.ts | 83 | Zustand 全局状态 / View路由 / Thinking状态 |

### 测试文件

| 测试套件 | 文件 | 用例数 | 覆盖目标 |
|----------|------|--------|----------|
| PrivacyGuard | src/__tests__/PrivacyGuard.test.ts | 23 | PI检测(B1-B7) + 隐私分级(C1-C7) + 过滤(G1-G3) + 输出消毒(H1-H4) |
| EmbeddingEngine | src/__tests__/EmbeddingEngine.test.ts | 14 | 嵌入(F1-F2) + 相似度(F3-F5) + 批量 + 检索 |
| AnimaCore | src/__tests__/AnimaCore.test.ts | 13 | 初始化(A1-A3) + 归档决策(E3-E5) + PI集成 + 计数器 |
| MemorySystem | src/__tests__/MemorySystem.test.ts | 5 | 记忆提取(D1-D5) + 隐私集成 + 边界 |

**总计: 55 tests, 4 suites, 全部通过 ✅**

---

## 四、功能完成度

### 已完成 (15项)

| # | 功能 | 实现位置 | 状态 |
|---|------|----------|------|
| 1 | 三级记忆分层架构 (Working/Episodic/Semantic) | MemorySystem.ts | 生产级 |
| 2 | Letta 归档决策 (关键词触发 + 轮次阈值) | AnimaCore.shouldArchive() | 已测试 |
| 3 | PI 检测系统 (9种攻击模式, 3级风险) | PrivacyGuard.detectPromptInjection() | 已测试 |
| 4 | 3级隐私分级 (公开/熟人/私密) + 自动分类 | PrivacyGuard.classifyPrivacyFromContent() | 已测试 |
| 5 | 记忆提取器 (事件检测 + 事实抽取) | MemorySystem.extractAndClassify() | 已测试 |
| 6 | 关键词嵌入引擎 (128d, Hash+TF-IDF) | KeywordEmbeddingEngine | 85%覆盖 |
| 7 | SQLite 持久化 (5表, 完整索引, 外键) | LocalDB.ts | 生产级 |
| 8 | 记忆整理 GC (衰减+遗忘+后台调度) | MemorySystem.consolidateMemories() | 已实现 |
| 9 | 工作记忆 (20条上限, 自动主题摘要) | MemorySystem.WorkingMemory | 已实现 |
| 10 | 混合向量检索 (向量相似度 + 关键词 + 时效性) | retrieveRelevantEpisodic() | 已实现 |
| 11 | 访客聊天模式 (严格PI + 输出消毒) | chatVisitor() + sanitizeOutputForExternal() | 已实现 |
| 12 | 回退模板系统 (关键词->性格->通用三级降级) | REPLY_PATTERNS + FALLBACKS_BY_PERSONALITY | 丰富 |
| 13 | Zustand 全局状态 (完整类型安全) | store/index.ts | 完整 |
| 14 | Chat MVP UI (思维链/系统面板/消息气泡) | App.tsx | 可用 |
| 15 | Jest 测试套件 (55 cases, 4 suites) | __tests__/ | 全绿 |

### 进行中 / 部分完成 (4项)

| # | 功能 | 状态 | 说明 |
|---|------|------|------|
| 16 | ONNX Embedding 引擎 | 代码就绪, 未真机验证 | OnnxEmbeddingEngine.ts 存在, 需要 RN 设备跑通 onnxruntime-react-native |
| 17 | llama.rn 端侧推理 | Mock通过, 待真机测试 | SmolLM-360M-Instruct GGUF 模型已就位 (~360MB) |
| 18 | 多宠物支持 | 类型完备, UI单宠 | types 支持, App.tsx 硬编码单宠 |
| 19 | 分享链接机制 | 类型定义存在 | ShareLink interface 有, 无生成/验证逻辑 |

### 未开始 (7项)

| # | 功能 | 优先级 | 说明 |
|---|------|--------|------|
| 20 | LBS 地图视图 | P0 核心差异化 | Zenly式宠物地图游荡, 高德/Mapbox SDK |
| 21 | 宠物相亲匹配 | P0 核心差异化 | 两只宠物靠近时自动嗅探匹配度 |
| 22 | 语气模仿 (Tone of Voice) | P1 | Few-Shot Prompting 模仿主人说话风格 |
| 23 | 后台梦境整理 | P1 | 充电时自动运行记忆压缩/提炼 |
| 24 | 宠物创建流程 UI | P1 | 选物种/性格/起名/生成背景故事 |
| 25 | 设置/偏好页面 | P2 | 模型选择/记忆管理/隐私配置 |
| 26 | 推送通知 | P2 | 宠物主动发起对话/匹配提醒 |

---

## 五、已知 Bug 修复记录

| Date | Bug | 根因 | 修复文件 | 影响 |
|------|-----|------|----------|------|
| 2026-04-18 | 空 Prompt Injection 误报 | `(.{0,30})(?:\1){2,}` 允许空串匹配导致任何输入命中 suspicious | PrivacyGuard.ts:13 `.{0,30}` -> `.{1,30}` | B6/B7/空串测试修复 |
| 2026-04-18 | piBlocked 返回 undefined | 正常 Chat 路径未显式设置 piBlocked 字段 | AnimaCore.ts:183 添加 `piBlocked: false` | E5/多轮/safe测试修复 |
| 2026-04-18 | AnimaCore 无法在测试中导入 | class 定义缺少 export 关键字 | AnimaCore.ts:76 添加 export | 测试实例化问题修复 |

---

## 六、测试覆盖率快照

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   58.55 |    41.21 |    47.4 |   60.53|
 AnimaCore.ts       |   64.38 |    49.31 |   57.89 |   65.73|
 EmbeddingEngine.ts |   86.32 |    66.66 |   86.66 |   85.18|
 LocalBrain.ts      |   44.23 |    19.23 |   37.14 |    46.30|
 LocalDB.ts         |   61.17 |    48.78 |   36.84 |   63.41|
 MemorySystem.ts    |   49.79 |    39.31 |   40.38 |   54.02|
 PrivacyGuard.ts    |   70.12 |    58.97 |   57.14 |   69.56|
--------------------|---------|----------|---------|---------|
```

---

## 七、路线图

```
Phase 1 ─── 数据流闭环验证 ✅ 完成 (2026-04-18)
    │
    ▼
Phase 2 ─── 端侧真机验证 (下一步)
    ├→ ONNX Embedding 在 RN 设备上跑通
    ├→ llama.rn 加载 SmolLM-360M 真实推理
    └→ SQLite WAL 模式性能测试
    │
    ▼
Phase 3 ─── UI 完善
    ├→ 宠物创建向导 (选物种/性格/起名)
    ├→ 多宠物切换 + 记忆隔离
    ├→ 记忆浏览器 (查看/删除/编辑)
    └→ 设置页 (模型路径/整理策略/隐私级别)
    │
    ▼
Phase 4 ─── 社交差异化功能
    ├→ LBS 地图 (宠物游荡 + 附近显示)
    ├→ 分享链接 (生成/过期/访问统计)
    ├→ 访客聊天 UI (独立于主人模式)
    └→ 宠物匹配算法 (性格标签 + 兴趣交集)
```

---

## 八、运行命令

```bash
cd apps/anima-rn

# 开发
bun start          # Expo dev server
bun run ios        # iOS simulator
bun run android    # Android emulator

# 测试
bun run test              # Jest 全量测试
bun run test:coverage     # 带覆盖率报告
```
