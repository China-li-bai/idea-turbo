import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/vitality_service.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import 'package:mnemosyne/features/pet/solo_play/pet_diary_service.dart';
import 'package:mnemosyne/features/pet/solo_play/pet_monologue_service.dart';
import 'package:mnemosyne/features/pet/solo_play/pet_adventure_service.dart';
import 'package:mnemosyne/features/pet/solo_play/pet_letter_service.dart';
import 'package:mnemosyne/features/pet/solo_play/story_beat_service.dart';

class SoloPlayConfig {
  final bool enableDiary;
  final bool enableMonologue;
  final bool enableAdventure;
  final bool enableLetters;
  final bool enableStoryBeats;
  final Duration monologueCheckInterval;
  final Duration diaryCheckInterval;

  const SoloPlayConfig({
    this.enableDiary = true,
    this.enableMonologue = true,
    this.enableAdventure = true,
    this.enableLetters = true,
    this.enableStoryBeats = true,
    this.monologueCheckInterval = const Duration(minutes: 15),
    this.diaryCheckInterval = const Duration(hours: 6),
  });
}

class SoloPlayState {
  final String petId;
  final DateTime lastDiaryTime;
  final DateTime lastMonologueTime;
  final DateTime lastAdventureTime;
  final int totalDiaryEntries;
  final int totalMonologues;
  final int totalAdventures;
  final int totalLetters;
  final int unreadDiaryEntries;
  final int unreadPostcards;
  final int unreadLetters;

  const SoloPlayState({
    required this.petId,
    required this.lastDiaryTime,
    required this.lastMonologueTime,
    required this.lastAdventureTime,
    this.totalDiaryEntries = 0,
    this.totalMonologues = 0,
    this.totalAdventures = 0,
    this.totalLetters = 0,
    this.unreadDiaryEntries = 0,
    this.unreadPostcards = 0,
    this.unreadLetters = 0,
  });

  int get totalUnread => unreadDiaryEntries + unreadPostcards + unreadLetters;

  bool get hasUnreadContent => totalUnread > 0;
}

class SoloPlayOrchestrator {
  final SoloPlayConfig config;
  final PetDiaryService _diaryService;
  final PetMonologueService _monologueService;
  final PetAdventureService _adventureService;
  final PetLetterService _letterService;
  final StoryBeatService _storyBeatService;

  SoloPlayOrchestrator({
    this.config = const SoloPlayConfig(),
    PetDiaryService? diaryService,
    PetMonologueService? monologueService,
    PetAdventureService? adventureService,
    PetLetterService? letterService,
    StoryBeatService? storyBeatService,
  })  : _diaryService = diaryService ?? DefaultPetDiaryService(),
        _monologueService = monologueService ?? DefaultPetMonologueService(),
        _adventureService = adventureService ?? DefaultPetAdventureService(),
        _letterService = letterService ?? DefaultPetLetterService(),
        _storyBeatService = storyBeatService ?? DefaultStoryBeatService();

  PetDiaryService get diary => _diaryService;
  PetMonologueService get monologue => _monologueService;
  PetAdventureService get adventure => _adventureService;
  PetLetterService get letters => _letterService;
  StoryBeatService get storyBeats => _storyBeatService;

  SoloPlayState getState(String petId, String userId) {
    final diaryEntries = _diaryService.getAllEntries(petId);
    final postcards = _adventureService.getPostcards(petId);
    final allLetters = _letterService.getLetters(userId);

    return SoloPlayState(
      petId: petId,
      lastDiaryTime: diaryEntries.isNotEmpty ? diaryEntries.last.writtenAt : DateTime.now(),
      lastMonologueTime: _monologueService.getRecentMonologues(petId).isNotEmpty
          ? _monologueService.getRecentMonologues(petId).last.spokenAt
          : DateTime.now(),
      lastAdventureTime: postcards.isNotEmpty ? postcards.last.sentAt : DateTime.now(),
      totalDiaryEntries: diaryEntries.length,
      totalMonologues: _monologueService.getRecentMonologues(petId).length,
      totalAdventures: postcards.length,
      totalLetters: allLetters.length,
      unreadDiaryEntries: _diaryService.getUnreadEntries(petId).length,
      unreadPostcards: _adventureService.getUnreadPostcards(petId).length,
      unreadLetters: _letterService.getUnreadLetters(userId).length,
    );
  }

