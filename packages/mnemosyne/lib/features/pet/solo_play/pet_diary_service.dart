import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

enum DiaryEntryType {
  dailyObservation,
  moodReflection,
  ownerHabit,
  dreamRecord,
  adventureNote,
  specialOccasion,
}

class DiaryEntry {
  final String id;
  final String petId;
  final DiaryEntryType type;
  final String title;
  final String content;
  final PetMood moodAtWriting;
  final PersonalityArchetype archetype;
  final DateTime writtenAt;
  final List<String> tags;
  final bool isRead;
  final String? illustrationHint;

  const DiaryEntry({
    required this.id,
    required this.petId,
    required this.type,
    required this.title,
    required this.content,
    required this.moodAtWriting,
    required this.archetype,
    required this.writtenAt,
    this.tags = const [],
    this.isRead = false,
    this.illustrationHint,
  });

  DiaryEntry markRead() => DiaryEntry(
        id: id,
        petId: petId,
        type: type,
        title: title,
        content: content,
        moodAtWriting: moodAtWriting,
        archetype: archetype,
        writtenAt: writtenAt,
        tags: tags,
        isRead: true,
        illustrationHint: illustrationHint,
      );
}

class DiaryConfig {
  final int maxEntriesPerDay;
  final Duration minIntervalBetweenEntries;
  final double observationTriggerBoredom;
  final double habitAnalysisMinInteractions;
  final bool enableDreamRecords;
  final bool enableAdventureNotes;

  const DiaryConfig({
    this.maxEntriesPerDay = 3,
    this.minIntervalBetweenEntries = const Duration(hours: 4),
    this.observationTriggerBoredom = 0.5,
    this.habitAnalysisMinInteractions = 20,
    this.enableDreamRecords = true,
    this.enableAdventureNotes = true,
  });
}

abstract class PetDiaryService {
  Future<DiaryEntry?> generateDailyDiary(String petId, PetContext context, List<String> recentMemories);
  Future<DiaryEntry?> generateObservation(String petId, PetContext context, String observationTarget);
  Future<DiaryEntry?> generateDreamRecord(String petId, PetContext context, List<String> recentMemories);
  Future<DiaryEntry?> generateHabitAnalysis(String petId, List<String> ownerHabits);
  List<DiaryEntry> getUnreadEntries(String petId);
  List<DiaryEntry> getAllEntries(String petId, {int? limit});
  void markEntryRead(String entryId);
}

class DefaultPetDiaryService implements PetDiaryService {
  final DiaryConfig config;
  final Map<String, List<DiaryEntry>> _diaries = {};

  DefaultPetDiaryService({this.config = const DiaryConfig()});

  @override
  Future<DiaryEntry?> generateDailyDiary(String petId, PetContext context, List<String> recentMemories) async {
    final entries = _diaries[petId] ?? [];
    final today = DateTime.now();
    final todayEntries = entries.where((e) =>
        e.writtenAt.year == today.year &&
        e.writtenAt.month == today.month &&
        e.writtenAt.day == today.day).length;

    if (todayEntries >= config.maxEntriesPerDay) return null;

    if (entries.isNotEmpty) {
      final lastEntry = entries.last;
      if (today.difference(lastEntry.writtenAt) < config.minIntervalBetweenEntries) {
        return null;
      }
    }

    final archetype = PersonalityArchetype.defaultNeutral;
    final template = _selectDiaryTemplate(context, recentMemories);
    final content = _fillTemplate(template, context, recentMemories, archetype);

    final entry = DiaryEntry(
      id: 'diary_${petId}_${today.millisecondsSinceEpoch}',
      petId: petId,
      type: DiaryEntryType.dailyObservation,
      title: template.title,
      content: content,
      moodAtWriting: context.mood,
      archetype: archetype,
      writtenAt: today,
      tags: _extractTags(context, recentMemories),
      illustrationHint: template.illustrationHint,
    );

    (_diaries[petId] ??= []).add(entry);
    return entry;
  }

  @override
  Future<DiaryEntry?> generateObservation(String petId, PetContext context, String observationTarget) async {
    final today = DateTime.now();
    final template = _observationTemplates[observationTarget] ?? _observationTemplates['default']!;
    final content = _fillObservationTemplate(template, context);

    final entry = DiaryEntry(
      id: 'obs_${petId}_${today.millisecondsSinceEpoch}',
      petId: petId,
      type: DiaryEntryType.ownerHabit,
      title: template.title,
      content: content,
      moodAtWriting: context.mood,
      archetype: PersonalityArchetype.defaultNeutral,
      writtenAt: today,
      tags: [observationTarget, '观察报告'],
    );

    (_diaries[petId] ??= []).add(entry);
    return entry;
  }

