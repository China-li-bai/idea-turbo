# Anima RN 高效开发指南

## 日常开发流程

### 1. UI/逻辑开发 (90% 时间)
```bash
npx expo start --web
```
- 浏览器打开 http://localhost:8081
- 修改代码 → 自动刷新
- 使用 React DevTools 调试

### 2. 原生功能测试 (10% 时间)
```bash
# 使用优化后的 EAS Build (~2-3分钟)
eas build --profile development --platform android
```
- 手机扫码安装
- 测试 llama.rn、文件系统等原生功能

### 3. 发布前验证
```bash
eas build --profile preview --platform android
```

## 文件说明

- `.easignore` - EAS 构建排除规则（已优化）
- `install-android-sdk.sh` - Android SDK 安装脚本
- `fs-utils.ts` - 原生文件系统工具（绕过 expo-file-system）

## 环境变量 (本地构建时需要)

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```
