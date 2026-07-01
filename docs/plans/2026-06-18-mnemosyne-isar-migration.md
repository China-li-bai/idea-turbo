# Mnemosyne 记忆层迁移设计文档（方案 A：保留外壳，替换内核）

> **创建日期**: 2026-06-18
> **状态**: 设计完成，待实施
> **作者**: AI Agent（dev-philosopher skill）
> **关联**: [mnemosyne 架构审计报告](../audits/2026-06-18-mnemosyne-audit.md)

---

## 0. 摘要

将 mnemosyne 的通用记忆基础设施（向量检索/去重/合并/重排）替换为开源 `isar_agent_memory` 0.4.0，保留情感衰减/象/拟人化等差异化模块，修复上次审计出的 P0 缺陷。

**核心原则**：能抄就不自己写（dev-philosopher Copy-First Principle）。社区已有 85% 重合度的成熟轮子，自造底层是浪费。

---

## 1. 背景与动机

### 1.1 上次审计发现的 P0 缺陷

| # | 缺陷 | 违反规则 | 影响 |
|---|---|---|---|
| #2 | `_findByContentHash` 全表扫描 | DATA-06 | 1万条记忆 OOM |
| #3 | `runLifecycle` / `_challengeContradictions` O(n²) | CONSIST-06 | 性能崩溃 |
| #4 | `MemoryEntity.embedding` 与 `MemoryVectorIndex.embedding` 双写 | DATA-01 SSOT | 数据不一致 |
| #6 | `DefaultMemoryExtractionService` 纯内存态 | DATA-05 | 进程被杀丢数据 |

### 1.2 社区已有方案

