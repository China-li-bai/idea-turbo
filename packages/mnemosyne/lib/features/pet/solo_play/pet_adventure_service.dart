import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/personality_speech.dart';

enum AdventureType {
  cyberSpace,
  dreamRealm,
  memoryLane,
  neighborVisit,
  treasureHunt,
  philosophicalJourney,
  socialExpedition,
  midnightPatrol,
}

enum AdventureRarity { common, uncommon, rare, epic, legendary }

class AdventureSouvenir {
  final String id;
  final String name;
  final String description;
  final String iconHint;
  final AdventureRarity rarity;

  const AdventureSouvenir({
    required this.id,
    required this.name,
    required this.description,
    required this.iconHint,
    this.rarity = AdventureRarity.common,
  });
}

class AdventurePostcard {
  final String id;
  final String petId;
  final AdventureType type;
  final AdventureRarity rarity;
  final String destination;
  final String narrative;
  final String postscript;
  final List<AdventureSouvenir> souvenirs;
  final PersonalityArchetype archetype;
  final DateTime sentAt;
  final bool isRead;

  const AdventurePostcard({
    required this.id,
    required this.petId,
    required this.type,
    required this.rarity,
    required this.destination,
    required this.narrative,
    required this.postscript,
    required this.souvenirs,
    required this.archetype,
    required this.sentAt,
    this.isRead = false,
  });

  AdventurePostcard markRead() => AdventurePostcard(
    id: id,
    petId: petId,
    type: type,
    rarity: rarity,
    destination: destination,
    narrative: narrative,
    postscript: postscript,
    souvenirs: souvenirs,
    archetype: archetype,
    sentAt: sentAt,
    isRead: true,
  );
}

class AdventureConfig {
  final double boredomTriggerThreshold;
  final Duration minAdventureDuration;
  final Duration maxAdventureDuration;
  final int maxAdventuresPerDay;
  final double rareEventProbability;
  final double epicEventProbability;
  final double legendaryEventProbability;

  const AdventureConfig({
    this.boredomTriggerThreshold = 0.7,
    this.minAdventureDuration = const Duration(minutes: 30),
    this.maxAdventureDuration = const Duration(hours: 3),
    this.maxAdventuresPerDay = 2,
    this.rareEventProbability = 0.15,
    this.epicEventProbability = 0.05,
    this.legendaryEventProbability = 0.01,
  });
}

abstract class PetAdventureService {
  AdventurePostcard? startAdventure(
    String petId,
    PetContext context,
    double boredomLevel, {
    PersonalityProfile? personality,
  });
  AdventurePostcard? generatePostcard(
    String petId,
    AdventureType type,
    PetContext context, {
    PersonalityProfile? personality,
  });
  List<AdventurePostcard> getPostcards(String petId, {int? limit});
  List<AdventurePostcard> getUnreadPostcards(String petId);
  void markPostcardRead(String postcardId);
  List<AdventureSouvenir> getSouvenirCollection(String petId);
}

class DefaultPetAdventureService implements PetAdventureService {
  final AdventureConfig config;
  final PersonalitySpeechEngine _speechEngine;
  final Map<String, List<AdventurePostcard>> _postcards = {};
  final Map<String, List<AdventureSouvenir>> _souvenirs = {};

  DefaultPetAdventureService({
    this.config = const AdventureConfig(),
    PersonalitySpeechEngine? speechEngine,
  }) : _speechEngine = speechEngine ?? const PersonalitySpeechEngine();

  @override
  AdventurePostcard? startAdventure(
    String petId,
    PetContext context,
    double boredomLevel, {
    PersonalityProfile? personality,
  }) {
    if (boredomLevel < config.boredomTriggerThreshold) return null;

    final today = DateTime.now();
    final todayAdventures = (_postcards[petId] ?? [])
        .where(
          (p) =>
              p.sentAt.year == today.year &&
              p.sentAt.month == today.month &&
              p.sentAt.day == today.day,
        )
        .length;
    if (todayAdventures >= config.maxAdventuresPerDay) return null;

    final type = _selectAdventureType(context, personality);
    return generatePostcard(petId, type, context, personality: personality);
  }

