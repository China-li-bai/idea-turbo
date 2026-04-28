import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class MemorySearchResult {
  final MemoryItem memory;
  final double totalScore;
  final double semanticScore;
  final double keywordScore;
  final double recencyScore;
  final double importanceScore;
  final double contextMatchScore;

  MemorySearchResult({
    required this.memory,
    this.totalScore = 0.0,
    this.semanticScore = 0.0,
    this.keywordScore = 0.0,
    this.recencyScore = 0.0,
    this.importanceScore = 0.0,
    this.contextMatchScore = 0.0,
  });

  MemorySearchResult copyWith({
    MemoryItem? memory,
    double? totalScore,
    double? semanticScore,
    double? keywordScore,
    double? recencyScore,
    double? importanceScore,
    double? contextMatchScore,
  }) {
    return MemorySearchResult(
      memory: memory ?? this.memory,
      totalScore: totalScore ?? this.totalScore,
      semanticScore: semanticScore ?? this.semanticScore,
      keywordScore: keywordScore ?? this.keywordScore,
      recencyScore: recencyScore ?? this.recencyScore,
      importanceScore: importanceScore ?? this.importanceScore,
      contextMatchScore: contextMatchScore ?? this.contextMatchScore,
    );
  }

  @override
  String toString() {
    return 'MemorySearchResult(memory: ${memory.id}, totalScore: $totalScore)';
  }
}
