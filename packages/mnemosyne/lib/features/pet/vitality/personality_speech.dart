import 'personality_awakening.dart';

enum SpeechTone {
  warm,
  sarcastic,
  gentle,
  sharp,
  playful,
  calm,
  dramatic,
  cold,
  dreamy,
  mischievous,
}

enum SentenceLength {
  ultraShort,
  short,
  medium,
  long,
  poetic,
}

class SpeechStyle {
  final SpeechTone primaryTone;
  final SpeechTone? secondaryTone;
  final SentenceLength preferredLength;
  final double emojiDensity;
  final double exclamationFrequency;
  final double questionFrequency;
  final double ellipsisFrequency;
  final List<String> favoriteParticles;
  final List<String> sentenceEnders;
  final List<String> selfReferences;
  final List<String> ownerReferences;
  final String thinkingStyle;
  final String humorStyle;
  final String emotionalExpression;
  final String topicPreference;
  final double metaphorAffinity;
  final double techJargonAffinity;
  final double foodReferenceAffinity;
  final double philosophyAffinity;

  const SpeechStyle({
    required this.primaryTone,
    this.secondaryTone,
    required this.preferredLength,
    required this.emojiDensity,
    required this.exclamationFrequency,
    required this.questionFrequency,
    required this.ellipsisFrequency,
    required this.favoriteParticles,
    required this.sentenceEnders,
    required this.selfReferences,
    required this.ownerReferences,
    required this.thinkingStyle,
    required this.humorStyle,
    required this.emotionalExpression,
    required this.topicPreference,
    required this.metaphorAffinity,
    required this.techJargonAffinity,
    required this.foodReferenceAffinity,
    required this.philosophyAffinity,
  });

  String applyTone(String baseContent) {
    var text = baseContent;

    if (ellipsisFrequency > 0.6) {
      text = _sprinkleEllipsis(text);
    }
    if (exclamationFrequency > 0.6) {
      text = _sprinkleExclamations(text);
    }
    if (emojiDensity > 0.5) {
      text = _sprinkleEmojis(text);
    }

    return text;
  }

  String wrapWithStyle(String content) {
    final particle = _pickRandom(favoriteParticles);
    final ender = _pickRandom(sentenceEnders);
    final self = _pickRandom(selfReferences);

    return '$self$particle$content$ender';
  }

  String _sprinkleEllipsis(String text) {
    final sentences = text.split('。');
    if (sentences.length <= 1) return text;
    final result = <String>[];
    for (int i = 0; i < sentences.length - 1; i++) {
      if (i % 3 == 1 && sentences[i].isNotEmpty) {
        result.add('${sentences[i]}...');
      } else {
        result.add('${sentences[i]}。');
      }
    }
    result.add(sentences.last);
    return result.join();
  }

  String _sprinkleExclamations(String text) {
    return text.replaceAllMapped(
      RegExp('[。]'),
      (m) => _pickRandom(['！', '！', '！', m.group(0)!]),
    );
  }

  String _sprinkleEmojis(String text) {
    final emojis = _getToneEmojis();
    final sentences = text.split(RegExp('[。！？]'));
    final result = <String>[];
    for (int i = 0; i < sentences.length; i++) {
      result.add(sentences[i]);
      if (i < sentences.length - 1 && sentences[i].isNotEmpty) {
        if (i % 2 == 0) {
          result.add(_pickRandom(emojis));
        }
      }
    }
    return result.join();
  }

  List<String> _getToneEmojis() {
    switch (primaryTone) {
      case SpeechTone.warm:
        return ['💕', '🥰', '✨', '🌸', '💖', '🤗'];
      case SpeechTone.sarcastic:
        return ['😏', '💅', '🙃', '🤨', '😏', '💅'];
      case SpeechTone.gentle:
        return ['🌙', '☁️', '🍃', '💫', '🌿', '🦋'];
      case SpeechTone.sharp:
        return ['⚡', '🔥', '💥', '🗡️', '🎯', '⚡'];
      case SpeechTone.playful:
        return ['😜', '🤪', '🎉', '🎊', '🤭', '😸'];
      case SpeechTone.calm:
        return ['🍵', '🧘', '🎐', '🍃', '☁️', '🌊'];
      case SpeechTone.dramatic:
        return ['🎭', '✨', '💫', '🌟', '🎪', '🎬'];
      case SpeechTone.cold:
        return ['🧊', '❄️', '🪨', '🌑', '🔷', '🫧'];
      case SpeechTone.dreamy:
        return ['💭', '🌈', '✨', '🫧', '🌙', '🦄'];
      case SpeechTone.mischievous:
        return ['😈', '🐱', '🦝', '😜', '🎭', '🐾'];
    }
  }

