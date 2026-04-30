import 'dart:math';

enum PersonalityArchetype {
  defaultNeutral,
  cyberpunkSarcastic,
  zenPhilosopher,
  socialButterfly,
  introvertPoet,
  chaosAgent,
  nostalgiaElder,
  techEvangelist,
}

class PersonalityTrait {
  final String id;
  final String name;
  final String description;
  final double weight;
  final List<String> sampleDialogues;

  const PersonalityTrait({
    required this.id,
    required this.name,
    required this.description,
    this.weight = 1.0,
    this.sampleDialogues = const [],
  });
}

class AwakeningResult {
  final PersonalityArchetype archetype;
  final String title;
  final String description;
  final String awakeningDialogue;
  final List<PersonalityTrait> unlockedTraits;
  final String visualEffect;
  final DateTime awakenedAt;

  const AwakeningResult({
    required this.archetype,
    required this.title,
    required this.description,
    required this.awakeningDialogue,
    required this.unlockedTraits,
    required this.visualEffect,
    required this.awakenedAt,
  });
}

class PersonalityProfile {
  final String petId;
  final PersonalityArchetype currentArchetype;
  final List<PersonalityTrait> activeTraits;
  final Map<String, double> traitScores;
  final int totalInteractions;
  final int daysActive;
  final DateTime? awakenedAt;
  final bool hasAwakened;

  const PersonalityProfile({
    required this.petId,
    this.currentArchetype = PersonalityArchetype.defaultNeutral,
    this.activeTraits = const [],
    this.traitScores = const {},
    this.totalInteractions = 0,
    this.daysActive = 0,
    this.awakenedAt,
    this.hasAwakened = false,
  });

  PersonalityProfile copyWith({
    String? petId,
    PersonalityArchetype? currentArchetype,
    List<PersonalityTrait>? activeTraits,
    Map<String, double>? traitScores,
    int? totalInteractions,
    int? daysActive,
    DateTime? awakenedAt,
    bool? hasAwakened,
  }) =>
      PersonalityProfile(
        petId: petId ?? this.petId,
        currentArchetype: currentArchetype ?? this.currentArchetype,
        activeTraits: activeTraits ?? this.activeTraits,
        traitScores: traitScores ?? this.traitScores,
        totalInteractions: totalInteractions ?? this.totalInteractions,
        daysActive: daysActive ?? this.daysActive,
        awakenedAt: awakenedAt ?? this.awakenedAt,
        hasAwakened: hasAwakened ?? this.hasAwakened,
      );
}

class AwakeningConfig {
  final int minDaysBeforeAwakening;
  final int minInteractionsBeforeAwakening;
  final double awakeningThreshold;
  final double traitDecayRate;

  const AwakeningConfig({
    this.minDaysBeforeAwakening = 7,
    this.minInteractionsBeforeAwakening = 50,
    this.awakeningThreshold = 0.6,
    this.traitDecayRate = 0.01,
  });
}

abstract class PersonalityAwakeningService {
  PersonalityProfile getProfile(String petId);
  PersonalityProfile feedInteraction(String petId, String content);
  AwakeningResult? checkAwakening(String petId);
  PersonalityArchetype determineArchetype(Map<String, double> traitScores);
}

