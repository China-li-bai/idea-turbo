#!/bin/bash

# Android SDK 本地安装脚本 (macOS)
# 使用腾讯云镜像加速下载

set -e

ANDROID_HOME="$HOME/Library/Android/sdk"
CMD_TOOLS_VERSION="11076708"
CMD_TOOLS_URL="https://mirrors.cloud.tencent.com/AndroidSDK/commandlinetools/cmdline-tools/${CMD_TOOLS_VERSION}/commandlinetools-mac-${CMD_TOOLS_VERSION}_latest.zip"

echo "📦 安装 Android SDK 到: $ANDROID_HOME"

# 创建目录
mkdir -p "$ANDROID_HOME"
cd "$ANDROID_HOME"

# 下载 command-line tools
echo "⬇️  下载 Android Command-Line Tools..."
curl -L -o cmdline-tools.zip "$CMD_TOOLS_URL" --progress-bar

# 解压
echo "📂 解压中..."
unzip -q cmdline-tools.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/bin cmdline-tools/lib cmdline-tools/NOTICE.txt cmdline-tools/source.properties cmdline-tools/latest/ 2>/dev/null || true
rm cmdline-tools.zip

# 设置 PATH
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools"
export ANDROID_HOME

# 安装必要组件
echo "📥 安装 Android SDK 组件..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"

# 验证安装
echo ""
echo "✅ 安装完成！验证："
echo "  - sdkmanager --version: $(sdkmanager --version 2>/dev/null || echo 'N/A')"
echo "  - adb: $(which adb 2>/dev/null || echo '未找到')"

# 输出环境变量配置提示
echo ""
echo "=========================================="
echo "请将以下内容添加到 ~/.zshrc:"
echo ""
echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/tools"
echo "=========================================="
