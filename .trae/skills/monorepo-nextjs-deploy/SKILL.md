---
name: "monorepo-nextjs-deploy"
description: "Turborepo Monorepo Next.js 子项目部署到 VPS。Invoke when deploying a Next.js app from monorepo, setting up GitHub Actions, PM2, Nginx."
---

# Monorepo Next.js 部署

## 概述

将 Turborepo Monorepo 中的 Next.js 子项目部署到 VPS，使用 GitHub Actions + PM2 + Nginx。

---

## 核心配置文件

### 1. PM2 配置 (`apps/your-app/ecosystem.config.cjs`)

```javascript
module.exports = {
  apps: [{
    name: "your-app",
    script: "npm",
    args: "start",
    cwd: "/var/www/your-app/apps/your-app",
    env: {
      NODE_ENV: "production",
      PORT: 3002  // 确保端口未被占用
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "1G"
  }]
};
```

### 2. Next.js 配置 (`apps/your-app/next.config.ts`)

```typescript
const nextConfig: NextConfig = {
  transpilePackages: [
    '@your-org/workspace-package-1',
    '@your-org/workspace-package-2',
  ],
};
```

**重要**: Workspace 包必须添加到 `transpilePackages`，否则构建失败。

### 3. GitHub Actions (`.github/workflows/deploy-your-app.yml`)

```yaml
name: CI/CD Deploy (your-app)

on:
  push:
    branches: ["your-branch"]
    paths:
      - "apps/your-app/**"
      - "packages/shared-package/**"
      - ".github/workflows/deploy-your-app.yml"
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x

      - run: pnpm install --no-frozen-lockfile

      # 清理旧缓存
      - run: rm -rf apps/your-app/.next apps/your-app/tsconfig.tsbuildinfo

      # 构建依赖包
      - run: pnpm --filter @your-org/shared-package build

      # 构建应用
      - run: pnpm --filter your-app build

      # 打包（避免竞态条件）
      - run: |
          tar --warning=no-file-changed -czf /tmp/app.tar.gz \
            --exclude='node_modules/.cache' \
            --exclude='.git' \
            .
          mv /tmp/app.tar.gz .

      - uses: actions/upload-artifact@v4
        with:
          name: app-tarball
          path: app.tar.gz

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: app-tarball

      - uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.SSH_PORT }}
          source: "app.tar.gz"
          target: "/tmp/"

      - uses: appleboy/ssh-action@v0.1.8
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            APP_NAME="your-app"
            APP_PORT=3002
            TAR="/tmp/app.tar.gz"
            APP_DIR="/var/www/${APP_NAME}"
            
            sudo mkdir -p "$APP_DIR" /var/log/pm2
            sudo tar -xzf "$TAR" -C "$APP_DIR"
            sudo chown -R www-data:www-data "$APP_DIR"
            
            cd "$APP_DIR/apps/your-app"
            pm2 stop $APP_NAME 2>/dev/null || true
            pm2 delete $APP_NAME 2>/dev/null || true
            pm2 start ecosystem.config.cjs
            pm2 save
            
            rm -f "$TAR"
```

### 4. Nginx 配置 (`apps/your-app/nginx/domain.conf`)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 常见问题与解决方案

### 1. Module not found: Can't resolve '@org/workspace-package'

**原因**: Workspace 包未配置 `transpilePackages`

**解决**: 在 `next.config.ts` 添加：
```typescript
transpilePackages: ['@org/workspace-package']
```

### 2. tar: file changed as we read it

**原因**: tar 打包当前目录时写入 tarball 导致竞态

**解决**: 先写入 `/tmp`，再移动：
```bash
tar --warning=no-file-changed -czf /tmp/app.tar.gz ... .
mv /tmp/app.tar.gz .
```

### 3. TypeScript 找不到已删除的文件

**原因**: `.next` 或 `tsconfig.tsbuildinfo` 缓存

**解决**: 构建前清理：
```bash
rm -rf apps/your-app/.next apps/your-app/tsconfig.tsbuildinfo
```

### 4. Nginx 显示错误的应用

**原因**: 域名未配置 Nginx，使用默认 server

**解决**:
```bash
sudo ln -sf /etc/nginx/sites-available/your-domain /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### 5. PM2 进程不断重启

**原因**: 应用启动失败

**解决**:
```bash
pm2 logs your-app --lines 50
cd /var/www/your-app/apps/your-app && npm start  # 手动测试
```

---

## 部署检查清单

- [ ] `next.config.ts` 包含所有 workspace 包的 `transpilePackages`
- [ ] PM2 配置中的端口未被占用
- [ ] GitHub Secrets 已配置 (SSH_HOST, SSH_USER, SSH_PORT, VPS_SSH_KEY)
- [ ] Nginx 配置已创建并启用
- [ ] 构建前清理 `.next` 缓存
- [ ] tar 打包使用 `/tmp` 避免竞态
- [ ] 移除未使用的依赖和导入

---

## 相关文档

- `apps/ai-calendar/docs/DEPLOYMENT.md` - 完整部署指南
- `apps/ai-calendar/CHANGELOG.md` - 变更日志