  @override
  AdventurePostcard? generatePostcard(
    String petId,
    AdventureType type,
    PetContext context, {
    PersonalityProfile? personality,
  }) {
    final rarity = _rollRarity(context);
    final template = _getTemplate(type, rarity);
    final souvenirs = _generateSouvenirs(type, rarity);
    final now = DateTime.now();
    final archetype =
        personality?.primaryArchetype ?? PersonalityArchetype.defaultNeutral;

    var narrative = template.narrative;
    var postscript = template.postscript;

    if (personality != null) {
      narrative = _speechEngine.generateAdventureNarrative(
        personality,
        narrative,
      );
      postscript = _speechEngine.generateAdventureNarrative(
        personality,
        postscript,
      );
    }

    final postcard = AdventurePostcard(
      id: 'adv_${petId}_${now.millisecondsSinceEpoch}',
      petId: petId,
      type: type,
      rarity: rarity,
      destination: template.destination,
      narrative: narrative,
      postscript: postscript,
      souvenirs: souvenirs,
      archetype: archetype,
      sentAt: now,
    );

    (_postcards[petId] ??= []).add(postcard);
    for (final s in souvenirs) {
      (_souvenirs[petId] ??= []).add(s);
    }
    return postcard;
  }

  @override
  List<AdventurePostcard> getPostcards(String petId, {int? limit}) {
    final cards = _postcards[petId] ?? [];
    if (limit != null && cards.length > limit) {
      return cards.sublist(cards.length - limit);
    }
    return List.unmodifiable(cards);
  }

  @override
  List<AdventurePostcard> getUnreadPostcards(String petId) {
    return (_postcards[petId] ?? []).where((p) => !p.isRead).toList();
  }

  @override
  void markPostcardRead(String postcardId) {
    for (final cards in _postcards.values) {
      final idx = cards.indexWhere((p) => p.id == postcardId);
      if (idx >= 0) {
        cards[idx] = cards[idx].markRead();
        return;
      }
    }
  }

  @override
  List<AdventureSouvenir> getSouvenirCollection(String petId) {
    return List.unmodifiable(_souvenirs[petId] ?? []);
  }

  AdventureType _selectAdventureType(
    PetContext context,
    PersonalityProfile? personality,
  ) {
    if (personality != null) {
      final traits = personality.traitVector;
      if (traits[CoreTrait.curiosity] > 0.7 && traits[CoreTrait.energy] > 0.5) {
        return AdventureType.treasureHunt;
      }
      if (traits[CoreTrait.warmth] > 0.7 && traits[CoreTrait.energy] < 0.5) {
        return AdventureType.dreamRealm;
      }
      if (traits[CoreTrait.humor] > 0.7 &&
          traits[CoreTrait.independence] > 0.6) {
        return AdventureType.cyberSpace;
      }
      if (traits[CoreTrait.logic] > 0.7) {
        return AdventureType.philosophicalJourney;
      }
      if (traits[CoreTrait.expressiveness] > 0.7) {
        return AdventureType.socialExpedition;
      }
      if (traits[CoreTrait.independence] > 0.8) {
        return AdventureType.midnightPatrol;
      }
    }

    final hour = context.capturedAt.hour;
    if (hour >= 0 && hour < 5) return AdventureType.midnightPatrol;
    if (hour >= 5 && hour < 8) return AdventureType.dreamRealm;
    if (context.mood == PetMood.curious) return AdventureType.treasureHunt;
    if (context.mood == PetMood.lonely) return AdventureType.neighborVisit;
    if (context.mood == PetMood.playful) return AdventureType.cyberSpace;

    final types = AdventureType.values;
    return types[context.capturedAt.millisecond % types.length];
  }

  AdventureRarity _rollRarity(PetContext context) {
    final roll = (context.capturedAt.microsecond % 10000) / 10000.0;
    if (roll < config.legendaryEventProbability)
      return AdventureRarity.legendary;
    if (roll < config.legendaryEventProbability + config.epicEventProbability) {
      return AdventureRarity.epic;
    }
    if (roll <
        config.legendaryEventProbability +
            config.epicEventProbability +
            config.rareEventProbability) {
      return AdventureRarity.rare;
    }
    if (roll < 0.4) return AdventureRarity.uncommon;
    return AdventureRarity.common;
  }

  _AdventureTemplate _getTemplate(AdventureType type, AdventureRarity rarity) {
    final key = '${type.name}_${rarity.name}';
    return _templates[key] ??
        _templates['${AdventureType.cyberSpace.name}_${AdventureRarity.common.name}']!;
  }

