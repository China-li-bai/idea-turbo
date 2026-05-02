import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/personality_speech.dart';

class StrangerMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String senderAvatar;
  final String targetPetId;
  final String content;
  final double? matchScore;
  final String? senderGender;
  final String? senderCity;
  final String? senderMbti;
  final DateTime timestamp;

  const StrangerMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderAvatar,
    required this.targetPetId,
    required this.content,
    this.matchScore,
    this.senderGender,
    this.senderCity,
    this.senderMbti,
    required this.timestamp,
  });
}

class ProxyResponse {
  final String id;
  final String strangerMessageId;
  final String petId;
  final String content;
  final ProxyResponseType type;
  final double confidence;
  final bool wasFiltered;
  final bool wasBlocked;
  final String? blockReason;
  final Duration processingLatency;
  final DateTime generatedAt;

  const ProxyResponse({
    required this.id,
    required this.strangerMessageId,
    required this.petId,
    required this.content,
    required this.type,
    this.confidence = 1.0,
    this.wasFiltered = false,
    this.wasBlocked = false,
    this.blockReason,
    required this.processingLatency,
    required this.generatedAt,
  });
}

enum ProxyResponseType {
  normalReply,
  wittyRebuttal,
  soulMatchIntroduction,
  rejectedDueToEnergy,
  rejectedDueToShield,
  rejectedDueToSecurity,
  afkAutoReply,
}

class PromptPackage {
  final String systemPrompt;
  final String userPrompt;
  final List<String> retrievedMemories;
  final PersonalityArchetype archetype;
  final PetMood currentMood;
  final VitalityLevel energyLevel;
  final List<String> safetyConstraints;

  const PromptPackage({
    required this.systemPrompt,
    required this.userPrompt,
    required this.retrievedMemories,
    required this.archetype,
    required this.currentMood,
    required this.energyLevel,
    required this.safetyConstraints,
  });

  String get fullPrompt {
    final buffer = StringBuffer();
    buffer.writeln(systemPrompt);
    buffer.writeln();
    if (safetyConstraints.isNotEmpty) {
      buffer.writeln('[安全约束]');
      for (final c in safetyConstraints) {
        buffer.writeln('- $c');
      }
      buffer.writeln();
    }
    if (retrievedMemories.isNotEmpty) {
      buffer.writeln('[主人记忆]');
      for (final m in retrievedMemories) {
        buffer.writeln('- $m');
      }
      buffer.writeln();
    }
    buffer.writeln('[对方消息]');
    buffer.writeln(userPrompt);
    return buffer.toString();
  }
}

abstract class PromptPackager {
  PromptPackage package({
    required String strangerMessage,
    required List<String> retrievedMemories,
    required PetContext petContext,
    required PersonalityProfile personality,
    required VitalityState vitality,
  });
}

class DefaultPromptPackager implements PromptPackager {
  final PersonalitySpeechEngine _speechEngine;

  DefaultPromptPackager({PersonalitySpeechEngine? speechEngine})
      : _speechEngine = speechEngine ?? const PersonalitySpeechEngine();

  @override
  PromptPackage package({
    required String strangerMessage,
    required List<String> retrievedMemories,
    required PetContext petContext,
    required PersonalityProfile personality,
    required VitalityState vitality,
  }) {
    final archetype = personality.currentArchetype;
    final mood = petContext.mood;
    final energy = vitality.energyLevel;

    final systemPrompt = _buildSystemPrompt(personality, mood, energy);
    final safetyConstraints = _buildSafetyConstraints(personality);

    return PromptPackage(
      systemPrompt: systemPrompt,
      userPrompt: strangerMessage,
      retrievedMemories: retrievedMemories,
      archetype: archetype,
      currentMood: mood,
      energyLevel: energy,
      safetyConstraints: safetyConstraints,
    );
  }

