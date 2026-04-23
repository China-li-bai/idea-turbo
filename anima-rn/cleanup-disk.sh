#!/bin/bash
set -e

echo "🧹 磁盘清理脚本 - $(date)"
echo "================================"

echo ""
echo "📊 清理前磁盘状态:"
df -h / | tail -1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  清理 Trae/Trae CN 日志 (约 4.2G)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf ~/Library/Application\ Support/Trae/logs
rm -rf ~/Library/Application\ Support/Trae\ CN/logs
echo "✅ 完成"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  清理 Clash Verge 缓存 (约 4.2G)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf ~/Library/Application\ Support/io.github.clash-verge-rev.clash-verge-rev/logs
rm -rf ~/Library/Application\ Support/io.github.clash-verge-rev.clash-verge-rev/cache
echo "✅ 完成"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  卸载不常用软件及数据"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  → 清理 CodeBuddy (1.5G)"
rm -rf ~/Library/Application\ Support/CodeBuddy
rm -rf ~/Library/Application\ Support/CodeBuddy\ CN

echo "  → 清理 Tabbit (1.3G)"
rm -rf ~/Library/Application\ Support/Tabbit

echo "  → 清理 Qoder (350M)"
rm -rf ~/Library/Application\ Support/Qoder

echo "✅ 完成"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  清理非活跃项目 node_modules (约 1.3G)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf ~/project/Wechatsync/node_modules
rm -rf ~/project/DaXiaoRen/node_modules
rm -rf ~/project/gen-paly/longmete/node_modules
rm -rf ~/project/gen-paly/launchmate/node_modules
echo "✅ 完成"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  清理 Trae/Trae CN 缓存 (约 570M)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf ~/Library/Application\ Support/Trae/CachedExtensionVSIXs
rm -rf ~/Library/Application\ Support/Trae/CachedData
rm -rf ~/Library/Application\ Support/Trae/Cache
rm -rf ~/Library/Application\ Support/Trae/GPUCache
rm -rf ~/Library/Application\ Support/Trae\ CN/CachedData
rm -rf ~/Library/Application\ Support/Trae\ CN/blob_storage
rm -rf ~/Library/Application\ Support/Trae\ CN/Cache
echo "✅ 完成"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  清理系统日志和诊断报告"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf ~/Library/Logs/*
rm -rf /var/log/*.old 2>/dev/null || true
echo "✅ 完成"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  清空废纸篓"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf ~/.Trash/*
echo "✅ 完成"

echo ""
echo "================================"
echo "📊 清理后磁盘状态:"
df -h / | tail -1
echo ""
echo "🎉 清理完成！"
