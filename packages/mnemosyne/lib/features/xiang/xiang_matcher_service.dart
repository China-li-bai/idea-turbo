import 'package:mnemosyne/features/xiang/xiang_context.dart';
import 'package:mnemosyne/features/xiang/xiang_profile.dart';
import 'package:mnemosyne/features/xiang/xiang_config.dart';

abstract class XiangMatcherService {
  double matchScore(XiangProfile stored, XiangContext current);
}

class DefaultXiangMatcherService implements XiangMatcherService {
  final XiangConfig config;

  DefaultXiangMatcherService({this.config = const XiangConfig()});

  static const Map<String, Map<String, double>> _weatherSimilarity = {
    'sunny': {
      'sunny': 1.0,
      'cloudy': 0.4,
      'overcast': 0.3,
      'rainy': 0.1,
      'drizzle': 0.15,
      'stormy': 0.05,
      'snowy': 0.1,
      'foggy': 0.2,
      '晴': 1.0,
      '多云': 0.4,
      '阴': 0.3,
      '雨': 0.1,
      '小雨': 0.15,
      '暴雨': 0.05,
      '雪': 0.1,
      '雾': 0.2,
    },
    'cloudy': {
      'sunny': 0.4,
      'cloudy': 1.0,
      'overcast': 0.8,
      'rainy': 0.5,
      'drizzle': 0.6,
      'stormy': 0.2,
      'snowy': 0.3,
      'foggy': 0.5,
      '晴': 0.4,
      '多云': 1.0,
      '阴': 0.8,
      '雨': 0.5,
      '小雨': 0.6,
      '暴雨': 0.2,
      '雪': 0.3,
      '雾': 0.5,
    },
    'rainy': {
      'sunny': 0.1,
      'cloudy': 0.5,
      'overcast': 0.6,
      'rainy': 1.0,
      'drizzle': 0.8,
      'stormy': 0.6,
      'snowy': 0.3,
      'foggy': 0.4,
      '晴': 0.1,
      '多云': 0.5,
      '阴': 0.6,
      '雨': 1.0,
      '小雨': 0.8,
      '暴雨': 0.6,
      '雪': 0.3,
      '雾': 0.4,
    },
    'snowy': {
      'sunny': 0.1,
      'cloudy': 0.3,
      'overcast': 0.5,
      'rainy': 0.3,
      'drizzle': 0.2,
      'stormy': 0.3,
      'snowy': 1.0,
      'foggy': 0.4,
      '晴': 0.1,
      '多云': 0.3,
      '阴': 0.5,
      '雨': 0.3,
      '小雨': 0.2,
      '暴雨': 0.3,
      '雪': 1.0,
      '雾': 0.4,
    },
    '晴': {
      'sunny': 1.0,
      'cloudy': 0.4,
      'overcast': 0.3,
      'rainy': 0.1,
      '晴': 1.0,
      '多云': 0.4,
      '阴': 0.3,
      '雨': 0.1,
    },
    '多云': {
      'sunny': 0.4,
      'cloudy': 1.0,
      'overcast': 0.8,
      'rainy': 0.5,
      '晴': 0.4,
      '多云': 1.0,
      '阴': 0.8,
      '雨': 0.5,
    },
    '阴': {
      'sunny': 0.3,
      'cloudy': 0.8,
      'overcast': 1.0,
      'rainy': 0.6,
      '晴': 0.3,
      '多云': 0.8,
      '阴': 1.0,
      '雨': 0.6,
    },
    '雨': {
      'sunny': 0.1,
      'cloudy': 0.5,
      'overcast': 0.6,
      'rainy': 1.0,
      '晴': 0.1,
      '多云': 0.5,
      '阴': 0.6,
      '雨': 1.0,
    },
    '雪': {
      'sunny': 0.1,
      'cloudy': 0.3,
      'overcast': 0.5,
      'rainy': 0.3,
      'snowy': 1.0,
      '晴': 0.1,
      '多云': 0.3,
      '阴': 0.5,
      '雨': 0.3,
      '雪': 1.0,
    },
  };

