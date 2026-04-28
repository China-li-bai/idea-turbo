import 'dart:convert';
import 'dart:math';
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
import 'package:crypto/crypto.dart';

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

    if (processedMemory.keywords.isEmpty) {
      final extractedKeywords = _keywordExtractor.extractKeywords(processedMemory.content);
      processedMemory = processedMemory.copyWith(keywords: extractedKeywords);
    }

    final contentHash = md5.convert(utf8.encode(processedMemory.content)).toString();
    final existingByHash = await _findByContentHash(contentHash);
    if (existingByHash != null) {
      final merged = _mergeDuplicate(existingByHash, processedMemory);
      await updateMemory(merged);
      return existingByHash.id;
    }

    if (memory.embedding != null && memory.embedding!.isNotEmpty) {
      final existingMemories = await _datasource.getMemoriesWithEmbeddings();
      final surpriseResult = _surpriseService.computeSurprise(
        memory.embedding!,
        existingMemories,
      );

      if (surpriseResult.isDuplicate && surpriseResult.nearestId != null) {
        final existing = await getMemory(surpriseResult.nearestId!);
        if (existing != null) {
          final merged = _mergeDuplicate(existing, processedMemory);
          await updateMemory(merged);
          return existing.id;
        }
      }

      final adjustedImportance = _surpriseService.adjustImportance(
        memory.importance,
        surpriseResult,
      );

      processedMemory = processedMemory.copyWith(
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

    final metadataWithHash = <String, dynamic>{
      ...?processedMemory.metadata,
      'contentHash': contentHash,
    };
    processedMemory = processedMemory.copyWith(metadata: metadataWithHash);

    return await _datasource.insertMemory(processedMemory);
  }

  @override
  Future<void> updateMemory(MemoryItem memory) async {
    final existing = await _datasource.getMemory(memory.id);
    if (existing == null) {
      await _datasource.updateMemory(memory);
      return;
    }

    var updatedMemory = memory;

    if (memory.content != existing.content) {
      if (memory.keywords.isEmpty || memory.keywords == existing.keywords) {
        final extractedKeywords = _keywordExtractor.extractKeywords(memory.content);
        updatedMemory = updatedMemory.copyWith(keywords: extractedKeywords);
      }

      final newHash = md5.convert(utf8.encode(memory.content)).toString();
      final metadataWithHash = <String, dynamic>{
        ...?updatedMemory.metadata,
        'contentHash': newHash,
      };
      updatedMemory = updatedMemory.copyWith(metadata: metadataWithHash);
    }

    await _datasource.updateMemory(updatedMemory);
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
        final importanceScore = _importanceEngine.getImportance(m, DateTime.now());
        return MemorySearchResult(
          memory: decayed,
          totalScore: importanceScore,
          semanticScore: 0.0,
          keywordScore: m.importance,
          recencyScore: _decayService.calculateRecencyScore(m, DateTime.now()),
          importanceScore: importanceScore,
          contextMatchScore: 0.0,
        );
      }).toList()
        ..sort((a, b) => b.totalScore.compareTo(a.totalScore));
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
      final decayed = _decayService.applyDecay(memory, now);
      final newImportance = _importanceEngine.getImportance(decayed, now);
      return decayed.copyWith(
        strength: decayed.strength,
        importance: newImportance,
      );
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
    final result = _consolidationEngine.consolidate(candidate, contentGenerator: summarizeContent);

    List<double>? centroidEmbedding;
    final embeddings = candidate.memories
        .where((m) => m.embedding != null && m.embedding!.isNotEmpty)
        .map((m) => m.embedding!)
        .toList();
    if (embeddings.isNotEmpty) {
      centroidEmbedding = _consolidationEngine.calculateCentroid(embeddings);
    }

    final consolidatedMemory = MemoryItem(
      id: result.consolidatedMemoryId,
      content: result.contentSummary,
      type: MemoryType.semantic,
      source: MemorySource.consolidation,
      importance: result.combinedImportance,
      entities: result.sharedEntities,
      topics: result.sharedTopics,
      embedding: centroidEmbedding,
      isConsolidated: true,
    );

    await addMemory(consolidatedMemory);

    for (final sourceId in result.sourceMemoryIds) {
      final source = await getMemory(sourceId);
      if (source != null) {
        final mergedEntities = <String>{
          ...source.entities,
          ...result.sharedEntities,
        };
        final mergedTopics = <String>{
          ...source.topics,
          ...result.sharedTopics,
        };
        final mergedKeywords = <String>{
          ...source.keywords,
        };
        final mergedMetadata = <String, dynamic>{
          ...?source.metadata,
          'supersededBy': result.consolidatedMemoryId,
          'supersededAt': DateTime.now().toIso8601String(),
        };
        await updateMemory(source.copyWith(
          status: MemoryStatus.superseded,
          isConsolidated: true,
          supersededById: result.consolidatedMemoryId,
          entities: mergedEntities.toList(),
          topics: mergedTopics.toList(),
          keywords: mergedKeywords.toList(),
          metadata: mergedMetadata,
        ));
      }
    }

    return result;
  }

  Future<Map<String, dynamic>> runLifecycle() async {
    final now = DateTime.now();
    final stats = <String, dynamic>{
      'decayed': 0,
      'pruned': 0,
      'promoted': 0,
      'deduplicated': 0,
      'challenged': 0,
    };

    final allMemories = await _datasource.getAllMemories();
    final updatedMemories = <MemoryItem>[];

    for (final memory in allMemories) {
      if (memory.isPinned || memory.isArchived) continue;
      if (memory.status == MemoryStatus.superseded ||
          memory.status == MemoryStatus.invalidated) continue;

      final decayed = _decayService.applyDecay(memory, now);
      var updated = decayed;

      if (memory.type == MemoryType.episodic &&
          memory.importance >= 0.7 &&
          memory.accessCount >= 3 &&
          !memory.isConsolidated) {
        updated = updated.copyWith(type: MemoryType.semantic);
        stats['promoted'] = (stats['promoted'] as int) + 1;
      }

      updatedMemories.add(updated);
      if (decayed.strength != memory.strength) {
        stats['decayed'] = (stats['decayed'] as int) + 1;
      }
    }

    await _datasource.batchUpdateMemories(updatedMemories);

    final dedupStats = await _deduplicateMemories();
    stats['deduplicated'] = dedupStats;

    final challengeStats = await _challengeContradictions();
    stats['challenged'] = challengeStats;

    final beforePrune = await _datasource.getAllMemories();
    await pruneWeakMemories();
    final afterPrune = await _datasource.getAllMemories();
    stats['pruned'] = beforePrune.length - afterPrune.length;

    return stats;
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

  Future<MemoryItem?> _findByContentHash(String hash) async {
    final allMemories = await _datasource.getAllMemories();
    for (final memory in allMemories) {
      final memHash = memory.metadata?['contentHash'];
      if (memHash == hash) return memory;
    }
    return null;
  }

  MemoryItem _mergeDuplicate(MemoryItem existing, MemoryItem incoming) {
    final mergedEntities = <String>{...existing.entities, ...incoming.entities};
    final mergedTopics = <String>{...existing.topics, ...incoming.topics};
    final mergedKeywords = <String>{...existing.keywords, ...incoming.keywords};
    final mergedRelatedIds = <String>{...existing.relatedMemoryIds, incoming.id};
    final mergedMetadata = <String, dynamic>{
      ...?existing.metadata,
      ...?incoming.metadata,
      'confirmations': (existing.confirmationCount + 1),
      'lastConfirmed': DateTime.now().toIso8601String(),
    };

    final newImportance = max(existing.importance, incoming.importance);

    return existing.copyWith(
      accessCount: existing.accessCount + 1,
      accessedAt: DateTime.now(),
      updatedAt: DateTime.now(),
      importance: newImportance,
      entities: mergedEntities.toList(),
      topics: mergedTopics.toList(),
      keywords: mergedKeywords.toList(),
      relatedMemoryIds: mergedRelatedIds.toList(),
      confirmationCount: existing.confirmationCount + 1,
      metadata: mergedMetadata,
    );
  }

  Future<int> _deduplicateMemories() async {
    final allMemories = await _datasource.getAllMemories();
    final activeMemories = allMemories
        .where((m) => m.status == MemoryStatus.active)
        .toList();
    if (activeMemories.length < 2) return 0;

    final seen = <String, MemoryItem>{};
    final duplicates = <String, String>{};
    int count = 0;

    for (final memory in activeMemories) {
      final hash = memory.metadata?['contentHash'] as String?;
      if (hash == null) continue;

      if (seen.containsKey(hash)) {
        duplicates[memory.id] = seen[hash]!.id;
        count++;
      } else {
        seen[hash] = memory;
      }
    }

    for (final entry in duplicates.entries) {
      final duplicate = await _datasource.getMemory(entry.key);
      if (duplicate != null) {
        await updateMemory(duplicate.copyWith(
          status: MemoryStatus.superseded,
          supersededById: entry.value,
          metadata: {
            ...?duplicate.metadata,
            'supersededBy': entry.value,
            'supersededAt': DateTime.now().toIso8601String(),
            'dedupReason': 'exact_hash_match',
          },
        ));
      }
    }

    return count;
  }

  Future<int> _challengeContradictions() async {
    final allMemories = await _datasource.getAllMemories();
    final activeMemories = allMemories
        .where((m) =>
            m.status == MemoryStatus.active &&
            m.type == MemoryType.semantic &&
            m.embedding != null &&
            m.embedding!.isNotEmpty)
        .toList();
    if (activeMemories.length < 2) return 0;

    int challenged = 0;
    final contradictionThreshold = 0.85;

    for (int i = 0; i < activeMemories.length && challenged < 5; i++) {
      for (int j = i + 1; j < activeMemories.length && challenged < 5; j++) {
        final a = activeMemories[i];
        final b = activeMemories[j];

        final sharedTopics = a.topics.toSet().intersection(b.topics.toSet());
        if (sharedTopics.isEmpty) continue;

        final similarity = _cosineSimilarity(a.embedding!, b.embedding!);
        if (similarity > contradictionThreshold) continue;

        final lower = a.importance <= b.importance ? a : b;
        await updateMemory(lower.copyWith(
          status: MemoryStatus.challenged,
          metadata: {
            ...?lower.metadata,
            'challengedAt': DateTime.now().toIso8601String(),
            'challengeReason': 'contradiction_detected',
            'contradictingMemoryId': a.importance <= b.importance ? b.id : a.id,
          },
        ));
        challenged++;
      }
    }

    return challenged;
  }

  double _cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length || a.isEmpty) return 0.0;
    double dotProduct = 0.0;
    double normA = 0.0;
    double normB = 0.0;
    for (int i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA == 0.0 || normB == 0.0) return 0.0;
    return dotProduct / (sqrt(normA) * sqrt(normB));
  }
}
