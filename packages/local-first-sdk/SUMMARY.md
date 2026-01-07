# Local-First SDK 架构总结

## 项目结构

```
packages/local-first-sdk/
├── src/
│   ├── index.ts              # 主入口
│   ├── sdk.ts                # SDK 主类
│   ├── types.ts              # 类型定义
│   ├── core.ts               # 核心同步引擎
│   ├── persistence.ts        # 持久化层
│   ├── network.ts            # 网络层
│   ├── react/
│   │   ├── index.ts          # React 入口
│   │   └── hooks.ts          # React Hooks
│   ├── ui/
│   │   ├── index.ts          # UI 入口
│   │   ├── Editor.tsx        # 编辑器组件
│   │   └── SyncStatus.tsx    # 同步状态组件
│   └── sdk.test.ts           # 测试文件
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md                 # 使用文档
└── ARCHITECTURE.md           # 架构文档
```

## 核心架构

### 1. 分层设计

```
┌─────────────────────────────────────┐
│         UI Components               │  可复用组件
├─────────────────────────────────────┤
│         React Integration           │  React Hooks
├─────────────────────────────────────┤
│         SDK Main Class              │  统一接口
├─────────────────────────────────────┤
│   Core | Persistence | Network      │  三大核心层
└─────────────────────────────────────┘
```

### 2. 核心模块

#### SyncEngine (核心同步引擎)
- 基于 Yjs 的 CRDT 实现
- 提供文本、数组、Map 等数据结构
- 管理文档状态和变更事件

#### PersistenceManager (持久化层)
- 使用 IndexedDB 本地存储
- 自动持久化 Yjs 文档
- 支持离线编辑和数据恢复

#### NetworkManager (网络层)
- 集成 PartyKit WebSocket
- 管理连接状态和重连
- 处理网络事件和同步

### 3. Local-First 特性

#### 数据流
```
用户操作 → 本地更新 → IndexedDB → 网络同步 → 服务器 → 其他客户端
```

#### 离线支持
- 本地操作立即生效
- 数据自动保存到 IndexedDB
- 网络恢复后自动同步
- CRDT 自动解决冲突

#### 状态管理
- **Document State**: 实际数据
- **Sync State**: 同步状态（已同步/同步中/离线）
- **Presence State**: 用户信息和光标位置

## 使用示例

### 基础使用
```typescript
import { LocalFirstSDK } from "@idea-turbo/local-first-sdk";

const sdk = new LocalFirstSDK({
  room: "my-room",
  host: "localhost:1999",
});

await sdk.initialize();
```

### React 集成
```tsx
import { useLocalFirst } from "@idea-turbo/local-first-sdk/react";
import { Editor, SyncStatus } from "@idea-turbo/local-first-sdk/ui";

function App() {
  const { sdk, state } = useLocalFirst({ room: "my-room" });

  return (
    <div>
      <SyncStatus state={state} />
      <Editor sdk={sdk} />
    </div>
  );
}
```

## 技术栈

- **Yjs**: CRDT 数据结构
- **y-indexeddb**: IndexedDB 持久化
- **y-partykit**: PartyKit 集成
- **React Quill**: 富文本编辑器
- **Quill Cursors**: 协作光标

## 优势

1. **离线优先**: 无网络也能工作
2. **实时协作**: 多人同时编辑
3. **自动同步**: 网络恢复自动同步
4. **冲突解决**: CRDT 自动解决冲突
5. **易于使用**: 简洁的 API 和 React 集成

## 导出模块

```typescript
// 主包
import { LocalFirstSDK, SyncEngine, PersistenceManager, NetworkManager } from "@idea-turbo/local-first-sdk";

// React Hooks
import { useLocalFirst, useSyncState, useUserPresence } from "@idea-turbo/local-first-sdk/react";

// UI 组件
import { Editor, SyncStatus } from "@idea-turbo/local-first-sdk/ui";
```
