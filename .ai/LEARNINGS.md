# 🧠 LEARNINGS.md - 开发经验沉淀

> 每次解决复杂 Bug、踩框架坑、或引入新最佳实践后，必须追加到此文件。

---

## 2026-04-27: DecayService 排练增强公式严重缺陷（已修复）

### Bug：排练增强随访问次数递减，与社区标准相反

**问题**: `_calculateRehearsalBonus` 使用 `perAccessBoost = rehearsalBoost / max(1, accessCount)`，
导致访问次数越多，每次排练增强越小，总增强 = `rehearsalBoost * rehearsalDecay`（与 accessCount 无关！）。
这导致"热门记忆"和"冷门记忆"在长时间后强度相同，违反间隔重复效应。

**根因**: 未参照社区源码，自行设计公式时直觉错误。

**社区标准**:
- cognitive-memory: `access_multiplier = math.log1p(access_count)` → 对数递增
- engram: `reinforcement = min(0.3, 0.05 * math.log(1 + access_count))` → 对数递增

**修复**: 
```dart
// ❌ 旧代码（错误）
final perAccessBoost = rehearsalBoost / max(1, memory.accessCount);
final rehearsalDecay = exp(-rehearsalDecayRate * timeSinceAccessHours);
return perAccessBoost * memory.accessCount * rehearsalDecay;

// ✅ 新代码（与 cognitive-memory 一致）
final accessMultiplier = log(1 + memory.accessCount);
final baseBonus = rehearsalBoost * accessMultiplier;
final bonusDecay = exp(-rehearsalDecayRate * timeSinceAccessHours);
return baseBonus * bonusDecay;
```

**教训**: 
1. **必须参照社区源码**：核心算法不能凭直觉设计，必须对照成熟框架验证
2. **对数递增 vs 线性递减**：间隔重复效应的核心是"对数递增"——访问越多，记忆越牢固，但边际效益递减
3. **测试暴露缺陷**：evolutionary stability 测试直接暴露了此 Bug

---

## 2026-04-27: DecayService.calculateDecay 不使用 memory.strength 字段

### 发现：calculateDecay 基于 initialStrength 而非 strength

**问题**: `calculateDecay` 使用 `initialStrength * decayFactor + rehearsalBonus` 计算，
完全忽略 `memory.strength` 字段。这意味着 `copyWith(strength: ...)` 不会影响后续衰减计算。

**社区对照**: cognitive-memory 的 `DecayEngine.calculate_decay` 也是基于 `initial_strength`，
不使用中间 `strength` 字段。这是**设计意图**，不是 Bug。

**影响**: 
- 测试中不能用 `copyWith(strength: decayedStrength)` 模拟多轮衰减进程
- 正确的测试方式是直接设置 `accessCount` 和 `accessedAt` 来模拟排练历史
- `applyDecay()` 方法应该用于持久化更新，而非模拟

**最佳实践**: 测试衰减效果时，直接构造具有不同 `accessCount`/`accessedAt` 的 MemoryItem，
而非模拟多轮衰减循环。

---

## 2026-04-27: 记忆系统测试套件设计

### 踩坑：测试设计需参照社区标准

**问题**: 初始测试设计随意，缺乏对社区标准测试场景的覆盖。

**解决方案**: 
- 参照 cognitive-memory 的 `tests/unit/` 测试套件（475-553行/文件，9-12个测试组）
- 参照 OpenMemory 的 `test_omnibus.py`（进化稳定性/布尔过滤/内容鲁棒性）
- 参照 mem0 的 `test_main.py`（CRUD 单元测试）

**最佳实践**:
- 每个 Service 至少覆盖：默认值、核心计算、边界条件、批量操作、便捷方法
- 集成测试覆盖完整生命周期：add → decay → prune → consolidate
- 内容鲁棒性测试：HTML/JSON/Markdown/中文内容
- 进化稳定性测试：热门记忆存活，冷门记忆衰减

---

## 2026-04-27: Flutter 记忆系统 vs 参考框架差距分析

### 发现：三个独有创新点

**mnemosyne 独有**（参考框架均未实现）:
1. **情绪门控回忆 (Arousal Gating)**: 基于情绪唤醒度调节记忆持久性
2. **编码上下文 (相/EncodingContext)**: 存储记忆时的上下文信息（情绪/社交/时间/物理/活动）
3. **三路 RRF 融合检索 + 意图路由**: 根据查询意图动态调整检索策略

