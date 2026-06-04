---
name: flutter-android-build-cn
description: >
  Flutter Android APK 构建技能（中国网络环境专用）。当用户提到"打包安卓"、"构建APK"、"build apk"、"flutter build"、"打包为安卓app"
  或任何与 Flutter Android 构建相关的操作时触发。本技能针对中国大陆网络环境，内置代理检测、NDK 损坏修复、原生库预下载、构建环境场景识别
  等完整排障流程。即使用户只说"帮我打包"或"构建一下"，只要项目是 Flutter 项目且目标为 Android，也应主动使用此技能。
  适用于所有 Flutter 项目，不仅限于 idea-turbo/flutter_demo。
compatibility:
  tools: [RunCommand]
  dependencies: [flutter]
---

# Flutter Android Build (China Network)

在中国大陆网络环境下构建 Flutter Android APK 的完整技能。核心解决四大问题：**NDK 损坏**、**代理配置**、**原生库下载**、**构建环境差异**。

## 构建前：识别电脑环境场景

> **关键经验（2026-06 更新）**：不同电脑的 NDK 状态差异巨大，构建脚本必须先识别场景再决定动作。
> 不要假设"NDK 已损坏"是默认状态，也不要假设"NDK 完好"是默认状态。

执行以下命令一次性收集环境指纹（所有命令在终端中并行执行）：

```bash
# 1) Flutter SDK
<flutter-path> --version

# 2) Android SDK 路径（从 local.properties 读）
cat <project-dir>/android/local.properties

# 3) NDK 目录总览（注意是真实目录还是符号链接镜像）
ls -la <android-sdk>/ndk/ 2>&1

# 4) 对每个 NDK 版本，列详细结构（含 symlink 类型）
ls -la <android-sdk>/ndk/<ndk-version>/ 2>&1

# 5) 代理配置
networksetup -getsecurewebproxy Wi-Fi 2>/dev/null
networksetup -getwebproxy Wi-Fi 2>/dev/null
networksetup -getsocksfirewallproxy Wi-Fi 2>/dev/null
```

### 四种环境场景

| 场景 | 标识特征 | 典型来源 | 处理策略 |
|------|---------|---------|---------|
| **A. 全新机器** | `<android-sdk>/ndk/` 目录不存在或为空 | 新 Mac 配环境 | 走 SDK Manager 安装 NDK（见 §3 方案 B） |
| **B. NDK 28.x 损坏（空壳）** | 28.x 目录存在但 `prebuilt/`、`toolchains/llvm/prebuilt/` 等子目录**为空**；`du -sh` 显示 < 1MB；`.installer` 残骸目录存在 | 旧版 Android Studio 下载中断 | 走符号链接到 27.x（见 §3 方案 A） |
| **C. NDK 28.x 已被符号链接修复**（**最常见**）| `ls -la` 可见 NDK 28.x 目录下大部分 entry 是 `lrwxr-xr-x` 指向 27.x；`source.properties` 内容是 28.x | 之前已用本技能修复过 | **直接构建，无需任何修复动作**（这是上次构建时的真实场景） |
| **D. NDK 28.x 完整安装** | 28.x 目录真实存在，`du -sh` > 1GB，`toolchains/llvm/prebuilt/<host>/<arch>/bin/clang` 可执行 | Android Studio SDK Manager 正常下载完成 | **直接构建，无需任何修复动作** |

> ⚠️ **本次构建的电脑属于场景 C**：NDK 28.2 目录里的 `CHANGELOG.md`、`NOTICE`、`prebuilt/`、`meta/`、`toolchains/` 等都是符号链接到 27.3。第一次见 `du -sh` 显示 8KB 时容易误判为"损坏"，但 `ls -la` 看到的 `lrwxr-xr-x` 是关键判据。

### 场景判断决策树

```
<android-sdk>/ndk/<required-version>/
  │
  ├─ 目录不存在 ──────────────→ 场景 A
  │
  ├─ 目录存在
  │     │
  │     ├─ ls -la 显示大量 `lrwxr-xr-x` ──→ 场景 C（符号链接镜像）✅ 可用
  │     │
  │     ├─ 全部是 `-rw-r--r--` / `drwxr-xr-x` 但 prebuilt/ 内为空 ──→ 场景 B（损坏）
  │     │
  │     └─ prebuilt/<host>/<arch>/bin/clang 可执行 ──→ 场景 D（完整）✅ 可用
  │
  └─ 只有 .installer/ 目录 ──→ 场景 B
```

