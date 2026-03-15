# Orama + BGE 本地搜索

基于 Orama + BGE-small-zh-v1.5 的纯前端向量搜索引擎。

## 特性

- 🚀 **纯前端架构** - 无需后端服务器，所有计算在浏览器中完成
- 🇨🇳 **中文优化** - 使用 BGE-small-zh-v1.5 模型，专为中文优化
- 🔍 **向量搜索** - 支持语义搜索，理解查询的深层含义
- 🔀 **混合搜索** - 结合全文搜索和向量搜索
- 💾 **本地持久化** - 数据自动保存到 IndexedDB
- 🎯 **实时过滤** - 支持时间范围、分类、标签等过滤条件

## 技术栈

- **Orama** - 高性能前端搜索引擎
- **BGE-small-zh-v1.5** - 中文向量嵌入模型
- **Transformers.js** - 在浏览器中运行机器学习模型
- **Vite** - 现代化前端构建工具

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5174

## 使用示例

### 1. 添加文档

```javascript
import OramaLocalSearch from './src/index.js';

const store = new OramaLocalSearch();
await store.initialize();

await store.addDocument({
    title: '项目会议',
    content: '明天下午2点和李总在星巴克开会讨论新项目',
    category: 'work',
    tags: ['会议', '重要', '项目'],
    timestamp: Date.now()
});
```

### 2. 向量搜索

```javascript
const results = await store.search('见老板', {
    similarity: 0.8,
    limit: 5
});
```

### 3. 混合搜索

```javascript
const results = await store.hybridSearch('会议', {
    similarity: 0.7,
    limit: 10
});
```

### 4. 带过滤的搜索

```javascript
const results = await store.search('项目', {
    similarity: 0.6,
    where: {
        category: 'work'
    },
    limit: 10
});
```

## API 文档

### `OramaLocalSearch`

#### 构造函数

```javascript
const store = new OramaLocalSearch({
    dimensions: 512,  // BGE-small-zh-v1.5 输出维度
    modelName: 'Xenova/bge-small-zh-v1.5'
});
```

#### 方法

| 方法 | 描述 |
|------|------|
| `initialize(progressCallback)` | 初始化模型和数据库 |
| `embed(text)` | 生成文本的向量嵌入 |
| `addDocument(doc)` | 添加单个文档 |
| `addDocuments(docs, progressCallback)` | 批量添加文档 |
| `search(query, options)` | 向量搜索 |
| `hybridSearch(query, options)` | 混合搜索 |
| `getDocument(id)` | 获取文档 |
| `updateDocument(id, updates)` | 更新文档 |
| `deleteDocument(id)` | 删除文档 |
| `save(name)` | 保存到 IndexedDB |
| `load(name)` | 从 IndexedDB 加载 |

#### 搜索选项

```javascript
{
    similarity: 0.8,    // 相似度阈值 (0-1)
    limit: 10,          // 返回结果数量
    where: {            // 过滤条件
        category: 'work',
        timestamp: { between: [start, end] }
    }
}
```

## 项目结构

```
orama-local-search/
├── public/
│   └── sample-data.json    # 示例数据
├── src/
│   ├── index.js            # 核心逻辑
│   └── embedding-worker.js # Web Worker
├── index.html              # 测试页面
├── vite.config.js          # Vite 配置
└── package.json            # 项目配置
```

## 与 EdgeVec 对比

| 特性 | Orama | EdgeVec |
|------|-------|---------|
| **体积** | < 2KB | ~500KB |
| **向量搜索** | ✅ | ✅ |
| **全文搜索** | ✅ | ❌ |
| **混合搜索** | ✅ | ❌ |
| **持久化** | ✅ JSON | ⚠️ postcard bug |
| **中文模型** | ✅ BGE | ✅ multilingual-e5 |
| **过滤功能** | ✅ 强大 | ✅ 强大 |

## 适用场景

- ✅ 日历应用（强时间过滤 + 语义搜索）
- ✅ 笔记应用（全文 + 向量混合搜索）
- ✅ 文档管理（分类 + 标签过滤）
- ✅ 本地 RAG 应用

## 注意事项

1. **首次加载** - BGE 模型约 100MB，首次加载需要下载
2. **内存占用** - 模型加载后占用约 200MB 内存
3. **浏览器兼容** - 需要支持 SharedArrayBuffer 的现代浏览器
4. **COOP/COEP** - 需要配置跨域策略头

## License

MIT
