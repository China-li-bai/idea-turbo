import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';

/// 重排策略接口。
///
/// 参考 isar_agent_memory 0.4.0 的 ReRankingStrategy 设计，
/// 适配 mnemosyne 的 MemorySearchResult（而非 MemoryNode）。
abstract class ReRankingStrategy {
  /// 对检索结果重排。
  ///
  /// [results] 初始检索结果列表。
  /// [query] 原始查询文本，BM25 等策略需要。
  /// 返回重排后的列表（不应修改原列表）。
  List<MemorySearchResult> reRank(
    List<MemorySearchResult> results, {
    String? query,
  });
}