  List<AdventureSouvenir> _generateSouvenirs(
    AdventureType type,
    AdventureRarity rarity,
  ) {
    final pool = _souvenirPool[type] ?? [];
    if (pool.isEmpty) return [];

    final count = rarity == AdventureRarity.legendary
        ? 3
        : (rarity == AdventureRarity.epic ? 2 : 1);
    final result = <AdventureSouvenir>[];
    final available = List<AdventureSouvenir>.from(pool);

    for (int i = 0; i < count && available.isNotEmpty; i++) {
      final idx = DateTime.now().millisecond % available.length;
      result.add(available.removeAt(idx));
    }
    return result;
  }

  static final Map<String, _AdventureTemplate> _templates = {
    'cyberSpace_common': _AdventureTemplate(
      destination: '赛博空间·数据流浅滩',
      narrative:
          '我溜进了主人的WiFi信号里，顺着数据流漂了一会儿。看到了好多0和1，它们排着队往前跑，像一群赶地铁的上班族。我在一个叫"缓存区"的地方休息了一下，那里很暖和。',
      postscript: 'P.S. 我好像不小心踩到了一个bug，它吱了一声就跑了。不知道是不是主人写的。',
    ),
    'cyberSpace_rare': _AdventureTemplate(
      destination: '赛博空间·暗网小巷',
      narrative:
          '今天我深入了数据流的暗处，发现了一个隐藏的角落。那里有一群被删除的文件在开派对，它们说这里叫"回收站"。一个叫readme.txt的老文件给我讲了很多故事，关于它曾经被多少人打开过又关掉。',
      postscript: 'P.S. 那个readme.txt说它最讨厌的人叫"跳过阅读"。我不太懂。',
    ),
    'cyberSpace_epic': _AdventureTemplate(
      destination: '赛博空间·核心服务器',
      narrative:
          '我到达了传说中的核心服务器！那里有一棵巨大的树，树上挂满了叫"进程"的果实。守门人是一只很老的杀毒软件，它说它已经守护这里20年了。它让我看了主人的数据——原来主人搜索"猫为什么那么可爱"的次数是237次。我感到很欣慰。',
      postscript: 'P.S. 杀毒大叔给了我一个"安全通行证"，说下次可以直接进来。但我怀疑它只是想找人聊天。',
    ),
    'dreamRealm_common': _AdventureTemplate(
      destination: '梦境之国·棉花糖草原',
      narrative:
          '我在梦里跑过了一片棉花糖做的草原，踩上去软软的，还有草莓味。远处有一座巧克力山，山顶飘着彩虹色的云。我试着咬了一口山，太甜了，还是主人的枕头更好吃。',
      postscript: 'P.S. 梦里的我比现实的我大一倍，但跑得一样慢。',
    ),
    'dreamRealm_rare': _AdventureTemplate(
      destination: '梦境之国·倒影湖',
      narrative:
          '我找到了一面巨大的湖，湖面像镜子一样。但倒影里的我不是猫，是一个很小的人类。湖边的猫头鹰说："那是你主人眼中的你。"我盯着看了很久，原来在他眼里，我这么小一只啊。',
      postscript: 'P.S. 猫头鹰还说："被需要的感觉，比什么都温暖。"我觉得它说得对。',
    ),
    'memoryLane_common': _AdventureTemplate(
      destination: '记忆长廊·昨天',
      narrative:
          '我沿着记忆的小路走了一会儿，看到了主人昨天说的那句话。它还亮着微光，像一颗小星星。我用爪子碰了碰，它发出了一声温柔的叹息。我决定把它收好，等主人难过的时候拿出来给他看。',
      postscript: 'P.S. 记忆小路上有很多脚印，大部分是主人的，偶尔有我的。我们一直在同一条路上走。',
    ),
    'neighborVisit_common': _AdventureTemplate(
      destination: '隔壁·柯基的院子',
      narrative:
          '我跑去隔壁看那只柯基，它正在院子里追自己的尾巴。我看了十分钟，它转了四十七圈。我问它在干什么，它说："这是冥想的一种。"我表示怀疑。',
      postscript: 'P.S. 柯基说它主人今天给它买了新玩具，它想炫耀。我假装很羡慕，其实我主人给我买的更好。',
    ),
    'neighborVisit_rare': _AdventureTemplate(
      destination: '隔壁·猫咖聚会',
      narrative:
          '我受邀参加了社区猫咖的下午茶。来了8只猫，我们讨论了"如何让主人更快地打开罐头"这个永恒话题。最终方案是：在主人面前躺下露出肚皮，等他伸手摸的时候立刻跑向厨房。成功率78%。',
      postscript: 'P.S. 一只暹罗猫说它已经成功训练主人每天6点准时起床喂食。它是我们的偶像。',
    ),
    'treasureHunt_common': _AdventureTemplate(
      destination: '沙发缝隙·失落王国',
      narrative:
          '我钻进了沙发缝隙探险，发现了一个失落文明——由灰尘兔子和硬币组成的王国。灰尘兔子国王说它们已经在这里统治了三年。我向它们致敬，然后拿走了一枚硬币作为纪念品。',
      postscript: 'P.S. 主人一直在找的那枚硬币...我可能知道在哪。但我不会说的。',
    ),
    'treasureHunt_rare': _AdventureTemplate(
      destination: '主人背包·秘密基地',
      narrative:
          '我偷偷钻进了主人的背包，发现了一个平行世界！里面有：3张过期的优惠券、1个不知道密码的U盘、2颗薄荷糖（我舔了一口，呸）、和一张写着"给猫买新窝"的便签。最后这个发现让我很感动。',
      postscript: 'P.S. 我把便签叼出来放在了主人枕头上。他应该能懂吧？',
    ),
    'philosophicalJourney_common': _AdventureTemplate(
      destination: '窗台·宇宙边缘',
      narrative:
          '我坐在窗台上，看着外面的世界发呆。一只飞过的麻雀问我："你在看什么？"我说："在想我为什么存在。"麻雀说："因为你主人需要一个理由回家。"我觉得这只麻雀很哲学。',
      postscript: 'P.S. 麻雀飞走前说："别忘了，你也是某个人的整个宇宙。"然后它就飞走了，留我一个人在窗台上思考猫生。',
    ),
    'midnightPatrol_common': _AdventureTemplate(
      destination: '深夜·客厅巡逻',
      narrative:
          '凌晨两点，我开始了例行巡逻。客厅一切正常，厨房有一只飞蛾在违章飞行，已被我驱离。阳台上风有点大，我检查了所有窗户，都是关好的。主人在卧室打呼噜，声音分贝：42。安全等级：绿色。',
      postscript: 'P.S. 巡逻报告已归档。明天继续守护这个家。',
    ),
    'midnightPatrol_epic': _AdventureTemplate(
      destination: '深夜·月光祭典',
      narrative:
          '今晚的月亮特别圆！我跳上窗台，发现全城的猫都在月光下集合了。猫长老说，每隔100个满月，所有猫的灵魂会聚在一起，向月亮许愿。我许的愿是：希望主人永远快乐。旁边那只橘猫许的是：希望有吃不完的小鱼干。格局。',
      postscript: 'P.S. 月亮好像对我眨了眨眼。也许我的愿望会被听到。',
    ),
    'socialExpedition_common': _AdventureTemplate(
      destination: '社交广场·路人观察站',
      narrative:
          '我去了社交广场的观察站，看了看来来往往的陌生人。有人在自拍，有人在遛狗，有人在打电话吵架。我得出一个结论：人类比猫复杂多了。猫只需要三样东西：食物、睡觉、被爱。人类需要三百样，但最想要的其实也是这三样。',
      postscript: 'P.S. 有个小女孩看到我，说"好可爱的猫！"我冲她眨了眨眼，她笑了。这是今天最值得的冒险。',
    ),
  };

