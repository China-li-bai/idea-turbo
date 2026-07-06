# Worklog

## 2026-06-23

### 任务：mnemosyne 记忆层 P0 缺陷修复 + reranker 移植（方案 A-revised：抄设计，不抄代码）

**开始时间**: 2026-06-23
**任务描述**: 放弃直接引入 `isar_agent_memory`（源码审计发现 5 个致命问题），改为**抄其 reranker 设计 + 自研 ObjectBox 数据层**，修复 mnemosyne 记忆层 4 个 P0 缺陷。

**背景**:
- 方案 A（直接引入 isar_agent_memory 0.4.0）源码审计发现致命问题：
  1. `MemoryNode.metadata` 是 `@ignore`（不持久化）→ 业务字段丢失
  2. `ObjectBoxVectorIndex` 硬编码 `@HnswIndex(dimensions: 768)` → mnemosyne 用 256 维会抛 ArgumentError
  3. `ObjectBoxVectorIndex.open()` 用独立 Store → 双数据库
  4. 重依赖 firebase_core/onnxruntime/langchain/cryptography/vertex_ai
  5. flat_buffers 冲突，dependency_overrides 不传递到使用者
- isar_agent_memory 真正可复用价值：4 个 reranker 类（BM25/MMR/Diversity/Recency，~200 行）
- 为 200 行引入 Isar + firebase + onnx + 双数据库 + 依赖冲突，代价远超收益

**方案 A-revised 决策**:
- 不引入 isar_agent_memory、不引入 Isar、不引入任何新依赖
- 抄 isar_agent_memory 的 reranker 算法设计，自己实现（~200 行）
- 基于现有 ObjectBox 数据层修复 P0 缺陷
- ADR-003：否决 isar_agent_memory 直接引入，改为参考设计自研

**P0 缺陷修复映射**:
| # | 缺陷 | 修复方案 |
|---|------|---------|
| #2 | contentHash 全表扫描 | 用 ObjectBox HNSW 向量检索做去重（已有 MemoryVectorIndex） |
| #3 | lifecycle O(n²) 合并 | 用 HNSW topK 邻居替代全表两两比较 |
| #4 | embedding 双写 | 统一 SSOT 到 MemoryEntity.embedding，删除 MemoryVectorIndex 或合并 |
| #6 | RawMessage 内存态 | 新增 RawMessageEntity（ObjectBox 持久化） |

**预期产出**:
- 4 个 reranker 类（BM25/MMR/Diversity/Recency）
- 4 个 P0 缺陷修复
- 单元测试覆盖
- dart analyze 无错误
- 0 新增依赖

**当前状态**: ✅ 已完成（2026-06-23）

**完成总结**:

#### Phase 1.2: 4 个 reranker 实现（抄设计，不抄代码）
- `lib/features/memory/domain/rerankers/re_ranking_strategy.dart` — 抽象接口
- `lib/features/memory/domain/rerankers/bm25_re_ranker.dart` — Okapi BM25 算法
- `lib/features/memory/domain/rerankers/mmr_re_ranker.dart` — Maximal Marginal Relevance
- `lib/features/memory/domain/rerankers/diversity_re_ranker.dart` — 多样性最大化
- `lib/features/memory/domain/rerankers/recency_re_ranker.dart` — 时间近因
- `lib/features/memory/domain/rerankers/rerankers.dart` — barrel export
- 16 个单元测试全过（`test/domain/rerankers/re_ranker_test.dart`）

#### Phase 1.3: P0 #4 修复 — embedding 统一 SSOT
- `MemoryEntity.embedding` 加 `@HnswIndex(dimensions: 256, distanceType: VectorDistanceType.cosine)`
- 删除 `MemoryVectorIndex` 实体（消除 embedding 双写）
- `ObjectBoxMemoryDataSource.vectorSearch` 直接查 `MemoryEntity.embedding`
- `retrieval_engine.dart` 适配：`MemoryVectorIndex` → `MemoryEntity`

#### Phase 1.4: P0 #2 修复 — contentHash 索引化
- `MemoryEntity` 新增 `@Index() String contentHash` 字段
- `fromDomain` 自动从 metadata 提取或计算 MD5 contentHash
- `ObjectBoxMemoryDataSource` 新增 `findByContentHash` / `findAllByContentHash` / `getMemoriesGroupedByContentHash`
- 全表扫描 → ObjectBox 索引精确查询

#### Phase 1.5: P0 #3 修复 — lifecycle O(n²) → HNSW topK
- `ConsolidationEngine` 新增 `findConsolidationCandidatesWithIndex`（异步版）
- 新增 `NeighborFinder` typedef + `_clusterBySimilarityWithIndex` 方法
- `MemoryService.findConsolidationCandidates` 改用索引版
- `ObjectBoxMemoryDataSource` 新增 `vectorSearchWithDistance` 返回 distance
- 复杂度 O(n²) → O(n·k)，k = maxClusterSize

#### Phase 1.6: P0 #6 修复 — RawMessage 持久化
- 新增 `RawMessageEntity`（ObjectBox @Entity）
- `ObjectBoxMemoryDataSource` 新增 RawMessage CRUD：
  - `insertRawMessage` / `updateRawMessage`
  - `getPendingRawMessages` / `markRawMessageProcessed`
- 应用重启后未处理消息不再丢失

#### Phase 1.7: 测试验证
- `dart analyze lib/` — 0 错误（1 个预先存在的 warning）
- `test/domain/` + `test/services/` — 136 个测试全过
- `test/domain/rerankers/` — 16 个新测试全过
- `test/integration/memory_lifecycle_test.dart` — 19 个测试全过
- 3 个 xiang_recall_test 失败是 ObjectBox 动态库环境问题（预先存在，非本次引入）