---

## 构建前检查清单

按场景判断完成后，再依次执行以下步骤。**每一步必须先判断再行动**——尤其是 NDK 修复，已修复过的机器不要再做一次。

### 1. 检测 Flutter SDK

```bash
<flutter-path> --version
```

如果用户没有指定 Flutter SDK 路径，尝试以下常见位置：
- `/Users/mac/flutter/bin/flutter` (macOS)
- `which flutter` (如果在 PATH 中)
- 项目内 `flutter/bin/flutter`

记录 `Flutter` 和 `Dart` 版本号。

### 2. 检测代理可用性

这是中国网络环境的关键步骤。**必须用 ≥2 个 URL 验证**，避免单点 SSL 误判。

```bash
# 1) 提取代理
networksetup -getsecurewebproxy Wi-Fi 2>/dev/null
# 常见输出: Enabled: Yes / Server: 127.0.0.1 / Port: 7890

# 2) 多 URL 验证（必须 ≥1 个返回 2xx/3xx 才算通过）
curl -L --connect-timeout 10 --proxy http://<proxy_host>:<proxy_port> -o /dev/null -w "GitHub: %{http_code}\n" "https://github.com"
curl -L --connect-timeout 10 --proxy http://<proxy_host>:<proxy_port> -o /dev/null -w "Maven:  %{http_code}\n" "https://repo1.maven.org/maven2/"
```

> ⚠️ **经验教训**：`dl.google.com` 通过代理测试时**经常**返回 `SSL_ERROR_SYSCALL` (HTTP 000)，但 Gradle 在实际构建中却能正常下载 Maven 依赖。所以**不要把 `dl.google.com` 当作代理可达性的判据**——优先用 `repo1.maven.org` 和 `github.com`。
>
> 判定标准：**`GitHub` 和 `Maven` 中至少一个返回 2xx/3xx 即可继续**。如果两者都失败，提示用户检查代理。

### 3. 检测 NDK 完整性（按场景分支处理）

Flutter 要求的 NDK 版本从 `gradle_utils.dart` 读取：

```bash
grep "ndkVersion" <flutter-sdk>/packages/flutter_tools/lib/src/android/gradle_utils.dart | head -1
# 常见输出: const ndkVersion = '28.2.13676358';
```

NDK 目录验证（**用 `ls -la` 而不是 `du -sh`**——后者对 symlink 目录会误报）：

```bash
ls -la <android-sdk>/ndk/<required-ndk-version>/
# 关键检查项（按顺序）:
#   1. source.properties 存在
#   2. prebuilt/ 目录存在（场景 C 下是 symlink 也算通过）
#   3. toolchains/ 目录存在
#   4. 若 entry 全部是 `lrwxr-xr-x` → 场景 C，确认目标 NDK 目录也存在即可
```

#### 场景 A：目录不存在

需要全新安装。优先走 SDK Manager：

```bash
# 检查 cmdline-tools 是否可用
ls <android-sdk>/cmdline-tools/latest/bin/sdkmanager 2>&1

# 安装
<android-sdk>/cmdline-tools/latest/bin/sdkmanager "ndk;<required-ndk-version>"
```

> cmdline-tools 目录为空时此方案不可用，需要用户手动从 Android Studio 安装。

#### 场景 B：NDK 28.x 损坏（空壳目录）—— 符号链接修复

仅在**确认 NDK 27.x 等老版本完整安装**时使用此方案（参考 `ls <android-sdk>/ndk/27.x.x.xxxxxx/` 时 prebuilt/ 真实存在）。

**完整步骤（不要跳步）**：

