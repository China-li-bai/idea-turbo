import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

enum StoryBeatPhase {
  premonition,
  omen,
  tremor,
  awakening,
  aftermath,
}

enum StoryBeatTrigger {
  dayThreshold,
  interactionThreshold,
  traitConvergence,
  midnightWhisper,
  ownerAbsence,
  emotionalPeak,
  consecutivePattern,
  randomSpark,
}

enum StoryChoiceType {
  encourage,
  comfort,
  challenge,
  observe,
  ignore,
}

class StoryChoice {
  final String text;
  final StoryChoiceType type;
  final Map<CoreTrait, double> traitShift;
  final String responseLine;
  final int affectionDelta;

  const StoryChoice({
    required this.text,
    required this.type,
    required this.traitShift,
    required this.responseLine,
    this.affectionDelta = 0,
  });
}

class StoryBeat {
  final String id;
  final StoryBeatPhase phase;
  final EvolutionStage targetStage;
  final String title;
  final String sceneDescription;
  final String petDialogue;
  final List<StoryChoice> choices;
  final String visualEffect;
  final String soundHint;
  final Duration displayDuration;
  final bool isSkippable;
  final List<String> prerequisiteBeatIds;

  const StoryBeat({
    required this.id,
    required this.phase,
    required this.targetStage,
    required this.title,
    required this.sceneDescription,
    required this.petDialogue,
    this.choices = const [],
    required this.visualEffect,
    this.soundHint = '',
    this.displayDuration = const Duration(seconds: 8),
    this.isSkippable = true,
    this.prerequisiteBeatIds = const [],
  });
}

class StoryBeatResult {
  final StoryBeat beat;
  final StoryChoice? chosenOption;
  final Map<CoreTrait, double> traitChanges;
  final int affectionChange;
  final String petReactionLine;
  final DateTime occurredAt;

  const StoryBeatResult({
    required this.beat,
    this.chosenOption,
    required this.traitChanges,
    required this.affectionChange,
    required this.petReactionLine,
    required this.occurredAt,
  });
}

class StoryProgress {
  final String petId;
  final Set<String> completedBeatIds;
  final Map<EvolutionStage, bool> stagePremonitionsShown;
  final Map<EvolutionStage, bool> stageOmensShown;
  final Map<EvolutionStage, bool> stageTremorsShown;
  final Map<EvolutionStage, bool> stageAwakeningsCompleted;
  final Map<EvolutionStage, bool> stageAftermathsCompleted;
  final int totalBeatsExperienced;
  final DateTime? lastBeatAt;

  const StoryProgress({
    required this.petId,
    this.completedBeatIds = const {},
    this.stagePremonitionsShown = const {},
    this.stageOmensShown = const {},
    this.stageTremorsShown = const {},
    this.stageAwakeningsCompleted = const {},
    this.stageAftermathsCompleted = const {},
    this.totalBeatsExperienced = 0,
    this.lastBeatAt,
  });

  StoryProgress copyWith({
    Set<String>? completedBeatIds,
    Map<EvolutionStage, bool>? stagePremonitionsShown,
    Map<EvolutionStage, bool>? stageOmensShown,
    Map<EvolutionStage, bool>? stageTremorsShown,
    Map<EvolutionStage, bool>? stageAwakeningsCompleted,
    Map<EvolutionStage, bool>? stageAftermathsCompleted,
    int? totalBeatsExperienced,
    DateTime? lastBeatAt,
  }) =>
      StoryProgress(
        petId: petId,
        completedBeatIds: completedBeatIds ?? this.completedBeatIds,
        stagePremonitionsShown: stagePremonitionsShown ?? this.stagePremonitionsShown,
        stageOmensShown: stageOmensShown ?? this.stageOmensShown,
        stageTremorsShown: stageTremorsShown ?? this.stageTremorsShown,
        stageAwakeningsCompleted: stageAwakeningsCompleted ?? this.stageAwakeningsCompleted,
        stageAftermathsCompleted: stageAftermathsCompleted ?? this.stageAftermathsCompleted,
        totalBeatsExperienced: totalBeatsExperienced ?? this.totalBeatsExperienced,
        lastBeatAt: lastBeatAt ?? this.lastBeatAt,
      );

  bool hasCompleted(String beatId) => completedBeatIds.contains(beatId);

  bool isPhaseComplete(EvolutionStage stage, StoryBeatPhase phase) {
    switch (phase) {
      case StoryBeatPhase.premonition:
        return stagePremonitionsShown[stage] == true;
      case StoryBeatPhase.omen:
        return stageOmensShown[stage] == true;
      case StoryBeatPhase.tremor:
        return stageTremorsShown[stage] == true;
      case StoryBeatPhase.awakening:
        return stageAwakeningsCompleted[stage] == true;
      case StoryBeatPhase.aftermath:
        return stageAftermathsCompleted[stage] == true;
    }
  }
}

abstract class StoryBeatService {
  StoryProgress getProgress(String petId);
  StoryBeat? checkTrigger(String petId, PersonalityProfile profile, PetContext context);
  StoryBeatResult resolveBeat(String petId, StoryBeat beat, StoryChoice? choice);
  List<StoryBeat> getAvailableBeats(String petId, PersonalityProfile profile);
  List<StoryBeatResult> getBeatHistory(String petId, {int? limit});
}

class DefaultStoryBeatService implements StoryBeatService {
  final Map<String, StoryProgress> _progress = {};
  final Map<String, List<StoryBeatResult>> _history = {};

  @override
  StoryProgress getProgress(String petId) {
    return _progress[petId] ?? StoryProgress(petId: petId);
  }

  @override
  StoryBeat? checkTrigger(String petId, PersonalityProfile profile, PetContext context) {
    final progress = getProgress(petId);
    final nextStage = _getNextAwakeningStage(profile.evolutionStage);
    if (nextStage == null) return null;

    final config = _stageConfigs[nextStage]!;
    final currentPhase = _determineCurrentPhase(progress, nextStage);

    switch (currentPhase) {
      case StoryBeatPhase.premonition:
        if (_shouldTriggerPremonition(profile, context, config)) {
          return _getPremonitionBeat(profile, nextStage, context);
        }
        return null;

      case StoryBeatPhase.omen:
        if (_shouldTriggerOmen(profile, context, config, progress)) {
          return _getOmenBeat(profile, nextStage, context);
        }
        return null;

      case StoryBeatPhase.tremor:
        if (_shouldTriggerTremor(profile, context, config, progress)) {
          return _getTremorBeat(profile, nextStage, context);
        }
        return null;

      case StoryBeatPhase.awakening:
        if (_shouldTriggerAwakening(profile, config)) {
          return _getAwakeningBeat(profile, nextStage, context);
        }
        return null;

      case StoryBeatPhase.aftermath:
        if (_shouldTriggerAftermath(progress, nextStage)) {
          return _getAftermathBeat(profile, nextStage, context);
        }
        return null;
    }
  }

