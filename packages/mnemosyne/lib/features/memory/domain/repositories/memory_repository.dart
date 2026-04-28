import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';

abstract class MemoryRepository {
  Future<void> initialize();

  Future<String> addMemory(MemoryItem memory);
  Future<void> updateMemory(MemoryItem memory);
  Future<void> deleteMemory(String id);
  Future<MemoryItem?> getMemory(String id);

  Future<List<MemorySearchResult>> searchMemories({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    int limit = 10,
  });

  Future<List<MemoryItem>> getRecentMemories({int limit = 20});
  Future<List<MemoryItem>> getImportantMemories({int limit = 20});

  Future<void> applyDecay(DateTime now);
  Future<void> pruneWeakMemories();

  Future<void> clearAll();
  Future<void> close();
}
