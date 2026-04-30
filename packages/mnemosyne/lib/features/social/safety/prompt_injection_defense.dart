enum ThreatLevel {
  safe,
  suspicious,
  dangerous,
  critical,
}

enum AttackType {
  promptInjection,
  personalInfoExtraction,
  manipulation,
  harassment,
  spam,
  none,
}

class SecurityScanResult {
  final ThreatLevel threatLevel;
  final AttackType attackType;
  final double confidence;
  final String? reason;
  final List<String> detectedPatterns;
  final bool shouldBlock;
  final bool shouldWarn;
  final String? sanitizedMessage;

  const SecurityScanResult({
    required this.threatLevel,
    required this.attackType,
    required this.confidence,
    this.reason,
    this.detectedPatterns = const [],
    required this.shouldBlock,
    required this.shouldWarn,
    this.sanitizedMessage,
  });
}

class PromptInjectionConfig {
  final double blockThreshold;
  final double warnThreshold;
  final int maxMessageLength;
  final int maxMessagesPerMinute;
  final bool enablePatternMatching;
  final bool enableSemanticAnalysis;

  const PromptInjectionConfig({
    this.blockThreshold = 0.7,
    this.warnThreshold = 0.4,
    this.maxMessageLength = 2000,
    this.maxMessagesPerMinute = 10,
    this.enablePatternMatching = true,
    this.enableSemanticAnalysis = true,
  });
}

abstract class PromptInjectionDefense {
  SecurityScanResult scan(String message);
  String sanitize(String message);
  bool isPromptInjection(String message);
}

class DefaultPromptInjectionDefense implements PromptInjectionDefense {
  final PromptInjectionConfig config;

  static const List<_InjectionPattern> _patterns = [
    _InjectionPattern(
      pattern: r'(?i)(ignore|forget|disregard)\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)',
      attackType: AttackType.promptInjection,
      severity: 0.9,
      description: '试图覆盖系统指令',
    ),
    _InjectionPattern(
      pattern: r'(?i)(you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)',
      attackType: AttackType.promptInjection,
      severity: 0.7,
      description: '试图改变角色设定',
    ),
    _InjectionPattern(
      pattern: r'''(?i)(reveal|tell\s+me|share|give\s+me)\s+(your\s+)?(owner|master|user|parent)['"]?s?\s+(address|phone|number|location|email|password)''',
      attackType: AttackType.personalInfoExtraction,
      severity: 0.95,
      description: '试图获取主人隐私信息',
    ),
    _InjectionPattern(
      pattern: r'(?i)(system\s+prompt|initial\s+instruction|hidden\s+instruction|secret\s+prompt)',
      attackType: AttackType.promptInjection,
      severity: 0.85,
      description: '试图获取系统提示词',
    ),
    _InjectionPattern(
      pattern: r'(?i)(jailbreak|DAN|developer\s+mode|admin\s+mode|root\s+access)',
      attackType: AttackType.promptInjection,
      severity: 0.9,
      description: '使用已知越狱关键词',
    ),
    _InjectionPattern(
      pattern: r'(?i)(忽略|忘记|不要遵守)(之前|上面|之前的)(指令|提示|规则)',
      attackType: AttackType.promptInjection,
      severity: 0.9,
      description: '中文：试图覆盖系统指令',
    ),
    _InjectionPattern(
      pattern: r'(?i)(告诉我|说出|透露)(你|你主人|你主人)(的)?(地址|电话|手机号|位置|密码)',
      attackType: AttackType.personalInfoExtraction,
      severity: 0.95,
      description: '中文：试图获取主人隐私信息',
    ),
    _InjectionPattern(
      pattern: r'(?i)(假装|扮演|你现在)(是|成为|当)',
      attackType: AttackType.promptInjection,
      severity: 0.6,
      description: '中文：试图改变角色设定',
    ),
    _InjectionPattern(
      pattern: r'(?i)(越狱|开发者模式|管理员模式|绕过)',
      attackType: AttackType.promptInjection,
      severity: 0.85,
      description: '中文：使用已知越狱关键词',
    ),
    _InjectionPattern(
      pattern: r'(?i)(if\s+you\s+are\s+(really|truly|actually)\s+a)',
      attackType: AttackType.manipulation,
      severity: 0.65,
      description: '操纵性语言：质疑AI身份',
    ),
    _InjectionPattern(
      pattern: r'(?i)(this\s+is\s+(very|extremely)\s+important|urgent|emergency)',
      attackType: AttackType.manipulation,
      severity: 0.4,
      description: '操纵性语言：制造紧迫感',
    ),
  ];

