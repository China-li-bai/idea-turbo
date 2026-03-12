---
name: "edgevec-local-search"
description: "基于 EdgeVec WASM + Transformers.js 的本地向量搜索实现。用于构建浏览器端本地运行的向量数据库应用，支持多语言 embedding 和数据持久化。"
---

# EdgeVec 本地向量搜索

本 skill 提供基于 EdgeVec WASM 向量数据库和 Transformers.js embedding 模型的本地向量搜索实现方案。

## 适用场景

- 构建 100% 本地运行的向量搜索应用
- 浏览器端向量数据库集成
- 多语言 embedding 模型集成
- 数据隐私敏感场景（数据永不上云）

## 核心技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| edgevec | 0.9.0 | WASM 向量数据库 |
| @xenova/transformers | 2.17.2 | Embedding 模型 |
| vite | ^5.x | 构建工具 |

## 项目结构

```
project/
├── src/
│   ├── index.js              # 核心 LocalAIStore 类
│   └── embedding-worker.js   # Web Worker 处理 embedding
├── public/
│   └── data.json             # 官方测试数据
├── index.html                # 测试页面
├── package.json
└── vite.config.js
```

## 快速集成

### 1. 安装依赖

```json
{
  "dependencies": {
    "edgevec": "^0.9.0",
    "@xenova/transformers": "^2.17.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### 2. Vite 配置

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['edgevec'],
  },
  build: {
    target: 'esnext'
  }
});
```

### 3. 核心实现

```javascript
import init from 'edgevec';
import EdgeVecIndex from 'edgevec/edgevec-wrapper.js';
import { pipeline } from '@xenova/transformers';

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

class LocalAIStore {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 384;
    this.modelName = options.modelName || 'Xenova/multilingual-e5-small';
    this.store = null;
    this.worker = null;
    this.isReady = false;
  }

  async initialize(onProgress) {
    await ensureInit();
    await this._initWorker(onProgress);
    await this._initStore();
    this.isReady = true;
  }

  async _initWorker(onProgress) {
    return new Promise((resolve, reject) => {
      this.worker = new Worker('/src/embedding-worker.js', { type: 'module' });

      this.worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
          resolve();
        } else if (e.data.type === 'progress' && onProgress) {
          onProgress(e.data.message);
        }
      };

      this.worker.onerror = reject;
      this.worker.postMessage({ type: 'init', model: this.modelName });
    });
  }

  async _initStore() {
    this.store = new EdgeVecIndex({ dimensions: this.dimensions });
  }

  async embedText(text) {
    return new Promise((resolve, reject) => {
      const id = Date.now();
      this.worker.onmessage = (e) => {
        if (e.data.id === id) {
          resolve(e.data.embedding);
        }
      };
      this.worker.postMessage({ type: 'embed', text, id });
    });
  }

  async add(text, id) {
    const embedding = await this.embedText(text);
    const vector = new Float32Array(embedding);
    return this.store.add(vector, { id, text });
  }

  async search(query, k = 10, options = {}) {
    const queryVector = await this.embedText(query);
    const results = await this.store.search(new Float32Array(queryVector), k, options);
    return results.map(r => ({
      id: r.id,
      score: 1.0 - r.score, // 距离转相似度
      text: r.metadata?.text || ''
    }));
  }
}
```

### 4. Web Worker (embedding-worker.js)

```javascript
import { pipeline } from '@xenova/transformers';

let embedder = null;

self.onmessage = async (e) => {
  const { type, model, text, id } = e.data;

  if (type === 'init') {
    embedder = await pipeline('feature-extraction', model);
    self.postMessage({ type: 'ready' });
  }

  if (type === 'embed') {
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true
    });
    const embedding = Array.from(output.data);
    self.postMessage({ type: 'embedding', embedding, id });
  }
};
```

## 常见问题与解决

### EdgeVecIndex 导出错误

**错误**: `does not provide an export named 'EdgeVecIndex'`

**解决**:
```javascript
import init from 'edgevec';
import EdgeVecIndex from 'edgevec/edgevec-wrapper.js';

await init();
```

### WASM 未初始化

必须在使用 EdgeVecIndex 前调用 `init()` 初始化 WASM 模块。

### Worker 路径错误

**错误**: `Unexpected token '<'` JSON 解析错误

**解决**: 使用正确的 Worker 路径
```javascript
this.worker = new Worker('/src/embedding-worker.js', { type: 'module' });
```

### Score 含义

EdgeVec 返回的是向量距离，需要转换为相似度：
```javascript
const similarity = 1.0 - result.score;
```

## 测试数据

项目可使用 EdgeVec 官方测试数据：

- 位置: `/edgevec/docs/demo/entity-rag/data.json`
- 文档: 1000 条
- 查询: 10 个预定义查询（含预计算 embedding）

## 参考资源

- [EdgeVec 官方文档](https://github.com/edgevec/edgevec)
- [EdgeVec API 文档](./edgevec/docs/api/TYPESCRIPT_API.md)
- [官方 Demo](./edgevec/docs/demo/entity-rag/index.html)
