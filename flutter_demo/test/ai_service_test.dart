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

  group('AiService warmup', () {
    test('warmup is safe to call on an uninitialized service (returns, no throw)', () async {
      final service = AiService();
      // Should complete without throwing; engine is null so warmup short-circuits.
      await service.warmup();
    });
  });

  group('AiService think-block stripping', () {
    test('removes a complete think block from a final string', () {
      final out = AiService.stripThinkBlocks('<think>reasoning</think>final answer');
      expect(out, 'final answer');
    });

    test('preserves content when no think block present', () {
      const input = 'plain answer';
      expect(AiService.stripThinkBlocks(input), input);
    });

    test('handles streaming delta that is entirely inside a think block', () {
      // First delta: opening tag arrives; we are NOT in think yet, so we strip
      // up to the tag and return empty content for the user.
      final out = AiService.stripThinkBlocksDelta('<think>partial', inThink: false);
      expect(out, '');
    });

    test('emits content after the think block closes in a delta', () {
      // Continuing stream where the close tag is in this chunk.
      final out = AiService.stripThinkBlocksDelta('reasoning</think>visible', inThink: true);
      expect(out, 'visible');
    });
  });
}
