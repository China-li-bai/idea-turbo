import 'dart:math';
import 'llm_provider.dart';

class MockLLMProvider extends LLMProvider {
  final String name;
  final Random _random;

  MockLLMProvider({this.name = 'mock-llm', int? seed})
      : _random = Random(seed);

  @override
  LLMProviderType get type => LLMProviderType.mock;

  @override
  String get modelName => name;

  @override
  bool get isAvailable => true;

  @override
  Future<LLMGenerateResult> generate(
    List<LLMMessage> messages, {
    LLMGenerateOptions? options,
  }) async {
    await Future.delayed(Duration(milliseconds: 10 + _random.nextInt(40)));

    final lastUserMsg = messages.lastWhere(
      (m) => m.role == LLMRole.user,
      orElse: () => const LLMMessage(role: LLMRole.user, content: ''),
    );

    final responses = [
      '喵~ 你说"${lastUserMsg.content.substring(0, lastUserMsg.content.length.clamp(0, 20))}"，我听到了！',
      '嗯嗯，让我想想...${lastUserMsg.content.length > 10 ? "这个问题很有意思" : "继续说"}',
      '作为你的AI宠物，我觉得你说得对！',
    ];

    return LLMGenerateResult(
      text: responses[_random.nextInt(responses.length)],
      providerName: modelName,
      providerType: type,
      latency: const Duration(milliseconds: 25),
    );
  }
}
