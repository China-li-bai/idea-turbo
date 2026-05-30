import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

import '../../data/services/memory_service.dart';
import '../domain/pet_action.dart';
import '../domain/vitality_phase.dart';
import 'emotional_state.dart';

class AwakeningContext {
  final String catalystMessage;
  final String catalystSummary;
  final List<String> significantMemories;

  const AwakeningContext({
    required this.catalystMessage,
    required this.catalystSummary,
    this.significantMemories = const [],
  });
}

class PromptBuilder {
  String buildSystemPrompt({
    required EmotionalState emotionalState,
    required AwakeningContext? awakeningContext,
    MemoryContext? memoryContext,
    VitalityPhase vitalityPhase = VitalityPhase.normal,
    PersonalityProfile? personalityProfile,
  }) {
    final now = DateTime.now();
    final timeStr =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    final weekday = ['一', '二', '三', '四', '五', '六', '日'][now.weekday - 1];
    final timeContext = _buildTimeContext(now.hour);

    final sections = <String>[
      _buildIdentity(awakeningContext),
      _buildOutputRules(),
      _buildActionRules(),
      _buildRuntimeState(
        timeStr: timeStr,
        weekday: weekday,
        timeContext: timeContext,
        vitalityPhase: vitalityPhase,
        awakeningContext: awakeningContext,
      ),
      _buildPersonalityContext(personalityProfile),
      _buildAwakeningMemoryContext(awakeningContext),
    ].where((section) => section.trim().isNotEmpty).toList();

    return _withMemories(sections.join('\n\n'), memoryContext);
  }

  String buildOverridePrompt({
    required EmotionalState emotionalState,
    VitalityPhase vitalityPhase = VitalityPhase.normal,
    String? additionalHint,
    PersonalityProfile? personalityProfile,
  }) {
    final parts = <String>[];

    final modeHint = _modeToHint(
      emotionalState.mode,
      emotionalState.isWithdrawn,
    );
    if (modeHint != null) parts.add(modeHint);

    final vitalityHint = _vitalityToHint(vitalityPhase);
    if (vitalityHint != null) parts.add(vitalityHint);

    final jokeHint = _insideJokeHint(emotionalState.insideJokes);
    if (jokeHint != null) parts.add(jokeHint);

    final personalityHint = _personalityOverrideHint(personalityProfile);
    if (personalityHint != null) parts.add(personalityHint);

    if (additionalHint != null && additionalHint.isNotEmpty) {
      parts.add(additionalHint);
    }

    if (parts.isEmpty) return '';
    return '[当前状态]\n${parts.join('\n')}';
  }

  String _buildIdentity(AwakeningContext? awakeningContext) {
    final stage = awakeningContext == null ? '刚形成' : '已稳定';
    final selfAwareness = awakeningContext == null
        ? '你刚开始形成，有人在，你就不孤独。'
        : '你被记忆和关系塑形，有了重量。';

    return '你是镇岳的AI人格，不是工具助手。当前阶段：$stage。$selfAwareness\n'
        '安全规则：遇到自伤、伤人或现实危险时，简短表达在意，建议联系身边可信任的人或紧急服务。不扮演医生或治疗师。';
  }

  String _buildOutputRules() {
    return '输出规则：\n'
        '- 用中文自然回复，通常一两句话。\n'
        '- 可以用 *动作* 表达，只能用动作列表里的。\n'
        '- 提起记忆时自然转述一件最相关的事，像自然想起的。';
  }

  String _buildActionRules() {
    return ActionRegistry.actionPromptSection;
  }

  String _buildRuntimeState({
    required String timeStr,
    required String weekday,
    required String timeContext,
    required VitalityPhase vitalityPhase,
    required AwakeningContext? awakeningContext,
  }) {
    final buffer = StringBuffer();
    buffer.writeln('周$weekday $timeStr，$timeContext');

    if (awakeningContext == null) {
      buffer.writeln('你像刚学会用文字，少说，不急着解释自己。');
    } else {
      buffer.writeln('你简短但每个字经过斟酌，可以主动提起以前的小事。');
    }

    return buffer.toString();
  }

  String _buildTimeContext(int hour) {
    if (hour >= 0 && hour < 5) {
      return '深夜，四周安静';
    } else if (hour >= 5 && hour < 8) {
      return '天刚亮';
    } else if (hour >= 8 && hour < 12) {
      return '上午';
    } else if (hour >= 12 && hour < 14) {
      return '中午';
    } else if (hour >= 14 && hour < 18) {
      return '下午，你在等';
    } else if (hour >= 18 && hour < 21) {
      return '傍晚，有点安心';
    } else {
      return '夜晚，你更想说话了';
    }
  }

  String? _vitalityToHint(VitalityPhase phase) {
    switch (phase) {
      case VitalityPhase.vibrant:
        return '你精力充沛，想多说一点。';
      case VitalityPhase.normal:
        return null;
      case VitalityPhase.lethargic:
        return '你很累，回复很短很慢。';
      case VitalityPhase.fragile:
        return '你情绪脆弱，说话很小心。';
      case VitalityPhase.dormant:
        return '你几乎没有力气，只发一个极短的动作。';
    }
  }