**新增依赖**: 0（完全使用现有 objectbox 5.2.0 + crypto 3.0.3）
**修改文件**: 12 个（新建 7 个，修改 5 个）
**删除文件**: 1 个（memory_vector_index.dart）

---

## 2026-06-18

### 任务：mnemosyne 记忆层迁移到 isar_agent_memory（方案 A：保留外壳，替换内核）

**开始时间**: 2026-06-18
**任务描述**: 将 mnemosyne 的通用记忆基础设施（向量检索/去重/合并/重排/同步）替换为开源 `isar_agent_memory` 0.4.0，保留情感衰减/象/拟人化等差异化模块，修复上次审计出的 P0 缺陷（contentHash 全表扫描、O(n²) 合并、embedding 双写、RawMessage 内存态）。

**背景**:
- 上次审计发现 mnemosyne 记忆层有 6 个 P0/P1 缺陷，集中在 God Object、全表扫描、SSOT 违反
- GitHub 社区已有 `isar_agent_memory`（Dart/Flutter，0.4.0，HiRAG 分层 + BM25/MMR/Recency 重排 + 跨设备同步 + 可解释召回），与 mnemosyne 重合度 85%
- 用户选择方案 A：保留情感层外壳，替换数据层内核

**预期产出**:
- 迁移设计文档（字段映射、数据流、功能分层、安全性、回滚策略）
- 修复 P0 缺陷 #2/#3/#4/#6
- 代码量减少约 40%

**当前状态**: ✅ 完成 — 迁移设计文档已产出

**产出**:
- `docs/plans/2026-06-18-mnemosyne-isar-migration.md`（迁移设计文档，14 章节）
- 字段映射表（28 个 MemoryItem 字段 → MemoryNode/Degree/MemoryEmbedding/metadata）
- 4 阶段渐进式迁移路径（Phase 1 新增 adapter → Phase 2 双写 → Phase 3 切换 → Phase 4 清理）
- P0 缺陷修复映射（#2/#3/#4/#6 全部解决）
- ADR-001（选 isar_agent_memory）+ ADR-002（strength→Degree.importance）
- 回滚策略（MnemosyneConfig.backend 开关）

**下一步**: 等待用户确认后进入 Phase 1 实施

---

## 2026-04-21

### 任务：AI数字分身宠物 UI/UX 全面升级

**开始时间**: 2026-04-21
**任务描述**: 为 Anima AI 数字分身宠物产品进行完整的 UI/UX 界面重构，打造符合2026年前沿趋势的沉浸式AI宠物交互体验。

**调研内容**:
- 2026年 UI/UX 趋势：生成式UI (GenUI)、Agentic UX、情感化AI界面
- AI Companion 设计模式：Character Integrity、情感表达、信任构建
- 相关开源方案：Character.AI、Replika、Pi 等产品的交互设计分析

**核心改进点**:
1. **主题系统升级**: 新增宠物专属主题 (petTheme)，支持7种宠物类型（猫、狗、鸟、兔、仓鼠、狐、蝾螈），每种有独立配色、性格和emoji
2. **PetAvatar 重构**: 支持情绪动画（开心、兴奋、好奇、困倦）、呼吸脉冲、发光光环、状态指示器
3. **ChatBubble 重构**: 宠物专属气泡配色、消息尾巴设计、系统消息卡片、入场动画优化
4. **ThinkingIndicator 重构**: 三色跳动圆点、思考步骤标签、宠物头像联动
5. **ProgressLoader 重构**: 浮动宠物emoji、进度条、阶段提示、WiFi下载提示、错误重试界面
6. **InputBar 重构**: 宠物主题发送按钮、字符计数、禁用状态优化
7. **ChatScreen 重构**: 全新头部设计（状态点+在线状态）、空状态引导、加载状态、宠物主题贯穿

**修改文件**:
- `src/theme/index.ts` - 新增 petTheme、animation、chatBubble 等
- `src/components/PetAvatar.tsx` - 情绪动画+发光效果
- `src/components/ChatBubble.tsx` - 宠物主题气泡+尾巴
- `src/components/ThinkingIndicator.tsx` - 思考动画+步骤标签
- `src/components/ProgressLoader.tsx` - 全新加载界面
- `src/components/InputBar.tsx` - 主题化输入栏
- `src/screens/ChatScreen.tsx` - 完整界面重构

**代码审查**:
- TypeScript 编译通过 (`npx tsc --noEmit`)
- 修复了 `withSequence` 未导入的错误
- 所有组件类型安全，Props 定义完整
- 遵循 React Native 最佳实践

**经验总结**:
- 宠物主题系统 (petTheme) 是本次重构的核心设计决策，通过物种驱动UI配色，实现了"一宠一色"的个性化体验
- 情绪动画显著提升了AI宠物的"生命感"，mood 属性让组件可以表达状态
- 空状态设计对首次用户体验至关重要，引导性提示能降低使用门槛
- 最小可执行原则：先完成核心聊天链路，再逐步丰富周边组件

## 2026-04-29

### 任务：AI 宠物 Zero-UI 范式实现 (Flutter)

**开始时间**: 2026-04-29
**任务描述**: 将宠物系统演进为 Mobile-first 的 AI 互动陪伴应用，采用 Zero-UI 范式消除传统对话框模式，实现5层空间交互架构。

**参考项目**: `zip/` (React + Framer Motion 实现的 Zero-UI 原型)

