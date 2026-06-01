## 1. ChatMessage 值对象

- [ ] 1.1 创建 `flutter_demo/lib/data/models/chat_message.dart`：定义不可变 ChatMessage 类，包含 role（enum ChatRole）、text、createdAt 字段，支持 toJson/fromJson 序列化
  - 验证：类型检查通过，JSON round-trip 测试通过

## 2. ChatNotifier

- [ ] 2.1 创建 `flutter_demo/lib/pet/notifiers/chat_notifier.dart`：实现 ChatNotifier extends ChangeNotifier，持有 messages（不可变 List）、isSending、isInitializing、error 状态字段
  - 验证：类型检查通过
- [ ] 2.2 实现 `initialize(String modelPath)` 方法：初始化 AiService、加载持久化消息、更新 isInitializing/error 状态
  - 验证：调用后 isInitializing 从 true 变为 false
- [ ] 2.3 实现 `sendMessage(String text)` 方法：校验 isSending/isInitializing → 追加用户消息 → 调用 AiService → 追加助手消息 → 持久化，失败时设置 error
  - 验证：发送后 messages 包含用户+助手两条消息
- [ ] 2.4 实现 `clearMessages()` 方法：清空 messages 列表并删除 SharedPreferences 中的存储键
  - 验证：调用后 messages 为空列表
- [ ] 2.5 实现 `_loadMessages()` 和 `_saveMessages()` 私有方法：从 SharedPreferences 读写消息，处理损坏数据
  - 验证：app 重启后消息恢复
- [ ] 2.6 实现 `dispose()` 方法：调用 AiService.dispose() 和 super.dispose()
  - 验证：无内存泄漏警告

## 3. ModelSelectionNotifier

- [ ] 3.1 创建 `flutter_demo/lib/data/notifiers/model_selection_notifier.dart`：实现 ModelSelectionNotifier extends ChangeNotifier，持有 selectedModelPath、isChecking、devicePerformance、error 状态字段
  - 验证：类型检查通过
- [ ] 3.2 实现 `checkExistingModel()` 方法：读取 SharedPreferences 中的模型文件名 → 检查文件存在性 → 回退到默认模型/可用模型 → 评估设备性能
  - 验证：有模型时 selectedModelPath 非空，无模型时为 null
- [ ] 3.3 实现 `selectModel(ModelConfig config)` 方法：解析文件路径 → 检查文件存在 → 更新 selectedModelPath 和 SharedPreferences
  - 验证：选择后 selectedModelPath 更新，SharedPreferences 持久化

## 4. InheritedNotifier 包装层

- [ ] 4.1 创建 `flutter_demo/lib/pet/notifiers/chat_notifier_provider.dart`：实现 ChatNotifierProvider extends InheritedNotifier<ChatNotifier>，提供 static of(context) 和 maybeOf(context)
  - 验证：类型检查通过
- [ ] 4.2 创建 `flutter_demo/lib/data/notifiers/model_selection_provider.dart`：实现 ModelSelectionNotifierProvider extends InheritedNotifier<ModelSelectionNotifier>，提供 static of(context) 和 maybeOf(context)
  - 验证：类型检查通过

## 5. AppProviders 统一注入层

- [ ] 5.1 创建 `flutter_demo/lib/app_providers.dart`：实现 AppProviders StatefulWidget，在树顶部创建并注入 ChatNotifier 和 ModelSelectionNotifier，dispose 时清理
  - 验证：类型检查通过，子 widget 可通过 of(context) 访问 Notifier

## 6. Widget 迁移

- [ ] 6.1 重构 `flutter_demo/lib/pet/pet_app_shell.dart`：PetAppShell 改为 StatelessWidget 或精简 StatefulWidget，通过 ChatNotifierProvider.of(context) 读写聊天状态，移除直接 setState 调用
  - 验证：聊天功能行为不变（发送、接收、清空、滚动）
- [ ] 6.2 重构 `flutter_demo/lib/main.dart`：_AppEntry 改为通过 ModelSelectionNotifierProvider.of(context) 读取模型选择状态，移除直接 setState 和构造函数传参
  - 验证：模型检测和页面路由行为不变
- [ ] 6.3 更新 `flutter_demo/lib/main.dart` 的 MyApp.build：在 MaterialApp 外包裹 AppProviders
  - 验证：app 启动正常，所有页面可访问

## 7. 单元测试

- [ ] 7.1 创建 `flutter_demo/test/data/models/chat_message_test.dart`：测试 ChatMessage 的 JSON 序列化/反序列化、不可变性
  - 验证：flutter test 通过
- [ ] 7.2 创建 `flutter_demo/test/pet/notifiers/chat_notifier_test.dart`：测试 sendMessage、clearMessages、initialize、错误处理、持久化逻辑（mock AiService 和 SharedPreferences）
  - 验证：flutter test 通过
- [ ] 7.3 创建 `flutter_demo/test/data/notifiers/model_selection_notifier_test.dart`：测试 checkExistingModel、selectModel、回退逻辑（mock 文件系统和 SharedPreferences）
  - 验证：flutter test 通过

## 8. 集成验证

- [ ] 8.1 运行 `flutter analyze --no-pub` 确保零警告
  - 验证：analyze 输出无 error/warning
- [ ] 8.2 运行 `flutter test --no-pub` 确保所有测试通过
  - 验证：全部测试绿色
- [ ] 8.3 手动验证 app 启动、聊天发送、模型切换、消息持久化功能正常
  - 验证：UI 行为与重构前一致
