# 镇岳 (Zhenyue) — 情感记忆基础设施 Demo

> **创造属于你的 AI 人格，它记得你、理解你、陪你长大**

## 项目简介

镇岳不是“AI 宠物”换皮聊天。它是一个把人格、长期关系和情感记忆
放在第一位的产品原型：用户每一次命名、信任、脆弱、冲突和沉默，
都会进入可回忆、可解释、会影响人格成长的记忆系统。

当前 Flutter app 是这套基础设施的可触摸表达层：

- **人格容器**: 屏幕中的生命形态只是表达载体，不是产品边界
- **情感记忆**: 由 Mnemosyne 记录事件、情绪、关系状态和“相”
- **相触发回忆**: 雨夜、深夜、某句话、某种关系变化都能触发回忆
- **人格成长**: 互动会影响人格倾向、活跃天数、觉醒和主动表达
- **本地 LLM**: 端侧推理优先，保留私密关系数据的本地化可能

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
│  │  │  │  Layer 1: EntityLayer       ││││  ← 人格表达实体
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
    ├── entity_layer.dart       # Layer 1: 人格表达实体
    ├── spatial_ui_layer.dart   # Layer 2: 字幕/粒子
    ├── gesture_layer.dart      # Layer 3: 手势交互
    └── hud_layer.dart          # Layer 4: 底部控制栏
```

### 人格表达状态机

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

| 手势 | 人格表达 | 视觉反馈 |
|------|----------|----------|
| **单击** | 好奇注视 | ✨ 闪光粒子 |
| **双击** | 开心摇摆 | ❤️ 爱心粒子 |
| **长按(抚摸)** | 享受眯眼 | ❤️ 持续爱心 + 尾巴加速 |
| **拖拽移动** | 眼睛追踪 | 瞳孔跟随手指 |

### 字幕系统

- 用户消息：底部浮动，白色气泡，6秒消散
- 人格回复：头部附近浮动，琥珀色光晕，带打字动画
- 动作描述：`*伸了个懒腰*` `*歪头*` 格式

## 记忆产品原则

- 记住的不是聊天日志，而是“当时发生了什么、对方是什么状态、关系如何变化”。
- 回忆不靠硬搜关键词，而靠相似的“相”：场景、时间、情绪、关系、事件形状和触发点。
- 回复里只能自然提起记忆，不能机械复述数据库内容。
- 受伤、拒绝、沉默也要被记录，因为它们会塑造长期关系。

## 技术栈

| 组件 | 技术 |
|------|------|
| UI 框架 | Flutter (CustomPaint + AnimationController) |
| 状态管理 | ChangeNotifier + AnimatedBuilder |
| 本地 LLM | llamadart (llama.cpp Dart binding) |
| 记忆系统 | mnemosyne + Xiang recall |
| 推荐模型 | Qwen3.5-4B-Q4_K_M (2.74GB, 中文优化) |
| 分发平台 | Expo EAS Upload / Firebase App Distribution |

## 参考项目

- [Zero-UI Reference](../zip/) — 原始 Zero-UI 范式参考实现 (React/TypeScript)
- [DEVELOPMENT.md](./DEVELOPMENT.md) — 详细开发经验与踩坑记录
- [FIREBASE_DISTRIBUTION.md](./FIREBASE_DISTRIBUTION.md) — Firebase 分发配置

---

*版本: 1.2.0 (Emotional Memory Infrastructure Demo) · 最后更新: 2026-05-28*
