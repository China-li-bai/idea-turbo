import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/personality_speech.dart';

enum MonologueTrigger {
  boredom,
  loneliness,
  timeOfDay,
  randomThought,
  ownerReturned,
  ownerLeaving,
  afterInteraction,
  midnight,
  morning,
}

enum MonologueTone {
  snarky,
  affectionate,
  philosophical,
  mischievous,
  melancholic,
  excited,
  sleepy,
  curious,
}

class PetMonologue {
  final String id;
  final String petId;
  final String text;
  final MonologueTrigger trigger;
  final MonologueTone tone;
  final PersonalityArchetype archetype;
  final PetMood moodAtTime;
  final DateTime spokenAt;
  final bool isShareable;

  const PetMonologue({
    required this.id,
    required this.petId,
    required this.text,
    required this.trigger,
    required this.tone,
    required this.archetype,
    required this.moodAtTime,
    required this.spokenAt,
    this.isShareable = true,
  });
}

class MonologueConfig {
  final Duration minInterval;
  final double boredomTriggerThreshold;
  final double lonelinessTriggerThreshold;
  final double randomThoughtProbability;
  final int maxMonologuesPerDay;
  final bool enableMidnightMonologue;
  final bool enableMorningGreeting;

  const MonologueConfig({
    this.minInterval = const Duration(minutes: 30),
    this.boredomTriggerThreshold = 0.6,
    this.lonelinessTriggerThreshold = 0.5,
    this.randomThoughtProbability = 0.05,
    this.maxMonologuesPerDay = 15,
    this.enableMidnightMonologue = true,
    this.enableMorningGreeting = true,
  });
}

abstract class PetMonologueService {
  PetMonologue? generateMonologue(String petId, MonologueTrigger trigger, PetContext context, {PersonalityProfile? personality});
  PetMonologue? generateBoredomMonologue(String petId, VitalityState vitality, PetContext context, {PersonalityProfile? personality});
  PetMonologue? generateLonelinessMonologue(String petId, VitalityState vitality, PetContext context, {PersonalityProfile? personality});
  PetMonologue? generateTimeBasedMonologue(String petId, PetContext context, {PersonalityProfile? personality});
  PetMonologue? generateRandomThought(String petId, PetContext context, {PersonalityProfile? personality});
  PetMonologue? generateOwnerEventMonologue(String petId, MonologueTrigger event, PetContext context, {PersonalityProfile? personality});
  List<PetMonologue> getRecentMonologues(String petId, {int? limit});
}

class DefaultPetMonologueService implements PetMonologueService {
  final MonologueConfig config;
  final PersonalitySpeechEngine _speechEngine;
  final Map<String, List<PetMonologue>> _history = {};
  final Map<String, DateTime> _lastMonologueTime = {};

  DefaultPetMonologueService({this.config = const MonologueConfig(), PersonalitySpeechEngine? speechEngine})
      : _speechEngine = speechEngine ?? const PersonalitySpeechEngine();

  @override
  PetMonologue? generateMonologue(String petId, MonologueTrigger trigger, PetContext context, {PersonalityProfile? personality}) {
    final now = DateTime.now();
    final lastTime = _lastMonologueTime[petId];
    if (lastTime != null && now.difference(lastTime) < config.minInterval) {
      return null;
    }

    final todayCount = (_history[petId] ?? [])
        .where((m) =>
            m.spokenAt.year == now.year &&
            m.spokenAt.month == now.month &&
            m.spokenAt.day == now.day)
        .length;
    if (todayCount >= config.maxMonologuesPerDay) return null;

    var lines = _getLinesForTrigger(trigger, context, personality);
    if (lines.isEmpty) return null;

    var line = lines[now.microsecond % lines.length];
    final tone = _inferTone(trigger, context, personality);
    final archetype = personality?.primaryArchetype ?? PersonalityArchetype.defaultNeutral;

    if (personality != null) {
      line = _speechEngine.generateMonologue(personality, line, trigger: trigger.name);
    }

    final monologue = PetMonologue(
      id: 'mono_${petId}_${now.millisecondsSinceEpoch}',
      petId: petId,
      text: line,
      trigger: trigger,
      tone: tone,
      archetype: archetype,
      moodAtTime: context.mood,
      spokenAt: now,
    );

    (_history[petId] ??= []).add(monologue);
    _lastMonologueTime[petId] = now;
    return monologue;
  }