  static const Map<String, Map<String, double>> _activitySimilarity = {
    'working': {
      'working': 1.0,
      'studying': 0.7,
      'coding': 0.8,
      'meeting': 0.6,
      'commuting': 0.2,
      'exercising': 0.1,
      'relaxing': 0.1,
      'cooking': 0.15,
      'shopping': 0.1,
      'gaming': 0.2,
      '工作': 1.0,
      '学习': 0.7,
      '写代码': 0.8,
      '开会': 0.6,
      '通勤': 0.2,
      '运动': 0.1,
      '休息': 0.1,
      '做饭': 0.15,
      '购物': 0.1,
      '游戏': 0.2,
    },
    'exercising': {
      'working': 0.1,
      'studying': 0.1,
      'coding': 0.05,
      'meeting': 0.05,
      'commuting': 0.2,
      'exercising': 1.0,
      'running': 0.9,
      'walking': 0.7,
      'relaxing': 0.2,
      '运动': 1.0,
      '跑步': 0.9,
      '散步': 0.7,
      '休息': 0.2,
    },
    'relaxing': {
      'working': 0.1,
      'studying': 0.2,
      'coding': 0.1,
      'meeting': 0.05,
      'commuting': 0.15,
      'exercising': 0.2,
      'relaxing': 1.0,
      'reading': 0.7,
      'watching': 0.6,
      'sleeping': 0.5,
      '休息': 1.0,
      '阅读': 0.7,
      '看剧': 0.6,
      '睡觉': 0.5,
    },
    'commuting': {
      'working': 0.2,
      'studying': 0.15,
      'exercising': 0.2,
      'relaxing': 0.15,
      'commuting': 1.0,
      'driving': 0.8,
      'walking': 0.4,
      '通勤': 1.0,
      '开车': 0.8,
      '散步': 0.4,
    },
    '工作': {
      'working': 1.0,
      'studying': 0.7,
      'coding': 0.8,
      'meeting': 0.6,
      '工作': 1.0,
      '学习': 0.7,
      '写代码': 0.8,
      '开会': 0.6,
    },
    '运动': {
      'exercising': 1.0,
      'running': 0.9,
      'walking': 0.7,
      '运动': 1.0,
      '跑步': 0.9,
      '散步': 0.7,
    },
    '休息': {
      'relaxing': 1.0,
      'reading': 0.7,
      'watching': 0.6,
      'sleeping': 0.5,
      '休息': 1.0,
      '阅读': 0.7,
      '看剧': 0.6,
      '睡觉': 0.5,
    },
  };

  static const Map<String, Map<String, double>> _locationSimilarity = {
    'home': {
      'home': 1.0,
      'apartment': 0.9,
      'bedroom': 0.8,
      'office': 0.1,
      'outdoor': 0.1,
      'cafe': 0.2,
      'restaurant': 0.2,
      'park': 0.15,
      '家': 1.0,
      '公寓': 0.9,
      '卧室': 0.8,
      '办公室': 0.1,
      '户外': 0.1,
      '咖啡厅': 0.2,
      '餐厅': 0.2,
      '公园': 0.15,
    },
    'office': {
      'home': 0.1,
      'office': 1.0,
      'workplace': 0.9,
      'meeting_room': 0.8,
      'cafe': 0.3,
      'outdoor': 0.05,
      '家': 0.1,
      '办公室': 1.0,
      '公司': 0.9,
      '会议室': 0.8,
      '咖啡厅': 0.3,
      '户外': 0.05,
    },
    'outdoor': {
      'home': 0.1,
      'office': 0.05,
      'outdoor': 1.0,
      'park': 0.8,
      'street': 0.7,
      'nature': 0.8,
      'cafe': 0.1,
      '家': 0.1,
      '办公室': 0.05,
      '户外': 1.0,
      '公园': 0.8,
      '街道': 0.7,
      '大自然': 0.8,
    },
    'cafe': {
      'home': 0.2,
      'office': 0.3,
      'outdoor': 0.1,
      'cafe': 1.0,
      'restaurant': 0.6,
      'library': 0.5,
      '家': 0.2,
      '办公室': 0.3,
      '户外': 0.1,
      '咖啡厅': 1.0,
      '餐厅': 0.6,
      '图书馆': 0.5,
    },
    '家': {
      'home': 1.0,
      'apartment': 0.9,
      'bedroom': 0.8,
      '家': 1.0,
      '公寓': 0.9,
      '卧室': 0.8,
    },
    '办公室': {
      'office': 1.0,
      'workplace': 0.9,
      '办公室': 1.0,
      '公司': 0.9,
    },
    '户外': {
      'outdoor': 1.0,
      'park': 0.8,
      'street': 0.7,
      '户外': 1.0,
      '公园': 0.8,
      '街道': 0.7,
    },
  };

