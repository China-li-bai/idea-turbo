import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/repositories/memory_repository.dart';

class GetRecentMemories {
  final MemoryRepository repository;

  GetRecentMemories(this.repository);

  Future<List<MemoryItem>> call({int limit = 20}) {
    return repository.getRecentMemories(limit: limit);
  }
}