```bash
# 1) 备份破损目录的 .installer 残骸（可选）
ls -la <android-sdk>/ndk/<required-ndk-version>/

# 2) 清空破损目录（保留 source.properties，稍后重写）
cd <android-sdk>/ndk/<required-ndk-version>
find . -mindepth 1 -not -name source.properties -delete 2>/dev/null || rm -rf ./*

# 3) 重建 source.properties（让 Gradle 识别为 28.x）
cat > <android-sdk>/ndk/<required-ndk-version>/source.properties << EOF
Pkg.Desc = Android NDK
Pkg.Revision = <required-ndk-version>
Pkg.BaseRevision = <required-ndk-version>
EOF

# 4) 把 27.x 的所有内容符号链接到 28.x 目录
cd <android-sdk>/ndk/<required-ndk-version>
for item in $(ls <android-sdk>/ndk/<available-ndk-version>/); do
  ln -sf <android-sdk>/ndk/<available-ndk-version>/"$item" "$item"
done

# 5) 验证
ls -la <android-sdk>/ndk/<required-ndk-version>/  # 应全是 lrwxr-xr-x
ls <android-sdk>/ndk/<required-ndk-version>/prebuilt/  # 应能列出 darwin-x86_64
```

> **为什么用符号链接而不是改 build.gradle.kts**？因为 Gradle/CMake 在配置阶段读取 NDK 路径，所有子项目（`:app`、`:jni`、`:device_info_plus`、`:objectbox_flutter_libs` 等）都使用 Flutter 指定的 NDK 版本。修改单个模块的 `ndkVersion` 无法覆盖所有子项目，而 `afterEvaluate` 时机太晚。符号链接让损坏的 NDK 路径指向可用内容，是最彻底的修复。

#### 场景 C：已被符号链接修复（最常见）

**什么都不用做**，直接进入下一步。本次构建就是这种场景。

> 验证命令（可跳过）：
> ```bash
> ls -la <android-sdk>/ndk/<required-ndk-version>/  # 看到 lrwxr-xr-x 就是修复过的
> readlink <android-sdk>/ndk/<required-ndk-version>/prebuilt  # 指向 27.x 路径
> ```

#### 场景 D：完整安装

**什么都不用做**。

### 4. 检测原生库缓存

某些 Flutter 插件（典型 `llamadart`、某些带 native 资源的插件）在构建时从 GitHub 下载原生 `.so` 库。在中国网络环境下，这些下载必然超时。

**关键经验**：大多数情况下**缓存已存在**，根本不需要预下载。检查顺序必须是：

```bash
# 1) 先确定 pubspec 实际解析到的版本（不要照抄 pubspec 里的版本号）
#    ^0.6.10 会解析到 0.6.16 等更新的版本
cat <project-dir>/pubspec.lock | grep -A 2 "name: llamadart"

# 2) 列出已缓存的原生 bundle 标签
ls ~/.pub-cache/hosted/pub.flutter-io.cn/llamadart-<resolved-version>/.dart_tool/llamadart/native_bundles/

# 3) 检查目标 ABI 目录是否已经 extracted
ls ~/.pub-cache/hosted/pub.flutter-io.cn/llamadart-<resolved-version>/.dart_tool/llamadart/native_bundles/<tag>/android-arm64/extracted/
# 已存在 libllamadart.so、libllama.so、libggml*.so 等才算"已缓存"
```

**只有当 extracted 目录缺失时才预下载**：

```bash
CACHE_DIR=~/.pub-cache/hosted/pub.flutter-io.cn/llamadart-<resolved-version>/.dart_tool/llamadart/native_bundles/<tag>/android-arm64
mkdir -p "$CACHE_DIR"
curl -L --proxy http://<proxy_host>:<proxy_port> \
  -o "$CACHE_DIR/llamadart-native-android-arm64-<tag>.tar.gz" \
  "https://github.com/leehack/llamadart-native/releases/download/<tag>/llamadart-native-android-arm64-<tag>.tar.gz"
```

> **常见坑**：
> - pubspec 写 `^0.6.10` 不代表缓存里就是 0.6.10，必须用 `pubspec.lock` 的实际版本。
> - 缓存目录要在 `flutter pub get` **之后**才会被创建。先 pub get 再判断缓存。
> - 提取过的 `extracted/` 目录如果存在就直接复用，不需要重新下载 tarball。

