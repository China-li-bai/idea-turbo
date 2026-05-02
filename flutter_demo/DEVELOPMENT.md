# Flutter LLM Demo 开发经验总结

> 本文档记录 Flutter 端侧大模型应用开发过程中的关键经验和踩坑记录

## 目录

1. [环境配置](#1-环境配置)
2. [APK 打包](#2-apk-打包)
3. [EAS 上传分发](#3-eas-上传分发)
4. [模型下载（国内镜像）](#4-模型下载国内镜像)
5. [手机性能检测与模型推荐](#5-手机性能检测与模型推荐)
6. [常见问题与解决方案](#6-常见问题与解决方案)

---

## 1. 环境配置

### 1.1 必要环境变量

```bash
export HOME=/root/idea-turbo
export ANDROID_HOME=/root/idea-turbo/.android-sdk
export ANDROID_USER_HOME=/root/idea-turbo/.android
export PATH="$PATH:/root/idea-turbo/flutter/bin:$ANDROID_HOME/platform-tools"
export XDG_CONFIG_HOME=/root/idea-turbo/.config
```

**关键点**: 在受限环境（如沙箱容器）中，必须显式设置 `HOME` 和 `ANDROID_USER_HOME`，否则 Gradle 会尝试写入 `/root/.android` 导致只读文件系统错误。

### 1.2 Android SDK 路径

```bash
ANDROID_HOME=/root/idea-turbo/.android-sdk
```

确保 `.android` 目录存在并创建符号链接：
```bash
mkdir -p /root/idea-turbo/.android
ln -sf /root/idea-turbo/.android /root/.android 2>/dev/null || true
```

---

## 2. APK 打包

### 2.1 Debug 包（开发测试）

```bash
cd /root/idea-turbo/flutter_demo
flutter build apk --debug --target-platform android-arm64
```

输出路径：`build/app/outputs/flutter-apk/app-debug.apk`

### 2.2 Release 包（正式发布）

```bash
flutter build apk --release --target-platform android-arm64
```

输出路径：`build/app/outputs/flutter-apk/app-release.apk`

### 2.3 打包注意事项

| 问题 | 解决方案 |
|------|----------|
| `No Android SDK found` | 设置 `ANDROID_HOME` 环境变量 |
| `Read-only file system: /root/.android` | 设置 `ANDROID_USER_HOME=/root/idea-turbo/.android` |
| Gradle 版本冲突 | 使用项目自带的 Gradle Wrapper (`./gradlew`) |

---

## 3. EAS 上传分发

### 3.1 初始化 EAS 项目（首次）

```bash
cd /root/idea-turbo/flutter_demo
npx eas-cli project:init --force
```

这会创建 EAS 项目 ID 并写入 `app.json` 的 `extra.eas.projectId` 字段。

### 3.2 app.json 配置

```json
{
  "expo": {
    "name": "Flutter LLM",
    "slug": "flutter-llm",
    "version": "1.0.0",
    "owner": "weigh",
    "android": {
      "package": "com.example.flutter_demo"
    }
  }
}
```

### 3.3 上传本地构建的 APK

#### Release 版本上传（正式分发）

```bash
# 构建 Release APK
flutter build apk --release --target-platform android-arm64

# 上传到 EAS
npx eas-cli upload \
  --platform android \
  --build-path build/app/outputs/flutter-apk/app-release.apk
```

#### Debug 版本上传（临时测试）

```bash
# 构建 Debug APK
flutter build apk --debug

# 上传到 EAS
npx eas-cli upload \
  --platform android \
  --build-path build/app/outputs/flutter-apk/app-debug.apk
```

#### 成功上传记录（2026-04-27）

| 项目 | 信息 |
|------|------|
| **版本** | 1.0.0 |
| **大小** | 102.6 MB |
| **类型** | Release |
| **下载链接** | https://expo.dev/accounts/weigh/projects/idea-turbo/builds/59b59414-155e-4ce9-93fb-715467746198 |
| **功能更新** | - 手机性能检测与模型推荐<br>- 9个模型可选<br>- ModelScope 镜像支持 |

成功后返回分享链接格式：
```
https://expo.dev/accounts/weigh/projects/idea-turbo/builds/{build-id}
```

### 3.4 EAS 配置文件 (eas.json)

```json
{
  "cli": {
    "version": ">= 18.7.0"
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "path/to/service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

### 3.5 分发方式对比

| 方式 | 适用场景 | 特点 |
|------|----------|------|
| **EAS Upload** | 快速分享测试链接 | 有效期有限，适合临时测试 |
| **Firebase App Distribution** | 正式内测 | 免费，支持版本管理，推荐长期使用 |
| **EAS Submit → Google Play** | 正式发布 | 需要开发者账号 ($25) |

---

## 4. 模型下载（国内镜像）

### 4.1 问题背景

HuggingFace (`huggingface.co`) 在中国大陆被墙，直接使用会导致连接超时：

```
DioException [connection error]: Connection failed
SocketException: Connection failed (OS Error: Network is unreachable, errno = 101), 
address = huggingface.co, port = 443
```

### 4.2 推荐方案：ModelScope 魔搭社区

**官网**: https://modelscope.cn/

**优势**:
- 阿里巴巴达摩院维护，国内访问速度快 (~52MB/s)
- 模型同步及时，与 HuggingFace 一致
- 免费无需登录即可下载

### 4.3 URL 格式转换规则

| 来源 | URL 格式 |
|------|----------|
| HuggingFace | `https://huggingface.co/{owner}/{repo}/resolve/main/{filename}` |
| ModelScope | `https://www.modelscope.cn/models/{owner}/{repo}/resolve/master/{filename}` |

**注意**: HuggingFace 用 `main` 分支，ModelScope 用 `master` 分支

### 4.4 已验证可用的模型链接

#### Qwen3.5-4B (推荐 - 中文最佳)

```dart
// ModelScope 镜像
url: 'https://www.modelscope.cn/models/unsloth/Qwen3.5-4B-GGUF/resolve/master/Qwen3.5-4B-Q4_K_M.gguf',
filename: 'qwen3.5-4b-q4_k_m.gguf',
size: '2.74 GB',
features: ['中文原生', '多语言', '代码生成', 'Apache 2.0'],
```

#### Qwen3-4B

```dart
url: 'https://www.modelscope.cn/models/bartowski/Qwen_Qwen3-4B-GGUF/resolve/master/Qwen_Qwen3-4B-Q4_K_M.gguf',
filename: 'qwen3-4b-q4_k_m.gguf',
size: '2.22 GB',
features: ['中文优秀', '轻量级', '稳定'],
```

#### Llama 3.2 3B

```dart
url: 'https://www.modelscope.cn/models/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/master/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
filename: 'llama-3.2-3b-q4_k_m.gguf',
size: '1.87 GB',
features: ['工具调用', '结构化输出', '英文优化'],
```

### 4.5 验证命令

```bash
# 测试 ModelScope 连接和速度
curl -v --connect-timeout 15 -L \
  "https://www.modelscope.cn/models/unsloth/Qwen3.5-4B-GGUF/resolve/master/Qwen3.5-4B-Q4_K_M.gguf" \
  -o /dev/null
```

预期结果：显示下载速度 ~50MB/s

### 4.6 其他镜像站（备选）

| 镜像站 | 地址 | 状态 |
|--------|------|------|
| HF-Mirror | hf-mirror.com | ⚠️ 不稳定，SSL 错误 |
| ModelScope | modelscope.cn | ✅ 推荐 |

### 4.7 扩展模型列表（2026年更新）

除了 Qwen，还有以下优秀模型可用，都已配置 ModelScope 链接：

| 模型 | 参数量 | 文件大小 | 特点 | 来源 |
|------|--------|----------|------|------|
| **MiniCPM3-1.2B** | 1.2B | 760MB | 多模态强，MIT 开源 | 面壁智能 |
| **GLM-4-2B** | 2B | 1.2GB | 清华大学背景，稳定 | 智谱 AI |
| **Gemma 3-2B** | 2B | 1.5GB | Google，英语教学好 | Google |
| **Yi-1.5-3B** | 3B | 1.8GB | 逻辑推理，深圳企业 | 零一万物 |
| **Llama 3.3-3B** | 3B | 1.9GB | Meta，工具调用强 | Meta |
| **DeepSeek-V3-4B** | 4B | 2.2GB | 编程能力强 | 深度求索 |
| **Qwen3.5-0.8B** | 0.8B | **533MB** | 极致轻量，极速！手机首选 | 阿里巴巴 |
| **Qwen3.5-1.7B** | 1.7B | 1.06GB | 速度/质量平衡 | 阿里巴巴 |

---

## 5. 手机性能检测与模型推荐

### 5.1 功能概述

应用会自动检测手机性能，根据 CPU 和内存情况，推荐最合适的模型，避免手机卡顿。

### 5.2 实现方案

使用 `device_info_plus` 包获取设备信息：

```dart
// pubspec.yaml
dependencies:
  device_info_plus: ^11.3.2
```

### 5.3 性能分级标准

| 性能级别 | 手机类型 | 推荐模型 |
|---------|---------|---------|
| **High (高性能)** | 旗舰机型 | 全模型可用 |
| **Medium (良好)** | 中端机型 | 0.8B - 3B |
| **Low (入门)** | 老机型 | 0.8B - 1.7B 推荐 |

### 5.4 检测逻辑

```dart
// Android: 根据 SDK 版本判断
if (androidInfo.version.sdkInt >= 33) {
  // Android 13+ → High 性能
} else if (androidInfo.version.sdkInt >= 30) {
  // Android 11-12 → Medium
} else {
  // Android 10 以下 → Low
}

// iOS: 根据机型号判断
if (cpuModel.contains('iPhone15') || cpuModel.contains('iPhone16') || cpuModel.contains('iPhone17')) {
  // iPhone 15/16/17 → High
}
```

### 5.5 用户界面特性

- 顶部卡片显示设备性能评估（绿/橙/红三色）
- 推荐模型有高亮「推荐」标签
- 可切换「只看推荐」或「显示全部」

---

---

## 6. 常见问题与解决方案

### 6.1 构建问题

#### Gradle 构建失败：Read-only file system

**错误信息**:
```
Caused by: java.nio.file.FileSystemException: /root/.android: Read-only file system
```

**解决方案**:
```bash
export ANDROID_USER_HOME=/root/idea-turbo/.android
mkdir -p /root/idea-turbo/.android
ln -sf /root/idea-turbo/.android /root/.android
```

#### core library desugaring 错误

**错误信息**:
```
Dependency ':ota_update' requires core library desugaring
```

**解决方案** (在 `android/app/build.gradle.kts` 中):
```kotlin
android {
    compileOptions {
        isCoreLibraryDesugaringEnabled = true
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}
```

### 5.2 模型加载问题

#### API 参数名称变化

`llamadart` 包的 API 与文档可能不同，实际使用的参数：

```dart
// 正确用法
final params = GenerationParams(
  nPredict: 512,
  temp: 0.7,       // 不是 temperature
  topP: 0.9,
  topK: 40,
);

// 创建引擎
final engine = await LlamaEngine.create(
  modelPath: modelPath,
  params: params,   // 不是 generationParams
);
```

#### 获取生成文本

```dart
// chunk.text 不存在，正确用法
final text = chunk.choices.firstOrNull?.delta.content ?? '';
```

### 5.3 EAS 问题

#### EAS project not configured

**解决方案**:
```bash
npx eas-cli project:init --force
```

#### eas: not found

**解决方案**: 使用 `npx eas-cli` 代替全局安装的 `eas`

---

## 附录 A: 完整打包+上传流程（已验证 ✅）

> **最后验证日期**: 2026-04-28
> **APK 大小**: ~144 MB (Release) | **上传耗时**: ~13s
> **Expo 账户**: weigh | **项目**: idea-turbo

### 环境要求

| 组件 | 路径 |
|------|------|
| Flutter SDK | `/root/idea-turbo/flutter/bin/flutter` |
| Android SDK | `/root/idea-turbo/.android-sdk` |
| Node.js | v22+ (系统自带) |
| EAS CLI | `npx eas-cli` (无需全局安装) |

### ⚠️ 关键：沙箱环境变量设置

由于沙箱文件系统限制，**必须**在构建前设置以下变量：

```bash
# 必须设置！将 Flutter 配置重定向到可写目录
export PATH="/root/idea-turbo/flutter/bin:$PATH"
export ANDROID_HOME="/root/idea-turbo/.android-sdk"
export XDG_CONFIG_HOME="/tmp/flutter-config"
export HOME=/tmp/flutter-home
mkdir -p $HOME $XDG_CONFIG_HOME
```

> 不设置会导致：`Read-only file system, errno = 30` 错误

### 方案 A: Release 版本（推荐，正式分发）

```bash
#!/bin/bash
set -e

export PATH="/root/idea-turbo/flutter/bin:$PATH"
export ANDROID_HOME="/root/idea-turbo/.android-sdk"
export XDG_CONFIG_HOME="/tmp/flutter-config"
export HOME=/tmp/flutter-home
mkdir -p $HOME $XDG_CONFIG_HOME

cd /root/idea-turbo/flutter_demo

echo "=== Step 1: 构建 Release APK ==="
flutter build apk --release
# 输出: build/app/outputs/flutter-apk/app-release.apk (~144MB)

echo "=== Step 2: 上传到 EAS ==="
npx eas-cli upload \
  --platform android \
  --build-path build/app/outputs/flutter-apk/app-release.apk
# 输出: https://expo.dev/accounts/weigh/projects/idea-turbo/builds/...

echo "=== 完成! ==="
```

### 方案 B: Debug 版本（临时测试）

```bash
#!/bin/bash
set -e

export PATH="/root/idea-turbo/flutter/bin:$PATH"
export ANDROID_HOME="/root/idea-turbo/.android-sdk"
export XDG_CONFIG_HOME="/tmp/flutter-config"
export HOME=/tmp/flutter-home
mkdir -p $HOME $XDG_CONFIG_HOME

cd /root/idea-turbo/flutter_demo

echo "=== Step 1: 构建 Debug APK ==="
flutter build apk --debug --target-platform android-arm64

echo "=== Step 2: 上传到 EAS ==="
npx eas-cli upload \
  --platform android \
  --build-path build/app/outputs/flutter-apk/app-debug.apk

echo "=== 完成! ==="
```

### 方案 C：仅上传（APK 已构建）

当 APK 已存在，只需上传时使用：

```bash
cd /root/idea-turbo/flutter_demo && \
npx eas-cli upload \
  --platform android \
  --build-path build/app/outputs/flutter-apk/app-release.apk
```

### 常见问题排查

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Read-only file system, errno = 30` | 未设置 XDG_CONFIG_HOME/HOME | 设置环境变量重定向到 `/tmp` |
| `command not found: flutter` | PATH 未包含 Flutter SDK | 添加 `/root/idea-turbo/flutter/bin` 到 PATH |
| Gradle 编译失败 | Android SDK 路径错误 | 确认 `ANDROID_HOME=/root/idea-turbo/.android-sdk` |
| `Woah! You appear to be trying to run flutter as root` | 安全警告 | **可忽略**，不影响构建结果 |
| `eas: not found` | EAS CLI 未全局安装 | 使用 `npx eas-cli` 代替 |

## 附录 B: 项目依赖清单

| 包名 | 用途 | 版本要求 |
|------|------|----------|
| llamadart | 本地 LLM 推理 | Dart SDK >= 3.11 |
| dio | HTTP 请求 (模型下载) | >= 5.0 |
| path_provider | 文件路径 | any |
| package_info_plus | 应用版本信息 | any |
| ota_update | OTA 更新安装 | 需要 desugaring |
| device_info_plus | 获取设备信息 (性能检测) | >= 11.0 |

## 附录 C: 关键文件位置

| 文件 | 说明 |
|------|------|
| `lib/main.dart` | 主程序，包含模型下载、聊天界面、OTA 更新 |
| `app.json` | Expo/EAS 项目配置 |
| `eas.json` | EAS Submit 配置 |
| `pubspec.yaml` | Flutter 依赖配置 |
| `android/app/build.gradle.kts` | Android 构建配置 |
| `lib/pet/pet_store.dart` | 宠物状态管理 (Zero-UI 核心) |
| `lib/pet/pet_app_shell.dart` | 宠物应用外壳 |
| `lib/pet/layers/*.dart` | 五层渲染架构实现 |

---

## 7. Zero-UI 宠物系统 (2026-04-29 新增)

### 7.1 设计理念

**核心问题**: 传统聊天应用的对话框模式太死板，如何让 AI 交互更像"人与宠物"的自然互动？

**解决方案**: Zero-UI 范式 — 取消所有传统 UI 控件（输入框、发送按钮、消息列表），用空间化的视觉元素替代：

| 传统 UI | Zero-UI 替代方案 |
|----------|------------------|
| 消息列表 | 浮动字幕（像电影字幕一样消散） |
| 输入框 | 底部极简 HUD（按需展开） |
| 发送按钮 | 手势触发（长按=抚摸） |
| 加载动画 | 宠物表情变化（思考/聆听） |
| 错误提示 | 宠物眩晕状态 |

### 7.2 状态管理设计

```dart
// PetStore - 单一状态源
class PetStore extends ChangeNotifier {
  PetMood _mood;           // 当前情绪状态
  Offset _lookAt;          // 视线追踪目标
  List<Subtitle> _subtitles; // 浮动字幕队列
  List<Particle> _particles; // 粒子特效队列
  
  // 自动清理机制（Timer 定时过期）
  // 字幕 6 秒后自动移除
  // 粒子 3 秒后自动移除
}
```

### 7.3 动画系统

EntityLayer 使用 4 个独立 AnimationController：

| 控制器 | 周期 | 效果 |
|--------|------|------|
| `_breathController` | 2500ms (往返) | 身体呼吸起伏 (±2%) |
| `_blinkController` | 150ms (单次) | 眨眼（随机间隔 2-5 秒） |
| `_earController` | 400ms (单次) | 耳朵抖动（随机） |
| `_tailController` | 600ms (往返) | 尾巴摇摆（开心时加速） |

### 7.4 llamadart API 正确用法

⚠️ **重要**: llamadart 的 API 与网上文档可能有出入，以下为验证可用的写法：

```dart
// 1. 创建引擎
_engine = LlamaEngine(LlamaBackend());

// 2. 加载模型
await _engine!.loadModel(
  modelPath,
  modelParams: const ModelParams(
    contextSize: 4096,
    gpuLayers: 0,
  ),
);

// 3. 流式生成
final stream = _engine!.create(
  messages,  // List<LlamaChatMessage>
  params: const GenerationParams(
    maxTokens: 256,
    temp: 0.7,
  ),
);

// 4. 读取文本
await for (final chunk in stream) {
  final text = chunk.choices.firstOrNull?.delta.content ?? '';
}
```

### 7.5 构建检查清单

打包前确保通过以下检查：

```bash
# 1. 静态分析（零 error/warning）
flutter analyze lib/pet/

# 2. 常见修复项
# - import 'package:flutter/material.dart'; (Offset, ChangeNotifier)
# - DateTime? 需要 ! 断言（在 null check 后）
# - mounted 检查（async gap 中使用 context 前）
# - 未使用变量/方法删除
```

### 7.6 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| **1.1.0** | 2026-04-29 | ✅ Zero-UI 宠物系统（五层架构、手势交互、浮动字幕） |
| **1.0.0** | 2026-04-27 | 初始版本（聊天界面 + 模型下载 + OTA 更新） |

---

*最后更新: 2026-04-29*
