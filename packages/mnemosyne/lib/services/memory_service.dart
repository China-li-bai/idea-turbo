import 'package:mnemosyne/core/config.dart';
import 'package:mnemosyne/features/memory/data/datasources/objectbox_memory_datasource.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/memory/domain/repositories/memory_repository.dart';
import 'package:mnemosyne/services/decay_service.dart';
import 'package:mnemosyne/services/importance_engine.dart';
import 'package:mnemosyne/services/surprise_service.dart';
import 'package:mnemosyne/services/retrieval_engine.dart';
import 'package:mnemosyne/services/consolidation_engine.dart';
import 'package:mnemosyne/services/keyword_extractor_service.dart';

class MemoryService implements MemoryRepository {
  final MnemosyneConfig config;
  final ObjectBoxMemoryDataSource _datasource;
  final DecayService _decayService;
  final ImportanceEngine _importanceEngine;
  final SurpriseService _surpriseService;
  final RetrievalEngine _retrievalEngine;
  final ConsolidationEngine _consolidationEngine;
  final KeywordExtractorService _keywordExtractor;
  bool _isInitialized = false;

  MemoryService.withDatasource({
    required this.config,
    required ObjectBoxMemoryDataSource datasource,
  })  : _datasource = datasource,
        _decayService = DecayService(),
        _importanceEngine = ImportanceEngine(),
        _surpriseService = SurpriseService(),
        _keywordExtractor = KeywordExtractorService(),
        _retrievalEngine = RetrievalEngine(
          datasource: datasource,
          decayService: DecayService(),
          keywordExtractor: KeywordExtractorService(),
        ),
        _consolidationEngine = ConsolidationEngine();

  @override
  Future<void> initialize() async {
    if (_isInitialized) return;
    await _datasource.store;
    _isInitialized = true;
  }

  @override
  Future<String> addMemory(MemoryItem memory) async {
    final now = DateTime.now();

    var processedMemory = memory;

    if (memory.embedding != null && memory.embedding!.isNotEmpty) {
      final existingMemories = await _datasource.getMemoriesWithEmbeddings();
      final surpriseResult = _surpriseService.computeSurprise(
        memory.embedding!,
        existingMemories,
      );

      if (surpriseResult.isDuplicate && surpriseResult.nearestId != null) {
        final existing = await getMemory(surpriseResult.nearestId!);
        if (existing != null) {
          final updated = existing.access();
          await updateMemory(updated);
          return existing.id;
        }
      }

      final adjustedImportance = _surpriseService.adjustImportance(
        memory.importance,
        surpriseResult,
      );

      processedMemory = memory.copyWith(
        importance: adjustedImportance,
        surpriseScore: surpriseResult.surprise,
      );
    }

    final importanceResult = _importanceEngine.calculateImportance(
      processedMemory,
      now,
    );
    processedMemory = processedMemory.copyWith(
      importance: importanceResult.finalScore,
    );

    return await _datasource.insertMemory(processedMemory);
  }

  @override
  Future<void> updateMemory(MemoryItem memory) async {
    await _datasource.updateMemory(memory);
  }

  @override
  Future<void> deleteMemory(String id) async {
    await _datasource.deleteMemory(id);
  }

  @override
  Future<MemoryItem?> getMemory(String id) async {
    return await _datasource.getMemory(id);
  }

  @override
  Future<List<MemorySearchResult>> searchMemories({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    int limit = 10,
  }) async {
    if (queryEmbedding == null || queryEmbedding.isEmpty) {
      final keywordResults = await _datasource.keywordSearch(query, limit: limit);
      return keywordResults.map((m) {
        final decayed = _decayService.applyDecay(m, DateTime.now());
        return MemorySearchResult(
          memory: decayed,
          totalScore: m.importance,
          semanticScore: 0.0,
          keywordScore: m.importance,
          recencyScore: _decayService.calculateRecencyScore(m, DateTime.now()),
          importanceScore: m.importance,
          contextMatchScore: 0.0,
        );
      }).toList();
    }

    return _retrievalEngine.retrieve(
      query: query,
      queryEmbedding: queryEmbedding,
      currentContext: currentContext,
      limit: limit,
    );
  }

  @override
  Future<List<MemoryItem>> getRecentMemories({int limit = 20}) async {
    return await _datasource.getRecentMemories(limit: limit);
  }

  @override
  Future<List<MemoryItem>> getImportantMemories({int limit = 20}) async {
    return await _datasource.getImportantMemories(limit: limit);
  }

  @override
  Future<void> applyDecay(DateTime now) async {
    final allMemories = await _datasource.getAllMemories();
    final decayedMemories = allMemories.map((memory) {
      return _decayService.applyDecay(memory, now);
    }).toList();

    await _datasource.batchUpdateMemories(decayedMemories);
  }

  @override
  Future<void> pruneWeakMemories() async {
    await _datasource.deleteMemoriesBelowStrength(config.pruningThreshold);
  }

  Future<List<ConsolidationCandidate>> findConsolidationCandidates() async {
    final allMemories = await _datasource.getAllMemories();
    return _consolidationEngine.findConsolidationCandidates(allMemories, DateTime.now());
  }

  Future<ConsolidationResult> consolidate(
    ConsolidationCandidate candidate,
    String Function(List<MemoryItem>) summarizeContent,
  ) async {
    final result = _consolidationEngine.consolidate(candidate, summarizeContent);

    final consolidatedMemory = MemoryItem(
      id: result.consolidatedMemoryId,
      content: result.contentSummary,
      type: MemoryType.semantic,
      source: MemorySource.consolidation,
      importance: result.combinedImportance,
      entities: result.sharedEntities,
      topics: result.sharedTopics,
      isConsolidated: true,
    );

    await addMemory(consolidatedMemory);

    for (final sourceId in result.sourceMemoryIds) {
      final source = await getMemory(sourceId);
      if (source != null) {
        await updateMemory(source.copyWith(
          isConsolidated: true,
          supersededById: result.consolidatedMemoryId,
        ));
      }
    }

    return result;
  }

  @override
  Future<void> clearAll() async {
    await _datasource.clearAll();
  }

  @override
  Future<void> close() async {
    await _datasource.close();
    _isInitialized = false;
  }
}