  static const Map<String, Map<String, double>> _ambientMoodSimilarity = {
    'peaceful': {
      'peaceful': 1.0,
      'calm': 0.9,
      'quiet': 0.8,
      'cozy': 0.7,
      'tense': 0.1,
      'lively': 0.2,
      'noisy': 0.1,
      '平静': 1.0,
      '安静': 0.8,
      '温馨': 0.7,
      '紧张': 0.1,
      '热闹': 0.2,
      '吵闹': 0.1,
    },
    'lively': {
      'peaceful': 0.2,
      'calm': 0.3,
      'quiet': 0.1,
      'cozy': 0.3,
      'tense': 0.3,
      'lively': 1.0,
      'noisy': 0.6,
      'energetic': 0.8,
      '平静': 0.2,
      '安静': 0.1,
      '温馨': 0.3,
      '紧张': 0.3,
      '热闹': 1.0,
      '吵闹': 0.6,
    },
    'tense': {
      'peaceful': 0.1,
      'calm': 0.1,
      'quiet': 0.2,
      'cozy': 0.1,
      'tense': 1.0,
      'lively': 0.3,
      'noisy': 0.4,
      'stressful': 0.9,
      '平静': 0.1,
      '安静': 0.2,
      '温馨': 0.1,
      '紧张': 1.0,
      '热闹': 0.3,
      '吵闹': 0.4,
    },
    '平静': {
      'peaceful': 1.0,
      'calm': 0.9,
      'quiet': 0.8,
      '平静': 1.0,
      '安静': 0.8,
    },
    '热闹': {
      'lively': 1.0,
      'noisy': 0.6,
      'energetic': 0.8,
      '热闹': 1.0,
      '吵闹': 0.6,
    },
    '紧张': {
      'tense': 1.0,
      'stressful': 0.9,
      '紧张': 1.0,
    },
  };