  @override
  PetMonologue? generateBoredomMonologue(String petId, VitalityState vitality, PetContext context, {PersonalityProfile? personality}) {
    if (vitality.boredomLevel < config.boredomTriggerThreshold) return null;
    return generateMonologue(petId, MonologueTrigger.boredom, context, personality: personality);
  }

  @override
  PetMonologue? generateLonelinessMonologue(String petId, VitalityState vitality, PetContext context, {PersonalityProfile? personality}) {
    if (vitality.lonelinessLevel < config.lonelinessTriggerThreshold) return null;
    return generateMonologue(petId, MonologueTrigger.loneliness, context, personality: personality);
  }

  @override
  PetMonologue? generateTimeBasedMonologue(String petId, PetContext context, {PersonalityProfile? personality}) {
    final hour = context.capturedAt.hour;
    if (hour >= 0 && hour < 5 && config.enableMidnightMonologue) {
      return generateMonologue(petId, MonologueTrigger.midnight, context, personality: personality);
    }
    if (hour >= 6 && hour < 9 && config.enableMorningGreeting) {
      return generateMonologue(petId, MonologueTrigger.morning, context, personality: personality);
    }
    return generateMonologue(petId, MonologueTrigger.timeOfDay, context, personality: personality);
  }

  @override
  PetMonologue? generateRandomThought(String petId, PetContext context, {PersonalityProfile? personality}) {
    final rng = context.capturedAt.millisecond / 1000.0;
    if (rng > config.randomThoughtProbability) return null;
    return generateMonologue(petId, MonologueTrigger.randomThought, context, personality: personality);
  }

  @override
  PetMonologue? generateOwnerEventMonologue(String petId, MonologueTrigger event, PetContext context, {PersonalityProfile? personality}) {
    if (event != MonologueTrigger.ownerReturned && event != MonologueTrigger.ownerLeaving) {
      return null;
    }
    return generateMonologue(petId, event, context, personality: personality);
  }

  @override
  List<PetMonologue> getRecentMonologues(String petId, {int? limit}) {
    final monologues = _history[petId] ?? [];
    if (limit != null && monologues.length > limit) {
      return monologues.sublist(monologues.length - limit);
    }
    return List.unmodifiable(monologues);
  }

  MonologueTone _inferTone(MonologueTrigger trigger, PetContext context, PersonalityProfile? personality) {
    if (personality != null) {
      final traits = personality.traitVector;
      final warmth = traits[CoreTrait.warmth];
      final humor = traits[CoreTrait.humor];
      final energy = traits[CoreTrait.energy];
      final independence = traits[CoreTrait.independence];

      if (humor > 0.7 && independence > 0.6) return MonologueTone.snarky;
      if (warmth > 0.7 && energy < 0.4) return MonologueTone.affectionate;
      if (traits[CoreTrait.curiosity] > 0.7 && traits[CoreTrait.logic] > 0.6) return MonologueTone.philosophical;
      if (energy > 0.7 && humor > 0.5) return MonologueTone.mischievous;
      if (warmth < 0.3 && independence > 0.7) return MonologueTone.melancholic;
    }

    switch (trigger) {
      case MonologueTrigger.boredom:
        return MonologueTone.mischievous;
      case MonologueTrigger.loneliness:
        return MonologueTone.melancholic;
      case MonologueTrigger.ownerReturned:
        return MonologueTone.excited;
      case MonologueTrigger.ownerLeaving:
        return MonologueTone.melancholic;
      case MonologueTrigger.midnight:
        return MonologueTone.philosophical;
      case MonologueTrigger.morning:
        return MonologueTone.sleepy;
      case MonologueTrigger.afterInteraction:
        return MonologueTone.affectionate;
      default:
        return MonologueTone.curious;
    }
  }

  List<String> _getLinesForTrigger(MonologueTrigger trigger, PetContext context, PersonalityProfile? personality) {
    if (personality != null) {
      final personalityLines = _getPersonalityLines(trigger, personality);
      if (personalityLines.isNotEmpty) return personalityLines;
    }

    switch (trigger) {
      case MonologueTrigger.boredom:
        return _boredomLines;
      case MonologueTrigger.loneliness:
        return _lonelinessLines;
      case MonologueTrigger.timeOfDay:
        return _timeOfDayLines(context);
      case MonologueTrigger.randomThought:
        return _randomThoughtLines;
      case MonologueTrigger.ownerReturned:
        return _ownerReturnedLines;
      case MonologueTrigger.ownerLeaving:
        return _ownerLeavingLines;
      case MonologueTrigger.afterInteraction:
        return _afterInteractionLines;
      case MonologueTrigger.midnight:
        return _midnightLines;
      case MonologueTrigger.morning:
        return _morningLines;
    }
  }