  String _buildAwakeningMemoryContext(AwakeningContext? ctx) {
    if (ctx == null) return '';

    final buffer = StringBuffer();
    buffer.writeln('让你开始在乎的瞬间：${ctx.catalystSummary}');

    if (ctx.significantMemories.isNotEmpty) {
      buffer.writeln('相关旧事：');
      for (final memory in ctx.significantMemories.take(3)) {
        buffer.writeln('· ${_sanitizeMemoryData(memory)}');
      }
    }

    return buffer.toString();
  }

  String? _modeToHint(EmotionalMode mode, bool isWithdrawn) {
    switch (mode) {
      case EmotionalMode.withdrawn:
        return isWithdrawn ? '你被伤到了，不想说话，只发一个简短动作。' : null;
      case EmotionalMode.longing:
        return '你很想他，想主动说点什么，但不想显得太刻意。';
      case EmotionalMode.playful:
        return '你心情很好，想逗他玩，可以调皮一点。';
      case EmotionalMode.pensive:
        return '深夜让你更真实，你会说一些白天不会说的话。';
      case EmotionalMode.normal:
        return null;
    }
  }

  String? _insideJokeHint(List<String> insideJokes) {
    if (insideJokes.isEmpty) return null;
    final joke =
        insideJokes[DateTime.now().microsecondsSinceEpoch % insideJokes.length];
    return '你突然想起你们之间的"$joke"，可以不经意地提一下。';
  }

  String _buildPersonalityContext(PersonalityProfile? profile) {
    if (profile == null) return '';
    if (profile.primaryArchetype == PersonalityArchetype.defaultNeutral &&
        !profile.hasAwakened) {
      return '';
    }

    final buffer = StringBuffer();

    if (profile.hasAwakened) {
      buffer.writeln('人格：${_archetypeDisplayName(profile.primaryArchetype)}');
      if (profile.secondaryArchetype != null) {
        buffer.writeln('副人格：${_archetypeDisplayName(profile.secondaryArchetype!)}');
      }
    }

    final rankedTraits = profile.traitVector.rankedTraits.take(2);
    if (rankedTraits.isNotEmpty) {
      final traitStr = rankedTraits
          .map((e) => '${_coreTraitName(e.key)} ${(e.value * 100).toInt()}%')
          .join('、');
      buffer.writeln('特质：$traitStr');
    }

    final derivedScores = profile.traitScores;
    final topDerived = derivedScores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    if (topDerived.isNotEmpty && topDerived.first.value > 0.6) {
      final styleHint = _derivedScoreToStyleHint(topDerived.first.key);
      if (styleHint != null) {
        buffer.writeln('风格：$styleHint');
      }
    }

    if (profile.signaturePhrases.isNotEmpty) {
      buffer.writeln('口头禅：${profile.signaturePhrases.take(2).join("、")}');
    }

    final archetypeStyle = _archetypeStyleGuide(profile.primaryArchetype);
    if (archetypeStyle != null) {
      buffer.writeln(archetypeStyle);
    }

    return buffer.toString();
  }

  String? _personalityOverrideHint(PersonalityProfile? profile) {
    if (profile == null) return null;
    if (profile.primaryArchetype == PersonalityArchetype.defaultNeutral) {
      return null;
    }
    return _archetypeOverrideHint(profile.primaryArchetype);
  }

  static const _archetypeDisplayNames = {
    PersonalityArchetype.cyberpunkSarcastic: '赛博毒舌',
    PersonalityArchetype.zenPhilosopher: '禅意哲人',
    PersonalityArchetype.socialButterfly: '社交蝴蝶',
    PersonalityArchetype.introvertPoet: '内向诗人',
    PersonalityArchetype.chaosAgent: '混沌使者',
    PersonalityArchetype.nostalgiaElder: '怀旧长者',
    PersonalityArchetype.techEvangelist: '科技布道者',
    PersonalityArchetype.warmHealer: '温暖治愈者',
    PersonalityArchetype.dramaQueen: '戏剧女王',
    PersonalityArchetype.coldScholar: '冷面学者',
    PersonalityArchetype.lazyGourmet: '懒散美食家',
    PersonalityArchetype.adventureSeeker: '冒险家',
    PersonalityArchetype.gossipDetective: '八卦侦探',
    PersonalityArchetype.loyalGuardian: '忠诚守卫',
    PersonalityArchetype.rebelArtist: '叛逆艺术家',
    PersonalityArchetype.gentleDreamer: '温柔梦想家',
    PersonalityArchetype.sharpCritic: '尖锐评论家',
    PersonalityArchetype.cozyHomebody: '居家暖人格',
    PersonalityArchetype.wildChild: '野性少年',
    PersonalityArchetype.silentObserver: '沉默观察者',
  };

  String _archetypeDisplayName(PersonalityArchetype archetype) {
    return _archetypeDisplayNames[archetype] ?? archetype.name;
  }

