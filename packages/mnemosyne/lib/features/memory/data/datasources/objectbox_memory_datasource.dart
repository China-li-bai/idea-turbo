import 'package:mnemosyne/objectbox.g.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mnemosyne/features/memory/data/models/memory_entity.dart';
import 'package:mnemosyne/features/memory/data/models/raw_message_entity.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/extraction/raw_message.dart';
import 'package:mnemosyne/core/config.dart';
import 'package:mnemosyne/core/exceptions.dart';

export 'package:mnemosyne/features/memory/data/models/memory_entity.dart';
export 'package:mnemosyne/features/memory/data/models/raw_message_entity.dart';

class ObjectBoxMemoryDataSource {
  Store? _store;
  Box<MemoryEntity>? _box;
  Box<RawMessageEntity>? _rawMessageBox;
  final MnemosyneConfig config;
  final String? _directoryOverride;

  ObjectBoxMemoryDataSource(this.config, {String? directoryOverride})
      : _directoryOverride = directoryOverride;

  Future<Store> get store async {
    if (_store != null && !_store!.isClosed()) return _store!;
    final String dbPath;
    if (_directoryOverride != null) {
      dbPath = join(_directoryOverride, config.databaseName.replaceAll('.db', '-objectbox'));
    } else {
      final dir = await getApplicationDocumentsDirectory();
      dbPath = join(dir.path, config.databaseName.replaceAll('.db', '-objectbox'));
    }
    _store = Store(getObjectBoxModel(), directory: dbPath);
    return _store!;
  }

  Future<Box<MemoryEntity>> get box async {
    if (_box != null) return _box!;
    final s = await store;
    _box = s.box<MemoryEntity>();
    return _box!;
  }

  Future<Box<RawMessageEntity>> get rawMessageBox async {
    if (_rawMessageBox != null) return _rawMessageBox!;
    final s = await store;
    _rawMessageBox = s.box<RawMessageEntity>();
    return _rawMessageBox!;
  }

  // ============ Memory CRUD ============

  Future<String> insertMemory(MemoryItem memory) async {
    try {
      final b = await box;
      final entity = MemoryEntity.fromDomain(memory);
      b.put(entity);
      return memory.id;
    } catch (e, s) {
      throw DatabaseException('Failed to insert memory', e, s);
    }
  }

  Future<void> updateMemory(MemoryItem memory) async {
    try {
      final b = await box;
      final existing = await _findByUid(memory.id);
      final entity = MemoryEntity.fromDomain(memory);
      if (existing != null) {
        entity.obId = existing.obId;
      }
      b.put(entity);
    } catch (e, s) {
      throw DatabaseException('Failed to update memory', e, s);
    }
  }

  Future<void> deleteMemory(String uid) async {
    try {
      final b = await box;
      final existing = await _findByUid(uid);
      if (existing != null) {
        b.remove(existing.obId);
      }
    } catch (e, s) {
      throw DatabaseException('Failed to delete memory', e, s);
    }
  }

  Future<MemoryItem?> getMemory(String uid) async {
    try {
      final entity = await _findByUid(uid);
      return entity?.toDomain();
    } catch (e, s) {
      throw DatabaseException('Failed to get memory', e, s);
    }
  }

  Future<List<MemoryItem>> getAllMemories() async {
    try {
      final b = await box;
      return b.getAll().map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get all memories', e, s);
    }
  }

  Future<List<MemoryItem>> getRecentMemories({int limit = 20}) async {
    try {
      final s = await store;
      final qb = s.box<MemoryEntity>().query()
        ..order(MemoryEntity_.createdAtMs, flags: Order.descending);
      final query = qb.build();
      query.limit = limit;
      final results = query.find();
      query.close();
      return results.map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get recent memories', e, s);
    }
  }

  Future<List<MemoryItem>> getImportantMemories({int limit = 20}) async {
    try {
      final s = await store;
      final qb = s.box<MemoryEntity>().query()
        ..order(MemoryEntity_.importance, flags: Order.descending);
      final query = qb.build();
      query.limit = limit;
      final results = query.find();
      query.close();
      return results.map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get important memories', e, s);
    }
  }

