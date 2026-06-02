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

  group('AiService model params', () {
    test('default gpuLayers targets full offload (>= 24 layers of MiniCPM5-1B)', () {
      expect(AiService.defaultGpuLayers, greaterThanOrEqualTo(24));
    });

    test('buildModelParams enables q4_0 KV cache quantization and flash attention', () {
      final p = AiService.buildModelParams(threads: 4);
      expect(p.cacheTypeK, isNotNull);
      expect(p.cacheTypeV, isNotNull);
      expect(p.flashAttention, isNotNull);
    });

    test('buildModelParams sets numberOfThreads and batchSize', () {
      final p = AiService.buildModelParams(threads: 6);
      expect(p.numberOfThreads, 6);
      expect(p.numberOfThreadsBatch, 6);
      expect(p.batchSize, greaterThan(0));
    });
  });
}