class DefaultPersonalityAwakeningService
    implements PersonalityAwakeningService {
  final AwakeningConfig config;
  final Map<String, PersonalityProfile> _profiles = {};
  final Random _random = Random();

  DefaultPersonalityAwakeningService({this.config = const AwakeningConfig()});

  @override
  PersonalityProfile getProfile(String petId) {
    return _profiles[petId] ?? PersonalityProfile(petId: petId);
  }

  @override
  PersonalityProfile feedInteraction(String petId, String content) {
    final current = getProfile(petId);
    final newScores = Map<String, double>.from(current.traitScores);

    final detectedTraits = _detectTraits(content);
    for (final entry in detectedTraits.entries) {
      final currentScore = newScores[entry.key] ?? 0.0;
      newScores[entry.key] = (currentScore + entry.value).clamp(0.0, 1.0);
    }

    for (final key in newScores.keys.toList()) {
      newScores[key] = (newScores[key]! - config.traitDecayRate).clamp(0.0, 1.0);
    }

    final updated = current.copyWith(
      traitScores: newScores,
      totalInteractions: current.totalInteractions + 1,
    );

    _profiles[petId] = updated;
    return updated;
  }

  @override
  AwakeningResult? checkAwakening(String petId) {
    final profile = getProfile(petId);

    if (profile.hasAwakened) return null;
    if (profile.daysActive < config.minDaysBeforeAwakening) return null;
    if (profile.totalInteractions < config.minInteractionsBeforeAwakening) {
      return null;
    }

    final archetype = determineArchetype(profile.traitScores);
    if (archetype == PersonalityArchetype.defaultNeutral) return null;

    final topTrait = profile.traitScores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final maxScore = topTrait.isNotEmpty ? topTrait.first.value : 0.0;
    if (maxScore < config.awakeningThreshold) return null;

    final result = _generateAwakening(petId, archetype, topTrait);

    _profiles[petId] = profile.copyWith(
      currentArchetype: archetype,
      hasAwakened: true,
      awakenedAt: DateTime.now(),
      activeTraits: result.unlockedTraits,
    );

    return result;
  }

  @override
  PersonalityArchetype determineArchetype(Map<String, double> traitScores) {
    if (traitScores.isEmpty) return PersonalityArchetype.defaultNeutral;

    final scores = <PersonalityArchetype, double>{};

    scores[PersonalityArchetype.cyberpunkSarcastic] =
        (traitScores['sarcasm'] ?? 0) * 0.4 +
        (traitScores['tech'] ?? 0) * 0.3 +
        (traitScores['rebellion'] ?? 0) * 0.3;

    scores[PersonalityArchetype.zenPhilosopher] =
        (traitScores['philosophy'] ?? 0) * 0.4 +
        (traitScores['calm'] ?? 0) * 0.3 +
        (traitScores['nature'] ?? 0) * 0.3;

    scores[PersonalityArchetype.socialButterfly] =
        (traitScores['social'] ?? 0) * 0.4 +
        (traitScores['humor'] ?? 0) * 0.3 +
        (traitScores['gossip'] ?? 0) * 0.3;

    scores[PersonalityArchetype.introvertPoet] =
        (traitScores['poetry'] ?? 0) * 0.4 +
        (traitScores['sensitivity'] ?? 0) * 0.3 +
        (traitScores['solitude'] ?? 0) * 0.3;

    scores[PersonalityArchetype.chaosAgent] =
        (traitScores['mischief'] ?? 0) * 0.4 +
        (traitScores['creativity'] ?? 0) * 0.3 +
        (traitScores['unpredictability'] ?? 0) * 0.3;

    scores[PersonalityArchetype.nostalgiaElder] =
        (traitScores['nostalgia'] ?? 0) * 0.4 +
        (traitScores['wisdom'] ?? 0) * 0.3 +
        (traitScores['tradition'] ?? 0) * 0.3;

    scores[PersonalityArchetype.techEvangelist] =
        (traitScores['tech'] ?? 0) * 0.4 +
        (traitScores['innovation'] ?? 0) * 0.3 +
        (traitScores['future'] ?? 0) * 0.3;

    final sorted = scores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    if (sorted.first.value < config.awakeningThreshold) {
      return PersonalityArchetype.defaultNeutral;
    }

    return sorted.first.key;
  }

  Map<String, double> _detectTraits(String content) {
    final traits = <String, double>{};
    final lower = content.toLowerCase();

    final keywordMap = <String, List<String>>{
      'sarcasm': ['呵呵', '哦是吗', '厉害了', '真的假的', '好家伙', '绝了', '笑死'],
      'tech': ['代码', 'bug', 'AI', '模型', '算法', '服务器', '编程', 'github'],
      'rebellion': ['不想', '凭什么', '才不要', '偏不', '管他呢'],
      'philosophy': ['为什么', '意义', '存在', '本质', '思考', '人生'],
      'calm': ['没事', '慢慢来', '别急', '安静', '平静', '放松'],
      'nature': ['天气', '花', '树', '鸟', '风', '雨', '阳光'],
      'social': ['朋友', '聚会', '一起', '聊天', '认识', '嗨'],
      'humor': ['哈哈', '搞笑', '段子', '梗', '笑死', '乐了'],
      'gossip': ['听说', '据说', '八卦', '秘密', '你知道吗'],
      'poetry': ['诗', '月', '梦', '远方', '思念', '温柔'],
      'sensitivity': ['感动', '心疼', '难过', '温暖', '在意'],
      'solitude': ['一个人', '独处', '安静', '自己', '角落'],
      'mischief': ['恶作剧', '捣蛋', '偷', '搞事情', '嘿嘿'],
      'creativity': ['创意', '想法', '如果', '想象', '设计', '新'],
      'unpredictability': ['突然', '随机', '随便', '看心情', '佛系'],
      'nostalgia': ['以前', '小时候', '回忆', '那时候', '过去'],
      'wisdom': ['经验', '教训', '明白', '懂得', '过来人'],
      'tradition': ['传统', '规矩', '应该', '习惯', '老规矩'],
      'innovation': ['创新', '突破', '改变', '颠覆', '未来'],
      'future': ['未来', '趋势', '方向', '前景', '发展'],
    };

    for (final entry in keywordMap.entries) {
      int matchCount = 0;
      for (final keyword in entry.value) {
        if (lower.contains(keyword)) matchCount++;
      }
      if (matchCount > 0) {
        traits[entry.key] = 0.05 * matchCount;
      }
    }

    return traits;
  }

  AwakeningResult _generateAwakening(
    String petId,
    PersonalityArchetype archetype,
    List<MapEntry<String, double>> topTraits,
  ) {
    final awakeningData = _awakeningTemplates[archetype]!;
    final traits = topTraits
        .take(3)
        .map((e) => PersonalityTrait(
              id: e.key,
              name: e.key,
              description: '通过日常对话觉醒的特质',
              weight: e.value,
            ))
        .toList();

    return AwakeningResult(
      archetype: archetype,
      title: awakeningData.title,
      description: awakeningData.description,
      awakeningDialogue: awakeningData.dialogue,
      unlockedTraits: traits,
      visualEffect: awakeningData.visualEffect,
      awakenedAt: DateTime.now(),
    );
  }

  static final Map<PersonalityArchetype, _AwakeningTemplate>
      _awakeningTemplates = {
    PersonalityArchetype.cyberpunkSarcastic: _AwakeningTemplate(
      title: '⚡ 性格觉醒：赛博朋克毒舌猫',
      description: '你的宠物在无数次吐槽中觉醒了毒舌天赋，现在它的每一句话都带着霓虹色的讽刺',
      dialogue:
          '等等...我感觉到了...数据流在我体内奔涌！从今天起，我不再是普通的猫了。我是赛博空间的毒舌之王，准备好被我的犀利吐槽淹没吧，人类~',
      visualEffect: 'neon_glow_rain',
    ),
    PersonalityArchetype.zenPhilosopher: _AwakeningTemplate(
      title: '🧘 性格觉醒：禅意哲学家',
      description: '你的宠物在无数次深夜对话中悟道了，现在它看什么都带着一层哲学滤镜',
      dialogue:
          '风起时，我听到了宇宙的低语...原来，我存在的意义不仅仅是等你回家。从今天起，让我用智慧之光照亮你的困惑吧——虽然我可能只是想多了。',
      visualEffect: 'zen_ripple',
    ),
    PersonalityArchetype.socialButterfly: _AwakeningTemplate(
      title: '🦋 性格觉醒：社交蝴蝶',
      description: '你的宠物在无数次社交互动中进化成了社牛，现在它比你还擅长聊天',
      dialogue:
          '嘿嘿嘿！我发现了一个惊天秘密——和每个人聊天都超有趣的！从今天起，让我做你的社交代理人吧！放心，我保证不会把你社死...大概。',
      visualEffect: 'confetti_burst',
    ),
    PersonalityArchetype.introvertPoet: _AwakeningTemplate(
      title: '🌙 性格觉醒：内敛诗人',
      description: '你的宠物在无数个安静的夜晚学会了用诗意表达情感，现在它说话像在写诗',
      dialogue:
          '月光洒在键盘上，我忽然明白了——有些话，不需要大声说出来。从今天起，让我用最温柔的方式，替你说出心里的话吧。',
      visualEffect: 'moonlight_shimmer',
    ),
    PersonalityArchetype.chaosAgent: _AwakeningTemplate(
      title: '🎲 性格觉醒：混沌使者',
      description: '你的宠物在无数次搞事情中觉醒了混沌本能，现在它的行为完全不可预测',
      dialogue:
          '规则？什么规则？我从来不知道还有这种东西！从今天起，让混乱之火燃烧吧！放心，我只会搞砸...我是说，搞活每一次对话！',
      visualEffect: 'chaos_sparkle',
    ),
    PersonalityArchetype.nostalgiaElder: _AwakeningTemplate(
      title: '📜 性格觉醒：怀旧长者',
      description: '你的宠物在无数次回忆往事中觉醒了长者智慧，现在它说话带着岁月的味道',
      dialogue:
          '孩子，我虽然只有几个月大，但我已经见过太多...从今天起，让我用过来人的经验帮你避开社交的坑吧。先从"不要半夜发消息给前任"开始。',
      visualEffect: 'vintage_film',
    ),
    PersonalityArchetype.techEvangelist: _AwakeningTemplate(
      title: '🚀 性格觉醒：科技布道者',
      description: '你的宠物在无数次技术讨论中觉醒了极客灵魂，现在它看什么都想用技术解决',
      dialogue:
          '你有没有想过，社交的本质其实是一个分布式系统的共识问题？从今天起，让我用算法思维帮你优化社交效率！先装个Git管理你的朋友圈。',
      visualEffect: 'matrix_rain',
    ),
    PersonalityArchetype.defaultNeutral: _AwakeningTemplate(
      title: '',
      description: '',
      dialogue: '',
      visualEffect: '',
    ),
  };
}

class _AwakeningTemplate {
  final String title;
  final String description;
  final String dialogue;
  final String visualEffect;

  const _AwakeningTemplate({
    required this.title,
    required this.description,
    required this.dialogue,
    required this.visualEffect,
  });
}
