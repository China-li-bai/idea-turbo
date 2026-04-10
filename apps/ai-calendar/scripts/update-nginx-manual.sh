# ========================================
# Nginx 生产环境配置更新指南
# ========================================
#
# 需要手动执行这些命令来更新 Nginx 配置
# 因为当前环境没有 sudo 权限
#
# 执行时间：5-10 分钟

# ========================================
# 步骤 1: 备份当前配置
# ========================================

# 备份 nginx.conf
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 备份站点配置
cp /etc/nginx/sites-available/privlocal.com /etc/nginx/sites-available/privlocal.com.backup.$(date +%Y%m%d_%H%M%S)

# ========================================
# 步骤 2: 更新 nginx.conf（添加速率限制区域和 Gzip）
# ========================================

# 编辑 /etc/nginx/nginx.conf，在 http { 块之后、Basic Settings 之前添加：
#
#   ##
#   # Rate Limiting Zones
#   ##
#   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
#   limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
#
#   ##
#   # Gzip Settings (Enabled)
#   ##
#   gzip_vary on;
#   gzip_proxied any;
#   gzip_comp_level 6;
#   gzip_buffers 16 8k;
#   gzip_http_version 1.1;
#   gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml font/ttf font/opentype;
#
# 同时取消注释已有的 gzip 相关配置

# ========================================
# 步骤 3: 更新站点配置 privlocal.com
# ========================================

# 替换 /etc/nginx/sites-available/privlocal.com 内容为：

cat > /tmp/privlocal.com.conf << 'EOF'
# Rate limiting zones
# Define these in http block of /etc/nginx/nginx.conf:
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
# limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

server {
    listen 80;
    server_name privlocal.com www.privlocal.com;

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
        
        # No caching for health checks
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API routes with strict rate limiting
    location /api/ {
        # Rate limiting: 10 requests per second, burst up to 20
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:4439;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets with caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:4439;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # Cache static assets for 1 year
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # All other routes with moderate rate limiting
    location / {
        # Rate limiting: 30 requests per second, burst up to 50
        limit_req zone=general_limit burst=50 nodelay;

        proxy_pass http://127.0.0.1:4439;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 替换站点配置文件
cp /tmp/privlocal.com.conf /etc/nginx/sites-available/privlocal.com

# ========================================
# 步骤 4: 测试和重载 Nginx
# ========================================

# 测试配置
nginx -t

# 如果测试通过，重载 Nginx
systemctl reload nginx

# ========================================
# 步骤 5: 验证配置
# ========================================

# 检查健康检查端点
curl http://localhost:3002/api/health

# 检查 Nginx 状态
systemctl status nginx

# ========================================
# 验证清单
# ========================================
#
# ✅ 健康检查端点响应: curl /api/health
# ✅ Nginx 配置测试通过: nginx -t
# ✅ 速率限制配置在 nginx.conf 中
# ✅ 安全头已添加
# ✅ 静态资源缓存已配置
#
# ========================================