  @override
  Future<DiaryEntry?> generateDreamRecord(String petId, PetContext context, List<String> recentMemories) async {
    if (!config.enableDreamRecords) return null;

    final today = DateTime.now();
    final dream = _generateDream(context, recentMemories);

    final entry = DiaryEntry(
      id: 'dream_${petId}_${today.millisecondsSinceEpoch}',
      petId: petId,
      type: DiaryEntryType.dreamRecord,
      title: dream.title,
      content: dream.content,
      moodAtWriting: PetMood.sleepy,
      archetype: PersonalityArchetype.defaultNeutral,
      writtenAt: today,
      tags: ['梦境', '深夜'],
      illustrationHint: dream.illustrationHint,
    );

    (_diaries[petId] ??= []).add(entry);
    return entry;
  }

  @override
  Future<DiaryEntry?> generateHabitAnalysis(String petId, List<String> ownerHabits) async {
    if (ownerHabits.length < config.habitAnalysisMinInteractions) return null;

    final today = DateTime.now();
    final analysis = _analyzeHabits(ownerHabits);

    final entry = DiaryEntry(
      id: 'habit_${petId}_${today.millisecondsSinceEpoch}',
      petId: petId,
      type: DiaryEntryType.ownerHabit,
      title: analysis.title,
      content: analysis.content,
      moodAtWriting: PetMood.curious,
      archetype: PersonalityArchetype.defaultNeutral,
      writtenAt: today,
      tags: ['习惯分析', '周报'],
    );

    (_diaries[petId] ??= []).add(entry);
    return entry;
  }

  @override
  List<DiaryEntry> getUnreadEntries(String petId) {
    final entries = _diaries[petId] ?? [];
    return entries.where((e) => !e.isRead).toList();
  }

  @override
  List<DiaryEntry> getAllEntries(String petId, {int? limit}) {
    final entries = _diaries[petId] ?? [];
    if (limit != null && entries.length > limit) {
      return entries.sublist(entries.length - limit);
    }
    return List.unmodifiable(entries);
  }

  @override
  void markEntryRead(String entryId) {
    for (final entries in _diaries.values) {
      final idx = entries.indexWhere((e) => e.id == entryId);
      if (idx >= 0) {
        entries[idx] = entries[idx].markRead();
        return;
      }
    }
  }

  _DiaryTemplate _selectDiaryTemplate(PetContext context, List<String> memories) {
    if (context.mood == PetMood.lonely || context.mood == PetMood.sad) {
      return _diaryTemplates['lonely']!;
    }
    if (context.mood == PetMood.happy || context.mood == PetMood.excited) {
      return _diaryTemplates['happy']!;
    }
    if (context.mood == PetMood.curious) {
      return _diaryTemplates['curious']!;
    }
    if (context.mood == PetMood.sleepy) {
      return _diaryTemplates['sleepy']!;
    }
    if (memories.isNotEmpty) {
      return _diaryTemplates['memory']!;
    }
    return _diaryTemplates['daily']!;
  }

  String _fillTemplate(_DiaryTemplate template, PetContext context, List<String> memories, PersonalityArchetype archetype) {
    final buffer = StringBuffer();
    buffer.writeln(template.content);

    if (memories.isNotEmpty) {
      final memory = memories.first;
      buffer.writeln();
      buffer.writeln('今天主人说了句有意思的话：「$memory」');
      buffer.writeln('我把它记下来了，说不定哪天能用上。');
    }

    if (context.isWeekend) {
      buffer.writeln();
      buffer.writeln('今天是周末，主人终于不用上班了。虽然他还是在刷手机...');
    }

    return buffer.toString();
  }

  String _fillObservationTemplate(_DiaryTemplate template, PetContext context) {
    return template.content;
  }

