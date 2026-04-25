toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: web_search
            
status: success
          
query: human memory model semantic episodic emotional context extraction algorithm 2025 2026 research
          

        
            
toolName: web_search
            
status: success
          
query: cognitive memory encoding context-dependent memory emotional tagging AI companion 2026
          

        
            
toolName: web_search
            
status: success
          
query: multi-modal memory extraction NLP semantic keyword emotional context open source 2025 2026
          

        
            
toolName: web_search
            
status: success
          
query: PREMem pre-storage reasoning episodic memory factual experiential subjective extraction 2025 EMNLP
          

        
            
toolName: web_search
            
status: success
          
query: cogmem-agent emotion-gated recall adaptive forgetting python open source github
          

        
            
toolName: web_search
            
status: success
          
query: engram cognitive memory system hybrid retrieval five signals sqlite github 2025 2026
          

        
            
toolName: web_search
            
status: success
          
query: EM-LLM human episodic memory event cognition boundary detection emotion tagging LLM 2024 2025
          

        
            
toolName: web_search
            
status: success
          
query: dory-memory graph spreading activation retrieval forgetting long meme val 2026
          

        
            
toolName: web_search
            
status: success
          
query: Memory Bear AI ACT-R cognitive architecture declarative procedural memory emotional arousal 2025
          

        
            
toolName: web_search
            
status: success
          
query: Mem0 graph memory extraction algorithm 2026 open source emotional context tagging
          

        
            
toolName: web_search
            
status: success
          
query: 中文分词 jieba react native on-device mobile NLP keyword extraction 2025 2026
          

        
            
toolName: web_search
            
status: success
          
query: PRIME personalized reasoning integrated memory dual memory model slow thinking 2025 EMNLP
          

        
            
toolName: web_search
            
status: success
          
query: context-dependent memory encoding specificity principle emotional context tagging retrieval algorithm implementation
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: run_mcp
            
status: success
          
mcp: mcp.config.usrlocalmcp.Sequential Thinking sequentialthinking [object Object]
 {"content":[{"type":"text","text":"{\n  \"thoughtNumber\": 1,\n  \"totalThoughts\": 2,\n  \"nextThoughtNeeded\": true,\n  \"branches\": [],\n  \"thoughtHistoryLength\": 12\n}"}],"isError":null,"historyRunMode":"auto"}
          

        
            
toolName: run_mcp
            
status: success
          
mcp: mcp.config.usrlocalmcp.Sequential Thinking sequentialthinking [object Object]
 {"content":[{"type":"text","text":"{\n  \"thoughtNumber\": 2,\n  \"totalThoughts\": 2,\n  \"nextThoughtNeeded\": false,\n  \"branches\": [],\n  \"thoughtHistoryLength\": 13\n}"}],"isError":null,"historyRunMode":"auto"}
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/mac/project/idea-turbo/anima-rn/worklog.md
          

        
            
toolName: edit_file_search_replace
            
status: success
          
            
filePath: /Users/mac/project/idea-turbo/anima-rn/worklog.md
          
changes: undefined
          

        
            
toolName: todo_write
            
status: success
          
Todos updated: 5 items
          
调研完成。以下是完整的研究成果汇总：

---

## 核心发现：人类记忆的三维编码

你说的"语义+关键词+相"，在认知心理学中有一个精确的理论对应——**编码特异性原理（Encoding Specificity Principle, Tulving & Thomson 1973）**：

> "存储在记忆中的不是项目本身，而是项目在其编码上下文中的形式"

这意味着人类回忆"吃火锅"时，不只是回忆"火锅"这个词，而是连同**周五晚上、和朋友一起、很开心、天气很冷**这些"相"一起回忆。当前我们的系统只存了"什么"，完全丢了"何时何地"和"感受如何"。

---

## 5个最关键的学术/开源方案

### 🔴 最关键：编码特异性原理 → "相"的理论基础

我们当前的记忆系统只存储内容，不存储编码时的上下文。这是最大的架构缺陷。

### 🟢 PREMem (EMNLP 2025) → 预存储推理

**核心思想**：把推理负担从"回忆时"转移到"记忆时"。在存储记忆时就做好分类（Factual/Experiential/Subjective）和关联（五种演化模式），而不是在检索时才做复杂推理。

**对我们的意义**：替代当前的正则提取，用 LLM 在存储时就做好深度分类。

### 🟢 cogmem-agent → 情绪门控回忆

**核心机制**：唤醒度（Arousal）分数调节记忆持久性——高情绪强度时形成的记忆持续更久。

**对我们的意义**：用户在情绪激动时说的话（"我好烦！"）比平淡时（"嗯"）更重要，应获得更高的初始 importance。

### 🟢 Engram → 五信号混合检索

**核心方案**：SQLite + FTS5关键词 + 本地嵌入 + BM25，五信号融合检索，98.1%准确率。

**对我们的意义**：我们当前只用向量相似度检索，Engram的混合检索方案完美适配移动端（纯SQLite）。

### 🟢 jieba-node → 中文分词

**刚发布**（2026-04），纯 JavaScript 实现，支持 TF-IDF、TextRank 关键词提取、词性标注。直接替代我们当前的单字频率统计。

---

## 设计方案：认知记忆提取系统

我设计了一个四阶段系统，完整方案已记录在 [worklog.md](file:///Users/mac/project/idea-turbo/anima-rn/worklog.md)：

| 阶段 | 名称 | 核心机制 | 来源 |
|------|------|---------|------|
| Phase 1 | **编码** | jieba-node关键词 + LLM语义提取 + EncodingContext情境快照 + 情绪门控importance | 编码特异性 + cogmem-agent |
| Phase 2 | **存储** | 三类分类(Factual/Experiential/Subjective) + 五种演化模式 | PREMem |
| Phase 3 | **检索** | 五信号混合(语义0.3 + 关键词0.25 + 时效0.15 + 重要性0.15 + 上下文匹配0.15) | Engram |
| Phase 4 | **反思** | 矛盾检测 + 合并去重 + 过期标记 + 主动浮现 | Memory Bear |

**"相"的核心实现**——`EncodingContext`：

```typescript
interface EncodingContext {
  emotionalState: PetMood        // 宠物当时的情绪
  userMood: 'happy'|'sad'|'neutral'|'anxious'|'excited'|'angry'
  timeOfDay: 'morning'|'afternoon'|'evening'|'night'
  dayOfWeek: 'weekday'|'weekend'
  conversationTopic: string      // 对话主题
  arousalLevel: number           // 0-1 情绪唤醒度
  valence: number                // -1~1 情绪效价
  socialContext: 'alone'|'with_friends'|'at_work'|'commuting'
}
```

**检索时的上下文匹配**——当用户当前情绪=bad，而某条记忆的编码情绪=anxious，两者重叠度高，这条记忆的检索分数就会被 boost。这就是编码特异性原理在工程中的落地。

需要我开始编码实现这个方案吗？