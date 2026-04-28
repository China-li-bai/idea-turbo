import 'package:mnemosyne/core/config.dart';
import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/memory/data/datasources/objectbox_memory_datasource.dart';
import 'package:mnemosyne/features/xiang/xiang.dart';
import 'package:mnemosyne/services/memory_service.dart';
import 'package:mnemosyne/services/keyword_extractor_service.dart';
import 'package:mnemosyne/services/consolidation_engine.dart';
import 'package:mnemosyne/utils/id_generator.dart';

class Mnemosyne {
  final MnemosyneConfig config;
  final MemoryService _memoryService;
  final KeywordExtractorService _keywordExtractor;
  final XiangPlugin? _xiangPlugin;
  XiangRetrievalEngine? _xiangRetrievalEngine;
  bool _isInitialized = false;

  Mnemosyne._internal({
    required this.config,
    required MemoryService memoryService,
    required KeywordExtractorService keywordExtractor,
    XiangPlugin? xiangPlugin,
  })  : _memoryService = memoryService,
        _keywordExtractor = keywordExtractor,
        _xiangPlugin = xiangPlugin;

  factory Mnemosyne({
    MnemosyneConfig config = const MnemosyneConfig(),
    XiangPlugin? xiangPlugin,
  }) {
    final datasource = ObjectBoxMemoryDataSource(config);
    return Mnemosyne._internal(
      config: config,
      memoryService: MemoryService.withDatasource(
        config: config,
        datasource: datasource,
      ),
      keywordExtractor: KeywordExtractorService(),
      xiangPlugin: xiangPlugin,
    );
  }

  XiangPlugin? get xiang => _xiangPlugin;

  Future<void> initialize() async {
    if (_isInitialized) return;
    await _memoryService.initialize();
    if (_xiangPlugin != null) {
      _xiangRetrievalEngine = XiangRetrievalEngine(
        inner: _memoryService.retrievalEngine,
        plugin: _xiangPlugin,
      );
    }
    _isInitialized = true;
  }

  Future<String> remember({
    required String content,
    MemoryType type = MemoryType.episodic,
    MemorySource source = MemorySource.conversation,
    double importance = 0.5,
    double emotionalValence = 0.0,
    List<String>? keywords,
    List<String>? entities,
    List<String>? topics,
    List<double>? embedding,
    EncodingContext? encodingContext,
    Map<String, dynamic>? metadata,
    String? sourceId,
    String? agentId,
    String? userId,
    XiangContext? xiangContext,
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    List<SensoryTag>? sensoryTags,
  }) async {
    _ensureInitialized();
    final extractedKeywords = keywords ?? _keywordExtractor.extractKeywords(content);

    XiangContext? effectiveXiang = xiangContext;
    if (effectiveXiang == null && _xiangPlugin != null) {
      final hasAnyContext = weather != null ||
          temperature != null ||
          activity != null ||
          location != null ||
          ambientMood != null ||
          (sensoryTags != null && sensoryTags.isNotEmpty);
      if (hasAnyContext) {
        effectiveXiang = _xiangPlugin.captureContext(
          weather: weather,
          temperature: temperature,
          activity: activity,
          location: location,
          ambientMood: ambientMood,
          sensoryTags: sensoryTags,
        );
      }
    }

    Map<String, dynamic>? effectiveMetadata = metadata;
    if (effectiveXiang != null) {
      effectiveMetadata = XiangContext.injectIntoMetadata(
        effectiveMetadata,
        effectiveXiang,
      );
    }

    final memory = MemoryItem(
      id: IdGenerator.generate(),
      content: content,
      type: type,
      source: source,
      importance: importance,
      emotionalValence: emotionalValence,
      keywords: extractedKeywords,
      entities: entities ?? [],
      topics: topics ?? [],
      embedding: embedding,
      encodingContext: encodingContext ?? EncodingContext.capture(),
      metadata: effectiveMetadata,
      sourceId: sourceId,
      agentId: agentId,
      userId: userId,
    );

    return await _memoryService.addMemory(memory);
  }