### 发现：三个待补齐功能

**参考框架有但 mnemosyne 缺失**:
1. **SimHash 去重**: mem0 和 OpenMemory 均实现了 SimHash 去重
2. **MMR 多样性检索**: cognitive-memory 实现了 MMR (Maximal Marginal Relevance)
3. **跨扇区共振**: OpenMemory 的 CrossSectorResonance 机制

---

## 2026-04-27: ObjectBox 替换 sqflite/FTS5

### 踩坑：sqflite + FTS5 向量搜索不可行

**问题**: sqflite 不原生支持向量搜索，FTS5 仅支持全文搜索。

**解决方案**: 
- 使用 ObjectBox（支持 HNSW 向量索引）替换 sqflite
- ObjectBox 原生支持 Flutter，无需 MethodChannel 桥接
- HNSW 算法提供高效近似最近邻搜索

**最佳实践**:
- 保留核心领域逻辑（DecayService、ImportanceEngine 等），仅替换基础设施层
- MemoryEntity 使用 JSON 序列化处理复杂字段（encodingContext、metadata）
- ObjectBox Store 需要正确管理生命周期（open/close）

---

## 2026-04-27: 记忆状态机设计

### 发现：engram 的状态机模型

**参考**: engram 实现了 `active → challenged → invalidated/merged` 状态机

**mnemosyne 实现**: 
- `MemoryStatus` 枚举：`active`, `challenged`, `invalidated`, `merged`, `archived`
- 状态转换逻辑在 MemoryService 中管理
- 挑战(challenged)状态：当新记忆与旧记忆矛盾时，旧记忆进入 challenged 状态

---

## 2026-04-27: 编码特异性原理 (相)

### 概念：编码上下文决定回忆效率

**来源**: `/root/idea-turbo/anima-rn/study.md` 中的"相"概念

**核心思想**: 记忆的存储和提取依赖于编码时的上下文。当回忆时的上下文与编码时相似，回忆效率更高。

**Flutter 实现**: `EncodingContext` 类
- `emotionalState`: 情绪状态 (happy/sad/neutral)
- `arousalLevel`: 唤醒度 (0.0-1.0)，影响记忆持久性
- `valence`: 效价 (正/负)
- `socialContext`: 社交情境
- `physicalContext`: 物理环境
- `temporalContext`: 时间上下文
- `activityContext`: 活动上下文

**匹配算法**: `calculateMatchScore()` 计算当前上下文与存储上下文的匹配度

---

## 2026-04-27: Flutter/Dart 现成包评估

### 验证结果

| 包名 | 真实性 | 适用性 | 推荐度 |
|------|--------|--------|--------|
| mobile_rag_engine | ✅ 真实 | Flutter 完整 RAG | ⭐⭐⭐⭐⭐ |
| objectbox | ✅ 真实 | 数据库+向量搜索 | ⭐⭐⭐⭐ |
| sqlite_vector | ✅ 真实 | SQLite 向量扩展 | ⭐⭐⭐⭐ |
| chromadb | ✅ 真实 | 云端客户端 | ⭐⭐ |

### 选择决策
- **存储层**: ObjectBox（成熟、支持向量搜索、Flutter 原生）
- **向量搜索**: ObjectBox HNSW（内建，无需额外包）
- **关键词搜索**: 自实现（基于 keyword_extractor_service）
- **RAG**: 暂不引入 mobile_rag_engine，自建更可控

---

## 2026-04-28: ConsolidationEngine 核心缺陷修复（已同步社区标准）

### 缺陷1: 候选者缺少聚类质量指标
**问题**: `ConsolidationCandidate` 缺少 `centroid` 和 `similarityScore`，无法评估聚类质量。
**修复**: 新增这两个字段，在 `_createCandidate` 中计算聚类中心和平均相似度。

### 缺陷2: 整合结果不完整
**问题**: `ConsolidationResult` 缺少记忆类型、聚类中心嵌入和整合时间戳。
**修复**: 新增 `memoryType: 'semantic'`、`centroidEmbedding` 和 `consolidationTimestamp`。