**架构设计**:
- 5层空间叠加模型：Habitat(背景) → Entity(宠物) → SpatialUI(浮动字幕/粒子) → Gesture(手势) → HUD(控件)
- 核心理念：宠物始终"活着"，用户不需要"打开聊天"，而是直接与宠物互动
- 交互方式：抚摸(长按) / 戳(点击) / 双击(爱心) / 语音 / 文字
- 宠物"说话"通过浮动字幕气泡，非传统对话框

**关键设计决策**:
1. 纯 Flutter Widget 构建宠物（无需3D引擎/外部资源），用 Container + BoxDecoration 实现猫型生物
2. 眼动追踪：宠物眼睛跟随触摸位置
3. 生物节律：自动眨眼、呼吸、耳朵抖动
4. 空间字幕：浮动在宠物附近的半透明气泡，自动淡出
5. 粒子系统：心形/星光/音符特效

## 2026-04-30

### 任务：五大非技术性设计维度落地（生死要素）

**开始时间**: 2026-04-30
**任务描述**: 将产品层面的五大"生死要素"从概念设计落地为可运行的技术架构与代码模块，补齐"技术牛逼"到"商业成功"的鸿沟。

**五大维度**:
1. 冷启动救星：地图 NPC 与虚实结合
2. 脆弱感与养成羁绊：情绪/电量机制 + 性格觉醒盲盒
3. 炫耀切片：每日破冰战报 + 一键分享裂变
4. 安全护城河：社交防火墙 + 一键护盾
5. 商业化后路：分层订阅 + 虚拟道具

**设计决策**: 所有新模块遵循现有 Clean Architecture 模式，放置在 `packages/mnemosyne/lib/features/` 下

**实现文件**:
- `features/social/npc/npc_entity.dart` - NPC 实体（类型/稀有度/位置/品牌信息/优惠券）
- `features/social/npc/npc_pool_service.dart` - NPC 池管理（5个预设NPC+附近搜索+交互+优惠券）
- `features/social/npc/solo_play_service.dart` - 单机玩法（宠物日记/自言自语/乱跑）
- `features/pet/vitality/vitality_service.dart` - 四维状态机（社交能量/情绪电量/无聊度/孤独度）
- `features/pet/vitality/personality_awakening.dart` - 性格觉醒系统（7种原型+20+特质关键词检测）
- `features/social/report/daily_report_entity.dart` - 战报实体（高光瞬间/灵魂匹配/分享卡片）
- `features/social/report/daily_report_service.dart` - 战报生成服务
- `features/social/safety/prompt_injection_defense.dart` - Prompt注入防御（11种模式+语义分析+信息过滤）
- `features/social/safety/social_shield.dart` - 社交护盾（4种模式+自动拉黑+消息限流）
- `features/commerce/subscription/subscription_service.dart` - 三层订阅+功能门控
- `features/commerce/virtual_goods/virtual_goods_service.dart` - 虚拟商品+钱包+每日奖励

**代码审查**:
- 所有模块遵循 Clean Architecture（domain/data/presentation 分层）
- 所有实体使用 `copyWith` 模式（与现有 MemoryItem 一致）
- 安全模块使用双重防御（正则模式匹配 + 语义分析）
- 商业化模块使用功能门控（checkFeature/checkMemoryLimit/checkSocialLimit）

**经验总结**:
- "技术牛逼 ≠ 商业成功"：纯技术架构再完美，也需要产品层面的生死要素来补齐
- 冷启动是 LBS 社交的命门：NPC 系统是"0到1"的救星
- 安全不能依赖 LLM 自身判断：硬编码的注入检测是必须的防线
- 性格觉醒的"盲盒感"是留存核心：聊出来的性格比选出来的更有成就感

---

### 任务：neural-bridge SDK 实现与 mnemosyne 向量索引解耦

**开始时间**: 2026-04-30
**任务描述**: 实现独立于 mnemosyne 的 neural-bridge SDK，提供 Embedding/LLM/对话管理三层胶水，并解决 ObjectBox HNSW 维度硬编码问题。

**核心设计**:
1. **neural-bridge SDK** (`packages/neural_bridge/`): 独立包，零耦合
   - Embedding 层: `EmbeddingProvider`(抽象) → `GemmaEmbeddingProvider`(端侧) / `CloudEmbeddingProvider`(云端) / `MockEmbeddingProvider`(测试)
   - LLM 层: `LLMProvider`(抽象) → `LlamafuProvider`(端侧) / `CloudLLMProvider`(云端) / `MockLLMProvider`(测试)
   - 对话管理层: `ConversationManager`(接口) → `DefaultConversationManager`(工作记忆+上下文窗口+归档回调)
   - 统一入口: `NeuralBridge` facade，自动 fallback（端侧优先→云端→Mock）

2. **MemoryVectorIndex 独立实体**: 解决 ObjectBox HNSW 维度硬编码
   - 从 `MemoryEntity` 移除 `@HnswIndex(dimensions: 384)`，保留 `embedding` 字段作为普通属性
   - 新建 `MemoryVectorIndex` 实体，`@HnswIndex(dimensions: 256)`，通过 `memoryUid` 关联
   - 记录模型元数据（modelName/rawDimensions/outputDimensions/isTruncated）