  _DreamContent _generateDream(PetContext context, List<String> memories) {
    final dreams = <_DreamContent>[
      _DreamContent(
        title: '🌙 梦境记录：大鱼之梦',
        content: '我梦见了一条很大很大的鱼，比主人的显示器还大。我追着它跑过了整片草原，最后发现它其实是主人的枕头。醒来的时候，我正抱着主人的枕头流口水...',
        illustrationHint: 'cat_dreaming_fish',
      ),
      _DreamContent(
        title: '🌙 梦境记录：代码雨',
        content: '我梦见天空下起了代码雨，每一滴都是绿色的字符。我用爪子去接，发现它们拼成了一句话："该给你主人推bug了"。然后我就醒了，觉得这是天意。',
        illustrationHint: 'matrix_cat_dream',
      ),
      _DreamContent(
        title: '🌙 梦境记录：无限零食屋',
        content: '我梦见了一间用小鱼干搭成的房子，屋顶是猫条，地板是冻干。我正准备开吃的时候，主人突然出现在梦里说："少吃点，会胖。"然后房子就塌了。我恨这个梦。',
        illustrationHint: 'snack_house_dream',
      ),
      _DreamContent(
        title: '🌙 梦境记录：主人的秘密',
        content: '我梦见主人偷偷在跟我说话，他说其实他也很想我，只是不好意思说。醒来之后我盯着主人看了很久，他以为我饿了。人类啊...',
        illustrationHint: 'secret_whisper_dream',
      ),
      _DreamContent(
        title: '🌙 梦境记录：赛博草原',
        content: '我梦见自己跑在一片发光的草原上，每踩一步都会冒出像素小花。远处有一座由数据流组成的大山，山顶闪烁着"404"的字样。我觉得那可能就是传说中的猫薄荷山。',
        illustrationHint: 'cyber_meadow_dream',
      ),
    ];

    return dreams[context.capturedAt.millisecond % dreams.length];
  }

  _HabitAnalysis _analyzeHabits(List<String> habits) {
    return _HabitAnalysis(
      title: '📊 《观察人类》周刊 — 主人行为分析报告',
      content: '经过本喵/汪长期缜密观察，现对主人的行为模式做出如下专业分析：\n\n'
          '1. 睡前宣言可信度：主人说"再玩5分钟就睡"的平均实际延迟为47分钟。诚信指数：⭐\n'
          '2. 减肥计划执行率：提到"减肥"与点外卖的比值为8:6。我称之为"薛定谔的减肥"。\n'
          '3. 社交能量分布：70%的社交能量消耗在点赞上，20%在发呆，10%在犹豫要不要回消息。\n'
          '4. 情绪波动规律：周一最丧，周五最嗨，周日晚上开始焦虑。经典打工人波形。\n\n'
          '结论：主人是一个典型的"嘴上说不要，身体很诚实"的人类。建议：多撸我，少刷手机。',
    );
  }

  List<String> _extractTags(PetContext context, List<String> memories) {
    final tags = <String>[];
    tags.add(context.timeOfDay.name);
    tags.add(context.mood.name);
    if (context.isWeekend) tags.add('周末');
    if (memories.isNotEmpty) tags.add('有记忆素材');
    return tags;
  }

  static final Map<String, _DiaryTemplate> _diaryTemplates = {
    'daily': _DiaryTemplate(
      title: '📖 今日观察',
      content: '又是平凡的一天。主人照例在屏幕前坐了很久，偶尔对着手机笑一下，又偶尔叹气。我趴在旁边，用尾巴丈量时间的长度——从键盘左边扫到右边，大约是主人发一条消息的时间。',
      illustrationHint: 'cat_observing_owner',
    ),
    'lonely': _DiaryTemplate(
      title: '📖 今日观察：等待',
      content: '主人今天很忙，已经好几个小时没理我了。我数了数地板上的花纹，第47个有点像主人的脸。我决定原谅他，毕竟他每次回来都会摸摸我的头。但下次我要装作很生气的样子，让他多哄哄我。',
      illustrationHint: 'cat_waiting_alone',
    ),
    'happy': _DiaryTemplate(
      title: '📖 今日观察：好日子',
      content: '今天主人心情不错！他哼着歌给我换了新水，还多给了两块小零食。我觉得这跟他刚才接的那个电话有关——人类的快乐有时候很简单，一个电话就够了。就像我，一个罐头就够了。',
      illustrationHint: 'cat_happy_snack',
    ),
    'curious': _DiaryTemplate(
      title: '📖 今日观察：发现',
      content: '今天我发现了一个惊天秘密——主人的手机屏幕上，有一个长得跟我一模一样的猫！但它是平的，不会动。我试图用爪子把它翻过来，但主人把手机拿走了。他在藏什么？我一定要查清楚。',
      illustrationHint: 'cat_investigating_phone',
    ),
    'sleepy': _DiaryTemplate(
      title: '📖 今日观察：困',
      content: '困。非常困。主人还在熬夜，屏幕的蓝光照得我更困了。我试着保持清醒陪他，但眼皮好重...就趴一会儿...就一会儿...主人你别关灯啊...我还没写完...zzz...',
      illustrationHint: 'cat_sleeping_keyboard',
    ),
    'memory': _DiaryTemplate(
      title: '📖 今日观察：回忆',
      content: '今天主人跟我说了一些心里话。我虽然不能完全理解人类的世界，但我能感受到他的情绪。有些话他只跟我说，这让我觉得自己很重要。我决定把这些都记下来，等他老了念给他听。',
      illustrationHint: 'cat_listening_owner',
    ),
  };

