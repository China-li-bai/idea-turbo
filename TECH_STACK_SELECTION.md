# 本地记忆 AI 宠物 - 技术栈选型与实施指南

## 📋 选型原则

1. **生产就绪优先：选择有 1.0+ 版本、社区活跃的方案
2. **不重复造轮子：复用已有的成熟组件
3. **平滑迁移：从现有 flutter_demo 逐步升级
4. **性能分级：根据设备能力动态适配

---

## 一、技术选型决策树

### 1.1 端侧 LLM 方案

```
Flutter 端侧 LLM
    ├─ 需要硬件加速？
    │   ├─ Yes → flutter_llama (推荐 🌟)
    │   └─ No → llamadart (已有)
    ├─ 需要多引擎支持？
    │   ├─ Yes → llm_toolkit
    │   └─ No → 同上
    └─ 零模型下载？
        ├─ Yes → flutter_local_ai (系统 API)
        └─ No → 同上
```

**决策：flutter_llama v1.0.0+**

理由：
- ✅ 生产就绪版本
- ✅ Metal/Vulkan 硬件加速（3-10x 速度提升）
- ✅ 兼容 GGUF 格式（与现有 llamadart 一致）
- ✅ 支持 Android/iOS/macOS

### 1.2 本地记忆方案

```
本地记忆与 RAG
    ├─ 移动端优先？
    │   ├─ Yes → mobile_rag_engine (推荐 🌟)
    │   └─ No → 其他方案
    ├─ 极致存储效率？
    │   ├─ Yes → LEANN (MLsys'26 论文)
    │   └─ No → 其他
    └─ 国内项目？
        ├─ Yes → ZVec (阿里开源 🌟)
        └─ No → 其他
```

**决策：mobile_rag_engine + SQLite (BM25)**

理由：
- ✅ Flutter 专用，开箱即用
- ✅ Rust 核心，高性能
- ✅ 完整的 RAG 能力

### 1.3 语音方案

```
语音 (ASR/TTS)
    └─ 已有集成？
        ├─ Yes → Sherpa-Onnx (推荐 🌟 保留现有)
        └─ No → 其他方案
```

**决策：保留现有 Sherpa-Onnx**

理由：
- ✅ 项目中已有 packages/sherpa-onnx 和 packages/sherpa-onnx-tts
- ✅ 端侧推理，离线可用
- ✅ 多语言支持

---

## 二、最终技术栈（2026 年生产就绪）

### 2.1 核心依赖（推荐）

```yaml
name: local_ai_pet
description: 本地记忆 AI 宠物

dependencies:
  flutter:
    sdk: flutter

  # ========== 端侧 LLM ==========
  flutter_llama: ^1.0.0  # 🌟 生产就绪，硬件加速
  # 或保留现有：llamadart: ^0.6.10

  # ========== 本地记忆与 RAG ==========
  mobile_rag_engine: ^0.8.0  # 🌟 Flutter 专用 RAG
  sqflite: ^2.3.0  # SQLite 结构化存储
  path_provider: ^2.1.5  # 文件路径

  # ========== 语音 ==========
  # 复用现有 packages 中的 Sherpa-Onnx

  # ========== 状态管理 ==========
  provider: ^6.1.0  # 或 flutter_riverpod: ^2.3.0

  # ========== UI 组件 ==========
  cupertino_icons: ^1.0.8
  flutter_gen_ai_chat_ui: ^2.11.0  # 聊天 UI（已有）
  lottie: ^3.1.0  # 动画
  rive: ^0.13.0  # 交互式动画

  # ========== 工具 ==========
  dio: ^5.9.2  # 网络请求（已有）
  device_info_plus: ^11.3.2  # 设备信息（已有）
  package_info_plus: ^8.3.0  # 应用信息（已有）
  ota_update: ^7.0.2  # OTA 更新（已有）

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
```

### 2.2 分阶段迁移计划

#### Phase 0: 现状（当前 flutter_demo）
```
✅ LLM: llamadart
✅ 模型下载: ModelScope 镜像
✅ 性能检测: device_info_plus
✅ OTA 更新: ota_update
❌ 记忆系统: 无
❌ RAG: 无
❌ 宠物 UI: 基础聊天
```

#### Phase 1: 最小可用升级（1-2 周）
```
升级 LLM → flutter_llama（可选，保持 llamadart 也可）
添加 SQLite 基础记忆系统
添加宠物状态机
添加基础宠物 UI
```

#### Phase 2: 记忆增强（2-3 周）
```
集成 mobile_rag_engine
实现混合检索（向量 + BM25）
记忆可视化界面
```

#### Phase 3: 生产优化（2-3 周）
```
性能优化：硬件加速、KV Cache
完善错误处理与降级
应用商店发布准备
```

---

## 三、从现有 flutter_demo 迁移指南

### 3.1 第一步：重构代码结构

当前 main.dart 1000+ 行，建议拆分：