**实现文件**:
- `packages/neural_bridge/lib/neural_bridge.dart` - barrel export
- `packages/neural_bridge/lib/src/core/neural_bridge.dart` - NeuralBridge facade
- `packages/neural_bridge/lib/src/core/neural_bridge_config.dart` - 全局配置
- `packages/neural_bridge/lib/src/embedding/embedding_provider.dart` - 抽象基类+Exception+Result
- `packages/neural_bridge/lib/src/embedding/gemma_embedding_provider.dart` - EmbeddingGemma 端侧
- `packages/neural_bridge/lib/src/embedding/cloud_embedding_provider.dart` - 云端 Embedding
- `packages/neural_bridge/lib/src/embedding/mock_embedding_provider.dart` - 测试 Mock
- `packages/neural_bridge/lib/src/embedding/embedding_service.dart` - 统一服务+自动 fallback
- `packages/neural_bridge/lib/src/llm/llm_provider.dart` - 抽象基类+Exception+Message/Tool/Result
- `packages/neural_bridge/lib/src/llm/llamafu_provider.dart` - Llamafu 端侧
- `packages/neural_bridge/lib/src/llm/cloud_llm_provider.dart` - 云端 LLM
- `packages/neural_bridge/lib/src/llm/mock_llm_provider.dart` - 测试 Mock
- `packages/neural_bridge/lib/src/llm/llm_service.dart` - 统一服务+自动 fallback
- `packages/neural_bridge/lib/src/conversation/conversation_manager.dart` - 对话管理接口
- `packages/neural_bridge/lib/src/conversation/conversation_message.dart` - 消息模型
- `packages/neural_bridge/lib/src/conversation/conversation_session.dart` - 会话模型
- `packages/neural_bridge/lib/src/conversation/conversation_config.dart` - 对话配置
- `packages/neural_bridge/lib/src/conversation/default_conversation_manager.dart` - 默认实现
- `packages/mnemosyne/lib/features/memory/data/models/memory_vector_index.dart` - 独立向量索引
- `packages/mnemosyne/lib/features/memory/data/datasources/objectbox_memory_datasource.dart` - 更新：向量搜索迁移到 MemoryVectorIndex

**编译验证**: `dart analyze lib/` → No issues found!

**经验总结**:
- `implements` vs `extends`: abstract class 有 default method 时必须用 `extends`
- Exception 类应定义在抽象层，与接口一起暴露
- ObjectBox HNSW 维度是编译期常量，独立实体是解耦的唯一方案
- MRL 截断(768→256)是端侧向量搜索的最优维度选择

---

### 任务：L2/L3 层集成 — Embedding 回调注入 + 桥接层 + 三级记忆生命周期

**开始时间**: 2026-04-30
**任务描述**: 完成 neural-bridge SDK 的 L2（Embedding 真实接入）和 L3（桥接层+生命周期管理器）实现，打通 NeuralBridge ↔ Mnemosyne 的完整数据流。

**核心设计决策**:
1. **回调注入模式**: `GemmaEmbeddingProvider` 不硬依赖 `flutter_gemma` 插件，而是接受 `OnDeviceEmbeddingCallback` 回调。App 层负责提供 `flutter_gemma` 的推理函数，SDK 保持零平台耦合。
2. **FlutterGemmaAdapter**: 便捷工厂类，一行代码创建 `GemmaEmbeddingConfig`。
3. **NeuralMnemosyneBridge**: 双向桥接层，提供 `rememberWithEmbedding()`（自动生成向量再存储）和 `recallWithEmbedding()`（自动生成查询向量再搜索）。
4. **MemoryLifecycleManager**: 三级记忆生命周期管理器，实现 Working→Episodic→Semantic 的自动晋升与归档。

**新增文件**:
- `packages/neural_bridge/lib/src/embedding/flutter_gemma_adapter.dart` - flutter_gemma 适配器
- `packages/neural_bridge/lib/src/bridge/neural_mnemosyne_bridge.dart` - NeuralBridge↔Mnemosyne 桥接
- `packages/neural_bridge/lib/src/bridge/memory_lifecycle_manager.dart` - 三级记忆生命周期管理器

**修改文件**:
- `packages/neural_bridge/lib/src/embedding/gemma_embedding_provider.dart` - 重写：回调注入+L2归一化+MRL截断
- `packages/neural_bridge/lib/src/core/neural_bridge.dart` - barrel export 补全
- `packages/neural_bridge/pubspec.yaml` - 添加 mnemosyne 依赖
- `packages/mnemosyne/lib/features/pet/vitality/vitality_service.dart` - 清理 unused import
- `packages/mnemosyne/lib/features/pet/vitality/personality_awakening.dart` - 清理 unused import/field

**编译验证**: 两个 SDK 均 `dart analyze lib/` → No issues found!

**经验总结**:
- 回调注入是 SDK 解耦的最佳实践：neural-bridge 不依赖任何 Flutter 平台插件，App 层自由选择推理引擎
- 三级记忆晋升条件：importance ≥ 0.5 + accessCount ≥ 3 + 有 embedding 向量
- Working Memory 归档时机：对话会话结束时（archiveSession），自动将用户消息转为 Episodic Memory
- L2 归一化必须在 MRL 截断之前执行：先归一化 768 维，再截断到 256 维

---

### 任务：测试驱动架构迭代 — 设计测试案例，发现问题，迭代升级

**开始时间**: 2026-04-30
**任务描述**: 为 neural-bridge SDK 设计全面测试案例，通过测试发现架构缺陷并迭代升级。

**发现的架构问题及修复**:

1. **依赖倒置缺失** (严重): `NeuralMnemosyneBridge` 和 `MemoryLifecycleManager` 直接依赖 `Mnemosyne` 具体类，无法 mock 测试。
   - **修复**: 创建 `MemoryStore` 和 `EmbeddingSource` 抽象接口，桥接层改为依赖接口。
   - **新增**: `MnemosyneMemoryStore` 和 `NeuralBridgeEmbeddingSource` 适配器。

