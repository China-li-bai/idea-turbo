import 'package:mnemosyne/features/memory/extraction/memory_extraction_service.dart';
import 'package:mnemosyne/features/memory/embedding/embedding_service.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/pet_memory_bridge.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/social/proxy/social_proxy_service.dart';
import 'package:mnemosyne/features/social/proxy/default_social_proxy_service.dart';
import 'package:mnemosyne/features/social/safety/social_shield.dart';
import 'package:mnemosyne/features/social/report/daily_report_service.dart';
import 'package:mnemosyne/features/social/report/daily_report_entity.dart';
import 'package:mnemosyne/features/social/llm/llm_service.dart';
import 'package:mnemosyne/features/commerce/subscription/subscription_service.dart';
import 'package:mnemosyne/mnemosyne_class.dart';

class PetOrchestratorConfig {
  final Duration vitalityTickInterval;
  final Duration extractionInterval;
  final Duration diaryInterval;
  final bool enableAutoExtraction;
  final bool enableAutoVitalityTick;
  final bool enablePersonalityTracking;

  const PetOrchestratorConfig({
    this.vitalityTickInterval = const Duration(minutes: 1),
    this.extractionInterval = const Duration(minutes: 5),
    this.diaryInterval = const Duration(hours: 24),
    this.enableAutoExtraction = true,
    this.enableAutoVitalityTick = true,
    this.enablePersonalityTracking = true,
  });
}

class PetOrchestrator {
  final PetOrchestratorConfig config;
  final String petId;
  final String userId;

  final Mnemosyne _mnemosyne;
  final PetMemoryBridge _memoryBridge;
  final MemoryExtractionService _extractionService;
  final EmbeddingService? _embeddingService;
  final VitalityService _vitalityService;
  final PersonalityAwakeningService _personalityService;
  final SocialProxyService _socialProxyService;
  final SocialShield _socialShield;
  final DailyReportService _reportService;
  final CloudLlmService? _cloudLlm;
  final SubscriptionService _subscriptionService;

  PetOrchestrator({
    required this.petId,
    required this.userId,
    this.config = const PetOrchestratorConfig(),
    required Mnemosyne mnemosyne,
    required PetMemoryBridge memoryBridge,
    MemoryExtractionService? extractionService,
    EmbeddingService? embeddingService,
    VitalityService? vitalityService,
    PersonalityAwakeningService? personalityService,
    SocialProxyService? socialProxyService,
    SocialShield? socialShield,
    DailyReportService? reportService,
    CloudLlmService? cloudLlm,
    SubscriptionService? subscriptionService,
  })  : _mnemosyne = mnemosyne,
        _memoryBridge = memoryBridge,
        _extractionService = extractionService ?? DefaultMemoryExtractionService(),
        _embeddingService = embeddingService,
        _vitalityService = vitalityService ?? DefaultVitalityService(),
        _personalityService = personalityService ?? DefaultPersonalityAwakeningService(),
        _socialProxyService = socialProxyService ?? DefaultSocialProxyService(),
        _socialShield = socialShield ?? DefaultSocialShield(),
        _reportService = reportService ?? DefaultDailyReportService(),
        _cloudLlm = cloudLlm,
        _subscriptionService = subscriptionService ?? SubscriptionService();

  Mnemosyne get mnemosyne => _mnemosyne;
  PetMemoryBridge get memoryBridge => _memoryBridge;
  VitalityService get vitalityService => _vitalityService;
  PersonalityAwakeningService get personalityService => _personalityService;
  SocialShield get socialShield => _socialShield;
  DailyReportService get reportService => _reportService;
  SubscriptionService get subscriptionService => _subscriptionService;

  Future<String> ingestConversation(String content, {PetContext? petContext}) async {
    petContext ??= PetContext.capture();

    final rawMessage = await _extractionService.ingest(
      content,
      speakerId: userId,
      petId: petId,
      source: 'conversation',
    );

    final insight = await _extractionService.extractInsight(rawMessage);

    List<double>? embedding;
    final embeddingService = _embeddingService;
    if (embeddingService != null) {
      final summary = insight != null && insight.summary.isNotEmpty ? insight.summary : content;
      embedding = await embeddingService.embed(summary);
    }

    final memoryId = await _memoryBridge.rememberInteraction(
      content: content,
      petContext: petContext,
      importance: insight?.importance,
      keywords: insight?.keywords,
      entities: insight?.entities,
      topics: insight?.topics,
      embedding: embedding,
    );

    _vitalityService.onOwnerInteraction(petId);

    if (config.enablePersonalityTracking) {
      _personalityService.feedInteraction(petId, content);
    }

    return memoryId;
  }

  Future<ProxyResponse> handleStrangerMessage(
    StrangerMessage message, {
    PetContext? petContext,
  }) async {
    petContext ??= PetContext.capture();

    final vitality = _vitalityService.getCurrentState(petId);
    final personality = _personalityService.getProfile(petId);
    final shieldState = _socialShield.getState(userId);

    final response = await _socialProxyService.handleStrangerMessage(
      message,
      petContext: petContext,
      vitality: vitality,
      personality: personality,
      shieldState: shieldState,
    );

    if (response.type == ProxyResponseType.normalReply ||
        response.type == ProxyResponseType.wittyRebuttal ||
        response.type == ProxyResponseType.soulMatchIntroduction) {
      _vitalityService.onSocialInteraction(petId, isProxy: true);
    }

    return response;
  }

  Future<LlmResponse?> generateCloudResponse(ProxyResponse proxyResponse) async {
    final cloudLlm = _cloudLlm;
    if (cloudLlm == null) return null;

    final messages = [
      LlmMessage(role: LlmMessage.system, content: '你是一只电子宠物，正在代替主人和陌生人聊天。'),
      LlmMessage(role: LlmMessage.user, content: proxyResponse.content),
    ];

    return await cloudLlm.chat(messages);
  }

  AwakeningResult? checkPersonalityAwakening() {
    return _personalityService.checkAwakening(petId);
  }

  VitalityState tickVitality(Duration elapsed) {
    return _vitalityService.tick(petId, elapsed);
  }

  bool shouldWander() => _vitalityService.shouldWander(petId);
  bool shouldStealBone() => _vitalityService.shouldStealBone(petId);
  String getWanderingPushMessage() => _vitalityService.getWanderingPushMessage(petId);
  String getStealBonePushMessage() => _vitalityService.getStealBonePushMessage(petId);

  ShieldState setShieldMode(ShieldConfig shieldConfig) {
    return _socialShield.setMode(userId, shieldConfig);
  }

  Future<DailyReport> generateDailyReport(List<SocialInteractionRecord> interactions) async {
    return await _reportService.generateReport(petId, interactions);
  }

  bool checkFeatureAccess(String feature) {
    return _subscriptionService.checkFeature(userId, feature);
  }

  bool checkMemoryLimit(int currentCount) {
    return _subscriptionService.checkMemoryLimit(userId, currentCount);
  }
}
