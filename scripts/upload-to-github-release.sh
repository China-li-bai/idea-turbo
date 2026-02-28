#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/apps/listen-book/public"
GITHUB_USER="China-li-bai"
REPO_NAME="sherpa-onnx-models"
VERSION="v1.0.0"

echo "🚀 GitHub Release 部署工具"
echo "========================"
echo "Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "Version: $VERSION"
echo "Public Dir: $PUBLIC_DIR"
echo ""

if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI 未安装"
    echo ""
    echo "请先安装 GitHub CLI："
    echo "  brew install gh"
    echo ""
    echo "或者手动上传文件到 GitHub Release："
    echo "  1. 访问 https://github.com/$GITHUB_USER/$REPO_NAME/releases/new"
    echo "  2. 创建 Tag: $VERSION"
    echo "  3. 上传以下文件："
    echo "     - sherpa-onnx-wasm-main-asr.data (190MB)"
    echo "     - sherpa-onnx-wasm-main-asr.wasm (11MB)"
    echo "     - models/ 目录下的所有 .onnx 文件"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI 已安装"
echo ""

if ! gh auth status &> /dev/null; then
    echo "⚠️  未登录 GitHub CLI"
    echo ""
    echo "请先登录："
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI 已登录"
echo ""

cd "$PUBLIC_DIR"

echo "📦 准备上传文件..."
echo ""

FILES=(
    "sherpa-onnx-wasm-main-asr.data"
    "sherpa-onnx-wasm-main-asr.wasm"
    "models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.onnx"
    "models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/encoder-epoch-99-avg-1.int8.onnx"
    "models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/decoder-epoch-99-avg-1.onnx"
    "models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/decoder-epoch-99-avg-1.int8.onnx"
    "models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/joiner-epoch-99-avg-1.onnx"
    "models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/joiner-epoch-99-avg-1.int8.onnx"
    "models/sherpa-onnx-streaming-zh-14M-2023-02-23/tokens.txt"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "  ✅ $file ($size)"
    else
        echo "  ❌ $file (不存在)"
    fi
done

echo ""
read -p "确认上传这些文件到 GitHub Release？(y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "🚀 开始上传..."
echo ""

gh release create "$VERSION" \
    "${FILES[@]}" \
    --repo "$GITHUB_USER/$REPO_NAME" \
    --title "SherpaOnnx Models $VERSION" \
    --notes "Offline speech recognition models for SherpaOnnx.

## Files
- sherpa-onnx-wasm-main-asr.data (190MB) - Main model data
- sherpa-onnx-wasm-main-asr.wasm (11MB) - WebAssembly binary
- models/ - Additional model files

## Usage
Use jsDelivr CDN to access these files:
\`https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@$VERSION/\`

## Configuration
\`\`\`bash
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@$VERSION
\`\`\`"

echo ""
echo "✅ 上传完成！"
echo ""
echo "🌐 CDN URL:"
echo "   https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@$VERSION/"
echo ""
echo "📝 配置环境变量:"
echo "   echo 'NEXT_PUBLIC_SHERPA_ONNX_CDN=https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@$VERSION' > $PROJECT_ROOT/.env.local"
echo ""
echo "🎉 部署成功！"