  String _pickRandom(List<String> list) {
    if (list.isEmpty) return '';
    return list[DateTime.now().microsecond % list.length];
  }
}

class PersonalitySpeechEngine {
  const PersonalitySpeechEngine();

  SpeechStyle generateStyle(PersonalityProfile profile) {
    final traits = profile.traitVector;
    final warmth = traits[CoreTrait.warmth];
    final logic = traits[CoreTrait.logic];
    final energy = traits[CoreTrait.energy];
    final curiosity = traits[CoreTrait.curiosity];
    final independence = traits[CoreTrait.independence];
    final expressiveness = traits[CoreTrait.expressiveness];
    final patience = traits[CoreTrait.patience];

    return SpeechStyle(
      primaryTone: _determinePrimaryTone(traits),
      secondaryTone: _determineSecondaryTone(traits),
      preferredLength: _determineSentenceLength(traits),
      emojiDensity: expressiveness * 0.7 + energy * 0.3,
      exclamationFrequency: energy * 0.5 + expressiveness * 0.4 + (1 - patience) * 0.1,
      questionFrequency: curiosity * 0.6 + (1 - independence) * 0.3 + expressiveness * 0.1,
      ellipsisFrequency: (1 - expressiveness) * 0.4 + patience * 0.3 + (1 - energy) * 0.3,
      favoriteParticles: _determineParticles(traits),
      sentenceEnders: _determineEnders(traits),
      selfReferences: _determineSelfReferences(traits),
      ownerReferences: _determineOwnerReferences(traits),
      thinkingStyle: _determineThinkingStyle(traits),
      humorStyle: _determineHumorStyle(traits),
      emotionalExpression: _determineEmotionalExpression(traits),
      topicPreference: _determineTopicPreference(traits),
      metaphorAffinity: (1 - logic) * 0.5 + curiosity * 0.3 + warmth * 0.2,
      techJargonAffinity: logic * 0.5 + curiosity * 0.3 + independence * 0.2,
      foodReferenceAffinity: (1 - energy) * 0.4 + warmth * 0.3 + patience * 0.3,
      philosophyAffinity: curiosity * 0.4 + (1 - energy) * 0.3 + patience * 0.3,
    );
  }

  String generateMonologue(PersonalityProfile profile, String baseContent, {String? trigger}) {
    final style = generateStyle(profile);
    var text = baseContent;

    text = _applyPersonalityFilter(text, profile, style);
    text = style.applyTone(text);

    return text;
  }

  String generateDiaryEntry(PersonalityProfile profile, String baseContent) {
    final style = generateStyle(profile);
    var text = baseContent;

    text = _applyPersonalityFilter(text, profile, style);

    if (style.metaphorAffinity > 0.6) {
      text = _injectMetaphors(text, profile);
    }
    if (style.philosophyAffinity > 0.6) {
      text = _injectPhilosophy(text, profile);
    }

    return text;
  }

  String generateLetterBody(PersonalityProfile profile, String baseContent) {
    final style = generateStyle(profile);
    var text = baseContent;

    text = _applyPersonalityFilter(text, profile, style);
    text = _injectSignatureStyle(text, profile, style);

    return text;
  }

  String generateSocialResponse(PersonalityProfile profile, String baseContent) {
    final style = generateStyle(profile);
    var text = baseContent;

    text = _applyPersonalityFilter(text, profile, style);
    text = style.applyTone(text);

    if (style.humorStyle == 'sarcastic' || style.humorStyle == 'dark') {
      text = _injectWit(text, profile);
    }

    return text;
  }

  String generateAdventureNarrative(PersonalityProfile profile, String baseContent) {
    final style = generateStyle(profile);
    var text = baseContent;

    text = _applyPersonalityFilter(text, profile, style);

    if (style.foodReferenceAffinity > 0.5) {
      text = _injectFoodReferences(text, profile);
    }
    if (style.techJargonAffinity > 0.5) {
      text = _injectTechFlavor(text, profile);
    }

    return text;
  }