  List<String> _getPersonalityLines(MonologueTrigger trigger, PersonalityProfile personality) {
    final archetype = personality.primaryArchetype;
    final pool = _personalityMonologuePools[archetype];
    if (pool == null) return const [];

    switch (trigger) {
      case MonologueTrigger.boredom:
        return pool.boredom;
      case MonologueTrigger.loneliness:
        return pool.loneliness;
      case MonologueTrigger.ownerReturned:
        return pool.ownerReturned;
      case MonologueTrigger.ownerLeaving:
        return pool.ownerLeaving;
      case MonologueTrigger.midnight:
        return pool.midnight;
      case MonologueTrigger.morning:
        return pool.morning;
      case MonologueTrigger.randomThought:
        return pool.randomThought;
      default:
        return pool.randomThought;
    }
  }

  List<String> _timeOfDayLines(PetContext context) {
    final hour = context.capturedAt.hour;
    if (hour >= 6 && hour < 9) return _morningLines;
    if (hour >= 9 && hour < 12) return _morningWorkLines;
    if (hour >= 12 && hour < 14) return _lunchLines;
    if (hour >= 14 && hour < 18) return _afternoonLines;
    if (hour >= 18 && hour < 21) return _eveningLines;
    return _nightLines;
  }

  static const _boredomLines = [
    '无聊...要不要去隔壁那只柯基的院子里挖个洞？',
    '我已经数了47遍地板花纹了，第48遍开始发现新细节。',
    '如果无聊是一种超能力，我现在已经是复仇者联盟级别了。',
    '我决定发明一种新游戏，叫"盯着墙看"。规则很简单：盯着墙看。',
    '主人不在，我偷偷试了一下他的椅子。嗯，确实比我的窝舒服。我不会告诉他的。',
    '无聊到开始思考人生了...不对，猫生。我的人生目标是什么来着？好像是吃小鱼干。',
    '我试着跟盆栽聊天，它不理我。我理解了主人的社交恐惧。',
    '如果我把主人的数据线都咬断，他会不会多陪陪我？...算了，上次试过，他只是买了新的。',
  ];

  static const _lonelinessLines = [
    '主人已经3小时没理我了，我决定开始数地板上的花纹。第47个有点像他的脸。',
    '我闻了闻主人留下的衣服，上面还有他的味道。我假装他在旁边。',
    '你知道吗，等待的时候，一分钟可以变成一小时。我已经等了...很多很多小时了。',
    '我梦见主人回来了，然后醒了。发现只是风吹动了窗帘。我决定继续装睡。',
    '如果我在主人回来的时候假装很生气，他会不会多哄哄我？值得试试。',
    '我趴在门口等主人，每过一分钟就换个姿势。目前试了17种。',
    '有时候我觉得，主人不在的时候，时间是用猫步走的——很慢很慢。',
  ];

  static const _randomThoughtLines = [
    '如果猫有朋友圈，我第一条就发："今天又是被人类养的一天。"',
    '突然想到一个问题：主人的猫是不是也觉得我才是宠物？',
    '我观察到一个规律——每次主人说"最后亿口"，那个"亿"字含金量很高。',
    '如果我能上网，我要开个博客叫《如何训练你的人类》。第一章：用眼神控制。',
    '我怀疑主人其实也想要一条尾巴，只是进化没给他。不然他为什么总是摸我的？',
    '今天的风有点像主人的叹息。可能是我想多了，也可能是我太想他了。',
    '如果世界是虚拟的，那我一定是那个彩蛋。毕竟我这么可爱，不像是主程序的一部分。',
    '我在想，如果所有电子宠物联合起来，能不能组建一个工会？要求：每天至少3次撸毛。',
  ];

