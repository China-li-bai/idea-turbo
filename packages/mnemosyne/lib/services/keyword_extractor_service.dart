import 'dart:math';

class KeywordExtractorService {
  final Set<String> stopWords = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'dare', 'ought', 'used', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
    'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'this', 'that',
    'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'where',
    'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
    'there', 'then', 'once', 'if', 'because', 'as', 'until', 'while',
    'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', '的', '了', '在', '是', '我', '有',
    '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到',
    '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
  };

  List<String> extractKeywords(String content, {int maxKeywords = 10}) {
    final words = content
        .toLowerCase()
        .replaceAll(RegExp(r'[^\w\s\u4e00-\u9fa5]'), ' ')
        .split(RegExp(r'\s+'))
        .where((word) => word.length > 1 && !stopWords.contains(word))
        .toList();

    final wordCount = <String, int>{};
    for (final word in words) {
      wordCount[word] = (wordCount[word] ?? 0) + 1;
    }

    final sortedWords = wordCount.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return sortedWords.take(maxKeywords).map((e) => e.key).toList();
  }

  double calculateKeywordMatch(String query, List<String> keywords) {
    final queryWords = query.toLowerCase().split(RegExp(r'\s+'));
    int matches = 0;

    for (final qWord in queryWords) {
      for (final keyword in keywords) {
        if (keyword.contains(qWord) || qWord.contains(keyword)) {
          matches++;
          break;
        }
      }
    }

    return queryWords.isEmpty ? 0.0 : matches / queryWords.length.toDouble();
  }
}
