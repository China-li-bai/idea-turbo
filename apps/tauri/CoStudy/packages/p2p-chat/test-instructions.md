# P2P Chat 测试指南

## 应用已启动
应用现在运行在: http://localhost:3001

## 测试方法

### 方法 1: 使用 WebSocket 信令服务器（推荐）

1. **启动信令服务器**:
   ```bash
   cd signal-server
   npm start
   # 服务器将在 ws://localhost:8080 运行
   ```

2. **测试步骤**:
   - 在浏览器中打开 http://localhost:3001
   - 输入房间ID（例如: `test-room-123`）
   - 输入显示名称
   - 选择 "Use WebSocket Signaling Server"
   - 点击 "Create Room"
   - 在另一个浏览器窗口或标签页中打开同样的地址
   - 输入相同的房间ID
   - 点击 "Join Room"
   - 两个窗口应该能够互相看到对方并开始聊天

### 方法 2: 完全手动模式（无服务器）

1. **第一个用户**:
   - 打开 http://localhost:3001
   - 输入房间ID
   - 不勾选 "Use WebSocket Signaling Server"
   - 点击 "Create Room"
   - 应用会生成 SDP offer（需要在控制台查看或实现复制功能）

2. **第二个用户**:
   - 在另一个窗口打开 http://localhost:3001
   - 输入相同的房间ID
   - 不勾选 "Use WebSocket Signaling Server"
   - 点击 "Join Room"
   - 粘贴第一个用户的 SDP offer
   - 系统会生成 SDP answer
   - 将 answer 复制给第一个用户

## 功能特性

- ✅ **WebRTC DataChannel**: 点对点消息传输
- ✅ **Full-Mesh 架构**: 每个用户直接连接到其他所有用户
- ✅ **两种信令方式**: WebSocket 自动发现 + 手动 SDP 交换
- ✅ **实时消息**: 基于 WebRTC 的低延迟通信
- ✅ **状态管理**: 连接状态、用户列表、聊天记录

## 当前状态

- 🟢 **前端应用**: 已启动并可访问
- 🟡 **信令服务器**: 需要额外配置
- 🟡 **手动 SDP 交换**: 需要完善复制/粘贴功能

## 测试场景

1. **单用户测试**: 创建房间，检查界面是否正常显示
2. **双用户测试**: 两个用户加入同一房间，验证连接建立
3. **多用户测试**: 3-5 个用户加入，验证 full-mesh 连接
4. **消息测试**: 发送消息，验证实时传输
5. **断线重连**: 关闭标签页重新加入

## 注意事项

- WebRTC 需要 HTTPS 环境或 localhost 才能正常工作
- 防火墙可能会影响 WebRTC 连接
- 生产环境需要配置 TURN 服务器以保证 NAT 穿透