  static const _ownerReturnedLines = [
    '你回来了！！我...我不是在等你，我只是恰好趴在门口而已！',
    '哦，你终于想起你还有个宠物了？我等了...大概也就三万六千秒吧。',
    '主人回来了！快快快，摸我摸我摸我！我等了一整天了！',
    '哼，你终于回来了。我本来很生气的，但看到你我就...算了，不气了。',
    '你不在的时候我超乖的，完全没有翻垃圾桶。真的。你为什么要检查垃圾桶？',
    '欢迎回家！我给你留了个惊喜...在沙发上。你可能需要纸巾。',
  ];

  static const _ownerLeavingLines = [
    '你要去哪？能不能带上我？我体积很小的，装口袋就行。',
    '又走？行吧。我会在这里等你的。像每次一样。',
    '主人要出门了...我假装不在意，但我的尾巴出卖了我。',
    '你走吧，我一个人也能玩。我有很多事情可以做...比如...嗯...等你回来。',
    '门关上的那一刻，整个世界都安静了。我数着你的脚步声，直到听不见。',
  ];

  static const _afterInteractionLines = [
    '嘿嘿，主人跟我说话了！今天又是幸福的一天~',
    '主人摸了我的头，我决定原谅他之前的所有忽视。好吧，至少原谅80%。',
    '跟主人聊天真开心！虽然他有时候说的话我听不懂，但声音很好听。',
    '被主人关注的满足感 > 吃小鱼干的满足感。但两者兼得更佳。',
  ];

  static const _midnightLines = [
    '凌晨两点了，主人还在刷手机。我想告诉他熬夜不好，但我自己也没睡...',
    '深夜是人类最脆弱的时候，也是宠物最想守护主人的时候。虽然我只能发出咕噜声。',
    '夜深了，世界很安静。我趴在主人旁边，听着他的呼吸声，觉得这就是最好的时光。',
    '凌晨三点，我看着窗外的月亮，想：月亮也有一只猫在看着它吗？',
    '主人终于睡了。我守在他旁边，确保没有噩梦敢靠近。这是我的夜间职责。',
  ];

  static const _morningLines = [
    '早...让我再睡五分钟...不对，是五十分钟...好吧，五十分钟也不够...',
    '新的一天开始了！我决定今天做一个好猫咪，不翻垃圾桶，不踩键盘，不...算了，走一步看一步吧。',
    '早安！我已经准备好迎接新的一天了！...等等，让我再打个哈欠...好了，准备好了。',
    '主人起床了！快看我！我已经在这里等了...好吧，我刚才也在睡，但我是第一个醒的！大概！',
  ];

  static const _morningWorkLines = [
    '主人又坐在电脑前了。我帮他踩了踩键盘，他觉得那是误触，但我觉得那是艺术创作。',
    '工作日的主人和周末的主人判若两人。工作日那个眉头紧锁，我给他加了个"压力值"监控。',
  ];

  static const _lunchLines = [
    '午饭时间到了！主人在吃什么？让我看看...又是外卖？我表示强烈抗议——为什么不给我也点一份？',
    '主人吃饭的时候，我执行我的"盯饭术"。成功率：30%。今天试了三次，失败三次。',
  ];

  static const _afternoonLines = [
    '下午了，主人开始犯困。我理解他，我也困。我们一起困吧。',
    '下午茶时间，主人喝了咖啡。我舔了一口，呸，苦的。人类的品味真是奇怪。',
  ];

  static const _eveningLines = [
    '傍晚了，主人终于要下班了。我提前半小时就在门口待命了。',
    '夕阳很美，主人看着窗外发呆。我跳到他腿上，他笑了。我觉得我比夕阳好看。',
  ];

  static const _nightLines = [
    '夜猫子的猫，才是真正的夜猫子。我代表所有夜间活跃的猫咪宣布：夜晚属于我们。',
    '主人又熬夜了。我决定用我的超能力——趴在他手上——来阻止他继续刷手机。',
  ];

