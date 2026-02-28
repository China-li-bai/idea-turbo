#!/bin/bash

# Edge TTS Worker 部署脚本
# 用于重新部署修改后的 worker

echo "========================================="
echo "Edge TTS Worker 部署脚本"
echo "========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "worker.js" ]; then
    echo "❌ 错误: 请在 worker.js 所在的目录中运行此脚本"
    exit 1
fi

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误: wrangler 未安装"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

echo "📦 开始部署..."
echo ""

# 部署 worker
npx wrangler deploy

# 检查部署是否成功
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ 部署成功！"
    echo "========================================="
    echo ""
    echo "🔗 Worker URL: https://shu.66666618.xyz"
    echo ""
    echo "📝 验证部署:"
    echo "   curl https://shu.66666618.xyz/v1/models"
    echo ""
    echo "📝 测试语音合成:"
    echo '   curl -X POST https://shu.66666618.xyz/v1/audio/speech \'
    echo '     -H "Content-Type: application/json" \'
    echo '     -d "{\"model\":\"microsoft-tts\",\"input\":\"你好，世界！\",\"voice\":\"zh-CN-XiaoxiaoNeural\",\"speed\":1.0,\"pitch\":1.0}" \'
    echo '     --output test.mp3'
    echo ""
else
    echo ""
    echo "========================================="
    echo "❌ 部署失败"
    echo "========================================="
    echo ""
    echo "请检查错误信息并重试"
    exit 1
fi
