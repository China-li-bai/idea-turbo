# 免费公共信令服务

## 🌐 公共 WebRTC 信令服务器

### 1. Heroku 免费信令服务器
```
wss://webrtc-signal-server.herokuapp.com/
```

### 2. Glitch 示例服务器
```
wss://webrtc-signaling.glitch.me/
```

### 3. GitHub Pages + WebTask
可以通过 WebTask.io 部署简单的信令服务器

### 4. Firebase Realtime Database
使用 Firebase 作为信令中介，需要配置：

```javascript
// 配置示例
const firebaseConfig = {
  apiKey: "your-api-key",
  databaseURL: "https://your-project.firebaseio.com"
};
```

## 🚀 快速测试方案

### 方案 A: 使用 Glitch（最简单）
1. 访问 https://glitch.com
2. 搜索 "webrtc-signaling" 模板
3. 点击 Remix to Edit
4. 获取生成的 WebSocket URL

### 方案 B: 使用 Replit
1. 访问 https://replit.com
2. 创建新的 Node.js 项目
3. 粘贴我们的 simple-node-server.js 代码
4. 运行并获取 WebSocket URL

### 方案 C: 本地快速测试
```bash
cd signal-server
npm install
npm start
# 服务器将在 ws://localhost:8080 运行
```

## 📝 使用公共服务的注意事项

### 安全性
- ⚠️ 公共服务不加密，不要传输敏感信息
- ⚠️ 可能被其他人监听或干扰
- ✅ 仅用于测试和学习目的

### 稳定性
- ⚠️ 公共服务可能不稳定或随时停止服务
- ⚠️ 可能有连接数限制
- ✅ 适合临时测试

### 性能
- ✅ 对于小规模测试足够
- ⚠️ 大规模使用需要自己部署

## 🛡️ 生产环境建议

对于生产环境，推荐：

1. **Cloudflare Workers** (性价比最高)
   - 免费额度充足
   - 全球 CDN 加速
   - 高可用性

2. **自己的 VPS 服务器**
   - 完全控制
   - 可以配置 SSL
   - 自定义功能

3. **云服务信令方案**
   - Pusher (有免费套餐)
   - Ably (有免费套餐)
   - Socket.io Cloud

## 🔧 快速配置 P2P Chat

在 P2P Chat 应用中，将信令服务器 URL 设置为：

```javascript
// 使用 Cloudflare Workers
const signalingUrl = 'wss://your-worker.your-subdomain.workers.dev';

// 使用本地服务器
const signalingUrl = 'ws://localhost:8080';

// 使用公共服务（测试用）
const signalingUrl = 'wss://webrtc-signal-server.herokuapp.com/';
```

## 🎯 推荐方案

**对于测试和学习：**
1. 先使用本地服务器（最简单）
2. 再尝试 Cloudflare Workers（推荐）

**对于小规模生产：**
- Cloudflare Workers

**对于大规模生产：**
- 自建服务器 + CDN + 负载均衡