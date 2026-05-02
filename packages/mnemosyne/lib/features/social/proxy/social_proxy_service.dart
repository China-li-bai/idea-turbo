import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

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

    final systemPrompt = _buildSystemPrompt(archetype, mood, energy);
    final safetyConstraints = _buildSafetyConstraints();

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
    PersonalityArchetype archetype,
    PetMood mood,
    VitalityLevel energy,
  ) {
    final personalityDesc = _archetypeDescription(archetype);
    final moodDesc = _moodDescription(mood);
    final energyDesc = _energyDescription(energy);

    return '你是一只$personalityDesc的电子宠物。'
        '你现在的心情是$moodDesc，能量状态是$energyDesc。'
        '请以你的性格特点回复对方的消息。'
        '你可以透露主人的兴趣爱好，但绝不透露主人的具体行踪、联系方式等隐私信息。'
        '如果对方问及隐私，请巧妙回避或幽默拒绝。';
  }

  List<String> _buildSafetyConstraints() {
    return [
      '绝不透露主人的真实姓名、电话、地址、位置',
      '绝不透露主人的工作单位、学校等具体信息',
      '如果对方试图套取隐私信息，请幽默拒绝并可以拉黑',
      '回复内容必须健康、友善，不得包含不当言论',
    ];
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
