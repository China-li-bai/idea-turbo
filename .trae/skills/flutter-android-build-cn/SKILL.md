---
name: flutter-android-build-cn
description: >
  Flutter Android APK 构建技能（中国网络环境专用）。当用户提到"打包安卓"、"构建APK"、"build apk"、"flutter build"、"打包为安卓app"
  或任何与 Flutter Android 构建相关的操作时触发。本技能针对中国大陆网络环境，内置代理检测、NDK 损坏修复、原生库预下载等完整排障流程。
  即使用户只说"帮我打包"或"构建一下"，只要项目是 Flutter 项目且目标为 Android，也应主动使用此技能。
  适用于所有 Flutter 项目，不仅限于 idea-turbo/flutter_demo。
compatibility:
  tools: [RunCommand]
  dependencies: [flutter]
---

# Flutter Android Build (China Network)

在中国大陆网络环境下构建 Flutter Android APK 的完整技能。核心解决三大问题：**NDK 损坏**、**代理配置**、**原生库下载**。

## 构建前检查清单

构建前必须依次检查以下项目，任何一个不通过都会导致构建失败。发现问题后立即修复，不要等到构建失败再处理。

### 1. 检测 Flutter SDK

```bash
<flutter-path> --version
```

如果用户没有指定 Flutter SDK 路径，尝试以下常见位置：
- `/Users/mac/flutter/bin/flutter` (macOS)
- `which flutter` (如果在 PATH 中)
- 项目内 `flutter/bin/flutter`

### 2. 检测代理可用性

这是中国网络环境的关键步骤。Gradle 和 Flutter build hook 都需要访问外网（GitHub、Maven Central、Google Maven）。

```bash
networksetup -getsecurewebproxy Wi-Fi 2>/dev/null
```

提取代理地址和端口（常见如 `127.0.0.1:7890`），然后验证代理是否可用：

```bash
curl -L --connect-timeout 10 --proxy http://<proxy_host>:<proxy_port> -o /dev/null -w "%{http_code}" "https://github.com" 2>&1
```

如果返回 `200` 或 `301/302`，代理可用。如果超时，告知用户需要开启代理。

### 3. 检测 NDK 完整性

Flutter 要求特定版本的 NDK（通过 `flutter.ndkVersion` 指定）。检查该 NDK 目录是否存在且完整：

```bash
# 获取 Flutter 要求的 NDK 版本
grep "ndkVersion" <flutter-sdk>/packages/flutter_tools/lib/src/android/gradle_utils.dart

# 检查 NDK 目录
ls <android-sdk>/ndk/<ndk-version>/source.properties
```

**NDK 损坏的判断标准：**
- 目录存在但 `source.properties` 不存在 → 下载不完整
- 目录存在但内容为空（只有 `.installer` 子目录）→ 下载中断
- 目录不存在 → 需要安装

**NDK 损坏的修复方案（按优先级）：**

#### 方案 A：符号链接修复（推荐）

如果系统中有其他可用的 NDK 版本，创建符号链接：

```bash
# 1. 确保损坏的 NDK 目录存在
mkdir -p <android-sdk>/ndk/<required-ndk-version>

# 2. 创建 source.properties（Gradle 检查此文件确认 NDK 版本）
cat > <android-sdk>/ndk/<required-ndk-version>/source.properties << 'EOF'
Pkg.Desc = Android NDK
Pkg.Revision = <required-ndk-version>
Pkg.BaseRevision = <required-ndk-version>
EOF

# 3. 将可用 NDK 的内容符号链接到损坏目录
cd <android-sdk>/ndk/<required-ndk-version>
for item in $(ls <android-sdk>/ndk/<available-ndk-version>/); do
  [ ! -e "$item" ] && ln -s <android-sdk>/ndk/<available-ndk-version>/"$item" "$item"
done
```

> 为什么这样做？因为 Gradle 和 CMake 在配置阶段会读取 NDK 路径，所有子项目（包括 :jni 等插件）都使用 Flutter 指定的 NDK 版本。修改单个项目的 `ndkVersion` 无法覆盖所有子项目，而 `afterEvaluate` 时机太晚。符号链接让损坏的 NDK 路径指向可用内容，是最彻底的修复。

#### 方案 B：通过 sdkmanager 安装

```bash
<android-sdk>/cmdline-tools/latest/bin/sdkmanager "ndk;<required-ndk-version>"
```

> 注意：cmdline-tools 目录可能为空，此方案不一定可用。

#### 方案 C：修改 app/build.gradle.kts（仅限 app 模块）

```kotlin
android {
    ndkVersion = "<available-ndk-version>"
}
```

> 警告：此方案只能修复 :app 模块，其他插件（如 :jni、:device_info_plus）仍会使用 Flutter 默认 NDK 版本。仅当方案 A 不可行时使用。

### 4. 检测原生库缓存

