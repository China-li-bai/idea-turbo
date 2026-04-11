#!/bin/bash
# ========================================
# 修复 Nginx 速率限制配置问题
# ========================================

echo "🔧 修复 Nginx 速率限制配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ========================================
# 1. 备份 nginx.conf
# ========================================
echo "1️⃣  备份 nginx.conf"
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已备份"
echo ""

# ========================================
# 2. 添加速率限制区域到 http 块
# ========================================
echo "2️⃣  添加速率限制区域定义"

# 检查是否已经存在
if grep -q "zone=api_limit:" /etc/nginx/nginx.conf; then
  echo "✅ 速率限制区域已存在"
else
  # 在 http { 后面添加速率限制配置
  sed -i '/http {/a\
\
\t##\
\t# Rate Limiting Zones\
\t##\
\tlimit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;\
\tlimit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;' /etc/nginx/nginx.conf
  
  echo "✅ 已添加速率限制区域"
fi
echo ""

# ========================================
# 3. 测试 Nginx 配置
# ========================================
echo "3️⃣  测试 Nginx 配置"
if nginx -t; then
  echo "✅ Nginx 配置测试通过"
  
  # 重载 Nginx
  echo ""
  echo "4️⃣  重载 Nginx"
  systemctl reload nginx
  echo "✅ Nginx 已重载"
else
  echo "❌ Nginx 配置测试失败，恢复备份"
  BACKUP_FILE=$(ls -t /etc/nginx/nginx.conf.backup.* | head -1)
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" /etc/nginx/nginx.conf
    echo "✅ 已从备份恢复"
  fi
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 修复完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "现在可以运行端口切换脚本："
echo "  bash scripts/quick-port-change.sh"
echo ""
