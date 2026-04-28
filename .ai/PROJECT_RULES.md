# 📋 PROJECT_RULES.md - 项目规则

> 本文件定义项目开发规范和约束，AI 助手和开发者必须遵守。

---

## 技术栈

- **语言**: Dart 3.x (Flutter 3.x)
- **架构**: Clean Architecture (domain/data/presentation)
- **存储**: ObjectBox (向量搜索 + 持久化)
- **Monorepo**: pnpm workspaces + Melos

## 编码规范

### 命名
- 文件: `snake_case.dart`
- 类: `PascalCase`
- 函数/变量: `camelCase`
- 私有成员: `_underscorePrefix`
- 常量: `lowerCamelCase` (Dart 惯例)

### 结构
- 每个 Service 职责单一
- Barrel 文件 (`services.dart`, `entities.dart`) 管理导出
- Entity 使用 `copyWith` 模式
- JSON 序列化使用 `toJson()`/`fromJson()` 手写

### 测试
- 测试文件路径镜像源码路径: `lib/services/foo.dart` → `test/services/foo_test.dart`
- 测试组结构: `group('ClassName', { group('method', { test(...) }) })`
- 辅助函数以 `_` 前缀定义在测试文件内
- 参照 cognitive-memory 的测试标准（9-12个测试组/Service）

## 禁止事项

- ❌ 不使用 `sqflite` + FTS5（已替换为 ObjectBox）
- ❌ 不手写向量搜索算法（使用 ObjectBox HNSW）
- ❌ 不引入未验证的第三方包（必须先 WebSearch 验证真实性）
- ❌ 不在代码中硬编码 API Key 或 Secret
- ❌ 不大面积删除未理解的祖传代码（增量修改）

## 构建命令

```bash
# 静态分析
dart analyze packages/mnemosyne

# 运行测试
flutter test packages/mnemosyne/test

# 生成 ObjectBox 代码
dart run build_runner build
```
