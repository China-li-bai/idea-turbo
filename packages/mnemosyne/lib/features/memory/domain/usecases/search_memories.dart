import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/memory/domain/repositories/memory_repository.dart';

class SearchMemories {
  final MemoryRepository repository;

  SearchMemories(this.repository);

  Future<List<MemorySearchResult>> call({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    int limit = 10,
  }) {
    return repository.searchMemories(
      query: query,
      queryEmbedding: queryEmbedding,
      currentContext: currentContext,
      limit: limit,
    );
  }
}
