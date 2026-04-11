# Monorepo Next.js 部署到 VPS

**Description:** Turborepo Monorepo Next.js 子项目部署到 VPS。涵盖 GitHub Actions、PM2、Nginx、端口管理、速率限制等完整部署流程。

---

## 📋 核心配置文件

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
      PORT: 4439  // 使用特殊端口，避免与开发服务冲突
    },
    instances: 1,  // Next.js 不是线程安全的，不能用 cluster 模式
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
- ✅ 使用特殊端口（如 4439）避免与开发服务（3000-3002）冲突
- ⚠️ `instances: 1` - Next.js 不是线程安全的，不能用 cluster 模式

---

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

---

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

      # ⭐ 复制静态文件到正确的 monorepo 嵌套路径
      - run: |
          cp -r apps/your-app/public apps/your-app/.next/standalone/apps/your-app/
          cp -r apps/your-app/.next/static apps/your-app/.next/standalone/apps/your-app/.next/

      # 打包 standalone 目录（避免竞态条件）
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
            APP_PORT=4439  # 使用特殊端口
            TAR="/tmp/app.tar.gz"
            APP_DIR="/var/www/${APP_NAME}"

            sudo mkdir -p "$APP_DIR" /var/log/pm2
            sudo tar -xzf "$TAR" -C "$APP_DIR"

            # 处理 monorepo 结构
            if [ -d "$APP_DIR/apps/your-app" ]; then
              echo "Moving files from nested monorepo structure..."
              sudo cp -r "$APP_DIR/apps/your-app"/* "$APP_DIR/"
              sudo cp -r "$APP_DIR/apps/your-app"/.* "$APP_DIR/" 2>/dev/null || true
              
              if [ -d "$APP_DIR/apps/your-app/.next" ] && [ ! -d "$APP_DIR/.next" ]; then
                sudo cp -r "$APP_DIR/apps/your-app/.next" "$APP_DIR/"
              fi
              
              sudo rm -rf "$APP_DIR/apps"
            fi

            sudo chown -R www-data:www-data "$APP_DIR"

            cd "$APP_DIR"
            pm2 stop $APP_NAME 2>/dev/null || true
            pm2 delete $APP_NAME 2>/dev/null || true
            PORT=$APP_PORT pm2 start server.js --name $APP_NAME
            pm2 save

            # 健康检查
            sleep 3
            HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/api/health)
            if [ "$HEALTH_STATUS" = "200" ]; then
              echo "✅ Health check passed"
            else
              echo "⚠️ Health check returned: $HEALTH_STATUS"
            fi

            rm -f "$TAR"
```

---

### 4. Nginx 配置 (`apps/your-app/nginx/domain.conf`)

```nginx
# ⚠️ 注意：速率限制区域必须在 /etc/nginx/nginx.conf 的 http 块中定义
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
# limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://127.0.0.1:4439;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API routes with strict rate limiting
    location /api/ {
        # ⚠️ 取消注释前，确保已在 nginx.conf 中定义 api_limit 区域
        # limit_req zone=api_limit burst=20 nodelay;
        # limit_req_status 429;

        proxy_pass http://127.0.0.1:4439;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets with caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:4439;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # All other routes
    location / {
        # ⚠️ 取消注释前，确保已在 nginx.conf 中定义 general_limit 区域
        # limit_req zone=general_limit burst=50 nodelay;

        proxy_pass http://127.0.0.1:4439;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 🚨 常见问题与解决方案

### 1. 静态文件 404 错误 ⭐⭐⭐

**错误**: `GET https://your-domain.com/_next/static/chunks/turbopack-xxx.js 404`

**原因**: Monorepo 结构中，standalone 构建保留 `apps/your-app/` 嵌套结构，静态文件必须复制到正确路径。

**错误配置**:
```yaml
# ❌ 错误：复制到 standalone 根目录
- run: |
    cp -r apps/your-app/public apps/your-app/.next/standalone/
    cp -r apps/your-app/.next/static apps/your-app/.next/standalone/.next/
```

**正确配置**:
```yaml
# ✅ 正确：复制到 monorepo 嵌套路径
- run: |
    cp -r apps/your-app/public apps/your-app/.next/standalone/apps/your-app/
    cp -r apps/your-app/.next/static apps/your-app/.next/standalone/apps/your-app/.next/
```

**验证方法**:
```bash
# 本地构建后检查
ls -la apps/your-app/.next/standalone/apps/your-app/.next/static/

# 查找 turbopack 文件
find apps/your-app/.next/standalone/apps/your-app/.next/static -name "*turbopack*"

# 服务器上检查
ls -la /var/www/your-app/.next/static/
find /var/www/your-app -name "*turbopack*" -type f
```

---

### 2. Nginx 速率限制配置错误 ⭐⭐⭐

**错误**: `nginx: [emerg] zero size shared memory zone "api_limit"`

**原因**: 站点配置中引用了速率限制区域，但未在 `/etc/nginx/nginx.conf` 的 `http` 块中定义。

**解决方法**:

编辑 `/etc/nginx/nginx.conf`，在 `http {` 后添加：

```nginx
http {

	##
	# Rate Limiting Zones
	##
	limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
	limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

	##
	# Basic Settings
	##
	...
```

**验证**:
```bash
# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

---

### 3. 端口冲突问题 ⭐⭐

**问题**: 使用 3000-3002 等常用端口，与开发服务冲突。

**解决方案**:
- ✅ 使用特殊端口（如 4439、8080、9000 等）
- ✅ 更新所有配置文件中的端口：
  - `ecosystem.config.cjs`
  - `.github/workflows/deploy-*.yml`
  - `nginx/*.conf`
  - 相关脚本文件

**端口切换脚本示例**:
```bash
#!/bin/bash
# 1. 停止应用
pm2 stop your-app 2>/dev/null || true
pm2 delete your-app 2>/dev/null || true

# 2. 更新 Nginx 配置
sed -i 's/127.0.0.1:3002/127.0.0.1:4439/g' /etc/nginx/sites-available/your-domain

# 3. 测试并重载 Nginx
nginx -t && systemctl reload nginx

# 4. 启动应用
cd /var/www/your-app
PORT=4439 pm2 start server.js --name your-app
pm2 save

# 5. 验证
sleep 3
curl http://localhost:4439/api/health
```

---

### 4. Nginx 符号链接错误 ⭐⭐

**错误**: `nginx: [emerg] open() "/etc/nginx/sites-enabled/your-domain.conf" failed (2: No such file or directory)`

**原因**: 存在错误的符号链接，指向不存在的文件。

**解决方法**:
```bash
# 检查符号链接
ls -la /etc/nginx/sites-enabled/

# 删除错误的符号链接
rm -f /etc/nginx/sites-enabled/your-domain.conf

# 确保正确的符号链接存在
ln -sf /etc/nginx/sites-available/your-domain /etc/nginx/sites-enabled/

# 测试并重载
nginx -t && systemctl reload nginx
```

---

### 5. PM2 日志无限增长 ⭐

**问题**: PM2 日志文件不断增大，占用磁盘空间。

**解决方案**: 安装并配置 `pm2-logrotate`

```bash
# 安装
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval "0 0 * * *"
pm2 set pm2-logrotate:rotateModule true

# 验证
pm2 conf pm2-logrotate
```

---

### 6. 健康检查端点缺失 ⭐

**问题**: 无法监控应用运行状态。

**解决方案**: 创建健康检查端点

**文件**: `apps/your-app/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.1.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  };

  return NextResponse.json(healthCheck, { status: 200 });
}
```

**验证**:
```bash
curl http://localhost:4439/api/health
```

---

### 7. 环境变量未验证 ⭐

**问题**: 应用启动时缺少必需的环境变量，导致运行时错误。

**解决方案**: 在应用启动时验证环境变量

**文件**: `apps/your-app/lib/config/env.ts`

```typescript
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_APP_URL',
  // 添加其他必需的环境变量
];

const optionalEnvVars = [
  'NEXT_PUBLIC_ANALYTICS_ID',
  'SENTRY_DSN',
  // 添加可选的环境变量
];

export function validateEnv(): void {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
}
```

**文件**: `apps/your-app/instrumentation.ts`

```typescript
import { validateEnv } from './lib/config/env';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnv();
  }
}
```

---

## 📋 部署检查清单

### 构建前
- [ ] `next.config.ts` 包含 `output: 'standalone'`
- [ ] `next.config.ts` 包含所有 workspace 包的 `transpilePackages`
- [ ] 清理旧构建缓存：`rm -rf apps/your-app/.next apps/your-app/tsconfig.tsbuildinfo`

### GitHub Actions
- [ ] GitHub Secrets 已配置 (SSH_HOST, SSH_USER, SSH_PORT, VPS_SSH_KEY)
- [ ] **静态文件复制到正确的 monorepo 嵌套路径** ⭐
- [ ] tar 打包使用 `/tmp` 避免竞态
- [ ] 部署脚本包含健康检查

### PM2 配置
- [ ] PM2 配置使用 `node server.js` (standalone 模式)
- [ ] PM2 配置 `instances: 1`（Next.js 不是线程安全的）
- [ ] 使用特殊端口（如 4439）避免冲突
- [ ] PM2 日志轮转已配置

### Nginx 配置
- [ ] Nginx 配置文件已创建
- [ ] **速率限制区域已在 `/etc/nginx/nginx.conf` 中定义** ⭐
- [ ] 符号链接正确（无错误链接）
- [ ] 安全头已添加
- [ ] 静态资源缓存已配置

### 应用功能
- [ ] 健康检查端点已创建
- [ ] 环境变量验证已实现
- [ ] 所有环境变量已配置

### 验证
- [ ] `nginx -t` 测试通过
- [ ] 健康检查响应正常：`curl http://localhost:4439/api/health`
- [ ] PM2 状态正常：`pm2 list`
- [ ] 静态文件存在：`find /var/www/your-app -name "*turbopack*"`

---

## 🔧 快速诊断命令

```bash
# PM2 状态
pm2 list
pm2 logs your-app --lines 50

# 端口占用
lsof -i :4439
netstat -tlnp | grep 4439

# 手动启动测试（standalone 模式）
cd /var/www/your-app && PORT=4439 node server.js

# Nginx 状态
nginx -t
systemctl status nginx

# 应用响应
curl -I http://localhost:4439
curl http://localhost:4439/api/health

# 静态文件检查（monorepo 结构）
ls -la /var/www/your-app/.next/static/
find /var/www/your-app -name "*turbopack*" -type f

# Nginx 配置检查
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/sites-available/

# 检查速率限制区域
grep -n "limit_req_zone" /etc/nginx/nginx.conf

# PM2 日志轮转
pm2 conf pm2-logrotate
```

---

## 📚 相关文档

- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Nginx 反向代理](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Turborepo Monorepo](https://turbo.build/repo/docs)

---

## 🎓 经验总结

### 端口管理最佳实践
1. ✅ 使用特殊端口（4439、8080、9000）避免与开发服务冲突
2. ✅ 在所有配置文件中统一更新端口
3. ✅ 创建端口切换脚本，方便快速修改

### Nginx 配置最佳实践
1. ✅ 速率限制区域必须在 `nginx.conf` 的 `http` 块中定义
2. ✅ 站点配置只引用已定义的区域
3. ✅ 定期检查并清理错误的符号链接
4. ✅ 使用 `nginx -t` 测试配置后再重载

### Monorepo 部署最佳实践
1. ✅ 静态文件必须复制到 `standalone/apps/your-app/` 嵌套路径
2. ✅ 部署脚本处理 monorepo 结构的文件移动
3. ✅ 验证静态文件存在后再启动应用

### 生产环境最佳实践
1. ✅ 配置 PM2 日志轮转，防止日志占满磁盘
2. ✅ 创建健康检查端点，方便监控
3. ✅ 实现环境变量验证，避免运行时错误
4. ✅ 配置 Nginx 速率限制，防止滥用

---

*最后更新: 2026-04-10*
