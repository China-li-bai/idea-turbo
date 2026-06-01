## Why

flutter_demo 当前所有状态管理均通过 `StatefulWidget` + `setState` 实现，导致：
1. **状态与 UI 强耦合** — `_PetAppShellState` 同时持有聊天消息列表、AI 服务实例、初始化状态、错误状态等多个职责，违反 SRP
2. **状态不可测试** — 业务逻辑（消息发送、持久化、AI 调用）嵌入 Widget 生命周期，无法独立单元测试
3. **跨页面状态共享困难** — `_AppEntry` 中的模型路径选择结果通过构造函数传递，随着功能增长将产生 prop drilling
4. **数据流不透明** — `setState` 调用散布在异步回调中，缺乏统一的意图→状态→视图数据流

随着 mnemosyne 包的 memory/pet/xiang 功能逐步集成到 flutter_demo，当前模式将无法支撑多模块状态协调。现在重构可避免技术债累积。

## What Changes

- 引入统一的状态管理方案（基于 `ChangeNotifier` + `InheritedNotifier` 的轻量模式），将业务状态从 Widget 中抽离为独立的 `Notifier` 类
- 将 `_PetAppShellState` 中的聊天逻辑拆分为 `ChatNotifier`，管理消息列表、发送状态、持久化
- 将 `_AppEntry` 中的模型选择逻辑拆分为 `ModelSelectionNotifier`，管理模型路径、设备性能评估
- 将 `AiService` 的生命周期管理从 Widget 移至 `ChatNotifier`，实现服务与 UI 解耦
- 建立统一的状态提供层（`AppProviders`），为后续 mnemosyne 集成提供扩展点
- 保持 `SharedPreferences` 作为持久化层不变，仅改变状态持有和通知方式

## Capabilities

### New Capabilities
- `chat-state`: 聊天消息列表的状态管理，包括消息增删、发送状态、持久化读写、AI 服务调用编排
- `model-selection-state`: 本地模型选择与设备性能评估的状态管理，包括模型路径解析、设备分级、模型推荐
- `app-state-provider`: 统一的状态提供层，将各 Notifier 注入 Widget 树，为后续 mnemosyne 模块集成提供扩展点

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **受影响模块**: flutter_demo（Presentation 层），不涉及 mnemosyne 或 edgevec 包
- **受影响文件**: `main.dart`、`pet/pet_app_shell.dart`、`pet/services/ai_service.dart`、`data/services/device_performance_service.dart`
- **新增文件**: `ChatNotifier`、`ModelSelectionNotifier`、`AppProviders` 等 Notifier 和 Provider 类
- **依赖变更**: 无新增第三方依赖，使用 Flutter 内置 `ChangeNotifier` + `InheritedNotifier`
- **API 影响**: 无公开 API 变更，纯内部重构
- **本地/远程**: 纯本地变更，不涉及远程同步
- **Breaking**: 无对外 breaking change，仅内部结构重组

## Non-goals

- 不引入 Riverpod / BLoC / Provider 等第三方状态管理包（当前规模不需要）
- 不重构 mnemosyne 包内部的状态管理
- 不改变数据持久化方式（继续使用 SharedPreferences + 本地文件）
- 不增加远程 API 集成（保持 local-first）
- 不改变 UI 布局和视觉设计
