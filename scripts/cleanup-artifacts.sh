#!/bin/bash

# GitHub Actions Artifacts 批量清理脚本
# 使用方法: ./cleanup-artifacts.sh <owner> <repo> <token>

OWNER=${1:-"your-username"}
REPO=${2:-"idea-turbo"}
TOKEN=${3:-$GITHUB_TOKEN}

if [ -z "$TOKEN" ]; then
  echo "❌ 错误: 需要提供 GitHub Token"
  echo "使用方法: ./cleanup-artifacts.sh <owner> <repo> <token>"
  echo "或者在环境变量中设置 GITHUB_TOKEN"
  exit 1
fi

echo "🧹 开始清理 $OWNER/$REPO 的 Artifacts..."
echo ""

# 获取所有 artifacts
ARTIFACTS=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/actions/artifacts?per_page=100")

# 解析并删除
echo "$ARTIFACTS" | jq -r '.artifacts[] | "\(.id) \(.name) \(.size_in_bytes) \(.created_at)"' | while read -r id name size created; do
  if [ -n "$id" ]; then
    size_mb=$((size / 1024 / 1024))
    echo "🗑️  删除: $name (ID: $id, 大小: ${size_mb}MB, 创建于: $created)"

    curl -s -X DELETE \
      -H "Authorization: token $TOKEN" \
      "https://api.github.com/repos/$OWNER/$REPO/actions/artifacts/$id"

    if [ $? -eq 0 ]; then
      echo "   ✅ 已删除"
    else
      echo "   ❌ 删除失败"
    fi
  fi
done

echo ""
echo "✨ 清理完成!"
