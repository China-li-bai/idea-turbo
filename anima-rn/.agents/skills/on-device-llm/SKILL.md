---
name: on-device-llm
description: On-device LLM integration with llama.rn for edge AI inference. Covers model loading, ChatML formatting, streaming completion, memory management, and GPU acceleration.
version: 1.0.0
license: MIT
---

# On-Device LLM Integration Guide

## Overview

This skill provides comprehensive guidance for integrating `llama.rn` into Expo projects for on-device AI inference. The implementation uses **JSI (JavaScript Interface)** for zero-bridge-latency communication with the native llama.cpp engine.

## Core Dependencies

```json
{
  "dependencies": {
    "llama.rn": "latest"
  },
  "expo": {
    "plugins": ["llama.rn"]
  }
}
```

## Model Configuration

### Recommended Model: SmolLM-360M-Instruct

| Property | Value |
|----------|-------|
| Source | HuggingFaceTB/SmolLM-360M-Instruct-GGUF |
| Quantization | Q4_K_M (recommended) |
| Size | ~200MB |
| Context Window | 1024 tokens (sufficient for chat) |
| Format | GGUF |

### Model File Location

```
project/
├── models/
│   └── smollm-360m-instruct-q4_k_m.gguf    # Bundled model
├── metro.config.js                          # GGUF asset support
```

## Initialization Pattern

### Lazy Loading (Required)

**CRITICAL:** Never import `llama.rn` at module level on unsupported platforms. Use lazy loading to prevent runtime crashes.

```typescript
// src/lib/llama-adapter.ts
import { Platform } from 'react-native'

export async function initLlama() {
  if (Platform.OS === 'web') {
    const mod = await import('./llama-web-adapter')
    return mod.initLlama()
  }
  
  const { initLlama: nativeInit } = await import('llama.rn')
  return nativeInit
}

export type { LlamaContext } from 'llama.rn'
```

### Model Loading from Bundle

```typescript
// src/lib/LocalBrain.ts
import * as FileSystem from 'expo-file-system/legacy'
import { Asset } from 'expo-asset'
import { initLlama } from './llama-adapter'
import type { LlamaContext } from 'llama.rn'

const MODEL_FILENAME = 'smollm-360m-instruct-q4_k_m.gguf'
const BUNDLED_MODEL = require('../../models/smollm-360m-instruct-q4_k_m.gguf')

async function ensureModelExists(): Promise<string> {
  const dir = FileSystem.documentDirectory!
  const path = `${dir}${MODEL_FILENAME}`
  
  const info = await FileSystem.getInfoAsync(path)
  if (info.exists) return path
  
  // Extract from app bundle
  const asset = Asset.fromModule(BUNDLED_MODEL)
  await asset.downloadAsync()
  await FileSystem.copyAsync({
    from: asset.localUri!,
    to: path
  })
  
  return path
}

export async function createLlamaContext(): Promise<LlamaContext> {
  const modelPath = await ensureModelExists()
  const initFn = await initLlama()
  
  return initFn({
    model: modelPath,
    use_mlock: true,      // Lock in memory, prevent OS cleanup
    n_ctx: 1024,          // Context window size
    n_gpu_layers: 50,     // GPU offload layers (if supported)
    n_threads: 4          // Thread count (2-4 recommended)
  })
}
```

## ChatML Prompt Formatting

SmolLM uses ChatML format for instruction following:

```typescript
function buildChatMLPrompt(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): string {
  let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`
  
  for (const msg of history) {
    prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`
  }
  
  prompt += `<|im_start|>user\n${userMessage}<|im_end|>\n<|im_start|>assistant\n`
  
  return prompt
}
```

### Example System Prompts

```typescript
const PET_PERSONA = `你是一只名叫"修勾"的傲娇小狗，你是主人的赛博宠物。
特点：
- 性格傲娇但内心关心主人
- 回复简短、幽默（50字以内）
- 偶尔会用"汪"结尾
- 记住主人的重要信息`

const MEMORY_AWARE_PROMPT = (tags: string[]) => 
  `你是一只修勾。已知主人最近【${tags.join('、')}】，请根据此状态回应。`
```

## Streaming Completion

```typescript
async function streamCompletion(
  context: LlamaContext,
  prompt: string,
  onToken: (text: string) => void,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  let fullResponse = ''
  
  await context.completion({
    prompt,
    n_predict: options?.maxTokens ?? 100,
    temperature: options?.temperature ?? 0.7,
    onNewToken: (token) => {
      fullResponse += token
      onToken(token)
    }
  })
  
  return fullResponse
}
```

## Performance Optimization

### Memory Management

```typescript
// Dispose context when unmounting
useEffect(() => {
  let context: LlamaContext | null = null
  
  createLlamaContext().then(ctx => { context = ctx })
  
  return () => {
    context?.dispose()  // Free native memory
  }
}, [])
```

### Throttling Settings

| Parameter | Recommendation | Reason |
|-----------|----------------|--------|
| `n_predict` | 50-150 | Limit response length |
| `n_threads` | 2-4 | Balance speed vs heat |
| `temperature` | 0.6-0.8 | Creativity control |
| `n_ctx` | 512-1024 | Memory vs performance |

## Error Handling

```typescript
try {
  const context = await createLlamaContext()
} catch (error) {
  if (error.message?.includes('model')) {
    console.error('Model file missing or corrupted')
  } else if (error.message?.includes('memory')) {
    console.error('Insufficient device memory')
  } else {
    console.error('LLM initialization failed:', error)
  }
}
```

## Platform Limitations

| Platform | Status | Notes |
|----------|--------|-------|
| iOS | ✅ Full Support | Requires Dev Client build |
| Android | ✅ Full Support | Requires Dev Client build |
| web | ❌ Not Supported | Use WebGPU alternative |

## Build Requirements

**CRITICAL:** Cannot use standard Expo Go. Must use **Expo Dev Client**:

```bash
# Prebuild and run
npx expo prebuild --clean
npx expo run:ios       # or run:android

# Or EAS Build
eas build --profile development --platform ios
```