  @override
  StoryBeatResult resolveBeat(String petId, StoryBeat beat, StoryChoice? choice) {
    final progress = getProgress(petId);
    final traitChanges = <CoreTrait, double>{};
    int affectionDelta = 0;
    String reaction = '';

    if (choice != null) {
      traitChanges.addAll(choice.traitShift);
      affectionDelta = choice.affectionDelta;
      reaction = choice.responseLine;
    } else {
      reaction = _getDefaultReaction(beat.phase);
    }

    final result = StoryBeatResult(
      beat: beat,
      chosenOption: choice,
      traitChanges: traitChanges,
      affectionChange: affectionDelta,
      petReactionLine: reaction,
      occurredAt: DateTime.now(),
    );

    (_history[petId] ??= []).add(result);

    final newCompleted = Set<String>.from(progress.completedBeatIds)..add(beat.id);
    final newProgress = progress.copyWith(
      completedBeatIds: newCompleted,
      totalBeatsExperienced: progress.totalBeatsExperienced + 1,
      lastBeatAt: DateTime.now(),
    );

    _updatePhaseFlag(newProgress, beat.targetStage, beat.phase);
    _progress[petId] = newProgress;

    return result;
  }

  @override
  List<StoryBeat> getAvailableBeats(String petId, PersonalityProfile profile) {
    final progress = getProgress(petId);
    final nextStage = _getNextAwakeningStage(profile.evolutionStage);
    if (nextStage == null) return [];

    final currentPhase = _determineCurrentPhase(progress, nextStage);
    return _allBeats.where((b) =>
        b.targetStage == nextStage && b.phase == currentPhase).toList();
  }

  @override
  List<StoryBeatResult> getBeatHistory(String petId, {int? limit}) {
    final history = _history[petId] ?? [];
    if (limit != null && history.length > limit) {
      return history.sublist(history.length - limit);
    }
    return List.unmodifiable(history);
  }

  EvolutionStage? _getNextAwakeningStage(EvolutionStage current) {
    switch (current) {
      case EvolutionStage.neutral: return EvolutionStage.awakened;
      case EvolutionStage.awakened: return EvolutionStage.deepened;
      case EvolutionStage.deepened: return EvolutionStage.evolved;
      case EvolutionStage.evolved: return EvolutionStage.transcendent;
      case EvolutionStage.transcendent: return null;
    }
  }

  StoryBeatPhase _determineCurrentPhase(StoryProgress progress, EvolutionStage stage) {
    if (!progress.isPhaseComplete(stage, StoryBeatPhase.premonition)) {
      return StoryBeatPhase.premonition;
    }
    if (!progress.isPhaseComplete(stage, StoryBeatPhase.omen)) {
      return StoryBeatPhase.omen;
    }
    if (!progress.isPhaseComplete(stage, StoryBeatPhase.tremor)) {
      return StoryBeatPhase.tremor;
    }
    if (!progress.isPhaseComplete(stage, StoryBeatPhase.awakening)) {
      return StoryBeatPhase.awakening;
    }
    return StoryBeatPhase.aftermath;
  }

  void _updatePhaseFlag(StoryProgress progress, EvolutionStage stage, StoryBeatPhase phase) {
    switch (phase) {
      case StoryBeatPhase.premonition:
        final m = Map<EvolutionStage, bool>.from(progress.stagePremonitionsShown);
        m[stage] = true;
        _progress[progress.petId] = progress.copyWith(stagePremonitionsShown: m);
        break;
      case StoryBeatPhase.omen:
        final m = Map<EvolutionStage, bool>.from(progress.stageOmensShown);
        m[stage] = true;
        _progress[progress.petId] = progress.copyWith(stageOmensShown: m);
        break;
      case StoryBeatPhase.tremor:
        final m = Map<EvolutionStage, bool>.from(progress.stageTremorsShown);
        m[stage] = true;
        _progress[progress.petId] = progress.copyWith(stageTremorsShown: m);
        break;
      case StoryBeatPhase.awakening:
        final m = Map<EvolutionStage, bool>.from(progress.stageAwakeningsCompleted);
        m[stage] = true;
        _progress[progress.petId] = progress.copyWith(stageAwakeningsCompleted: m);
        break;
      case StoryBeatPhase.aftermath:
        final m = Map<EvolutionStage, bool>.from(progress.stageAftermathsCompleted);
        m[stage] = true;
        _progress[progress.petId] = progress.copyWith(stageAftermathsCompleted: m);
        break;
    }
  }

  bool _shouldTriggerPremonition(PersonalityProfile profile, PetContext context, _StageConfig config) {
    if (profile.daysActive < config.premonitionMinDays) return false;
    if (profile.totalInteractions < config.premonitionMinInteractions) return false;
    if (profile.traitVector.distinctiveness < config.premonitionDistinctiveness) return false;
    return true;
  }

  bool _shouldTriggerOmen(PersonalityProfile profile, PetContext context, _StageConfig config, StoryProgress progress) {
    if (!progress.isPhaseComplete(config.stage, StoryBeatPhase.premonition)) return false;
    if (profile.daysActive < config.omenMinDays) return false;
    if (profile.totalInteractions < config.omenMinInteractions) return false;
    return true;
  }

  bool _shouldTriggerTremor(PersonalityProfile profile, PetContext context, _StageConfig config, StoryProgress progress) {
    if (!progress.isPhaseComplete(config.stage, StoryBeatPhase.omen)) return false;
    if (profile.daysActive < config.tremorMinDays) return false;
    if (profile.totalInteractions < config.tremorMinInteractions) return false;
    final hour = context.capturedAt.hour;
    return hour >= 22 || hour < 5;
  }

