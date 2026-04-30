# 🧠 MEMORY.md - 项目历史经验

> AI 助手每次启动时加载此文件，获取历史上下文。

---

## 项目概述

**项目名**: idea-turbo / mnemosyne  
**定位**: 本地记忆 AI 宠物 - Flutter 端侧记忆系统  
**核心目标**: 在移动设备本地实现完整的 AI 记忆系统，保障隐私与离线可用

## 架构决策

### 1. 为什么选择 ObjectBox 而非 sqflite?
- sqflite 不支持向量搜索，FTS5 仅支持全文搜索
- ObjectBox 原生支持 HNSW 向量索引，Flutter 原生绑定
- 无需 MethodChannel 桥接，性能更优

### 2. 为什么自建而非使用 mobile_rag_engine?
- mobile_rag_engine 是完整 RAG 引擎，过重
- mnemosyne 需要更细粒度的记忆管理（衰减/重要性/整合）
- 自建更可控，可融入独有创新（情绪门控/编码上下文/意图路由）

### 3. 为什么参考 cognitive-memory 而非 mem0?
- cognitive-memory 的架构最接近认知科学模型
- 提供完整的衰减/重要性/整合/工作记忆引擎
- 测试套件最完整（475-553行/文件）
- mem0 更偏 LLM 驱动，依赖云端 API

## 当前状态

### ✅ 已完成
- MemoryItem 实体（含编码上下文/情绪/惊喜度/实体/主题）
- EncodingContext（相概念实现）
- DecayService（指数衰减 + 对数递增排练增强 + 情绪门控）**[已修复排练增强公式]**
- ImportanceEngine（6因子 + source 权重）
- ConsolidationEngine（情景→语义整合）
- WorkingMemoryManager（容量限制 + 激活衰减）
- SurpriseService（惊喜度检测）
- RetrievalEngine（三路 RRF 融合 + 意图路由）
- ObjectBox 数据源
- 完整测试套件（58 个测试全部通过，参照社区标准）
- DecayService 排练增强公式修复（与 cognitive-memory/engram 一致）
- **五大非技术性设计维度落地（2026-04-30）**：
  - NPC 冷启动系统（NpcEntity + NpcPoolService + SoloPlayService）
  - 情绪/电量机制（VitalityService 四维状态机）
  - 性格觉醒盲盒（PersonalityAwakeningService 7种原型）
  - 每日破冰战报（DailyReportService + ShareCard）
  - 社交防火墙（PromptInjectionDefense 11种模式 + SocialShield 4种护盾）
  - 商业化分层（SubscriptionService 3层订阅 + VirtualGoodsService 虚拟商品）

### ⚠️ 待实现
- SimHash 去重
- MMR 多样性检索
- 跨扇区共振
- MemoryService 完整 CRUD
- Flutter UI 层

## 独有创新点（参考框架均未实现）

1. **情绪门控回忆**: 基于情绪唤醒度(arousal)调节记忆持久性
2. **编码上下文(相)**: 存储回忆时的上下文信息，匹配时加权
3. **三路 RRF 融合 + 意图路由**: 语义/关键词/时间三路检索，根据意图动态调权

## 参考仓库位置

- `./references/mem0/` - mem0ai/mem0
- `./references/OpenMemory/` - CaviraOSS/OpenMemory
- `./references/cognitive-memory/` - cognitive-memory
- `./references/engram/` - engram