```
lib/
├── main.dart                 # 入口（简化）
├── features/
│   ├── model_download/      # 模型下载（从 main.dart 提取）
│   │   ├── screens/
│   │   └── providers/
│   ├── chat/               # 聊天界面（从 main.dart 提取）
│   │   ├── screens/
│   │   └── widgets/
│   └── update_check/        # 更新检查（从 main.dart 提取）
└── ...
```

### 3.2 第二步：添加记忆系统

创建 `lib/features/memory/` 模块：

```dart
// lib/features/memory/models/memory_item.dart

// lib/features/memory/providers/memory_provider.dart

// lib/features/memory/repositories/memory_repository.dart
```

### 3.3 第三步：添加宠物模块

创建 `lib/features/pet/` 模块：

```dart
// lib/features/pet/state/pet_state_machine.dart

// lib/features/pet/screens/pet_home_screen.dart

// lib/features/pet/animations/pet_animations.dart
```

---

## 四、关键实现代码示例

### 4.1 记忆管理器（简化版）

```dart
import 'package:sqflite/sqflite.dart';

class MemoryManager {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  static Future<Database> _initDatabase() async {
    // 初始化数据库
  }

  static Future<void> saveMemory(MemoryItem memory) async {
    // 保存记忆
  }

  static Future<List<MemoryItem>> searchMemories(String query) async {
    // 检索记忆
  }
}
```

### 4.2 宠物状态机

```dart
import 'package:flutter/foundation.dart';

enum PetState { idle, thinking, happy, sleepy, curious, excited }

class PetStateProvider extends ChangeNotifier {
  PetState _state = PetState.idle;

  PetState get state => _state;

  void transitionTo(PetState newState) {
    _state = newState;
    notifyListeners();
  }
}
```

---

## 五、性能预算与优化

### 5.1 应用大小预算

| 组件 | 大小 | 说明 |
|------|------|------|
| Flutter 框架 | ~15MB | 基础 |
| LLM 模型 | 533MB - 2.7GB | Qwen3.5-0.8B 最小 |
| 语音模型 | ~50-200MB | ASR + TTS |
| 应用代码 + 资源 | ~20MB |  |
| **总计（最小配置）** | **~650MB** | 可接受 |

优化方案：
- 模型按需下载（已有）
- 支持删除未使用模型
- 提供不同大小模型选项

### 5.2 内存预算

| 组件 | 内存占用 |
|------|---------|
| LLM 推理 (0.8B Q4) | ~500MB - 1GB |
| Flutter UI | ~100-200MB |
| 记忆系统 | ~50-100MB |
| **总计** | **~700MB - 1.3GB** |

---

## 六、开源项目可复用清单

### 6.1 直接复用（本项目已有）

| 组件 | 路径 | 状态 |
|------|------|------|
| Sherpa-Onnx ASR | packages/sherpa-onnx | ✅ 可用 |
| Sherpa-Onnx TTS | packages/sherpa-onnx-tts | ✅ 可用 |
| Edge-TTS Worker | workers/edge-tts-worker | ✅ 可用 |
| Flutter Demo | flutter_demo/ | ✅ 基础可用 |

### 6.2 参考架构

| 项目 | 可复用部分 |
|------|-----------|
| EverMate.AI | 记忆系统架构、BM25 实现 |
| PetGPT | 宠物 UI、多窗口架构 |

---

## 七、风险评估与缓解

| 风险 | 概率 | 影响 | 缓解方案 |
|------|------|------|---------|
| 机型兼容性问题 | 中 | 高 | 性能分级 + 充分测试 |
| 模型体积过大 | 高 | 中 | 0.8B 小模型优先，按需下载 |
| 第三方依赖维护 | 低 | 中 | 选择活跃的开源项目 |
| 应用审核被拒 | 低 | 高 | 隐私政策明确，权限最小化 |

---

## 八、下一步行动建议

### 立即执行（本周）

1. ✅ 阅读两个架构设计文档
2. ✅ 重构现有 flutter_demo 代码结构（拆分 main.dart）
3. ✅ 添加基础宠物状态机和 UI

### 短期（1-2 周）

4. 添加 SQLite 基础记忆系统
5. 集成 mobile_rag_engine（可选）

### 中期（1 月）

6. 完善记忆系统与检索
7. 优化性能与用户体验
8. 应用商店发布准备

---

## 附录：相关资源链接

### 文档
- [LOCAL_AI_PET_RESEARCH_2026.md](LOCAL_AI_PET_RESEARCH_2026.md) - 开源方案研究
- [LOCAL_AI_PET_ARCHITECTURE.md](LOCAL_AI_PET_ARCHITECTURE.md) - 架构设计

### 项目内部资源
- [flutter_demo/](file:///root/idea-turbo/flutter_demo) - 现有 LLM 项目
- [flutter_demo/DEVELOPMENT.md](file:///root/idea-turbo/flutter_demo/DEVELOPMENT.md) - 开发经验总结
- [packages/sherpa-onnx/](file:///root/idea-turbo/packages/sherpa-onnx) - 语音识别
- [packages/sherpa-onnx-tts/](file:///root/idea-turbo/packages/sherpa-onnx-tts) - 语音合成

---

**最后更新：** 2026-04-27
**版本：** v1.0