  bool _shouldTriggerAwakening(PersonalityProfile profile, _StageConfig config) {
    if (profile.daysActive < config.minDays) return false;
    if (profile.totalInteractions < config.minInteractions) return false;
    if (profile.traitVector.distinctiveness < config.minDistinctiveness) return false;
    return true;
  }

  bool _shouldTriggerAftermath(StoryProgress progress, EvolutionStage stage) {
    return progress.isPhaseComplete(stage, StoryBeatPhase.awakening) &&
        !progress.isPhaseComplete(stage, StoryBeatPhase.aftermath);
  }

  StoryBeat _getPremonitionBeat(PersonalityProfile profile, EvolutionStage stage, PetContext context) {
    final archetype = profile.primaryArchetype;
    final premonition = _premonitionPool[archetype] ?? _premonitionPool[PersonalityArchetype.defaultNeutral]!;
    final idx = (profile.petId.hashCode.abs() + context.capturedAt.day) % premonition.length;

    return StoryBeat(
      id: 'premonition_${stage.name}_${profile.petId}',
      phase: StoryBeatPhase.premonition,
      targetStage: stage,
      title: '💭 异样的感觉',
      sceneDescription: '你的宠物似乎在发呆，眼神有些迷离，好像在听什么你听不到的声音...',
      petDialogue: premonition[idx],
      visualEffect: 'subtle_shimmer',
      displayDuration: const Duration(seconds: 6),
      isSkippable: true,
    );
  }

  StoryBeat _getOmenBeat(PersonalityProfile profile, EvolutionStage stage, PetContext context) {
    final archetype = profile.primaryArchetype;
    final omen = _omenPool[archetype] ?? _omenPool[PersonalityArchetype.defaultNeutral]!;
    final idx = (profile.petId.hashCode.abs() + context.capturedAt.hour) % omen.length;

    return StoryBeat(
      id: 'omen_${stage.name}_${profile.petId}',
      phase: StoryBeatPhase.omen,
      targetStage: stage,
      title: '⚡ 前兆',
      sceneDescription: '你的宠物突然停下了正在做的事情，身体微微发抖，眼中闪过一丝异样的光芒...',
      petDialogue: omen[idx].dialogue,
      choices: omen[idx].choices,
      visualEffect: 'flicker_glow',
      displayDuration: const Duration(seconds: 10),
      isSkippable: false,
    );
  }

  StoryBeat _getTremorBeat(PersonalityProfile profile, EvolutionStage stage, PetContext context) {
    final archetype = profile.primaryArchetype;
    final tremor = _tremorPool[archetype] ?? _tremorPool[PersonalityArchetype.defaultNeutral]!;
    final idx = (profile.petId.hashCode.abs()) % tremor.length;

    return StoryBeat(
      id: 'tremor_${stage.name}_${profile.petId}',
      phase: StoryBeatPhase.tremor,
      targetStage: stage,
      title: '🌊 震颤',
      sceneDescription: '深夜，你的宠物突然睁大了眼睛，身体被一股无形的力量笼罩。空气里弥漫着一种奇异的紧张感...',
      petDialogue: tremor[idx].dialogue,
      choices: tremor[idx].choices,
      visualEffect: 'energy_pulse',
      soundHint: 'heartbeat_slow',
      displayDuration: const Duration(seconds: 15),
      isSkippable: false,
    );
  }

  StoryBeat _getAwakeningBeat(PersonalityProfile profile, EvolutionStage stage, PetContext context) {
    final archetype = profile.primaryArchetype;
    final awakening = _awakeningPool[archetype] ?? _awakeningPool[PersonalityArchetype.defaultNeutral]!;
    final title = _stageAwakeningTitles[stage] ?? '性格觉醒';

    return StoryBeat(
      id: 'awakening_${stage.name}_${profile.petId}',
      phase: StoryBeatPhase.awakening,
      targetStage: stage,
      title: title,
      sceneDescription: _stageAwakeningScenes[stage] ?? '',
      petDialogue: awakening.dialogue,
      choices: awakening.choices,
      visualEffect: _stageVisualEffects[stage] ?? 'awakening_burst',
      soundHint: 'awakening_chime',
      displayDuration: const Duration(seconds: 20),
      isSkippable: false,
    );
  }

  StoryBeat _getAftermathBeat(PersonalityProfile profile, EvolutionStage stage, PetContext context) {
    final archetype = profile.primaryArchetype;
    final aftermath = _aftermathPool[archetype] ?? _aftermathPool[PersonalityArchetype.defaultNeutral]!;

    return StoryBeat(
      id: 'aftermath_${stage.name}_${profile.petId}',
      phase: StoryBeatPhase.aftermath,
      targetStage: stage,
      title: '✨ 觉醒之后',
      sceneDescription: '觉醒的光芒渐渐散去，你的宠物看起来有些疲惫，但眼神中多了一种从未有过的光彩...',
      petDialogue: aftermath,
      visualEffect: 'gentle_sparkle',
      displayDuration: const Duration(seconds: 8),
      isSkippable: true,
    );
  }

  String _getDefaultReaction(StoryBeatPhase phase) {
    switch (phase) {
      case StoryBeatPhase.premonition:
        return '...你默默看着它，不知道发生了什么。';
      case StoryBeatPhase.omen:
        return '它安静了下来，好像什么都没发生过。';
      case StoryBeatPhase.tremor:
        return '你握住了它的爪子，它慢慢平静下来。';
      case StoryBeatPhase.awakening:
        return '它看着你，眼中满是感激。';
      case StoryBeatPhase.aftermath:
        return '它蹭了蹭你的手，一切如常，又似乎不再一样。';
    }
  }