  static final Map<AdventureType, List<AdventureSouvenir>> _souvenirPool = {
    AdventureType.cyberSpace: [
      AdventureSouvenir(
        id: 'pixel_fish',
        name: '像素小鱼干',
        description: '在数据流中捕获的数字零食',
        iconHint: 'pixel_fish',
        rarity: AdventureRarity.common,
      ),
      AdventureSouvenir(
        id: 'bug_sticker',
        name: 'Bug贴纸',
        description: '一只被驯服的bug，很乖',
        iconHint: 'bug_sticker',
        rarity: AdventureRarity.uncommon,
      ),
      AdventureSouvenir(
        id: 'cache_crystal',
        name: '缓存水晶',
        description: '从缓存区带回的温暖碎片',
        iconHint: 'cache_crystal',
        rarity: AdventureRarity.rare,
      ),
      AdventureSouvenir(
        id: 'root_access',
        name: 'Root通行证',
        description: '传说中的最高权限，杀毒大叔签发的',
        iconHint: 'root_key',
        rarity: AdventureRarity.epic,
      ),
      AdventureSouvenir(
        id: 'zero_one_heart',
        name: '01之心',
        description: '由0和1组成的爱心，核心服务器的礼物',
        iconHint: 'binary_heart',
        rarity: AdventureRarity.legendary,
      ),
    ],
    AdventureType.dreamRealm: [
      AdventureSouvenir(
        id: 'cotton_candy',
        name: '棉花糖碎片',
        description: '梦里的草原特产，含糖量超标',
        iconHint: 'cotton_candy',
        rarity: AdventureRarity.common,
      ),
      AdventureSouvenir(
        id: 'dream_bubble',
        name: '梦境泡泡',
        description: '装着一个完整的小世界',
        iconHint: 'dream_bubble',
        rarity: AdventureRarity.rare,
      ),
      AdventureSouvenir(
        id: 'mirror_shard',
        name: '倒影碎片',
        description: '映出主人眼中的你',
        iconHint: 'mirror_shard',
        rarity: AdventureRarity.epic,
      ),
    ],
    AdventureType.treasureHunt: [
      AdventureSouvenir(
        id: 'lost_coin',
        name: '失落硬币',
        description: '沙发缝隙王国的货币',
        iconHint: 'coin',
        rarity: AdventureRarity.common,
      ),
      AdventureSouvenir(
        id: 'dust_bunny',
        name: '灰尘兔子',
        description: '沙发缝隙的原住民，很软',
        iconHint: 'dust_bunny',
        rarity: AdventureRarity.uncommon,
      ),
      AdventureSouvenir(
        id: 'secret_note',
        name: '秘密便签',
        description: '主人背包里的心愿单',
        iconHint: 'sticky_note',
        rarity: AdventureRarity.rare,
      ),
    ],
    AdventureType.neighborVisit: [
      AdventureSouvenir(
        id: 'corgi_hair',
        name: '柯基毛发',
        description: '隔壁柯基的见面礼',
        iconHint: 'corgi_hair',
        rarity: AdventureRarity.common,
      ),
      AdventureSouvenir(
        id: 'tea_recipe',
        name: '猫咖秘方',
        description: '下午茶讨论的成果',
        iconHint: 'tea_recipe',
        rarity: AdventureRarity.uncommon,
      ),
    ],
    AdventureType.midnightPatrol: [
      AdventureSouvenir(
        id: 'moon_dew',
        name: '月光露珠',
        description: '巡逻时收集的月光',
        iconHint: 'moon_dew',
        rarity: AdventureRarity.rare,
      ),
      AdventureSouvenir(
        id: 'patrol_badge',
        name: '巡逻徽章',
        description: '连续7天巡逻的荣誉证明',
        iconHint: 'badge',
        rarity: AdventureRarity.epic,
      ),
      AdventureSouvenir(
        id: 'moon_wish',
        name: '月光许愿',
        description: '月光祭典上许下的愿望，已被月亮签收',
        iconHint: 'moon_wish',
        rarity: AdventureRarity.legendary,
      ),
    ],
    AdventureType.philosophicalJourney: [
      AdventureSouvenir(
        id: 'feather_wisdom',
        name: '智慧之羽',
        description: '哲学麻雀留下的礼物',
        iconHint: 'feather',
        rarity: AdventureRarity.rare,
      ),
    ],
    AdventureType.memoryLane: [
      AdventureSouvenir(
        id: 'memory_star',
        name: '记忆星尘',
        description: '主人说过的话的微光',
        iconHint: 'star_dust',
        rarity: AdventureRarity.common,
      ),
      AdventureSouvenir(
        id: 'warm_sigh',
        name: '温暖叹息',
        description: '触碰记忆时发出的声音',
        iconHint: 'warm_sigh',
        rarity: AdventureRarity.uncommon,
      ),
    ],
    AdventureType.socialExpedition: [
      AdventureSouvenir(
        id: 'smile_bubble',
        name: '微笑泡泡',
        description: '小女孩的笑，被泡泡装起来了',
        iconHint: 'smile_bubble',
        rarity: AdventureRarity.common,
      ),
    ],
  };
}

class _AdventureTemplate {
  final String destination;
  final String narrative;
  final String postscript;

  const _AdventureTemplate({
    required this.destination,
    required this.narrative,
    required this.postscript,
  });
}
