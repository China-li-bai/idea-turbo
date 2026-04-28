import 'package:mnemosyne/features/memory/domain/repositories/memory_repository.dart';

class ApplyDecay {
  final MemoryRepository repository;

  ApplyDecay(this.repository);

  Future<void> call(DateTime now) {
    return repository.applyDecay(now);
  }
}
