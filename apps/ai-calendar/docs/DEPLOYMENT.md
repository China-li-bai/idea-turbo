# AI Calendar 部署指南

> Monorepo 子项目部署到 VPS 的完整流程

---

## 📋 部署架构

```
GitHub Push (home branch)
         ↓
GitHub Actions (CI/CD)
         ↓
    构建项目
         ↓
    上传到 VPS
         ↓
PM2 管理 Next.js 进程 (端口 3002)
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
git push origin home
```

### 2. 查看部署状态

GitHub Actions: https://github.com/your-repo/actions

---

## 📁 部署相关文件

| 文件 | 用途 |
|------|------|
| `apps/ai-calendar/ecosystem.config.cjs` | PM2 进程配置 |
| `.github/workflows/deploy-ai-calendar.yml` | GitHub Actions CI/CD |
| `apps/ai-calendar/nginx/privlocal.com.conf` | Nginx 反向代理配置 |
| `apps/ai-calendar/next.config.ts` | Next.js 配置 (含 transpilePackages) |

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

## ⚠️ 重要注意事项

### 1. Monorepo Workspace 包需要 transpilePackages

在 `next.config.ts` 中添加 workspace 包：

```typescript
const nextConfig: NextConfig = {
  transpilePackages: [
    '@idea-turbo/local-first-sdk',
    // 其他 workspace 包...
  ],
};
```

**原因**: Workspace 包直接导出 TypeScript 源码，Next.js 默认不编译 `node_modules`。

### 2. 清理构建缓存

CI 构建前清理旧缓存，避免引用已删除的文件：

```yaml
- name: Clean build cache
  run: rm -rf apps/ai-calendar/.next apps/ai-calendar/tsconfig.tsbuildinfo
```

### 3. tar 打包避免竞态条件

打包当前目录时，先写入 `/tmp`：

```bash
tar --warning=no-file-changed -czf /tmp/ai-calendar.tar.gz ... .
mv /tmp/ai-calendar.tar.gz .
```

### 4. 端口分配

| 应用 | 端口 |
|------|------|
| ai-calendar | 3002 |
| mirror-revcv | 3000 |
| listen-book | 静态文件 |

### 5. 移除未使用的依赖

部署前检查并移除未使用的包，避免构建错误：

```bash
# 检查未使用的导入
grep -r "from '@idea-turbo/sherpa-onnx'" apps/ai-calendar/
```

---

## 🐛 故障排查

### 构建失败: Module not found

**原因**: Workspace 包未配置 transpilePackages 或包未构建

**解决**:
1. 检查 `next.config.ts` 中的 `transpilePackages`
2. 确保依赖包已构建：`pnpm --filter @idea-turbo/local-first-sdk build`

### tar: file changed as we read it

**原因**: tar 打包当前目录时，同时写入 tarball 文件

**解决**: 先写入 `/tmp`，再移动到当前目录

### PM2 进程不断重启

**原因**: 应用启动失败，检查日志

**解决**:
```bash
pm2 logs ai-calendar --lines 50
# 手动测试
cd /var/www/ai-calendar/apps/ai-calendar && npm start
```

### Nginx 显示错误的应用

**原因**: 域名未配置 Nginx，使用默认配置

**解决**:
```bash
# 检查 Nginx 配置
ls -la /etc/nginx/sites-enabled/
# 添加域名配置
sudo ln -sf /etc/nginx/sites-available/privlocal.com /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### TypeScript 找不到已删除的文件

**原因**: `.next` 或 `tsconfig.tsbuildinfo` 缓存引用旧文件

**解决**:
```bash
rm -rf apps/ai-calendar/.next apps/ai-calendar/tsconfig.tsbuildinfo
```

---

## 📚 相关文档

- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Nginx 反向代理](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Turborepo Monorepo](https://turbo.build/repo/docs)

---

## 📝 部署检查清单

- [ ] `next.config.ts` 包含 `transpilePackages`
- [ ] GitHub Secrets 已配置
- [ ] Nginx 配置已创建并启用
- [ ] PM2 进程正常运行
- [ ] 端口未被占用
- [ ] Cloudflare DNS 和 SSL 已配置

---

*最后更新: 2026-03-25*
