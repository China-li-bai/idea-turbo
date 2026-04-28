# 🧠 认知记忆架构整合评估报告

## 📊 关键学术方案总结

| 方案 | 核心机制 | 适用场景 | 可整合度 |
|------|---------|---------|---------|
| **PREMem (EMNLP 2025)** | 预存储推理，三类记忆分类（Factual/Experiential/Subjective），五种演化模式 | 对话AI长期记忆 | ⭐⭐⭐⭐⭐ |
| **cogmem-agent** | 情绪门控回忆，唤醒度分数，自适应遗忘 | 个性化AI伴侣 | ⭐⭐⭐⭐⭐ |
| **Engram** | 五信号混合检索（语义0.3+关键词0.25+时效0.15+重要性0.15+上下文匹配0.15） | 高效本地检索 | ⭐⭐⭐⭐⭐ |
| **Encoding Specificity Principle** | 编码特异性原理，上下文快照（情绪/时间/话题/情境） | 记忆提取准确性 | ⭐⭐⭐⭐⭐ |
| **jieba-node** | 中文分词，TF-IDF/TextRank关键词提取，词性标注 | 中文NLP处理 | ⭐⭐⭐⭐ |

---

## 🏗️ 推荐的Flutter记忆架构

### 架构全景图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mnemosyne v2.0 认知记忆架构                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    🔌 应用接入层                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  │   Flutter    │  │   Dart API   │  │   MCP Server │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    🧠 记忆管理层                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  │   Encoding   │  │   Retrieval  │  │  Reflection │   │
│  │  │   Engine     │  │   Engine     │  │   Engine    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    💾 记忆存储层                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  │   Working    │  │   Episodic   │  │  Semantic    │   │
│  │  │   Memory     │  │   Memory     │  │   Memory     │   │
│  │  │  (会话内存)  │  │  (事件记忆)  │  │  (事实记忆)  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │
│  │         │                  │                  │             │
│  │         └──────────────────┼──────────────────┘             │
│  │                            │                                │
│  │  ┌─────────────────────────┴─────────────────────────┐     │
│  │  │              📊 混合检索引擎                         │     │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │     │
│  │  │  │  向量搜索    │  │  关键词搜索  │  │  上下文匹配│  │     │
│  │  │  │  (SQLiteVec)│  │  (SQLite FTS5)│  │  Boost   │  │     │
│  │  │  └──────────────┘  └──────────────┘  └───────────┘  │     │
│  │  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    🔧 核心服务层                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  │ Embedding    │  │  Keyword     │  │  Decay       │   │
│  │  │   Engine     │  │   Extractor  │  │   Engine     │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  │ Importance   │  │ Emotional    │  │ Consolidation│   │
│  │  │   Scorer     │  │   Gating     │  │   Engine     │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    📦 Encoding Context 编码上下文         │   │
│  │  {                                                         │
│  │    emotionalState: PetMood,                                │
│  │    userMood: "happy|sad|neutral|anxious|excited|angry",   │
│  │    timeOfDay: "morning|afternoon|evening|night",           │
│  │    dayOfWeek: "weekday|weekend",                           │
│  │    conversationTopic: String,                              │
│  │    arousalLevel: 0.0-1.0,                                 │
│  │    valence: -1.0-1.0,                                     │
│  │    socialContext: "alone|with_friends|at_work|commuting"  │
│  │  }                                                         │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 核心模块详解

### 1️⃣ Encoding Engine (编码引擎)

基于PREMem预存储推理 + Encoding Specificity原理

```dart
class EncodingEngine {
  // 记忆分类 (Factual/Experiential/Subjective)
  MemoryType classify(String content);
  
  // 提取关键词 (jieba_flutter + TF-IDF/TextRank)
  List<String> extractKeywords(String content);
  
  // 生成编码上下文快照
  EncodingContext captureContext({
    PetMood? emotionalState,
    UserMood? userMood,
    String? conversationTopic,
  });
  
  // 重要性评分 (情绪门控 + 新奇度)
  double calculateImportance(String content, EncodingContext ctx);
  
  // 完整编码流程
  MemoryItem encode(String content, {EncodingContext? ctx});
}
```

### 2️⃣ Retrieval Engine (检索引擎)

基于Engram五信号混合检索

```dart
class RetrievalEngine {
  // 五信号混合检索
  List<MemoryItem> hybridRetrieval(
    String query, {
    double semanticWeight = 0.3,
    double keywordWeight = 0.25,
    double recencyWeight = 0.15,
    double importanceWeight = 0.15,
    double contextMatchWeight = 0.15,
    EncodingContext? currentContext,
  });
  
  // 向量相似度搜索
  List<MemoryItem> vectorSearch(String query, {int k = 10});
  
  // 关键词搜索 (SQLite FTS5)
  List<MemoryItem> keywordSearch(String query, {int k = 10});
  
  // 上下文匹配Boost
  List<MemoryItem> contextBoost(List<MemoryItem> candidates, EncodingContext currentContext);
}
```

### 3️⃣ Decay & Forgetting Engine (衰减遗忘引擎)

基于cogmem-agent情绪门控回忆

```dart
class DecayEngine {
  // 指数衰减公式: S(t) = S₀ × e^(-λ × Δt)
  double calculateDecayStrength(MemoryItem item, DateTime now);
  
  // 情绪门控: 高唤醒度记忆衰减更慢
  double applyEmotionalGating(double decayStrength, MemoryItem item);
  
  // 排练强化: 访问记忆时增强其强度
  double rehearse(MemoryItem item);
  
  // 清理低于阈值的记忆
  Future<void> pruneWeakMemories();
}
```

---

## 📦 技术栈选型

| 组件 | 推荐方案 | 评价 |
|------|---------|------|
| 数据库 | sqflite | Flutter首选SQLite库 |
| 向量搜索 | sqlite_vector / objectbox | sqlite_vector已直接可用 |
| 关键词搜索 | sqflite FTS5 | SQLite原生支持，无需额外库 |
| 中文分词 | jieba_flutter | 有现成pub.dev包 |
| 向量嵌入 | llamdart (可选) + 本地ONNX BGE | 离线优先 |
| 状态管理 | Provider / Riverpod | Flutter标准 |
| 项目结构 | Melos Monorepo | 可发布的包管理 |

---

## 🎯 实施优先级

### Phase 1: 基础记忆系统 (MVP)
- [ ] 数据模型设计 (MemoryItem + EncodingContext)
- [ ] SQLite数据库 + FTS5关键词搜索
- [ ] sqlite_vector集成
- [ ] 基础CRUD操作
- [ ] 基础向量/关键词检索

### Phase 2: 认知记忆特性
- [ ] 记忆分类 (Factual/Experiential/Subjective)
- [ ] 重要性评分
- [ ] 指数衰减
- [ ] 混合检索
- [ ] 上下文快照

### Phase 3: 高级特性
- [ ] 情绪门控
- [ ] 记忆整合
- [ ] 主动浮现
- [ ] 矛盾检测
- [ ] 记忆关系网络

---

## 📝 关键学习资源

| 资源 | 路径 | 用途 |
|------|------|------|
| cognitive-memory | `references/cognitive-memory/` | 学习衰减、重要性评分、整合引擎 |
| engram | `references/engram/` | 学习混合检索、FTS5、新颖度检测 |
| OpenMemory | `references/OpenMemory/` | 学习HSG架构、时间图 |
| mem0 | `references/mem0/` | 学习记忆分类、实体关联 |
| sqlite-vector | `references/sqlite-vector/` | 学习Flutter向量搜索 |
