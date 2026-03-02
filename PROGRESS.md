# Idea-Turbo 项目进度

> 最后更新: 2025-03-02

## 项目概述

Idea-Turbo 是一个基于 Turborepo + pnpm 的 monorepo 项目，专注于 AI 语言学习应用。

## 当前功能模块

### 1. Listen Book (主应用)
- AI 语音对话
- 每日外语日记 (翻译 + TTS)
- Cookie 管理
- Landing Page

### 2. Sherpa-ONNX 语音识别
- 实时语音转文字
- WebAssembly 运行
- IndexedDB 缓存

### 3. Edge TTS
- 云端 TTS 服务
- 本地后备

## 技术栈

| 类别 | 技术 |
|------|------|
| 构建系统 | Turborepo + pnpm |
| 前端框架 | Next.js 14 (App Router) |
| 语音识别 | Sherpa-ONNX (WASM) |
| TTS | Edge TTS + Web Speech API |
| AI 翻译 | Zhipu AI (glm-4-flash) |
| 样式 | Tailwind CSS |

## 项目结构

```
├── apps/
│   └── listen-book/          # 主应用
│       ├── app/              # Next.js 页面
│       ├── components/       # 组件
│       ├── lib/              # 工具函数
│       │   ├── tts/          # TTS 服务
│       │   ├── recognition/  # 识别服务
│       │   └── journal/      # 日记功能
│       └── public/           # 静态资源
│
├── packages/
│   ├── sherpa-onnx/          # 语音识别包
│   │   ├── src/              #  │   └── static源代码
│  /           # 模型文件
│   └── ...
│
├── workers/
│   └── edge-tts-worker/      # Cloudflare Worker
│
└── .trae/
    └── skills/               # AI 技能
```

## 进度记录

### 2025-03-02

#### ✅ 确认使用 Bilingual 模型
- [x] 确定使用 `sherpa-onnx-wasm-main-asr.data` (bilingual-zh-en, 190MB)
- [x] 支持中英混读 (Code-switching)
- [x] 移除冗余的 .onnx 动态加载逻辑

#### ✅ Sherpa-ONNX 缓存优化
- [x] 实现 IndexedDB 缓存 (`.data` 文件)
- [x] 添加 Blob URL 预加载
- [x] 实现 fetch/XHR 拦截器
- [x] 添加 `forceUpdateModel()` / `clearModelCache()` 方法

#### ✅ CDN 策略简化
- [x] 只缓存 `.data` 文件 (~1MB)
- [x] 其他文件使用本地资源:
  - `.wasm` → `public/sherpa-wasm/`
  - `.onnx` 模型 → `public/models/`
  - `.js` 加载器 → `public/`

#### ✅ 代码整合
- [x] 将 `lib/recognition` 核心逻辑移入 `packages/sherpa-onnx`
- [x] `VoiceConversation.tsx` 改用 `@idea-turbo/sherpa-onnx`
- [x] 删除重复代码

#### ✅ Skill 创建
- [x] 创建 `webassembly-debugger` skill
- [x] 创建 `monorepo-manager` skill
- [x] 更新 `dev-philosopher` 路由表

#### 📋 待完成
- [ ] 测试缓存是否正常工作
- [ ] 清理 `public/sherpa-wasm/` 冗余文件

---

### 历史记录

#### 2025-02 (早期)
- 初始项目搭建
- 集成 Sherpa-ONNX 语音识别
- 实现 Edge TTS 服务
- 添加每日外语日记功能
- 集成 Zhipu AI 翻译

## 常用命令

```bash
# 开发
pnpm run dev

# 构建
pnpm run build

# 清理缓存
turbo clean
pnpm store prune

# 测试特定包
pnpm run build --filter=@idea-turbo/sherpa-onnx
```

## 相关文档

- [Listen Book README](apps/listen-book/README.md)
- [Sherpa-ONNX 架构](apps/listen-book/RECOGNITION_ARCHITECTURE.md)
- [需求文档](apps/listen-book/docs/REQUIREMENTS.md)
- [技术文档](apps/listen-book/docs/TECHNICAL.md)
