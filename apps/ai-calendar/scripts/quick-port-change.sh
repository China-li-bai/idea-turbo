# ========================================
# ai-calendar 端口从 3002 切换到 4439 - 手动操作指南
# ========================================
#
# 执行时间：约 2 分钟
#

echo "🔄 开始切换端口到 4439"
echo ""

# ========================================
# 1. 停止应用
# ========================================
echo "1️⃣  停止应用"
pm2 stop ai-calendar 2>/dev/null || true
pm2 delete ai-calendar 2>/dev/null || true
echo "✅ 应用已停止"
echo ""

# ========================================
# 2. 删除错误的 Nginx 符号链接
# ========================================
echo "2️⃣  清理 Nginx 配置"
if [ -L "/etc/nginx/sites-enabled/privlocal.com.conf" ]; then
  rm -f /etc/nginx/sites-enabled/privlocal.com.conf
  echo "✅ 已删除错误的符号链接"
fi
echo ""

# ========================================
# 3. 更新 Nginx 配置
# ========================================
echo "3️⃣  更新 Nginx 配置"
NGINX_CONF="/etc/nginx/sites-available/privlocal.com"

# 备份
cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# 替换端口 3002 → 4439
sed -i 's/127.0.0.1:3002/127.0.0.1:4439/g' "$NGINX_CONF"
echo "✅ Nginx 配置已更新"

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
echo ""

# ========================================
# 4. 启动应用（端口 4439）
# ========================================
echo "4️⃣  启动应用"
cd /var/www/ai-calendar
PORT=4439 pm2 start server.js --name ai-calendar
pm2 save
echo "✅ 应用已启动（端口 4439）"
echo ""

# ========================================
# 5. 验证
# ========================================
echo "5️⃣  验证"
sleep 3

# 健康检查
echo "检查健康检查..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4439/api/health 2>/dev/null || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
  echo "✅ 健康检查通过!"
  curl -s http://localhost:4439/api/health
else
  echo "⚠️  健康检查返回: $HEALTH_STATUS"
fi
echo ""

# PM2 状态
echo "PM2 状态:"
pm2 list
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 完成！端口已切换到 4439"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "验证命令:"
echo "  curl http://localhost:4439/api/health"
echo "  pm2 logs ai-calendar --lines 20"
echo ""
