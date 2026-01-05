# Local-First Web Application SDK

基于 Cloudflare 的本地优先 Web 应用最佳实践 SDK。

## 架构设计

### 核心组件

1. **@idea-turbo/local-first** - 本地优先数据库 SDK
   - 自定义 IndexedDB 封装（替代 Triplit）
   - Schema 验证和类型管理
   - React Hooks（useQuery, useMutation, useOptimisticMutation）
   - 乐观更新（Optimistic UI）
   - 离线优先的数据访问

2. **@idea-turbo/partykit-sync** - PartyKit 同步服务
   - 基于 Cloudflare Durable Objects 的实时同步
   - PartySocket WebSocket 连接管理
   - 多端数据协调
   - 冲突解决（Last-Write-Wins）

3. **@idea-turbo/cloudflare-d1** - Cloudflare D1 数据库
   - SQLite 持久化存储
   - 边缘计算数据库
   - 高性能查询

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 Cloudflare

安装 Wrangler CLI：

```bash
npm install -g wrangler
```

登录 Cloudflare：

```bash
wrangler login
```

创建 D1 数据库：

```bash
cd packages/cloudflare-d1
pnpm db:create
```

运行数据库迁移：

```bash
pnpm db:migrate
```

### 3. 启动同步服务

```bash
cd packages/partykit-sync
pnpm dev
```

### 4. 运行示例应用

```bash
cd apps/example-local-first
pnpm dev
```

访问 http://localhost:3001 查看应用。

## 使用示例

### 创建 SyncManager

```typescript
import { createSyncManager } from '@idea-turbo/local-first';

const syncManager = createSyncManager({
  projectId: 'your-project-id',
  partykitHost: 'localhost:1999',
  partykitRoom: 'idea-turbo-sync',
  storage: 'indexeddb',
  schema: todoSchema,
});

await syncManager.connect();
```

### 配置同步模式

SyncManager 支持四种同步模式，可以根据应用需求选择：

```typescript
const syncManager = createSyncManager({
  projectId: 'your-project-id',
  partykitHost: 'localhost:1999',
  partykitRoom: 'idea-turbo-sync',
  storage: 'indexeddb',
  schema: todoSchema,
  syncMode: 'local-only', // 可选: 'full' | 'local-only' | 'push-only' | 'pull-only'
});
```

#### 同步模式说明

1. **`full`** (默认) - 完整同步
   - 本地数据变更会推送到远程
   - 接收远程数据更新
   - 适用于需要实时多端同步的应用
   - 示例：协作编辑器、实时聊天

2. **`local-only`** - 仅本地模式
   - 不连接 WebSocket
   - 数据仅存储在本地 IndexedDB
   - 不进行任何网络同步
   - 适用于离线应用、本地工具
   - 示例：本地笔记、离线表单

3. **`push-only`** - 仅推送模式
   - 本地数据变更会推送到远程
   - 不接收远程数据更新
   - 适用于数据收集、上报场景
   - 示例：日志收集、数据上报

4. **`pull-only`** - 仅拉取模式
   - 接收远程数据更新
   - 本地数据变更不会推送到远程
   - 适用于只读数据、内容分发
   - 示例：内容展示、配置同步

#### 动态切换同步模式

如果需要在运行时切换同步模式，可以创建新的 SyncManager 实例：

```typescript
// 初始使用本地模式
let syncManager = createSyncManager({
  projectId: 'your-project-id',
  partykitHost: 'localhost:1999',
  partykitRoom: 'idea-turbo-sync',
  storage: 'indexeddb',
  schema: todoSchema,
  syncMode: 'local-only',
});

// 切换到完整同步
await syncManager.disconnect();
syncManager = createSyncManager({
  projectId: 'your-project-id',
  partykitHost: 'localhost:1999',
  partykitRoom: 'idea-turbo-sync',
  storage: 'indexeddb',
  schema: todoSchema,
  syncMode: 'full',
});
await syncManager.connect();
```

### 使用 React Hooks

```typescript
import { useQuery, useOptimisticMutation } from '@idea-turbo/local-first';

function TodoApp() {
  const db = syncManager.getDB();
  
  const { data: todos, loading, error } = useQuery<Todo>(db, 'todos');
  const { mutate: insertTodo, loading: inserting } = useOptimisticMutation<Todo>(db, 'todos', 'insert');

  const addTodo = async () => {
    await insertTodo({
      title: 'New Todo',
      completed: false,
    });
  };

  return (
    <div>
      <button onClick={addTodo} disabled={inserting}>
        {inserting ? 'Adding...' : 'Add Todo'}
      </button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 定义 Schema

```typescript
import { defineSchema } from '@idea-turbo/local-first';

