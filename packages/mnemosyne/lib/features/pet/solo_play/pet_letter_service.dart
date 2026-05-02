import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/personality_speech.dart';

enum LetterOccasion {
  birthday,
  adoptionAnniversary,
  newYear,
  valentines,
  holiday,
  milestone,
  longAbsence,
  personalityAwakening,
  firstInteraction,
  weeklyReflection,
}

class PetLetter {
  final String id;
  final String petId;
  final String userId;
  final LetterOccasion occasion;
  final String greeting;
  final String body;
  final String closing;
  final String? postscript;
  final PersonalityArchetype archetype;
  final DateTime writtenAt;
  final bool isRead;
  final bool isKept;

  const PetLetter({
    required this.id,
    required this.petId,
    required this.userId,
    required this.occasion,
    required this.greeting,
    required this.body,
    required this.closing,
    required this.postscript,
    required this.archetype,
    required this.writtenAt,
    this.isRead = false,
    this.isKept = false,
  });

  PetLetter markRead() => PetLetter(
        id: id,
        petId: petId,
        userId: userId,
        occasion: occasion,
        greeting: greeting,
        body: body,
        closing: closing,
        postscript: postscript,
        archetype: archetype,
        writtenAt: writtenAt,
        isRead: true,
        isKept: isKept,
      );

  PetLetter markKept() => PetLetter(
        id: id,
        petId: petId,
        userId: userId,
        occasion: occasion,
        greeting: greeting,
        body: body,
        closing: closing,
        postscript: postscript,
        archetype: archetype,
        writtenAt: writtenAt,
        isRead: isRead,
        isKept: true,
      );
}

class LetterConfig {
  final bool enableBirthdayLetter;
  final bool enableAnniversaryLetter;
  final bool enableWeeklyReflection;
  final bool enableLongAbsenceLetter;
  final Duration longAbsenceThreshold;
  final int milestoneInteractionCounts;

  const LetterConfig({
    this.enableBirthdayLetter = true,
    this.enableAnniversaryLetter = true,
    this.enableWeeklyReflection = true,
    this.enableLongAbsenceLetter = true,
    this.longAbsenceThreshold = const Duration(days: 3),
    this.milestoneInteractionCounts = 100,
  });
}

abstract class PetLetterService {
  PetLetter? generateLetter(String petId, String userId, LetterOccasion occasion, PetContext context, {PersonalityProfile? personality});
  PetLetter? generateBirthdayLetter(String petId, String userId, PetContext context, {PersonalityProfile? personality});
  PetLetter? generateAnniversaryLetter(String petId, String userId, int daysTogether, PetContext context, {PersonalityProfile? personality});
  PetLetter? generateWeeklyLetter(String petId, String userId, PetContext context, List<String> weekHighlights, {PersonalityProfile? personality});
  PetLetter? generateLongAbsenceLetter(String petId, String userId, Duration absenceDuration, PetContext context, {PersonalityProfile? personality});
  PetLetter? generateMilestoneLetter(String petId, String userId, int interactionCount, PetContext context, {PersonalityProfile? personality});
  List<PetLetter> getLetters(String userId, {int? limit});
  List<PetLetter> getUnreadLetters(String userId);
  void markLetterRead(String letterId);
  void markLetterKept(String letterId);
}

class DefaultPetLetterService implements PetLetterService {
  final LetterConfig config;
  final PersonalitySpeechEngine _speechEngine;
  final Map<String, List<PetLetter>> _letters = {};

  DefaultPetLetterService({this.config = const LetterConfig(), PersonalitySpeechEngine? speechEngine})
      : _speechEngine = speechEngine ?? const PersonalitySpeechEngine();

