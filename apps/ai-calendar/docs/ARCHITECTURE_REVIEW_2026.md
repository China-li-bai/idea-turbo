# AI Calendar 端侧架构 Review & 2026 技术选型报告

> 生成日期: 2026-04-17  
> 分析范围: `lib/services` 核心服务层  
> 分析目标: 端侧存储 + 端侧模型 + 端侧记忆 技术选型优化

---

## 一、现有架构全景

### 1.1 当前技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **Embedding 模型** | `@huggingface/transformers` | ^3.5.1 | 端侧向量生成 (WASM) |
| **向量数据库** | `@orama/orama` + `@orama/plugin-data-persistence` | ^3.0.0 | 全文+向量混合搜索 |
| **KV 存储** | `localforage` | ^1.10.0 | IndexedDB 封装（4个store） |
| **LLM 推理** | `ai` (Vercel AI SDK) + OpenAI Compatible | ^5.0.0 | NLP解析/秘书AI |
| **日历引擎** | `@schedule-x/*` | ^4.3.1 | 日历渲染/拖拽 |
| **状态管理** | `zustand` | ^5.0.0 | 前端状态 |

### 1.2 核心服务架构图

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  SecretaryView / BossView / AppLayout                   │
└─────────────┬──────────────────┬────────────────────────┘
              │                  │
    ┌─────────▼────────┐ ┌──────▼──────────┐
    │  aiParserService │ │ secretaryAIService│  ← LLM调用(远程API)
    │  (NLP解析日程)    │ │ (意图识别+执行)   │
    └─────────┬────────┘ └──────┬──────────┘
              │                 │
    ┌─────────▼─────────────────▼──────────┐
    │        hybridSearchService            │  ← 混合搜索编排层
    │  (时间权重 + 向量相似度 + 类型融合)     │
    └──────┬──────────────────┬────────────┘
           │                  │
    ┌──────▼──────┐   ┌──────▼────────┐
    │ oramaSearch  │   │ memoryService │
    │ Service      │   │ (记忆系统)     │
    │              │   ├──────────────┤
    │ Orama DB     │   │memoryStorage │
    │ + Transformers│  │(localforage)  │
    │ .js Embedding │   └──────────────┘
    └──────┬──────┘
           │
    ┌──────▼──────────┐
    │  localforage    │  ← 4个IndexedDB实例
    │  (IndexedDB)    │     settings/oramasearch/memory/memoryIndex
    └─────────────────┘
