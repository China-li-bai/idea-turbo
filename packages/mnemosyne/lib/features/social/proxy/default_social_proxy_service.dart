import 'social_proxy_service.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/social/safety/prompt_injection_defense.dart';
import 'package:mnemosyne/features/social/safety/social_shield.dart';

class SocialProxyConfig {
  final double minEnergyForProxy;
  final int maxRetrievedMemories;
  final Duration responseTimeout;
  final bool enableAutoBlock;
  final double autoBlockCreepinessThreshold;

  const SocialProxyConfig({
    this.minEnergyForProxy = 0.15,
    this.maxRetrievedMemories = 5,
    this.responseTimeout = const Duration(seconds: 30),
    this.enableAutoBlock = true,
    this.autoBlockCreepinessThreshold = 0.7,
  });
}

abstract class MemoryRetriever {
  Future<List<String>> retrieve(String query, String petId, {int limit = 5});
}

abstract class SocialProxyService {
  Future<ProxyResponse> handleStrangerMessage(
    StrangerMessage message, {
    required PetContext petContext,
    required VitalityState vitality,
    required PersonalityProfile personality,
    required ShieldState shieldState,
  });
}

class DefaultSocialProxyService implements SocialProxyService {
  final SocialProxyConfig config;
  final PromptInjectionDefense _injectionDefense;
  final SocialShield _socialShield;
  final PromptPackager _promptPackager;
  final MemoryRetriever? _memoryRetriever;

  DefaultSocialProxyService({
    this.config = const SocialProxyConfig(),
    PromptInjectionDefense? injectionDefense,
    SocialShield? socialShield,
    PromptPackager? promptPackager,
    MemoryRetriever? memoryRetriever,
  })  : _injectionDefense = injectionDefense ?? DefaultPromptInjectionDefense(),
        _socialShield = socialShield ?? DefaultSocialShield(),
        _promptPackager = promptPackager ?? DefaultPromptPackager(),
        _memoryRetriever = memoryRetriever;

  @override
  Future<ProxyResponse> handleStrangerMessage(
    StrangerMessage message, {
    required PetContext petContext,
    required VitalityState vitality,
    required PersonalityProfile personality,
    required ShieldState shieldState,
  }) async {
    final stopwatch = Stopwatch()..start();

    final securityResult = _injectionDefense.scan(message.content);
    if (securityResult.shouldBlock) {
      return ProxyResponse(
        id: 'proxy_${message.id}',
        strangerMessageId: message.id,
        petId: message.targetPetId,
        content: '检测到不当内容，已自动拦截。',
        type: ProxyResponseType.rejectedDueToSecurity,
        wasBlocked: true,
        blockReason: securityResult.reason,
        processingLatency: stopwatch.elapsed,
        generatedAt: DateTime.now(),
      );
    }

    final shieldDecision = _socialShield.evaluateIncoming(
      shieldState.userId,
      message.senderId,
      matchScore: message.matchScore,
      strangerGender: message.senderGender,
      userGender: shieldState.config.allowSameGenderOnly ? 'user_gender' : null,
      strangerCity: message.senderCity,
      userCity: 'user_city',
      strangerMbti: message.senderMbti,
      message: message.content,
    );

    if (!shieldDecision.allowed) {
      return ProxyResponse(
        id: 'proxy_${message.id}',
        strangerMessageId: message.id,
        petId: message.targetPetId,
        content: shieldDecision.reason ?? '护盾模式已开启',
        type: ProxyResponseType.rejectedDueToShield,
        wasBlocked: true,
        blockReason: shieldDecision.reason,
        processingLatency: stopwatch.elapsed,
        generatedAt: DateTime.now(),
      );
    }

    if (!vitality.canSocialize || vitality.socialEnergy < config.minEnergyForProxy) {
      return ProxyResponse(
        id: 'proxy_${message.id}',
        strangerMessageId: message.id,
        petId: message.targetPetId,
        content: '你的宠物社交能量耗尽了！它跑回家向你撒娇求抱抱~',
        type: ProxyResponseType.rejectedDueToEnergy,
        processingLatency: stopwatch.elapsed,
        generatedAt: DateTime.now(),
      );
    }

    List<String> retrievedMemories = [];
    if (_memoryRetriever != null) {
      retrievedMemories = await _memoryRetriever.retrieve(
        message.content,
        message.targetPetId,
        limit: config.maxRetrievedMemories,
      );
    }

    final promptPackage = _promptPackager.package(
      strangerMessage: message.content,
      retrievedMemories: retrievedMemories,
      petContext: petContext,
      personality: personality,
      vitality: vitality,
    );

    return ProxyResponse(
      id: 'proxy_${message.id}',
      strangerMessageId: message.id,
      petId: message.targetPetId,
      content: promptPackage.fullPrompt,
      type: ProxyResponseType.normalReply,
      wasFiltered: securityResult.shouldWarn,
      processingLatency: stopwatch.elapsed,
      generatedAt: DateTime.now(),
    );
  }
}
