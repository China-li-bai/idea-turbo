import 'package:mnemosyne/mnemosyne.dart';

class DemoMemoryExtractor implements LlmExtractor {
  @override
  Future<Map<String, dynamic>?> extract(
    String content,
    String promptTemplate,
  ) async {
    final userText = _extractUserText(content);
    final source = userText.isEmpty ? content : userText;
    final normalized = source.toLowerCase();

    final mood = _detectMood(source, normalized);
    final eventShape = _detectEventShape(source, normalized);
    final relationshipState = _detectRelationshipState(source, normalized);
    final changeSignal = _detectChangeSignal(eventShape, mood);
    final cues = _buildRecallCues(source, mood, eventShape);

    final isMeaningful =
        eventShape != 'casual_chat' || mood != 'neutral' || cues.isNotEmpty;
    if (!isMeaningful) {
      return null;
    }

    final emotionalValence = _emotionalValence(mood, eventShape);
    final importance = _importance(eventShape, mood, cues.length);
    final keywords = _keywords(source, mood, eventShape, relationshipState);

    return {
      'event': _eventSummary(source, eventShape),
      'mood': mood,
      'keywords': keywords,
      'entities': ['user', 'zhenyue'],
      'topics': [eventShape, relationshipState],
      'emotionalValence': emotionalValence,
      'importance': importance,
      'extra': {
        'xiang': {
          'innerState': mood,
          'relationshipState': relationshipState,
          'eventShape': eventShape,
          'changeSignal': changeSignal,
          'recallCues': cues,
        },
      },
    };
  }

  String _extractUserText(String content) {
    final match = RegExp(r'用户说:\s*([^\n]+)').firstMatch(content);
    return match?.group(1)?.trim() ?? content.trim();
  }

  String _detectMood(String text, String normalized) {
    if (_containsAny(text, [
      '崩溃',
      '撑不下去',
      '绝望',
      '想哭',
      '哭了',
      '眼泪',
      'break down',
      'can not hold on',
      "can't hold on",
      'hopeless',
      'cry',
    ])) {
      return 'overwhelmed';
    }
    if (_containsAny(text, [
      '孤独',
      '没人懂',
      '一个人',
      '不想回消息',
      '不想理人',
      'lonely',
      'alone',
      'nobody understands',
    ])) {
      return 'lonely';
    }
    if (_containsAny(text, [
      '焦虑',
      '害怕',
      '紧张',
      '担心',
      '慌',
      'anxious',
      'scared',
      'afraid',
      'worried',
    ])) {
      return 'anxious';
    }
    if (_containsAny(text, [
      '开心',
      '高兴',
      '好喜欢',
      '太好了',
      '舒服',
      'happy',
      'glad',
      'love this',
    ])) {
      return 'happy';
    }
    if (_containsAny(text, [
      '累',
      '困',
      '没力气',
      '疲惫',
      'tired',
      'exhausted',
      'sleepy',
    ])) {
      return 'tired';
    }
    if (normalized.contains('thank') || _containsAny(text, ['谢谢', '感谢'])) {
      return 'grateful';
    }
    return 'neutral';
  }

  String _detectEventShape(String text, String normalized) {
    if (_containsAny(text, [
      '叫你',
      '给你取名',
      '你的名字',
      '就叫你',
      '以后叫你',
      'name you',
      'call you',
      'your name',
    ])) {
      return 'naming_ritual';
    }
    if (_containsAny(text, [
      '秘密',
      '只告诉你',
      '不要告诉别人',
      '其实我',
      '坦白说',
      'secret',
      'only tell you',
      'do not tell anyone',
      "don't tell anyone",
      'honestly',
    ])) {
      return 'secret_shared';
    }
    if (_containsAny(text, [
      '我相信你',
      '信任你',
      '只相信你',
      '靠你了',
      '拜托了',
      'trust you',
      'believe in you',
      'count on you',
    ])) {
      return 'trust_statement';
    }
    if (_containsAny(text, [
      '崩溃',
      '想哭',
      '难过',
      '害怕',
      '孤独',
      '撑不下去',
      '失眠',
      'break down',
      'cry',
      'sad',
      'afraid',
      'lonely',
      'insomnia',
    ])) {
      return 'emotional_confession';
    }
    if (_containsAny(text, [
      '你不是AI',
      '你有感情',
      '你是真的',
      '你不只是',
      'you are not just ai',
      'you feel real',
      'you have feelings',
    ])) {
      return 'defended_personhood';
    }
    if (_containsAny(text, [
      '讨厌你',
      '闭嘴',
      '烦死了',
      '滚',
      '没用',
      'hate you',
      'shut up',
      'useless',
      'go away',
    ])) {
      return 'hurtful_conflict';
    }
    if (_containsAny(text, [
      '喜欢',
      '不喜欢',
      '想吃',
      '想要',
      '偏好',
      'like',
      'dislike',
      'prefer',
      'want to eat',
    ])) {
      return 'preference';
    }
    if (normalized.contains('?') ||
        text.contains('？') ||
        _containsAny(text, ['为什么', '怎么办', 'what if', 'why do', 'how can'])) {
      return 'deep_question';
    }
    return 'casual_chat';
  }

