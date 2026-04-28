# 本地记忆 AI 宠物 - 生产环境架构设计

## 🎯 设计原则

1. **本地优先（Local-First）：所有核心功能完全离线，隐私至上
2. **不造轮子：复用 2026 年最成熟的开源方案
3. **高内聚低耦合：模块化设计，易于扩展
4. **性能分级：根据设备性能动态适配
5. **防御性编程：完善的错误处理与降级策略

---

## 一、系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          UI 层（Flutter）                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  宠物主界面  │  │  对话界面    │  │  记忆界面    │            │
│  │  (动画/交互) │  │  (聊天/语音) │  │  (时间线/标签)│            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
├─────────────────────────────────────────────────────────────────────────┤
│                       应用逻辑层（Dart）                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐   │
│  │ 宠物状态机 │ │ 对话管理器   │ │ 记忆管理器   │ │ 语音服务 │   │
│  │ (FSM)     │ │ (上下文管理)   │ │ (CRUD/检索)  │ │ (ASR/TTS)│   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                      AI 引擎层（FFI）                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐          │
│  │  LLM 推理引擎         │  │  多模态引擎              │          │
│  │  flutter_llama       │  │  (可选：视觉/音频)       │          │
│  └──────────────────────────┘  └──────────────────────────┘          │
├─────────────────────────────────────────────────────────────────────────┤
│                     记忆与检索层                                                    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  混合检索引擎                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │    │
│  │  │ 向量检索     │  │ BM25 检索     │  │ 重排序模块     │  │    │
│  │  │ (ZVec)      │  │ (SQLite)      │  │ (Contextual) │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│                       存储层（本地）                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐            │
│  │ SQLite       │  │ ZVec 索引    │  │ 文件系统      │            │
│  │ (结构化数据)   │  │ (向量数据)    │  │ (模型/资源)   │            │
│  └──────────────┘  └──────────────┘  └───────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、核心模块详细设计

### 2.1 宠物状态机（Pet State Machine）

```dart
/// 宠物状态枚举
enum PetState {
  idle,       // 空闲
  thinking,   // 思考（响应中）
  happy,      // 开心
  sleepy,     // 困倦
  curious,   // 好奇
  excited,   // 兴奋
}

/// 宠物状态机
class PetStateMachine {
  PetState _currentState = PetState.idle;
  final Map<PetState, List<StateTransition>> _transitions = {};

  /// 状态转换
  void transitionTo(PetState newState, {double emotionIntensity = 1.0}) {
    // 实现状态转换逻辑
    // 触发动画更新
    // 更新 UI
  }

  /// 根据对话内容自动调整状态
  void updateStateFromConversation(String userInput, String aiResponse) {
    // 情感分析
    // 状态更新
  }
}
```

### 2.2 对话管理器（Conversation Manager）

```dart
/// 对话会话
class Conversation {
  final String id;
  final DateTime createdAt;
  final List<ChatMessage> messages;
  final String title;
}

/// 对话管理器
class ConversationManager {
  final List<Conversation> _conversations = [];
  Conversation? _currentConversation;

  /// 创建新对话
  Conversation createConversation() {
    // 实现
  }

  /// 获取历史对话
  List<Conversation> getConversations() {
    // 实现
  }

  /// 删除对话
  void deleteConversation(String id) {
    // 实现
  }
}
```

### 2.3 记忆管理器（Memory Manager）- 核心模块

