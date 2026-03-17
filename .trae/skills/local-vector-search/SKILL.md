---
name: "local-vector-search"
description: "Orama + BGE 本地向量搜索引擎集成方案。适用于需要实现纯前端语义搜索、相似推荐、重复检测、智能标签等功能。Invoke when user asks for vector search, semantic search, or AI-powered search features."
---

# Local Vector Search Integration

本 Skill 记录了在 AI 智能日历项目中集成 Orama + BGE 本地向量搜索引擎的完整经验，包括架构设计、实现细节和最佳实践。

## 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Orama | ^3.0.0 | 高性能前端搜索引擎 |
| BGE-small-zh-v1.5 | - | 中文向量嵌入模型 |
| @huggingface/transformers | ^3.0.0 | 浏览器端 ML 模型运行时 |
| IndexedDB | - | 向量索引持久化 |

## 架构设计

### 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (Application)                    │
│  vectorEnhancedService - 相似推荐、重复检测、智能标签        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      服务层 (Service)                        │
│  vectorService - 统一向量搜索接口                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      引擎层 (Engine)                         │
│  oramaSearchService - Orama + BGE 实现                       │
│  • 向量嵌入 (512维 BGE)                                      │
│  • 混合搜索 (向量 + 全文)                                    │
│  • IndexedDB 持久化                                          │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入 → 向量嵌入 → Orama 索引 → 语义搜索 → 结果过滤 → 返回
              │
              ▼
         IndexedDB 持久化
```

## 实现细节

### 1. 依赖安装

```json
{
  "dependencies": {
    "@orama/orama": "^3.0.0",
    "@orama/plugin-data-persistence": "^3.0.0",
    "@huggingface/transformers": "^3.5.1"
  }
}
```

### 2. 核心服务实现

#### oramaSearchService.ts

```typescript
class OramaSearchService {
  private dimensions = 512;  // BGE-small-zh-v1.5 输出维度
  private modelName = 'Xenova/bge-small-zh-v1.5';
  private db: any = null;
  private extractor: any = null;

  async initialize(progressCallback?: (current: number, total: number, message?: string) => void): Promise<void> {
    // 1. 加载 Transformers.js
    const { pipeline } = await import('@huggingface/transformers');
    
    // 2. 初始化 BGE 模型
    this.extractor = await pipeline('feature-extraction', this.modelName, {
      progress_callback: (progress) => { /* 模型下载进度 */ }
    });
    
    // 3. 创建 Orama 数据库
    this.db = await create({
      schema: {
        id: 'string',
        type: 'string',
        title: 'string',
        content: 'string',
        timestamp: 'number',
        embedding: `vector[${this.dimensions}]`,
        tags: 'string[]',
        category: 'string',
        metadata: { /* 自定义字段 */ }
      }
    });
  }

  private async embed(text: string): Promise<number[]> {
    const output = await this.extractor(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const queryEmbedding = await this.embed(query);
    
    const results = await search(this.db, {
      mode: 'vector',
      vector: { value: queryEmbedding, property: 'embedding' },
      similarity: options?.similarity || 0.5,
      limit: options?.k || 10,
    });
    
    return results.hits.map(hit => ({ /* 转换结果 */ }));
  }

  async hybridSearch(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const queryEmbedding = await this.embed(query);
    
    const results = await search(this.db, {
      mode: 'hybrid',
      term: query,
      vector: { value: queryEmbedding, property: 'embedding' },
      similarity: options?.similarity || 0.5,
    });
    
    return results.hits.map(hit => ({ /* 转换结果 */ }));
  }
}
```

### 3. 向量增强服务

#### vectorEnhancedService.ts

```typescript
class VectorEnhancedService {
  // 相似事件推荐
  async findSimilarEvents(eventId: string, options?: { limit?: number; threshold?: number }): Promise<SimilarItem[]>;
  
  // 重复检测
  async checkDuplicate(text: string, type: EntityType, options?: { threshold?: number }): Promise<DuplicateCheckResult>;
  
  // 智能标签生成
  async generateSmartTags(text: string, existingTags?: string[]): Promise<SmartTag[]>;
  
  // 灵光时刻关联
  async linkInspirationToEvents(inspirationId: string): Promise<ContextualLink[]>;
  
