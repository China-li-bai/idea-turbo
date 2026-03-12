---
name: "edgevec-local-search"
description: "EdgeVec WASM向量数据库 + multilingual-e5-small embedding本地搜索实现。适用于需要构建浏览器端本地RAG应用的场景。"
---

# EdgeVec 本地向量搜索实现

基于 EdgeVec WASM + Transformers.js 的本地向量搜索实现，用于构建浏览器端本地运行的向量数据库应用。

## 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                     浏览器 (Browser)                         │
├─────────────────────────────────────────────────────────────┤
│  index.html (UI)                                           │
│    ├── 官方查询选择 (下拉框)                                │
│    ├── 自定义查询输入                                       │
│    └── 搜索结果显示                                         │
├─────────────────────────────────────────────────────────────┤
│  src/index.js (主逻辑)                                      │
│    ├── LocalAIStore 类                                      │
│    ├── EdgeVecIndex 高级API                                 │
│    └── Web Worker 通信                                       │
├─────────────────────────────────────────────────────────────┤
│  src/embedding-worker.js (Embedding模型)                   │
│    └── Xenova/multilingual-e5-small                        │
│        └── Transformers.js (Q8量化)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  IndexedDB (持久化存储)                                     │
│    └── EdgeVec 索引数据                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 完整 API 功能列表

### 1. EdgeVecIndex (推荐使用)

**推荐使用高级封装API，简化操作**

```javascript
import init from 'edgevec';
import EdgeVecIndex from 'edgevec/edgevec-wrapper.js';

await init();  // 初始化WASM

// 创建索引
const store = new EdgeVecIndex({ dimensions: 384 });
```

#### 构造函数

```javascript
// 基础配置
new EdgeVecIndex({ dimensions: 384 })

// 完整配置
new EdgeVecIndex({
    dimensions: 384,        // 向量维度 (必需)
    efConstruction: 200,   // 构建质量 (默认: 200)
    m: 16,                 // HNSW M参数 (默认: 16)
    quantized: false       // 是否量化 (默认: false)
})
```

#### 核心方法

| 方法 | 描述 | 示例 |
|------|------|------|
| `add(vector, metadata)` | 添加向量 | `store.add(float32Array, { text: '内容' })` |
| `search(query, k, options)` | 搜索 | `store.search(queryVec, 10, { includeMetadata: true })` |
| `searchFiltered(query, k, options)` | 带过滤搜索 | `store.searchFiltered(query, 10, { filter: 'category = "tech"' })` |
| `count(filter)` | 统计数量 | `await store.count('category = "tech"')` |
| `getMetadata(id)` | 获取元数据 | `store.getMetadata(id)` |
| `setMetadata(id, key, value)` | 设置元数据 | `store.setMetadata(id, 'title', 'My Doc')` |
| `delete(id)` | 删除向量 | `store.delete(id)` |
| `save(name)` | 保存到IndexedDB | `await store.save('my-index')` |
| `static load(name)` | 从IndexedDB加载 | `await EdgeVecIndex.load('my-index')` |

#### 搜索选项 (SearchOptions)

```javascript
{
    filter: 'category = "tech" AND price < 100',  // 过滤表达式
    strategy: 'auto',           // 'auto' | 'pre' | 'post' | 'hybrid'
    oversampleFactor: 3.0,      // 过采样因子
    includeMetadata: true,       // 返回元数据
    includeVectors: false       // 返回向量
}
```

#### 属性

```javascript
store.size        // 向量数量
store.dimensions // 向量维度
```

---

### 2. EdgeVec 底层API (完整功能)

**直接使用WASM层API，更强大但更复杂**

```javascript
import { EdgeVec, EdgeVecConfig, JsMetadataValue } from 'edgevec';

await init();

// 创建配置
const config = new EdgeVecConfig(128);
config.metric = 'cosine';     // 'l2' | 'cosine' | 'dot' | 'hamming'
config.m = 32;
config.ef_construction = 400;
config.ef_search = 100;

// 创建索引
const index = new EdgeVec(config);
```

#### 向量操作

| 方法 | 描述 |
|------|------|
| `insert(vector)` | 插入单个向量 |
| `insertBatch(vectors)` | 批量插入 |
| `insertBatchWithProgress(vectors, callback)` | 带进度的批量插入 |
| `search(query, k)` | 基础搜索 |
| `searchFiltered(query, k, options_json)` | 过滤搜索 |

#### 软删除操作

| 方法 | 描述 |
|------|------|
| `softDelete(id)` | 软删除单个向量 |
| `softDeleteBatch(ids)` | 批量软删除 |
| `isDeleted(id)` | 检查是否已删除 |
| `liveCount()` | 存活向量数量 |
| `deletedCount()` | 已删除向量数量 |

#### 压缩操作

| 方法 | 描述 |
|------|------|
| `needsCompaction()` | 是否需要压缩 |
| `compact()` | 执行压缩 |
| `compactionWarning()` | 压缩警告信息 |

#### 元数据操作

