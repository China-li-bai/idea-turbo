import 'dart:developer';

import 'package:llamadart/llamadart.dart';
import 'package:mnemosyne/features/pet/pet_context.dart';
import '../../data/services/memory_service.dart';
import '../domain/pet_action.dart';
import '../domain/vitality_phase.dart';
import 'prompt_builder.dart';
import 'emotional_state.dart';

class AiResponse {
  final String text;
  final List<PetAction> actions;
  final MemoryContext? memoryContext;

  const AiResponse({
    required this.text,
    this.actions = const [],
    this.memoryContext,
  });

  String get displayText {
    if (text.isEmpty && actions.isNotEmpty) {
      return actions.map((a) => a.displayText ?? '').join('');
    }
    return text;
  }
}

class AiService {
  LlamaEngine? _engine;
  String? _modelPath;
  bool _isInitialized = false;
  final List<LlamaChatMessage> _chatHistory = [];

  MemoryService? _memoryService;
  AwakeningContext? _awakeningContext;
  EmotionalState? _emotionalState;
  VitalityPhase _vitalityPhase = VitalityPhase.normal;
  final PromptBuilder _promptBuilder = PromptBuilder();

  bool get isInitialized => _isInitialized;

  void setMemoryService(MemoryService service) {
    _memoryService = service;
  }

  void setAwakeningContext(AwakeningContext context) {
    _awakeningContext = context;
  }

  void setEmotionalState(EmotionalState state) {
    _emotionalState = state;
  }

  void setVitalityPhase(VitalityPhase phase) {
    _vitalityPhase = phase;
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

  Future<AiResponse> generateResponse(
    String userMessage, {
    PetContext? petContext,
    String? moodHint,
  }) async {
    if (!_isInitialized || _engine == null) {
      log('[AiService] 未初始化', name: 'Zhenyue');
      return AiResponse(
        text: '*沉默*',
        actions: [PetAction.silent()],
      );
    }

    try {
      MemoryContext? memoryContext;
      if (_memoryService != null && petContext != null) {
        memoryContext = await _memoryService!.buildContext(
          userMessage: userMessage,
          petContext: petContext,
        );
      }

      final systemPrompt = _promptBuilder.buildSystemPrompt(
        emotionalState: _emotionalState ?? EmotionalState.initial(),
        awakeningContext: _awakeningContext,
        memoryContext: memoryContext,
        vitalityPhase: _vitalityPhase,
      );

      final effectivePrompt = moodHint != null && moodHint.isNotEmpty
          ? '$systemPrompt\n\n[当前状态] $moodHint'
          : systemPrompt;

      final messages = <LlamaChatMessage>[
        LlamaChatMessage.fromText(
          role: LlamaChatRole.system,
          text: effectivePrompt,
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

      final rawOutput = buffer.toString().trim();
      final parsed = ActionParser.parse(rawOutput);

      _chatHistory.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.user,
          text: userMessage,
        ),
      );
      _chatHistory.add(
        LlamaChatMessage.fromText(
          role: LlamaChatRole.assistant,
          text: rawOutput,
        ),
      );

      if (_chatHistory.length > 16) {
        _chatHistory.removeRange(0, _chatHistory.length - 16);
      }

      log('[AiService] 回复成功, 长度: ${rawOutput.length}, 动作: ${parsed.actions.length}',
          name: 'Zhenyue');

      return AiResponse(
        text: parsed.text.isEmpty && parsed.actions.isEmpty
            ? ''
            : parsed.text,
        actions: parsed.actions,
        memoryContext: memoryContext,
      );
    } catch (e, stackTrace) {
      log('[AiService] 错误: $e', name: 'Zhenyue', error: e, stackTrace: stackTrace);
      return const AiResponse(text: '... 我的思绪断了。');
    }
  }

  void dispose() {
    _engine?.dispose();
    _engine = null;
    _isInitialized = false;
  }
}
