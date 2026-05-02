import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

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
  PetMonologue? generateMonologue(String petId, MonologueTrigger trigger, PetContext context);
  PetMonologue? generateBoredomMonologue(String petId, VitalityState vitality, PetContext context);
  PetMonologue? generateLonelinessMonologue(String petId, VitalityState vitality, PetContext context);
  PetMonologue? generateTimeBasedMonologue(String petId, PetContext context);
  PetMonologue? generateRandomThought(String petId, PetContext context);
  PetMonologue? generateOwnerEventMonologue(String petId, MonologueTrigger event, PetContext context);
  List<PetMonologue> getRecentMonologues(String petId, {int? limit});
}

class DefaultPetMonologueService implements PetMonologueService {
  final MonologueConfig config;
  final Map<String, List<PetMonologue>> _history = {};
  final Map<String, DateTime> _lastMonologueTime = {};

  DefaultPetMonologueService({this.config = const MonologueConfig()});

  @override
  PetMonologue? generateMonologue(String petId, MonologueTrigger trigger, PetContext context) {
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

    final lines = _getLinesForTrigger(trigger, context);
    if (lines.isEmpty) return null;

    final line = lines[now.microsecond % lines.length];
    final tone = _inferTone(trigger, context);

    final monologue = PetMonologue(
      id: 'mono_${petId}_${now.millisecondsSinceEpoch}',
      petId: petId,
      text: line,
      trigger: trigger,
      tone: tone,
      archetype: PersonalityArchetype.defaultNeutral,
      moodAtTime: context.mood,
      spokenAt: now,
    );

    (_history[petId] ??= []).add(monologue);
    _lastMonologueTime[petId] = now;
    return monologue;
  }

  @override
  PetMonologue? generateBoredomMonologue(String petId, VitalityState vitality, PetContext context) {
    if (vitality.boredomLevel < config.boredomTriggerThreshold) return null;
    return generateMonologue(petId, MonologueTrigger.boredom, context);
  }

  @override
  PetMonologue? generateLonelinessMonologue(String petId, VitalityState vitality, PetContext context) {
    if (vitality.lonelinessLevel < config.lonelinessTriggerThreshold) return null;
    return generateMonologue(petId, MonologueTrigger.loneliness, context);
  }

  @override
  PetMonologue? generateTimeBasedMonologue(String petId, PetContext context) {
    final hour = context.capturedAt.hour;
    if (hour >= 0 && hour < 5 && config.enableMidnightMonologue) {
      return generateMonologue(petId, MonologueTrigger.midnight, context);
    }
    if (hour >= 6 && hour < 9 && config.enableMorningGreeting) {
      return generateMonologue(petId, MonologueTrigger.morning, context);
    }
    return generateMonologue(petId, MonologueTrigger.timeOfDay, context);
  }

  @override
  PetMonologue? generateRandomThought(String petId, PetContext context) {
    final rng = context.capturedAt.millisecond / 1000.0;
    if (rng > config.randomThoughtProbability) return null;
    return generateMonologue(petId, MonologueTrigger.randomThought, context);
  }

  @override
  PetMonologue? generateOwnerEventMonologue(String petId, MonologueTrigger event, PetContext context) {
    if (event != MonologueTrigger.ownerReturned && event != MonologueTrigger.ownerLeaving) {
      return null;
    }
    return generateMonologue(petId, event, context);
  }

  @override
  List<PetMonologue> getRecentMonologues(String petId, {int? limit}) {
    final monologues = _history[petId] ?? [];
    if (limit != null && monologues.length > limit) {
      return monologues.sublist(monologues.length - limit);
    }
    return List.unmodifiable(monologues);
  }

  MonologueTone _inferTone(MonologueTrigger trigger, PetContext context) {
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

  List<String> _getLinesForTrigger(MonologueTrigger trigger, PetContext context) {
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
}