```

### 1.3 设计亮点

1. **模型可切换架构** — `aiModels.ts` 支持中/英/多语言三套 embedding 模型热切换，带维度校验和全量重建索引
2. **Hybrid Search 融合策略** — `hybridSearchService.ts` 实现了时间邻近度权重 + 动态相似度阈值 + 多种合并策略（score/time/type/time-aware）
3. **Memory 系统完整** — `memoryService.ts` 带完整的 CRUD + Schema 校验 + 缓存层 + 类型索引 + 过期清理
4. **容错设计完善** — Orama 数据有版本号校验 + 维度不匹配检测 + 备份恢复机制
5. **隐私中间件** — `aiPrivacy.ts` 对所有 LLM 输入做脱敏处理

### 1.4 发现的痛点

| # | 痛点 | 位置 | 影响 |
|---|------|------|------|
| 1 | **Transformers.js v3 基于 WASM，无 GPU 加速** | `oramaSearchService.ts:28` | Embedding 速度慢，首屏加载慢 |
| 2 | **localforage/IndexedDB 大数据量性能瓶颈** | `storage/index.ts` | Orama 序列化整个DB到单个 key，内存占用高 |
| 3 | **Orama 是 JS 原生向量搜索** — 无 HNSW 索引 | `oramaSearchService.ts:398` | 万级以上向量检索性能下降明显 |
| 4 | **LLM 依赖远程 API** — aiParserService/secretaryAIService 都走网络请求 | `aiParserService.ts:68` | 离线不可用，隐私风险 |
| 5 | **Embedding 模型较旧** — bge-small-zh-v1.5 (2023) / multilingual-e5-small (2023) | `aiModels.ts:42` | 中文语义理解不是2026年SOTA |

---

## 二、2026 年技术选型对比分析

### 2.1 Embedding 引擎：Transformers.js v3 → v4

| 特性 | 你现在用的 v3.x (WASM) | **v4.x (WebGPU)** | 提升幅度 |
|------|------------------------|-------------------|----------|
| **推理后端** | WebAssembly (CPU only) | **WebGPU (GPU)** + WASM fallback | **10x 加速** |
| **Embedding 吞吐** | ~5-10 tokens/s (CPU) | **~60 tokens/s (GPU)** | **6-12x** |
| **Bundle Size** | 较大 | **53% 更小** | 构建优化 |
| **FP16 支持** | ❌ | ✅ (再快40%) | 额外加速 |
| **模型兼容性** | ~200 模型 | **200+ 模型** (含新架构) | 扩展 |
| **浏览器支持** | 全部 | Chrome/Edge/Firefox/Safari | 一致 |

> 来源: Transformers.js v4 正式发布 (2026.02), WebGPU 10x 性能提升报告

**建议：必须升级到 v4**。这是免费的性能午餐——不改任何业务逻辑，仅升级依赖即可获得数量级的推理加速。

---

### 2.2 向量数据库：Orama vs 2026 新选择

| 方案 | 算法 | 浏览器端延迟 (100k向量) | Bundle大小 | 成熟度 | 适合你的场景？ |
|------|------|------------------------|------------|--------|---------------|
| **Orama v3** (你现在用的) | BM25 + 暴力向量扫描 | ~50-200ms | ~50KB | ⭐⭐⭐⭐ | ✅ 小数据量OK |
| **EdgeVec** (Rust/WASM) | **HNSW 图索引** | **329µs** (!!) | **213KB gzipped** | ⭐⭐⭐ (新兴) | ⚡ 高性能候选 |
| **LanceDB/js-vector** | HNSW | ~1-5ms | ~200KB | ⭐⭐⭐⭐ | ✅ 成熟稳定 |
| **SurgeDB-WASM** | 自研 | 未公开benchmark | alpha | ⭐⭐ | ❌ 太早期 |

> EdgeVec 数据来源: Hacker News Show HN — 100k 向量 329µs 检索，比纯 WASM 竞品快 24x

**核心对比：**

```
Orama (你现在)                    EdgeVec / LanceDB (2026新势力)
─────────────────                ────────────────────────
✅ 纯JS，零依赖WASM               ✅ HNSW O(log n) 检索
✅ 全文+向量一体                  ✅ SQ8量化 (3.6x内存压缩)
✅ 成熟文档丰富                    ✅ 元数据过滤原生支持
❌ 暴力扫描 O(n)                   ✅ 亚毫秒级延迟
❌ 大数据量性能衰减                ❌ 相对年轻，生态较小
```

**建议：**
- **数据量 < 5000 条** → 继续用 **Orama**，够用且稳定
- **数据量 5000-50000** → 升级到 **EdgeVec** 或 **LanceDB/js-vector**
- **当前场景判断**：个人日历应用，预估 < 10000 条 → **Orama 可继续用**，但建议关注 EdgeVec 作为未来储备

---

### 2.3 存储层：localforage/IndexedDB → SQLite-WASM + OPFS

| 方案 | 底层存储 | 性能 | 查询能力 | 复杂度 |
|------|----------|------|----------|--------|
| **localforage + IndexedDB** (现在) | IndexedDB | 中等 (异步API开销大) | 仅 Key-Value | 低 |
| **SQLite-WASM + OPFS** | 文件系统 (OPFS) | **高 (接近原生)** | **完整 SQL** | 中 |
| **RxDB** | IndexedDB/OPFS/SQLite | 高 | 类MongoDB查询 | 中高 |

**OPFS 的关键优势：**
- 比 IndexedDB **性能显著更好**（同步字节级访问）
- 数据以真实文件形式持久化
- 支持多 Worker 并发访问

**建议：渐进式迁移**
1. **短期**：保持 localforage（够用，改动成本为0）
2. **中期**：如果遇到大数据量性能问题，迁移到 `@sqlite.org/sqlite-wasm` + OPFS
3. **理由**：当前场景是单用户日历，数据量可控，IndexedDB 的瓶颈尚未触发

---

### 2.4 端侧 LLM：从纯远程 API 到本地推理

这是**最大的改进空间**。当前 `aiParserService` 和 `secretaryAIService` 都依赖远程 LLM API。

| 方案 | 离线可用 | 隐私 | 延迟 | 成本 | 能力 |
|------|----------|------|------|------|------|
| **远程 API** (现在) | ❌ | ⚠️ 数据出境 | 500ms-2s | $ | 最强 |
| **WebLLM** (@mlc-ai/webllm) | ✅ | ✅ 完全本地 | **~20 tok/s 本地** | 免费 | 1B-8B 参数 |
| **Transformers.js v4 + 生成模型** | ✅ | ✅ | ~5-15 tok/s | 免费 | ≤ 3B 参数 |
| **混合模式** (推荐) | ✅ fallback | ✅ 敏感本地 | 动态 | 低 | 最优 |

**适合端侧小任务的 2026 模型推荐：**

| 模型 | 大小 | 用途 | 推理框架 |
|------|------|------|----------|
| **Phi-4-mini** (~3.8B) | ~2.5GB (Q4) | NLP解析、意图识别 | WebLLM |
| **Llama-3.2-1B** | ~700MB (Q4) | 轻量分类、提取 | Transformers.js v4 |
| **Qwen2.5-1.5B** | ~1GB (Q4) | 中文优化小模型 | WebLLM |
| **SmolLM2-360M** | ~250MB | 超轻量分类 | Transformers.js v4 |

**建议：采用"本地优先 + 远程增强"混合模式**

```
用户输入 "下周三下午开会"
       │
       ▼