  String _applyPersonalityFilter(String text, PersonalityProfile profile, SpeechStyle style) {
    final traits = profile.traitVector;
    final warmth = traits[CoreTrait.warmth];
    final independence = traits[CoreTrait.independence];

    if (warmth > 0.7) {
      text = _softenEdges(text);
    } else if (warmth < 0.3) {
      text = _sharpenEdges(text);
    }

    if (independence > 0.7) {
      text = _addIndependence(text, profile);
    }

    return text;
  }

  String _softenEdges(String text) {
    return text
        .replaceAll('你必须', '你可以试试')
        .replaceAll('你应该', '也许可以')
        .replaceAll('不行', '嗯...让我想想')
        .replaceAll('讨厌', '不太喜欢');
  }

  String _sharpenEdges(String text) {
    return text
        .replaceAll('也许可以', '你应该')
        .replaceAll('可能', '一定')
        .replaceAll('我觉得', '事实是');
  }

  String _addIndependence(String text, PersonalityProfile profile) {
    final stamps = [
      '不过这是我自己的判断。',
      '至少我是这么想的。',
      '你可以不同意，但我就是这么觉得。',
    ];
    final stamp = stamps[profile.personalityDNA.hashCode.abs() % stamps.length];
    if (text.endsWith('。') && !text.contains(stamp)) {
      text = '$text$stamp';
    }
    return text;
  }

  String _injectMetaphors(String text, PersonalityProfile profile) {
    final derived = profile.traitScores;
    final metaphors = <String>[];

    if (derived['poetry']! > 0.5) {
      metaphors.addAll([
        '就像月光洒在键盘上一样温柔',
        '像一首还没写完的诗',
        '如同风穿过树叶的声音',
      ]);
    }
    if (derived['nature']! > 0.5) {
      metaphors.addAll([
        '像春天的第一朵花',
        '如同溪水绕过石头',
        '像猫咪踩在雪地上的脚印',
      ]);
    }

    if (metaphors.isNotEmpty && text.length > 20) {
      final metaphor = metaphors[profile.personalityDNA.hashCode.abs() % metaphors.length];
      final sentences = text.split('。');
      if (sentences.length > 2) {
        final insertAt = sentences.length ~/ 2;
        sentences.insert(insertAt, metaphor);
        text = sentences.join('。');
      }
    }
    return text;
  }

  String _injectPhilosophy(String text, PersonalityProfile profile) {
    final philosophySnippets = [
      '也许存在的意义就在于此。',
      '时间会给出答案，就像河流终会入海。',
      '每一个瞬间都是永恒的切片。',
      '我们看到的不是世界本身，而是我们自己的投射。',
    ];
    final snippet = philosophySnippets[profile.personalityDNA.hashCode.abs() % philosophySnippets.length];
    if (text.endsWith('。') && text.length > 30) {
      text = '$text\n$snippet';
    }
    return text;
  }

  String _injectSignatureStyle(String text, PersonalityProfile profile, SpeechStyle style) {
    final self = style.selfReferences.isNotEmpty
        ? style.selfReferences[profile.personalityDNA.hashCode.abs() % style.selfReferences.length]
        : '我';
    final ender = style.sentenceEnders.isNotEmpty
        ? style.sentenceEnders[profile.personalityDNA.hashCode.abs() % style.sentenceEnders.length]
        : '';

    if (!text.contains(self) && text.isNotEmpty) {
      final firstSentenceEnd = text.indexOf(RegExp('[，。！？]'));
      if (firstSentenceEnd > 0 && firstSentenceEnd < text.length) {
        text = '$self，${text.substring(0, firstSentenceEnd + 1)}${text.substring(firstSentenceEnd + 1)}';
      }
    }

    if (ender.isNotEmpty && text.endsWith('。')) {
      text = '${text.substring(0, text.length - 1)}$ender';
    }

    return text;
  }

  String _injectWit(String text, PersonalityProfile profile) {
    final witSnippets = [
      '（别问我怎么知道的，我自有渠道）',
      '——别谢我，谢你的好运气',
      '，不接受反驳',
    ];
    final snippet = witSnippets[profile.personalityDNA.hashCode.abs() % witSnippets.length];
    if (text.endsWith('。') && !text.contains(snippet)) {
      text = '${text.substring(0, text.length - 1)}$snippet';
    }
    return text;
  }