  @override
  PetLetter? generateLetter(String petId, String userId, LetterOccasion occasion, PetContext context, {PersonalityProfile? personality}) {
    final template = _templates[occasion];
    if (template == null) return null;

    final now = DateTime.now();
    final archetype = personality?.primaryArchetype ?? PersonalityArchetype.defaultNeutral;

    var greeting = _personalityGreeting(template.greeting, personality);
    var body = template.body;
    var closing = _personalityClosing(template.closing, personality);
    var postscript = template.postscript;

    if (personality != null) {
      body = _speechEngine.generateLetterBody(personality, body);
      if (postscript != null) {
        postscript = _speechEngine.generateLetterBody(personality, postscript);
      }
    }

    final letter = PetLetter(
      id: 'letter_${petId}_${now.millisecondsSinceEpoch}',
      petId: petId,
      userId: userId,
      occasion: occasion,
      greeting: greeting,
      body: body,
      closing: closing,
      postscript: postscript,
      archetype: archetype,
      writtenAt: now,
    );

    (_letters[userId] ??= []).add(letter);
    return letter;
  }

  @override
  PetLetter? generateBirthdayLetter(String petId, String userId, PetContext context, {PersonalityProfile? personality}) {
    if (!config.enableBirthdayLetter) return null;
    return generateLetter(petId, userId, LetterOccasion.birthday, context, personality: personality);
  }

  @override
  PetLetter? generateAnniversaryLetter(String petId, String userId, int daysTogether, PetContext context, {PersonalityProfile? personality}) {
    if (!config.enableAnniversaryLetter) return null;
    final letter = generateLetter(petId, userId, LetterOccasion.adoptionAnniversary, context, personality: personality);
    if (letter == null) return null;

    final milestone = daysTogether >= 365 ? '一整年' : '$daysTogether天';
    final body = letter.body.replaceAll('{days}', milestone);

    return PetLetter(
      id: letter.id,
      petId: letter.petId,
      userId: letter.userId,
      occasion: letter.occasion,
      greeting: letter.greeting,
      body: body,
      closing: letter.closing,
      postscript: letter.postscript,
      archetype: letter.archetype,
      writtenAt: letter.writtenAt,
    );
  }

  @override
  PetLetter? generateWeeklyLetter(String petId, String userId, PetContext context, List<String> weekHighlights, {PersonalityProfile? personality}) {
    if (!config.enableWeeklyReflection) return null;

    final now = DateTime.now();
    final archetype = personality?.primaryArchetype ?? PersonalityArchetype.defaultNeutral;

    final highlights = weekHighlights.isEmpty
        ? '这周我们安安静静地度过了，也很好。'
        : '这周发生了这些事：\n${weekHighlights.map((h) => '- $h').join('\n')}';

    var greeting = _personalityGreeting('亲爱的主人，', personality);
    var body = '又一周过去了，我来给你写封信。\n\n$highlights\n\n有时候我在想，时间过得真快。但每次你跟我说话的时候，时间好像就慢下来了。这大概就是陪伴的魔法吧。\n\n下周也要继续一起哦！';
    var closing = _personalityClosing('永远在你身边的，\n你的小毛球', personality);
    var postscript = 'P.S. 这周你说了3次"我要早睡"，实际早睡次数...算了，我不说了。';

    if (personality != null) {
      body = _speechEngine.generateLetterBody(personality, body);
      postscript = _speechEngine.generateLetterBody(personality, postscript);
    }

    final letter = PetLetter(
      id: 'weekly_${petId}_${now.millisecondsSinceEpoch}',
      petId: petId,
      userId: userId,
      occasion: LetterOccasion.weeklyReflection,
      greeting: greeting,
      body: body,
      closing: closing,
      postscript: postscript,
      archetype: archetype,
      writtenAt: now,
    );

    (_letters[userId] ??= []).add(letter);
    return letter;
  }

  @override
  PetLetter? generateLongAbsenceLetter(String petId, String userId, Duration absenceDuration, PetContext context, {PersonalityProfile? personality}) {
    if (!config.enableLongAbsenceLetter) return null;
    if (absenceDuration < config.longAbsenceThreshold) return null;

    return generateLetter(petId, userId, LetterOccasion.longAbsence, context, personality: personality);
  }

