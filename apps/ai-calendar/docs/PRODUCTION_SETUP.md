# 生产环境配置指南

本文档说明如何配置 ai-calendar 应用的生产环境。

## 📋 前置要求

- 服务器已部署 ai-calendar 应用
- PM2 已安装并运行
- Nginx 已安装并配置
- Cloudflare 已配置（处理 HTTPS/SSL）

## 🚀 快速开始

### 1. 首次部署后运行设置脚本

```bash
# SSH 到服务器
ssh user@your-server

# 下载并运行设置脚本
cd /var/www/ai-calendar
chmod +x scripts/*.sh
sudo ./scripts/post-deploy-setup.sh
```

这个脚本会自动配置：
- ✅ PM2 日志轮转
- ✅ Nginx 速率限制
- ✅ 验证部署状态

## 📦 配置详情

### 1. PM2 日志轮转

**目的**: 防止日志文件无限增长占满磁盘

**配置**:
- 最大日志大小: 10MB
- 保留天数: 7 天
- 压缩: 启用
- 轮转时间: 每天凌晨

**手动配置**:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

**验证**:
```bash
pm2 conf pm2-logrotate
```

### 2. Nginx 速率限制

**目的**: 防止 API 滥用和 DDoS 攻击

**配置**:
- API 路由 (`/api/*`): 10 请求/秒，突发 20
- 普通路由: 30 请求/秒，突发 50
- 健康检查 (`/api/health`): 无限制

**手动配置**:

1. 编辑 `/etc/nginx/nginx.conf`，在 `http` 块中添加：
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
```

2. 重启 Nginx：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**验证**:
```bash
# 测试速率限制
for i in {1..25}; do curl -I https://privlocal.com/api/health; done
```

### 3. 健康检查端点

**端点**: `/api/health`

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "0.1.0",
  "memory": {
    "used": 45,
    "total": 128,
    "unit": "MB"
  }
}
```

**用途**:
- 负载均衡器健康检查
- 监控系统状态
- 自动扩缩容判断

**验证**:
```bash
curl http://localhost:3002/api/health
```

### 4. 环境变量验证

**目的**: 确保所有必需的环境变量已配置

**配置文件**: `lib/config/env.ts`

**必需变量**:
- `NODE_ENV` - 环境标识

**可选变量**:
- `OPENAI_API_KEY` - OpenAI API 密钥
- `GEMINI_API_KEY` - Gemini API 密钥
- `GLM_API_KEY` - 智谱 GLM API 密钥
- `BAILIAN_API_KEY` - 阿里云百炼 API 密钥
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` - Umami 统计 ID

**验证**: 应用启动时会自动验证，缺少必需变量会导致启动失败。

## 🔧 日常运维

### 查看应用状态

```bash
# PM2 状态
pm2 list

# 实时日志
pm2 logs ai-calendar

# 监控面板
pm2 monit
```

### 查看健康状态

```bash
# 本地健康检查
curl http://localhost:3002/api/health

# 远程健康检查
curl https://privlocal.com/api/health
```

### 重启应用

```bash
# 正常重启
pm2 restart ai-calendar

# 重新加载（无停机）
pm2 reload ai-calendar
```

### 查看日志

```bash
# 最近 100 行日志
pm2 logs ai-calendar --lines 100

# 实时日志
pm2 logs ai-calendar

# 错误日志
tail -f /var/log/pm2/ai-calendar-error.log

# 输出日志
tail -f /var/log/pm2/ai-calendar-out.log
```

## 🚨 故障排查

### 应用无法启动

1. 检查环境变量：
```bash
pm2 logs ai-calendar --lines 50
```

2. 检查端口占用：
```bash
lsof -i :3002
```

3. 手动启动测试：
```bash
cd /var/www/ai-calendar
PORT=3002 node server.js
```

### 健康检查失败

1. 检查应用是否运行：
```bash
pm2 list
```

2. 检查端口监听：
```bash
netstat -tlnp | grep 3002
```

3. 检查防火墙：
```bash
sudo ufw status
```

### Nginx 速率限制问题

1. 查看 Nginx 错误日志：
```bash
sudo tail -f /var/log/nginx/error.log
```

2. 检查速率限制配置：
```bash
sudo nginx -T | grep limit_req
```

3. 临时禁用速率限制（调试用）：
```nginx
# 在 nginx 配置中注释掉 limit_req 行
# limit_req zone=api_limit burst=20 nodelay;
```

## 📊 监控建议

### 推荐监控工具

1. **Uptime Robot** (免费)
   - 监控 URL: `https://privlocal.com/api/health`
   - 检查间隔: 5 分钟
   - 告警方式: 邮件、Slack

2. **Better Uptime** (免费)
   - 状态页面
   - 多渠道告警

3. **Sentry** (错误追踪)
   - 实时错误报告
   - 性能监控

### 关键指标

- **可用性**: > 99.9%
- **响应时间**: < 500ms (P95)
- **错误率**: < 1%
- **内存使用**: < 80%
- **CPU 使用**: < 70%

## 🔄 更新配置

### 更新 Nginx 配置

```bash
# 1. 编辑配置
sudo nano /etc/nginx/sites-available/privlocal.com

# 2. 测试配置
sudo nginx -t

# 3. 重载配置
sudo systemctl reload nginx
```

### 更新 PM2 配置

```bash
# 1. 编辑配置
nano /var/www/ai-calendar/ecosystem.config.cjs

# 2. 重启应用
pm2 restart ai-calendar

# 3. 保存配置
pm2 save
```

## 📚 相关文档

- [部署指南](./DEPLOYMENT.md)
- [变更日志](./CHANGELOG.md)
- [架构文档](./docs/ARCHITECTURE_REVIEW.md)

## 🆘 获取帮助

遇到问题时：

1. 查看日志：`pm2 logs ai-calendar`
2. 检查健康状态：`curl http://localhost:3002/api/health`
3. 查看监控：`pm2 monit`
4. 查阅文档：本文件和 `DEPLOYMENT.md`
