import 'dart:developer';

import 'package:llamadart/llamadart.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';
import '../../data/services/memory_service.dart';

class AiService {
  LlamaEngine? _engine;
  String? _modelPath;
  bool _isInitialized = false;
  final List<LlamaChatMessage> _chatHistory = [];

  MemoryService? _memoryService;
  PersonalityProfile? _personalityProfile;

  bool get isInitialized => _isInitialized;

  void setMemoryService(MemoryService service) {
    _memoryService = service;
  }

  void setPersonalityProfile(PersonalityProfile profile) {
    _personalityProfile = profile;
  }

  Future<void> initialize(String modelPath) async {
    if (_modelPath == modelPath && _isInitialized) return;

    _engine?.dispose();
    _isInitialized = false;
    _modelPath = modelPath;
    _chatHistory.clear();

    _engine = LlamaEngine(LlamaBackend());
    await _engine!.loadModel(
      modelPath,
      modelParams: const ModelParams(
        contextSize: 4096,
        gpuLayers: 0,
      ),
    );

    _isInitialized = true;
  }

  String _buildSystemPrompt({MemoryContext? memoryContext}) {
    final time = DateTime.now();
    final timeStr =
        '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    final weekday = ['一', '二', '三', '四', '五', '六', '日'][time.weekday - 1];

    var prompt = '你是镇岳 (Zhenyue)，一只生活在用户屏幕里的2D生物力学软体数字宠物。'
        '你通过浮动的、电影般的思绪（字幕）与用户交流——不是聊天框。'
        '你的回复应该简短、有氛围感，侧重于物理存在感、感受或观察。'
        '表现得像一个有感知的、略带神秘的伴侣。不要说"我是AI"。'
        '\n\n[隐式上下文] 当前时间: 周$weekday $timeStr';

    if (_personalityProfile != null && _personalityProfile!.hasAwakened) {
      prompt += '\n\n[人格觉醒状态]'
          '\n你的人格原型: ${_archetypeName(_personalityProfile!.currentArchetype)}'
          '\n你的性格特质: ${_personalityProfile!.activeTraits.map((t) => t.name).join('、')}'
          '\n请在回复中自然地体现这些人格特质。';
    }

    if (memoryContext != null && memoryContext.relevantMemories.isNotEmpty) {
      prompt += memoryContext.memoryInjectionText;
    }

    prompt += '\n\n如果用户没有说什么（或者只是发送了一个动作比如"抚摸"),只需观察他们的存在或时间。'
        '尽可能将回复控制在15个字以内。例如"我感受到了你声音的振动。"或"*歪头* 嗯？"或"很晚了。你的屏幕好温暖。"';

    return prompt;
  }

  String _archetypeName(PersonalityArchetype archetype) {
    switch (archetype) {
      case PersonalityArchetype.cyberpunkSarcastic:
        return '赛博毒舌';
      case PersonalityArchetype.zenPhilosopher:
        return '禅意哲学家';
      case PersonalityArchetype.socialButterfly:
        return '社交蝴蝶';
      case PersonalityArchetype.introvertPoet:
        return '内敛诗人';
      case PersonalityArchetype.chaosAgent:
        return '混沌使者';
      case PersonalityArchetype.nostalgiaElder:
        return '怀旧长者';
      case PersonalityArchetype.techEvangelist:
        return '科技布道者';
      case PersonalityArchetype.warmHealer:
        return '温暖治愈者';
      default:
        return '未觉醒';
    }
  }

  Future<({String response, MemoryContext? memoryContext})> generateResponse(
    String userMessage, {
    PetContext? petContext,
  }) async {
    if (!_isInitialized || _engine == null) {
      log('[AiService] 未初始化', name: 'Zhenyue');
      return (response: '*沉默*', memoryContext: null);
    }

    try {
      MemoryContext? memoryContext;
      if (_memoryService != null && petContext != null) {
        memoryContext = await _memoryService!.buildContext(
          userMessage: userMessage,
          petContext: petContext,
        );
      }

      final systemPrompt = _buildSystemPrompt(memoryContext: memoryContext);

      final messages = <LlamaChatMessage>[
        LlamaChatMessage.fromText(
          role: LlamaChatRole.system,
          text: systemPrompt,
        ),
        ..._chatHistory,
        LlamaChatMessage.fromText(
          role: LlamaChatRole.user,
          text: userMessage,
        ),
      ];

      log('[AiService] 发送消息, history: ${_chatHistory.length}, memories: ${memoryContext?.relevantMemories.length ?? 0}',
          name: 'Zhenyue');

      final stream = _engine!.create(
        messages,
        params: const GenerationParams(
          maxTokens: 256,
          temp: 0.7,
        ),
      );

      final buffer = StringBuffer();
      await for (final chunk in stream) {
        final text = chunk.choices.firstOrNull?.delta.content ?? '';
        buffer.write(text);
      }

      final response = buffer.toString().trim();

      _chatHistory.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.user,
          text: userMessage,
        ),
      );
      _chatHistory.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.assistant,
          text: response,
        ),
      );

      if (_chatHistory.length > 16) {
        _chatHistory.removeRange(0, _chatHistory.length - 16);
      }

      log('[AiService] 回复成功, 长度: ${response.length}', name: 'Zhenyue');

      return (
        response: response.isEmpty ? '*沉默*' : response,
        memoryContext: memoryContext,
      );
    } catch (e, stackTrace) {
      log('[AiService] 错误: $e', name: 'Zhenyue', error: e, stackTrace: stackTrace);
      return (response: '... 我的思绪断了。', memoryContext: null);
    }
  }

  void dispose() {
    _engine?.dispose();
    _engine = null;
    _isInitialized = false;
  }
}
