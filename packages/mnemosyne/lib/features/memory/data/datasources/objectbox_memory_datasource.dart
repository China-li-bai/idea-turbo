import 'package:mnemosyne/objectbox.g.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mnemosyne/features/memory/data/models/memory_entity.dart';
import 'package:mnemosyne/features/memory/data/models/memory_vector_index.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/core/config.dart';
import 'package:mnemosyne/core/exceptions.dart';

export 'package:mnemosyne/features/memory/data/models/memory_entity.dart';
export 'package:mnemosyne/features/memory/data/models/memory_vector_index.dart';

class ObjectBoxMemoryDataSource {
  Store? _store;
  Box<MemoryEntity>? _box;
  Box<MemoryVectorIndex>? _vectorBox;
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

  Future<Box<MemoryVectorIndex>> get vectorBox async {
    if (_vectorBox != null) return _vectorBox!;
    final s = await store;
    _vectorBox = s.box<MemoryVectorIndex>();
    return _vectorBox!;
  }

  Future<String> insertMemory(MemoryItem memory) async {
    try {
      final b = await box;
      final entity = MemoryEntity.fromDomain(memory);
      b.put(entity);

      if (memory.embedding != null && memory.embedding!.isNotEmpty) {
        await _upsertVectorIndex(memory.id, memory.embedding!);
      }

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

      if (memory.embedding != null && memory.embedding!.isNotEmpty) {
        await _upsertVectorIndex(memory.id, memory.embedding!);
      }
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

      await _softDeleteVectorIndex(uid);
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

  Future<List<MemoryItem>> getMemoriesWithEmbeddings() async {
    try {
      final vb = await vectorBox;
      final vectorIndices = vb.getAll();
      final uids = vectorIndices.map((v) => v.memoryUid).toSet();

      final b = await box;
      final allMemories = b.getAll();
      return allMemories
          .where((e) => uids.contains(e.uid))
          .map((e) => e.toDomain())
          .toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get memories with embeddings', e, s);
    }
  }

  Future<List<ObjectWithScore<MemoryVectorIndex>>> vectorSearch(
    List<double> queryVector,
    int topK,
  ) async {
    try {
      final s = await store;
      final query = s.box<MemoryVectorIndex>().query(
        MemoryVectorIndex_.embedding.nearestNeighborsF32(queryVector, topK),
      ).build();
      final results = query.findWithScores();
      query.close();
      return results;
    } catch (e, s) {
      throw DatabaseException('Failed to vector search', e, s);
    }
  }

  Future<List<MemoryItem>> vectorSearchMemories(
    List<double> queryVector,
    int topK, {
    Set<String>? filterStatus,
    bool excludeArchived = true,
  }) async {
    try {
      final overRetrieveK = topK * 3;
      final vectorResults = await vectorSearch(queryVector, overRetrieveK);

      final activeResults = vectorResults
          .where((r) => !r.object.isDeleted)
          .toList();

      final uids = activeResults.map((r) => r.object.memoryUid).toList();

      final b = await box;
      final allEntities = b.getAll();
      final uidToEntity = {for (final e in allEntities) e.uid: e};

      final results = <MemoryItem>[];
      for (final uid in uids) {
        final entity = uidToEntity[uid];
        if (entity == null) continue;

        if (excludeArchived && entity.isArchived) continue;

        if (filterStatus != null && !filterStatus.contains(entity.status)) continue;

        results.add(entity.toDomain());
        if (results.length >= topK) break;
      }
      return results;
    } catch (e, s) {
      throw DatabaseException('Failed to vector search memories', e, s);
    }
  }

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

        if (memory.embedding != null && memory.embedding!.isNotEmpty) {
          await _upsertVectorIndex(memory.id, memory.embedding!);
        }
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

      for (final entity in results) {
        await _softDeleteVectorIndex(entity.uid);
      }
    } catch (e, s) {
      throw DatabaseException('Failed to delete weak memories', e, s);
    }
  }

  Future<void> clearAll() async {
    try {
      final b = await box;
      b.removeAll();

      final vb = await vectorBox;
      vb.removeAll();
    } catch (e, s) {
      throw DatabaseException('Failed to clear all memories', e, s);
    }
  }

  Future<void> close() async {
    _store?.close();
    _store = null;
    _box = null;
    _vectorBox = null;
  }

  Future<void> _upsertVectorIndex(String memoryUid, List<double> embedding) async {
    final vb = await vectorBox;
    final existing = await _findVectorByMemoryUid(memoryUid);

    if (existing != null) {
      existing.updateEmbedding(embedding);
      vb.put(existing);
    } else {
      final index = MemoryVectorIndex.create(
        memoryUid: memoryUid,
        embedding: embedding,
      );
      vb.put(index);
    }
  }

  Future<void> _softDeleteVectorIndex(String memoryUid) async {
    final existing = await _findVectorByMemoryUid(memoryUid);
    if (existing != null) {
      existing.markDeleted();
      final vb = await vectorBox;
      vb.put(existing);
    }
  }

  Future<int> purgeDeletedVectors({int batchSize = 100}) async {
    try {
      final vb = await vectorBox;
      final s = await store;
      final query = s.box<MemoryVectorIndex>().query(
        MemoryVectorIndex_.isDeleted.equals(true),
      ).build();
      query.limit = batchSize;
      final deleted = query.find();
      query.close();

      if (deleted.isEmpty) return 0;

      final ids = deleted.map((e) => e.obId).toList();
      vb.removeMany(ids);
      return ids.length;
    } catch (e, s) {
      throw DatabaseException('Failed to purge deleted vectors', e, s);
    }
  }

  Future<MemoryVectorIndex?> _findVectorByMemoryUid(String memoryUid) async {
    final s = await store;
    final query = s.box<MemoryVectorIndex>().query(
      MemoryVectorIndex_.memoryUid.equals(memoryUid),
    ).build();
    final result = query.findFirst();
    query.close();
    return result;
  }

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