  Future<List<MemoryItem>> getActiveMemories() async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.status.equals('active') &
        MemoryEntity_.isArchived.equals(false),
      ).build();
      final results = query.find();
      query.close();
      return results.map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get active memories', e, s);
    }
  }

  /// 获取有 embedding 的记忆（P0 #4 修复后，embedding 直接在 MemoryEntity 上）。
  Future<List<MemoryItem>> getMemoriesWithEmbeddings() async {
    try {
      final s = await store;
      // embedding 不为 null 的记忆
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.embedding.notNull(),
      ).build();
      final results = query.find();
      query.close();
      return results
          .where((e) => e.embedding != null && e.embedding!.isNotEmpty)
          .map((e) => e.toDomain())
          .toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get memories with embeddings', e, s);
    }
  }

  // ============ 向量检索（P0 #4 修复：直接查 MemoryEntity.embedding） ============

  /// 向量检索，返回 MemoryEntity + score。
  Future<List<ObjectWithScore<MemoryEntity>>> vectorSearch(
    List<double> queryVector,
    int topK,
  ) async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.embedding.nearestNeighborsF32(queryVector, topK),
      ).build();
      final results = query.findWithScores();
      query.close();
      return results;
    } catch (e, s) {
      throw DatabaseException('Failed to vector search', e, s);
    }
  }

  /// 向量检索记忆，返回 MemoryItem 列表。
  Future<List<MemoryItem>> vectorSearchMemories(
    List<double> queryVector,
    int topK, {
    Set<String>? filterStatus,
    bool excludeArchived = true,
  }) async {
    try {
      final overRetrieveK = topK * 3;
      final vectorResults = await vectorSearch(queryVector, overRetrieveK);

      final results = <MemoryItem>[];
      for (final r in vectorResults) {
        final entity = r.object;
        if (entity.embedding == null || entity.embedding!.isEmpty) continue;
        if (excludeArchived && entity.isArchived) continue;
        if (filterStatus != null && !filterStatus.contains(entity.status)) {
          continue;
        }
        results.add(entity.toDomain());
        if (results.length >= topK) break;
      }
      return results;
    } catch (e, s) {
      throw DatabaseException('Failed to vector search memories', e, s);
    }
  }

  /// 向量检索，返回 MemoryItem + distance（用于 lifecycle 矛盾检测）。
  Future<List<({MemoryItem memory, double distance})>> vectorSearchWithDistance(
    List<double> queryVector,
    int topK, {
    bool excludeArchived = true,
  }) async {
    try {
      final vectorResults = await vectorSearch(queryVector, topK);
      final results = <({MemoryItem memory, double distance})>[];
      for (final r in vectorResults) {
        final entity = r.object;
        if (entity.embedding == null || entity.embedding!.isEmpty) continue;
        if (excludeArchived && entity.isArchived) continue;
        results.add((memory: entity.toDomain(), distance: r.score));
      }
      return results;
    } catch (e, s) {
      throw DatabaseException('Failed to vector search with distance', e, s);
    }
  }

  // ============ contentHash 查询（P0 #2 修复） ============

  /// 通过 contentHash 精确查找记忆（替代全表扫描）。
  Future<MemoryItem?> findByContentHash(String contentHash) async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.contentHash.equals(contentHash),
      ).build();
      final result = query.findFirst();
      query.close();
      return result?.toDomain();
    } catch (e, s) {
      throw DatabaseException('Failed to find by content hash', e, s);
    }
  }

  /// 查找所有具有相同 contentHash 的记忆（用于批量去重）。
  Future<List<MemoryItem>> findAllByContentHash(String contentHash) async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.contentHash.equals(contentHash),
      ).build();
      final results = query.find();
      query.close();
      return results.map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to find all by content hash', e, s);
    }
  }

  /// 获取所有非空的 contentHash（用于去重扫描）。
  Future<Map<String, List<MemoryItem>>> getMemoriesGroupedByContentHash() async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.contentHash.notEquals('') &
        MemoryEntity_.status.equals('active'),
      ).build();
      final results = query.find();
      query.close();

      final groups = <String, List<MemoryItem>>{};
      for (final entity in results) {
        groups.putIfAbsent(entity.contentHash, () => []).add(entity.toDomain());
      }
      return groups;
    } catch (e, s) {
      throw DatabaseException('Failed to group by content hash', e, s);
    }
  }

  // ============ 关键词检索 ============

  Future<List<MemoryItem>> keywordSearch(String keyword, {int limit = 50}) async {
    try {
      final s = await store;
      final qb = s.box<MemoryEntity>().query(
        MemoryEntity_.keywords.contains(keyword) |
        MemoryEntity_.content.contains(keyword) |
        MemoryEntity_.topics.contains(keyword),
      );
      final query = qb.build();
      query.limit = limit;
      final results = query.find();
      query.close();
      return results.map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to keyword search', e, s);
    }
  }

  // ============ 批量操作 ============

  Future<void> batchUpdateMemories(List<MemoryItem> memories) async {
    try {
      final b = await box;
      final entities = <MemoryEntity>[];
      for (final memory in memories) {
        final existing = await _findByUid(memory.id);
        final entity = MemoryEntity.fromDomain(memory);
        if (existing != null) {
          entity.obId = existing.obId;
        }
        entities.add(entity);
      }
      b.putMany(entities);
    } catch (e, s) {
      throw DatabaseException('Failed to batch update memories', e, s);
    }
  }

  Future<void> deleteMemoriesBelowStrength(double threshold) async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.strength.lessThan(threshold) &
        MemoryEntity_.isPinned.equals(false),
      ).build();
      final results = query.find();
      query.close();
      final ids = results.map((e) => e.obId).toList();
      if (ids.isNotEmpty) {
        s.box<MemoryEntity>().removeMany(ids);
      }
    } catch (e, s) {
      throw DatabaseException('Failed to delete weak memories', e, s);
    }
  }

  Future<void> clearAll() async {
    try {
      final b = await box;
      b.removeAll();

      final rb = await rawMessageBox;
      rb.removeAll();
    } catch (e, s) {
      throw DatabaseException('Failed to clear all', e, s);
    }
  }

  Future<void> close() async {
    _store?.close();
    _store = null;
    _box = null;
    _rawMessageBox = null;
  }

  // ============ RawMessage 持久化（P0 #6 修复） ============

  Future<void> insertRawMessage(RawMessage message) async {
    try {
      final rb = await rawMessageBox;
      final entity = RawMessageEntity.fromDomain(message);
      rb.put(entity);
    } catch (e, s) {
      throw DatabaseException('Failed to insert raw message', e, s);
    }
  }

  Future<void> updateRawMessage(RawMessage message) async {
    try {
      final rb = await rawMessageBox;
      final existing = await _findRawMessageByUid(message.id);
      final entity = RawMessageEntity.fromDomain(message);
      if (existing != null) {
        entity.obId = existing.obId;
      }
      rb.put(entity);
    } catch (e, s) {
      throw DatabaseException('Failed to update raw message', e, s);
    }
  }

  Future<List<RawMessage>> getPendingRawMessages({int? limit}) async {
    try {
      final s = await store;
      final qb = s.box<RawMessageEntity>().query(
        RawMessageEntity_.isProcessed.equals(false),
      )..order(RawMessageEntity_.timestampMs);
      final query = qb.build();
      if (limit != null) query.limit = limit;
      final results = query.find();
      query.close();
      return results.map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get pending raw messages', e, s);
    }
  }

  Future<void> markRawMessageProcessed(String rawMessageId) async {
    try {
      final existing = await _findRawMessageByUid(rawMessageId);
      if (existing != null) {
        existing.isProcessed = true;
        existing.processedAtMs = DateTime.now().millisecondsSinceEpoch;
        final rb = await rawMessageBox;
        rb.put(existing);
      }
    } catch (e, s) {
      throw DatabaseException('Failed to mark raw message processed', e, s);
    }
  }

  Future<RawMessageEntity?> _findRawMessageByUid(String uid) async {
    final s = await store;
    final query = s.box<RawMessageEntity>().query(
      RawMessageEntity_.uid.equals(uid),
    ).build();
    final result = query.findFirst();
    query.close();
    return result;
  }

  // ============ 内部辅助 ============

  Future<MemoryEntity?> _findByUid(String uid) async {
    final s = await store;
    final query = s.box<MemoryEntity>().query(
      MemoryEntity_.uid.equals(uid),
    ).build();
    final result = query.findFirst();
    query.close();
    return result;
  }
}
