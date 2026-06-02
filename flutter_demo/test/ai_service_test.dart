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
}