| 方法 | 描述 |
|------|------|
| `setMetadata(id, key, value)` | 设置元数据 |
| `getMetadata(id, key)` | 获取单个元数据 |
| `getAllMetadata(id)` | 获取所有元数据 |
| `hasMetadata(id, key)` | 检查元数据是否存在 |
| `deleteMetadata(id, key)` | 删除元数据 |

#### 持久化

| 方法 | 描述 |
|------|------|
| `save(name)` | 保存到IndexedDB |
| `static load(name)` | 从IndexedDB加载 |

---

### 3. JsMetadataValue 元数据类型

```javascript
import { JsMetadataValue } from 'edgevec';

// 创建元数据值
JsMetadataValue.fromString('hello')
JsMetadataValue.fromInteger(42)
JsMetadataValue.fromFloat(3.14)
JsMetadataValue.fromBoolean(true)
JsMetadataValue.fromStringArray(['tag1', 'tag2'])

// 类型检查
value.isString()
value.isInteger()
value.isFloat()
value.isBoolean()
value.isStringArray()

// 值提取
value.asString()
value.asInteger()
value.asFloat()
value.asBoolean()
value.asStringArray()
```

---

### 4. 过滤表达式 (Filter Syntax)

**支持丰富的过滤条件**

```javascript
// 基础比较
'category = "tech"'
'price > 100'
'count <= 50'

// 逻辑运算
'category = "tech" AND price < 100'
'status = "active" OR priority > 5'

// 字符串操作
'name CONTAINS "hello"'
'name STARTS_WITH "pre"'
'name ENDS_WITH "post"'

// 数组操作
'tags CONTAINS "featured"'
'category IN ["tech", "science", "art"]'

// 范围查询
'age BETWEEN 18 AND 65'
```

---

### 5. 过滤策略 (Filter Strategies)

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| `auto` | 自动选择 | 默认选项 |
| `pre` | 先过滤后搜索 | 高选择性（匹配少） |
| `post` | 先搜索后过滤 | 低选择性（匹配多） |
| `hybrid` | 搜索时过采样 | 中等选择性 |

---

## 关键实现要点

### 1. Web Worker 分离 Embedding 计算

```javascript
// embedding-worker.js
self.onmessage = async (event) => {
    const { type, id, payload } = event.data;
    switch (type) {
        case 'embedQuery':
            const result = await embedder(text, { pooling: 'mean', normalize: true });
            self.postMessage({ type: 'embedQuery', id, result: Array.from(result.data) });
            break;
    }
};
```

### 2. 预计算Embedding vs 实时生成

| 场景 | Embedding来源 | 结果一致性 |
|------|--------------|-----------|
| 官方查询 | 预计算embedding | 与官方demo一致 |
| 自定义查询 | 实时生成 | 可能不同 |

### 3. Score计算

- EdgeVec 使用**内积(Dot Product)**作为度量
- 对于归一化向量，内积 = 余弦相似度
- **直接使用 `result.score`**，无需转换

### 4. Embedding前缀问题

官方data.json中的embedding是**无前缀**生成的，移除 `query:` / `passage:` 前缀。

---

## 项目结构

```
local-first-ai-calendar/
├── public/
│   ├── data.json           # 官方测试数据 (1000条文档 + 10个查询)
│   ├── edgevec.js          # EdgeVec WASM模块
│   └── edgevec_bg.wasm     # WASM二进制
├── src/
│   ├── index.js            # 主逻辑 (LocalAIStore)
│   └── embedding-worker.js # Embedding模型Worker
├── index.html              # 测试页面
├── vite.config.js          # Vite配置
└── package.json            # 依赖配置
```

---

## 依赖配置

```json
{
  "dependencies": {
    "edgevec": "^0.9.0",
    "@huggingface/transformers": "^2.14.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

---

## Vite配置要点

```javascript
// vite.config.js
export default defineConfig({
    optimizeDeps: {
        exclude: ['@huggingface/transformers']
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    }
});
```

---

## 常见问题

1. **EdgeVecIndex导入错误**: 使用 `import EdgeVecIndex from 'edgevec/edgevec-wrapper.js'`
2. **WASM初始化**: 确保先调用 `await init()`
3. **Worker路径**: 使用 `new URL('./embedding-worker.js', import.meta.url)`
4. **COOP/COEP头**: 生产环境需要配置跨域策略头

---

## 参考资源

- EdgeVec源码: `/Users/mac/project/idea-turbo/packages/edgevec`
- 官方Demo: `/Users/mac/project/idea-turbo/packages/edgevec/docs/demo/entity-rag`
- API文档: `/Users/mac/project/idea-turbo/packages/edgevec/docs/api`
  - TYPESCRIPT_API.md - 完整TypeScript API
  - WASM_INDEX.md - WASM层API
  - FILTER_SYNTAX.md - 过滤表达式语法
  - HYBRID_SEARCH.md - 混合搜索
  - SPARSE_VECTORS.md - 稀疏向量
  - MEMORY.md - 内存管理
