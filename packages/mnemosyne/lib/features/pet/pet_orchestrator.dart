import 'package:mnemosyne/features/memory/extraction/memory_extraction_service.dart';
import 'package:mnemosyne/features/memory/embedding/embedding_service.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/pet_memory_bridge.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/vitality/personality_speech.dart';
import 'package:mnemosyne/features/pet/solo_play/pet_diary_service.dart';
import 'package:mnemosyne/features/pet/solo_play/pet_monologue_service.dart';
import 'package:mnemosyne/features/social/proxy/social_proxy_service.dart';
import 'package:mnemosyne/features/social/proxy/default_social_proxy_service.dart';
import 'package:mnemosyne/features/social/safety/social_shield.dart';
import 'package:mnemosyne/features/social/report/daily_report_service.dart';
import 'package:mnemosyne/features/social/report/daily_report_entity.dart';
import 'package:mnemosyne/features/social/llm/llm_service.dart';
import 'package:mnemosyne/features/commerce/subscription/subscription_service.dart';
import 'package:mnemosyne/features/xiang/xiang_context.dart';
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
  final PersonalitySpeechEngine _speechEngine;
  final PetDiaryService _diaryService;
  final PetMonologueService _monologueService;
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
    PersonalitySpeechEngine? speechEngine,
    PetDiaryService? diaryService,
    PetMonologueService? monologueService,
    SocialProxyService? socialProxyService,
    SocialShield? socialShield,
    DailyReportService? reportService,
    CloudLlmService? cloudLlm,
    SubscriptionService? subscriptionService,
  }) : _mnemosyne = mnemosyne,
       _memoryBridge = memoryBridge,
       _extractionService =
           extractionService ?? DefaultMemoryExtractionService(),
       _embeddingService = embeddingService,
       _vitalityService = vitalityService ?? DefaultVitalityService(),
       _personalityService =
           personalityService ?? DefaultPersonalityAwakeningService(),
       _speechEngine = speechEngine ?? const PersonalitySpeechEngine(),
       _diaryService = diaryService ?? DefaultPetDiaryService(),
       _monologueService = monologueService ?? DefaultPetMonologueService(),
       _socialProxyService = socialProxyService ?? DefaultSocialProxyService(),
       _socialShield = socialShield ?? DefaultSocialShield(),
       _reportService = reportService ?? DefaultDailyReportService(),
       _cloudLlm = cloudLlm,
       _subscriptionService = subscriptionService ?? SubscriptionService();

  Mnemosyne get mnemosyne => _mnemosyne;
  PetMemoryBridge get memoryBridge => _memoryBridge;
  VitalityService get vitalityService => _vitalityService;
  PersonalityAwakeningService get personalityService => _personalityService;
  PersonalitySpeechEngine get speechEngine => _speechEngine;
  PetDiaryService get diaryService => _diaryService;
  PetMonologueService get monologueService => _monologueService;
  SocialShield get socialShield => _socialShield;
  DailyReportService get reportService => _reportService;
  SubscriptionService get subscriptionService => _subscriptionService;

  Future<String> ingestConversation(
    String content, {
    PetContext? petContext,
  }) async {
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
      final summary = insight != null && insight.summary.isNotEmpty
          ? insight.summary
          : content;
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
      innerState: _xiangString(insight?.extra, 'innerState') ?? insight?.mood,
      relationshipState: _xiangString(insight?.extra, 'relationshipState'),
      eventShape: _xiangString(insight?.extra, 'eventShape') ?? insight?.event,
      changeSignal: _xiangString(insight?.extra, 'changeSignal'),
      recallCues: _xiangRecallCues(insight?.extra),
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

  Future<LlmResponse?> generateCloudResponse(
    ProxyResponse proxyResponse,
  ) async {
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

  PersonalityProfile getPersonalityProfile() {
    return _personalityService.getProfile(petId);
  }

  void applyPersonalityTimeDecay(Duration elapsed) {
    _personalityService.applyTimeDecay(petId, elapsed);
  }

  Future<DiaryEntry?> generateDailyDiary(
    PetContext context,
    List<String> recentMemories,
  ) async {
    final personality = config.enablePersonalityTracking
        ? _personalityService.getProfile(petId)
        : null;
    return await _diaryService.generateDailyDiary(
      petId,
      context,
      recentMemories,
      personality: personality,
    );
  }

  Future<DiaryEntry?> generateObservation(
    PetContext context,
    String target,
  ) async {
    final personality = config.enablePersonalityTracking
        ? _personalityService.getProfile(petId)
        : null;
    return await _diaryService.generateObservation(
      petId,
      context,
      target,
      personality: personality,
    );
  }

  PetMonologue? generateMonologue(
    MonologueTrigger trigger,
    PetContext context,
  ) {
    final personality = config.enablePersonalityTracking
        ? _personalityService.getProfile(petId)
        : null;
    return _monologueService.generateMonologue(
      petId,
      trigger,
      context,
      personality: personality,
    );
  }

  PetMonologue? generateBoredomMonologue(PetContext context) {
    final vitality = _vitalityService.getCurrentState(petId);
    final personality = config.enablePersonalityTracking
        ? _personalityService.getProfile(petId)
        : null;
    return _monologueService.generateBoredomMonologue(
      petId,
      vitality,
      context,
      personality: personality,
    );
  }

  PetMonologue? generateTimeBasedMonologue(PetContext context) {
    final personality = config.enablePersonalityTracking
        ? _personalityService.getProfile(petId)
        : null;
    return _monologueService.generateTimeBasedMonologue(
      petId,
      context,
      personality: personality,
    );
  }

  String generatePersonalityResponse(String baseContent) {
    final profile = getPersonalityProfile();
    return _speechEngine.generateMonologue(profile, baseContent);
  }

  VitalityState tickVitality(Duration elapsed) {
    return _vitalityService.tick(petId, elapsed);
  }

  bool shouldWander() => _vitalityService.shouldWander(petId);
  bool shouldStealBone() => _vitalityService.shouldStealBone(petId);
  String getWanderingPushMessage() =>
      _vitalityService.getWanderingPushMessage(petId);
  String getStealBonePushMessage() =>
      _vitalityService.getStealBonePushMessage(petId);

  ShieldState setShieldMode(ShieldConfig shieldConfig) {
    return _socialShield.setMode(userId, shieldConfig);
  }

  Future<DailyReport> generateDailyReport(
    List<SocialInteractionRecord> interactions,
  ) async {
    return await _reportService.generateReport(petId, interactions);
  }

  bool checkFeatureAccess(String feature) {
    return _subscriptionService.checkFeature(userId, feature);
  }

  bool checkMemoryLimit(int currentCount) {
    return _subscriptionService.checkMemoryLimit(userId, currentCount);
  }

  String? _xiangString(Map<String, dynamic>? extra, String key) {
    final xiang = extra?['xiang'];
    if (xiang is! Map) return null;
    final value = xiang[key];
    if (value is String && value.trim().isNotEmpty) return value.trim();
    return null;
  }

  List<SensoryTag>? _xiangRecallCues(Map<String, dynamic>? extra) {
    final xiang = extra?['xiang'];
    if (xiang is! Map) return null;
    final values = xiang['recallCues'];
    if (values is! List) return null;

    final cues = values
        .whereType<Object>()
        .map((value) => value.toString().trim())
        .where((value) => value.isNotEmpty)
        .map((value) => SensoryTag(category: 'recallCue', value: value))
        .toList();

    return cues.isEmpty ? null : cues;
  }
}
