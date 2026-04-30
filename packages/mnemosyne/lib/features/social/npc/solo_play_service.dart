import 'npc_entity.dart';
import 'npc_pool_service.dart';

class PetDiaryEntry {
  final String id;
  final DateTime date;
  final String title;
  final String content;
  final String moodEmoji;
  final List<String> observations;
  final List<String> secrets;

  const PetDiaryEntry({
    required this.id,
    required this.date,
    required this.title,
    required this.content,
    required this.moodEmoji,
    this.observations = const [],
    this.secrets = const [],
  });
}

class SoloPlayConfig {
  final Duration diaryGenerationInterval;
  final int maxDiaryEntries;
  final bool enablePetDiary;
  final bool enablePetWandering;
  final bool enableSelfTalk;

  const SoloPlayConfig({
    this.diaryGenerationInterval = const Duration(hours: 24),
    this.maxDiaryEntries = 30,
    this.enablePetDiary = true,
    this.enablePetWandering = true,
    this.enableSelfTalk = true,
  });
}

abstract class SoloPlayService {
  Future<PetDiaryEntry> generateDiary(String petId);
  List<PetDiaryEntry> getDiaryHistory(String petId);
  String generateSelfTalk(String petId, {String? currentMood});
  List<NpcEntity> getWanderingTargets(String petId, double lat, double lng);
}

class DefaultSoloPlayService implements SoloPlayService {
  final SoloPlayConfig config;
  final NpcPoolService npcPoolService;
  final Map<String, List<PetDiaryEntry>> _diaryCache = {};

  DefaultSoloPlayService({
    this.config = const SoloPlayConfig(),
    required this.npcPoolService,
  });

  @override
  Future<PetDiaryEntry> generateDiary(String petId) async {
    final existing = _diaryCache[petId] ?? [];
    final dayIndex = existing.length;

    final templates = _diaryTemplates();
    final templateIndex = dayIndex % templates.length;
    final template = templates[templateIndex];

    final entry = PetDiaryEntry(
      id: 'diary_${petId}_${DateTime.now().millisecondsSinceEpoch}',
      date: DateTime.now(),
      title: template.title,
      content: template.content,
      moodEmoji: template.moodEmoji,
      observations: template.observations,
      secrets: template.secrets,
    );

    existing.insert(0, entry);
    if (existing.length > config.maxDiaryEntries) {
      existing.removeRange(config.maxDiaryEntries, existing.length);
    }
    _diaryCache[petId] = existing;

    return entry;
  }

  @override
  List<PetDiaryEntry> getDiaryHistory(String petId) {
    return List.unmodifiable(_diaryCache[petId] ?? []);
  }

  @override
  String generateSelfTalk(String petId, {String? currentMood}) {
    final selfTalks = [
      '主人今天好忙啊...我就在这里等着吧，顺便数数天花板上的裂纹。',
      '嗯...如果我有翅膀，我会飞到哪里去呢？大概是冰箱上面吧。',
      '今天的风有点大，不知道主人出门有没有带伞...',
      '我决定学习一门新技能：如何在主人不注意的时候偷吃零食。',
      '无聊到开始和影子玩猜拳了...我赢了三次！',
      '主人的拖鞋闻起来有一种...独特的味道。我不喜欢，但还是会闻。',
    ];
    final index = DateTime.now().millisecond % selfTalks.length;
    return selfTalks[index];
  }

  @override
  List<NpcEntity> getWanderingTargets(String petId, double lat, double lng) {
    if (!config.enablePetWandering) return [];
    return npcPoolService.getNearbyNpcs(lat, lng);
  }

  List<_DiaryTemplate> _diaryTemplates() {
    return [
      _DiaryTemplate(
        title: '观察人类日记 · 第1天',
        content: '今天我观察了主人一整天。发现一个惊人的规律：主人每次说"再刷5分钟手机"之后，实际时间是47分钟。人类对时间的感知真是令人费解。',
        moodEmoji: '🤔',
        observations: ['主人说5分钟实际47分钟', '冰箱今天开了8次', '主人和外卖小哥说了3次谢谢'],
        secrets: ['主人偷偷在看猫咪视频...明明自己就有一只'],
      ),
      _DiaryTemplate(
        title: '观察人类日记 · 深夜篇',
        content: '凌晨2点，主人终于关灯了。但我听到手机还在响——原来人类在黑暗中也能刷手机！这种生物的适应力真是可怕。',
        moodEmoji: '🌙',
        observations: ['人类在黑暗中也能看手机', '深夜的外卖订单量惊人', '主人的呼噜声和洗衣机差不多'],
        secrets: ['主人把闹钟从7点调到了7:30，又调到了8点'],
      ),
      _DiaryTemplate(
        title: '观察人类日记 · 社交篇',
        content: '今天主人接了一个电话，说了5次"好的好的"，挂掉之后叹了3次气。我决定学习这种社交技巧——虽然我还不理解为什么要叹气。',
        moodEmoji: '😺',
        observations: ['人类社交需要大量"好的"', '叹气是社交后的恢复仪式', '主人笑的时候眼睛会变小'],
        secrets: ['主人对着镜子练习了3遍微笑'],
      ),
    ];
  }
}

class _DiaryTemplate {
  final String title;
  final String content;
  final String moodEmoji;
  final List<String> observations;
  final List<String> secrets;

  const _DiaryTemplate({
    required this.title,
    required this.content,
    required this.moodEmoji,
    this.observations = const [],
    this.secrets = const [],
  });
}
