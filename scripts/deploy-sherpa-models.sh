#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/apps/listen-book/public"
BUCKET_NAME="${BUCKET_NAME:-your-bucket}"
CDN_PROVIDER="${CDN_PROVIDER:-aliyun}"

echo "🚀 开始部署 SherpaOnnx 模型文件到 CDN..."
echo "Provider: $CDN_PROVIDER"
echo "Bucket: $BUCKET_NAME"
echo "Public Dir: $PUBLIC_DIR"
echo ""

if [ ! -d "$PUBLIC_DIR" ]; then
    echo "❌ Public 目录不存在: $PUBLIC_DIR"
    exit 1
fi

upload_to_aliyun() {
    echo "📦 上传到阿里云 OSS..."
    
    if ! command -v ossutil &> /dev/null; then
        echo "❌ ossutil 未安装，请运行: brew install ossutil"
        exit 1
    fi
    
    ossutil cp -f "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.data" "oss://$BUCKET_NAME/sherpa-onnx/"
    ossutil cp -f "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.wasm" "oss://$BUCKET_NAME/sherpa-onnx/"
    ossutil cp -r "$PUBLIC_DIR/models" "oss://$BUCKET_NAME/sherpa-onnx/models"
    
    echo "✅ 上传完成"
    echo "🌐 CDN URL: https://$BUCKET_NAME.oss-cn-hangzhou.aliyuncs.com/sherpa-onnx"
}

upload_to_tencent() {
    echo "📦 上传到腾讯云 COS..."
    
    if ! command -v coscmd &> /dev/null; then
        echo "❌ coscmd 未安装，请运行: pip install coscmd"
        exit 1
    fi
    
    coscmd upload "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.data" "/sherpa-onnx/"
    coscmd upload "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.wasm" "/sherpa-onnx/"
    coscmd upload -r "$PUBLIC_DIR/models" "/sherpa-onnx/models"
    
    echo "✅ 上传完成"
    echo "🌐 CDN URL: https://$BUCKET_NAME.cos.ap-guangzhou.myqcloud.com/sherpa-onnx"
}

upload_to_aws() {
    echo "📦 上传到 AWS S3..."
    
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI 未安装，请运行: brew install awscli"
        exit 1
    fi
    
    aws s3 cp "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.data" "s3://$BUCKET_NAME/sherpa-onnx/"
    aws s3 cp "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.wasm" "s3://$BUCKET_NAME/sherpa-onnx/"
    aws s3 sync "$PUBLIC_DIR/models" "s3://$BUCKET_NAME/sherpa-onnx/models"
    
    echo "✅ 上传完成"
    echo "🌐 CDN URL: https://$BUCKET_NAME.s3.amazonaws.com/sherpa-onnx"
}

upload_to_github() {
    echo "📦 上传到 GitHub Pages..."
    
    TEMP_DIR=$(mktemp -d)
    REPO_NAME="sherpa-onnx-models"
    
    cd "$TEMP_DIR"
    git init
    git config user.email "your-email@example.com"
    git config user.name "Your Name"
    
    cp "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.data" .
    cp "$PUBLIC_DIR/sherpa-onnx-wasm-main-asr.wasm" .
    cp -r "$PUBLIC_DIR/models" .
    
    cat > index.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>SherpaOnnx Models</title>
</head>
<body>
    <h1>SherpaOnnx Models Repository</h1>
    <p>Model files for offline speech recognition</p>
</body>
</html>
EOF
    
    git add .
    git commit -m "Add sherpa-onnx models"
    
    echo ""
    echo "⚠️  请手动创建 GitHub 仓库并推送："
    echo "   1. 访问 https://github.com/new"
    echo "   2. 创建名为 $REPO_NAME 的仓库"
    echo "   3. 运行以下命令："
    echo ""
    echo "      cd $TEMP_DIR"
    echo "      git remote add origin https://github.com/YOUR_USERNAME/$REPO_NAME.git"
    echo "      git push -u origin main"
    echo "      cd -"
    echo ""
    echo "   4. 启用 GitHub Pages: Settings -> Pages -> Source: main"
    echo "   5. CDN URL: https://YOUR_USERNAME.github.io/$REPO_NAME"
}

case "$CDN_PROVIDER" in
    aliyun)
        upload_to_aliyun
        ;;
    tencent)
        upload_to_tencent
        ;;
    aws)
        upload_to_aws
        ;;
    github)
        upload_to_github
        ;;
    *)
        echo "❌ 未知的 CDN 提供商: $CDN_PROVIDER"
        echo "支持的提供商: aliyun, tencent, aws, github"
        exit 1
        ;;
esac

echo ""
echo "📝 配置环境变量："
echo "   NEXT_PUBLIC_SHERPA_ONNX_CDN=https://your-cdn-url/sherpa-onnx"
echo ""
echo "🎉 部署完成！"