  Future<List<MemorySearchResult>> recall({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    XiangContext? currentXiangContext,
    int limit = 10,
  }) async {
    _ensureInitialized();

    if (_xiangRetrievalEngine != null && queryEmbedding != null && queryEmbedding.isNotEmpty) {
      return await _xiangRetrievalEngine!.retrieve(
        query: query,
        queryEmbedding: queryEmbedding,
        currentContext: currentContext ?? EncodingContext.capture(),
        currentXiangContext: currentXiangContext,
        limit: limit,
      );
    }

    return await _memoryService.searchMemories(
      query: query,
      queryEmbedding: queryEmbedding,
      currentContext: currentContext ?? EncodingContext.capture(),
      limit: limit,
    );
  }

  Future<List<MemorySearchResult>> recallWithScene({
    required String query,
    List<double>? queryEmbedding,
    EncodingContext? currentContext,
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    List<SensoryTag>? sensoryTags,
    int limit = 10,
  }) async {
    _ensureInitialized();

    XiangContext? xiangCtx;
    if (_xiangPlugin != null) {
      xiangCtx = _xiangPlugin.captureContext(
        weather: weather,
        temperature: temperature,
        activity: activity,
        location: location,
        ambientMood: ambientMood,
        sensoryTags: sensoryTags,
      );
    }

    return await recall(
      query: query,
      queryEmbedding: queryEmbedding,
      currentContext: currentContext,
      currentXiangContext: xiangCtx,
      limit: limit,
    );
  }

  Future<List<MemoryItem>> getRecent({int limit = 20}) async {
    _ensureInitialized();
    return await _memoryService.getRecentMemories(limit: limit);
  }

  Future<List<MemoryItem>> getImportant({int limit = 20}) async {
    _ensureInitialized();
    return await _memoryService.getImportantMemories(limit: limit);
  }

  Future<void> decay() async {
    _ensureInitialized();
    await _memoryService.applyDecay(DateTime.now());
  }

  Future<void> prune() async {
    _ensureInitialized();
    await _memoryService.pruneWeakMemories();
  }

  Future<MemoryItem?> getMemory(String id) async {
    _ensureInitialized();
    return await _memoryService.getMemory(id);
  }

  Future<void> updateMemory(MemoryItem memory) async {
    _ensureInitialized();
    await _memoryService.updateMemory(memory);
  }

  Future<void> deleteMemory(String id) async {
    _ensureInitialized();
    await _memoryService.deleteMemory(id);
  }

  Future<void> pinMemory(String id) async {
    _ensureInitialized();
    final memory = await _memoryService.getMemory(id);
    if (memory != null) {
      await _memoryService.updateMemory(memory.copyWith(isPinned: true));
    }
  }

  Future<void> unpinMemory(String id) async {
    _ensureInitialized();
    final memory = await _memoryService.getMemory(id);
    if (memory != null) {
      await _memoryService.updateMemory(memory.copyWith(isPinned: false));
    }
  }

  Future<void> archiveMemory(String id) async {
    _ensureInitialized();
    final memory = await _memoryService.getMemory(id);
    if (memory != null) {
      await _memoryService.updateMemory(memory.copyWith(isArchived: true));
    }
  }

  Future<List<ConsolidationCandidate>> findConsolidationCandidates() async {
    _ensureInitialized();
    return await _memoryService.findConsolidationCandidates();
  }

  Future<ConsolidationResult> consolidate(
    ConsolidationCandidate candidate,
    String Function(List<MemoryItem>) summarizeContent,
  ) async {
    _ensureInitialized();
    return await _memoryService.consolidate(candidate, summarizeContent);
  }

  Future<void> clearAll() async {
    _ensureInitialized();
    await _memoryService.clearAll();
  }

  Future<void> close() async {
    await _memoryService.close();
    _isInitialized = false;
  }

  void _ensureInitialized() {
    if (!_isInitialized) {
      throw StateError('Mnemosyne is not initialized. Call initialize() first.');
    }
  }
}