### 5. 配置 Gradle 代理（检查-补全式）

**不要无脑追加**——先检查 `android/gradle.properties` 是否已配置：

```bash
grep -E "proxyHost|proxyPort" <project-dir>/android/gradle.properties
```

- 如果已配置且代理地址匹配当前网络 → **跳过**。
- 如果未配置或代理地址不匹配 → 追加以下内容：

```properties
systemProp.http.proxyHost=127.0.0.1
systemProp.http.proxyPort=7890
systemProp.https.proxyHost=127.0.0.1
systemProp.https.proxyPort=7890
```

> **这些配置是临时的**。构建完成后如果代理关闭，需要移除这些行，否则 Gradle 会连接失败。
> **建议**：在用户/项目根目录维护 `gradle.properties.local`，在 `.gitignore` 中忽略，构建前通过脚本合并。

---

## 执行构建

所有前置检查通过后，执行构建命令。**Dart build hook 和 Gradle 都需要代理**：

```bash
cd <project-dir> && \
  export HTTP_PROXY=http://<proxy_host>:<proxy_port> && \
  export HTTPS_PROXY=http://<proxy_host>:<proxy_port> && \
  <flutter-path> build apk --release
```

> **为什么 shell 环境变量和 `gradle.properties` 都要配？**
> - `HTTP_PROXY` / `HTTPS_PROXY` → 影响 Dart 端 `pub get`、build hook（如 llamadart 的 `hook/build.dart`）。
> - `gradle.properties` 里的 `systemProp.*.proxy*` → 影响 Gradle JVM 访问 Maven 仓库。
> 两者覆盖不同进程，必须同时配。

### Debug 构建（可选）

```bash
<flutter-path> build apk --debug --target-platform android-arm64
```

### 性能基线参考

| 构建类型 | 典型耗时（Mac M-series, 8 核） |
|---------|-------------------------------|
| 首次冷构建（含 Gradle 下载、AAPT2 编译） | 60–120s |
| 增量构建（代码改动，无 native 依赖变化） | 20–40s |
| 增量构建（dart 代码未变） | < 15s |
| 完整 release（含 tree-shaking、R8） | 90–180s |

> 本次构建记录：**89.6 秒**（Gradle assembleRelease，调用了 R8 和 tree-shaking）。作为后续构建对比的基线。

---

## 构建后验证

```bash
ls -lh <project-dir>/build/app/outputs/flutter-apk/app-release.apk
file <project-dir>/build/app/outputs/flutter-apk/app-release.apk
```

预期输出：
- 文件大小 60–180 MB（含 llamadart 等 native 库时偏大）
- `file` 识别为 `Zip archive data`
- 路径下还有 `app-release.apk.sha1`（40 字节校验文件）

---

## 输出报告模板

构建完成后，按以下格式输出：

```
## ✅ Flutter Android APK 构建完成！

### 🖥️ 构建环境场景
**本次属于场景 X**：<简述判据>

### 📦 构建结果
| 项目 | 详情 |
|------|------|
| **文件** | app-release.apk |
| **大小** | XX MB |
| **路径** | <project-dir>/build/app/outputs/flutter-apk/ |
| **耗时** | X 秒（基线对比：<Δ>+/-s） |

### 🔧 构建前修复（如有）
| # | 问题 | 修复方案 | 是否临时 |
|---|------|---------|---------|
| 1 | ... | ... | ✅/❌ |

### ⚠️ 已知警告（不影响本次构建）
- Swift Package Manager 警告（`objectbox_flutter_libs` 等）— 仅影响 macOS
- Kotlin Gradle Plugin 警告（`device_info_plus`、`package_info_plus` 等）— 未来 Flutter 版本会要求迁移到 Built-in Kotlin
- SDK XML version 4 警告— Android Studio 与 cmdline-tools 版本不匹配，忽略

### 📋 临时修改清单
- [ ] `android/gradle.properties` 中的 `systemProp.*.proxy*` 配置（如已添加）
- [ ] NDK 28.x 符号链接（场景 B 修复后必须保留，否则下次构建仍需修复）
```

---

## 常见错误速查表

