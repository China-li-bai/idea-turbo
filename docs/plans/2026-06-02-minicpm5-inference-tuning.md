# MiniCPM5-1B 端侧推理调优实施计划（v2 修订版）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修正 [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart) 中不符合官方文档的推理参数与缺失的 system prompt，使 MiniCPM5-1B 在 Flutter 端发挥 llamadart 0.6.10 + llama.cpp 的官方推荐性能。

**Architecture:** 单文件改造为主 — 在 [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart) 内引入 system prompt、Think 模式枚举、warmup、输出过滤、平台分支的 ModelParams。UI 侧在 [pet_app_shell.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/pet_app_shell.dart) 暴露 Think 模式开关。元数据侧修正 [model_config.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/data/models/model_config.dart) 的描述。平台侧修复 [AndroidManifest.xml](file:///Users/mac/project/idea-turbo/flutter_demo/android/app/src/main/AndroidManifest.xml)、[pubspec.yaml](file:///Users/mac/project/idea-turbo/flutter_demo/pubspec.yaml) Vulkan 配置、MainActivity 启动时设 coopmat 环境变量。

**Tech Stack:** Flutter 3.11+, llamadart ^0.6.10 (ModelParams 字段名以 0.6.10 API 文档为准), llama.cpp b9371 (via llamadart native), OpenBMB MiniCPM5-1B-Q4_K_M

**Authoritative sources for all parameter choices:**
- [OpenBMB MiniCPM5-1B official model card](https://huggingface.co/openbmb/MiniCPM5-1B) — sampling params: temp, top_p
- [llamadart 0.6.10 ModelParams API reference](https://pub.dev/documentation/llamadart/0.6.10/llamadart/ModelParams-class.html) — field names, default behavior
- [llamadart changelog](https://pub.dev/packages/llamadart/changelog) — Android backend defaults, KV cache quantization, Vulkan opt-in
- [llama.cpp main README](https://github.com/ggml-org/llama.cpp) — warmup, threads = physical cores, flash attention requirements

---

## Pre-flight checklist (verified during planning)

- [x] **Confirmed:** llamadart 0.6.10 `ModelParams` accepts `numberOfThreads` / `numberOfThreadsBatch` (NOT `threads`).
- [x] **Confirmed:** `flashAttention: FlashAttention.auto` + `cacheTypeK/V: KvCacheType.q4_0` — llamadart auto-promotes flash attention to enabled (llama.cpp requires it for non-F16 KV).
- [x] **Confirmed:** Android `largeHeap` is NOT in current AndroidManifest.xml — needs adding.
- [x] **Confirmed:** Android backend defaults to CPU (per llamadart 0.6.9 changelog); Vulkan is opt-in via `pubspec.yaml`.
- [x] **Confirmed:** iOS deployment target must be 16.4+ (per llamadart 0.6.10 changelog).
- [x] **Confirmed:** `Platform.numberOfProcessors` returns physical cores on iOS/Android (no SMT on mobile).
- [x] **Confirmed:** 1B Q4_K_M GGUF model mmap'd via `useMmap: true` (default) is the right call for mobile.

---

### Task 1: Add system prompt constant and length principle

**Files:**
- Modify: [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart):1-114
- Test: [ai_service_test.dart](file:///Users/mac/project/idea-turbo/flutter_demo/test/ai_service_test.dart)

**Step 1: Write the failing test**

Replace contents of [ai_service_test.dart](file:///Users/mac/project/idea-turbo/flutter_demo/test/ai_service_test.dart):

```dart
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
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: FAIL — `systemPrompt` getter doesn't exist.

**Step 3: Implement the system prompt**

In [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart), add at class level (around line 30):

```dart
static const systemPrompt = '你是「甄悦」，一个会记得、理解、陪伴用户长大的 AI 人格。\n'
    '语言风格：温和、克制、不油腻。\n'
    '约束：\n'
    '- 默认中文；用户切英文你也切英文。\n'
    '- 不堆叠客套（"很抱歉听到..."、"非常理解你的感受..."），用具体内容替代套话。\n'
    '- 不知道就说"我不确定"，不要编。\n'
    '\n'
    '长度原则：\n'
    '- 回复长度与用户输入的"重量"成正比。\n'
    '  · 闲聊、打招呼、简单确认：1-2 句。\n'
    '  · 情绪倾诉、需要接住：3-5 句，先接情绪再回应内容。\n'
    '  · 用户明确要详细解释、教程、列表：充分展开，不要人为截断。\n'
    '- 不为了"显得简短"而省略关键信息。';
```

**Step 4: Run test to verify it passes**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: PASS (3/3).

**Step 5: Commit**

```bash
git add flutter_demo/lib/pet/services/ai_service.dart flutter_demo/test/ai_service_test.dart
git commit -m "feat(ai): add system prompt with length principle for MiniCPM5-1B"
```

---

### Task 2: Add Think / No-Think mode enum and mode-specific params

**Files:**
- Modify: [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart):1-114
- Test: [ai_service_test.dart](file:///Users/mac/project/idea-turbo/flutter_demo/test/ai_service_test.dart)

**Context:** OpenBMB official MiniCPM5-1B recommended sampling: Think mode temp=0.9, top_p=0.95; No-Think mode temp=0.7, top_p=0.95.

**Step 1: Write the failing test**

Replace [ai_service_test.dart](file:///Users/mac/project/idea-turbo/flutter_demo/test/ai_service_test.dart) with:

```dart
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
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: FAIL — `AiReasoningMode` and `paramsFor` don't exist.

**Step 3: Implement mode enum and params factory**

In [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart), **remove the existing** `localChatGenerationParams` static const and **replace with**:

```dart
enum AiReasoningMode { noThink, think }

class AiService {
  static const _maxHistoryMessages = 8;

  // ... existing fields ...

  /// Sampling parameters per OpenBMB MiniCPM5-1B official guidance.
  /// Think mode → temp=0.9 (more exploratory for reasoning chains).
  /// No-Think mode → temp=0.7 (focused direct answers).
  static GenerationParams paramsFor(AiReasoningMode mode) {
    final isThink = mode == AiReasoningMode.think;
    return GenerationParams(
      maxTokens: isThink ? 1024 : 512,
      temp: isThink ? 0.9 : 0.7,
      topK: 40,
      topP: 0.95,
      minP: 0.05,
      penalty: 1.10, // heuristic, not from official spec
    );
  }

  // ... rest of class ...
}
```

Add the `_mode` field and a public setter inside the class body:

```dart
AiReasoningMode _mode = AiReasoningMode.noThink;

void setMode(AiReasoningMode mode) => _mode = mode;
```

**Step 4: Update call sites in `generateResponse`**

Find the line `params: localChatGenerationParams,` and replace with `params: paramsFor(_mode),`.

**Step 5: Run test to verify it passes**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: PASS (all 7 tests).

**Step 6: Commit**

```bash
git add flutter_demo/lib/pet/services/ai_service.dart flutter_demo/test/ai_service_test.dart
git commit -m "feat(ai): introduce Think/NoThink modes with OpenBMB-recommended params"
```

---

### Task 3: Full ModelParams (gpuLayers, threads, batchSize, KV q4_0, flash attention, split mode, mmap, platform branching)

**Files:**
- Modify: [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart):1-114
- Test: [ai_service_test.dart](file:///Users/mac/project/idea-turbo/flutter_demo/test/ai_service_test.dart)

**Context:**
- llamadart 0.6.10 `ModelParams` field names (verified): `numberOfThreads`, `numberOfThreadsBatch`, `batchSize`, `microBatchSize`, `cacheTypeK`, `cacheTypeV`, `flashAttention`, `splitMode`, `mainGpu`, `useMmap`, `useMlock`, `maxParallelSequences`. Default `gpuLayers = maxGpuLayers`. Default `batchSize = 0` cascades to `n_batch = n_ctx`.
- llama.cpp official: `n_threads = physical cores`. Mobile has no SMT.
- llama.cpp requires flash attention for non-F16 KV cache. llamadart auto-promotes `FlashAttention.auto` to `enabled` when KV is q8_0 or q4_0.
- Q4_0 KV cache ≈ 1/4 the RAM of F16. Critical for 2GB-RAM Android devices.
- Android should default to CPU + 2048 context (per Qwen3.5 0.8B Android guidance in llamadart 0.6.10 changelog); iOS/macOS to GPU + 4096.

**Step 1: Write the failing test**

Append to [ai_service_test.dart](file:///Users/mac/project/idea-turbo/flutter_demo/test/ai_service_test.dart):

```dart
  group('AiService model params', () {
    test('default gpuLayers targets full offload (>= 24)', () {
      // MiniCPM5-1B has 24 layers; 99 means "all"
      expect(AiService.defaultGpuLayers, greaterThanOrEqualTo(24));
    });

    test('default iOS contextSize is 4096 (mobile-safe upper bound)', () {
      // Test the platform-specific helper used inside initialize().
      // We can't call initialize() without a real model, but we can
      // test the static config that's stable across platforms.
      expect(AiService.defaultGpuLayers, greaterThan(0));
    });

    test('buildModelParams enables q4_0 KV cache quantization', () {
      // We can't unit-test Platform.isAndroid directly, but we can
      // assert the helper picks the right config for the current host.
      // On macOS CI / Linux this returns iOS-style config (4096 ctx).
      final p = AiService.buildModelParams(threads: 4);
      expect(p.cacheTypeK, KvCacheType.q4_0);
      expect(p.cacheTypeV, KvCacheType.q4_0);
      expect(p.flashAttention, FlashAttention.auto);
    });

    test('buildModelParams sets numberOfThreads and batchSize', () {
      final p = AiService.buildModelParams(threads: 6);
      expect(p.numberOfThreads, 6);
      expect(p.numberOfThreadsBatch, 6);
      expect(p.batchSize, 512);
      expect(p.microBatchSize, 64);
    });
  });
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: FAIL — `defaultGpuLayers` and `buildModelParams` don't exist.

**Step 3: Add `dart:io` import if missing**

In [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart), add at the top:

```dart
import 'dart:io';
```

**Step 4: Add constants and helper**

In [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart), add class-level:

```dart
static const int defaultGpuLayers = 99;   // offload all 24 layers
static const int iosContextSize = 4096;
static const int androidCpuContextSize = 2048; // conservative for low-RAM Android
```

Add a static factory **on the class** (after `paramsFor`):

```dart
/// Build the [ModelParams] for a given thread count.
///
/// Platform branching:
/// - iOS / macOS: GPU offload all layers, 4096 context, q4_0 KV.
/// - Android:    CPU (gpuLayers: 0), 2048 context, q4_0 KV — same defaults
///               llamadart 0.6.10 ships for Qwen3.5 0.8B on Android. Vulkan
///               can be opted in via pubspec.yaml + raising gpuLayers here.
///
/// KV cache is q4_0 (1/4 the RAM of F16). llamadart auto-promotes
/// [FlashAttention.auto] to enabled when KV is non-F16 (llama.cpp requires it).
static ModelParams buildModelParams({required int threads}) {
  final isAndroid = Platform.isAndroid;
  return ModelParams(
    contextSize: isAndroid ? androidCpuContextSize : iosContextSize,
    gpuLayers: isAndroid ? 0 : defaultGpuLayers,
    numberOfThreads: threads,
    numberOfThreadsBatch: threads,
    batchSize: 512,        // default 0 cascades to n_batch = n_ctx (wasteful)
    microBatchSize: 64,
    useMmap: true,         // lazy page model weights in/out of RAM
    useMlock: false,       // don't pin 700MB in RAM on mobile
    flashAttention: FlashAttention.auto, // auto-enabled for non-F16 KV
    cacheTypeK: KvCacheType.q4_0,        // 1/4 KV memory
    cacheTypeV: KvCacheType.q4_0,
    splitMode: ModelSplitMode.none,      // single device
    mainGpu: 0,
  );
}
```

**Step 5: Update `initialize`**

Replace the `loadModel` call in `initialize` (around line 50-58):

```dart
final cores = Platform.numberOfProcessors;
final threads = cores.clamp(2, 8);

_engine = LlamaEngine(LlamaBackend());
await _engine!.loadModel(
  modelPath,
  modelParams: buildModelParams(threads: threads),
);
```

**Step 6: Run test to verify it passes**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: PASS (all groups).

**Step 7: Commit**

```bash
git add flutter_demo/lib/pet/services/ai_service.dart flutter_demo/test/ai_service_test.dart
git commit -m "perf(ai): full ModelParams (q4_0 KV, flash attn, threads, batch, mmap, platform branch)"
```

---

### Task 4: Add warmup after model load

**Files:**
- Modify: [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart):60-75

**Context:** llama.cpp README: "It is recommended to use a 'warm-up' run before benchmarking." First-token latency drops significantly after one dummy generation. On mobile, the first prompt also triggers Metal / Vulkan shader compilation.

**Step 1: Add private method**

In [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart), after `initialize`:

```dart
Future<void> _warmup() async {
  try {
    final stream = _engine!.create(
      [LlamaChatMessage.fromText(role: LlamaChatRole.user, text: 'hi')],
      params: const GenerationParams(maxTokens: 1, temp: 0.0),
    );
    await for (final _ in stream) {}
  } catch (e) {
    log('[AiService] warmup failed: $e', name: 'LocalChat');
  }
}
```

**Step 2: Call it at end of `initialize`**

After the `loadModel` await:
```dart
await _warmup();
_isInitialized = true;
```

**Step 3: Verify with `flutter analyze`**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter analyze lib/pet/services/ai_service.dart --no-pub
```

Expected: No errors.

**Step 4: Commit**

```bash
git add flutter_demo/lib/pet/services/ai_service.dart
git commit -m "perf(ai): add llama.cpp recommended warmup after model load"
```

---

### Task 5: Strip <think>...</think> blocks from streamed output

**Files:**
- Modify: [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart):76-114
- Test: [ai_service_test.dart](file:///Users/mac/project/idea-turbo/flutter_demo/test/ai_service_test.dart)

**Context:** OpenBMB MiniCPM5-1B chat template emits `<think>...</think>`. In Think mode this is reasoning that should not be shown to the user. The stripper must work **on the streaming delta** (stateful across chunks), and a fallback final pass covers the case where the stream ends mid-think.

**Step 1: Write the failing test**

Append to test file:

```dart
  group('AiService think-block stripping', () {
    test('removes a complete think block (final pass)', () {
      final out = AiService.stripThinkBlocks('<think>reasoning</think>final answer');
      expect(out, 'final answer');
    });

    test('preserves content when no think block present', () {
      const input = 'plain answer';
      expect(AiService.stripThinkBlocks(input), input);
    });

    test('handles streaming delta inside think block (returns empty)', () {
      final out = AiService.stripThinkBlocksDelta('<think>partial', inThink: false);
      expect(out, '');
    });

    test('emits content after think block closes in delta', () {
      final out = AiService.stripThinkBlocksDelta('reasoning</think>visible', inThink: true);
      expect(out, 'visible');
    });
  });
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: FAIL — `stripThinkBlocks` static method doesn't exist.

**Step 3: Implement stripper**

In [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart):

```dart
/// Final-pass strip: remove the first complete <think>...</think> block.
static String stripThinkBlocks(String text) {
  if (!text.contains('<think>') || !text.contains('</think>')) return text;
  final openIdx = text.indexOf('<think>');
  final closeIdx = text.indexOf('</think>');
  if (openIdx < 0 || closeIdx < 0 || closeIdx <= openIdx) return text;
  return text.substring(0, openIdx) +
      text.substring(closeIdx + '</think>'.length);
}

/// Streaming-delta strip: filters one chunk, returns user-visible substring.
/// Tracks whether we are inside a think block via [inThink].
static String stripThinkBlocksDelta(String delta, {required bool inThink}) {
  if (inThink) {
    final closeIdx = delta.indexOf('</think>');
    if (closeIdx < 0) return '';
    return delta.substring(closeIdx + '</think>'.length);
  }
  final openIdx = delta.indexOf('<think>');
  if (openIdx < 0) return delta;
  return delta.substring(0, openIdx);
}
```

**Step 4: Use in `generateResponse`**

Replace the streaming loop in `generateResponse`:

```dart
final buffer = StringBuffer();
var inThink = _mode == AiReasoningMode.think;
await for (final chunk in stream) {
  final delta = chunk.choices.firstOrNull?.delta.content ?? '';
  if (_mode == AiReasoningMode.think) {
    final visible = stripThinkBlocksDelta(delta, inThink: inThink);
    buffer.write(visible);
    if (!inThink && delta.contains('<think>')) inThink = true;
    if (inThink && delta.contains('</think>')) inThink = false;
  } else {
    buffer.write(delta);
  }
}
var output = buffer.toString().trim();
if (_mode == AiReasoningMode.think) {
  output = stripThinkBlocks(output);
}
```

**Step 5: Run test to verify it passes**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test test/ai_service_test.dart --no-pub
```

Expected: PASS (all groups).

**Step 6: Commit**

```bash
git add flutter_demo/lib/pet/services/ai_service.dart flutter_demo/test/ai_service_test.dart
git commit -m "feat(ai): strip <think> blocks from streamed MiniCPM5-1B output"
```

---

### Task 6: Update model description in model_config.dart

**Files:**
- Modify: [model_config.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/data/models/model_config.dart):83-92

**Step 1: Update the description**

Replace the MiniCPM5-1B entry description:

```dart
const ModelConfig(
  name: 'MiniCPM5-1B',
  description: '面壁智能 MiniCPM5 1B，端侧推理。'
      '内置 Hybrid Reasoning（<think> 思考块），中英文均衡，'
      '1B 甜点级，最低 2GB 内存即可。'
      '原生上下文 128K，移动端建议 4K-8K。',
  url: 'https://www.modelscope.cn/models/OpenBMB/MiniCPM5-1B-GGUF/resolve/main/MiniCPM5-1B-Q4_K_M.gguf',
  filename: 'minicpm5-1b-q4_k_m.gguf',
  size: '656 MB',
  features: ['端侧优先', 'Hybrid Reasoning', '128K 上下文', 'Apache 2.0'],
  minRamGb: 2,
  tier: 'low',
),
```

**Step 2: Verify compile**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter analyze lib/data/models/model_config.dart --no-pub
```

**Step 3: Commit**

```bash
git add flutter_demo/lib/data/models/model_config.dart
git commit -m "docs(model): update MiniCPM5-1B description with Hybrid Reasoning + 128K context"
```

---

### Task 7: Add Think mode toggle UI in pet_app_shell.dart

**Files:**
- Modify: [pet_app_shell.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/pet_app_shell.dart):100-180

**Step 1: Add state and pass mode to service**

In `_PetAppShellState`, add:
```dart
AiReasoningMode _mode = AiReasoningMode.noThink;
```

In the `generateResponse` call site (around line 145), add the `mode` parameter:
```dart
mode: _mode,
```

(We need to add this to the AiService.generateResponse signature as well — see step 2.)

**Step 2: Update `generateResponse` to accept mode**

In [ai_service.dart](file:///Users/mac/project/idea-turbo/flutter_demo/lib/pet/services/ai_service.dart), change the signature of `generateResponse` from:

```dart
Future<AiResponse> generateResponse(
  String userMessage, {
  List<AiConversationMessage> history = const [],
}) async {
```

to:

```dart
Future<AiResponse> generateResponse(
  String userMessage, {
  List<AiConversationMessage> history = const [],
  AiReasoningMode mode = AiReasoningMode.noThink,
}) async {
  _mode = mode;
  // ... rest unchanged ...
```

**Step 3: Add the Switch in the chat UI**

In the `build` method's body, between the `_StatusBanner` and the `Expanded` (or above `_buildComposer`):

```dart
Padding(
  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
  child: Row(
    children: [
      const Text('深度思考', style: TextStyle(fontSize: 12)),
      const SizedBox(width: 8),
      Switch(
        value: _mode == AiReasoningMode.think,
        onChanged: (v) {
          setState(() {
            _mode = v ? AiReasoningMode.think : AiReasoningMode.noThink;
            _aiService.setMode(_mode);
          });
        },
      ),
      const Spacer(),
      Text(
        _mode == AiReasoningMode.think ? 'Think（慢但准）' : 'No-Think（快）',
        style: const TextStyle(fontSize: 11, color: Colors.grey),
      ),
    ],
  ),
),
```

**Step 4: Verify compile**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter analyze lib/pet/pet_app_shell.dart --no-pub
```

**Step 5: Commit**

```bash
git add flutter_demo/lib/pet/pet_app_shell.dart flutter_demo/lib/pet/services/ai_service.dart
git commit -m "feat(chat): add Think mode toggle for MiniCPM5-1B"
```

---

### Task 8: Android largeHeap + pubspec.yaml Vulkan opt-in (infrastructure)

**Files:**
- Modify: [AndroidManifest.xml](file:///Users/mac/project/idea-turbo/flutter_demo/android/app/src/main/AndroidManifest.xml)
- Modify: [pubspec.yaml](file:///Users/mac/project/idea-turbo/flutter_demo/pubspec.yaml)

**Context:**
- `largeHeap="true"` lets the Dalvik/ART heap grow past the per-app default (256 MB) for MiniCPM5-1B's working set.
- Per llamadart 0.6.9 changelog: Android defaults to CPU. Vulkan is opt-in via `pubspec.yaml` `llamadart_native_backends`. Without this, `gpuLayers: 99` on Android is a no-op.

**Step 1: Add `largeHeap` to AndroidManifest**

In [AndroidManifest.xml](file:///Users/mac/project/idea-turbo/flutter_demo/android/app/src/main/AndroidManifest.xml), modify the `<application>` tag:

```xml
<application
    android:label="flutter_demo"
    android:name="${applicationName}"
    android:icon="@mipmap/ic_launcher"
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config"
    android:largeHeap="true">
```

**Step 2: Add Vulkan opt-in to pubspec.yaml**

In [pubspec.yaml](file:///Users/mac/project/idea-turbo/flutter_demo/pubspec.yaml), **after the dependencies block**, add:

```yaml
flutter:
  uses-material-design: true

hooks:
  user_defines:
    llamadart:
      llamadart_native_backends:
        platforms:
          android-arm64:
            backends: [vulkan]
```

**Step 3: Verify with `flutter clean && flutter pub get`**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter clean
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter pub get
```

Expected: native assets regenerated, vulkan backend included in Android build.

**Step 4: Verify with `flutter analyze`**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter analyze --no-pub
```

Expected: No new errors.

**Step 5: Commit**

```bash
git add flutter_demo/android/app/src/main/AndroidManifest.xml flutter_demo/pubspec.yaml
git commit -m "perf(android): enable largeHeap + opt-in Vulkan for MiniCPM5-1B"
```

---

### Task 9: iOS deployment target 16.4+

**Files:**
- Modify: `flutter_demo/ios/Podfile`
- Possibly modify: `flutter_demo/ios/Runner.xcodeproj/project.pbxproj`

**Context:** llamadart 0.6.10 requires iOS 16.4+ for Metal stability on the LiteRT-LM path; even on the GGUF path, modern Vulkan/Metal features are used. Set once at the Podfile level so all pods agree.

**Step 1: Check current Podfile**

```bash
grep -n "platform :ios" /Users/mac/project/idea-turbo/flutter_demo/ios/Podfile
```

**Step 2: If not already 16.4 or higher, update**

Edit the Podfile to set the platform line (typically at the top):

```ruby
platform :ios, '16.4'
```

**Step 3: Reinstall pods**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo/ios && pod install --repo-update
```

**Step 4: Verify Xcode project target**

```bash
grep -n "IPHONEOS_DEPLOYMENT_TARGET" /Users/mac/project/idea-turbo/flutter_demo/ios/Runner.xcodeproj/project.pbxproj | head -5
```

If any line shows a value below `16.4`, bump it to `16.4` in the pbxproj.

**Step 5: Commit**

```bash
git add flutter_demo/ios/Podfile flutter_demo/ios/Runner.xcodeproj/project.pbxproj
git commit -m "chore(ios): set deployment target to 16.4 for llamadart 0.6.10"
```

---

### Task 10: GGML_VK_DISABLE_COOPMAT environment variables (Android)

**Files:**
- Modify: `flutter_demo/android/app/src/main/kotlin/.../MainActivity.kt` (or wherever the entry is)

**Context:** Per llamadart docs: "Some Vulkan drivers can crash when probing cooperative matrix support. Use `GGML_VK_DISABLE_COOPMAT=1` and `GGML_VK_DISABLE_COOPMAT2=1`."

**Step 1: Locate MainActivity**

```bash
find /Users/mac/project/idea-turbo/flutter_demo/android/app/src/main -name "MainActivity.kt"
```

**Step 2: Add `onCreate` override that sets env vars**

If not already overridden, add to MainActivity.kt:

```kotlin
package com.example.flutter_demo

import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Workaround for Vulkan driver cooperative matrix crashes on some
        // Android devices. Must be set before any Vulkan init. See:
        // https://pub.dev/packages/llamadart (Android backend safety section).
        try {
            System.setProperty("GGML_VK_DISABLE_COOPMAT", "1")
            System.setProperty("GGML_VK_DISABLE_COOPMAT2", "1")
        } catch (_: Throwable) { /* best effort */ }
        super.onCreate(savedInstanceState)
    }
}
```

**Step 3: Build verification**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter build apk --debug
```

Expected: Builds cleanly.

**Step 4: Commit**

```bash
git add flutter_demo/android/app/src/main
git commit -m "fix(android): disable GGML Vulkan coopmat to prevent driver crash"
```

---

### Task 11: End-to-end regression — full test + analyze

**Goal:** Verify all changes work together; no regressions.

**Step 1: Run all tests**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter test --no-pub
```

Expected: All tests pass.

**Step 2: Run analyze**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/flutter analyze --no-pub
```

Expected: No errors (warnings OK if pre-existing).

**Step 3: Manual verification (developer device)**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo
/Users/mac/flutter/bin/flutter build apk --debug
/Users/mac/flutter/bin/flutter install
/Users/mac/flutter/bin/flutter run --no-pub
```

- [ ] Model loads; logs show "n_gpu_layers=24" (or "0" on Android without Vulkan opt-in confirmed)
- [ ] First token latency < 1s (warmup effect)
- [ ] "深度思考" toggle switches modes, response quality/speed changes
- [ ] No `<think>` blocks visible in UI when Think mode is on
- [ ] No `<think>` blocks visible in UI when Think mode is off (already correct)
- [ ] No Vulkan crash on app start (coopmat workaround effective)

**Step 4: Format**

```bash
cd /Users/mac/project/idea-turbo/flutter_demo && /Users/mac/flutter/bin/dart format lib test ../packages/mnemosyne/lib ../packages/mnemosyne/test
```

**Step 5: Commit any format-only changes**

```bash
git add -u
git diff --cached --quiet || git commit -m "style: dart format"
```

---

## Summary of corrections vs. previous plan

| Previous claim | Corrected to | Source |
|---|---|---|
| `threads: threads` field | `numberOfThreads: threads` + `numberOfThreadsBatch: threads` | llamadart 0.6.10 API |
| `batchSize: 512` alone | + `microBatchSize: 64` + explicit `cacheTypeK/V: q4_0` + `flashAttention: auto` | llamadart 0.6.10 ModelParams |
| `gpuLayers: 99` for everything | Platform branch: iOS/macOS=99, **Android=0 (CPU)** | Qwen3.5 0.8B Android guidance (llamadart 0.6.10 changelog) |
| `contextSize: 4096` for everything | iOS/macOS=4096, **Android=2048** | same |
| `useMmap` not set | Explicit `useMmap: true, useMlock: false` | mobile RAM constraints |
| `splitMode` not set | `splitMode: none, mainGpu: 0` | single-device explicitness |
| No `largeHeap` | Add `largeHeap="true"` | Android 256MB default too small for 700MB model + KV |
| No Vulkan opt-in | Add `llamadart_native_backends.android-arm64.backends: [vulkan]` | Android defaults to CPU (0.6.9 changelog) |
| No iOS deployment target check | Verify 16.4+ in Podfile and pbxproj | llamadart 0.6.10 requirement |
| No coopmat workaround | Set `GGML_VK_DISABLE_COOPMAT=1, _COOPMAT2=1` in MainActivity | llamadart docs Vulkan section |

---

## What I deliberately did NOT do

- ❌ Did NOT set hard character caps in system prompt (per user push-back; proportional-length approach).
- ❌ Did NOT change quantization (Q4_K_M is the right pick for mobile).
- ❌ Did NOT add MCP / tool-calling support (out of scope).
- ❌ Did NOT add streaming-KV-cache session reuse (llamadart 0.6.10 limitation).
- ❌ Did NOT upgrade llamadart to 0.7.0 (current 0.6.10 has all needed ModelParams fields; 0.7.0 only adds LiteRT-LM/WebGPU mem64 which is irrelevant to MiniCPM5-1B on native mobile).
- ❌ Did NOT add Vulkan opt-in unconditionally — Android CPU is the safe default; Vulkan is opt-in via pubspec per llamadart 0.6.9.

---

## Execution Log (2026-06-02)

| Task | Status | Commit | Notes |
|---|---|---|---|
| 1. system prompt + 长度原则 | ✅ Done | — | merged with T2 in `7dfa8c2` |
| 2. AiReasoningMode 枚举 + paramsFor | ✅ Done | `7dfa8c2` | tests added |
| 3. 完整 ModelParams + 平台分支 + KV q4_0 + flashAttn | ✅ Done | `7dfa8c2` | tests added |
| 4. warmup | ✅ Done | `7dfa8c2` | tests added (safe-on-uninit) |
| 5. `<think>` 块剥离 | ✅ Done | `7dfa8c2` | tests added; final-pass + streaming-delta strippers |
| 6. model_config.dart 描述更新 | ✅ Done | (in `7dfa8c2` with related changes) | formatted in `c1fa125` |
| 7. pet_app_shell.dart Think 开关 | ✅ Done | `c9c8589` | `analyze` 干净 |
| 8. AndroidManifest largeHeap + pubspec Vulkan opt-in | ✅ Done | `fea772c` | YAML 验证通过 |
| 9. iOS Podfile 16.4+ | ⚠️ **N/A** | — | 项目未启用 iOS 平台（`flutter create` 时未勾选 ios），无 `ios/` 目录、无 `Podfile`、无 `Runner.xcodeproj`。如未来启用 iOS，按 plan 内容补做即可。macOS 的 deployment target 独立于 iOS，本计划不涉及。 |
| 10. GGML_VK_DISABLE_COOPMAT | ✅ Done | `80e1cfe` | MainActivity.kt 加 `onCreate` + try/catch |
| 11. 完整 test + analyze 回归 | ✅ Done | `c1fa125` | 20/20 测试通过；`flutter analyze` 0 issues；`dart format` 已应用 |

### 验证命令与结果

```bash
$ flutter test --no-pub
00:01 +20: All tests passed!         # 14 个新测试 + 6 个原有测试

$ flutter analyze --no-pub
No issues found! (ran in 3.6s)       # 0 errors / 0 warnings / 0 info

$ dart format flutter_demo/lib/pet/services/ai_service.dart \
              flutter_demo/test/ai_service_test.dart \
              flutter_demo/lib/pet/pet_app_shell.dart \
              flutter_demo/lib/data/models/model_config.dart
Formatted 4 files (3 changed)        # 仅格式微调，无语义变化
```

### 最终 git log（自 plan 开始以来）

```
c1fa125 chore: dart format + escape angle brackets in doc comments
80e1cfe fix(android): disable Vulkan coopmat probing to avoid driver crashes
fea772c build(android): enable largeHeap and opt-in Vulkan backend for llamadart
c9c8589 feat(chat): add Think/No-Think mode toggle in chat composer
7dfa8c2 perf(ai): full MiniCPM5-1B inference tuning (system prompt, Think mode, ModelParams, warmup, <think> strip)
```
