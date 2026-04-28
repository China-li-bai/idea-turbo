import 'package:mnemosyne/features/memory/domain/repositories/memory_repository.dart';

class PruneMemories {
  final MemoryRepository repository;

  PruneMemories(this.repository);

  Future<void> call() {
    return repository.pruneWeakMemories();
  }
}
