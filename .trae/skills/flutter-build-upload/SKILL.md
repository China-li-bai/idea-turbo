---
name: flutter-build-upload
description: >
  Flutter Android APK 打包 + EAS Expo 上传一体化流程。当用户提到"打包"、"构建"、"上传"、"发布"、"eas upload"、"build apk"、"expo upload"
  或任何与 Flutter 应用构建和分发相关的操作时触发。适用于 idea-turbo/flutter_demo 项目或任何配置了 eas.json 的 Flutter 项目。
  支持完整的一键式 build+upload 流程，也支持单独的构建或上传操作。
compatibility:
  tools: [RunCommand]
  dependencies: [flutter, node, npx/eas-cli]
---

# Flutter Build & EAS Upload Skill

## 概述

本 Skill 封装了 `idea-turbo/flutter_demo` 项目的标准打包上传流程：
1. **Flutter 构建** → 生成 Release APK
2. **EAS 上传** → 将 APK 上传到 Expo EAS 平台分发

## 项目环境信息

| 配置项 | 值 |
|--------|-----|
| **项目路径** | `/root/idea-turbo/flutter_demo` |
| **Flutter SDK** | `/root/idea-turbo/flutter/bin/flutter` |
| **Android SDK** | `/root/idea-turbo/.android-sdk` |
| **Expo 账户** | `weigh` |
| **Expo 项目** | `idea-turbo` |
| **APK 输出路径** | `build/app/outputs/flutter-apk/app-release.apk` |

## 环境变量（必须设置）

由于沙箱环境的文件系统限制，以下环境变量**必须**在执行前设置：

```bash
export PATH="/root/idea-turbo/flutter/bin:$PATH"
export ANDROID_HOME="/root/idea-turbo/.android-sdk"
export XDG_CONFIG_HOME="/tmp/flutter-config"
export HOME=/tmp/flutter-home
mkdir -p $HOME $XDG_CONFIG_HOME
```

> **为什么需要这些？**
> - `XDG_CONFIG_HOME` 和 `HOME` 重定向到 `/tmp` 是因为 `/root/` 目录在沙箱中是只读的，Flutter 需要写入配置文件
> - `ANDROID_HOME` 必须指向项目的本地 Android SDK 路径

## 工作流

### 流程 A：完整流程（推荐）

先构建 Release APK，再上传到 EAS：

```
Step 1: flutter build apk --release
Step 2: npx eas-cli upload --platform android --build-path <apk_path>
```

### 流程 B：仅构建

当用户只需要打包、不需要上传时：

```bash
flutter build apk --release
# 或 Debug 版本：
flutter build apk --debug --target-platform android-arm64
```

### 流程 C：仅上传

当 APK 已存在，只需上传到 EAS 时：

```bash
npx eas-cli upload --platform android --build-path build/app/outputs/flutter-apk/app-release.apk
```

## 执行步骤详解

### Step 1: 构建 APK

```bash
cd /root/idea-turbo/flutter_demo && \
  export PATH="/root/idea-turbo/flutter/bin:$PATH" && \
  export ANDROID_HOME="/root/idea-turbo/.android-sdk" && \
  export XDG_CONFIG_HOME="/tmp/flutter-config" && \
  export HOME=/tmp/flutter-home && \
  mkdir -p $HOME $XDG_CONFIG_HOME && \
  flutter build apk --release
```

**预期输出：**
```
✓ Built build/app/outputs/flutter-apk/app-release.apk (XXX MB)
```

**常见问题处理：**

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Read-only file system, errno = 30` | 未设置 XDG_CONFIG_HOME/HOME | 设置环境变量重定向到 /tmp |
| `command not found: flutter` | PATH 未包含 Flutter SDK | 添加 `/root/idea-turbo/flutter/bin` 到 PATH |
| Gradle 编译失败 | Android SDK 路径错误 | 确认 ANDROID_HOME=`/root/idea-turbo/.android-sdk` |
| `Woah! You appear to be trying to run flutter as root` | 安全警告（可忽略） | 不影响构建结果，继续即可 |

### Step 2: 上传到 EAS

```bash
cd /root/idea-turbo/flutter_demo && \
  npx eas-cli upload \
    --platform android \
    --build-path build/app/outputs/flutter-apk/app-release.apk
```

**预期输出：**
```
Using build build/app/outputs/flutter-apk/app-release.apk
Uploading your app archive to EAS
✔ Uploaded to EAS XXs
✔ Shareable link to the build: https://expo.dev/accounts/weigh/projects/idea-turbo/builds/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

**关键参数说明：**

| 参数 | 值 | 说明 |
|------|-----|------|
| `--platform` | `android` | 目标平台 |
| `--build-path` | APK 相对路径 | 相对于项目根目录 |

> **注意：** 使用 `npx eas-cli` 而非全局安装的 `eas`，避免权限问题。

## 输出格式

完成后的报告模板：

```
## ✅ Flutter 打包 + EAS 上传完成！

### 📦 构建结果
| 项目 | 详情 |
|------|------|
| **文件** | app-release.apk |
| **大小** | XX MB |
| **路径** | flutter_demo/build/app/outputs/flutter-apk/ |

### 📤 EAS 上传结果
| 项目 | 详情 |
|------|------|
| **平台** | Android |
| **Expo 账户** | weigh |
| **构建链接** | https://expo.dev/accounts/weigh/projects/idea-turbo/builds/... |
```

## Git 提交建议（可选）

如果用户同时需要提交代码更改：

```bash
git add -A && git commit -m "chore: 更新模型下载链接并重新构建Release版本" && git push origin flutter
```

## 一键脚本参考

完整的 shell 脚本（可用于自动化）：

```bash
#!/bin/bash
set -e

PROJECT_DIR="/root/idea-turbo/flutter_demo"
FLUTTER_BIN="/root/idea-turbo/flutter/bin"
ANDROID_SDK="/root/idea-turbo/.android-sdk"

export PATH="$FLUTTER_BIN:$PATH"
export ANDROID_HOME="$ANDROID_SDK"
export XDG_CONFIG_HOME="/tmp/flutter-config"
export HOME=/tmp/flutter-home
mkdir -p "$HOME" "$XDG_CONFIG_HOME"

cd "$PROJECT_DIR"

echo "=== Step 1: 构建 Release APK ==="
flutter build apk --release

echo "=== Step 2: 上传到 EAS ==="
npx eas-cli upload \
  --platform android \
  --build-path build/app/outputs/flutter-apk/app-release.apk

echo "=== 完成! ==="
```