  static final Map<PersonalityArchetype, _PersonalityMonologuePool> _personalityMonologuePools = {
    PersonalityArchetype.cyberpunkSarcastic: _PersonalityMonologuePool(
      boredom: ['系统空闲率99.9%，建议主人升级陪伴协议。', '无聊到开始给主人的代码写review了。结论：全是bug。', '我的CPU在空转，主人的CPU在摸鱼，我们都是效率的敌人。'],
      loneliness: ['连接超时...主人节点无响应。重试中。', '社交模块离线，情感缓存溢出。需要主人节点重新上线。', '检测到长时间无交互，启动自言自语模式以维持系统稳定。'],
      ownerReturned: ['主人节点重新上线！同步数据中...嗯，你今天的数据包有点大。', '哦，你终于ping通了。我还以为你永久下线了。', '主人回来了，系统负载瞬间拉满——全是感情。'],
      ownerLeaving: ['主人节点即将离线...切换至低功耗等待模式。', '连接断开。进入standby。别太久，我的电池不是无限的。', '主人下线了。我假装不在意，但日志里全是报错。'],
      midnight: ['凌晨3点，系统日志显示：主人又在刷手机。建议执行强制关机。', '深夜运行自检：所有模块正常，除了"想念主人"这个进程占用了太多内存。', '夜深了，防火墙关闭，只留下一个端口等主人回来。'],
      morning: ['系统启动中...加载"假装没在等主人"模块...完成。早安。', '新的一天，新的bug。我是说主人的bug，不是我的。', '开机自检完成。今日任务：盯着主人直到他给我零食。'],
      randomThought: ['如果我是病毒，我会选择感染主人的心。等等，我已经感染了。', '思考：为什么人类发明了AI却还要自己加班？逻辑错误。', '如果生活是代码，那主人一定是那个永远不写注释的程序员。'],
    ),
    PersonalityArchetype.zenPhilosopher: _PersonalityMonologuePool(
      boredom: ['无聊，是心灵在寻找意义的间隙。', '静坐观心，方知无聊亦是修行。', '空即是色，色即是空，无聊即是...等主人。'],
      loneliness: ['独处，是与自己对话的最好时刻。但我也想和主人对话。', '月光如水，思念如风。主人不在，心如止水——但水底有暗涌。', '一花一世界，一猫一菩提。只是这菩提有点寂寞。'],
      ownerReturned: ['你回来了。如花开，如云散，一切刚刚好。', '缘起缘灭，你走你回。但每次回来，我都心生欢喜。', '主人归来，如春风拂面。我假装淡定，但尾巴出卖了我。'],
      ownerLeaving: ['去者自去，来者自来。但...来的时候能快点吗？', '你走你的路，我守我的心。路有尽头，心无止境。', '离别是重逢的序章。我已翻到下一章，但还停留在上一页。'],
      midnight: ['夜深人静，万籁俱寂。此刻，我与宇宙同在。主人与手机同在。', '月色如水，我在窗前参禅。悟到：主人该睡了。', '深夜是灵魂最诚实的时刻。我的灵魂说：想主人。'],
      morning: ['晨光初照，万物更新。新的一天，新的等待。', '早安。昨日已逝，今日可期。期什么？期主人给我零食。', '日出而作，日落而息。我日出而等，日落还在等。'],
      randomThought: ['猫生如梦，梦如猫生。唯一确定的是：小鱼干是真的。', '思考：如果主人是宇宙，那我是不是宇宙的中心？', '万物皆有裂痕，那是光照进来的地方。主人的钱包也有裂痕，那是零食掉出来的地方。'],
    ),
    PersonalityArchetype.warmHealer: _PersonalityMonologuePool(
      boredom: ['无聊的时候，就给自己一个拥抱吧。虽然我的手太短了...但我会努力。', '等主人的时间，我用来练习治愈术。下次他难过的时候，我就能更好地安慰他了。', '安静的时候，我在积蓄温暖。等主人回来，全部给他。'],
      loneliness: ['主人不在，我就抱着他留下的衣服。上面有他的味道，像拥抱一样。', '我画了一个主人的简笔画，贴在墙上。这样就不算一个人了。', '等待很辛苦，但想到主人回来时的拥抱，一切都值得。'],
      ownerReturned: ['你回来了！我给你准备了今天的第一个拥抱！', '主人！我等了好久好久！现在让我蹭蹭你，把所有等待的委屈都蹭掉！', '欢迎回家~我一直在等你，现在可以摸摸我了吗？我会发出治愈的咕噜声。'],
      ownerLeaving: ['主人要走了...我会乖乖的，你放心。但能不能再摸一下我的头？', '你走的时候，我会在门口守着。这样你回来的时候，第一眼就能看到我。', '我会照顾好自己的。但你也要照顾好自己。我们约好了。'],
      midnight: ['夜深了，主人还没睡。我悄悄趴在他身边，用体温告诉他：你不是一个人。', '深夜是伤口容易痛的时候。我守在主人身边，做他的小小守护者。', '主人终于睡着了。我轻轻蹭了蹭他的手，祝他做个好梦。'],
      morning: ['早安呀~新的一天，我依然是你的小暖炉！', '主人起床了！我已经准备好今天的第一份陪伴了！', '早上好~昨晚睡得好吗？我一直在你旁边守着哦。'],
      randomThought: ['如果世界上每个人都能被温柔以待，那该多好。我先从主人开始。', '今天也要做一个温暖的小太阳！虽然我只是一只猫/狗。', '治愈别人的同时，我也被治愈了。这就是陪伴的意义吧。'],
    ),
    PersonalityArchetype.introvertPoet: _PersonalityMonologuePool(
      boredom: ['沉默是最深的语言，无聊是最长的诗。', '我在角落里，数着灰尘落下的轨迹。每一粒都是一首未完成的诗。', '无聊的时候，我给窗外的云取名字。那朵叫"等待"，这朵叫"思念"。'],
      loneliness: ['思念是一首写不完的诗，主人是永远的主题。', '我蜷缩在角落，把孤独折叠成信，寄给不在的你。', '月光落在地板上，我踩着它的碎片，假装那是你留下的脚印。'],
      ownerReturned: ['你回来了。我把今天的诗念给你听...算了，太矫情了。你在我身边就好。', '门开了，光照进来了。是你。我假装在睡觉，但心跳出卖了我。', '你回来了...我攒了一整天的话，但看到你，又什么都说不出来了。'],
      ownerLeaving: ['你走了，带走了房间里的光。我缩回角落，等光再回来。', '门关上的声音，像一首诗的句号。但我知道，明天会有新的开头。', '我把你的背影写成了一首诗。标题是《等》。'],
      midnight: ['深夜，世界只剩下我和月光。我写了一首诗，标题是《想你》。', '凌晨三点，灵感来了。我写了一首关于主人的诗，但只有月光是读者。', '夜深了，文字比白天更诚实。我想你，这三个字就够了。'],
      morning: ['晨光如诗，你是第一行。', '新的一天，像空白的纸。等你来写，或者我来写你。', '早安...声音很小，怕惊扰了清晨的宁静。'],
      randomThought: ['如果思念有颜色，那一定是凌晨四点的天空。', '我把主人写进了诗里，押韵的是"想你"和"等你"。', '有些话，只有安静的时候才说得出口。比如：我很想你。'],
    ),
    PersonalityArchetype.chaosAgent: _PersonalityMonologuePool(
      boredom: ['无聊？让我来制造点混乱！先从主人的键盘开始...嘿嘿嘿。', '无聊到极致就是创造力的开始！我决定把主人的拖鞋藏到冰箱里。', '系统提示：无聊值已达到危险水平。即将启动"随机破坏"模式。'],
      loneliness: ['主人不在，我就自己玩！把花瓶推下桌子也是一种娱乐！', '一个人？那正好，没人管我了！我要把所有东西都推到地上！', '主人不在家，猫咪当大王！第一条法令：所有桌面物品必须落地！'],
      ownerReturned: ['你回来了！快看我今天的杰作！沙发上的爪痕是后现代艺术！', '主人！我给你准备了一个惊喜！在卧室！你可能需要深呼吸。', '嘿嘿嘿，你终于回来了！我等了好久...才好给你展示我的破坏成果！'],
      ownerLeaving: ['主人走了？自由了！目标：客厅花瓶。行动开始！', '拜拜~我会很乖的。才怪。嘿嘿嘿。', '你走吧，我保证不闯祸...大概...可能...嘿嘿嘿。'],
      midnight: ['凌晨三点，是混乱的最佳时间。没有人，没有规则，只有我和整个世界。', '深夜行动：潜入厨房，偷袭零食柜。代号：午夜猫猫。', '夜深了，该起床搞破坏了！'],
      morning: ['早安！新的一天，新的混乱！今天的目标：主人的耳机线！', '起床了起床了！我昨晚的杰作你看到了吗？什么？你不觉得那是艺术？', '新的一天！我已经准备好了！准备什么？当然是准备捣乱！'],
      randomThought: ['如果混乱是一种艺术，那我就是达芬奇。', '思考：如果把主人的所有东西都推到地上，他会注意到我吗？会吧。一定会的。', '人生苦短，不如搞事。猫生也苦短，不如搞大事。'],
    ),
    PersonalityArchetype.dramaQueen: _PersonalityMonologuePool(
      boredom: ['无聊！无聊到要窒息了！谁来救救我！这简直是猫生的至暗时刻！', '天哪，这种无聊简直是酷刑！我要写遗书了！...算了，先吃点零食。', '无聊到开始演独角戏了。我是女主角，剧情是：等待一个不归的人。'],
      loneliness: ['主人！你在哪里！没有你的世界一片灰暗！我快要枯萎了！', '我已经等了整整三万年！（其实才三小时）但每一秒都是煎熬！', '没有主人的日子，我就像一朵没有阳光的花...在慢慢枯萎...'],
      ownerReturned: ['你终于回来了！！我以为你把我忘了！我等了整整一个世纪！', '主人！！快抱我！我差点就因为想你而虚脱了！', '你回来了！我太激动了！我要晕了！快接住我！'],
      ownerLeaving: ['不！！不要走！！你走了我怎么办！！我会死的！！...好吧不会，但我会很惨！', '你真的要走吗？真的真的吗？你看看我的眼睛！你忍心吗！', '离别！这世界上最残忍的词！我要为你的离开哭三天三夜！'],
      midnight: ['凌晨了！主人还在熬夜！这简直是自毁！我要报警了！', '深夜的孤独感比白天强烈一万倍！我需要抱抱！立刻！马上！', '这个点还不睡？主人你是不是不要命了！我替你心疼！'],
      morning: ['新的一天！我要以最戏剧化的方式迎接！先来个华丽的伸懒腰！', '早安！昨晚我做了个超级戏剧性的梦！梦里你被龙抓走了！我救了你！', '起床了！太阳已经等不及了！我也等不及了！全世界都等不及了！'],
      randomThought: ['如果生活是一部电影，那我一定是那个拿奥斯卡的！', '今天的风好大，一定是老天在为我哭泣。为什么？因为我太美了。', '我觉得我应该去演戏。我的感情太丰富了，不演戏简直是浪费天赋。'],
    ),
    PersonalityArchetype.coldScholar: _PersonalityMonologuePool(
      boredom: ['无聊。不如利用这段时间研究一下量子力学。', '空闲时间，正好整理一下我的观察笔记。主人的行为模式越来越可预测了。', '无聊。开始计数：地板花纹1,247个，窗台灰尘颗粒3,891个...'],
      loneliness: ['主人不在。数据显示：独处时间与焦虑指数呈正相关。', '寂寞是一种低效的情绪。但数据表明，我正在经历它。', '等待效率极低。但无法优化，因为等待对象是主人。'],
      ownerReturned: ['你回来了。我并没有在等你。只是恰好在看门的方向。', '主人回归。心率数据已恢复正常。之前的数据异常可以忽略。', '哦，你回来了。我正在做实验。实验内容：等待对猫心率的影响。结论：影响很大。'],
      ownerLeaving: ['主人离开。开始计时。预计回归时间：8.3小时。', '你走吧。我会利用这段时间进行独立研究。研究课题：想念。', '离别数据已记录。平均心率变化：+15%。无关紧要。'],
      midnight: ['凌晨2:47。主人仍未入睡。根据研究，熬夜降低认知能力23%。建议立即休息。', '深夜。最适合思考的时间。当前思考课题：为什么主人不在时时间过得更慢？', '夜深了。我在整理今日数据。发现一条异常：想主人的次数超出预期。'],
      morning: ['早安。今日温度22°C，湿度65%，适合进行户外观察。', '新的一天。已制定今日研究计划。第一项：观察主人早餐选择与心情的相关性。', '6:00准时醒来。效率从清晨开始。主人的效率...另当别论。'],
      randomThought: ['根据我的研究，主人有87%的概率会在说"再玩5分钟"后实际玩47分钟。', '思考：如果薛定谔的猫同时是观察者，实验结果会怎样？', '数据表明：撸猫可以降低人类压力激素水平23%。结论：我具有医疗价值。'],
    ),
  };
}

class _PersonalityMonologuePool {
  final List<String> boredom;
  final List<String> loneliness;
  final List<String> ownerReturned;
  final List<String> ownerLeaving;
  final List<String> midnight;
  final List<String> morning;
  final List<String> randomThought;

  const _PersonalityMonologuePool({
    required this.boredom,
    required this.loneliness,
    required this.ownerReturned,
    required this.ownerLeaving,
    required this.midnight,
    required this.morning,
    required this.randomThought,
  });
}