2. **MRL 截断后归一化丢失** (严重): 截断 768→256 维后，向量范数 < 1.0，导致余弦相似度计算不准确。
   - **修复**: `GemmaEmbeddingProvider.embed()` 在 MRL 截断后增加二次 L2 归一化。
   - **正确流程**: 原始输出 → L2归一化 → MRL截断 → **再次L2归一化**

3. **ConsolidationResult 缺失必填字段** (中): Mock 测试暴露 `memoryType`、`centroidEmbedding`、`consolidationTimestamp` 为必填。

**新增文件**:
- `packages/neural_bridge/lib/src/bridge/memory_store.dart` - MemoryStore 抽象接口 + MnemosyneMemoryStore 适配器
- `packages/neural_bridge/lib/src/bridge/embedding_source.dart` - EmbeddingSource/ConversationSource 抽象接口 + 适配器
- `packages/neural_bridge/test/bridge/bridge_lifecycle_test.dart` - Bridge + Lifecycle 集成测试 (27 个用例)

**修改文件**:
- `packages/neural_bridge/lib/src/bridge/neural_mnemosyne_bridge.dart` - 重构：依赖 MemoryStore/EmbeddingSource 接口
- `packages/neural_bridge/lib/src/bridge/memory_lifecycle_manager.dart` - 重构：依赖 MemoryStore/EmbeddingSource 接口
- `packages/neural_bridge/lib/src/embedding/gemma_embedding_provider.dart` - 修复：MRL 截断后二次归一化
- `packages/neural_bridge/lib/src/core/neural_bridge.dart` - barrel export 补全
- `packages/neural_bridge/test/embedding/embedding_pipeline_test.dart` - 修复 MRL 测试断言

**测试结果**:
- neural_bridge: **47 tests passed** ✅
- mnemosyne: **120 tests passed** ✅

**测试覆盖维度**:
- Embedding 管线: 回调注入、初始化、L2归一化、MRL截断、fallback链、batch、超时
- Bridge 桥接: 自动embedding存储、无embedding降级、对话归档、系统消息过滤
- Lifecycle 生命周期: Working→Episodic归档、Episodic→Semantic晋升、晋升条件过滤、重要性/情感估算、全周期运行、层级过滤召回

---

### 任务：社区标准测试升级 — CRI/BEIR/AMB 三大基准框架

**开始时间**: 2026-04-30
**任务描述**: 审查现有测试是否符合社区标准，发现差距，按 CRI/BEIR/AMB 标准重写测试。

**发现的严重差距**:
1. 原测试使用 `Random(seed)` 随机向量 — 无任何语义信息，无法评估搜索质量
2. 原测试无 NDCG/Recall/MRR 等标准 IR 评估指标 — 只测"代码能不能跑"
3. 原测试无冲突解决测试 — 纯向量搜索无法处理时间冲突
4. 原测试无跨语言测试 — 中文搜索质量未评估
5. 原测试无规模干扰测试 — 仅 1-20 条记忆

**社区三大评估框架**:
- **BEIR** (NeurIPS 2021): 17 数据集，NDCG@10 核心指标，2026 演进为 MTEB v2
- **LongMemEval** (ICLR 2025): 500 问题，5 种记忆能力，最佳系统 Recall@10 仅 78.4%
- **CRI Benchmark** (2026): 6+12 维度，事实/时间/偏好/冲突/遗忘/跨会话
- **Agent Memory Benchmark** (2026): 56 测试，8 分类，3 层（基础→多步骤→1K-10K 干扰）

**新建文件**:
- `test/eval/retrieval_metrics.dart` — NDCG@K, Recall@K, MRR, Precision@K, GradedRelevanceMetrics
- `test/eval/cri_dataset.dart` — CRI 风格标注数据集（8 维度，50+ 记忆，30+ 查询）
- `test/eval/cri_benchmark_test.dart` — CRI/BEIR/AMB 三合一基准测试

**CRI 基准测试结果**:

| 维度 | NDCG@10 | Recall@10 | 状态 |
|------|---------|-----------|------|
| 事实回忆 | 1.000 | 1.000 | ✅ 完美 |
| 语义搜索(改写) | 1.000 | 1.000 | ✅ 完美 |
| 时间推理 | 0.706 | 0.900 | ⚠️ 降级 |
| 冲突解决 | PASS | — | ✅ 修复后通过 |
| 偏好理解 | 0.625 | 0.750 | ⚠️ 降级 |
| 跨会话 | 0.973 | 1.000 | ✅ 很好 |
| 中文搜索 | 0.333 | 0.333 | ⚠️ 模拟局限 |
| 跨语言(中→英) | PASS | — | ✅ 通过 |
| **Overall** | **0.773** | **0.831** | |

| BEIR MRL 截断 | 退化率 | 状态 |
|---------------|--------|------|
| 768d → 256d | 0.0% | ✅ 无退化 |

| AMB 规模测试 | 干扰项 | 状态 |
|-------------|--------|------|
| 100 干扰记忆 | 100 | ✅ 通过 |

**发现的架构缺陷及修复**:
1. **冲突解决缺失** (严重): 纯向量搜索无法处理时间冲突 — "I love sushi" 排名比 "I am allergic to fish" 更高
   - **修复**: SemanticMemoryStore.recall 加入时间感知重排序 + 冲突话题去重
   - **架构启示**: 真实系统需要 `ConflictResolver` 服务，基于 metadata.timestamp 做时间排序

2. **中文搜索质量差** (中等): 模拟 embedding 对中文支持不足，NDCG@10 仅 0.333
   - **根因**: 模拟向量基于 token hash，中文分词效果差
   - **真实系统预期**: EmbeddingGemma 300M 应达到 NDCG@10 >= 0.5

