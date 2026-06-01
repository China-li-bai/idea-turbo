## Context

flutter_demo 是 idea-turbo 产品的展示层，当前仅包含两个核心页面：
- **PetAppShell** — 聊天主界面，持有 `_ChatMessage` 列表、`AiService` 实例、发送/初始化/错误状态
- **ModelDownloadPage** — 模型下载与选择页面
- **_AppEntry** — 入口 Widget，负责检测本地模型路径并路由到对应页面

所有状态均通过 `StatefulWidget.setState()` 管理，业务逻辑与 Widget 生命周期深度耦合。随着 mnemosyne 的 memory/pet/xiang 模块即将集成，需要建立可扩展的状态管理架构。

当前状态分布：

| 状态 | 持有者 | 问题 |
|------|--------|------|
| 聊天消息列表 | `_PetAppShellState._messages` | 可变 List，直接 add/clear |
| AI 服务实例 | `_PetAppShellState._aiService` | Widget 控制 service 生命周期 |
| 发送/初始化/错误 | `_PetAppShellState._isSending/_isInitializing/_error` | 散布的 bool/String |
| 模型路径 | `_AppEntryState._existingModelPath` | 构造函数传递，无全局访问 |
| 消息持久化 | `_PetAppShellState._loadMessages/_saveMessages` | Widget 直接操作 SharedPreferences |

## Goals / Non-Goals

**Goals:**
- 将业务状态从 Widget 中抽离为独立的 Notifier 类，实现状态与 UI 解耦
- 建立统一的单向数据流：Intent → Notifier → State → View
- 使业务逻辑可独立单元测试
- 为 mnemosyne 模块集成提供清晰的状态扩展点
- 保持零第三方状态管理依赖

**Non-Goals:**
- 不引入 Riverpod / BLoC / Provider 等第三方包
- 不重构 mnemosyne 包内部
- 不改变持久化方式
- 不改变 UI 布局

## Decisions

### DEC-1: 使用 ChangeNotifier + InheritedNotifier 作为状态管理方案

**选择**: Flutter 内置 `ChangeNotifier` + `InheritedNotifier` 组合

**替代方案**:
- **Riverpod 2.0+**: 功能强大，但当前 app 规模不需要，引入新依赖违反 WORK-07
- **BLoC/Cubit**: 事件驱动模式好，但样板代码多，对当前简单状态过重
- **原始 Provider**: 需要额外依赖，且 InheritedNotifier 已覆盖其核心功能

**理由**: 当前 app 仅有 2-3 个状态域，InheritedNotifier 提供了足够的能力且零依赖。当状态复杂度增长到需要依赖注入容器时，再迁移到 Riverpod。

### DEC-2: 状态域划分 — ChatNotifier / ModelSelectionNotifier

**选择**: 按业务域拆分为两个独立 Notifier

```
ChatNotifier
├── messages: List<ChatMessage> (不可变，通过 copyWith 模式更新)
├── isSending: bool
├── isInitializing: bool
├── error: String?
├── sendMessage(String text)
├── clearMessages()
└── initialize(String modelPath)

ModelSelectionNotifier
├── selectedModelPath: String?
├── isChecking: bool
├── devicePerformance: DevicePerformance?
├── checkExistingModel()
└── selectModel(ModelConfig config)
```

**理由**: 与 mnemosyne 的 feature 模块对齐（chat → social/pet，model → infrastructure），后续集成时每个 Notifier 可对应一个 mnemosyne feature 的状态桥接。

### DEC-3: 不可变消息列表 + 批量通知

**选择**: `ChatNotifier.messages` 使用 `List.unmodifiable()`，每次变更创建新列表

**理由**: 遵循 CONSIST-03（不可变数据默认），避免 UI 在 `notifyListeners()` 之前读到半更新状态。性能影响可忽略（聊天消息量级 < 1000）。

### DEC-4: AiService 生命周期由 ChatNotifier 管理

**选择**: `AiService` 实例由 `ChatNotifier` 创建和持有，Widget 不再直接接触 service

**理由**: 遵循 ARCH-02（模块边界通过接口），Widget 只关心"发送消息"意图和"消息列表"状态，不关心 AI 实现细节。

### DEC-5: AppProviders 作为统一注入层

**选择**: 创建 `AppProviders` StatelessWidget，在 Widget 树顶部注入所有 Notifier

```dart
AppProviders(
  child: MyApp(),
)
```

**理由**: 集中管理依赖注入点，后续添加 mnemosyne 的 MemoryNotifier / PetNotifier 时只需在此扩展，不侵入现有 Widget。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| InheritedNotifier 在大规模状态时性能不如 Riverpod | 当前 app 规模小，且每个 Notifier 粒度细，rebuild 范围可控 |
| ChangeNotifier 需要手动 dispose | AppProviders 使用 `StatefulWidget` 确保 `dispose` 调用 |
| 迁移过程中可能引入 UI 回归 | 逐个 Notifier 迁移，每步验证 UI 行为不变 |
| 未使用第三方包可能导致后续再迁移 | 设计 Notifier 接口与具体实现分离，迁移时只需替换注入层 |

## Migration Plan

1. **Phase 1**: 创建 `ChatNotifier` + `InheritedNotifier` 包装，迁移 PetAppShell 的聊天逻辑
2. **Phase 2**: 创建 `ModelSelectionNotifier`，迁移 _AppEntry 的模型选择逻辑
3. **Phase 3**: 创建 `AppProviders` 统一注入层，清理 Widget 中的业务代码
4. **Phase 4**: 添加单元测试覆盖 Notifier 逻辑

每个 Phase 独立可验证，可随时回滚到 `setState` 版本。

## Open Questions

- 是否需要为 `ChatNotifier` 定义抽象接口（如 `IChatNotifier`），以便未来替换实现？当前倾向于 YAGNI，等实际需要时再抽取
- `ModelSelectionNotifier` 是否应包含模型下载进度状态？当前 ModelDownloadPage 的下载逻辑较独立，暂不纳入
