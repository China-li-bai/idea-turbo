# Local-First Web Application SDK

基于 Cloudflare 的本地优先 Web 应用最佳实践 SDK。

## 架构设计

### 核心组件

1. **@idea-turbo/local-first** - Triplit SDK 集成
   - 本地数据库操作
   - 离线优先的数据访问
   - 自动同步到远程

2. **@idea-turbo/partykit-sync** - PartyKit 同步服务
   - 基于 Cloudflare Durable Objects 的实时同步
   - WebSocket 连接管理
   - 多端数据协调

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
cd packages/example-local-first
pnpm dev
```

## 使用示例

### 创建本地数据库

```typescript
import { createLocalFirstDB } from '@idea-turbo/local-first';

const db = createLocalFirstDB({
  projectId: 'your-project-id',
  storage: 'indexeddb',
});

await db.connect();
```

### 插入数据

```typescript
await db.insert('todos', {
  id: '1',
  title: 'Learn Local-First',
  completed: false,
  createdAt: new Date().toISOString(),
});
```

### 查询数据

```typescript
const todos = await db.fetchAll('todos');
```

### 订阅数据变更

```typescript
db.subscribe('todos', (data) => {
  console.log('Data updated:', data);
});
```

### 连接同步服务

```typescript
import PartySocket from 'partysocket';

const ws = new PartySocket({
  host: 'localhost:1999',
  room: 'idea-turbo-sync',
});

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'update') {
    console.log('Synced data:', message.data);
  }
});
```

## 部署到 Cloudflare

### 部署同步服务

```bash
cd packages/partykit-sync
pnpm deploy
```

### 部署静态页面

```bash
cd packages/example-local-first
pnpm build
```

然后将 `dist` 目录上传到 Cloudflare Pages。

## 项目结构

```
packages/
├── local-first/          # Triplit SDK 集成
│   ├── src/
│   │   ├── index.ts      # 主要 API
│   │   └── schema.ts     # 数据模型
│   └── package.json
├── partykit-sync/        # PartyKit 同步服务
│   ├── src/
│   │   ├── server.ts     # PartyKit 服务器
│   │   └── index.ts
│   └── wrangler.toml
├── cloudflare-d1/        # Cloudflare D1 数据库
│   ├── src/
│   │   └── index.ts      # D1 客户端
│   ├── migrations/
│   │   └── 001_init.sql
│   └── wrangler.toml
└── example-local-first/  # 示例应用
    ├── src/
    │   ├── App.tsx
    │   └── main.tsx
    └── index.html
```

## 技术栈

- **前端**: React + Vite
- **本地数据库**: Triplit
- **同步服务**: PartyKit (Cloudflare Durable Objects)
- **持久化存储**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Pages + Workers

## 核心优势

1. **零 API 架构**: 无需编写 REST/GraphQL 接口
2. **离线优先**: 所有操作在本地完成，UI 响应 < 1ms
3. **实时同步**: 多端数据自动同步
4. **边缘计算**: 全球边缘节点，低延迟
5. **极简运维**: 无需 Docker、K8s，只有 Cloudflare

## Linus 的建议

"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."

这套方案的核心就是：**管理好 Schema，剩下的让同步引擎去干。**

## 参考资料

- [Triplit Documentation](https://triplit.dev)
- [PartyKit Documentation](https://partykit.io)
- [Cloudflare D1](https://developers.cloudflare.com/d1)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
