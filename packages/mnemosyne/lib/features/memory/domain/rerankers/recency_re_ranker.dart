import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 're_ranking_strategy.dart';

/// 时间近因重排策略。
///
/// 按记忆的更新/创建时间降序排列，最近的优先。
/// 参考 isar_agent_memory 0.4.0 的 RecencyReRanker。
class RecencyReRanker implements ReRankingStrategy {
  @override
  List<MemorySearchResult> reRank(
    List<MemorySearchResult> results, {
    String? query,
  }) {
    final sorted = List<MemorySearchResult>.of(results);
    sorted.sort((a, b) {
      final dateA = b.memory.updatedAt;
      final dateB = a.memory.updatedAt;
      return dateA.compareTo(dateB);
    });
    return sorted;
  }
}
