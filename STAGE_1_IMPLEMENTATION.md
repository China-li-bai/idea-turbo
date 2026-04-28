# 🚀 第一阶段实施指南

## 📋 阶段目标 (1-2 周)

完成基础记忆系统架构，包括：
1. 数据模型设计
2. SQLite 存储层
3. 向量搜索集成
4. 基础 API

---

## 📦 1. 项目结构搭建

首先在 `flutter_demo/` 下建立以下结构：

```
flutter_demo/lib/
├── core/
│   ├── database/
│   │   ├── database_helper.dart
│   │   └── migrations/
│   └── error/
│       └── exceptions.dart
├── features/
│   └── memory/
│       ├── data/
│       │   ├── models/
│       │   └── datasources/
│       ├── domain/
│       │   ├── entities/
│       │   ├── repositories/
│       │   └── usecases/
│       └── presentation/
├── services/
│   └── vector/
└── main.dart
```

---

## 🧱 2. 数据模型定义 (1 天)

参考文件:
- `references/OpenMemory/packages/openmemory-py/src/openmemory/core/models.py`
- `references/mem0/mem0/memory/base.py`

**文件**: `flutter_demo/lib/features/memory/domain/entities/memory_item.dart`

```dart
enum MemoryType {
  episodic,    // 场景记忆
  semantic,    // 事实记忆
  preference,  // 用户偏好
  instruction, // 指令/规则
}

class MemoryItem {
  final String id;
  final String userId;
  final String content;
  final MemoryType type;
  final double importance;
  final List<double> embedding;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime? accessedAt;
  final DateTime? updatedAt;
  
  // ... constructor & methods
}
```

---

## 💾 3. SQLite 存储层 (2-3 天)

参考文件:
- `references/OpenMemory/packages/openmemory-py/src/openmemory/migrations/001_initial.sql`
- `references/sqlite-vector/examples/semantic_search/`

### 3.1 数据库 Schema

**表结构设计**:
- `memories` - 主表
- `memory_entities` - 实体表
- `memory_relations` - 关系表
- `memory_chunks` - 分块表 (可选)

### 3.2 Database Helper

**文件**: `flutter_demo/lib/core/database/database_helper.dart`

使用 `sqflite` + `sqlite_vector`

---

## 🎯 4. 向量搜索集成 (2 天)

参考文件:
- `references/sqlite-vector/packages/flutter/lib/sqlite_vector.dart`
- `references/mem0/mem0/vector_stores/base.py`

### 4.1 向量生成

目前我们的 `llamadart` 没有向量生成。方案:
- 方案 A: 用 `sqlite_vector` 自带的?
- 方案 B: 集成 `sentence_transformers` (通过 MethodChannel)?
- 方案 C: 先用小的本地向量模型 (ONNX)

### 4.2 搜索服务

**文件**: `flutter_demo/lib/services/vector/vector_search_service.dart`

```dart
class VectorSearchService {
  Future<List<MemoryItem>> search(
    String query, 
    {int limit = 10, double threshold = 0.7}
  );
  
  Future<List<double>> generateEmbedding(String text);
}
```

---

## 📚 5. 混合检索 (1-2 天)

参考文件:
- `references/mem0/mem0/utils/scoring.py`
- `references/OpenMemory/packages/openmemory-py/src/openmemory/utils/keyword.py`
- `packages/orama-local-search/src/`

混合检索 = 向量搜索 + 关键词搜索

实现简化版 BM25 或 TF-IDF。

---

## 🏗️ 6. Memory Repository (1 天)

参考文件:
- `references/OpenMemory/packages/openmemory-py/src/openmemory/main.py`
- `references/OpenMemory/packages/openmemory-js/src/index.ts`

**文件**: `flutter_demo/lib/features/memory/data/repositories/memory_repository_impl.dart`

```dart
class MemoryRepository {
  Future<void> add(MemoryItem memory);
  
  Future<void> update(MemoryItem memory);
  
  Future<void> delete(String id);
  
  Future<List<MemoryItem>> search(String query);
  
  Future<List<MemoryItem>> getByType(MemoryType type);
  
  Future<MemoryItem?> get(String id);
}
```

---

## ✅ 验收标准

- [ ] 能存储记忆并持久化
- [ ] 能做向量相似度搜索
- [ ] 能做关键词搜索
- [ ] 能按类型/时间过滤
- [ ] 有单元测试
- [ ] 有示例/演示代码