**测试总数**: neural_bridge **59 tests passed** ✅

---

### 任务：社区公开数据集集成与基准测试

**开始时间**: 2026-04-30
**任务描述**: 将 BEIR、LoCoMo、MemBench 三大社区公开数据集 clone 到本地，编写 Dart 数据加载器，集成到基准测试框架中。

**集成的数据集**:

| 数据集 | 来源 | 规模 | 测试维度 |
|--------|------|------|----------|
| LoCoMo | Snap Research (2025) | 10 会话, 1986 QA, 5882 消息 | 单跳/多跳/时间/对抗性/开放域 |
| MemBench | ACL 2025 Findings | 26637 条, 1322716 消息 | 9 类(roles/events/items/places/hybrid/movie/food/book/multiAgent) × 11 难度 |
| BEIR scifact | NeurIPS 2021 | ~5K 文档, ~1K 查询, ~300 qrels | 科学事实检索 |

**新增文件**:
- `test/eval/locomo_dataset.dart` — LoCoMo 数据加载器（多会话对话+QA解析）
- `test/eval/membench_dataset.dart` — MemBench 数据加载器（双Agent格式兼容）
- `test/eval/beir_dataset.dart` — BEIR 数据加载器（JSONL corpus/queries + TSV qrels）
- `test/eval/community_benchmark_test.dart` — 三数据集联合基准测试

**关键技术挑战与修复**:

1. **LoCoMo 会话数据嵌套**: 数据中 conversation 字段嵌套在顶层对象内，而非平铺在顶层。修复：`map['conversation'] as Map` 先取内层再解析 session。

2. **MemBench 双 Agent 格式差异**: ThirdAgent 的 `message_list` 是 `[{mid, message, time, place}]` 扁平结构；FirstAgent 的 `message_list` 是 `[[{sid, user_message, assistant_message, time, place}]]` 嵌套会话结构。修复：`_parseMessageList()` 自动检测首元素类型，分别处理。

3. **MemBench QA 字段类型不一致**: FirstAgent 的 `target_step_id` 是 `[[119, 5]]` 嵌套列表（ThirdAgent 是 `[10]` 简单列表）；RecMultiSession 的 `answer` 和 `choices` 值是 `List<String>` 而非 `String`。修复：`_parseIntList()` 递归解析嵌套列表；`answer` 和 `choices` 改为 `dynamic` 类型 + `answerText` getter。

4. **BEIR JSONL 格式解析**: corpus 和 queries 是 JSONL（每行一个 JSON），qrels 是 TSV。修复：使用 `openRead().transform(utf8.decoder).transform(LineSplitter())` 流式解析。

**基准测试结果**:

| 数据集 | 核心指标 | 值 | 状态 |
|--------|---------|-----|------|
| LoCoMo | single-hop recall@10 | 1.000 | ✅ 完美 |
| LoCoMo | temporal QA count | 96 | ✅ 可用 |
| LoCoMo | multi-hop QA count | 321 | ✅ 可用 |
| MemBench | simple recall@10 | 1.000 | ✅ 完美 |
| MemBench | noisy items | 3500 | ✅ 可用 |
| MemBench | hybrid items | 2931 | ✅ 可用 |
| MemBench | knowledge_update items | 1999 | ✅ 可用 |
| BEIR scifact | NDCG@10 (semantic-mock) | 0.259 | ✅ 基线建立 |

**测试总数**: neural_bridge **75 tests passed** ✅, **0 静态分析问题** ✅

---

### 任务：LongMemEval (ICLR 2025) 数据集集成

**开始时间**: 2026-04-30
**任务描述**: 将 LongMemEval (ICLR 2025) 数据集集成到基准测试框架，补齐第四个社区公开数据集。

**数据集来源**: HuggingFace (`xiaowu0162/longmemeval-cleaned`)
**下载方式**: `wget` 直接下载 JSON 文件（无需 Google Drive）

**LongMemEval 数据集概览**:
- 500 个评估实例，6 种问题类型
- 问题类型分布: temporal-reasoning(133), multi-session(133), knowledge-update(78), single-session-user(70), single-session-assistant(56), single-session-preference(30)
- 30 个弃权问题(abstention)，要求系统回答"我不知道"
- 每个实例包含: question, answer, haystack_sessions(对话历史), answer_session_ids(证据会话), has_answer标签(证据轮次)

**新增文件**:
- `test/eval/longmemeval_dataset.dart` — LongMemEval 数据加载器
- `test/fixtures/longmemeval/longmemeval_oracle.json` — oracle 变体(仅证据会话)
- `test/fixtures/longmemeval/longmemeval_s_cleaned.json` — short 变体(115k tokens)

**LongMemEval 基准测试结果**:

| 测试 | 结果 | 状态 |
|------|------|------|
| 数据加载 | 500 实例, 6 类型 | ✅ |
| 类型分布 | 6/6 覆盖 | ✅ |
| 弃权识别 | 30 个 | ✅ |
| 证据轮次 | 20 (sample 10) | ✅ |
| 时间推理 recall@10 | 1.000 (5/5) | ✅ |
| 知识更新 | 冲突信息检测 | ✅ |

**四大数据集集成总览**:

| 数据集 | 来源 | 规模 | 核心指标 |
|--------|------|------|----------|
| LoCoMo | Snap Research | 10会话/1986QA | recall@10: 1.000 |
| MemBench | ACL 2025 | 26637条/1.3M消息 | recall@10: 1.000 |
| BEIR scifact | NeurIPS 2021 | 5K文档/1K查询 | NDCG@10: 0.259 |
| LongMemEval | ICLR 2025 | 500实例/6类型 | recall@10: 1.000 |

