import 'dart:math';

class KeywordExtractorService {
  final Set<String> stopWords;
  final int maxNgramLength;

  KeywordExtractorService({
    Set<String>? stopWords,
    this.maxNgramLength = 4,
  }) : stopWords = stopWords ?? _defaultStopWords;

  static final _defaultStopWords = <String>{
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
    'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further',
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
    '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '们', '吗',
    '吧', '呢', '啊', '哦', '嗯', '把', '被', '让', '给', '从', '向',
    '对', '与', '而', '但', '却', '又', '还', '已', '已经', '过', '来',
    '得', '地', '所', '以', '因', '为', '之', '其', '此', '些',
    '每', '各', '该', '本', '于', '及', '等', '种', '样', '么', '什么',
  };

  List<String> extractKeywords(String content, {int maxKeywords = 10}) {
    final chineseSegments = _segmentChinese(content);
    final englishWords = _extractEnglishWords(content);
    final allTerms = <String>[...chineseSegments, ...englishWords];

    final filtered = allTerms
        .where((term) => term.length > 1 && !stopWords.contains(term))
        .toList();

    if (filtered.isEmpty) return [];

    final tfidfScores = _calculateTfIdf(filtered);
    final sorted = tfidfScores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return sorted.take(maxKeywords).map((e) => e.key).toList();
  }

  List<String> lemmatizeForSearch(String content) {
    final chineseSegments = _segmentChinese(content);
    final englishWords = _extractEnglishWords(content);

    final lemmatized = <String>[];
    for (final word in englishWords) {
      lemmatized.add(_simpleEnglishLemmatize(word));
    }
    lemmatized.addAll(chineseSegments);

    return lemmatized
        .where((term) => term.length > 1 && !stopWords.contains(term.toLowerCase()))
        .toList();
  }

  double calculateKeywordMatch(String query, List<String> keywords) {
    final queryTerms = _segmentChinese(query)
      ..addAll(_extractEnglishWords(query));

    if (queryTerms.isEmpty) return 0.0;

    final normalizedQueryTerms = queryTerms.map((t) => t.toLowerCase()).toSet();
    final normalizedKeywords = keywords.map((k) => k.toLowerCase()).toSet();

    int exactMatches = 0;
    int partialMatches = 0;

    for (final queryTerm in normalizedQueryTerms) {
      if (normalizedKeywords.contains(queryTerm)) {
        exactMatches++;
      } else {
        for (final keyword in normalizedKeywords) {
          if (keyword.length >= 2 && queryTerm.length >= 2) {
            if (keyword.contains(queryTerm) || queryTerm.contains(keyword)) {
              partialMatches++;
              break;
            }
          }
        }
      }
    }

    final score = (exactMatches * 1.0 + partialMatches * 0.3) / normalizedQueryTerms.length;
    return score.clamp(0.0, 1.0);
  }

  List<String> _segmentChinese(String text) {
    final segments = <String>[];
    final chineseRegex = RegExp(r'[\u4e00-\u9fa5]+');
    final matches = chineseRegex.allMatches(text);

    for (final match in matches) {
      final segment = match.group(0)!;
      segments.addAll(_bigramSegment(segment));
    }

    return segments;
  }

  List<String> _bigramSegment(String chinese) {
    if (chinese.length <= 1) return [chinese];
    if (chinese.length <= maxNgramLength) return [chinese];

    final ngrams = <String>[];
    for (int n = 2; n <= maxNgramLength && n <= chinese.length; n++) {
      for (int i = 0; i <= chinese.length - n; i++) {
        ngrams.add(chinese.substring(i, i + n));
      }
    }

    final scored = <String, double>{};
    for (final ngram in ngrams) {
      scored[ngram] = (scored[ngram] ?? 0.0) + 1.0;
    }

    final sorted = scored.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final result = <String>[];
    final used = List.filled(chinese.length, false);

    for (final entry in sorted) {
      final ngram = entry.key;
      final start = chinese.indexOf(ngram);
      if (start >= 0) {
        var overlaps = false;
        for (int i = start; i < start + ngram.length && i < used.length; i++) {
          if (used[i]) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          result.add(ngram);
          for (int i = start; i < start + ngram.length && i < used.length; i++) {
            used[i] = true;
          }
        }
      }
    }

    return result;
  }

  List<String> _extractEnglishWords(String text) {
    return text
        .toLowerCase()
        .replaceAll(RegExp(r'[^\w\s\u4e00-\u9fa5]'), ' ')
        .split(RegExp(r'\s+'))
        .where((word) => word.length > 1 &&
            !stopWords.contains(word) &&
            !RegExp(r'^[\u4e00-\u9fa5]+$').hasMatch(word))
        .toList();
  }

  String _simpleEnglishLemmatize(String word) {
    final lower = word.toLowerCase();
    if (lower.endsWith('ing') && lower.length > 5) {
      return lower.substring(0, lower.length - 3);
    }
    if (lower.endsWith('ed') && lower.length > 4) {
      return lower.substring(0, lower.length - 2);
    }
    if (lower.endsWith('ly') && lower.length > 4) {
      return lower.substring(0, lower.length - 2);
    }
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) {
      return lower.substring(0, lower.length - 1);
    }
    if (lower.endsWith('es') && lower.length > 4) {
      return lower.substring(0, lower.length - 2);
    }
    return lower;
  }

  Map<String, double> _calculateTfIdf(List<String> terms) {
    final tf = <String, double>{};
    final totalTerms = terms.length;

    for (final term in terms) {
      tf[term] = (tf[term] ?? 0.0) + 1.0;
    }

    for (final key in tf.keys) {
      tf[key] = tf[key]! / totalTerms;
    }

    final uniqueTerms = tf.keys.toSet();
    final idf = <String, double>{};
    final docCount = 1.0;

    for (final term in uniqueTerms) {
      idf[term] = log((docCount + 1.0) / (1.0 + 1.0)) + 1.0;
    }

    final tfidf = <String, double>{};
    for (final term in uniqueTerms) {
      tfidf[term] = (tf[term] ?? 0.0) * (idf[term] ?? 0.0);
    }

    return tfidf;
  }
}