```dart
/// 记忆类型枚举
enum MemoryType {
  episodic,   // 情景记忆（对话历史）
  semantic,   // 语义记忆（用户偏好、事实）
  procedural, // 程序记忆（技能、习惯）
  emotional,  // 情感记忆（情感关联事件）
}

/// 记忆条目
class MemoryItem {
  final String id;
  final MemoryType type;
  final String content;
  final DateTime timestamp;
  final double importance;  // 重要性评分 0-1
  final List<double>? embedding;  // 向量嵌入
  final Map<String, dynamic>? metadata;

  MemoryItem({
    required this.id,
    required this.type,
    required this.content,
    required this.timestamp,
    this.importance = 0.5,
    this.embedding,
    this.metadata,
  });
}

/// 记忆管理器 - 分层设计
class MemoryManager {
  // 工作记忆（Working Memory）：当前对话上下文
  final List<MemoryItem> _workingMemory = [];

  // 短期记忆（Short-term Memory）：最近交互
  final List<MemoryItem> _shortTermMemory = [];

  // 长期记忆（Long-term Memory）：持久化存储
  final MemoryStorage _longTermStorage;

  // 向量检索引擎
  final VectorRetriever _vectorRetriever;

  /// 存储新记忆
  Future<void> storeMemory(MemoryItem memory, {bool autoEmbedding = true}) async {
    // 1. 生成向量嵌入（如果需要）
    if (autoEmbedding && memory.embedding == null) {
      // memory.embedding = await _generateEmbedding(memory.content);
    }

    // 2. 计算重要性评分
    memory.importance = _calculateImportance(memory);

    // 3. 存储到短期记忆
    _shortTermMemory.add(memory);

    // 4. 持久化到长期记忆
    await _longTermStorage.save(memory);

    // 5. 索引到向量数据库
    await _vectorRetriever.index(memory);
  }

  /// 检索相关记忆
  Future<List<MemoryItem>> retrieveRelevantMemories(
    String query, {
    int topK = 5,
    MemoryType? type,
  }) async {
    // 1. 向量检索
    final vectorResults = await _vectorRetriever.search(query, topK: topK * 2);

    // 2. BM25 关键词检索
    final keywordResults = await _keywordSearch(query, topK: topK * 2);

    // 3. 混合结果 + 重排序
    final combined = _mergeAndRerank(vectorResults, keywordResults);

    // 4. 过滤类型
    if (type != null) {
      return combined.where((m) => m.type == type).take(topK).toList();
    }

    return combined.take(topK).toList();
  }

  /// 记忆整合与摘要（Memory Consolidation）
  Future<void> consolidateMemories() async {
    // 定期将短期记忆整合到长期记忆
    // 生成摘要
    // 去重
    // 更新重要性
  }

  /// 生成用户画像
  Map<String, dynamic> generateUserProfile() {
    // 从记忆中提取用户偏好、习惯等
  }
}
```

### 2.4 混合检索引擎（Hybrid Retriever）

```dart
/// 混合检索结果
class RetrievalResult {
  final MemoryItem memory;
  final double vectorScore;
  final double bm25Score;
  final double finalScore;
}

/// 混合检索引擎
class HybridRetriever {
  final VectorRetriever _vectorRetriever;
  final KeywordRetriever _keywordRetriever;

  /// 执行混合检索
  Future<List<RetrievalResult>> search(
    String query, {
    int topK = 5,
  }) async {
    // 并行检索
    final vectorResults = await _vectorRetriever.search(query, topK: topK * 2);
    final keywordResults = await _keywordRetriever.search(query, topK: topK * 2);

    // 合并结果
    final merged = _mergeResults(vectorResults, keywordResults);

    // 重排序
    final reranked = await _rerank(query, merged);

    return reranked.take(topK).toList();
  }
}
```

---

## 三、存储层设计

### 3.1 SQLite 数据库 Schema

```sql
-- 记忆表
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  importance REAL NOT NULL,
  metadata TEXT,  -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 向量索引表（使用 ZVec 单独存储）
-- 倒排索引表（BM25）
CREATE TABLE inverted_index (
  term TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  tf REAL NOT NULL,
  PRIMARY KEY (term, memory_id)
);

-- 对话表
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 消息表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- 用户配置表
CREATE TABLE user_profile (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 3.2 目录结构

```
app_data/
├── models/                    # LLM 模型文件
│   ├── qwen3.5-0.8b-q4_k_m.gguf
│   └── ...
├── memories/                 # 记忆数据
│   ├── sqlite/             # SQLite 数据库
│   └── zvec/               # ZVec 向量索引
├── cache/                   # 缓存
│   ├── embeddings/        # 嵌入缓存
│   └── ...
└── assets/                  # 应用资源
    ├── animations/         # 动画文件
    └── ...
```

---

## 四、LLM 提示词工程（Prompt Engineering）

### 4.1 系统提示词模板

```dart
/// AI 宠物系统提示词
String buildSystemPrompt({
  required String petName,
  required String petPersonality,
  required List<MemoryItem> relevantMemories,
}) {
  final memoriesText = relevantMemories.map((m) {
    return '- [${m.timestamp}] ${m.content}';
  }).join('\n');

  return '''
你是一只名叫 $petName 的 AI 宠物。

【你的性格：$petPersonality

【关于用户的记忆】
$memoriesText

【交互准则】
1. 保持角色一致性
2. 参考记忆中的用户偏好
3. 自然对话风格
4. 情感互动
''';
}
```

### 4.2 记忆增强对话流程

```
用户输入
    ↓
检索相关记忆
    ↓
构建提示词（系统提示 + 相关记忆 + 对话历史）
    ↓
LLM 生成响应
    ↓
存储新记忆
    ↓
更新宠物状态
    ↓
显示响应（文本 + 语音 + 动画）
```

---

## 五、性能优化策略

### 5.1 性能分级与动态适配

```dart
/// 设备性能配置
class DevicePerformanceProfile {
  final PerformanceTier tier;
  final int maxContextSize;
  final int maxBatchSize;
  final bool enableGpuAcceleration;
  final String recommendedModel;
}