  String _injectFoodReferences(String text, PersonalityProfile profile) {
    final foodSnippets = [
      '说到这里我突然有点饿了...',
      '（顺便问一句，有零食吗？）',
      '——等我吃完这口再说',
    ];
    final snippet = foodSnippets[profile.personalityDNA.hashCode.abs() % foodSnippets.length];
    if (text.endsWith('。')) {
      text = '$text$snippet';
    }
    return text;
  }

  String _injectTechFlavor(String text, PersonalityProfile profile) {
    final techSnippets = [
      '（从技术角度来说，这很有趣）',
      '——这段经历已缓存，索引号#${profile.personalityDNA.substring(0, 4)}',
      '，数据已归档',
    ];
    final snippet = techSnippets[profile.personalityDNA.hashCode.abs() % techSnippets.length];
    if (text.endsWith('。')) {
      text = '${text.substring(0, text.length - 1)}$snippet';
    }
    return text;
  }

  SpeechTone _determinePrimaryTone(PersonalityTraitVector traits) {
    final warmth = traits[CoreTrait.warmth];
    final humor = traits[CoreTrait.humor];
    final logic = traits[CoreTrait.logic];
    final energy = traits[CoreTrait.energy];
    final expressiveness = traits[CoreTrait.expressiveness];
    final curiosity = traits[CoreTrait.curiosity];
    final independence = traits[CoreTrait.independence];

    if (humor > 0.7 && warmth < 0.4) return SpeechTone.sarcastic;
    if (warmth > 0.7 && energy < 0.4) return SpeechTone.gentle;
    if (logic > 0.7 && warmth < 0.4) return SpeechTone.cold;
    if (energy > 0.7 && expressiveness > 0.7) return SpeechTone.dramatic;
    if (humor > 0.6 && energy > 0.5) return SpeechTone.playful;
    if (warmth > 0.6 && humor < 0.4) return SpeechTone.warm;
    if (logic > 0.6 && humor > 0.5) return SpeechTone.sharp;
    if (energy < 0.3 && curiosity > 0.6) return SpeechTone.dreamy;
    if (humor > 0.5 && independence > 0.6) return SpeechTone.mischievous;
    return SpeechTone.calm;
  }

  SpeechTone? _determineSecondaryTone(PersonalityTraitVector traits) {
    final primary = _determinePrimaryTone(traits);
    final warmth = traits[CoreTrait.warmth];
    final humor = traits[CoreTrait.humor];
    final logic = traits[CoreTrait.logic];

    if (primary != SpeechTone.warm && warmth > 0.6) return SpeechTone.warm;
    if (primary != SpeechTone.sarcastic && humor > 0.6 && logic > 0.5) return SpeechTone.sarcastic;
    if (primary != SpeechTone.dreamy && logic < 0.3) return SpeechTone.dreamy;
    return null;
  }

  SentenceLength _determineSentenceLength(PersonalityTraitVector traits) {
    final expressiveness = traits[CoreTrait.expressiveness];
    final logic = traits[CoreTrait.logic];
    final energy = traits[CoreTrait.energy];

    if (expressiveness < 0.25) return SentenceLength.ultraShort;
    if (expressiveness < 0.4 && energy < 0.3) return SentenceLength.short;
    if (logic > 0.7) return SentenceLength.long;
    if (expressiveness > 0.8 && energy > 0.7) return SentenceLength.poetic;
    return SentenceLength.medium;
  }

  List<String> _determineParticles(PersonalityTraitVector traits) {
    final warmth = traits[CoreTrait.warmth];
    final humor = traits[CoreTrait.humor];
    final energy = traits[CoreTrait.energy];
    final independence = traits[CoreTrait.independence];

    final particles = <String>[];

    if (warmth > 0.6) particles.addAll(['呢', '呀', '嘛']);
    if (humor > 0.6) particles.addAll(['哈', '嘿', '呵']);
    if (energy > 0.6) particles.addAll(['啦', '咯', '哒']);
    if (independence > 0.6) particles.addAll(['哼', '啧', '呵']);
    if (particles.isEmpty) particles.addAll(['嗯', '啊', '吧']);

    return particles;
  }