┌──────────────────┐
│  本地 Phi-4-mini │ ← 首选，离线可用，< 500ms
│  (WebLLM/GPU)    │
└──────┬───────────┘
       │ 失败/复杂任务fallback
       ▼
┌──────────────────┐
│  远程 API        │ ← 兜底，高质量要求时使用
│  (现有逻辑)       │
└──────────────────┘
```

---

## 三、最终决策矩阵

### 3.1 按优先级排列的行动路线

| 优先级 | 行动 | 收益 | 成本 | 风险 |
|--------|------|------|------|------|
| **P0 必做** | **升级 `@huggingface/transformers` 到 v4.x** | Embedding 6-12x 加速 | 低（改依赖+少量API适配） | 低（有WASM fallback） |
| **P1 推荐** | **引入 WebLLM 做端侧 LLM** | 离线可用 + 隐私保护 | 中（新增依赖+模型下载） | 中（首次下载~2GB） |
| **P2 观察** | **评估 EdgeVec 替换 Orama** | 大数据量下亚毫秒检索 | 中高（重写搜索服务） | 中（生态较新） |
| **P3 暂缓** | **SQLite-WASM 替换 localforage** | SQL查询能力 | 高（重写存储层） | 低 |
| **P4 持续** | **更新 Embedding 模型** | 语义精度提升 | 低（改配置） | 低 |

### 3.2 推荐的新架构

```
┌──────────────────────────────────────────────────────────────┐
│                     2026 目标架构                              │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │Transformers │    │   WebLLM      │    │  远程 API       │  │
│  │  .js v4     │    │ (Phi-4/Qwen)  │    │  (GPT/Claude)  │  │
│  │ WebGPU Embed│    │ 本地LLM推理   │    │  增强兜底      │  │
│  └──────┬──────┘    └──────┬───────┘    └───────┬────────┘  │
│         │                  │                     │           │
│         ▼                  ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              hybridSearchService v2                   │   │
│  │         (本地LLM解析 + 混合搜索编排)                    │   │
│  └───────────────────────┬────────────────────────────┘   │
│                          │                                  │
│          ┌───────────────┴───────────────┐                 │
│          ▼                               ▼                 │
│  ┌───────────────┐             ┌─────────────────┐        │
│  │ Orama / EdgeVec│            │  memoryService   │        │
│  │ (向量搜索)     │            │  (记忆系统)      │        │
│  └───────┬───────┘             └────────┬────────┘        │
│          │                              │                  │
│  ┌───────▼──────────────────────────────▼────────┐        │
│  │     localforage (短期) / SQLite-WASM+OPFS (长期) │        │
│  └────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

---

## 四、一句话总结

> **原本的设计思路完全正确**——"端侧存储 + 端侧模型 + 端侧记忆"这个三角架构在 2026 年不仅不过时，反而是行业趋势。
>
> **核心建议就三件事：**
> 1. **立刻升级 Transformers.js 到 v4**（白送 10x 性能）
> 2. **引入 WebLLM 让小任务真正跑在端侧**（实现离线+隐私双保障）
> 3. **其他保持现状观察演进**（Orama/localforage 对当前数据规模足够）

---

## 五、参考资源

- Transformers.js v4 发布说明: https://newreleases.io/project/github/huggingface/transformers.js/release/4.0.0
- WebGPU 性能提升报告: https://www.adwaitx.com/transformers-js-v4-webgpu-browser-ai/
- WebLLM 官方文档: https://webllm.mlc.ai/
- EdgeVec Hacker News 讨论: https://news.ycombinator.com/item?id=46284280
- SQLite WASM + OPFS 指南: https://github.com/didof/sqlite-in-browser/
- OPFS vs IndexedDB 对比: https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html

---

*文档版本: v1.0*  
*最后更新: 2026-04-17*
