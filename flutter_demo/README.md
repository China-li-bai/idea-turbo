# 镇岳 (Zhenyue) — AI 宠物互动陪伴应用

> **Zero-UI 范式 · Mobile-First · 生物力学软体数字宠物**

## 项目简介

镇岳是一只生活在你的手机屏幕里的 2D 生物力学软体数字宠物。它不是传统的聊天机器人——**没有对话框、没有输入框的死板交互**。取而代之的是：

- 🐱 **实体层**: 一只会呼吸、眨眼、追踪你手指的猫形生物
- 💭 **空间 UI**: 浮动的电影式字幕（像思绪一样自然消散）
- ✨ **粒子特效**: 爱心、闪光、音符等情感反馈
- 🎯 **手势交互**: 抚摸、点击、长按、双击
- 🧠 **本地 LLM**: 端侧推理，隐私安全

## 架构设计

### 五层渲染架构 (Zero-UI)

```
┌─────────────────────────────────────────┐
│  Layer 4: HUDLayer                      │  ← 底部极简控制栏
│  ┌─────────────────────────────────────┐│
│  │  Layer 3: GestureLayer              ││  ← 触摸/长按/双击
│  │  ┌─────────────────────────────────┐││
│  │  │  Layer 2: SpatialUILayer        │││  ← 浮动字幕 + 粒子
│  │  │  ┌─────────────────────────────┐│││
│  │  │  │  Layer 1: EntityLayer       ││││  ← 猫形宠物本体
│  │  │  │  ┌─────────────────────────┐││││
│  │  │  │  │  Layer 0: HabitatLayer  │││││  ← 氛围背景
│  │  │  │  └─────────────────────────┘││││
│  │  │  └─────────────────────────────┘│││
│  │  └─────────────────────────────────┘││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 核心文件结构

```
lib/pet/
├── pet_store.dart              # 状态管理 (ChangeNotifier)
├── pet_app_shell.dart          # 应用外壳 (组合所有层)
├── services/
│   └── ai_service.dart         # LLM 推理服务 (llamadart)
└── layers/
    ├── habitat_layer.dart      # Layer 0: 氛围背景
    ├── entity_layer.dart       # Layer 1: 宠物本体
    ├── spatial_ui_layer.dart   # Layer 2: 字幕/粒子
    ├── gesture_layer.dart      # Layer 3: 手势交互
    └── hud_layer.dart          # Layer 4: 底部控制栏
```

### 宠物状态机

```
idle → listening → thinking → speaking → idle
  ↕                    ↑
happy              (AI 回复完成)
  ↕
curious / sleepy / dizzy / reading
```

## 快速开始

### 环境要求

- Flutter SDK >= 3.22
- Dart SDK >= 3.11
- Android SDK (API 21+)
- Android NDK (用于 llamadart 本地编译)

### 安装与运行

```bash
# 克隆项目
cd /root/idea-turbo/flutter_demo

# 安装依赖
flutter pub get

# 运行 (需要连接设备或模拟器)
flutter run
```

### 打包发布

```bash
# Release APK
flutter build apk --release --target-platform android-arm64

# 输出路径: build/app/outputs/flutter-apk/app-release.apk
```

## 交互设计

### 手势映射

| 手势 | 宠物反应 | 视觉反馈 |
|------|----------|----------|
| **单击** | 好奇注视 | ✨ 闪光粒子 |
| **双击** | 开心摇摆 | ❤️ 爱心粒子 |
| **长按(抚摸)** | 享受眯眼 | ❤️ 持续爱心 + 尾巴加速 |
| **拖拽移动** | 眼睛追踪 | 瞳孔跟随手指 |

### 字幕系统

- 用户消息：底部浮动，白色气泡，6秒消散
- 宠物回复：头部附近浮动，琥珀色光晕，带打字动画
- 动作描述：`*伸了个懒腰*` `*歪头*` 格式

## 技术栈

| 组件 | 技术 |
|------|------|
| UI 框架 | Flutter (CustomPaint + AnimationController) |
| 状态管理 | ChangeNotifier + AnimatedBuilder |
| 本地 LLM | llamadart (llama.cpp Dart binding) |
| 推荐模型 | Qwen3.5-4B-Q4_K_M (2.74GB, 中文优化) |
| 分发平台 | Expo EAS Upload / Firebase App Distribution |

## 参考项目

- [Zero-UI Reference](../zip/) — 原始 Zero-UI 范式参考实现 (React/TypeScript)
- [DEVELOPMENT.md](./DEVELOPMENT.md) — 详细开发经验与踩坑记录
- [FIREBASE_DISTRIBUTION.md](./FIREBASE_DISTRIBUTION.md) — Firebase 分发配置

---

*版本: 1.1.0 (Zero-UI Pet Edition) · 最后更新: 2026-04-29*
