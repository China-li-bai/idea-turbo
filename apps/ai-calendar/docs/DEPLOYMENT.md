# AI Calendar 部署指南

> Monorepo 子项目部署到 VPS 的完整流程

---

## 📋 部署架构

```
GitHub Push (main branch)
         ↓
GitHub Actions (CI/CD)
         ↓
    构建项目
         ↓
    上传到 VPS
         ↓
PM2 管理 Next.js 进程 (端口 3001)
         ↓
Nginx 反向代理 (privlocal.com)
         ↓
Cloudflare SSL (HTTPS)
```

---

## 🚀 快速部署

### 1. 推送代码触发自动部署

```bash
git add .
git commit -m "deploy: update ai-calendar"
git push origin main
```

### 2. 查看部署状态

GitHub Actions: https://github.com/your-repo/actions

---

## 📁 创建的文件

| 文件 | 用途 |
|------|------|
| `apps/ai-calendar/ecosystem.config.cjs` | PM2 进程配置 |
| `.github/workflows/deploy-ai-calendar.yml` | GitHub Actions CI/CD |
| `apps/ai-calendar/nginx/privlocal.com.conf` | Nginx 反向代理配置 |

---

## 🔧 服务器端配置

### 首次部署前需要在服务器上执行：

```bash
# 1. 创建目录
sudo mkdir -p /var/www/ai-calendar
sudo mkdir -p /var/log/pm2

# 2. 设置权限
sudo chown -R $USER:$USER /var/www/ai-calendar

# 3. 安装 PM2
npm install -g pm2

# 4. 配置 Nginx
sudo cp /var/www/ai-calendar/apps/ai-calendar/nginx/privlocal.com.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/privlocal.com.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. 配置 PM2 开机自启
pm2 startup
```

---

## 🔐 GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

| Secret | 说明 |
|--------|------|
| `SSH_HOST` | VPS IP 地址 |
| `SSH_USER` | SSH 用户名 (通常是 root) |
| `SSH_PORT` | SSH 端口 (默认 22) |
| `VPS_SSH_KEY` | SSH 私钥 |

---

## 🌐 Cloudflare 配置

### DNS 设置

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|---------|
| A | @ | VPS_IP | 已代理 |
| A | www | VPS_IP | 已代理 |

### SSL/TLS 设置

1. 进入 Cloudflare Dashboard
2. 选择域名
3. SSL/TLS → 概述
4. 设置为 **完全** 或 **完全(严格)**

---

## 🔄 手动部署命令

如果需要手动部署：

```bash
# 在服务器上执行
cd /var/www/ai-calendar
git pull
pnpm install --no-frozen-lockfile
pnpm --filter ai-calendar build
pm2 restart ai-calendar
```

---

## 📊 PM2 常用命令

```bash
pm2 list                    # 查看所有进程
pm2 logs ai-calendar        # 查看日志
pm2 restart ai-calendar     # 重启应用
pm2 stop ai-calendar        # 停止应用
pm2 delete ai-calendar      # 删除进程
pm2 monit                   # 监控面板
```

---

## ⚠️ 注意事项

### Monorepo 特殊处理

由于 `ai-calendar` 是 monorepo 的子项目：

1. **依赖安装**: 需要在 monorepo 根目录运行 `pnpm install`
2. **构建顺序**: 先构建依赖包 (`local-first-sdk`, `sherpa-onnx`)，再构建应用
3. **运行目录**: PM2 配置中的 `cwd` 指向 `apps/ai-calendar`

### 端口分配

| 应用 | 端口 |
|------|------|
| ai-calendar | 3002 |
| listen-book | 静态文件 (Nginx 直接服务) |

---

## 🐛 故障排查

### 应用无法访问

```bash
# 检查 PM2 状态
pm2 list

# 检查端口
netstat -tlnp | grep 3001

# 检查日志
pm2 logs ai-calendar --lines 50
```

### Nginx 502 错误

```bash
# 检查 Nginx 配置
sudo nginx -t

# 检查后端是否运行
curl http://localhost:3002

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 构建失败

```bash
# 检查依赖
pnpm install

# 检查 TypeScript 错误
pnpm --filter ai-calendar exec tsc --noEmit

# 手动构建
pnpm --filter ai-calendar build
```

---

## 📚 相关文档

- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Nginx 反向代理](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

*最后更新: 2026-03-21*
