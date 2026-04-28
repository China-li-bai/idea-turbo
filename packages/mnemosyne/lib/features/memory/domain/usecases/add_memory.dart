import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/repositories/memory_repository.dart';
import 'package:mnemosyne/utils/id_generator.dart';

class AddMemory {
  final MemoryRepository repository;

  AddMemory(this.repository);

  Future<String> call({
    required String content,
    MemoryType type = MemoryType.episodic,
    MemorySource source = MemorySource.conversation,
    double importance = 0.5,
    double emotionalValence = 0.0,
    List<String> keywords = const [],
    List<String> entities = const [],
    List<String> topics = const [],
    List<double>? embedding,
    EncodingContext? encodingContext,
    Map<String, dynamic>? metadata,
    String? sourceId,
    String? agentId,
    String? userId,
  }) {
    final memory = MemoryItem(
      id: IdGenerator.generate(),
      content: content,
      type: type,
      source: source,
      importance: importance,
      emotionalValence: emotionalValence,
      keywords: keywords,
      entities: entities,
      topics: topics,
      embedding: embedding,
      encodingContext: encodingContext,
      metadata: metadata,
      sourceId: sourceId,
      agentId: agentId,
      userId: userId,
    );
    return repository.addMemory(memory);
  }
}