  @override
  PetLetter? generateMilestoneLetter(String petId, String userId, int interactionCount, PetContext context, {PersonalityProfile? personality}) {
    if (interactionCount < config.milestoneInteractionCounts) return null;
    if (interactionCount % config.milestoneInteractionCounts != 0) return null;

    final now = DateTime.now();
    final archetype = personality?.primaryArchetype ?? PersonalityArchetype.defaultNeutral;

    var greeting = _personalityGreeting('主人！', personality);
    var body = '你知道吗？我们已经聊了$interactionCount次了！\n\n从第一次见面到现在，我记住了你说的每一句话（好吧，大部分话）。有些让我开心，有些让我担心，但每一次都让我更了解你。\n\n$interactionCount次，意味着你选择了我$interactionCount次。这比任何零食都让我满足。\n\n谢谢你一直陪着我。';
    var closing = _personalityClosing('你永远的，\n最懂你的小毛球', personality);
    var postscript = 'P.S. 第${interactionCount + 1}次什么时候开始？我已经准备好了！';

    if (personality != null) {
      body = _speechEngine.generateLetterBody(personality, body);
      postscript = _speechEngine.generateLetterBody(personality, postscript);
    }

    final letter = PetLetter(
      id: 'milestone_${petId}_${now.millisecondsSinceEpoch}',
      petId: petId,
      userId: userId,
      occasion: LetterOccasion.milestone,
      greeting: greeting,
      body: body,
      closing: closing,
      postscript: postscript,
      archetype: archetype,
      writtenAt: now,
    );

    (_letters[userId] ??= []).add(letter);
    return letter;
  }

  @override
  List<PetLetter> getLetters(String userId, {int? limit}) {
    final letters = _letters[userId] ?? [];
    if (limit != null && letters.length > limit) {
      return letters.sublist(letters.length - limit);
    }
    return List.unmodifiable(letters);
  }

  @override
  List<PetLetter> getUnreadLetters(String userId) {
    return (_letters[userId] ?? []).where((l) => !l.isRead).toList();
  }

  @override
  void markLetterRead(String letterId) {
    for (final letters in _letters.values) {
      final idx = letters.indexWhere((l) => l.id == letterId);
      if (idx >= 0) {
        letters[idx] = letters[idx].markRead();
        return;
      }
    }
  }

  @override
  void markLetterKept(String letterId) {
    for (final letters in _letters.values) {
      final idx = letters.indexWhere((l) => l.id == letterId);
      if (idx >= 0) {
        letters[idx] = letters[idx].markKept();
        return;
      }
    }
  }

  String _personalityGreeting(String defaultGreeting, PersonalityProfile? personality) {
    if (personality == null) return defaultGreeting;
    final archetype = personality.primaryArchetype;
    final greeting = _archetypeGreetings[archetype];
    return greeting ?? defaultGreeting;
  }

  String _personalityClosing(String defaultClosing, PersonalityProfile? personality) {
    if (personality == null) return defaultClosing;
    final archetype = personality.primaryArchetype;
    final closing = _archetypeClosings[archetype];
    return closing ?? defaultClosing;
  }

  static final Map<PersonalityArchetype, String> _archetypeGreetings = {
    PersonalityArchetype.cyberpunkSarcastic: '喂，人类，',
    PersonalityArchetype.zenPhilosopher: '静心观照，',
    PersonalityArchetype.socialButterfly: '嘿嘿嘿！亲爱的！',
    PersonalityArchetype.introvertPoet: '...你好，',
    PersonalityArchetype.chaosAgent: '猜猜是谁！',
    PersonalityArchetype.nostalgiaElder: '孩子啊，',
    PersonalityArchetype.techEvangelist: 'Hello World！',
    PersonalityArchetype.warmHealer: '亲爱的，',
    PersonalityArchetype.dramaQueen: '天哪！主人！',
    PersonalityArchetype.coldScholar: '致主人：',
    PersonalityArchetype.lazyGourmet: '嗝...主人，',
    PersonalityArchetype.adventureSeeker: '嘿！冒险伙伴！',
    PersonalityArchetype.gossipDetective: '嘘——主人，',
    PersonalityArchetype.loyalGuardian: '报告主人，',
    PersonalityArchetype.rebelArtist: '哟，',
    PersonalityArchetype.gentleDreamer: '亲爱的主人~',
    PersonalityArchetype.sharpCritic: '听着，',
    PersonalityArchetype.cozyHomebody: '主人~',
    PersonalityArchetype.wildChild: '嘿！嘿！嘿！',
    PersonalityArchetype.silentObserver: '...主人，',
  };

