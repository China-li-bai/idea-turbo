# Local-First AI Calendar

> **计算下沉到端，数据永不上云**

基于 EdgeVec + Transformers.js 的本地化向量搜索方案。

## 核心特性

- **100% 本地运行** - 数据永不上云，隐私安全
- **浏览器原生** - 无需后端服务，纯前端实现
- **多语言支持** - 使用 multilingual-e5-small 模型，支持中文
- **高性能** - EdgeVec WASM 向量数据库，毫秒级搜索

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 打开浏览器访问 http://localhost:3000
```

## 项目结构

```
local-first-ai-calendar/
├── src/
│   ├── index.js              # 核心模块 (EdgeVec + Embedding)
│   └── embedding-worker.js   # Web Worker 处理 embedding
├── public/
│   └── data.json             # 官方测试数据 (1000条文档 + 10个查询)
├── index.html                # 测试页面
├── package.json              # 依赖配置
├── vite.config.js           # Vite 配置
└── README.md
```

## 依赖版本

| 包 | 版本 | 说明 |
|----|------|------|
| edgevec | 0.9.0 | WASM 向量数据库 |
| @xenova/transformers | 2.17.2 | Embedding 模型 |
| vite | ^5.x | 构建工具 |

## API 使用

### LocalAIStore (推荐)

一站式封装，开箱即用：

```javascript
import LocalAIStore from './src/index.js';

const store = new LocalAIStore();

// 初始化（首次会下载模型）
await store.initialize();

// 添加文档
const docs = [
    { id: 1, text: "Hello world" },
    { id: 2, text: "你好世界" }
];
for (const doc of docs) {
    await store.add(doc.text, doc.id);
}

// 搜索
const results = await store.search("Hello", 5);
console.log(results);
```

### 构造函数选项

```javascript
const store = new LocalAIStore({
    dimensions: 384,              // 向量维度 (默认: 384)
    modelName: 'Xenova/multilingual-e5-small'  // 模型名称
});
```

### 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `initialize(onProgress)` | 初始化 store 和模型 | `Promise<void>` |
| `add(text, id)` | 添加文档 | `Promise<number>` |
| `search(query, k)` | 搜索 | `Promise<SearchResult[]>` |
| `saveIndex()` | 保存索引到 IndexedDB | `Promise<void>` |
| `loadIndex()` | 从 IndexedDB 加载索引 | `Promise<void>` |
| `clear()` | 清空所有数据 | `Promise<void>` |

### SearchResult 结构

```javascript
{
    id: number,      // 文档 ID
    score: number,  // 相似度分数 (0-1, 越高越相似)
    text: string     // 文档原文
}
```

## 官方测试数据

项目包含 EdgeVec 官方的测试数据：

- **文档数量**: 1000 条 (来自 SQuAD 数据集)
- **查询数量**: 10 个预定义查询

### 加载官方数据

在测试页面点击「加载官方数据 (1000条)」按钮即可加载。

### 官方预定义查询

使用以下查询可以获得与官方一致的结果：

1. Who is Beyoncé and what are her biggest achievements?
2. When did Chopin move to Paris and what was his life like?
3. How does solar energy work and what are its applications?
4. What is the history of New York City?
5. What are the core beliefs and practices of Buddhism?
6. What caused the Wenchuan earthquake and its aftermath?
7. Who is Kanye West and how did he start his career?
8. What is the plot of To Kill a Mockingbird?
9. When was the iPod released and how did it evolve?
10. How did American Idol impact the music industry?

## 常见问题

### Q: EdgeVecIndex 导出错误

**错误**: `does not provide an export named 'EdgeVecIndex'`

**解决**: 使用正确的导入方式：

```javascript
import init from 'edgevec';
import EdgeVecIndex from 'edgevec/edgevec-wrapper.js';

await init();  // 先初始化 WASM
const index = new EdgeVecIndex({ dimensions: 384 });
```

### Q: 搜索结果 Score 含义

EdgeVec 返回的是**向量距离**，需要转换为**相似度**：

```javascript
const similarity = 1.0 - result.score;  // 距离转相似度
```

### Q: Web Worker 路径错误

**错误**: `Unexpected token '<'` JSON 解析错误

**解决**: 确保 Worker 路径正确：

```javascript
this.worker = new Worker('/src/embedding-worker.js', { type: 'module' });
```

## 开发相关

### 构建

```bash
pnpm build
```

### 依赖更新

```bash
pnpm update
```

## 参考资料

- [EdgeVec 官方文档](https://github.com/edgevec/edgevec)
- [EdgeVec API 文档](./edgevec/docs/api/TYPESCRIPT_API.md)
- [官方 Demo](./edgevec/docs/demo/entity-rag/index.html)
