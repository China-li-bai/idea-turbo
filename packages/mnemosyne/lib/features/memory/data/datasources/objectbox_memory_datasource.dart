import 'package:mnemosyne/objectbox.g.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mnemosyne/features/memory/data/models/memory_entity.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/core/config.dart';
import 'package:mnemosyne/core/exceptions.dart';

export 'package:mnemosyne/features/memory/data/models/memory_entity.dart';

class ObjectBoxMemoryDataSource {
  Store? _store;
  Box<MemoryEntity>? _box;
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

  Future<List<MemoryItem>> getMemoriesWithEmbeddings() async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.embedding.notNull(),
      ).build();
      final results = query.find();
      query.close();
      return results.map((e) => e.toDomain()).toList();
    } catch (e, s) {
      throw DatabaseException('Failed to get memories with embeddings', e, s);
    }
  }

  Future<List<ObjectWithScore<MemoryEntity>>> vectorSearch(
    List<double> queryVector,
    int topK,
  ) async {
    try {
      final s = await store;
      final query = s.box<MemoryEntity>().query(
        MemoryEntity_.embedding.nearestNeighborsF32(queryVector, topK)
            .and(MemoryEntity_.status.equals('active'))
            .and(MemoryEntity_.isArchived.equals(false)),
      ).build();
      final results = query.findWithScores();
      query.close();
      return results;
    } catch (e, s) {
      throw DatabaseException('Failed to vector search', e, s);
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
    } catch (e, s) {
      throw DatabaseException('Failed to clear all memories', e, s);
    }
  }

  Future<void> close() async {
    _store?.close();
    _store = null;
    _box = null;
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