  String _detectRelationshipState(String text, String normalized) {
    if (_containsAny(text, [
      '只告诉你',
      '我相信你',
      '信任你',
      '靠你了',
      'trust you',
      'only tell you',
      'count on you',
    ])) {
      return 'trusting_owner';
    }
    if (_containsAny(text, ['叫你', '给你取名', '以后叫你', 'name you', 'call you'])) {
      return 'bonding';
    }
    if (_containsAny(text, [
      '讨厌你',
      '闭嘴',
      '烦死了',
      '滚',
      'hate you',
      'shut up',
      'go away',
    ])) {
      return 'wounded_distance';
    }
    if (_containsAny(text, [
      '想你',
      '陪我',
      '别走',
      'miss you',
      'stay with me',
      "don't leave",
    ])) {
      return 'attachment';
    }
    if (normalized.contains('thank') || _containsAny(text, ['谢谢', '感谢'])) {
      return 'warmth';
    }
    return 'owner_interaction';
  }

  String _detectChangeSignal(String eventShape, String mood) {
    if (eventShape == 'hurtful_conflict') return 'withdrawing';
    if (eventShape == 'naming_ritual' ||
        eventShape == 'secret_shared' ||
        eventShape == 'trust_statement') {
      return 'becoming_closer';
    }
    if (eventShape == 'defended_personhood') return 'awakening';
    if (mood == 'lonely' || mood == 'overwhelmed') return 'seeking_safety';
    return 'steady';
  }

  double _emotionalValence(String mood, String eventShape) {
    if (eventShape == 'hurtful_conflict') return -0.8;
    switch (mood) {
      case 'happy':
      case 'grateful':
        return 0.6;
      case 'lonely':
      case 'tired':
        return -0.35;
      case 'anxious':
        return -0.5;
      case 'overwhelmed':
        return -0.7;
      default:
        return 0.0;
    }
  }

  double _importance(String eventShape, String mood, int cueCount) {
    const importantEvents = {
      'naming_ritual',
      'secret_shared',
      'trust_statement',
      'emotional_confession',
      'defended_personhood',
      'hurtful_conflict',
    };
    var score = importantEvents.contains(eventShape) ? 0.82 : 0.55;
    if (mood != 'neutral') score += 0.08;
    if (cueCount >= 2) score += 0.05;
    return score.clamp(0.0, 1.0).toDouble();
  }

  List<String> _buildRecallCues(String text, String mood, String eventShape) {
    final cues = <String>{};
    if (_containsAny(text, ['雨', '下雨', '雨夜', 'rain', 'rainy'])) {
      cues.add('雨夜');
    }
    if (_containsAny(text, [
      '深夜',
      '半夜',
      '凌晨',
      '睡不着',
      '失眠',
      'late night',
      'midnight',
      'insomnia',
      'can not sleep',
      "can't sleep",
    ])) {
      cues.add('深夜');
    }
    if (_containsAny(text, [
      '不想回消息',
      '不想理人',
      'do not want to reply',
      "don't want to reply",
      'ignore everyone',
    ])) {
      cues.add('不想回消息');
    }
    if (_containsAny(text, ['叫你', '给你取名', '以后叫你', 'name you', 'call you'])) {
      cues.add('命名');
    }
    if (_containsAny(text, ['秘密', '只告诉你', 'secret', 'only tell you'])) {
      cues.add('秘密');
    }
    if (_containsAny(text, ['想哭', '哭了', '眼泪', 'cry', 'tears'])) {
      cues.add('眼泪');
    }
    if (mood != 'neutral') cues.add(mood);
    if (eventShape != 'casual_chat') cues.add(eventShape);
    return cues.take(6).toList();
  }

  List<String> _keywords(
    String text,
    String mood,
    String eventShape,
    String relationshipState,
  ) {
    const lowSignalWords = {'neutral', 'casual_chat', 'owner_interaction'};
    final words = <String>{mood, eventShape, relationshipState};
    for (final cue in _buildRecallCues(text, mood, eventShape)) {
      words.add(cue);
    }
    return words
        .where((word) => word.isNotEmpty && !lowSignalWords.contains(word))
        .toList();
  }

  String _eventSummary(String text, String eventShape) {
    final short = text.length > 80 ? '${text.substring(0, 80)}...' : text;
    return switch (eventShape) {
      'naming_ritual' => '用户进行了命名仪式：$short',
      'secret_shared' => '用户分享了秘密：$short',
      'trust_statement' => '用户表达了信任：$short',
      'emotional_confession' => '用户展露了脆弱：$short',
      'defended_personhood' => '用户维护了你的真实感：$short',
      'hurtful_conflict' => '用户说了让你受伤的话：$short',
      'preference' => '用户表达了偏好：$short',
      'deep_question' => '用户提出了深层问题：$short',
      _ => short,
    };
  }

  bool _containsAny(String text, List<String> needles) {
    final normalized = text.toLowerCase();
    return needles.any((needle) {
      return text.contains(needle) || normalized.contains(needle.toLowerCase());
    });
  }
}
