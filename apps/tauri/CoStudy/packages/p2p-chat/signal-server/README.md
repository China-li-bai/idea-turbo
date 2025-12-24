# Cloudflare Workers 信令服务器部署指南

## 🚀 部署步骤

### 1. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare
```bash
wrangler login
```

### 3. 部署 Worker
```bash
cd signal-server
wrangler deploy
```

### 4. 获取 Worker URL
部署完成后，Wrangler 会显示你的 Worker URL，格式类似：
```
https://p2p-chat-signal-server.your-subdomain.workers.dev
```

## 📝 使用方法

在 P2P Chat 应用中，将信令服务器 URL 设置为：
```
wss://p2p-chat-signal-server.your-subdomain.workers.dev
```

## 🔧 自定义域名（可选）

### 1. 添加自定义域名
```bash
wrangler custom-domains add signal.yourdomain.com
```

### 2. 更新 P2P Chat 中的 URL
```
wss://signal.yourdomain.com
```

## 🌟 特性

- ✅ **免费使用**: Cloudflare Workers 免费额度为每天 100,000 次请求
- ✅ **全球分布**: 自动 CDN 加速，低延迟
- ✅ **WebSocket 支持**: 原生支持 WebSocket 连接
- ✅ **无需服务器**: 完全无服务器架构
- ✅ **自动扩展**: 根据负载自动扩容

## 📊 费用说明

Cloudflare Workers 免费套餐包括：
- 100,000 请求/天
- 10ms CPU 时间/请求
- 免费出站流量

对于 P2P 聊天测试和少量使用完全免费！

## 🛠️ 高级配置

### 环境变量
可以在 `wrangler.toml` 中添加环境变量：

```toml
[vars]
MAX_ROOM_SIZE = "10"
HEARTBEAT_INTERVAL = "30000"
```

### KV 存储（可选）
如果需要持久化房间信息，可以添加 KV 存储：

```toml
[[kv_namespaces]]
binding = "ROOMS"
id = "your-kv-namespace-id"
```