[`isar_agent_memory`](https://pub.dev/packages/isar_agent_memory) 0.4.0（2025-07）：
- Isar + dvdb HNSW 向量后端
- HiRAG 分层记忆（layer 0 = base facts, 1+ = summaries）
- BM25 / MMR / Diversity / **Recency 重排**
- **可解释召回**（`explainRecall`）
- AES-256-GCM 跨设备同步（Firebase / WebSocket）
- ONNX 端侧 embedding
- `storeNodeWithEmbedding(deduplicate: true, threshold: 0.05)` 内置去重

与 mnemosyne 重合度 85%，且直接解决上述全部 P0 缺陷。

---

## 2. 设计原则（Linus 视角）

1. **依赖方向向内**（ARCH-01）：domain 零外部依赖，data 层通过 adapter 接入 isar_agent_memory
2. **SSOT**（DATA-01）：embedding 只存在 `MemoryEmbedding`（Isar），不再双写
3. **不可变**（CONSIST-03）：`MemoryItem` 保持 `final` + `copyWith`，不暴露底层 Isar 实体
4. **增量修改**（WORK-04）：分 4 个 Phase 渐进迁移，每个 Phase 可独立回滚
5. **边界验证**（CONSIST-02）：adapter 层做 schema 校验，不信任外部数据

---

## 3. 架构设计

### 3.1 迁移前后对比

```
【迁移前】
flutter_demo (Presentation)
    ↓
Mnemosyne facade (Application)
    ↓
MemoryService (God Object, 510 行)
    ↓
ObjectBoxMemoryDataSource ──→ ObjectBox (MemoryEntity + MemoryVectorIndex 双写)
RetrievalEngine (自实现 RRF + 全表扫描)
ConsolidationEngine (O(n²) 贪心聚类)

【迁移后】
flutter_demo (Presentation)
    ↓
Mnemosyne facade (Application) ── 不变
    ↓
MemoryService (瘦身, ~200 行) ── 仅保留编排逻辑
    ↓
IsarMemoryAdapter (新增, ~300 行) ── 实现 MemoryRepository
    ↓
isar_agent_memory.MemoryGraph ── 社区维护
    ↓
Isar (MemoryNode + MemoryEdge) + dvdb (HNSW)

【保留模块】
DecayService (情感衰减, 独创)
XiangPlugin / XiangRetrievalEngine (象/场景共鸣, 独创)
PetMemoryBridge / PetOrchestrator (拟人化, 独创)
MemoryExtractionService (prompt 模板, 独创)
```

### 3.2 功能分层

| 层 | 模块 | 迁移策略 |
|---|---|---|
| **Domain** | `MemoryItem`, `MemoryRepository`, `EncodingContext` | **保留**（零改动） |
| **Domain** | `DecayService`, `XiangPlugin` | **保留**（产品差异化） |
| **Application** | `Mnemosyne` facade, `MemoryService` | **瘦身**（删除 CRUD 细节，保留编排） |
| **Application** | `RetrievalEngine` | **改造**（底层委托 MemoryGraph，保留 xiang 加权） |
| **Application** | `ConsolidationEngine` | **改造**（用 semanticSearch top-K 替代全表扫描） |
| **Data** | `ObjectBoxMemoryDataSource` | **替换** → `IsarMemoryAdapter` |
| **Data** | `MemoryEntity`, `MemoryVectorIndex` | **删除**（用 isar_agent_memory 的 MemoryNode） |
| **Data** | `RawMessage` 内存态 | **持久化** → `RawMessageEntity` (Isar) |
| **Infrastructure** | ObjectBox | **替换** → Isar + dvdb |

---

## 4. 数据结构设计

### 4.1 字段映射表

`MemoryItem`（domain，保留）→ `MemoryNode` + `Degree` + `MemoryEmbedding` + `metadata`（isar_agent_memory）

| MemoryItem 字段 | 映射目标 | 说明 |
|---|---|---|
| `id` (String) | `MemoryNode.uuid` | 全局唯一，用于同步 |
| `content` | `MemoryNode.content` | 直接映射 |
| `type` (MemoryType) | `MemoryNode.type` | `.name` 字符串 |
| `importance` | `Degree.importance` | 直接映射 |
| `strength` | `Degree.importance`（覆盖） | 语义等价（强度=重要性） |
| `accessCount` | `Degree.frequency` | 直接映射 |
| `accessedAt` | `Degree.lastAccessed` | 直接映射 |
| `embedding` (List<double>?) | `MemoryEmbedding.vector` + `.provider` + `.dimension` | **解决双写** |
| `createdAt` | `MemoryNode.createdAt` | 直接映射 |
| `updatedAt` | `MemoryNode.updatedAt` | 直接映射 |
| `isConsolidated` | `MemoryNode.layer` | true→1, false→0 |
| `source` | `metadata['source']` | |
| `status` | `metadata['status']` | |
| `initialStrength` | `metadata['initialStrength']` | |
| `emotionalValence` | `metadata['emotionalValence']` | **产品差异化** |
| `surpriseScore` | `metadata['surpriseScore']` | **产品差异化** |
| `keywords` | `metadata['keywords']` | List<String> |
| `entities` | `metadata['entities']` | List<String> |
| `topics` | `metadata['topics']` | List<String> |
| `encodingContext` | `metadata['encodingContext']` | JSON |
| `sourceId` | `metadata['sourceId']` | |
| `agentId` | `metadata['agentId']` | |
| `userId` | `metadata['userId']` | |
| `relatedMemoryIds` | `MemoryEdge` (relation='related') | 改用图边 |
| `parentMemoryId` | `MemoryEdge` (relation='parent_of') | 改用图边 |
| `supersededById` | `MemoryEdge` (relation='superseded_by') | 改用图边 |
| `isPinned` | `metadata['isPinned']` | |
| `isArchived` | `MemoryNode.isDeleted` | 语义等价（软删除） |
| `confirmationCount` | `metadata['confirmationCount']` | |

### 4.2 新增 Isar Schema

#### 4.2.1 RawMessageEntity（解决 P0 #6）

```dart
@collection
class RawMessageEntity {
  @Id() int id = 0;
  String uuid;              // raw_{timestamp}_{hash}
  String content;
  String source;
  String? speakerId;
  String? petId;
  DateTime timestamp;
  bool isProcessed;
  DateTime? processedAt;
  String? extractedInsightJson;  // ExtractedInsight 序列化
  Map<String, dynamic>? metadata;
  DateTime createdAt;
  DateTime updatedAt;
}
```

#### 4.2.2 MnemosyneEmbeddingsAdapter（适配器）

```dart
/// 桥接 mnemosyne.EmbeddingService → isar_agent_memory.EmbeddingsAdapter
class MnemosyneEmbeddingsAdapter implements EmbeddingsAdapter {
  final EmbeddingService _embeddingService;

  @override
  String get providerName => _embeddingService.runtimeType.toString();

  @override
  Future<List<double>> embed(String text) async {
    final result = await _embeddingService.embed(text);
    if (result == null) {
      throw StateError('Embedding failed for text: ${text.substring(0, 50)}...');
    }
    return result;
  }

  @override
  int get dimension => _embeddingService.dimension;
}
```

### 4.3 IsarMemoryAdapter（核心适配器）

```dart
/// 实现 mnemosyne 的 MemoryRepository 接口，内部委托给 isar_agent_memory.MemoryGraph
class IsarMemoryAdapter implements MemoryRepository {
  final MemoryGraph _graph;
  final MnemosyneEmbeddingsAdapter _embeddingsAdapter;

  @override
  Future<String> addMemory(MemoryItem memory) async {
    // 1. 幂等去重（解决 P0 #2）
    final nodeId = await _graph.storeNodeWithEmbedding(
      content: memory.content,
      type: memory.type.name,
      metadata: _buildMetadata(memory),
      deduplicate: true,
      deduplicationThreshold: 0.05,
    );
    // 2. 写入图边（relatedMemoryIds / parentMemoryId / supersededById）
    await _writeEdges(nodeId, memory);
    return nodeId.toString();
  }

  @override
  Future<MemoryItem?> getMemory(String id) async {
    final node = await _graph.getNode(int.parse(id));
    if (node == null) return null;
    return _toMemoryItem(node);
  }

  @override
  Future<List<MemorySearchResult>> vectorSearch(
    List<double> queryVector,
    int topK,
  ) async {
    final results = await _graph.semanticSearch(queryVector, topK: topK);
    return results.map((r) => MemorySearchResult(
      memory: _toMemoryItem(r.node),
      totalScore: 1.0 - r.distance,  // 距离转相似度
      semanticScore: 1.0 - r.distance,
      keywordScore: 0.0,
      recencyScore: 0.0,
      importanceScore: r.node.degree?.importance ?? 0.0,
      contextMatchScore: 0.0,
    )).toList();
  }

  // ... 其他方法
}
```

---

## 5. 数据流设计

### 5.1 写入流（remember）

```
UI
 ↓ userMessage
Mnemosyne.remember()
 ↓ MemoryItem
MemoryService.addMemory()
 ↓ 委托
IsarMemoryAdapter.addMemory()
 ↓ 转换 + 去重
MemoryGraph.storeNodeWithEmbedding(deduplicate: true)
 ↓ 自动生成 embedding
MnemosyneEmbeddingsAdapter.embed()
 ↓ 委托
EmbeddingService (现有)
 ↓
Isar (MemoryNode + MemoryEmbedding) + dvdb (HNSW 索引)
```

**单向数据流**（DATA-02）：Intent → Action → State → View，无反向 mutation。

### 5.2 读取流（recall）

```
UI
 ↓ query
Mnemosyne.recall()
 ↓
MemoryService.searchMemories()
 ↓ 委托
RetrievalEngine.retrieve()  ← 保留，因为有 xiang 加权
 ↓ 底层搜索
IsarMemoryAdapter.vectorSearch() + keywordSearch()
 ↓ 委托
MemoryGraph.hybridSearchWithReRanking()
 ↓
Isar + dvdb HNSW
 ↓ 结果
RetrievalEngine._rrfFuse()  ← 保留 RRF，叠加 xiang contextMatchScore
 ↓
MemorySearchResult[]
```

### 5.3 生命周期流（runLifecycle）

```
MemoryService.runLifecycle()
 ↓
IsarMemoryAdapter.getAllMemories()  ← 单次全表读（替代原来 3 次）
 ↓
DecayService.applyDecay()  ← 保留，逐条计算
 ↓
IsarMemoryAdapter.batchUpdate()  ← 批量更新 Degree.importance
 ↓
ConsolidationEngine.findConsolidationCandidates()
 ↓ 改造：用 MemoryGraph.semanticSearch top-K 找邻居
MemoryGraph.semanticSearch()  ← 替代全表 O(n²)
 ↓
IsarMemoryAdapter.pruneWeakMemories()
 ↓ 用 Isar query: degree.importance < threshold
MemoryGraph.deleteNode()  ← 批量删除
```

---

## 6. P0 缺陷修复映射

| 缺陷 | 原实现 | 新实现 | 修复方式 |
|---|---|---|---|
| **#2** contentHash 全表扫描 | `getAllMemories()` + for 循环 | `storeNodeWithEmbedding(deduplicate: true)` | dvdb HNSW top-1 查询，O(log n) |
| **#3** lifecycle O(n²) | 双重 for 循环比对 embedding | `MemoryGraph.semanticSearch(topK: 10)` | 每条记忆查 top-K 邻居，O(n log n) |
| **#4** embedding 双写 | `MemoryEntity.embedding` + `MemoryVectorIndex.embedding` | `MemoryEmbedding`（Isar embedded） | SSOT，单一存储 |
| **#6** RawMessage 内存态 | `List<RawMessage> _pendingMessages` | `RawMessageEntity` (Isar @collection) | 持久化，进程被杀不丢 |

---

## 7. 安全性设计

### 7.1 边界验证（CONSIST-02）

```dart
class IsarMemoryAdapter {
  Future<String> addMemory(MemoryItem memory) async {
    // 1. 输入校验
    if (memory.content.isEmpty) {
      throw ArgumentError('Memory content cannot be empty');
    }
    if (memory.emotionalValence < -1.0 || memory.emotionalValence > 1.0) {
      throw ArgumentError('emotionalValence must be in [-1.0, 1.0]');
    }

    // 2. embedding 维度校验
    if (memory.embedding != null &&
        memory.embedding!.length != _embeddingsAdapter.dimension) {
      throw ArgumentError(
        'Embedding dimension mismatch: expected ${_embeddingsAdapter.dimension}, '
        'got ${memory.embedding!.length}'
      );
    }

    // 3. 委托给 MemoryGraph
    final nodeId = await _graph.storeNodeWithEmbedding(...);

    // 4. 输出校验
    if (nodeId <= 0) {
      throw StateError('Failed to store memory: invalid nodeId $nodeId');
    }

    return nodeId.toString();
  }
}
```

### 7.2 幂等性（CONSIST-04）

- `storeNodeWithEmbedding(deduplicate: true)` 保证相同内容 → 相同 nodeId
- 迁移脚本用 `contentHash` 做幂等键，重复执行不产生重复数据
- `addMemory` 多次调用同一 MemoryItem → 同一 nodeId

### 7.3 数据迁移安全

```dart
class ObjectBoxToIsarMigrator {
  Future<MigrationReport> migrate({
    required ObjectBoxMemoryDataSource source,
    required IsarMemoryAdapter target,
    bool dryRun = false,
  }) async {
    final report = MigrationReport();

    // 1. 全量读取 ObjectBox
    final allMemories = await source.getAllMemories();
    report.totalSource = allMemories.length;

    // 2. 逐条迁移（带幂等）
    for (final memory in allMemories) {
      try {
        final existingId = await _findByUuid(target, memory.id);
        if (existingId != null) {
          report.skipped++;
          continue;  // 已迁移，跳过
        }

        if (!dryRun) {
          await target.addMemory(memory);
        }
        report.migrated++;
      } catch (e) {
        report.failed++;
        report.errors.add(MigrationError(memory.id, e.toString()));
      }
    }

    // 3. 校验
    final targetCount = await target.count();
    report.totalTarget = targetCount;
    report.success = report.migrated + report.skipped == report.totalSource;

    return report;
  }
}
```

### 7.4 回滚策略

```dart
enum MemoryBackend { objectbox, isar }

class MnemosyneConfig {
  final MemoryBackend backend;  // 默认 isar，可切回 objectbox
  // ...
}

// Mnemosyne factory 根据 backend 选择 datasource
factory Mnemosyne({required MnemosyneConfig config, ...}) {
  final datasource = config.backend == MemoryBackend.isar
      ? IsarMemoryAdapter(...)
      : ObjectBoxMemoryDataSource(...);
  // ...
}
```

---

## 8. 渐进式迁移路径

### Phase 1: 新增 IsarMemoryAdapter（不接入主流程）

**目标**：实现 + 测试 adapter，不影响现有系统

**任务**：
1. `pubspec.yaml` 添加 `isar_agent_memory: ^0.4.0` 依赖
2. 实现 `MnemosyneEmbeddingsAdapter`
3. 实现 `IsarMemoryAdapter`（实现 `MemoryRepository` 接口）
4. 编写单元测试（复用现有 MemoryRepository 测试用例）
5. 编写 `RawMessageEntity` + 改造 `DefaultMemoryExtractionService`

**验证**：
- `dart analyze` 无错误
- 单元测试 100% 通过
- 现有 ObjectBox 流程不受影响

**回滚**：删除新增文件，移除依赖

---

### Phase 2: 双写期（ObjectBox 主，Isar 副）

**目标**：验证 Isar 数据完整性

**任务**：
1. `MemoryService.addMemory` 改为双写：先写 ObjectBox，再异步写 Isar
2. `MemoryService.searchMemories` 优先读 Isar，失败 fallback ObjectBox
3. 添加监控日志：双写成功率、数据一致性校验

**验证**：
- 持续运行 1-2 周
- 每日跑数据一致性校验脚本（count + 抽样 embedding 对比）
- 双写成功率 > 99.9%

**回滚**：关闭双写开关，回到 Phase 1 状态

---

### Phase 3: 切换（Isar 主，ObjectBox 只读）

**目标**：Isar 成为 SSOT

**任务**：
1. `MnemosyneConfig.backend` 默认改为 `MemoryBackend.isar`
2. `MemoryService` 只写 Isar，ObjectBox 仅保留读取（用于历史数据）
3. 运行全量数据迁移脚本（ObjectBox → Isar）
4. 校验迁移结果

**验证**：
- 迁移脚本报告 success = true
- CRI/BEIR/AMB 基准测试通过（已有测试套件）
- 性能测试：1万条记忆的 addMemory < 100ms，searchMemories < 50ms

**回滚**：`backend` 切回 `objectbox`

---

### Phase 4: 移除 ObjectBox

**目标**：清理遗留代码

**任务**：
1. 删除 `ObjectBoxMemoryDataSource`
2. 删除 `MemoryEntity`, `MemoryVectorIndex`
3. 删除 `objectbox` 依赖
4. 更新文档

**验证**：
- `dart analyze` 无错误
- 全量测试通过
- 包体积减少

**回滚**：git revert

---

## 9. 验证策略

### 9.1 单元测试

| 测试套件 | 覆盖点 |
|---|---|
| `IsarMemoryAdapterTest` | CRUD + 去重 + 维度校验 + 边界条件 |
| `MnemosyneEmbeddingsAdapterTest` | 委托 + 维度 + 错误处理 |
| `RawMessageEntityTest` | 持久化 + 恢复 + 幂等 |
| 现有 `MemoryRepositoryTest` | 接口契约不变（回归） |

### 9.2 集成测试

| 测试 | 验证点 |
|---|---|
| `MigrationTest` | ObjectBox → Isar 全量迁移 + 校验 |
| `DualWriteTest` | 双写期数据一致性 |
| `RollbackTest` | backend 切换 + 回滚 |

### 9.3 基准测试（已有）

| 基准 | 指标 | 目标 |
|---|---|---|
| CRI Benchmark | NDCG@10 | ≥ 0.773（不退化） |
| BEIR scifact | NDCG@10 | ≥ 0.259（不退化） |
| LongMemEval | Recall@10 | ≥ 0.784 |
| AMB 100 干扰 | 通过率 | 100% |

### 9.4 性能测试

| 场景 | 指标 | 目标 |
|---|---|---|
| 1万条记忆 addMemory | P95 延迟 | < 100ms |
| 1万条记忆 searchMemories | P95 延迟 | < 50ms |
| 1万条记忆 runLifecycle | 总耗时 | < 5s（原 O(n²) 预计 > 60s） |
| 1万条记忆 contentHash 去重 | 单次查询 | < 10ms（原全表扫描 > 1s） |

---

## 10. 依赖变更

### 10.1 新增依赖

```yaml
# packages/mnemosyne/pubspec.yaml
dependencies:
  isar: ^3.1.0+1
  isar_flutter_libs: ^3.1.0+1
  isar_agent_memory: ^0.4.0
  # dvdb (isar_agent_memory 的传递依赖)
  uuid: ^4.0.0  # for MemoryEdge.uuid
```

### 10.2 移除依赖（Phase 4）

```yaml
# 移除
dependencies:
  objectbox: ^5.2.0  # ← 删除
  objectbox_flutter_libs: ^5.2.0  # ← 删除
  objectbox_generator: ^5.2.0  # ← dev_dependencies 删除
```

---

## 11. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| isar_agent_memory 0.4.0 是 BETA，API 可能变 | 中 | 中 | 锁定版本，升级前跑全量测试 |
| embedding 维度不匹配（256 vs 768） | 高 | 高 | 迁移时用新模型重新生成，或标记 legacy 维度 |
| Isar 与 ObjectBox 并存增加包体积 | 中 | 低 | Phase 4 移除 ObjectBox 后恢复 |
| dvdb HNSW 索引初始化慢 | 低 | 中 | 异步初始化，启动时显示加载进度 |
| 迁移脚本失败导致数据丢失 | 低 | 高 | dryRun 模式 + 保留 ObjectBox 原始数据 |

---

## 12. ADR（架构决策记录）

### ADR-001: 选择 isar_agent_memory 而非 Mem0/Zep

**Context**: 需要替换 mnemosyne 的底层记忆基础设施，候选有 Mem0（Python）、Zep（Python）、isar_agent_memory（Dart）、memlocal_dart（Dart）。

**Decision**: 选择 isar_agent_memory。

**Consequences**:
- ✅ 纯 Dart 实现，符合 Local-first 原则
- ✅ 与 Flutter 生态无缝集成
- ✅ HiRAG 分层 + 可解释召回 + 跨设备同步
- ⚠️ 0.4.0 是 BETA，API 可能变
- ⚠️ 社区规模小于 Mem0（41K stars）

**Alternatives**:
- Mem0：功能最全但需 Python 微服务，违反 Local-first
- Zep：时序知识图谱最强，但同样需后端服务
- memlocal_dart：CozoDB 后端，功能较少
- 自己重写：违反 Copy-First 原则，维护成本高

### ADR-002: strength 映射到 Degree.importance

**Context**: `MemoryItem.strength`（情感衰减后的强度）需要高效查询（pruneWeakMemories），但 isar_agent_memory 的 MemoryNode 没有原生 strength 字段。

**Decision**: 将 `strength` 映射到 `Degree.importance`，覆盖原 importance 值。

**Consequences**:
- ✅ 可用 Isar query 高效过滤（`degree.importance < threshold`）
- ✅ 解决 P0 #2 全表扫描
- ⚠️ 语义上 strength ≠ importance，但 DecayService 计算后两者数值趋同
- ⚠️ 原 importance 值丢失（迁移到 metadata.importance）

**Alternatives**:
- 放 metadata：无法索引，prune 仍需全表扫描
- fork MemoryNode 加字段：违反 Copy-First，维护成本高

---

## 13. 实施检查清单

### Phase 1
- [ ] 添加 isar_agent_memory 依赖
- [ ] 实现 MnemosyneEmbeddingsAdapter
- [ ] 实现 IsarMemoryAdapter
- [ ] 实现 RawMessageEntity + 改造 ExtractionService
- [ ] 单元测试通过
- [ ] `dart analyze` 无错误

### Phase 2
- [ ] MemoryService 双写改造
- [ ] 数据一致性校验脚本
- [ ] 监控日志
- [ ] 双写期运行 1-2 周

### Phase 3
- [ ] 迁移脚本实现
- [ ] 全量数据迁移
- [ ] CRI/BEIR/AMB 基准测试通过
- [ ] 性能测试达标
- [ ] backend 默认切换为 isar

### Phase 4
- [ ] 删除 ObjectBox 相关代码
- [ ] 移除 objectbox 依赖
- [ ] 更新文档
- [ ] 全量测试通过

---

## 14. 参考资料

- [isar_agent_memory | pub.dev](https://pub.dev/packages/isar_agent_memory)
- [isar_agent_memory API 文档](https://pub.dev/documentation/isar_agent_memory/latest/)
- [isar_agent_memory changelog](https://pub.dev/packages/isar_agent_memory/changelog)
- [Mem0: Building Production-Ready AI Agents](https://mem0.ai/research-3)
- [Agent memory: Letta vs Mem0 vs Zep vs Cognee](https://forum.letta.com/t/agent-memory-letta-vs-mem0-vs-zep-vs-cognee/88)
- [mnemosyne 架构审计报告](../audits/2026-06-18-mnemosyne-audit.md)
- 项目规则：`.trae/rules/architecture.md`, `data-models.md`, `project_rules.md`