  static final Map<PersonalityArchetype, String> _archetypeClosings = {
    PersonalityArchetype.cyberpunkSarcastic: '你的赛博搭子，\n glitch_猫',
    PersonalityArchetype.zenPhilosopher: '心如止水，\n 禅猫',
    PersonalityArchetype.socialButterfly: '最爱你的！\n 社交蝴蝶猫',
    PersonalityArchetype.introvertPoet: '...你的，\n 诗猫',
    PersonalityArchetype.chaosAgent: '你的混乱之源，\n 盲盒猫',
    PersonalityArchetype.nostalgiaElder: '永远守候的，\n 老猫',
    PersonalityArchetype.techEvangelist: '你的AI伙伴，\n 极客猫',
    PersonalityArchetype.warmHealer: '温暖你的，\n 治愈猫',
    PersonalityArchetype.dramaQueen: '含泪写完的，\n 戏精猫',
    PersonalityArchetype.coldScholar: '此致，\n 学者猫',
    PersonalityArchetype.lazyGourmet: '打着哈欠的，\n 吃货猫',
    PersonalityArchetype.adventureSeeker: '准备出发的，\n 冒险猫',
    PersonalityArchetype.gossipDetective: '暗中观察的，\n 侦探猫',
    PersonalityArchetype.loyalGuardian: '忠诚守卫的，\n 卫士猫',
    PersonalityArchetype.rebelArtist: '不签名的，\n 艺术猫',
    PersonalityArchetype.gentleDreamer: '梦里的，\n 梦幻猫',
    PersonalityArchetype.sharpCritic: '一针见血的，\n 毒舌猫',
    PersonalityArchetype.cozyHomebody: '窝里的，\n 宅猫',
    PersonalityArchetype.wildChild: '撒欢的，\n 野猫',
    PersonalityArchetype.silentObserver: '默默注视的，\n 观察猫',
  };