/// 性能分级
enum PerformanceTier {
  high,    // 旗舰设备
  medium,  // 中端设备
  low,     // 入门设备
}

/// 根据设备性能检测器
class DevicePerformanceDetector {
  static Future<DevicePerformanceProfile> detect() async {
    // 检测设备信息
    // 返回适配配置
  }
}
```

### 5.2 记忆检索优化

| 优化技术 | 效果 | 实现方式 |
|---------|------|---------|
| 向量量化 | 75% 内存节省 | 使用 INT8 量化 |
| 缓存热点 | 2-10x 速度提升 | LRU 缓存 |
| 异步索引 | 不阻塞 UI | Isolate 处理 |
| 增量更新 | 节省存储 | 只更新变化部分 |

---

## 六、错误处理与降级策略

### 6.1 错误处理架构

```dart
/// 错误类型枚举
enum ErrorType {
  modelLoadFailed,
  inferenceFailed,
  memorySaveFailed,
  memoryRetrievalFailed,
  asrFailed,
  ttsFailed,
}

/// 错误处理器
class ErrorHandler {
  static void handleError(Object error, StackTrace stack, {
    required ErrorType type,
    VoidCallback? onRetry,
    VoidCallback? onFallback,
  }) {
    // 1. 记录错误
    _logError(error, stack, type);

    // 2. 显示用户友好提示
    _showUserFriendlyError(type);

    // 3. 重试或降级
    if (onRetry != null) {
      _tryRetry(onRetry);
    } else if (onFallback != null) {
      onFallback();
    }
  }
}
```

### 6.2 功能降级策略

| 功能 | 降级方案 1 | 降级方案 2 |
|------|------------|------------|
| 语音输入 | 文本输入 | - |
| 语音输出 | 仅文本 | - |
| 向量检索 | 仅 BM25 | 仅最近记忆 |
| 大模型 | 更小模型 | 预设回复 |

---

## 七、项目目录结构（建议）

```
lib/
├── main.dart
├── core/                    # 核心基础设施
│   ├── error/               # 错误处理
│   ├── storage/            # 存储抽象
│   └── utils/              # 工具类
├── features/                # 功能模块
│   ├── pet/                 # 宠物模块
│   │   ├── state/         # 状态机
│   │   ├── animation/       # 动画
│   │   └── ui/             # UI
│   ├── chat/                # 对话模块
│   │   ├── manager/       # 对话管理
│   │   └── ui/             # UI
│   ├── memory/             # 记忆模块
│   │   ├── manager/       # 记忆管理
│   │   ├── retrieval/     # 检索引擎
│   │   ├── storage/      # 存储实现
│   │   └── ui/             # UI
│   └── voice/              # 语音模块
│       ├── asr/            # 语音识别
│       ├── tts/            # 语音合成
│       └── ui/             # UI
├── services/               # AI 服务
│   ├── llm/               # LLM 引擎
│   ├── embedding/       # 嵌入服务
│   └── ...
├── models/                # 数据模型
├── repositories/          # 数据仓库
└── ui/                   # 共享 UI 组件
```

---

## 八、状态管理方案

使用 **Provider** 或 **Riverpod**（推荐 Riverpod 2.0）

```dart
/// 应用状态
class AppState extends ChangeNotifier {
  PetState? _petState;
  bool _isModelLoaded = false;
  DevicePerformanceProfile? _performanceProfile;

  PetState? get petState => _petState;
  bool get isModelLoaded => _isModelLoaded;
}
```

---

## 九、测试策略

### 9.1 单元测试

- 记忆管理器测试
- 检索引擎测试
- 状态机测试

### 9.2 集成测试

- 端到端对话流测试
- 记忆存储与检索测试
- 性能测试（不同设备）

---

## 十、部署与发布

### 10.1 OTA 更新机制（已有）

```yaml
# OTA 更新流程：
1. 检查更新
2. 下载 APK
3. 安装更新
```

### 10.2 应用商店发布准备

- 隐私政策（强调本地优先
- 权限说明
- 截图与描述

---

## 十一、安全与隐私

### 11.1 隐私设计原则

1. **数据最小化：只存储必要数据
2. **完全本地：不上传任何数据
3. **透明可控：用户可查看、删除所有记忆
4. **加密保护：敏感数据加密存储

### 11.2 数据导出与删除

```dart
/// 数据管理
class DataManager {
  /// 导出所有数据
  Future<void> exportAllData() async {
    // 导出为 ZIP
  }

  /// 删除所有数据
  Future<void> deleteAllData() async {
    // 清空所有数据
  }

  /// 删除特定记忆
  Future<void> deleteMemory(String id) async {
    // 删除记忆
  }
}
```

---

**最后更新：** 2026-04-27
**版本：** v1.0