### 缺陷3: 共享实体/主题阈值错误
**问题**: `findSharedItems` 使用 `e.value >= 2`，社区标准是 `> itemLists.length // 2`。
**修复**: 
```dart
// ❌ 旧代码
.where((e) => e.value >= 2)

// ✅ 新代码（与 cognitive-memory 一致）
final threshold = itemLists.length ~/ 2;
.where((e) => e.value > threshold)
```

### 缺陷4: shouldConsolidate 缺少相似度检查
**问题**: `shouldConsolidate` 只检查记忆数量和重要性，不检查聚类相似度。
**修复**: 新增 `similarityScore < effectiveMinSimilarity` 检查。

### 缺陷5: consolidate 不递增计数器
**问题**: 整合操作不记录统计信息，无法追踪整合历史。
**修复**: 新增 `_totalConsolidations` 计数器和 `getConsolidationStats()` 方法。

### 缺陷6: 缺少默认内容摘要
**问题**: consolidate 强制要求外部提供摘要生成器，无默认实现。
**修复**: 新增 `_defaultContentSummary` 方法，当不提供 `contentGenerator` 时自动使用。

**教训**: 对照社区源码时必须逐字段、逐方法对比，不能只看大致逻辑。

---

## 2026-04-28: Standalone Test Runner 维护

### 踩坑：内联类定义与项目代码不同步
**问题**: standalone test runner 复制了项目中的类定义，当项目代码更新时，内联定义未同步更新，
导致编译错误（缺少字段、方法签名不匹配等）。

**解决方案**: 每次修改项目核心类后，必须同步更新 `test_runner/run_tests.dart` 中的内联定义。

**最佳实践**: 
- 内联定义应保持与项目代码完全一致（字段、方法签名、默认值）
- 修改 ConsolidationEngine/DecayService/ImportanceEngine 后立即同步
- 运行 `dart run test_runner/run_tests.dart` 验证同步状态

---

## 2026-04-28: 10 大缺陷修复 — 社区框架对照迭代

### 发现：对照 engram/mem0/OpenMemory 源码发现 10 个实现缺陷

**缺陷清单与修复**:

| DEFECT | 问题 | 参考源 | 修复方案 |
|--------|------|--------|----------|
| DEFECT-1 | ConsolidationEngine 只允许 episodic 类型 | engram consolidator.py | 添加 `eligibleTypes` 配置，默认 `{episodic}` |
| DEFECT-2 | 合并后源记忆未 soft-forget | engram `_merge_cluster` | 设置 `MemoryStatus.superseded` + 合并元数据 |
| DEFECT-3 | MemoryStatus 枚举定义但未使用 | engram 状态机 | RetrievalEngine 过滤 superseded/invalidated，DecayService shouldForget 优先遗忘 |
| DEFECT-4 | ImportanceEngine 缺少 confirmation count | engram `compute_importance` | 添加 `confirmationCount` 字段 + `_calculateConfirmationScore` 对数递增 |
| DEFECT-5 | RetrievalEngine 缺少查询扩展 | engram `QUERY_EXPANSIONS` | 添加 `_queryExpansions` 映射（中英双语） |
| DEFECT-6 | RetrievalEngine 缺少检索模式过滤 | mem0 retrieval profile | 添加 `RetrievalProfile` 枚举（factsOnly/factsPlusRules/fullContext） |
| DEFECT-7 | RetrievalEngine 缺少中文时间识别 | 本地化需求 | `_detectTemporal` 添加中文日期/月份/相对时间正则 |
| DEFECT-8 | DecayService 缺少间隔重复 | engram `compute_retention` | `_computeEffectiveHalfLife` 添加 `1.0 + 0.3 * log(1 + accessCount)` 乘数 |
| DEFECT-9 | addMemory 重复检测未合并元数据 | engram `merge_duplicate_pair` | `_mergeDuplicate` 合并 entities/topics/keywords/confirmationCount |
| DEFECT-10 | runLifecycle 缺少去重和信念质疑 | engram `consolidate` 步骤 | 添加 `_deduplicateMemories` + `_challengeContradictions` |

### 关键教训

1. **confirmationCount 必须用对数递增**: `log(1 + count) / log(1 + saturation)` 而非线性递增
   - engram: `min(0.2, 0.05 * math.log(1 + confirmations))`
   - 线性递增会导致高确认数记忆的重要性无限膨胀

2. **间隔重复 = 半衰期延长**: 不是增加 bonus，而是延长有效半衰期
   - `halfLife *= 1.0 + 0.3 * log(1 + accessCount)` 
   - 这确保了访问越多，衰减越慢（符合 Ebbinghaus 遗忘曲线的间隔重复效应）

