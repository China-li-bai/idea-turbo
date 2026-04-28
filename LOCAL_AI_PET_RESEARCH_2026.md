# 2026 年端侧 AI 与本地记忆技术开源方案研究报告

## 📋 摘要

本报告梳理了 2026 年 GitHub 与学术界最成熟的端侧 AI 与本地记忆技术开源方案，为"本地记忆 AI 宠物"项目提供完整的技术选型指南。我们不造轮子，而是站在巨人的肩膀上。

---

## 一、端侧 LLM 推理技术栈

### 1.1 Flutter 端侧 LLM 生态

| 方案 | GitHub/ pub.dev | 成熟度 | 特点 |
|------|----------------|-------|------|
| **flutter_llama** | [pub.dev/packages/flutter_llama](https://pub.dev/packages/flutter_llama) | 🌟🌟🌟🌟🌟 (1.0.0 生产就绪) | 基于 llama.cpp，支持 Android/iOS/macOS，Metal/Vulkan 硬件加速 |
| **llamafu** | [pub.dev/packages/llamafu](https://pub.dev/packages/llamafu) | 🌟🌟🌟🌟 | Flutter FFI 插件，支持视觉、工具调用 |
| **llm_toolkit** | [pub.dev/packages/llm_toolkit](https://pub.dev/packages/llm_toolkit) | 🌟🌟🌟🌟 | 多引擎支持（Gemma TFLite + Llama GGUF），集成模型发现、下载、聊天 |
| **flutter_local_ai** | [github.com/kekko7072/flutter_local_ai](https://github.com/kekko7072/flutter_local_ai) | 🌟🌟🌟🌟 | 利用原生系统 API（iOS Foundation Models / Android ML Kit GenAI），零模型下载 |
| **llamadart** | [pub.dev/packages/llamadart](https://pub.dev/packages/llamadart) | 🌟🌟🌟🌟 | 已有项目使用，支持 GGUF 模型推理 |

**推荐方案：flutter_llama v1.0.0+**
- 优势：生产就绪，完整硬件加速支持
- 已在项目中验证：当前 flutter_demo 使用 llamadart，可以平滑升级

### 1.2 推理引擎后端

| 引擎 | 特点 | 适用场景 |
|------|------|---------|
| **llama.cpp** | 标准 GGUF 格式，硬件加速（Metal/Vulkan/CUDA），最广泛支持 | 通用场景，优先选择 |
| **MNN** | 阿里开源，移动端优化，支持多模型（Qwen/Baichuan/GLM/Llama） | 国内项目，移动端深度优化 |
| **TFLite** | Google 官方，Gemma 模型原生支持 | 简单场景，Google 生态 |

### 1.3 端侧模型推荐（2026 年最成熟）

| 模型 | 参数量 | 特点 | 许可证 | 推荐指数 |
|------|-------|------|--------|---------|
| **Qwen3.5-0.8B** | 0.8B | 极致轻量，中文优秀，手机首选 | Apache 2.0 | 🌟🌟🌟🌟🌟 |
| **MiniCPM3-1.2B** | 1.2B | 多模态强，MIT 开源，小而精悍 | MIT | 🌟🌟🌟🌟🌟 |
| **Qwen3.5-1.7B** | 1.7B | 速度/质量平衡，专为移动端优化 | Apache 2.0 | 🌟🌟🌟🌟 |
| **GLM-4-2B** | 2B | 清华大学背景，稳定可靠 | 智谱协议 | 🌟🌟🌟🌟 |
| **Gemma 3-2B** | 2B | Google，英语教学强 | Gemma 协议 | 🌟🌟🌟 |
| **Llama 3.3-3B** | 3B | Meta 官方，工具调用强 | Llama 3 | 🌟🌟🌟 |

**模型下载镜像（国内）：**
- ModelScope（推荐）：[modelscope.cn](https://modelscope.cn)
- 格式转换：`huggingface.co/{owner}/{repo}/resolve/main/{filename}` → `modelscope.cn/models/{owner}/{repo}/resolve/master/{filename}`

---

## 二、本地记忆与向量检索技术栈

### 2.1 端侧向量数据库

| 方案 | GitHub | 成熟度 | 特点 |
|------|--------|-------|------|
| **ZVec** | [github.com/alibaba/zvec](https://github.com/alibaba/zvec) | 🌟🌟🌟🌟🌟 | 阿里开源，嵌入式架构，零部署，移动端高性能向量检索 |
| **LEANN** | [github.com/yichuan-w/LEANN](https://github.com/yichuan-w/LEANN) | 🌟🌟🌟🌟🌟 | MLsys'26 论文，世界最小向量索引，97% 存储节省 |
| **Munind** | [github.com/netdur/munind](https://github.com/netdur/munind) | 🌟🌟🌟🌟 | 本地优先设计，数据库风格 API，混合检索（向量 + BM25F） |
| **mobile_rag_engine** | [pub.dev/packages/mobile_rag_engine](https://pub.dev/packages/mobile_rag_engine) | 🌟🌟🌟🌟🌟 | Flutter 专用 RAG 引擎，Rust 核心，开箱即用 |

**ZVec 核心优势：**
```
架构：嵌入式向量数据库
性能：移动端毫秒级语义搜索
特点：零部署、零运维、完全免费
```

### 2.2 本地 RAG 框架

| 框架 | 特点 | 适用场景 |
|------|------|---------|
| **mobile_rag_engine** | Flutter 专用，Rust 核心，完整本地 RAG | 移动端 AI 应用 |
| **EverMate.AI** | 已有 AI 宠物项目，SQLite 倒排索引 + BM25 | 可参考架构 |
| **混合检索** | 向量检索 + BM25 关键词检索 | 高精度需求 |

**本地记忆架构三层设计：**

```
┌─────────────────────────────────────────────────────────┐
│                     应用层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 对话记忆     │  │ 用户画像     │  │ 知识图谱     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    检索层（RAG）                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  混合检索：向量相似度 + BM25 关键词                │  │
│  │  重排序：Contextual Rerank                         │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    存储层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ SQLite       │  │ ZVec/LEANN   │  │ 文件系统     │  │
│  │ (结构化)     │  │ (向量索引)   │  │ (原始数据)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 三、AI 宠物相关开源项目参考

### 3.1 成熟项目案例

| 项目 | GitHub | 特点 | 可复用点 |
|------|--------|------|---------|
| **EverMate.AI** | [github.com/Diabolically-Handsome/EverMate.AI](https://github.com/Diabolically-Handsome/EverMate.AI) | 本地 AI 宠物，SQLite 倒排索引 + BM25，流式构建增量刷新 | 记忆系统架构 |
| **PetGPT** | [github.com/JulesLiu390/PetGPT](https://github.com/JulesLiu390/PetGPT) | AI 桌面宠物，社交代理，本地记忆 | 多窗口架构、记忆系统 |
| **桌面宠物框架** | 多个 | 像素风格、动画系统、交互设计 | UI/UX 参考 |

### 3.2 记忆系统架构研究

**三种主流记忆架构对比（2026 年研究）：**

| 架构 | 特点 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|---------|
| **pgvector** | PostgreSQL 扩展 | 成熟生态，SQL 友好 | 需要服务器 | 云端优先 |
| **Scratchpad** | 工作记忆 + 长期记忆 | 灵活，类似人类记忆 | 实现复杂 | 高级 AI 代理 |
| **文件系统** | Markdown 文件存储 | 简单透明，易于调试 | 检索性能 | 个人应用 |

**AI 宠物推荐方案：Scratchpad 变体**
```
记忆分层：
1. 工作记忆（对话上下文）- 4K-8K Token
2. 短期记忆（最近交互）- SQLite 存储
3. 长期记忆（重要事件）- 向量检索 + 倒排索引
4. 核心人格/偏好 - 配置文件
```

---

## 四、端侧语音技术栈

### 4.1 语音识别（ASR）

| 方案 | GitHub/pub.dev | 特点 |
|------|---------------|------|
| **Sherpa-Onnx** | [packages/sherpa-onnx](file:///root/idea-turbo/packages/sherpa-onnx) | 已有项目集成，端侧 ASR，支持多种语言 |
| **Whisper.cpp** | [github.com/ggerganov/whisper.cpp](https://github.com/ggerganov/whisper.cpp) | 成熟，多语言，GGML 格式 |
| **Vosk** | [alphacephei.com/vosk](https://alphacephei.com/vosk) | 轻量级，离线，多种语言 |

### 4.2 语音合成（TTS）

| 方案 | GitHub/pub.dev | 特点 |
|------|---------------|------|
| **Sherpa-Onnx-TTS** | [packages/sherpa-onnx-tts](file:///root/idea-turbo/packages/sherpa-onnx-tts) | 已有项目集成，端侧 TTS |
| **Kokoro.js** | [packages/sherpa-onnx-tts/src/kokoro-core](file:///root/idea-turbo/packages/sherpa-onnx-tts/src/kokoro-core) | 中文支持，自然语音 |
| **Edge-TTS** | [workers/edge-tts-worker](file:///root/idea-turbo/workers/edge-tts-worker) | 云端高质量 TTS，可降级方案 |

---

## 五、硬件加速与性能优化

### 5.1 手机性能检测与模型匹配

**性能分级标准（已在项目中实现）：**

| 性能级别 | 设备条件 | 推荐模型 |
|---------|---------|---------|
| **High（高性能）** | Android 13+ / iPhone 15+ / RAM ≥ 8GB | 所有模型，最高 4B |
| **Medium（良好）** | Android 11-12 / iPhone 13-14 / RAM 6-8GB | 0.8B - 3B |
| **Low（入门）** | Android 10- / iPhone 12- / RAM < 6GB | 0.8B - 1.7B |

**检测方案：**
- 使用 `device_info_plus` 获取设备信息
- 根据 SDK 版本/机型/内存动态推荐

### 5.2 推理优化技术

| 技术 | 效果 | 实现难度 |
|------|------|---------|
| **GGUF Q4_K_M 量化** | 4 倍体积缩小，精度损失小 | 低（已有） |
| **Metal/Vulkan 硬件加速** | 3-10x 速度提升 | 中 |
| **KV Cache 复用** | 对话场景 2-3x 速度提升 | 中 |
| **Speculative Decoding** | 小模型引导，2-5x 速度提升 | 高 |
| **Flash Attention** | 内存优化，速度提升 | 高 |

---

## 六、完整技术栈选型建议（2026 年生产就绪）

### 6.1 核心技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                    UI 层（Flutter）                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  宠物界面：像素风格动画 + 触摸交互                     │  │
│  │  对话界面：流式输出 + 语音输入/输出                    │  │
│  │  记忆界面：时间线 + 标签管理                           │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  应用逻辑层（Dart）                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ 宠物状态机    │  │ 对话管理器     │  │ 记忆管理器    │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   AI 引擎层（FFI）                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  flutter_llama (llama.cpp) - LLM 推理                  │  │
│  │  Sherpa-Onnx - ASR/TTS                                 │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    记忆与检索层                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ZVec - 向量检索                                       │  │
│  │  SQLite - 结构化存储 + BM25 倒排索引                   │  │
│  │  混合检索 + 重排序                                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 pubspec.yaml 依赖推荐

```yaml
dependencies:
  # 核心框架
  flutter:
    sdk: flutter

  # 端侧 LLM
  flutter_llama: ^1.0.0  # 生产就绪，硬件加速
  # 或保留现有 llamadart: ^0.6.10

  # 本地记忆与 RAG
  mobile_rag_engine: ^0.8.0  # Flutter 专用 RAG 引擎
  sqflite: ^2.3.0  # SQLite 结构化存储
  # zvec: ^1.0.0  # 阿里向量数据库（待发布 pub.dev）

  # 语音
  sherpa_onnx: ^1.0.0  # ASR
  sherpa_onnx_tts: ^1.0.0  # TTS

  # 工具
  dio: ^5.9.0  # 网络请求
  path_provider: ^2.1.0  # 文件路径
  device_info_plus: ^11.3.0  # 设备信息
  package_info_plus: ^8.3.0  # 应用信息
  ota_update: ^7.0.0  # OTA 更新
  provider: ^6.1.0  # 状态管理

  # UI
  cupertino_icons: ^1.0.8
  flutter_gen_ai_chat_ui: ^2.11.0  # 聊天 UI
  lottie: ^3.1.0  # 动画
  rive: ^0.13.0  # 交互式动画
```

---

## 七、生产环境架构设计

详见：[LOCAL_AI_PET_ARCHITECTURE.md](LOCAL_AI_PET_ARCHITECTURE.md)

---

## 八、实施路线图（MVP → Production）

### Phase 1: MVP（1-2 周）
- [ ] 集成 flutter_llama 替换/增强现有 llamadart
- [ ] 添加基础记忆系统（SQLite + 简单检索）
- [ ] 宠物基础动画与交互
- [ ] 语音输入输出（复用现有 Sherpa-Onnx）

### Phase 2: 本地记忆增强（2-3 周）
- [ ] 集成 ZVec 向量数据库
- [ ] 实现混合检索（向量 + BM25）
- [ ] 记忆分层：工作/短期/长期
- [ ] 记忆可视化界面

### Phase 3: 生产就绪（2-3 周）
- [ ] 性能优化：硬件加速、KV Cache
- [ ] 完善 OTA 更新机制
- [ ] 错误处理与崩溃监控
- [ ] 应用商店发布准备

---

## 九、总结与建议

### 核心原则：不造轮子 ✅

| 功能 | 成熟开源方案 | 建议 |
|------|-------------|------|
| 端侧 LLM 推理 | flutter_llama (llama.cpp) | 🌟 首选 |
| 向量数据库 | ZVec (阿里) / LEANN | 🌟 首选 |
| 本地 RAG | mobile_rag_engine | 🌟 首选 |
| 语音识别 | Sherpa-Onnx | 🌟 已有 |
| 语音合成 | Sherpa-Onnx-TTS / Kokoro | 🌟 已有 |
| AI 宠物参考 | EverMate.AI / PetGPT | 📚 参考 |

### 技术债务与风险防控

1. **模型体积**：使用 Q4_K_M 量化，提供模型下载管理
2. **设备兼容性**：性能分级 + 动态推荐
3. **离线优先**：所有核心功能完全离线
4. **隐私保护**：数据完全本地存储，不上云

---

## 📚 参考文献与链接

### 开源项目
- [flutter_llama](https://pub.dev/packages/flutter_llama)
- [EverMate.AI](https://github.com/Diabolically-Handsome/EverMate.AI)
- [ZVec](https://github.com/alibaba/zvec)
- [LEANN](https://github.com/yichuan-w/LEANN)
- [MNN](https://github.com/alibaba/MNN)

### 学术论文
- LEANN: MLsys'26 - 极小向量索引
- 相关记忆系统研究（附链接）

### 已有项目资源
- [flutter_demo](file:///root/idea-turbo/flutter_demo) - 现有端侧 LLM 项目
- [packages/sherpa-onnx](file:///root/idea-turbo/packages/sherpa-onnx) - 语音识别
- [packages/sherpa-onnx-tts](file:///root/idea-turbo/packages/sherpa-onnx-tts) - 语音合成

---

**最后更新：** 2026-04-27
**版本：** v1.0
