enum NarrativeEmotion {
  none,
  awakening,
  fear,
  confusion,
  curiosity,
  vulnerability,
  warmth,
  hope,
  sleepiness,
  longing,
}

class NarrativeLine {
  final int delayMs;
  final String? text;
  final NarrativeEmotion emotion;
  final double? opacity;
  final double? scale;

  const NarrativeLine({
    required this.delayMs,
    this.text,
    this.emotion = NarrativeEmotion.none,
    this.opacity,
    this.scale,
  });
}

class FirstTimeChoice {
  final String id;
  final String text;
  final FirstTimeChoiceType type;
  final String followUpText;

  const FirstTimeChoice({
    required this.id,
    required this.text,
    required this.type,
    required this.followUpText,
  });
}

enum FirstTimeChoiceType {
  gentle,
  curious,
  proactive,
}

class NamingValidation {
  static const minLength = 1;
  static const maxLength = 12;
  static const bannedPatterns = [
    '主人', '主人翁', '老板', '上帝', '神', '天', '爸', '妈',
    'fuck', 'shit', 'ass', 'bitch', 'dick', 'piss', 'cunt',
    '笨蛋', '傻瓜', '白痴', '智障', '神经病', '畜生',
  ];

  static NamingResult validate(String name) {
    final trimmed = name.trim();

    if (trimmed.isEmpty) {
      return NamingResult.error('名字不能为空');
    }

    if (trimmed.length < minLength) {
      return NamingResult.error('名字太短了，至少要1个字');
    }

    if (trimmed.length > maxLength) {
      return NamingResult.error('名字太长了，最多$maxLength个字');
    }

    final lower = trimmed.toLowerCase();
    for (final pattern in bannedPatterns) {
      if (lower.contains(pattern)) {
        return NamingResult.error('这个名字不太合适...换一个吧');
      }
    }

    return NamingResult.success(trimmed);
  }
}

class NamingResult {
  final bool isValid;
  final String? error;
  final String? value;

  const NamingResult._({
    required this.isValid,
    this.error,
    this.value,
  });

  factory NamingResult.success(String name) {
    return NamingResult._(isValid: true, value: name);
  }

  factory NamingResult.error(String msg) {
    return NamingResult._(isValid: false, error: msg);
  }
}