| 错误信息 | 根因 | 修复方案 |
|---------|------|---------|
| `NDK at ... did not have a source.properties file` | NDK 下载不完整 | 创建 `source.properties` + 符号链接到 27.x（场景 B 方案） |
| `Could not GET 'https://dl.google.com/...'` / `Remote host terminated the handshake` | Gradle 无代理 | `gradle.properties` 添加 `systemProp.*.proxy*` |
| `SocketException: Operation timed out ... address = github.com` | Dart build hook 无代理 | shell 环境变量 `HTTP_PROXY` / `HTTPS_PROXY` |
| `Could not resolve com.android.tools.build:aapt2-proto` | Maven 仓库不可达 | 同 Gradle 代理配置 |
| `CMake Error: ... android.toolchain.cmake` | NDK 工具链缺失 | 场景 B 符号链接修复 |
| `Woah! You appear to be trying to run flutter as root` | 安全警告 | 忽略，不影响构建 |
| `plugins do not support Swift Package Manager` | 插件兼容性警告 | 忽略，不影响 Android 构建 |
| `Warning: SDK processing. This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered` | Android Studio 与 cmdline-tools 版本不匹配 | 忽略 |
| `Font asset "MaterialIcons-Regular.otf" was tree-shaken` | 正常信息，非错误 | 忽略 |
| `WARNING: Your Android app project ... applies the Kotlin Gradle Plugin` | 插件未迁移到 Built-in Kotlin | 关注但不阻塞当前构建 |

---

## 决策流程图（场景化）

```
开始构建
  │
  ├─ 检测环境场景（A/B/C/D）
  │     │
  │     ├─ A（NDK 不存在） ──→ sdkmanager 安装 ──→ 失败则终止
  │     ├─ B（NDK 损坏） ──→ 符号链接到 27.x ──→ 验证可用
  │     ├─ C（已 symlink） ──→ 跳过 ✅
  │     └─ D（完整） ──→ 跳过 ✅
  │
  ├─ 检测代理（多 URL 验证）
  │     ├─ 至少 1 个 2xx/3xx → 继续
  │     └─ 全失败 → 提示用户开启代理，终止
  │
  ├─ flutter pub get（创建原生库缓存目录）
  │
  ├─ 检查原生库缓存
  │     ├─ 已 extracted → 跳过
  │     └─ 缺失 → 通过代理预下载
  │
  ├─ 检查/补全 gradle.properties 代理
  │
  ├─ export HTTP_PROXY/HTTPS_PROXY + flutter build apk --release
  │     │
  │     ├─ 成功 ──→ 验证 APK
  │     │
  │     └─ 失败 ──→ 查错误速查表，按错误码分支处理
  │
  └─ 输出报告（含场景、修复、警告、临时修改清单）
```

---

## 附录：场景识别的快速命令汇总

把以下命令打包到一个 shell 函数，构建前一次运行：

```bash
env_check() {
  local flutter_path="${1:-/Users/mac/flutter/bin/flutter}"
  local android_sdk="${2:-/Users/mac/Library/Android/sdk}"
  local required_ndk
  required_ndk=$(grep "ndkVersion" /Users/mac/flutter/packages/flutter_tools/lib/src/android/gradle_utils.dart | head -1 | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
  echo "=== Flutter ==="
  "$flutter_path" --version | head -1
  echo "=== Required NDK: $required_ndk ==="
  echo "--- NDK 目录结构 ---"
  ls -la "$android_sdk/ndk/" 2>&1
  echo "--- 目标 NDK 详情 ---"
  ls -la "$android_sdk/ndk/$required_ndk/" 2>&1 | head -20
  echo "--- 关键路径验证 ---"
  test -e "$android_sdk/ndk/$required_ndk/prebuilt" && echo "prebuilt: OK" || echo "prebuilt: MISSING"
  test -e "$android_sdk/ndk/$required_ndk/toolchains" && echo "toolchains: OK" || echo "toolchains: MISSING"
  test -e "$android_sdk/ndk/$required_ndk/source.properties" && echo "source.properties: OK" || echo "source.properties: MISSING"
  echo "--- 代理 ---"
  networksetup -getsecurewebproxy Wi-Fi 2>/dev/null
}
```