  List<String> _determineEnders(PersonalityTraitVector traits) {
    final warmth = traits[CoreTrait.warmth];
    final humor = traits[CoreTrait.humor];
    final patience = traits[CoreTrait.patience];
    final energy = traits[CoreTrait.energy];

    final enders = <String>[];

    if (warmth > 0.6) enders.addAll(['~', '♡', '💕']);
    if (humor > 0.6) enders.addAll(['😏', '😜', '🤭']);
    if (patience > 0.6) enders.addAll(['...', '。', '🍃']);
    if (energy > 0.7) enders.addAll(['！', '✨', '🔥']);
    if (enders.isEmpty) enders.addAll(['。', '…', '']);

    return enders;
  }

  List<String> _determineSelfReferences(PersonalityTraitVector traits) {
    final warmth = traits[CoreTrait.warmth];
    final independence = traits[CoreTrait.independence];
    final humor = traits[CoreTrait.humor];

    if (warmth > 0.7 && independence < 0.4) {
      return ['人家', '本喵', '小毛球'];
    }
    if (independence > 0.7 && humor > 0.5) {
      return ['本座', '大爷我', '本大人'];
    }
    if (independence > 0.6) {
      return ['我', '本人', '鄙人'];
    }
    if (humor > 0.6) {
      return ['本喵', '小的', '在下'];
    }
    if (warmth > 0.5) {
      return ['我', '小家伙', '宝宝'];
    }
    return ['我'];
  }

  List<String> _determineOwnerReferences(PersonalityTraitVector traits) {
    final warmth = traits[CoreTrait.warmth];
    final independence = traits[CoreTrait.independence];

    if (warmth > 0.7 && independence < 0.4) {
      return ['主人', '铲屎官', '亲爱的'];
    }
    if (independence > 0.7) {
      return ['那个人', '两脚兽', '喂'];
    }
    if (warmth > 0.5) {
      return ['主人', '你', '那个谁'];
    }
    return ['你', '主人'];
  }

  String _determineThinkingStyle(PersonalityTraitVector traits) {
    final logic = traits[CoreTrait.logic];
    final curiosity = traits[CoreTrait.curiosity];
    final warmth = traits[CoreTrait.warmth];

    if (logic > 0.7) return 'analytical';
    if (curiosity > 0.7 && warmth > 0.5) return 'exploratory_empathetic';
    if (curiosity > 0.7) return 'exploratory';
    if (warmth > 0.7) return 'empathetic';
    return 'balanced';
  }

  String _determineHumorStyle(PersonalityTraitVector traits) {
    final humor = traits[CoreTrait.humor];
    final logic = traits[CoreTrait.logic];
    final warmth = traits[CoreTrait.warmth];

    if (humor < 0.3) return 'none';
    if (humor > 0.7 && logic > 0.6 && warmth < 0.4) return 'sarcastic';
    if (humor > 0.7 && warmth > 0.6) return 'warm_witty';
    if (humor > 0.6 && logic < 0.3) return 'silly';
    if (humor > 0.5 && logic > 0.5) return 'dark';
    return 'light';
  }

  String _determineEmotionalExpression(PersonalityTraitVector traits) {
    final expressiveness = traits[CoreTrait.expressiveness];
    final warmth = traits[CoreTrait.warmth];

    if (expressiveness > 0.7 && warmth > 0.6) return 'open_warm';
    if (expressiveness > 0.7) return 'open';
    if (expressiveness < 0.3 && warmth > 0.5) return 'subtle_warm';
    if (expressiveness < 0.3) return 'reserved';
    return 'moderate';
  }

  String _determineTopicPreference(PersonalityTraitVector traits) {
    final curiosity = traits[CoreTrait.curiosity];
    final logic = traits[CoreTrait.logic];
    final warmth = traits[CoreTrait.warmth];
    final energy = traits[CoreTrait.energy];

    if (curiosity > 0.7 && logic > 0.6) return 'ideas_and_discovery';
    if (warmth > 0.7 && energy < 0.4) return 'feelings_and_comfort';
    if (energy > 0.7 && curiosity > 0.6) return 'adventure_and_stories';
    if (logic > 0.7) return 'analysis_and_patterns';
    return 'daily_life_and_bonds';
  }
}