export const todoSchema = defineSchema({
  todos: {
    id: {
      type: 'string',
      required: true,
      default: () => Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    },
    title: {
      type: 'string',
      required: true,
    },
    completed: {
      type: 'boolean',
      required: true,
      default: false,
    },
    createdAt: {
      type: 'date',
      required: true,
      default: () => new Date().toISOString(),
    },
    updatedAt: {
      type: 'date',
      required: true,
      default: () => new Date().toISOString(),
    },
  },
}, '1.0.0');
```

### 直接使用 LocalFirstDatabase

```typescript
import { createLocalFirstDB } from '@idea-turbo/local-first';

const db = createLocalFirstDB({
  projectId: 'your-project-id',
  storage: 'indexeddb',
  schema: todoSchema,
});

await db.connect();

await db.insert('todos', {
  title: 'Learn Local-First',
  completed: false,
});

const todos = await db.fetchAll('todos');

db.subscribe('todos', (data) => {
  console.log('Data updated:', data);
});
```

## 核心特性

### 1. 乐观更新（Optimistic UI）

使用 `useOptimisticMutation` hook，可以在服务器响应之前立即更新 UI，提供即时反馈：

```typescript
const { mutate: insertTodo, optimisticData } = useOptimisticMutation<Todo>(db, 'todos', 'insert');

await insertTodo({ title: 'New Todo', completed: false });
```

### 2. 响应式查询

使用 `useQuery` hook，自动订阅数据变更，无需手动管理状态：

```typescript
const { data: todos, loading, error } = useQuery<Todo>(db, 'todos');
```

### 3. Schema 验证

自动验证数据类型和必需字段，确保数据完整性：

```typescript
const schema = defineSchema({
  users: {
    email: {
      type: 'string',
      required: true,
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    },
  },
});
```

### 4. 自动同步

SyncManager 自动处理本地和远程数据同步，支持离线操作：

```typescript
const syncManager = createSyncManager({
  projectId: 'your-project-id',
  partykitHost: 'localhost:1999',
  partykitRoom: 'idea-turbo-sync',
  storage: 'indexeddb',
  schema: todoSchema,
});

await syncManager.connect();
```

## 部署到 Cloudflare

### 部署同步服务

```bash
cd packages/partykit-sync
pnpm deploy
```

### 部署静态页面

```bash
cd apps/example-local-first
pnpm build
```

然后将 `dist` 目录上传到 Cloudflare Pages。

## 项目结构

```
packages/
├── local-first/              # 本地优先数据库 SDK
│   ├── src/
│   │   ├── index.ts          # 主要 API（LocalFirstDatabase）
│   │   ├── indexeddb.ts      # IndexedDB 封装
│   │   ├── schema.ts         # Schema 定义
│   │   ├── schema-manager.ts # Schema 管理器
│   │   ├── sync.ts           # 同步管理器
│   │   └── react-hooks.ts    # React Hooks
│   └── package.json
├── partykit-sync/            # PartyKit 同步服务
│   ├── src/
│   │   ├── server.ts         # PartyKit 服务器
│   │   └── index.ts
│   └── wrangler.toml
├── cloudflare-d1/            # Cloudflare D1 数据库
│   ├── src/
│   │   └── index.ts          # D1 客户端
│   ├── migrations/
│   │   └── 001_init.sql
│   └── wrangler.toml
└── apps/
    └── example-local-first/  # 示例应用
        ├── src/
        │   ├── App.tsx
        │   └── main.tsx
        └── index.html
```

## 技术栈

- **前端**: React + Vite
- **本地数据库**: IndexedDB（自定义封装）
- **同步服务**: PartyKit (Cloudflare Durable Objects)
- **WebSocket**: PartySocket
- **持久化存储**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Pages + Workers

## 核心优势

1. **零 API 架构**: 无需编写 REST/GraphQL 接口
2. **离线优先**: 所有操作在本地完成，UI 响应 < 1ms
3. **实时同步**: 多端数据自动同步
4. **乐观更新**: 即时 UI 反馈，提升用户体验
5. **类型安全**: TypeScript + Schema 验证
6. **边缘计算**: 全球边缘节点，低延迟
7. **极简运维**: 无需 Docker、K8s，只有 Cloudflare

## 架构设计原则

### Linus 的建议

"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."

这套方案的核心就是：**管理好 Schema，剩下的让同步引擎去干。**

### 设计决策

1. **为什么不用 Triplit？**
   - Triplit 依赖复杂，集成困难
   - 自定义 IndexedDB 封装更灵活，易于控制
   - 减少依赖，提高性能

2. **为什么使用 PartySocket？**
   - 官方推荐的 PartyKit WebSocket 客户端
   - 自动重连、错误处理
   - 支持多房间、多连接

3. **为什么需要 SchemaManager？**
   - 数据验证，确保数据完整性
   - 类型安全，减少运行时错误
   - 默认值处理，简化开发

4. **为什么使用 React Hooks？**
   - 简化状态管理
   - 自动订阅数据变更
   - 支持乐观更新

## 参考资料

- [PartyKit Documentation](https://partykit.io)
- [Cloudflare D1](https://developers.cloudflare.com/d1)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
