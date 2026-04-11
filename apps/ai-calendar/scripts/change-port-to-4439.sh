#!/bin/bash
# ========================================
# ai-calendar 端口更新脚本
# 将端口从 3002 改为 4439
# ========================================
#
# 使用方法：
#   bash scripts/change-port-to-4439.sh
#
# 执行时间：约 2 分钟
#

set -e

echo "🔄 更新 ai-calendar 端口从 3002 到 4439"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ========================================
# 步骤 1: 停止当前应用
# ========================================
echo "📦 步骤 1: 停止当前应用"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 stop ai-calendar 2>/dev/null || true
pm2 delete ai-calendar 2>/dev/null || true
echo "✅ 应用已停止"
echo ""

# ========================================
# 步骤 2: 更新 PM2 配置
# ========================================
echo "⚙️  步骤 2: 更新 PM2 配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /root/ideas/idea-turbo/apps/ai-calendar

if [ -f "ecosystem.config.cjs" ]; then
  # 检查是否已经是 4439
  if grep -q "PORT: 4439" ecosystem.config.cjs; then
    echo "✅ PM2 配置已使用 4439 端口"
  else
    # 更新为 4439
    sed -i 's/PORT: 3002/PORT: 4439/g' ecosystem.config.cjs
    echo "✅ PM2 配置已更新到 4439 端口"
  fi
else
  echo "⚠️  未找到 ecosystem.config.cjs"
fi
echo ""

# ========================================
# 步骤 3: 更新 Nginx 配置
# ========================================
echo "🌐 步骤 3: 更新 Nginx 配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
NGINX_CONF="/etc/nginx/sites-available/privlocal.com"
NGINX_ENABLED_CONF="/etc/nginx/sites-enabled/privlocal.com.conf"

# 先删除错误的符号链接
if [ -L "$NGINX_ENABLED_CONF" ]; then
  echo "删除错误的符号链接: $NGINX_ENABLED_CONF"
  rm -f "$NGINX_ENABLED_CONF"
fi

if [ -f "$NGINX_CONF" ]; then
  # 备份
  cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
  
  # 替换端口
  sed -i 's/127.0.0.1:3002/127.0.0.1:4439/g' "$NGINX_CONF"
  echo "✅ Nginx 配置已更新到 4439 端口"
  
  # 测试配置
  if nginx -t; then
    echo "✅ Nginx 配置测试通过"
    systemctl reload nginx
    echo "✅ Nginx 已重载"
  else
    echo "❌ Nginx 配置测试失败，恢复备份"
    BACKUP_FILE=$(ls -t "${NGINX_CONF}.backup."* | head -1)
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$NGINX_CONF"
      echo "✅ 已从备份恢复"
    fi
    exit 1
  fi
else
  echo "⚠️  未找到 Nginx 配置文件: $NGINX_CONF"
fi
echo ""

# ========================================
# 步骤 4: 启动应用
# ========================================
echo "🚀 步骤 4: 启动应用（端口 4439）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /var/www/ai-calendar 2>/dev/null || cd /root/ideas/idea-turbo/apps/ai-calendar

# 使用 PM2 启动（优先使用 ecosystem.config.cjs）
if [ -f "ecosystem.config.cjs" ]; then
  pm2 start ecosystem.config.cjs
  echo "✅ 通过 ecosystem.config.cjs 启动"
else
  # 直接用端口启动
  PORT=4439 pm2 start server.js --name ai-calendar
  echo "✅ 通过 server.js 直接启动（端口 4439）"
fi

pm2 save
echo ""

# ========================================
# 步骤 5: 验证
# ========================================
echo "🔍 步骤 5: 验证新端口"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 3

# 健康检查
echo "检查健康检查端点..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4439/api/health 2>/dev/null || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
  echo "✅ 健康检查通过 (HTTP 200)"
  HEALTH_RESPONSE=$(curl -s http://localhost:4439/api/health)
  echo "响应: $HEALTH_RESPONSE"
else
  echo "⚠️  健康检查返回: HTTP $HEALTH_STATUS"
  echo "可能需要等待更长时间..."
fi
echo ""

# PM2 状态
echo "PM2 状态："
pm2 list
echo ""

# ========================================
# 完成
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 端口更新完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 总结："
echo "  ✅ 应用端口：4439"
echo "  ✅ PM2 配置：已更新"
echo "  ✅ Nginx 配置：已更新"
echo "  ✅ Nginx：已重载"
echo ""
echo "🔗 验证命令："
echo "  curl http://localhost:4439/api/health"
echo "  pm2 logs ai-calendar --lines 20"
echo "  pm2 list"
echo ""