  // 跨类型关联搜索
  async findRelatedContent(query: string, options?: { types?: EntityType[] }): Promise<{ events, tasks, inspirations }>;
  
  // 事件分类建议
  async suggestEventCategory(title: string, description?: string): Promise<{ category, confidence, alternatives }>;
  
  // 查询增强
  async enrichSearchQuery(query: string): Promise<{ expandedQuery, relatedTerms, suggestedFilters }>;
}
```

## 最佳实践

### 1. 模型加载优化

```typescript
// 使用单例模式避免重复加载
private initPromise: Promise<void> | null = null;

async initialize(): Promise<void> {
  if (this.isReady) return;
  if (this.initPromise) return this.initPromise;
  
  this.initPromise = this._initialize();
  return this.initPromise;
}
```

### 2. 进度回调

```typescript
await oramaSearchService.initialize((current, total, message) => {
  console.log(`[${current}/${total}] ${message}`);
  // 更新 UI 进度条
});
```

### 3. 持久化策略

```typescript
// 保存索引
await vectorService.saveIndex('my-calendar-vectors');

// 加载索引（避免重复计算向量）
const loaded = await vectorService.loadIndex('my-calendar-vectors');
if (!loaded) {
  // 首次使用，需要初始化
  await vectorService.initialize();
}
```

### 4. 类型安全

```typescript
// 使用类型断言处理 Orama 的动态类型
const similarItems: SimilarItem[] = results.map(r => ({
  id: r.id,
  type: r.type as EntityType,  // 类型断言
  similarity: r.score,
  // ...
}));
```

### 5. 错误处理

```typescript
try {
  const results = await vectorService.search(query);
} catch (error) {
  // 模型未加载时降级到简单搜索
  console.warn('Vector search failed, using fallback:', error);
  return fallbackSearch(query);
}
```

## 注意事项

### 1. 浏览器兼容性

- 需要 `SharedArrayBuffer` 支持
- 需要配置 COOP/COEP 响应头

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};
```

### 2. 模型大小

- BGE-small-zh-v1.5 约 100MB
- 首次加载需要下载，建议显示进度
- 加载后内存占用约 200MB

### 3. 性能考虑

- 向量嵌入是 CPU 密集型操作
- 大量数据索引时考虑 Web Worker
- 搜索结果缓存可提升响应速度

## 与其他方案对比

| 特性 | Orama + BGE | Pinecone | 本地简单实现 |
|------|-------------|----------|--------------|
| 离线支持 | ✅ 完全离线 | ❌ 需要网络 | ✅ 完全离线 |
| 语义理解 | ✅ 真正语义 | ✅ 真正语义 | ❌ 字符匹配 |
| 全文搜索 | ✅ 支持 | ❌ 不支持 | ✅ 支持 |
| 混合搜索 | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| 部署复杂度 | 低 | 中 | 低 |
| 成本 | 免费 | 付费 | 免费 |
| 中文优化 | ✅ BGE 专为中文优化 | ⚠️ 需要配置 | ❌ 无 |

## 常见问题

### Q: 模型加载失败怎么办？

```typescript
// 检查浏览器支持
if (typeof SharedArrayBuffer === 'undefined') {
  console.error('浏览器不支持 SharedArrayBuffer');
  // 降级到简单搜索
}
```

### Q: 如何处理大量数据？

```typescript
// 批量索引时使用进度回调
await vectorService.indexDocuments(docs, (current, total) => {
  updateProgress(current / total * 100);
});
```

### Q: 如何更新已索引的文档？

```typescript
// 先删除旧索引，再添加新索引
await vectorService.deleteFromIndex(docId);
await vectorService.indexDocument(type, docId, newText, metadata);
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `lib/services/oramaSearchService.ts` | Orama + BGE 核心实现 |
| `lib/services/vectorService.ts` | 统一向量搜索接口 |
| `lib/services/vectorEnhancedService.ts` | 向量增强服务 |
| `lib/services/index.ts` | 服务导出入口 |

## 参考资源

- [Orama 官方文档](https://docs.oramasearch.com/)
- [BGE 模型介绍](https://huggingface.co/BAAI/bge-small-zh-v1.5)
- [Transformers.js 文档](https://huggingface.co/docs/transformers.js)
