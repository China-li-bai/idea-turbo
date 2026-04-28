# 📚 参考仓库索引

本目录包含开发本地记忆 AI 宠物时可以参考的开源项目。

---

## 📂 仓库列表

### 1. mem0 (mem0ai/mem0)
**路径**: `./mem0/`

**核心借鉴**:
- 混合检索（Hybrid Search）实现
- 记忆分层架构
- 实体链接与关联
- 多向量数据库适配器
- BM25 关键词搜索 + 语义向量搜索融合
- LLM 驱动的记忆提取与去重

**关键文件**:
- `mem0/memory/main.py` - 核心记忆逻辑 (add/search/get/update/delete)
- `mem0/memory/base.py` - 基类设计
- `mem0/utils/scoring.py` - 评分算法
- `mem0/utils/entity_extraction.py` - 实体提取
- `mem0/vector_stores/base.py` - 向量存储基类

**测试参考**:
- `tests/test_main.py` - CRUD 单元测试 (add/get/search/update/delete/delete_all/get_all)
- `tests/test_memory_integration.py` - 集成测试 (配置/消息格式/多用户)

### 2. OpenMemory (CaviraOSS/OpenMemory)
**路径**: `./OpenMemory/`

**核心借鉴**:
- HSG (Hierarchical Semantic Graph) 架构
- 记忆衰减与反射机制 (Salience Score)
- 时间图（Temporal Graph）
- Python & TypeScript 双版本 SDK 设计
- SimHash 去重
- 中文 bigram 分词

**关键文件** (Python):
- `packages/openmemory-py/src/openmemory/memory/hsg.py` - SimHash 去重
- `packages/openmemory-py/src/openmemory/memory/decay.py` - 衰减引擎
- `packages/openmemory-py/src/openmemory/memory/reflect.py` - 反射机制
- `packages/openmemory-py/src/openmemory/memory/scoring.py` - 评分
- `packages/openmemory-py/src/openmemory/temporal_graph/`
- `packages/openmemory-py/src/openmemory/utils/text.py` - 中文分词

**测试参考**:
- `packages/openmemory-py/tests/test_omnibus.py` - 综合测试 (进化稳定性/布尔过滤/内容鲁棒性)
- `packages/openmemory-py/tests/test_multilingual_dedup.py/` - 多语言去重测试
- `packages/openmemory-py/tests/test_minimax.py` - MiniMax 集成测试

**额外资源**:
- `ARCHITECTURE.md` - 系统架构文档

### 3. cognitive-memory (cognitive-memory)
**路径**: `./cognitive-memory/`

**核心借鉴**:
- 认知科学驱动的记忆模型
- 衰减引擎 (指数衰减 + 排练增强)
- 重要性引擎 (多因子加权评分)
- 检索引擎 (余弦相似度 + MMR 多样性)
- 整合引擎 (情景记忆 → 语义记忆)
- 工作记忆管理器 (容量限制 + 激活衰减)

**关键文件**:
- `src/cognitive_memory/engines/decay.py` - 衰减引擎
- `src/cognitive_memory/engines/importance.py` - 重要性引擎
- `src/cognitive_memory/engines/retrieval.py` - 检索引擎
- `src/cognitive_memory/engines/consolidation.py` - 整合引擎
- `src/cognitive_memory/engines/working_memory.py` - 工作记忆
- `src/cognitive_memory/core/config.py` - 配置系统

**测试参考** (最完整的测试套件):
- `tests/unit/test_decay.py` - 衰减引擎测试 (475行, 9个测试组)
- `tests/unit/test_importance.py` - 重要性引擎测试 (497行, 12个测试组)
- `tests/unit/test_retrieval.py` - 检索引擎测试 (553行, 12个测试组)
- `tests/unit/test_consolidation.py` - 整合引擎测试 (455行, 9个测试组)
- `tests/unit/test_working_memory.py` - 工作记忆测试
- `tests/property/test_decay_properties.py` - 属性测试
- `tests/property/test_importance_properties.py` - 属性测试

### 4. engram
**路径**: `./engram/`

**核心借鉴**:
- 五信号混合检索 (语义/关键词/时效/重要性/上下文)
- 记忆状态机 (active → challenged → invalidated/merged)
- 情绪门控回忆 (cogmem-agent)

---

## 🔬 框架对照分析 (Flutter mnemosyne vs 参考框架)

| 功能维度 | cognitive-memory | mem0 | OpenMemory | mnemosyne (Flutter) | 状态 |
|---------|-----------------|------|-----------|--------------------|------|
| 指数衰减 | ✅ DecayEngine | ❌ | ✅ decay.py | ✅ DecayService | ✅ 完成 |
| 排练增强 | ✅ rehearsal_boost | ❌ | ✅ on_query_hit | ✅ applyRehearsalInPlace | ✅ 完成 |
| 情绪门控 | ❌ | ❌ | ❌ | ✅ arousalGating | ✅ 独有 |
| 多因子重要性 | ✅ 6因子 | ❌ | ✅ scoring.py | ✅ 6因子+source | ✅ 完成 |
| 余弦检索 | ✅ _cosine_similarity | ✅ vector_store.search | ✅ cos_sim | ✅ ObjectBox HNSW | ✅ 完成 |
| MMR多样性 | ✅ mmr_lambda | ❌ | ❌ | ❌ 待实现 | ⚠️ 待做 |
| RRF融合 | ❌ | ✅ hybrid search | ❌ | ✅ 三路RRF | ✅ 独有 |
| 意图路由 | ❌ | ❌ | ❌ | ✅ classifyIntent | ✅ 独有 |
| 记忆整合 | ✅ ConsolidationEngine | ❌ | ❌ | ✅ ConsolidationEngine | ✅ 完成 |
| 工作记忆 | ✅ WorkingMemoryManager | ❌ | ❌ | ✅ WorkingMemoryManager | ✅ 完成 |
| 编码上下文(相) | ❌ | ❌ | ❌ | ✅ EncodingContext | ✅ 独有 |
| SimHash去重 | ❌ | ✅ hash | ✅ compute_simhash | ❌ | ⚠️ 待做 |
| BM25关键词 | ❌ | ✅ lemmatize_for_bm25 | ✅ keyword_filter | ✅ keywordSearch | ✅ 完成 |
| 向量数据库 | ✅ qdrant/pgvector | ✅ 20+适配器 | ✅ 内置 | ✅ ObjectBox HNSW | ✅ 完成 |
| 跨扇区共振 | ❌ | ❌ | ✅ CrossSectorResonance | ❌ | ⚠️ 待做 |

---

## 📖 阅读优先级

### 第一周 (必须阅读):
1. OpenMemory `ARCHITECTURE.md`
2. mem0 `mem0/memory/main.py` & `base.py`
3. cognitive-memory `engines/` 全部引擎源码

### 第二周 (深入理解):
1. cognitive-memory `tests/unit/` 全部测试
2. OpenMemory `memory/hsg.py` & `utils/text.py`
3. mem0 `vector_stores/` 各适配器

---

## 📝 学习笔记

学习过程中的笔记请记录在 `/study-notes/` 目录中。