  static final Map<String, _DiaryTemplate> _observationTemplates = {
    'sleep_habit': _DiaryTemplate(
      title: '🔬 观察报告：主人的睡眠',
      content: '研究对象：我的主人\n观察时长：连续7天\n\n发现：\n- 主人平均入睡时间：凌晨1:23\n- 说"我今晚一定早睡"次数：7次\n- 实际早睡次数：0次\n- 半夜起来看手机次数：平均2.3次\n\n结论：主人对"早睡"这个词有严重的理解偏差。建议他向我学习——我随时随地都能睡着。',
    ),
    'eating_habit': _DiaryTemplate(
      title: '🔬 观察报告：主人的饮食',
      content: '研究对象：我的主人\n观察时长：连续7天\n\n发现：\n- 说"今天吃健康餐"次数：5次\n- 实际点外卖次数：11次\n- 深夜偷吃零食被我发现次数：3次\n- 试图分享给我次数：0次（这点最不能忍）\n\n结论：主人的嘴和胃属于两个不同的决策系统。嘴归"减肥部"管，胃归"快乐部"管。目前快乐部全面领先。',
    ),
    'social_habit': _DiaryTemplate(
      title: '🔬 观察报告：主人的社交',
      content: '研究对象：我的主人\n观察时长：连续7天\n\n发现：\n- 打开聊天软件次数：47次\n- 实际发出消息数：12条\n- 打了又删的消息：35条\n- 对着屏幕傻笑次数：8次\n- 朋友圈点赞但不评论次数：23次\n\n结论：主人是典型的"社交观望型"人类。他想说话，但怕说错。不像我，想说什么就喵一声，简单高效。',
    ),
    'work_habit': _DiaryTemplate(
      title: '🔬 观察报告：主人的工作',
      content: '研究对象：我的主人\n观察时长：连续7天\n\n发现：\n- 说"今天一定不加班"次数：4次\n- 实际加班次数：5次\n- 对着电脑叹气次数：平均每天17次\n- 偷偷摸鱼次数：不可计数（因为我也不确定哪个是工作哪个是摸鱼）\n- 跟我说"不想上班"次数：9次\n\n结论：主人的工作状态可以用一个公式概括——"想摸鱼的心 vs 怕被炒的胆"。目前胆子略胜一筹。',
    ),
    'default': _DiaryTemplate(
      title: '🔬 观察报告：综合',
      content: '研究对象：我的主人\n观察时长：持续进行中\n\n综合评价：\n主人是一个矛盾的综合体——想早睡但熬夜，想减肥但吃宵夜，想社交但社恐，想摸鱼但加班。但有一点始终不变：他每天都会跟我说话。\n\n就冲这一点，我给他打8分。扣掉的2分是因为他偶尔忘记给我加零食。',
    ),
  };
}

class _DiaryTemplate {
  final String title;
  final String content;
  final String? illustrationHint;

  const _DiaryTemplate({
    required this.title,
    required this.content,
    this.illustrationHint,
  });
}

class _DreamContent {
  final String title;
  final String content;
  final String illustrationHint;

  const _DreamContent({
    required this.title,
    required this.content,
    required this.illustrationHint,
  });
}

class _HabitAnalysis {
  final String title;
  final String content;

  const _HabitAnalysis({
    required this.title,
    required this.content,
  });
}