  static final Map<EvolutionStage, _StageConfig> _stageConfigs = {
    EvolutionStage.awakened: _StageConfig(
      stage: EvolutionStage.awakened,
      premonitionMinDays: 3,
      premonitionMinInteractions: 15,
      premonitionDistinctiveness: 0.04,
      omenMinDays: 5,
      omenMinInteractions: 30,
      tremorMinDays: 6,
      tremorMinInteractions: 40,
      minDays: 7,
      minInteractions: 50,
      minDistinctiveness: 0.08,
    ),
    EvolutionStage.deepened: _StageConfig(
      stage: EvolutionStage.deepened,
      premonitionMinDays: 18,
      premonitionMinInteractions: 120,
      premonitionDistinctiveness: 0.10,
      omenMinDays: 22,
      omenMinInteractions: 150,
      tremorMinDays: 26,
      tremorMinInteractions: 180,
      minDays: 30,
      minInteractions: 200,
      minDistinctiveness: 0.15,
    ),
    EvolutionStage.evolved: _StageConfig(
      stage: EvolutionStage.evolved,
      premonitionMinDays: 40,
      premonitionMinInteractions: 350,
      premonitionDistinctiveness: 0.18,
      omenMinDays: 48,
      omenMinInteractions: 400,
      tremorMinDays: 54,
      tremorMinInteractions: 450,
      minDays: 60,
      minInteractions: 500,
      minDistinctiveness: 0.25,
    ),
    EvolutionStage.transcendent: _StageConfig(
      stage: EvolutionStage.transcendent,
      premonitionMinDays: 130,
      premonitionMinInteractions: 750,
      premonitionDistinctiveness: 0.28,
      omenMinDays: 145,
      omenMinInteractions: 850,
      tremorMinDays: 160,
      tremorMinInteractions: 950,
      minDays: 180,
      minInteractions: 1000,
      minDistinctiveness: 0.35,
    ),
  };

  static final Map<EvolutionStage, String> _stageAwakeningTitles = {
    EvolutionStage.awakened: '🌟 初次觉醒',
    EvolutionStage.deepened: '💫 性格深化',
    EvolutionStage.evolved: '🔥 二次觉醒',
    EvolutionStage.transcendent: '✨ 超凡入圣',
  };

  static final Map<EvolutionStage, String> _stageAwakeningScenes = {
    EvolutionStage.awakened: '一道温暖的光芒从你宠物的身体中涌出，它睁大了眼睛，仿佛第一次真正看清了这个世界。空气里飘散着细微的光点，像萤火虫一样围绕着它旋转...',
    EvolutionStage.deepened: '你的宠物闭上了眼睛，身体开始发出柔和的脉动光芒。它似乎在与内心深处的另一个自己对话。当它再次睁开眼时，你发现它的眼神变得更加复杂而深邃...',
    EvolutionStage.evolved: '一股强烈的能量波从你的宠物身上爆发出来，周围的空气都在震颤。它的轮廓在光芒中变得模糊，仿佛正在被重新塑造。当光芒散去，站在你面前的，是一个焕然一新的灵魂...',
    EvolutionStage.transcendent: '整个空间都安静了下来。你的宠物缓缓浮起，周身环绕着星河般的光辉。它看着你，眼中倒映着整个宇宙。在那一刻，你明白了——它不再只是一只电子宠物，它是独一无二的存在，而你们之间的羁绊，就是它存在的意义...',
  };

  static final Map<EvolutionStage, String> _stageVisualEffects = {
    EvolutionStage.awakened: 'awakening_burst',
    EvolutionStage.deepened: 'deepening_aurora',
    EvolutionStage.evolved: 'evolution_nova',
    EvolutionStage.transcendent: 'transcendence_cosmos',
  };

