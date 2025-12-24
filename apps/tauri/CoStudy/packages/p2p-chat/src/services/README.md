# P2PRoomService - 纯 JavaScript/TypeScript P2P 服务

这是一个不依赖 React 的纯 P2P 房间服务，用于建立点对点连接和实时通信。

## 特性

- 🚀 纯 JavaScript/TypeScript，不依赖任何框架
- 🔗 支持 WebRTC P2P 连接
- 💬 实时消息传输
- 🌐 支持信令服务器自动发现
- 🔧 支持手动信令模式
- 📡 完整的连接生命周期管理
- 🎯 事件驱动的 API 设计

## 基本用法

```typescript
import P2PRoomService from './p2pRoomService';

// 创建服务实例
const p2pService = new P2PRoomService({
  roomId: 'my-room-123',
  signalingUrl: 'wss://your-signaling-server.com/ws',
  offerStrategy: 'A',
  maxPeers: 5
});

// 监听事件
p2pService
  .on('onPeerJoined', (peerId) => {
    console.log(`新用户加入: ${peerId}`);
  })
  .on('onConnectionEstablished', (peerId) => {
    console.log(`与 ${peerId} 连接已建立`);
    p2pService.sendMessage('Hello!');
  })
  .on('onMessageReceived', (message) => {
    console.log('收到消息:', message);
  });

// 发送消息
p2pService.sendMessage('大家好！');

// 获取当前状态
const state = p2pService.getState();
console.log('当前在线用户:', Object.keys(state.peers));

// 清理资源
p2pService.destroy();
```

## 配置选项

```typescript
interface P2PRoomOptions {
  roomId?: string;                    // 房间ID
  signalingUrl?: string | null;       // 信令服务器URL，null为手动模式
  offerStrategy?: "A" | "B";          // Offer策略：A=现有用户发送给新用户，B=新用户发送给现有用户
  maxPeers?: number;                  // 最大连接数，默认10
}
```

## 事件系统

### 可用事件

- `onPeerJoined` - 新用户加入房间
- `onPeerLeft` - 用户离开房间  
- `onConnectionEstablished` - P2P连接建立成功
- `onConnectionClosed` - P2P连接关闭
- `onMessageReceived` - 收到新消息
- `onStateChanged` - 服务状态变化
- `onError` - 发生错误

### 事件处理

```typescript
// 添加事件监听
p2pService.on('onPeerJoined', (peerId) => {
  console.log('Peer joined:', peerId);
});

// 移除事件监听
p2pService.off('onPeerJoined');
```

## API 参考

### 构造函数

```typescript
new P2PRoomService(options?: P2PRoomOptions)
```

### 方法

#### `setRoomId(roomId, signalingUrl?)`
设置房间ID并连接到信令服务器

```typescript
await p2pService.setRoomId('new-room', 'wss://server.com/ws');
```

#### `sendMessage(text, type?)`
发送消息到所有连接的节点

```typescript
p2pService.sendMessage('Hello', 'chat');  // 默认类型为 'chat'
p2pService.sendMessage('System message', 'sys');
```

#### `getState()`
获取当前服务状态

```typescript
const state = p2pService.getState();
// 返回: { roomId, localId, peers, connections, chatLog, signalingUrl, offerStrategy }
```

#### `on(event, handler)` / `off(event)`
事件监听器管理

#### `destroy()`
销毁服务，清理所有连接和资源

```typescript
p2pService.destroy();
```

## 手动信令模式

当不使用信令服务器时，可以手动交换 SDP 信息：

```typescript
const p2pService = new P2PRoomService({
  roomId: 'manual-room',
  signalingUrl: null  // 手动模式
});

// 导出 offer 给对方
const offer = p2pService.exportOffer();
console.log('发送给对方的 offer:', JSON.stringify(offer));

// 导入对方发来的 offer
const remoteOffer = JSON.parse(receivedOfferString);
p2pService.importOffer(remoteOffer);
```

## 状态结构

```typescript
interface P2PRoomState {
  roomId: string;
  localId: string;
  peers: Record<string, {
    id: string;
    displayName?: string;
    status: "connecting" | "connected" | "disconnected";
    lastSeen: number;
  }>;
  connections: Record<string, ConnectionEntry | null>;
  chatLog: ChatMessage[];
  signalingUrl: string | null;
  offerStrategy: "A" | "B";
}
```

## 与 React Hook 的对比

| 特性 | useP2PRoom Hook | P2PRoomService |
|------|----------------|----------------|
| 依赖 | React | 无依赖 |
| 状态管理 | 自动 | 手动/事件驱动 |
| 用例 | React 组件 | 任何 JS 环境 |
| 生命周期 | 组件生命周期 | 手动管理 |
| 事件处理 | 回调函数 | 事件系统 |

## 注意事项

1. **浏览器兼容性**: 需要支持 WebRTC 的现代浏览器
2. **HTTPS 要求**: WebRTC 需要在 HTTPS 环境下运行（localhost 除外）
3. **ICE 服务器**: 默认使用 Google STUN 服务器，生产环境建议配置自己的 ICE 服务器
4. **资源清理**: 使用完毕后务必调用 `destroy()` 方法清理资源
5. **错误处理**: 建议始终监听 `onError` 事件处理异常情况

## 示例项目

查看 `p2pRoomService.example.ts` 获取完整的使用示例。