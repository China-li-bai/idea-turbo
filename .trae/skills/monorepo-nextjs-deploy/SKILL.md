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
    script: "node",
    args: "server.js",
    cwd: "/var/www/your-app",
    env: {
      NODE_ENV: "production",
      PORT: 3002
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "1G",
    error_file: "/var/log/pm2/your-app-error.log",
    out_file: "/var/log/pm2/your-app-out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true
  }]
};
```

**关键经验**：
- ✅ 使用 `standalone` 模式时，用 `node server.js` 而非 `pnpm start`
- ✅ `cwd` 指向 `standalone` 目录的父目录（解压后的根目录）
- ✅ `PORT` 环境变量在 standalone 模式下**会生效**
- ⚠️ `instances: 1` - Next.js 不是线程安全的，不能用 cluster 模式

### 2. Next.js 配置 (`apps/your-app/next.config.ts`)

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // 官方推荐的部署模式
  transpilePackages: [
    '@your-org/workspace-package-1',
    '@your-org/workspace-package-2',
  ],
};
```

**重要**:
- `output: 'standalone'` 是官方推荐的 VPS 部署模式
- Workspace 包必须添加到 `transpilePackages`

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

      # 复制静态文件到 standalone 目录
      - run: |
          cp -r apps/your-app/public apps/your-app/.next/standalone/
          cp -r apps/your-app/.next/static apps/your-app/.next/standalone/.next/

      # 打包 standalone 目录
      - run: |
          tar --warning=no-file-changed -czf /tmp/app.tar.gz -C apps/your-app/.next/standalone .
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

            # Copy static files for standalone mode
            if [ -d "$APP_DIR/apps/your-app/public" ]; then
              cp -r "$APP_DIR/apps/your-app/public" "$APP_DIR/"
            fi
            if [ -d "$APP_DIR/apps/your-app/.next/static" ]; then
              cp -r "$APP_DIR/apps/your-app/.next/static" "$APP_DIR/.next/"
            fi

            sudo chown -R www-data:www-data "$APP_DIR"

            cd "$APP_DIR"
            pm2 stop $APP_NAME 2>/dev/null || true
            pm2 delete $APP_NAME 2>/dev/null || true
            pm2 start apps/your-app/ecosystem.config.cjs
            pm2 save

            rm -f "$TAR"

**部署脚本最佳实践**：
- ✅ 使用 `standalone` 模式，部署包更小，不需要 pnpm install
- ✅ 不需要创建 `backup` 目录，备份会占用大量磁盘空间
- ✅ 使用 Git 作为版本控制，必要时可以从 Git 恢复
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

### 5. PM2 进程不断重启 (EADDRINUSE / EACCES)

**原因**: 端口被占用或权限问题

**排查步骤**:
```bash
# 1. 检查端口占用
lsof -i :3002

# 2. 查看 PM2 日志
pm2 logs your-app --lines 50

# 3. 手动测试启动（standalone 模式）
cd /var/www/your-app && PORT=3002 node server.js
```

**关键经验**：
- ✅ **standalone 模式下**，`PORT` 环境变量**会生效**
- ✅ 使用 `node server.js` 而非 `pnpm start`
- ✅ 检查 PM2 配置中的 `script` 和 `args` 是否正确
- ⚠️ `instances: 1` - Next.js 不是线程安全的

### 6. TypeScript 类型错误：可选参数后不能有必需参数

**错误**: `A required parameter cannot follow an optional parameter`

**原因**: TypeScript 不允许可选参数（`?`）后面跟着必需参数

**解决**:
```typescript
// ❌ 错误
function createAppError(
  error: Error,
  context?: string,        // 可选参数
  severity: ErrorSeverity, // 必需参数（错误）
  category: ErrorCategory
): AppError

// ✅ 正确
function createAppError(
  error: Error,
  context: string | undefined, // 明确声明 undefined 类型
  severity: ErrorSeverity,
  category: ErrorCategory
): AppError
```

### 7. Web Crypto API 类型错误：Uint8Array vs ArrayBuffer

**错误**: `Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BufferSource'`

**原因**: Web Crypto API 要求 `ArrayBuffer` 类型，而不是 `Uint8Array`

**解决**:
```typescript
// ❌ 错误
crypto.subtle.deriveKey({
  name: 'PBKDF2',
  salt: salt,  // Uint8Array
  // ...
})

// ✅ 正确
crypto.subtle.deriveKey({
  name: 'PBKDF2',
  salt: salt.buffer as ArrayBuffer,  // 转换为 ArrayBuffer
  // ...
})

// 同样适用于 iv 参数
crypto.subtle.encrypt({
  name: 'AES-GCM',
  iv: iv.buffer as ArrayBuffer,  // 转换为 ArrayBuffer
  // ...
})
```

### 8. Next.js 构建缓存警告

**警告**: `No build cache found. Please configure build caching for faster rebuilds.`

**原因**: CI/CD 环境中没有持久化 Next.js 缓存

**解决**:
```yaml
# GitHub Actions 中添加缓存
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: |
      apps/your-app/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-
```

**注意**: 首次构建或新项目可以忽略此警告。

### 9. 设备指纹隐私保护最佳实践

**问题**: 设备指纹可能泄露用户隐私信息

**解决方案**:
```typescript
// ❌ 避免：收集敏感信息
const components = [
  navigator.userAgent,      // 浏览器+操作系统信息
  navigator.deviceMemory,   // 硬件信息
  // ...
];

// ✅ 推荐：只收集非敏感信息 + 随机数
const components = [
  navigator.language,
  navigator.hardwareConcurrency,
  screen.width + 'x' + screen.height,
  Date.now().toString(),    // 时间戳
  generateRandomString(),   // 随机数
];

// ✅ 提供用户控制
export function resetDeviceFingerprint(): void {
  localStorage.removeItem('device-id');
  // 生成新的随机 ID
}

export function hasPrivacyConsent(): boolean {
  return localStorage.getItem('privacy-consent') === 'true';
}
```

---

## 部署检查清单

- [ ] `next.config.ts` 包含 `output: 'standalone'`
- [ ] `next.config.ts` 包含所有 workspace 包的 `transpilePackages`
- [ ] PM2 配置使用 `node server.js` (standalone 模式)
- [ ] PM2 配置 `instances: 1`（Next.js 不是线程安全的）
- [ ] GitHub Secrets 已配置 (SSH_HOST, SSH_USER, SSH_PORT, VPS_SSH_KEY)
- [ ] Nginx 配置已创建并启用
- [ ] 构建后复制 `public/` 和 `.next/static/` 到 standalone 目录
- [ ] tar 打包使用 `/tmp` 避免竞态
- [ ] 部署脚本**不创建** backup 目录
- [ ] TypeScript 类型定义正确（可选参数、ArrayBuffer 类型）

---

## 快速诊断命令

```bash
# 检查 PM2 状态
pm2 list
pm2 logs your-app --lines 50

# 检查端口占用
lsof -i :3002

# 手动启动测试（standalone 模式）
cd /var/www/your-app && PORT=3002 node server.js

# 检查 Nginx 配置
sudo nginx -t
sudo systemctl status nginx

# 检查应用响应
curl -I http://localhost:3002
curl -I https://your-domain.com
```

---

## 相关文档

- `apps/ai-calendar/docs/DEPLOYMENT.md` - 完整部署指南
- `apps/ai-calendar/CHANGELOG.md` - 变更日志