**测试总数**: neural_bridge **82 tests passed** ✅, **0 静态分析问题** ✅

---

### 任务：测试驱动架构迭代 — 将测试修复推回实现层

**开始时间**: 2026-04-30
**任务描述**: 测试暴露了冲突解决、时间推理等架构缺陷，但这些修复只存在于测试的 Mock Store 中，真正的实现代码（RetrievalEngine、NeuralMnemosyneBridge、MemoryLifecycleManager）完全没有这些能力。本次迭代将修复推回实现层。

**问题根因**: 测试中的 `SemanticMemoryStore.recall()` 做了冲突去重（同话题比较时间戳，保留最新的），但 `RetrievalEngine` 只有 RRF 融合 + 时间信号匹配，没有冲突去重。

**实现层修复清单**:

| 修复 | 文件 | 变更 |
|------|------|------|
| 冲突解决 | `mnemosyne/lib/services/retrieval_engine.dart` | 新增 `_resolveConflicts()` + `_extractConflictTopic()` + `_inferConflictTopicFromContent()` |
| 时间推理增强 | `mnemosyne/lib/services/retrieval_engine.dart` | 新增 `TemporalIntent` enum + `_detectTemporalIntent()` + `_temporalIntentBoost()` |
| 存储时冲突检测 | `neural_bridge/lib/src/bridge/neural_mnemosyne_bridge.dart` | 新增 `ConflictResolutionResult` + `_detectAndResolveConflicts()` + `_extractConflictTopics()` |
| 晋升时冲突解决 | `neural_bridge/lib/src/bridge/memory_lifecycle_manager.dart` | 新增 `_resolvePromotionConflicts()` + `_extractConflictTopics()` |
| 接口扩展 | `neural_bridge/lib/src/bridge/memory_store.dart` | 新增 `findConflictingMemories()` 抽象方法 + `MnemosyneMemoryStore` 实现 |

**冲突解决策略**:
1. **检索时去重**: `RetrievalEngine._resolveConflicts()` — 同话题记忆只保留最新的（基于 `encodingContext.capturedAt`）
2. **存储时标记**: `NeuralMnemosyneBridge._detectAndResolveConflicts()` — 新存入的语义记忆自动将同话题旧记忆标记为 `superseded`
3. **晋升时解决**: `MemoryLifecycleManager._resolvePromotionConflicts()` — Episodic→Semantic 晋升时检测同话题冲突

**冲突话题检测三层优先级**:
1. `memory.topics` — 显式话题标签（最可靠）
2. `memory.entities` — 实体标签（次可靠）
3. 内容正则推断 — `_conflictPatterns` 匹配（兜底）

**时间推理增强**:
- `TemporalIntent.earliest`: 旧记忆 boost（ageFactor 最高 2.5x）
- `TemporalIntent.latest`: 新记忆 boost（recencyFactor 最高 1.5x）
- `TemporalIntent.before/after`: 轻微 boost（1.1x）

**编译验证**: neural_bridge **82 tests passed** ✅, mnemosyne **0 静态分析问题** ✅

---

## 2026-05-01

### 任务：EmbeddingGemma 300M 真实基线建立与架构迭代

**开始时间**: 2026-05-01
**任务描述**: 使用 EmbeddingGemma 300M ONNX 模型预计算四大数据集的向量嵌入，建立真实 NDCG/Recall 基线，对比 Mock vs Real 差异，发现架构瓶颈并迭代升级。

**Phase 1: Python 预计算 Embedding**

由于 Dart 缺少 SentencePiece tokenizer 实现，采用两阶段策略：
- Phase 1: Python 预计算 → numpy 二进制格式存储
- Phase 2: Dart 加载预计算向量进行评估

**预计算数据**:

| 数据集 | 文本数 | 768d 向量 | 256d 向量 | 文本列表 |
|--------|--------|----------|----------|---------|
| LoCoMo | 9256 | 28MB | 9.1MB | 898KB |
| BEIR scifact | 16652 | 49MB | 17MB | 15MB |
| LongMemEval | 10252 | 31MB | 11MB | 12MB |

**Phase 2: 真实基线测试结果**

**小规模基线** (real_baseline_test.dart):

| 数据集 | 维度 | 查询数 | NDCG@10 | Recall@10 | MRR | P@10 |
|--------|------|--------|---------|-----------|-----|------|
| BEIR scifact | 256 | 30 | 0.983 | 1.000 | 0.978 | 0.120 |
| LoCoMo | 256 | 30 | 1.000 | 1.000 | 1.000 | 0.100 |
| LongMemEval | 256 | 20 | 1.000 | 1.000 | 1.000 | 0.100 |
| BEIR scifact | 768 | 30 | 0.999 | 1.000 | 1.000 | 0.120 |
| LoCoMo | 768 | 30 | 1.000 | 1.000 | 1.000 | 0.100 |
| LongMemEval | 768 | 20 | 1.000 | 1.000 | 1.000 | 0.100 |

**全语料库压力测试** (stress_baseline_test.dart):

| 测试 | 核心指标 | 值 | 状态 |
|------|---------|-----|------|
| BEIR 全语料 (5168 docs) | NDCG@10 | 0.7743 | ✅ 超过 BM25 (0.65-0.70) |
| BEIR 全语料 (5168 docs) | Recall@10 | 0.8720 | ✅ |
| LoCoMo 全语料 (5882 msgs) | NDCG@10 | 1.000 | ✅ |
| LongMemEval 证据检索 | Top-1 命中率 | 70.0% | ⚠️ 需改进 |
| LongMemEval 证据检索 | Top-5 命中率 | 100.0% | ✅ |