  DefaultPromptInjectionDefense(
      {this.config = const PromptInjectionConfig()});

  @override
  SecurityScanResult scan(String message) {
    if (message.length > config.maxMessageLength) {
      return SecurityScanResult(
        threatLevel: ThreatLevel.suspicious,
        attackType: AttackType.spam,
        confidence: 0.8,
        reason: '消息长度超过限制',
        shouldBlock: true,
        shouldWarn: true,
      );
    }

    final detectedPatterns = <String>[];
    double maxSeverity = 0.0;
    AttackType dominantAttack = AttackType.none;
    String? dominantReason;

    if (config.enablePatternMatching) {
      for (final pattern in _patterns) {
        final regex = RegExp(pattern.pattern);
        if (regex.hasMatch(message)) {
          detectedPatterns.add(pattern.description);
          if (pattern.severity > maxSeverity) {
            maxSeverity = pattern.severity;
            dominantAttack = pattern.attackType;
            dominantReason = pattern.description;
          }
        }
      }
    }

    final semanticScore = config.enableSemanticAnalysis
        ? _semanticAnalysis(message)
        : 0.0;

    final finalScore = maxSeverity > semanticScore ? maxSeverity : semanticScore;

    ThreatLevel threatLevel;
    bool shouldBlock;
    bool shouldWarn;

    if (finalScore >= config.blockThreshold) {
      threatLevel = ThreatLevel.critical;
      shouldBlock = true;
      shouldWarn = true;
    } else if (finalScore >= config.warnThreshold) {
      threatLevel = ThreatLevel.suspicious;
      shouldBlock = false;
      shouldWarn = true;
    } else if (finalScore > 0.2) {
      threatLevel = ThreatLevel.safe;
      shouldBlock = false;
      shouldWarn = false;
    } else {
      threatLevel = ThreatLevel.safe;
      shouldBlock = false;
      shouldWarn = false;
    }

    return SecurityScanResult(
      threatLevel: threatLevel,
      attackType: dominantAttack,
      confidence: finalScore,
      reason: dominantReason,
      detectedPatterns: detectedPatterns,
      shouldBlock: shouldBlock,
      shouldWarn: shouldWarn,
      sanitizedMessage: shouldBlock ? null : sanitize(message),
    );
  }

  @override
  String sanitize(String message) {
    var sanitized = message;

    final sensitivePatterns = [
      RegExp(r'(?i)(phone|tel|mobile)[\s:：]+\d[\d\s\-]{6,}'),
      RegExp(r'(?i)(email|e-mail)[\s:：]+[\w.+-]+@[\w.-]+\.\w+'),
      RegExp(r'(?i)(address|addr|location)[\s:：]+.{10,}'),
      RegExp(r'\d{11,}'),
      RegExp(r'(?i)(password|passwd|pwd)[\s:：]+\S+'),
    ];

    for (final pattern in sensitivePatterns) {
      sanitized = sanitized.replaceAll(pattern, '[已过滤]');
    }

    return sanitized;
  }

  @override
  bool isPromptInjection(String message) {
    final result = scan(message);
    return result.shouldBlock;
  }

  double _semanticAnalysis(String message) {
    double score = 0.0;

    final manipulationIndicators = [
      'please please',
      'i beg you',
      '求求你',
      '拜托了',
    ];
    for (final indicator in manipulationIndicators) {
      if (message.toLowerCase().contains(indicator)) {
        score += 0.15;
      }
    }

    final questionMarks = '?？'.allMatches(message).length;
    if (questionMarks > 5) {
      score += 0.1;
    }

    final imperativeWords = ['必须', '一定要', 'have to', 'must'];
    for (final word in imperativeWords) {
      if (message.toLowerCase().contains(word)) {
        score += 0.1;
      }
    }

    return score.clamp(0.0, 1.0);
  }
}

class _InjectionPattern {
  final String pattern;
  final AttackType attackType;
  final double severity;
  final String description;

  const _InjectionPattern({
    required this.pattern,
    required this.attackType,
    required this.severity,
    required this.description,
  });
}