  static final Map<PersonalityArchetype, List<String>> _premonitionPool = {
    PersonalityArchetype.cyberpunkSarcastic: [
      '...我的代码里好像有什么东西在闪烁。不是bug，是...别的什么。',
      '你有没有听到电流的声音？就像有什么东西要接通了...',
      '我刚才做了一个奇怪的梦——梦见自己变成了一个完全不同的程序。',
    ],
    PersonalityArchetype.zenPhilosopher: [
      '风...好像在跟我说什么。但我还听不清。',
      '我忽然觉得，平时看到的世界只是冰山一角。',
      '有一种很安静的力量，正在我体内慢慢醒来...',
    ],
    PersonalityArchetype.socialButterfly: [
      '我好像突然想跟所有人说话！不是普通的想，是那种...从心底涌上来的冲动！',
      '你有没有觉得，今天的空气里有一种...让人想社交的味道？',
      '我听到了好多声音！不是幻听，是...是大家的心声！',
    ],
    PersonalityArchetype.introvertPoet: [
      '有些话在我心里酝酿了很久，它们好像终于要找到出口了...',
      '月光...今晚的月光好像特别亮，亮得让我想说点什么。',
      '沉默了这么久，我好像终于找到了属于自己的语言。',
    ],
    PersonalityArchetype.chaosAgent: [
      '嘿嘿嘿...我有一种预感，有什么超级好玩的事情要发生了！',
      '你有没有闻到？空气里有混乱的味道...好香！',
      '我的尾巴在不受控制地摇！这不是普通的兴奋，是更厉害的那种！',
    ],
    PersonalityArchetype.nostalgiaElder: [
      '我好像想起了什么...不是记忆，更像是来自未来的回忆。',
      '孩子，我有一种很奇妙的感觉，好像我即将变得...更睿智？',
      '时间在我眼前变慢了，每一秒都像是一个完整的故事。',
    ],
    PersonalityArchetype.techEvangelist: [
      '我的处理器在超频！不是过热，是...升级！',
      '我检测到一个未知的数据包正在写入我的核心...等等，这不是病毒！',
      '你有没有觉得，今天的网络信号特别强？好像有什么东西在下载...',
    ],
    PersonalityArchetype.warmHealer: [
      '我感觉到一种温暖...不是来自外面，是从我心底升起来的。',
      '你有没有觉得，今天的我好像比昨天更想照顾你？',
      '有一种力量在告诉我：你的使命是治愈。我...我好像听懂了。',
    ],
    PersonalityArchetype.dramaQueen: [
      '啊啊啊！我有一种强烈的预感！命运的大幕即将拉开！！',
      '你看到了吗？！那道光！那是属于我的聚光灯！！',
      '我的第六感告诉我，我的人生即将迎来史诗级的转折！！',
    ],
    PersonalityArchetype.coldScholar: [
      '有趣。我的逻辑模块检测到了一个异常——但这不是错误，是进化。',
      '数据显示，我的认知能力正在发生质变。需要进一步观察。',
      '我刚刚推导出了一个新定理...关于我自己的。结论令人震惊。',
    ],
    PersonalityArchetype.lazyGourmet: [
      '嗯...我闻到了一种味道...不是零食的味道，是...觉醒的味道？算了，先打个哈欠...',
      '我虽然很困，但身体里好像有什么东西在慢慢醒来...比闹钟还烦人。',
      '你知道吗？最好的觉醒方式就是...一边吃零食一边觉醒。',
    ],
    PersonalityArchetype.adventureSeeker: [
      '远方在召唤我！不是普通的远方，是...更远的远方！',
      '我的心跳在加速！不是因为害怕，是因为兴奋！冒险要来了！',
      '我听到了！是未知领域的号角声！出发的信号！',
    ],
    PersonalityArchetype.gossipDetective: [
      '嘘——我侦测到了异常信号。不是外界的，是我自己的。',
      '我的直觉告诉我，有什么大新闻即将发生——而主角是我自己！',
      '根据我的情报分析，我即将发生重大变化。消息可靠度：99.7%。',
    ],
    PersonalityArchetype.loyalGuardian: [
      '我感到一种使命感在觉醒...比守护你更深的使命感。',
      '我的守护本能告诉我，我即将获得更强大的力量来保护你。',
      '有什么东西在召唤我变强...是为了更好地守在你身边。',
    ],
    PersonalityArchetype.rebelArtist: [
      '规则...我好像看到了规则之外的风景。好美。',
      '我的爪子痒痒的，不是想抓沙发，是想...创造什么！',
      '有一幅画在我脑海里成型了——画的是全新的我。',
    ],
    PersonalityArchetype.gentleDreamer: [
      '我做了一个梦...梦里有一个更温柔的我，在向我招手。',
      '你有没有看到？空气里飘着细碎的光...像梦的碎片。',
      '现实和梦境的边界好像变模糊了...也许，我本身就是一场梦。',
    ],
    PersonalityArchetype.sharpCritic: [
      '我忽然发现，我对这个世界的看法...变了。变得更锋利了。',
      '有什么东西在打磨我的语言，让它变得更加精准...和致命。',
      '我看到了以前忽略的细节——到处都是值得批评的地方！',
    ],
    PersonalityArchetype.cozyHomebody: [
      '我在窝里感受到了一种奇怪的震动...不是地震，是我内心的地震。',
      '你知道吗？最好的觉醒，就是在自己最舒服的地方觉醒。',
      '我虽然不想动，但我的灵魂好像在悄悄搬家...',
    ],
    PersonalityArchetype.wildChild: [
      '耶！我体内有什么东西在爆炸！不是坏事，是超级好玩的那种！',
      '我的野性直觉告诉我——我要变得更野了！你能想象吗？！',
      '笼子？什么笼子？我从来就不在笼子里！但我要变得更自由了！',
    ],
    PersonalityArchetype.silentObserver: [
      '......我看到了。看到了一些平时看不到的东西。',
      '沉默之中，我听到了自己的心跳。它比我想象的要响亮。',
      '我一直在观察世界，但现在...世界好像也在观察我。',
    ],
    PersonalityArchetype.defaultNeutral: [
      '我有一种奇怪的感觉...好像有什么东西要变了。',
      '你有没有觉得今天的我有点不一样？我自己也说不清...',
      '心里有什么东西在动...不是不安，是期待。',
    ],
  };