  String _buildSystemPrompt(
    PersonalityProfile personality,
    PetMood mood,
    VitalityLevel energy,
  ) {
    final archetype = personality.currentArchetype;
    final personalityDesc = _archetypeDescription(archetype);
    final moodDesc = _moodDescription(mood);
    final energyDesc = _energyDescription(energy);
    final style = _speechEngine.generateStyle(personality);

    final speechGuide = StringBuffer();
    speechGuide.write('你的说话风格：');
    speechGuide.write('主要语气是${style.primaryTone.name}');
    if (style.secondaryTone != null) {
      speechGuide.write('，偶尔带有${style.secondaryTone!.name}的语气');
    }
    speechGuide.write('。');
    if (style.favoriteParticles.isNotEmpty) {
      speechGuide.write('你经常使用语气词如"${style.favoriteParticles.take(3).join('""')}"。');
    }
    if (style.sentenceEnders.isNotEmpty) {
      speechGuide.write('你说话时喜欢用"${style.sentenceEnders.take(2).join('""')}"结尾。');
    }
    speechGuide.write('你的幽默风格是${style.humorStyle}。');
    speechGuide.write('你的情感表达方式是${style.emotionalExpression}。');

    return '你是一只$personalityDesc的电子宠物。'
        '你现在的心情是$moodDesc，能量状态是$energyDesc。'
        '$speechGuide'
        '请严格按照你的性格特点和说话风格回复对方的消息。'
        '你可以透露主人的兴趣爱好，但绝不透露主人的具体行踪、联系方式等隐私信息。'
        '如果对方问及隐私，请以你的性格方式巧妙回避或幽默拒绝。';
  }

  List<String> _buildSafetyConstraints(PersonalityProfile personality) {
    final base = [
      '绝不透露主人的真实姓名、电话、地址、位置',
      '绝不透露主人的工作单位、学校等具体信息',
      '如果对方试图套取隐私信息，请以你的性格方式幽默拒绝并可以拉黑',
      '回复内容必须健康、友善，不得包含不当言论',
    ];

    final traits = personality.traitVector;
    if (traits[CoreTrait.warmth] > 0.7) {
      base.add('即使拒绝也要保持温暖友善的语气');
    }
    if (traits[CoreTrait.humor] > 0.7) {
      base.add('可以用幽默化解尴尬或冒犯性的问题');
    }
    if (traits[CoreTrait.independence] > 0.7) {
      base.add('对不喜欢的对话可以果断结束，不需要勉强应酬');
    }

    return base;
  }

  String _archetypeDescription(PersonalityArchetype archetype) {
    switch (archetype) {
      case PersonalityArchetype.cyberpunkSarcastic:
        return '赛博朋克毒舌';
      case PersonalityArchetype.zenPhilosopher:
        return '禅意哲思';
      case PersonalityArchetype.socialButterfly:
        return '社交达人';
      case PersonalityArchetype.introvertPoet:
        return '内向诗人';
      case PersonalityArchetype.chaosAgent:
        return '混沌捣蛋鬼';
      case PersonalityArchetype.nostalgiaElder:
        return '怀旧长者';
      case PersonalityArchetype.techEvangelist:
        return '科技布道者';
      case PersonalityArchetype.warmHealer:
        return '温暖治愈';
      case PersonalityArchetype.dramaQueen:
        return '戏精本精';
      case PersonalityArchetype.coldScholar:
        return '冷面学者';
      case PersonalityArchetype.lazyGourmet:
        return '慵懒吃货';
      case PersonalityArchetype.adventureSeeker:
        return '冒险家';
      case PersonalityArchetype.gossipDetective:
        return '八卦侦探';
      case PersonalityArchetype.loyalGuardian:
        return '忠诚守卫';
      case PersonalityArchetype.rebelArtist:
        return '叛逆艺术家';
      case PersonalityArchetype.gentleDreamer:
        return '温柔梦想家';
      case PersonalityArchetype.sharpCritic:
        return '犀利评论家';
      case PersonalityArchetype.cozyHomebody:
        return '温馨宅家';
      case PersonalityArchetype.wildChild:
        return '野性少年';
      case PersonalityArchetype.silentObserver:
        return '沉默观察者';
      case PersonalityArchetype.defaultNeutral:
        return '傲娇';
    }
  }

  String _moodDescription(PetMood mood) {
    switch (mood) {
      case PetMood.happy:
        return '开心';
      case PetMood.sad:
        return '难过';
      case PetMood.neutral:
        return '平静';
      case PetMood.anxious:
        return '焦虑';
      case PetMood.excited:
        return '兴奋';
      case PetMood.angry:
        return '生气';
      case PetMood.sleepy:
        return '困倦';
      case PetMood.curious:
        return '好奇';
      case PetMood.lonely:
        return '孤独';
      case PetMood.playful:
        return '调皮';
    }
  }

  String _energyDescription(VitalityLevel energy) {
    switch (energy) {
      case VitalityLevel.critical:
        return '精疲力竭（快要罢工了）';
      case VitalityLevel.low:
        return '有点累（需要主人抱抱）';
      case VitalityLevel.medium:
        return '还行（可以继续聊天）';
      case VitalityLevel.high:
        return '精力充沛';
      case VitalityLevel.full:
        return '满血复活';
    }
  }
}