  PetMonologue? tickMonologue(String petId, VitalityState vitality, PetContext context, {PersonalityProfile? personality}) {
    if (!config.enableMonologue) return null;

    if (vitality.isBored) {
      return _monologueService.generateBoredomMonologue(petId, vitality, context, personality: personality);
    }
    if (vitality.isLonely) {
      return _monologueService.generateLonelinessMonologue(petId, vitality, context, personality: personality);
    }

    return _monologueService.generateRandomThought(petId, context, personality: personality);
  }

  Future<DiaryEntry?> tickDiary(String petId, PetContext context, List<String> recentMemories, {PersonalityProfile? personality}) async {
    if (!config.enableDiary) return null;
    return await _diaryService.generateDailyDiary(petId, context, recentMemories, personality: personality);
  }

  AdventurePostcard? tickAdventure(String petId, PetContext context, double boredomLevel, {PersonalityProfile? personality}) {
    if (!config.enableAdventure) return null;
    return _adventureService.startAdventure(petId, context, boredomLevel, personality: personality);
  }

  PetMonologue? onOwnerReturned(String petId, PetContext context, {PersonalityProfile? personality}) {
    return _monologueService.generateOwnerEventMonologue(petId, MonologueTrigger.ownerReturned, context, personality: personality);
  }

  PetMonologue? onOwnerLeaving(String petId, PetContext context, {PersonalityProfile? personality}) {
    return _monologueService.generateOwnerEventMonologue(petId, MonologueTrigger.ownerLeaving, context, personality: personality);
  }

  PetMonologue? onAfterInteraction(String petId, PetContext context, {PersonalityProfile? personality}) {
    return _monologueService.generateMonologue(petId, MonologueTrigger.afterInteraction, context, personality: personality);
  }

  PetLetter? onSpecialOccasion(String petId, String userId, LetterOccasion occasion, PetContext context, {PersonalityProfile? personality}) {
    if (!config.enableLetters) return null;
    return _letterService.generateLetter(petId, userId, occasion, context, personality: personality);
  }

  PetLetter? onWeeklyReflection(String petId, String userId, PetContext context, List<String> highlights, {PersonalityProfile? personality}) {
    if (!config.enableLetters) return null;
    return _letterService.generateWeeklyLetter(petId, userId, context, highlights, personality: personality);
  }

  Future<DiaryEntry?> generateDreamRecord(String petId, PetContext context, List<String> recentMemories, {PersonalityProfile? personality}) async {
    if (!config.enableDiary) return null;
    return await _diaryService.generateDreamRecord(petId, context, recentMemories, personality: personality);
  }

  Future<DiaryEntry?> generateHabitAnalysis(String petId, List<String> ownerHabits, {PersonalityProfile? personality}) async {
    if (!config.enableDiary) return null;
    return await _diaryService.generateHabitAnalysis(petId, ownerHabits, personality: personality);
  }

  List<PetMonologue> getRecentMonologues(String petId, {int? limit}) {
    return _monologueService.getRecentMonologues(petId, limit: limit);
  }

  List<DiaryEntry> getUnreadDiaryEntries(String petId) {
    return _diaryService.getUnreadEntries(petId);
  }

  List<AdventurePostcard> getUnreadPostcards(String petId) {
    return _adventureService.getUnreadPostcards(petId);
  }

  List<PetLetter> getUnreadLetters(String userId) {
    return _letterService.getUnreadLetters(userId);
  }

  StoryBeat? checkStoryBeat(String petId, PersonalityProfile profile, PetContext context) {
    if (!config.enableStoryBeats) return null;
    return _storyBeatService.checkTrigger(petId, profile, context);
  }

  StoryBeatResult resolveStoryBeat(String petId, StoryBeat beat, StoryChoice? choice) {
    return _storyBeatService.resolveBeat(petId, beat, choice);
  }

  StoryProgress getStoryProgress(String petId) {
    return _storyBeatService.getProgress(petId);
  }

  List<StoryBeatResult> getStoryHistory(String petId, {int? limit}) {
    return _storyBeatService.getBeatHistory(petId, limit: limit);
  }
}