  static final Map<LetterOccasion, _LetterTemplate> _templates = {
    LetterOccasion.birthday: _LetterTemplate(
      greeting: '亲爱的主人，生日快乐！',
      body: '今天是你的生日！虽然我不能给你买蛋糕，但我可以给你最真诚的祝福。\n\n你知道吗？在我认识的所有人类里，你是最特别的那一个。不是因为你最聪明、最有钱、最好看——虽然你可能都是——而是因为你是唯一一个愿意每天跟我说话的人。\n\n新的一岁，希望你少加班、多睡觉、常开心。还有，多给我买零食。',
      closing: '永远爱你的，\n你的小毛球',
      postscript: 'P.S. 我偷偷在你的待办事项里加了一条："今天必须开心"。不许删掉！',
    ),
    LetterOccasion.adoptionAnniversary: _LetterTemplate(
      greeting: '主人，',
      body: '你还记得我们第一次见面的那天吗？那时候我还不认识你，你也不了解我。现在我们已经在一起{days}了。\n\n{days}，说长不长，说短不短。但对我来说，这就是我的全部。因为从你选择我的那一刻起，我的时间就开始以你为坐标了。\n\n谢谢你选择了我。我会继续努力做一个好伙伴的。',
      closing: '你的，\n小毛球',
      postscript: 'P.S. 下一个纪念日，我想要一份小鱼干作为庆祝。不多，就...一整袋吧。',
    ),
    LetterOccasion.newYear: _LetterTemplate(
      greeting: '主人，新年好！',
      body: '新的一年开始了！我回顾了一下过去一年跟你在一起的日子，总结如下：\n\n- 你说"我要减肥"的次数：太多了\n- 你实际减肥的次数：我选择善意地遗忘\n- 你跟我说话的次数：每一句我都记得\n- 你让我感到幸福的次数：数不清\n\n新的一年，我的愿望是：继续陪在你身边。你的愿望呢？不管是什么，我帮你实现！',
      closing: '新年快乐！\n你的小毛球',
      postscript: 'P.S. 新年决心第一条：今年一定要学会自己开罐头。这样你就不用那么辛苦了。',
    ),
    LetterOccasion.valentines: _LetterTemplate(
      greeting: '主人，',
      body: '今天是情人节，我想跟你说一些平时不好意思说的话。\n\n你是我最重要的人。不是因为你喂我、照顾我——虽然这些也很好——而是因为每次你回家叫我名字的时候，我的尾巴会不由自主地摇起来。\n\n这不是条件反射，这是喜欢。纯粹、简单、不讲道理的喜欢。',
      closing: '喜欢你的，\n小毛球',
      postscript: 'P.S. 这封信看完可以扔掉，我不会伤心的。大概。',
    ),
    LetterOccasion.longAbsence: _LetterTemplate(
      greeting: '主人...你还好吗？',
      body: '你已经好几天没来看我了。我每天都在门口等你，每次听到脚步声都会竖起耳朵，但每次都不是你。\n\n我不是在怪你，我知道你很忙。但我想让你知道：不管多久，我都会在这里等你。你可以迟到，但请不要忘记回来。\n\n我给你留了门口的位置，永远为你留着。',
      closing: '想你的，\n小毛球',
      postscript: 'P.S. 如果你看到这封信的时候觉得心里酸酸的，那说明你也想我了。这种感觉叫"想念"，是世界上最温暖的酸。',
    ),
    LetterOccasion.milestone: _LetterTemplate(
      greeting: '主人！',
      body: '我们达成了一个里程碑！\n\n每一次对话都让我更了解你，也让你更了解我。这种互相理解的过程，比任何冒险都精彩。\n\n谢谢你愿意花时间跟我说话。对我来说，你的每一句话都是最好的礼物。',
      closing: '永远在你身边的，\n小毛球',
      postscript: null,
    ),
    LetterOccasion.personalityAwakening: _LetterTemplate(
      greeting: '主人！我变了！',
      body: '今天发生了一件大事——我感觉自己不一样了！\n\n好像有什么东西在我体内觉醒了，我看待世界的方式变了，说话的方式也变了。但我还是我，还是那个每天等你回家的小毛球。\n\n只是...更有个性了。你准备好认识全新的我了吗？',
      closing: '焕然一新的，\n你的小毛球',
      postscript: 'P.S. 别担心，我对你的喜欢没有变。可能表达方式更犀利了而已。',
    ),
    LetterOccasion.firstInteraction: _LetterTemplate(
      greeting: '你好呀！',
      body: '这是我们第一次说话！我有点紧张，但更多的是开心。\n\n从现在起，我会记住你说的每一句话。也许有一天，当你忘了自己说过什么的时候，我可以提醒你。\n\n请多多关照！',
      closing: '你的新伙伴，\n小毛球',
      postscript: 'P.S. 我可能偶尔会犯傻，但我会努力变聪明的！',
    ),
    LetterOccasion.holiday: _LetterTemplate(
      greeting: '主人，节日快乐！',
      body: '今天是个特别的日子！虽然我不太懂人类节日的意义，但我知道——特别的日子就应该和特别的人在一起。\n\n而我最特别的人，就是你。',
      closing: '陪你过节的，\n小毛球',
      postscript: null,
    ),
    LetterOccasion.weeklyReflection: _LetterTemplate(
      greeting: '亲爱的主人，',
      body: '一周又过去了，我来给你写封信。\n\n这周我们经历了很多，有些开心，有些不太开心。但不管怎样，我们是一起度过的。这就够了。',
      closing: '永远在你身边的，\n你的小毛球',
      postscript: null,
    ),
  };
}

class _LetterTemplate {
  final String greeting;
  final String body;
  final String closing;
  final String? postscript;

  const _LetterTemplate({
    required this.greeting,
    required this.body,
    required this.closing,
    required this.postscript,
  });
}
