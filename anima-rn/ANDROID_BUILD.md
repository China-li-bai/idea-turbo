# Android 构建指南

## 一、环境准备

### 1. 检查 SDK 组件
```bash
# 查看已安装的组件
ls ~/Library/Android/sdk/build-tools/   # Build Tools
ls ~/Library/Android/sdk/ndk/           # NDK
ls ~/Library/Android/sdk/platforms/     # Android Platforms
```

### 2. 确保模拟器架构匹配
Apple Silicon Mac 的模拟器默认是 `arm64-v8a`，需要构建对应架构的 APK：
```bash
adb shell getprop ro.product.cpu.abi   # 查看模拟器 CPU 架构
```

---

## 二、依赖下载优化（关键！）

### 问题：Gradle 官方源极慢
官方 `services.gradle.org` 会重定向到 GitHub，速度只有 ~100 B/s。

### 解决方案：切换国内镜像

**修改 `android/gradle/wrapper/gradle-wrapper.properties`：**
```properties
# 官方源（慢）
# distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-bin.zip

# 腾讯镜像（推荐）
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.14.3-bin.zip
validateDistributionUrl=false
```

**修改 `android/build.gradle` 添加阿里云 Maven：**
```groovy
buildscript {
  repositories {
    maven { url 'https://maven.aliyun.com/repository/google' }
    maven { url 'https://maven.aliyun.com/repository/central' }
    maven { url 'https://maven.aliyun.com/repository/public' }
    google()
    mavenCentral()
  }
}

allprojects {
  repositories {
    maven { url 'https://maven.aliyun.com/repository/google' }
    maven { url 'https://maven.aliyun.com/repository/central' }
    maven { url 'https://maven.aliyun.com/repository/public' }
    google()
    mavenCentral()
    maven { url 'https://www.jitpack.io' }
  }
}
```

---

## 三、SDK 版本适配

### 问题：SDK 目录不可写
沙箱环境或权限问题导致 Gradle 无法自动安装缺失的 NDK/Build Tools。

### 解决方案：在项目中覆盖版本

**修改 `android/build.gradle`：**
```groovy
ext {
    // 使用已安装的版本，避免自动下载
    ndkVersion = "27.3.13750724"        // 改为你已安装的 NDK 版本
    buildToolsVersion = "37.0.0"        // 改为你已安装的 Build Tools 版本
}

allprojects {
  repositories {
    // ... Maven 配置
  }
  
  // 强制所有子项目使用相同的 buildToolsVersion
  subprojects {
    afterEvaluate { project ->
      if (project.hasProperty('android')) {
        project.android.buildToolsVersion = "37.0.0"
      }
    }
  }
}
```

**修改 `android/gradle.properties`：**
```properties
# 禁止 Gradle 自动下载 SDK 组件
android.builder.sdkDownload=false
```

---

## 四、构建流程

### 1. 清理缓存（可选）
```bash
# 清理项目级缓存
rm -rf android/.gradle android/app/build

# 清理全局 Gradle 缓存
rm -rf ~/.gradle/caches ~/.gradle/wrapper/dists
```

### 2. 构建命令

```bash
cd android

# Apple Silicon 模拟器 (arm64-v8a)
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a --no-daemon

# Intel 模拟器或老款 Mac (x86_64)
./gradlew assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon

# 真机调试 (arm64-v8a)
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a --no-daemon

# Release 构建
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
```

**参数说明：**
- `-PreactNativeArchitectures=xxx` — 指定原生库架构，避免构建全部 4 种架构
- `--no-daemon` — 单次构建后关闭 Daemon，适合 CI 或沙箱环境

### 3. 构建产物位置
```
android/app/build/outputs/apk/
├── debug/
│   └── app-debug.apk      # Debug 版本
└── release/
    └── app-release.apk    # Release 版本
```

---

## 五、安装与调试

### 1. 启动模拟器
```bash
# 查看可用模拟器
$ANDROID_HOME/emulator/emulator -list-avds

# 启动模拟器（不加载快照，更干净）
$ANDROID_HOME/emulator/emulator -avd Pixel_8 -no-snapshot-load &

# 等待模拟器就绪
adb wait-for-device
adb shell getprop sys.boot_completed  # 应返回 1
```

### 2. 安装 APK
```bash
# 检查设备连接
adb devices

# 安装（-r 覆盖安装）
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# 启动应用
adb shell am start -n com.weigh.animarn/.MainActivity
```

### 3. 启动 Metro Bundler
```bash
# 方式一：npx（沙箱环境可能有问题）
npx expo start

# 方式二：直接调用 CLI（更可靠）
node node_modules/expo/node_modules/@expo/cli/build/bin/cli start

# 方式三：npm script
npm start
```

---

## 六、常见问题排查

| 错误信息 | 原因 | 解决方案 |
|---|---|---|
| `INSTALL_FAILED_NO_MATCHING_ABIS` | APK 架构与设备不匹配 | 用正确的 `-PreactNativeArchitectures` 重新构建 |
| `Failed to install SDK components` | SDK 目录不可写 | 在 `build.gradle` ext 中覆盖版本 + `sdkDownload=false` |
| `Failed to find Build Tools revision X.X.X` | 缺少指定版本 | 用 `subprojects.afterEvaluate` 强制覆盖版本 |
| Gradle 下载卡住 | 官方源慢 | 切换到腾讯/阿里镜像 |
| `no devices/emulators found` | 模拟器未启动或 ADB 未识别 | 重启模拟器，检查 `adb devices` |

---

## 七、快速构建脚本

创建 `scripts/build-android.sh`：
```bash
#!/bin/bash
set -e

ARCH=${1:-arm64-v8a}  # 默认 arm64-v8a

echo "=== 清理旧构建 ==="
rm -rf android/app/build/outputs/apk/debug/*.apk

echo "=== 构建 $ARCH APK ==="
cd android
./gradlew assembleDebug -PreactNativeArchitectures=$ARCH --no-daemon

echo "=== 检查设备 ==="
adb devices

echo "=== 安装 APK ==="
adb install -r app/build/outputs/apk/debug/app-debug.apk

echo "=== 启动应用 ==="
adb shell am start -n com.weigh.animarn/.MainActivity

echo "=== 完成 ==="
```

使用：
```bash
chmod +x scripts/build-android.sh
./scripts/build-android.sh arm64-v8a   # 模拟器
./scripts/build-android.sh x86_64      # Intel 模拟器
```

---

## 八、关键配置文件清单

| 文件 | 修改内容 |
|---|---|
| `android/gradle/wrapper/gradle-wrapper.properties` | Gradle 下载源 → 国内镜像 |
| `android/build.gradle` | NDK/BuildTools 版本覆盖 + subprojects 强制版本 |
| `android/gradle.properties` | `android.builder.sdkDownload=false` |
| `android/settings.gradle` | Maven 仓库镜像（可选，已在 build.gradle 配置） |