  @override
  double matchScore(XiangProfile stored, XiangContext current) {
    double totalScore = 0.0;
    double totalWeight = 0.0;

    final original = stored.originalContext;

    if (original.weather != null && current.weather != null) {
      final clarity = stored.clarityFor('weather');
      final similarity = _lookupSimilarity(
        _weatherSimilarity,
        original.weather!,
        current.weather!,
      );
      final fuzzinessBoost = 1.0 + (1.0 - clarity) * 0.5;
      totalScore += similarity * fuzzinessBoost * config.weatherMatchWeight;
      totalWeight += config.weatherMatchWeight;
    }

    if (original.temperature != null && current.temperature != null) {
      final clarity = stored.clarityFor('temperature');
      final similarity = _stringSimilarity(original.temperature!, current.temperature!);
      final fuzzinessBoost = 1.0 + (1.0 - clarity) * 0.5;
      totalScore += similarity * fuzzinessBoost * config.weatherMatchWeight * 0.8;
      totalWeight += config.weatherMatchWeight * 0.8;
    }

    if (original.activity != null && current.activity != null) {
      final clarity = stored.clarityFor('activity');
      final similarity = _lookupSimilarity(
        _activitySimilarity,
        original.activity!,
        current.activity!,
      );
      final fuzzinessBoost = 1.0 + (1.0 - clarity) * 0.5;
      totalScore += similarity * fuzzinessBoost * config.activityMatchWeight;
      totalWeight += config.activityMatchWeight;
    }

    if (original.location != null && current.location != null) {
      final clarity = stored.clarityFor('location');
      final similarity = _lookupSimilarity(
        _locationSimilarity,
        original.location!,
        current.location!,
      );
      final fuzzinessBoost = 1.0 + (1.0 - clarity) * 0.5;
      totalScore += similarity * fuzzinessBoost * config.locationMatchWeight;
      totalWeight += config.locationMatchWeight;
    }

    if (original.ambientMood != null && current.ambientMood != null) {
      final clarity = stored.clarityFor('ambientMood');
      final similarity = _lookupSimilarity(
        _ambientMoodSimilarity,
        original.ambientMood!,
        current.ambientMood!,
      );
      final fuzzinessBoost = 1.0 + (1.0 - clarity) * 0.5;
      totalScore += similarity * fuzzinessBoost * config.ambientMoodMatchWeight;
      totalWeight += config.ambientMoodMatchWeight;
    }

    if (original.sensoryTags.isNotEmpty && current.sensoryTags.isNotEmpty) {
      final tagScore = _matchSensoryTags(stored, current);
      totalScore += tagScore * config.sensoryTagMatchWeight;
      totalWeight += config.sensoryTagMatchWeight;
    }

    return totalWeight > 0 ? (totalScore / totalWeight).clamp(0.0, 1.0) : 0.0;
  }

  double _matchSensoryTags(XiangProfile stored, XiangContext current) {
    final storedByCategory = <String, List<SensoryTag>>{};
    for (final tag in stored.blurredTags) {
      storedByCategory.putIfAbsent(tag.category, () => []).add(tag);
    }

    double totalScore = 0.0;
    int comparisons = 0;

    for (final currentTag in current.sensoryTags) {
      final storedTags = storedByCategory[currentTag.category];
      if (storedTags == null || storedTags.isEmpty) continue;

      double bestScore = 0.0;
      for (final storedTag in storedTags) {
        final valueSim = _stringSimilarity(storedTag.value, currentTag.value);
        final intensityFactor = storedTag.intensity;
        final score = valueSim * intensityFactor;
        if (score > bestScore) bestScore = score;
      }

      totalScore += bestScore;
      comparisons++;
    }

    return comparisons > 0 ? totalScore / comparisons : 0.0;
  }

  double _lookupSimilarity(
    Map<String, Map<String, double>> matrix,
    String a,
    String b,
  ) {
    if (a.toLowerCase() == b.toLowerCase()) return 1.0;

    final row = matrix[a.toLowerCase()] ?? matrix[a];
    if (row != null) {
      final score = row[b.toLowerCase()] ?? row[b];
      if (score != null) return score;
    }

    final reverseRow = matrix[b.toLowerCase()] ?? matrix[b];
    if (reverseRow != null) {
      final score = reverseRow[a.toLowerCase()] ?? reverseRow[a];
      if (score != null) return score;
    }

    return _stringSimilarity(a, b);
  }

  double _stringSimilarity(String a, String b) {
    if (a.toLowerCase() == b.toLowerCase()) return 1.0;
    if (a.isEmpty || b.isEmpty) return 0.0;

    final setA = a.toLowerCase().split('').toSet();
    final setB = b.toLowerCase().split('').toSet();
    final intersection = setA.intersection(setB).length;
    final union = setA.union(setB).length;
    return union > 0 ? intersection / union : 0.0;
  }
}