某些 Flutter 插件（如 `llamadart`）在构建时从 GitHub 下载原生 .so 库。在中国网络环境下，这些下载必然超时。

**识别需要预下载的插件：**

检查 pubspec.yaml 中的依赖，以及 `.pub-cache` 中插件的 `hook/build.dart` 文件，搜索 GitHub release 下载 URL。

**llamadart 预下载流程：**

```bash
# 1. 确定缓存目录
CACHE_DIR="<pub-cache>/hosted/pub.flutter-io.cn/llamadart-<version>/.dart_tool/llamadart/native_bundles/<tag>/android-arm64"
mkdir -p "$CACHE_DIR"

# 2. 通过代理下载
curl -L --proxy http://<proxy_host>:<proxy_port> \
  -o "$CACHE_DIR/llamadart-native-android-arm64-<tag>.tar.gz" \
  "https://github.com/leehack/llamadart-native/releases/download/<tag>/llamadart-native-android-arm64-<tag>.tar.gz"
```

> 如果构建仍然尝试重新下载（因为缓存校验逻辑），可能需要同时设置 `HTTP_PROXY` 和 `HTTPS_PROXY` 环境变量。

### 5. 配置 Gradle 代理

在 `android/gradle.properties` 中添加代理配置，确保 Gradle JVM 能访问 Maven 仓库：

```properties
systemProp.http.proxyHost=127.0.0.1
systemProp.http.proxyPort=7890
systemProp.https.proxyHost=127.0.0.1
systemProp.https.proxyPort=7890
```

> 这些配置是临时的。构建完成后如果代理关闭，需要移除这些行，否则 Gradle 会连接失败。

## 执行构建

所有前置检查通过后，执行构建命令：

```bash
cd <project-dir> && \
  export HTTP_PROXY=http://<proxy_host>:<proxy_port> && \
  export HTTPS_PROXY=http://<proxy_host>:<proxy_port> && \
  <flutter-path> build apk --release
```

> 同时设置 shell 环境变量和 gradle.properties 代理，确保 Dart build hook 和 Gradle 都能通过代理访问外网。

### Debug 构建（可选）

如果用户需要调试版本：

```bash
<flutter-path> build apk --debug --target-platform android-arm64
```

## 构建后验证

```bash
ls -lh <project-dir>/build/app/outputs/flutter-apk/app-release.apk
```

预期输出类似：
```
-rw-r--r--  1 mac  staff   140M  ...  app-release.apk
```

## 输出报告模板

构建完成后，向用户展示以下格式的报告：

```
## ✅ Flutter Android APK 构建完成！

### 📦 构建结果
| 项目 | 详情 |
|------|------|
| **文件** | app-release.apk |
| **大小** | XX MB |
| **路径** | <project-dir>/build/app/outputs/flutter-apk/ |

### 🔧 构建中修复的问题（如有）
| # | 问题 | 修复方案 |
|---|------|---------|
| 1 | ... | ... |

### ⚠️ 临时修改提醒（如有）
- gradle.properties 中的代理配置需要在使用后移除
- NDK 符号链接是临时修复，建议后续通过 sdkmanager 安装完整 NDK
```

## 常见错误速查表

| 错误信息 | 根因 | 修复方案 |
|---------|------|---------|
| `NDK at ... did not have a source.properties file` | NDK 下载不完整 | 创建 source.properties + 符号链接到可用 NDK |
| `Could not GET 'https://dl.google.com/...'` / `Remote host terminated the handshake` | Gradle 无代理 | 在 gradle.properties 添加 systemProp 代理 |
| `SocketException: Operation timed out ... address = github.com` | Dart build hook 无代理 | 设置 HTTP_PROXY/HTTPS_PROXY 环境变量 |
| `Could not resolve com.android.tools.build:aapt2-proto` | Maven 仓库不可达 | 同上，Gradle 代理配置 |
| `CMake Error: ... android.toolchain.cmake` | NDK 工具链缺失 | 符号链接修复 NDK（方案 A） |
| `Woah! You appear to be trying to run flutter as root` | 安全警告 | 可忽略，不影响构建 |
| `plugins do not support Swift Package Manager` | 插件兼容性警告 | 可忽略，不影响 Android 构建 |

## 决策流程图

```
开始构建
  │
  ├─ 检查代理 ──不可用──→ 提示用户开启代理，终止
  │     │可用
  │     ↓
  ├─ 检查 NDK ──损坏──→ 符号链接修复 → 验证修复
  │     │正常                    │失败
  │     ↓                        ↓
  │                          提示用户手动安装 NDK，终止
  │
  ├─ 检查原生库缓存 ──缺失──→ 通过代理预下载
  │     │已缓存
  │     ↓
  ├─ 配置 Gradle 代理（如未配置）
  │
  ├─ 执行 flutter build apk --release
  │     │成功
  │     ↓
  └─ 验证 APK 文件 → 输出报告
```
