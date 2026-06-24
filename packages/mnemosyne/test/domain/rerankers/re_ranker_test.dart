import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_search_result.dart';
import 'package:mnemosyne/features/memory/domain/rerankers/rerankers.dart';
import 'package:mnemosyne/core/constants.dart';

MemoryItem _createMemory({
  required String id,
  String content = 'test content',
  List<double>? embedding,
  DateTime? updatedAt,
  double importance = 0.5,
}) {
  final now = DateTime.now();
  return MemoryItem(
    id: id,
    content: content,
    type: MemoryType.episodic,
    source: MemorySource.conversation,
    status: MemoryStatus.active,
    importance: importance,
    embedding: embedding,
    createdAt: now,
    updatedAt: updatedAt ?? now,
  );
}

MemorySearchResult _createResult({
  required String id,
  String content = 'test content',
  List<double>? embedding,
  DateTime? updatedAt,
  double totalScore = 0.5,
  double importance = 0.5,
}) {
  return MemorySearchResult(
    memory: _createMemory(
      id: id,
      content: content,
      embedding: embedding,
      updatedAt: updatedAt,
      importance: importance,
    ),
    totalScore: totalScore,
    importanceScore: importance,
  );
}

void main() {
  group('ReRankingStrategy', () {
    group('BM25ReRanker', () {
      test('empty results should return empty', () {
        final ranker = BM25ReRanker();
        expect(ranker.reRank([], query: 'test'), isEmpty);
      });

      test('null query should return original order', () {
        final results = [
          _createResult(id: 'm1', content: 'apple banana'),
          _createResult(id: 'm2', content: 'cherry date'),
        ];
        final ranker = BM25ReRanker();
        final reranked = ranker.reRank(results, query: null);
        expect(reranked.map((r) => r.memory.id).toList(), ['m1', 'm2']);
      });

      test('empty query should return original order', () {
        final results = [
          _createResult(id: 'm1', content: 'apple banana'),
          _createResult(id: 'm2', content: 'cherry date'),
        ];
        final ranker = BM25ReRanker();
        final reranked = ranker.reRank(results, query: '');
        expect(reranked.map((r) => r.memory.id).toList(), ['m1', 'm2']);
      });

      test('should rank documents with query terms higher', () {
        final results = [
          _createResult(id: 'm1', content: 'the quick brown fox'),
          _createResult(id: 'm2', content: 'apple banana cherry'),
          _createResult(id: 'm3', content: 'the quick brown dog jumps'),
        ];
        final ranker = BM25ReRanker();
        final reranked = ranker.reRank(results, query: 'quick brown fox');
        // m1 和 m3 都包含查询词，m2 不包含
        final ids = reranked.map((r) => r.memory.id).toList();
        expect(ids.first, anyOf('m1', 'm3'));
        expect(ids.last, 'm2');
      });

      test('should not modify original list', () {
        final original = [
          _createResult(id: 'm1', content: 'apple'),
          _createResult(id: 'm2', content: 'banana'),
        ];
        final ranker = BM25ReRanker();
        ranker.reRank(original, query: 'apple');
        // 原列表顺序不变
        expect(original[0].memory.id, 'm1');
        expect(original[1].memory.id, 'm2');
      });
    });

    group('MMRReRanker', () {
      test('empty results should return empty', () {
        final ranker = MMRReRanker();
        expect(ranker.reRank([]), isEmpty);
      });

      test('single result should return as-is', () {
        final results = [_createResult(id: 'm1', embedding: [1.0, 0.0])];
        final ranker = MMRReRanker();
        final reranked = ranker.reRank(results);
        expect(reranked.length, 1);
        expect(reranked[0].memory.id, 'm1');
      });

      test('should balance relevance and diversity', () {
        final results = [
          _createResult(id: 'm1', embedding: [1.0, 0.0], totalScore: 1.0),
          _createResult(id: 'm2', embedding: [0.99, 0.01], totalScore: 0.9),
          _createResult(id: 'm3', embedding: [0.0, 1.0], totalScore: 0.8),
        ];
        final ranker = MMRReRanker(lambda: 0.5);
        final reranked = ranker.reRank(results);
        expect(reranked.length, 3);
        // m1 最相关，应该排第一
        expect(reranked[0].memory.id, 'm1');
        // m3 与 m1 最不相似（多样性最高），应该排第二
        expect(reranked[1].memory.id, 'm3');
      });

      test('lambda=1 should be pure relevance', () {
        final results = [
          _createResult(id: 'm1', embedding: [1.0, 0.0], totalScore: 0.5),
          _createResult(id: 'm2', embedding: [0.0, 1.0], totalScore: 1.0),
        ];
        final ranker = MMRReRanker(lambda: 1.0);
        final reranked = ranker.reRank(results);
        // 纯相关性：m2 (score=1.0) 应该排第一
        expect(reranked[0].memory.id, 'm2');
      });

      test('null embeddings should not crash', () {
        final results = [
          _createResult(id: 'm1', embedding: null, totalScore: 1.0),
          _createResult(id: 'm2', embedding: null, totalScore: 0.5),
        ];
        final ranker = MMRReRanker();
        expect(() => ranker.reRank(results), returnsNormally);
      });
    });

    group('DiversityReRanker', () {
      test('empty results should return empty', () {
        final ranker = DiversityReRanker();
        expect(ranker.reRank([]), isEmpty);
      });

      test('should maximize diversity', () {
        final results = [
          _createResult(id: 'm1', embedding: [1.0, 0.0]),
          _createResult(id: 'm2', embedding: [0.99, 0.01]),
          _createResult(id: 'm3', embedding: [0.0, 1.0]),
        ];
        final ranker = DiversityReRanker();
        final reranked = ranker.reRank(results);
        expect(reranked.length, 3);
        // m1 第一（初始），m3 第二（与 m1 最不相似）
        expect(reranked[0].memory.id, 'm1');
        expect(reranked[1].memory.id, 'm3');
      });

      test('single result should return as-is', () {
        final results = [_createResult(id: 'm1', embedding: [1.0, 0.0])];
        final ranker = DiversityReRanker();
        final reranked = ranker.reRank(results);
        expect(reranked.length, 1);
      });
    });

    group('RecencyReRanker', () {
      test('empty results should return empty', () {
        final ranker = RecencyReRanker();
        expect(ranker.reRank([]), isEmpty);
      });

      test('should sort by updatedAt descending (most recent first)', () {
        final now = DateTime.now();
        final results = [
          _createResult(
            id: 'old',
            updatedAt: now.subtract(const Duration(hours: 10)),
          ),
          _createResult(
            id: 'new',
            updatedAt: now,
          ),
          _createResult(
            id: 'mid',
            updatedAt: now.subtract(const Duration(hours: 5)),
          ),
        ];
        final ranker = RecencyReRanker();
        final reranked = ranker.reRank(results);
        expect(reranked[0].memory.id, 'new');
        expect(reranked[1].memory.id, 'mid');
        expect(reranked[2].memory.id, 'old');
      });

      test('should not modify original list', () {
        final now = DateTime.now();
        final original = [
          _createResult(id: 'old', updatedAt: now.subtract(const Duration(hours: 10))),
          _createResult(id: 'new', updatedAt: now),
        ];
        final ranker = RecencyReRanker();
        ranker.reRank(original);
        expect(original[0].memory.id, 'old');
        expect(original[1].memory.id, 'new');
      });
    });
  });
}
