# P2P Chat 调试指南

## 🔧 修复的问题

### 1. SignalingClient URL 参数问题
**问题**: 信令服务器需要房间ID和用户ID作为URL参数
**修复**: 在 SignalingClient.connect() 中添加了查询参数

### 2. React Hook 闭包问题
**问题**: useEffect 回调中的 state 值是过时的闭包值
**修复**: 使用 reducerRef.current.state 获取最新状态

### 3. 条件初始化问题
**问题**: useP2PRoom hook 在没有房间ID时也会初始化
**修复**: 添加了 activeRoomId 状态管理

## 🧪 测试步骤

### 1. 启动信令服务器
```bash
cd signal-server
npm start
# 应该看到: P2P Chat Signal Server running on port 8080
```

### 2. 启动前端应用
```bash
npm start
# 应用在 http://localhost:3000
```

### 3. 测试连接（策略A）

#### 第一个用户：
1. 打开 http://localhost:3000
2. 输入房间ID: `test-room-123`
3. 输入显示名称: `User-1`
4. 确保 "Use WebSocket Signaling Server" 被勾选
5. 点击 "Create Room"

#### 第二个用户：
1. 在新标签页打开 http://localhost:3000
2. 输入相同的房间ID: `test-room-123`
3. 输入显示名称: `User-2`
4. 确保 "Use WebSocket Signaling Server" 被勾选
5. 点击 "Join Room"

## 🔍 调试信息

### 控制台日志
打开浏览器开发者工具的 Console 标签，你应该看到：

**创建房间时:**
```
🏠 Creating room: test-room-123
📨 Received signaling message: {type: "join", ...}
```

**加入房间时:**
```
🚪 Joining room: test-room-123
📨 Received signaling message: {type: "join", ...}
👋 New peer joined: xxx, using strategy: A
📤 Will send offer to xxx in 123ms
📤 Sending signaling message: {type: "offer", ...}
```

**连接建立时:**
```
📥 Received offer from: xxx
📤 Sending signaling message: {type: "answer", ...}
```

### 信令服务器日志
在运行信令服务器的终端中，你应该看到：
```
New client xxx joined room test-room-123
New client yyy joined room test-room-123
```

### 网络标签
在开发者工具的 Network 标签中：
- 应该能看到 WebSocket 连接到 `ws://localhost:8080/?room=test-room-123&id=xxx`
- 应该能看到 WebSocket 消息的发送和接收

## 🐛 常见问题

### 问题1: 看不到其他用户
**可能原因**:
- 信令服务器未启动
- 房间ID不匹配
- WebSocket 连接失败

**解决方案**:
1. 确认信令服务器在运行: `curl http://localhost:8080`
2. 检查控制台是否有错误信息
3. 确认两个用户使用相同的房间ID

### 问题2: 消息发送失败
**可能原因**:
- WebRTC 连接未建立
- DataChannel 未打开

**解决方案**:
1. 检查 "Connected Peers" 列表是否显示用户
2. 状态应该显示 "connected" 而不是 "connecting"
3. 查看控制台是否有 WebRTC 相关错误

### 问题3: 连接状态一直是 "connecting"
**可能原因**:
- NAT/防火墙阻止 WebRTC
- STUN 服务器不可达
- ICE 候选交换失败

**解决方案**:
1. 确认使用 HTTPS 或 localhost
2. 检查网络连接
3. 尝试配置额外的 STUN/TURN 服务器

## 📊 状态检查

在浏览器控制台中运行以下命令检查状态：

```javascript
// 检查 WebRTC 支持
console.log('WebRTC支持:', {
  RTCPeerConnection: !!window.RTCPeerConnection,
  RTCDataChannel: !!window.RTCDataChannel,
  WebSocket: !!window.WebSocket
});

// 检查当前连接状态（需要在App组件内部）
const appElement = document.querySelector('#root > div');
console.log('应用状态:', appElement?.__reactInternalInstance$?.child?.stateNode?.state);
```

## 🚀 高级测试

### 多用户测试
1. 打开3-4个浏览器标签页
2. 都加入同一个房间
3. 验证 full-mesh 连接（每个用户都与其他所有用户连接）
4. 测试消息广播

### 手动SDP交换测试
1. 取消勾选 "Use WebSocket Signaling Server"
2. 第一个用户创建房间并复制生成的 SDP
3. 第二个用户粘贴 SDP 并生成 Answer
4. 第一个用户粘贴 Answer 建立连接

## 📈 性能监控

使用 Chrome DevTools 的 Performance 标签监控：
- WebRTC 连接建立时间
- 消息传输延迟
- CPU/内存使用情况

## 🎯 下一步

如果所有测试都通过，可以尝试：
1. 部署到 Cloudflare Workers
2. 配置自定义 STUN/TURN 服务器
3. 添加文件传输功能
4. 实现视频/音频通话