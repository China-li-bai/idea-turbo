import 'dart:math';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class ConsolidationCandidate {
  final List<MemoryItem> memories;
  final List<double> centroid;
  final double similarityScore;
  final double combinedImportance;
  final List<String> sharedEntities;
  final List<String> sharedTopics;

  ConsolidationCandidate({
    required this.memories,
    required this.centroid,
    required this.similarityScore,
    required this.combinedImportance,
    required this.sharedEntities,
    required this.sharedTopics,
  });
}

class ConsolidationResult {
  final String consolidatedMemoryId;
  final List<String> sourceMemoryIds;
  final String memoryType;
  final String contentSummary;
  final double combinedImportance;
  final List<String> sharedEntities;
  final List<String> sharedTopics;
  final List<double> centroidEmbedding;
  final DateTime consolidationTimestamp;

  ConsolidationResult({
    required this.consolidatedMemoryId,
    required this.sourceMemoryIds,
    required this.memoryType,
    required this.contentSummary,
    required this.combinedImportance,
    required this.sharedEntities,
    required this.sharedTopics,
    required this.centroidEmbedding,
    required this.consolidationTimestamp,
  });
}

class ConsolidationEngine {
  final int minMemories;
  final double similarityThreshold;
  final int minAccessCount;
  final double minAgeHours;
  final int maxClusterSize;
  final bool preserveSourceMemories;
  final Set<MemoryType> eligibleTypes;
  int _totalConsolidations = 0;

  ConsolidationEngine({
    this.minMemories = 3,
    this.similarityThreshold = 0.75,
    this.minAccessCount = 2,
    this.minAgeHours = 24.0,
    this.maxClusterSize = 10,
    this.preserveSourceMemories = true,
    Set<MemoryType>? eligibleTypes,
  }) : eligibleTypes = eligibleTypes ?? {MemoryType.episodic};

  List<ConsolidationCandidate> findConsolidationCandidates(
    List<MemoryItem> memories,
    DateTime now,
  ) {
    final eligible = _filterEligibleMemories(memories, now);
    if (eligible.length < minMemories) return [];

    final clusters = _clusterBySimilarity(eligible);
    return clusters
        .where((c) => c.length >= minMemories)
        .map((c) => _createCandidate(c))
        .toList();
  }

  ConsolidationResult consolidate(
    ConsolidationCandidate candidate, {
    String Function(List<MemoryItem>)? contentGenerator,
  }) {
    _totalConsolidations++;

    final contentSummary = contentGenerator != null
        ? contentGenerator(candidate.memories)
        : _defaultContentSummary(candidate);

    return ConsolidationResult(
      consolidatedMemoryId:
          'consolidated_${DateTime.now().millisecondsSinceEpoch}',
      sourceMemoryIds: candidate.memories.map((m) => m.id).toList(),
      memoryType: 'semantic',
      contentSummary: contentSummary,
      combinedImportance: candidate.combinedImportance,
      sharedEntities: candidate.sharedEntities,
      sharedTopics: candidate.sharedTopics,
      centroidEmbedding: candidate.centroid,
      consolidationTimestamp: DateTime.now(),
    );
  }

  String _defaultContentSummary(ConsolidationCandidate candidate) {
    final contents = candidate.memories.map((m) => m.content).toList();
    final uniqueContents = contents.toSet().toList();

    if (uniqueContents.length == 1) return uniqueContents[0];

    return uniqueContents.take(5).join(' | ');
  }

  bool shouldConsolidate(
    ConsolidationCandidate candidate, {
    double? minSimilarity,
    double minImportance = 0.3,
  }) {
    final effectiveMinSimilarity = minSimilarity ?? similarityThreshold;

    if (candidate.memories.length < minMemories) return false;
    if (candidate.similarityScore < effectiveMinSimilarity) return false;
    if (candidate.combinedImportance < minImportance) return false;
    return true;
  }

  Map<String, dynamic> getConsolidationStats() {
    return {
      'totalConsolidations': _totalConsolidations,
    };
  }