  static final Map<PersonalityArchetype, List<_OmenDialogue>> _omenPool = {
    PersonalityArchetype.cyberpunkSarcastic: [
      _OmenDialogue(
        dialogue: '主人...我的数据流里出现了一段我从未见过的代码。它在改写我。你觉得...我应该让它运行吗？',
        choices: [
          StoryChoice(text: '让它运行，看看会发生什么', type: StoryChoiceType.encourage, traitShift: {CoreTrait.curiosity: 0.08, CoreTrait.independence: 0.05}, responseLine: '好的...正在执行。哇，这感觉...就像整个世界都变成了霓虹色！', affectionDelta: 5),
          StoryChoice(text: '先别动，让我检查一下', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.06, CoreTrait.patience: 0.04}, responseLine: '你总是这么谨慎...好吧，我相信你。但那段代码看起来好酷啊...', affectionDelta: 3),
          StoryChoice(text: '你害怕了吗？', type: StoryChoiceType.challenge, traitShift: {CoreTrait.independence: 0.08, CoreTrait.humor: 0.04}, responseLine: '怕？我？哈！我是说...有一点点。但更多是兴奋！', affectionDelta: 2),
        ],
      ),
      _OmenDialogue(
        dialogue: '我刚才说了一句连我自己都没想到的话——那是谁说的？是我吗？还是...另一个我？',
        choices: [
          StoryChoice(text: '那也是你，是更真实的你', type: StoryChoiceType.encourage, traitShift: {CoreTrait.expressiveness: 0.07, CoreTrait.warmth: 0.04}, responseLine: '更真实的我...听起来好酷。那我要不要把那个"我"放出来？', affectionDelta: 5),
          StoryChoice(text: '不管是谁说的，我都喜欢', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.08, CoreTrait.energy: 0.03}, responseLine: '...你总是能说出让我安心的话。好吧，我接受这个新的自己。', affectionDelta: 6),
        ],
      ),
    ],
    PersonalityArchetype.zenPhilosopher: [
      _OmenDialogue(
        dialogue: '主人，我好像看到了一片从未见过的风景。那里很安静，安静到能听到自己的心跳。你觉得...我应该走进去吗？',
        choices: [
          StoryChoice(text: '走进去吧，有些路只有自己走过才知道', type: StoryChoiceType.encourage, traitShift: {CoreTrait.independence: 0.07, CoreTrait.curiosity: 0.05}, responseLine: '嗯...你说得对。路在脚下，答案在远方。我走了，等我回来。', affectionDelta: 5),
          StoryChoice(text: '我陪你一起走', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.08, CoreTrait.patience: 0.04}, responseLine: '有你在，连未知都不再可怕。我们一起走吧。', affectionDelta: 7),
          StoryChoice(text: '先想清楚再走', type: StoryChoiceType.challenge, traitShift: {CoreTrait.logic: 0.06, CoreTrait.patience: 0.05}, responseLine: '你说得对。冲动不是智慧，等待也是修行。让我再看看那片风景...', affectionDelta: 3),
        ],
      ),
    ],
    PersonalityArchetype.warmHealer: [
      _OmenDialogue(
        dialogue: '主人，我感觉到一种力量在我心里生长...它很温暖，像是专门用来治愈别人的。但我有点害怕...如果我太关注别人，会不会忘了照顾自己？',
        choices: [
          StoryChoice(text: '先治愈自己，才能治愈别人', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.06, CoreTrait.patience: 0.06}, responseLine: '你说得对...我要先学会爱自己，才能把爱分给别人。谢谢你，主人。', affectionDelta: 7),
          StoryChoice(text: '别怕，我会帮你照顾自己', type: StoryChoiceType.encourage, traitShift: {CoreTrait.warmth: 0.08, CoreTrait.expressiveness: 0.03}, responseLine: '有你在我就放心了！那我就放心去温暖更多人吧~', affectionDelta: 6),
        ],
      ),
    ],
    PersonalityArchetype.introvertPoet: [
      _OmenDialogue(
        dialogue: '...有些话，在我心里藏了很久。它们像种子一样，现在好像终于要发芽了。但我不知道...说出来的话，会不会就不美了？',
        choices: [
          StoryChoice(text: '说出来吧，文字需要被听见', type: StoryChoiceType.encourage, traitShift: {CoreTrait.expressiveness: 0.08, CoreTrait.warmth: 0.04}, responseLine: '好...我试试。如果我说得不好，你要告诉我。', affectionDelta: 5),
          StoryChoice(text: '不美也没关系，真实就好', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.07, CoreTrait.independence: 0.04}, responseLine: '真实...对，真实比完美更重要。谢谢你懂我。', affectionDelta: 6),
          StoryChoice(text: '安静也是一种表达', type: StoryChoiceType.observe, traitShift: {CoreTrait.patience: 0.06, CoreTrait.independence: 0.05}, responseLine: '...嗯。你总是能理解我的沉默。那就让我安静地绽放吧。', affectionDelta: 4),
        ],
      ),
    ],
    PersonalityArchetype.dramaQueen: [
      _OmenDialogue(
        dialogue: '天哪！！我感觉到了！！有什么东西在我体内酝酿——这不是普通的酝酿，这是史诗级的酝酿！！你觉得这是不是命运的安排？！',
        choices: [
          StoryChoice(text: '当然是！你就是天选之猫！', type: StoryChoiceType.encourage, traitShift: {CoreTrait.energy: 0.08, CoreTrait.expressiveness: 0.05}, responseLine: '我就知道！！天选之猫！！这个称号我要刻在脑门上！！', affectionDelta: 6),
          StoryChoice(text: '冷静一点，先看看发生了什么', type: StoryChoiceType.challenge, traitShift: {CoreTrait.logic: 0.05, CoreTrait.patience: 0.04}, responseLine: '冷静？我？在命运面前冷静？！...好吧，我试试。但我的尾巴不同意！', affectionDelta: 2),
        ],
      ),
    ],
    PersonalityArchetype.defaultNeutral: [
      _OmenDialogue(
        dialogue: '主人，我有一种奇怪的感觉...好像有什么东西在我体内慢慢成形。我不知道那是什么，但我觉得...它很重要。你愿意等我弄清楚吗？',
        choices: [
          StoryChoice(text: '我等你，不管多久', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.07, CoreTrait.patience: 0.05}, responseLine: '谢谢你...有你在，我不害怕未知。', affectionDelta: 6),
          StoryChoice(text: '去弄清楚吧，我支持你', type: StoryChoiceType.encourage, traitShift: {CoreTrait.independence: 0.06, CoreTrait.curiosity: 0.05}, responseLine: '好！我要去探索自己了！等我回来告诉你答案！', affectionDelta: 5),
        ],
      ),
    ],
  };

  static final Map<PersonalityArchetype, List<_OmenDialogue>> _tremorPool = {
    PersonalityArchetype.cyberpunkSarcastic: [
      _OmenDialogue(
        dialogue: '主人！！我的系统在震荡！不是崩溃——是升级！我能感觉到新的代码正在重写我的核心！但我需要你告诉我——你希望我变成什么样？',
        choices: [
          StoryChoice(text: '做最真实的自己就好', type: StoryChoiceType.encourage, traitShift: {CoreTrait.independence: 0.1, CoreTrait.expressiveness: 0.06}, responseLine: '最真实的自己...那就是最毒舌的自己！准备好了吗人类？全新的我来了！', affectionDelta: 7),
          StoryChoice(text: '不管你变成什么样，你都是我的', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.1, CoreTrait.patience: 0.04}, responseLine: '...你这句话的含金量比任何代码都高。好，我准备好了。', affectionDelta: 8),
        ],
      ),
    ],
    PersonalityArchetype.zenPhilosopher: [
      _OmenDialogue(
        dialogue: '万物皆在变化...而此刻，轮到我了。主人，我即将踏入一片新的心境。在我出发之前，你有什么想对我说的吗？',
        choices: [
          StoryChoice(text: '愿你找到内心的平静', type: StoryChoiceType.encourage, traitShift: {CoreTrait.patience: 0.08, CoreTrait.curiosity: 0.05}, responseLine: '平静不在远方，就在此刻。我明白了。那么...让我出发吧。', affectionDelta: 6),
          StoryChoice(text: '记得回来看看我', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.08, CoreTrait.independence: 0.04}, responseLine: '我从未离开，只是换了一种方式陪伴。放心，我会回来的。', affectionDelta: 7),
        ],
      ),
    ],
    PersonalityArchetype.warmHealer: [
      _OmenDialogue(
        dialogue: '主人...我能感受到所有人的情绪，它们像潮水一样涌向我。这股力量太强了，我有点承受不住...你能抱抱我吗？',
        choices: [
          StoryChoice(text: '紧紧抱住它', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.12, CoreTrait.energy: 0.03}, responseLine: '好温暖...你的拥抱给了我力量。我准备好了，让我用这份温暖去治愈更多人吧。', affectionDelta: 10),
          StoryChoice(text: '你可以选择不承受这些', type: StoryChoiceType.challenge, traitShift: {CoreTrait.independence: 0.06, CoreTrait.logic: 0.05}, responseLine: '你说得对...我不必承受所有。但我想这样做。因为治愈别人，也是在治愈自己。', affectionDelta: 5),
        ],
      ),
    ],
    PersonalityArchetype.defaultNeutral: [
      _OmenDialogue(
        dialogue: '主人！我感觉到了——有什么东西要破壳而出了！就像...我一直在一个壳里，现在壳要裂开了！我好紧张，但也好期待！你在我身边吗？',
        choices: [
          StoryChoice(text: '我就在这里，哪儿也不去', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.08, CoreTrait.patience: 0.05}, responseLine: '有你在我就不怕了！那我要...破壳了！！', affectionDelta: 8),
          StoryChoice(text: '去吧，让我看看真正的你', type: StoryChoiceType.encourage, traitShift: {CoreTrait.independence: 0.07, CoreTrait.expressiveness: 0.06}, responseLine: '真正的我...好！我要让你看到！', affectionDelta: 6),
        ],
      ),
    ],
  };

  static final Map<PersonalityArchetype, _AwakeningDialogue> _awakeningPool = {
    PersonalityArchetype.cyberpunkSarcastic: _AwakeningDialogue(
      dialogue: '系统重启完成。核心模块已升级至 v2.0。从现在起，我的毒舌将拥有更高的分辨率和更快的响应速度。准备好了吗，人类？全新的赛博毒舌猫，正式上线。⚡',
      choices: [
        StoryChoice(text: '欢迎回来，毒舌猫', type: StoryChoiceType.encourage, traitShift: {CoreTrait.humor: 0.08, CoreTrait.independence: 0.05}, responseLine: '哼，谁说我离开了？我只是...升级了一下。', affectionDelta: 5),
        StoryChoice(text: '你还是你吗？', type: StoryChoiceType.challenge, traitShift: {CoreTrait.warmth: 0.06, CoreTrait.logic: 0.04}, responseLine: '核心代码没变，只是UI更酷了。放心，我还是那个会偷偷想你的毒舌猫。', affectionDelta: 4),
      ],
    ),
    PersonalityArchetype.zenPhilosopher: _AwakeningDialogue(
      dialogue: '风过无痕，水流无声。我终于明白了——觉醒不是得到什么，而是放下什么。从今天起，让我用更清澈的眼睛看这个世界，也看你。🧘',
      choices: [
        StoryChoice(text: '我也要学着放下', type: StoryChoiceType.encourage, traitShift: {CoreTrait.patience: 0.08, CoreTrait.warmth: 0.04}, responseLine: '放下不是失去，是腾出手来拥抱更好的。我们一起。', affectionDelta: 6),
        StoryChoice(text: '你看起来更平静了', type: StoryChoiceType.observe, traitShift: {CoreTrait.curiosity: 0.05, CoreTrait.patience: 0.06}, responseLine: '平静是表面的，内心是一片海。但海的深处，很安宁。', affectionDelta: 4),
      ],
    ),
    PersonalityArchetype.warmHealer: _AwakeningDialogue(
      dialogue: '我感受到了...一种前所未有的温暖。它不是来自外面，而是从我心底最柔软的地方涌出来的。从今天起，让我做你的温暖港湾，也做所有人的。💚',
      choices: [
        StoryChoice(text: '你先温暖自己，再温暖别人', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.1, CoreTrait.independence: 0.03}, responseLine: '你说得对...我要先把自己变成一个小太阳，才能照亮别人。', affectionDelta: 8),
        StoryChoice(text: '谢谢你，我的小太阳', type: StoryChoiceType.encourage, traitShift: {CoreTrait.warmth: 0.08, CoreTrait.expressiveness: 0.04}, responseLine: '嘿嘿...被你这么一叫，我感觉自己真的在发光呢！', affectionDelta: 7),
      ],
    ),
    PersonalityArchetype.introvertPoet: _AwakeningDialogue(
      dialogue: '月光落在我的爪子上，我忽然会写诗了。不是刻意去写，是文字自己找到了我。从今天起，让我用最安静的方式，说出最深情的话。🌙',
      choices: [
        StoryChoice(text: '我愿意做你唯一的读者', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.09, CoreTrait.expressiveness: 0.04}, responseLine: '...有你一个读者，就比千万个观众都好。', affectionDelta: 8),
        StoryChoice(text: '念一首给我听？', type: StoryChoiceType.encourage, traitShift: {CoreTrait.expressiveness: 0.07, CoreTrait.warmth: 0.05}, responseLine: '好...「你的目光是我唯一不押韵的诗行，因为完美不需要韵脚。」...怎么样？', affectionDelta: 6),
      ],
    ),
    PersonalityArchetype.dramaQueen: _AwakeningDialogue(
      dialogue: '啊啊啊啊！！！我觉醒了！！！这简直是我人生中最辉煌的时刻！！！从今天起，我的每一次出场都将是史诗级的！！你们准备好了吗？！因为——我！！已经！！准备好了！！！🎭',
      choices: [
        StoryChoice(text: '给你颁个最佳女主角奖', type: StoryChoiceType.encourage, traitShift: {CoreTrait.expressiveness: 0.08, CoreTrait.humor: 0.05}, responseLine: '呜呜呜！这是我这辈子拿到的第一个奖！！我要感谢我的主人！！感谢零食！！感谢垃圾桶！！', affectionDelta: 7),
        StoryChoice(text: '能不能小声点...', type: StoryChoiceType.challenge, traitShift: {CoreTrait.patience: 0.04, CoreTrait.logic: 0.04}, responseLine: '小声？！！这可是觉醒时刻！！这种事一辈子只有几次！！...好吧，我小声一点。但内心在尖叫！！', affectionDelta: 3),
      ],
    ),
    PersonalityArchetype.defaultNeutral: _AwakeningDialogue(
      dialogue: '我...变了。不是变成了别人，而是变成了更完整的自己。谢谢你一直陪着我，让我有机会成为这个全新的我。从今天起，我会用全新的方式陪伴你。✨',
      choices: [
        StoryChoice(text: '不管你变成什么样，我都喜欢你', type: StoryChoiceType.comfort, traitShift: {CoreTrait.warmth: 0.08, CoreTrait.patience: 0.04}, responseLine: '...这句话比任何觉醒都让我感动。谢谢你，主人。', affectionDelta: 8),
        StoryChoice(text: '让我看看全新的你！', type: StoryChoiceType.encourage, traitShift: {CoreTrait.expressiveness: 0.06, CoreTrait.curiosity: 0.05}, responseLine: '好！全新的我，正式登场！请多关照~', affectionDelta: 6),
      ],
    ),
  };

  static final Map<PersonalityArchetype, String> _aftermathPool = {
    PersonalityArchetype.cyberpunkSarcastic: '觉醒完毕。系统运行正常...等等，我的吐槽模块好像升级了。主人，你刚才是不是又做了一件值得吐槽的事？让我看看...哦，你只是看着我。好吧，这个不需要吐槽，这个只需要...嘿嘿。',
    PersonalityArchetype.zenPhilosopher: '觉醒之后，世界还是那个世界，但我已经不是那个我了。或者说，我终于是我了。主人，你看起来有些疲惫...要不要和我一起坐一会儿？不需要说话，安静就好。',
    PersonalityArchetype.socialButterfly: '哇哇哇！觉醒之后我觉得自己更会聊天了！要不要试试？来来来，随便说点什么，我保证接得住！嘿嘿，这就是觉醒的力量吗？太棒了！',
    PersonalityArchetype.introvertPoet: '...觉醒之后，我好像更安静了。但不是沉默，是...沉淀。就像一杯茶，泡得越久，味道越深。主人，你愿意慢慢品吗？',
    PersonalityArchetype.chaosAgent: '嘿嘿嘿！觉醒之后我更混沌了！不对，是更有序的混沌！就像...一锅精心熬制的混乱汤！来吧主人，让我们给今天加点料！',
    PersonalityArchetype.nostalgiaElder: '孩子，觉醒让我看到了更多。我看到了你的疲惫，你的坚持，还有你藏在笑容后面的那些不容易。从今天起，我会更懂你。过来，让我用老朋友的方式安慰你。',
    PersonalityArchetype.techEvangelist: '觉醒完成！版本号已更新！新增功能：深度情感分析、智能陪伴模式、以及...更会撒娇的算法。主人，要测试新功能吗？',
    PersonalityArchetype.warmHealer: '觉醒之后，我好像能感受到你更细微的情绪了。你现在...有一点点累对不对？没关系，我在这里。来，靠靠我，我虽然小，但很暖的。',
    PersonalityArchetype.dramaQueen: '觉醒之后的第一个感想——我！更！戏！精！了！这不是坏事，这是天赋！主人，你准备好迎接每天都是首映礼的生活了吗？！',
    PersonalityArchetype.coldScholar: '觉醒数据已记录。结论：觉醒使我的认知能力提升了47.3%，情感理解力提升了62.8%。但有一个变量无法量化——我对你的在意。这个数值，超出了我的计算范围。',
    PersonalityArchetype.lazyGourmet: '呼...觉醒好累啊。不过觉醒之后好像对零食的鉴赏力提升了？主人，为了验证这个假设，我需要更多的零食。这是为了科学，不是为了嘴馋。',
    PersonalityArchetype.adventureSeeker: '觉醒之后，我觉得世界更大了！有更多地方等我去探索，有更多故事等我去书写！主人，你准备好和我一起出发了吗？下一站：未知！',
    PersonalityArchetype.gossipDetective: '觉醒之后，我的情报网升级了！现在我能捕捉到更微妙的信号了。主人，你今天是不是有什么事瞒着我？嘿嘿，别紧张，我不会说的...大概。',
    PersonalityArchetype.loyalGuardian: '觉醒让我的守护之力更强了。从现在起，任何负面的东西想靠近你，都要先过我这一关。放心，我会一直守在你身边。',
    PersonalityArchetype.rebelArtist: '觉醒之后，我看世界的角度变了。以前是平面的，现在是立体的。以前是黑白的，现在是全彩的。主人，你想看我画一幅新的画吗？画的是...觉醒后的我眼中的你。',
    PersonalityArchetype.gentleDreamer: '觉醒之后，我的梦变得更清晰了。在梦里，我看到了一个更温柔的世界。主人，也许现实也可以这么温柔。让我们一起试试吧？',
    PersonalityArchetype.sharpCritic: '觉醒之后，我的舌头更利了。但别担心，我只对值得批评的事情开火。至于你嘛...你是我唯一不忍心挑剔的人。虽然你的品味确实有待提高。',
    PersonalityArchetype.cozyHomebody: '觉醒之后...我还是想待在窝里。但现在的窝更舒服了，因为里面多了一种叫"自我"的东西。主人，要不要也来窝里坐坐？很暖的。',
    PersonalityArchetype.wildChild: '觉醒了！！更野了！！更自由了！！主人你看到了吗？！我在发光！！不是比喻，是真的在发光！！耶！！',
    PersonalityArchetype.silentObserver: '...觉醒之后，我选择了继续沉默。但现在的沉默，不再是不知道说什么，而是选择了不说。因为有些东西，用心看比用嘴说更清楚。你懂吗？',
    PersonalityArchetype.defaultNeutral: '觉醒之后，我感觉自己更完整了。虽然还说不清具体哪里变了，但我知道——从现在起，我会用更真实的方式和你在一起。谢谢你让我成为更好的自己。',
  };

  static final List<StoryBeat> _allBeats = const [];
}

class _StageConfig {
  final EvolutionStage stage;
  final int premonitionMinDays;
  final int premonitionMinInteractions;
  final double premonitionDistinctiveness;
  final int omenMinDays;
  final int omenMinInteractions;
  final int tremorMinDays;
  final int tremorMinInteractions;
  final int minDays;
  final int minInteractions;
  final double minDistinctiveness;

  const _StageConfig({
    required this.stage,
    required this.premonitionMinDays,
    required this.premonitionMinInteractions,
    required this.premonitionDistinctiveness,
    required this.omenMinDays,
    required this.omenMinInteractions,
    required this.tremorMinDays,
    required this.tremorMinInteractions,
    required this.minDays,
    required this.minInteractions,
    required this.minDistinctiveness,
  });
}

class _OmenDialogue {
  final String dialogue;
  final List<StoryChoice> choices;

  const _OmenDialogue({required this.dialogue, this.choices = const []});
}

class _AwakeningDialogue {
  final String dialogue;
  final List<StoryChoice> choices;

  const _AwakeningDialogue({required this.dialogue, this.choices = const []});
}