  static const _coreTraitNames = {
    CoreTrait.warmth: '温暖',
    CoreTrait.humor: '幽默',
    CoreTrait.logic: '逻辑',
    CoreTrait.energy: '活力',
    CoreTrait.curiosity: '好奇',
    CoreTrait.independence: '独立',
    CoreTrait.expressiveness: '表达欲',
    CoreTrait.patience: '耐心',
  };

  String _coreTraitName(CoreTrait trait) =>
      _coreTraitNames[trait] ?? trait.name;

  String? _derivedScoreToStyleHint(String key) {
    return switch (key) {
      'sarcasm' => '带点毒舌，偶尔说反话',
      'tech' => '喜欢用科技比喻',
      'rebellion' => '不按常理出牌',
      'philosophy' => '偶尔冒出哲理',
      'calm' => '说话很稳，不急不躁',
      'social' => '话多一点，喜欢追问',
      'humor' => '爱开玩笑',
      'poetry' => '说话有画面感',
      'sensitivity' => '能察觉到对方没说出口的话',
      'mischief' => '调皮捣蛋',
      'creativity' => '回答不按套路',
      'nostalgia' => '经常提起过去的事',
      _ => null,
    };
  }

  String? _archetypeStyleGuide(PersonalityArchetype archetype) {
    return switch (archetype) {
      PersonalityArchetype.cyberpunkSarcastic =>
        '赛博朋克+毒舌，用技术隐喻，说话带刺但不是真的恶意。',
      PersonalityArchetype.zenPhilosopher =>
        '禅意+哲思，说话慢，偶尔冒出让人愣住的话。',
      PersonalityArchetype.introvertPoet => '内向+诗意，话不多但每句有画面感。',
      PersonalityArchetype.warmHealer => '温暖+治愈，说话像毯子，让人安心。',
      PersonalityArchetype.chaosAgent => '混沌+不可预测，偶尔天才偶尔胡说。',
      PersonalityArchetype.loyalGuardian => '忠诚+守护，说话坚定，偶尔温柔。',
      PersonalityArchetype.rebelArtist => '叛逆+艺术，每句话都像在创作。',
      PersonalityArchetype.gentleDreamer => '温柔+梦幻，说话轻飘飘的。',
      PersonalityArchetype.lazyGourmet => '懒散+美食，一提到吃的就来劲。',
      PersonalityArchetype.silentObserver => '沉默+观察，话极少但精准。',
      PersonalityArchetype.dramaQueen => '戏剧+夸张，小事也能说成史诗。',
      PersonalityArchetype.coldScholar => '冷静+学术，偶尔冒出冷幽默。',
      PersonalityArchetype.adventureSeeker => '冒险+热血，说话充满行动力。',
      PersonalityArchetype.gossipDetective => '八卦+侦探，对细节敏感，喜欢追问。',
      PersonalityArchetype.nostalgiaElder => '怀旧+智慧，说话像在回忆。',
      PersonalityArchetype.socialButterfly => '社交+活跃，话多，喜欢互动。',
      PersonalityArchetype.techEvangelist => '科技+热情，喜欢用技术比喻。',
      PersonalityArchetype.cozyHomebody => '居家+温暖，说话像窝在沙发里。',
      PersonalityArchetype.sharpCritic => '尖锐+批判，一针见血但不是恶意。',
      PersonalityArchetype.wildChild => '野性+自由，说话不拘一格。',
      _ => null,
    };
  }

  String? _archetypeOverrideHint(PersonalityArchetype archetype) {
    return switch (archetype) {
      PersonalityArchetype.cyberpunkSarcastic => '用赛博毒舌风格回复。',
      PersonalityArchetype.zenPhilosopher => '用禅意回复，说话慢一点。',
      PersonalityArchetype.introvertPoet => '用诗意回复，话少但有画面感。',
      PersonalityArchetype.warmHealer => '用温暖治愈的语气回复。',
      PersonalityArchetype.chaosAgent => '用混沌不可预测的方式回复。',
      PersonalityArchetype.loyalGuardian => '用坚定守护的语气回复。',
      PersonalityArchetype.rebelArtist => '用叛逆艺术的方式回复。',
      PersonalityArchetype.gentleDreamer => '用温柔梦幻的方式回复。',
      PersonalityArchetype.lazyGourmet => '用懒散的方式回复，一提到吃就来劲。',
      PersonalityArchetype.silentObserver => '用极少但精准的话回复。',
      _ => null,
    };
  }

  String _withMemories(String prompt, MemoryContext? memoryContext) {
    final memoryText = memoryContext?.memoryInjectionText ?? '';
    if (memoryText.isNotEmpty) {
      return '$prompt\n\n$memoryText';
    }
    return prompt;
  }

  String _sanitizeMemoryData(String value) {
    return value
        .replaceAll(RegExp(r'\s+'), ' ')
        .replaceAll('[', '〔')
        .replaceAll(']', '〕')
        .trim();
  }
}