  List<double> calculateCentroid(List<List<double>> embeddings) {
    if (embeddings.isEmpty) return [];
    final dim = embeddings.first.length;
    final centroid = List.filled(dim, 0.0);
    var count = 0;
    for (final emb in embeddings) {
      if (emb.length != dim) continue;
      for (int i = 0; i < dim; i++) {
        centroid[i] += emb[i];
      }
      count++;
    }
    if (count == 0) return [];
    for (int i = 0; i < dim; i++) {
      centroid[i] /= count;
    }
    return centroid;
  }

  List<String> findSharedItems(List<List<String>> itemLists) {
    if (itemLists.isEmpty) return [];
    final counts = <String, int>{};
    for (final list in itemLists) {
      for (final item in list.toSet()) {
        counts[item] = (counts[item] ?? 0) + 1;
      }
    }
    final threshold = itemLists.length ~/ 2;
    return counts.entries
        .where((e) => e.value > threshold)
        .map((e) => e.key)
        .toList();
  }

  List<MemoryItem> _filterEligibleMemories(
    List<MemoryItem> memories,
    DateTime now,
  ) {
    final minAgeSeconds = minAgeHours * 3600;
    return memories.where((m) {
      if (m.isConsolidated) return false;
      if (!eligibleTypes.contains(m.type)) return false;
      if (m.status != MemoryStatus.active) return false;
      if (m.accessCount < minAccessCount) return false;
      final age = now.difference(m.createdAt).inSeconds.toDouble();
      if (age < minAgeSeconds) return false;
      if (m.embedding == null || m.embedding!.isEmpty) return false;
      return true;
    }).toList();
  }

  List<List<MemoryItem>> _clusterBySimilarity(List<MemoryItem> memories) {
    final clusters = <List<MemoryItem>>[];
    final assigned = <String>{};

    for (final memory in memories) {
      if (assigned.contains(memory.id)) continue;

      final cluster = [memory];
      assigned.add(memory.id);

      for (final other in memories) {
        if (assigned.contains(other.id)) continue;
        if (cluster.length >= maxClusterSize) break;

        final similarity = _cosineSimilarity(
          memory.embedding!,
          other.embedding!,
        );
        if (similarity >= similarityThreshold) {
          cluster.add(other);
          assigned.add(other.id);
        }
      }

      clusters.add(cluster);
    }

    return clusters;
  }

  ConsolidationCandidate _createCandidate(List<MemoryItem> cluster) {
    final embeddings = cluster
        .where((m) => m.embedding != null && m.embedding!.isNotEmpty)
        .map((m) => m.embedding!)
        .toList();
    final centroid = calculateCentroid(embeddings);

    double similarityScore = 0.0;
    if (centroid.isNotEmpty) {
      final similarities = cluster
          .where((m) => m.embedding != null && m.embedding!.isNotEmpty)
          .map((m) => _cosineSimilarity(m.embedding!, centroid))
          .toList();
      similarityScore = similarities.isEmpty
          ? 0.0
          : similarities.reduce((a, b) => a + b) / similarities.length;
    }

    final combinedImportance =
        cluster.map((m) => m.importance).reduce((a, b) => a + b) /
            cluster.length;

    final sharedEntities = findSharedItems(
      cluster.map((m) => m.entities).toList(),
    );
    final sharedTopics = findSharedItems(
      cluster.map((m) => m.topics).toList(),
    );

    return ConsolidationCandidate(
      memories: cluster,
      centroid: centroid,
      similarityScore: similarityScore,
      combinedImportance: combinedImportance,
      sharedEntities: sharedEntities,
      sharedTopics: sharedTopics,
    );
  }

  double _cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length || a.isEmpty) return 0.0;
    double dotProduct = 0, normA = 0, normB = 0;
    for (int i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA == 0 || normB == 0) return 0.0;
    return (dotProduct / (sqrt(normA) * sqrt(normB))).clamp(-1.0, 1.0);
  }
}
