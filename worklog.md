# Worklog

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
