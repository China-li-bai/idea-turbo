import 'package:flutter_demo/pet/services/ai_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AiService system prompt', () {
    test('contains the persona name', () {
      expect(AiService.systemPrompt, contains('甄悦'));
    });

    test('contains length principle (proportional, not hard cap)', () {
      expect(AiService.systemPrompt, contains('长度'));
      expect(AiService.systemPrompt, isNot(contains('不超过 80 字')));
    });

    test('contains anti-padding rule', () {
      expect(AiService.systemPrompt, contains('不堆叠'));
    });
  });

  group('AiService generation params per mode', () {
    test('No-Think mode matches OpenBMB official recommendation', () {
      final p = AiService.paramsFor(AiReasoningMode.noThink);
      expect(p.temp, 0.7);
      expect(p.topP, 0.95);
      expect(p.topK, 40);
    });

    test('Think mode matches OpenBMB official recommendation', () {
      final p = AiService.paramsFor(AiReasoningMode.think);
      expect(p.temp, 0.9);
      expect(p.topP, 0.95);
      expect(p.topK, 40);
    });

    test('Think mode allows more tokens than No-Think', () {
      final noThink = AiService.paramsFor(AiReasoningMode.noThink);
      final think = AiService.paramsFor(AiReasoningMode.think);
      expect(think.maxTokens, greaterThan(noThink.maxTokens));
    });
  });

  group('legacy API removed', () {
    test('paramsFor replaces static localChatGenerationParams', () {
      expect(AiService.paramsFor(AiReasoningMode.noThink).maxTokens, isNotNull);
    });
  });
}