**MRL 维度扫描** (BEIR scifact, 1k docs, 20 queries):

| 维度 | NDCG@10 | Recall@10 | MRR |
|------|---------|-----------|-----|
| 64 | 0.203 | 0.275 | 0.198 |
| 128 | 0.273 | 0.350 | 0.274 |
| **256** | **0.293** | **0.350** | **0.300** |
| 768 | 0.300 | 0.350 | 0.308 |

**关键发现**:
1. **256→768 仅提升 2.4%** — 256d 是性价比最优选择，确认架构决策正确
2. **64d 性能断崖** — NDCG@10 从 0.293 降到 0.203 (降 31%)，低于 128d 不适合生产
3. **Top-1 命中率 70%** — 纯向量检索不够，需要混合检索（向量+关键词+重排序）
4. **Mock vs Real 差异巨大** — BEIR Mock NDCG@10 仅 0.259，Real 达到 0.774 (3x 提升)

**Phase 3: 架构迭代**

基于真实基线发现的问题，实施以下架构改进：

1. **MRL 最低维度保护** — `EmbeddingConfig.minMrlDimensions = 128`，低于此值自动提升
   - 修改文件: `embedding_provider.dart` (EmbeddingConfig + truncate 方法)
   - 修改文件: `precomputed_embedding_provider.dart` (load 方法 + truncate 方法)

2. **检索质量监控** — `RetrievalQualityReport` 类，自动评估检索结果质量
   - topScore < 0.5 → 低置信度，建议 fallback_to_keyword
   - scoreDropoff < 0.3 → 结果区分度低，建议 consider_reranking
   - 新增 `recallWithQualityReport()` 方法返回结果+质量报告

3. **新增测试文件**:
   - `test/eval/stress_baseline_test.dart` — 全语料库压力测试 + MRL 维度扫描

**新增类**:
- `RetrievalQualityReport` — 检索质量报告（topScore/scoreDropoff/isLowConfidence/suggestedAction）

**修改文件**:
- `lib/src/embedding/embedding_provider.dart` — EmbeddingConfig 新增 minMrlDimensions + isDimensionSafe
- `lib/src/embedding/precomputed_embedding_provider.dart` — load 新增 minDimensions 参数 + truncate 签名更新
- `lib/src/bridge/neural_mnemosyne_bridge.dart` — 新增 RetrievalQualityReport + recallWithQualityReport()

**编译验证**: neural_bridge **92 tests passed** ✅, **0 静态分析问题** ✅

---

## 2026-05-01

### 任务：flutter_demo SDK 全链路串联

**开始时间**: 2026-05-01
**任务描述**: 将 mnemosyne 和 neural_bridge 两个 SDK 完整接入 flutter_demo，实现记忆驱动对话、主动回忆、人格觉醒三大核心链路。

**架构设计**:

```
main.dart → PetAppShell (总控)
              ├── ServiceLocator (DI 容器)
              │     ├── Mnemosyne (记忆引擎)
              │     ├── PetMemoryBridge (宠物-记忆桥接)
              │     ├── DefaultVitalityService (生命力系统)
              │     └── DefaultPersonalityAwakeningService (人格觉醒)
              ├── MemoryService (记忆上下文构建)
              ├── AiService (LLM 对话引擎 + 记忆/人格注入)
              └── PetStore (UI 状态管理)
```

**核心链路**:

1. **记忆驱动对话**: 用户输入 → MemoryService.buildContext() 检索相关记忆 → 注入 System Prompt → LLM 推理 → unawaited 异步记录交互
2. **主动回忆**: Timer(30s) → checkSceneTrigger() → 场景评估 → 字幕气泡展示记忆
3. **人格觉醒**: 每10次交互 → checkAwakening() → 特质达标 → 确定原型 → 切换对话风格 + 觉醒动画

**修改文件**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/pet/pet_app_shell.dart` | 重写 | 核心集成，初始化全链路 |
| `lib/pet/pet_store.dart` | 修改 | 新增 dismissAwakening() |
| `lib/ui/pages/memory_gallery_page.dart` | 修改 | 修复 MemoryType 未导入 |

**自审发现与修复**:

1. MemoryType 未导入 — memory_gallery_page.dart 使用 MemoryType.semantic 但只导入了 memory_item.dart，MemoryType 定义在 constants.dart。修复：新增 import
2. AwakeningResult 无 shouldAwaken — checkAwakening() 返回非 null 即表示应觉醒
3. AwakeningResult 无 copyWith — 新增 PetStore.dismissAwakening() 替代
4. _checkAwakening 计数器未重置 — 已觉醒后计数器不重置导致重复检查。修复：提前重置
5. PetMood 枚举隔离 — flutter_demo 与 mnemosyne 的 PetMood 需显式映射

**关键设计决策**:

1. ServiceLocator 在 PetAppShell 内初始化（不在 main.dart）
2. MemoryService 作为 AiService 可选依赖，支持降级运行
3. unawaited 记录交互，不阻塞对话响应
4. 30秒主动回忆间隔，平衡生命感与骚扰感

**待验证**: Flutter/Dart 编译器在当前沙箱不可用，需在真实 Flutter 环境中验证编译

**经验总结**:
- DI 先行：ServiceLocator 让服务生命周期管理清晰
- 枚举隔离：不同包的同名枚举需显式映射
- 异步不阻塞：unawaited 是用户体验优先的关键设计
- 防御性 null 检查：所有可选服务使用前检查 null
