#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/apps/listen-book/public"
REPO_NAME="sherpa-onnx-models"
GITHUB_USER="China-li-bai"

echo "🚀 准备 GitHub Release 部署..."
echo "Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📦 创建 README..."
cat > README.md <<EOF
# SherpaOnnx Models

Offline speech recognition models for SherpaOnnx.

## Usage

These models are hosted via GitHub Release and served through jsDelivr CDN.

### CDN URL Format

\`\`\`
https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@latest/
\`\`\`

### Files

- \`sherpa-onnx-wasm-main-asr.data\` (190MB) - Main model data
- \`sherpa-onnx-wasm-main-asr.wasm\` (11MB) - WebAssembly binary
- \`models/\` - Additional model files

## Integration

\`\`\`typescript
const config = {
  remoteResources: {
    baseUrl: 'https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@latest',
    files: {
      wasm: 'sherpa-onnx-wasm-main-asr.wasm',
      data: 'sherpa-onnx-wasm-main-asr.data',
      // ... other files
    }
  }
};
\`\`\`

## License

Same as SherpaOnnx project.
EOF

echo "📝 创建 Git 仓库..."
git init
git config user.email "your-email@example.com"
git config user.name "Your Name"
git add README.md
git commit -m "Add README"

echo ""
echo "⚠️  由于 GitHub 单文件 100MB 限制，需要使用 GitHub Release 上传大文件"
echo ""
echo "📋 请按以下步骤操作："
echo ""
echo "1. 推送 README 到仓库："
echo "   cd $TEMP_DIR"
echo "   git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "2. 创建 GitHub Release："
echo "   访问: https://github.com/$GITHUB_USER/$REPO_NAME/releases/new"
echo "   Tag: v1.0.0"
echo "   Title: SherpaOnnx Models v1.0.0"
echo ""
echo "3. 上传文件到 Release："
echo "   需要上传的文件："
echo "   - sherpa-onnx-wasm-main-asr.data (190MB)"
echo "   - sherpa-onnx-wasm-main-asr.wasm (11MB)"
echo "   - models/ 目录下的所有 .onnx 文件"
echo ""
echo "4. 使用 jsDelivr CDN："
echo "   CDN URL: https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@v1.0.0/"
echo ""
echo "5. 配置环境变量："
echo "   echo 'NEXT_PUBLIC_SHERPA_ONNX_CDN=https://cdn.jsdelivr.net/gh/$GITHUB_USER/$REPO_NAME@v1.0.0' > $PROJECT_ROOT/.env.local"
echo ""

read -p "是否现在推送 README？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    git push -u origin main
    echo ""
    echo "✅ README 已推送"
    echo ""
    echo "🌐 下一步："
    echo "   访问 https://github.com/$GITHUB_USER/$REPO_NAME/releases/new"
    echo "   创建 Release 并上传模型文件"
fi

echo ""
echo "临时目录: $TEMP_DIR"
echo "完成！"