3. **信念质疑(Challenge)需要双重条件**: 共享话题 + 低余弦相似度
   - 仅共享话题不够（可能只是相关但不同的事实）
   - 仅低相似度不够（可能完全不相关）
   - 两者同时满足才标记为 challenged

4. **MemoryType.observation 不存在**: 项目中 MemoryType 只有 episodic/semantic/preference/instruction
   - ConsolidationEngine 默认 eligibleTypes 应为 `{MemoryType.episodic}` 而非包含不存在的 observation

5. **ImportanceEngine 权重重分配**: 新增 confirmationWeight=0.10 后，总权重需重新平衡
   - 旧: recency=0.15, frequency=0.15, emotional=0.20, surprise=0.15, entity=0.08, explicit=0.20
   - 新: recency=0.12, frequency=0.12, emotional=0.15, surprise=0.12, entity=0.06, explicit=0.18, confirmation=0.10

---

## 2026-04-28: "相"模块可插拔架构设计

### 设计决策：零耦合 + 装饰器模式

**需求**: 实现"相"（编码上下文增强）记忆模块，模拟人类模糊记忆特征——记忆随时间衰减变模糊，但在相似场景下可被触发回忆。

**架构原则**:
1. **完全自包含**: 所有"相"代码放在 `lib/features/xiang/`，不修改任何现有文件
2. **装饰器模式**: `XiangRetrievalEngine` 包装现有 `RetrievalEngine`，而非修改它
3. **元数据存储**: `XiangContext` 存储在 `memory.metadata['xiang']`，无需改 ObjectBox schema
4. **抽象接口 + 默认实现**: 每个服务都可替换

**文件结构**:
```
lib/features/xiang/
├── xiang.dart                    # barrel export
├── xiang_context.dart            # XiangContext + SensoryTag 实体
├── xiang_profile.dart            # XiangProfile + ResonanceResult
├── xiang_config.dart             # XiangConfig 配置
├── xiang_capture_service.dart    # 相捕获（抽象+默认）
├── xiang_decay_service.dart      # 相衰减（抽象+默认）
├── xiang_matcher_service.dart    # 模糊匹配（抽象+默认+相似度矩阵）
├── xiang_scene_trigger_service.dart # 场景触发（抽象+默认）
└── xiang_plugin.dart             # XiangPlugin + XiangRetrievalEngine
```

### 核心算法

**衰减公式**: `clarity = exp(-0.693 * ageDays / halfLifeDays)`
- 天气半衰期: 7天（快速遗忘）
- 活动半衰期: 14天
- 地点半衰期: 30天（最持久）
- 心情半衰期: 10天

**模糊匹配创新**: 衰减后记忆获得"模糊度加成"——越模糊的记忆，对相似但不完全匹配的上下文越容易产生共鸣。这模拟了人类"似曾相识"的感觉。

```dart
// 模糊度加成公式
final fuzzinessBoost = 1.0 + (1.0 - clarity) * 0.5;
final score = similarity * fuzzinessBoost * weight;
```

**场景触发**: 当综合共鸣分数超过阈值（默认0.6），触发场景回忆，给予最高2.0x的检索增强。

**相似度矩阵**: 预定义了天气/活动/地点/心情的中英文相似度矩阵，支持跨语言模糊匹配（如"雨"和"rainy"的相似度）。

### 与现有系统的桥接

- `XiangContext` 通过 `metadata['xiang']` 注入，不修改 ObjectBox schema
- `XiangRetrievalEngine` 装饰 `RetrievalEngine`，先 over-retrieve 再 rescore
- `EncodingContext.calculateMatchScore()` 作为 fallback，当无 XiangContext 时仍可用
- `XiangPlugin` 实现 `MemoryScoringPlugin` 接口，可被其他插件系统复用

### 教训
1. **装饰器优于继承**: 不修改 RetrievalEngine 源码，用包装器扩展功能
2. **元数据注入优于 schema 变更**: 避免数据库迁移风险
3. **模糊度加成是反直觉的**: 衰减不是纯粹的"变差"，而是"变模糊"，模糊反而增加了对相似场景的敏感度
4. **中英文相似度矩阵需要双语覆盖**: 单独的中文或英文矩阵不够，需要交叉映射
