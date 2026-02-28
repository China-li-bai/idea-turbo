# Edge TTS Worker 使用指南

## 概述

你的 Cloudflare Worker Edge TTS 代理已经成功部署并测试通过！本指南说明如何在前端项目中使用这个 Worker。

## 测试结果总结

### ✅ 成功的功能

1. **基本 TTS 功能**: ✅ 可以正常生成普通话语音
2. **模型列表**: ✅ 可以获取可用模型列表
3. **语音列表**: ✅ 可以获取 563 个语音，包括 44 个中文语音
4. **错误处理**: ✅ 可以正确处理错误请求
5. **普通话语音**: ✅ `zh-CN-XiaoxiaoNeural` 和 `zh-CN-YunjianNeural` 都可以正常工作

### ⚠️ 限制和注意事项

1. **OpenAI 语音映射**: ❌ 不支持 OpenAI 语音名称（如 shimmer, alloy 等）
2. **英语语音**: ⚠️ 英语语音可能生成 0 bytes 的文件
3. **语速和音调调整**: ⚠️ 可能需要进一步测试

## 前端集成方案

### 方案 1: 直接使用 Worker API（推荐）

```typescript
interface TTSSpeechOptions {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export const speakWithWorker = async (options: TTSSpeechOptions) => {
  const {
    text,
    voice = 'zh-CN-XiaoxiaoNeural', // 默认普通话女声
    speed = 1.0,
    pitch = 1.0
  } = options;

  const response = await fetch('https://shu.66666618.xyz/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      speed,
      pitch
    })
  });

  if (!response.ok) {
    throw new Error(`TTS 请求失败: ${response.status}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  
  const audio = new Audio(audioUrl);
  audio.play();
  
  return audio;
};
```

### 方案 2: 使用 React Hook

```typescript
import { useState, useCallback } from 'react';

interface UseWorkerTTSSpeechOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
}

export const useWorkerTTS = (options: UseWorkerTTSSpeechOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    voice = 'zh-CN-XiaoxiaoNeural',
    speed = 1.0,
    pitch = 1.0
  } = options;

  const speak = useCallback(async (text: string) => {
    if (!text) return;
    
    setIsSpeaking(true);
    setError(null);
    
    try {
      const response = await fetch('https://shu.66666618.xyz/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice,
          speed,
          pitch
        })
      });

      if (!response.ok) {
        throw new Error(`TTS 请求失败: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        setError('音频播放失败');
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
    } catch (err) {
      setIsSpeaking(false);
      setError(err instanceof Error ? err.message : '未知错误');
    }
  }, [voice, speed, pitch]);

  return {
    speak,
    isSpeaking,
    error
  };
};
```

### 方案 3: 混合方案（Worker + Web Speech API）

```typescript
import { useState, useCallback } from 'react';

interface UseHybridTTSSpeechOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  preferWorker?: boolean;
}

export const useHybridTTS = (options: UseHybridTTSSpeechOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    voice = 'zh-CN-XiaoxiaoNeural',
    speed = 1.0,
    pitch = 1.0,
    preferWorker = true
  } = options;

  const speakWithWorker = useCallback(async (text: string) => {
    const response = await fetch('https://shu.66666618.xyz/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        speed,
        pitch
      })
    });

    if (!response.ok) {
      throw new Error(`TTS 请求失败: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audio = new Audio(audioUrl);
    audio.play();
    
    return audio;
  }, [voice, speed, pitch]);

  const speakWithWebSpeechAPI = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      throw new Error('浏览器不支持 Web Speech API');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = speed;
    utterance.pitch = pitch;
    
    // 尝试获取中文语音
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(v => 
      v.lang.includes('zh') || v.lang.includes('CN')
    );
    
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [speed, pitch]);

  const speak = useCallback(async (text: string) => {
    if (!text) return;
    
    setIsSpeaking(true);
    setError(null);
    
    try {
      if (preferWorker) {
        // 优先使用 Worker
        await speakWithWorker(text);
      } else {
        // 使用 Web Speech API
        speakWithWebSpeechAPI(text);
      }
    } catch (err) {
      console.warn('Worker TTS 失败，降级到 Web Speech API:', err);
      try {
        // 降级到 Web Speech API
        speakWithWebSpeechAPI(text);
      } catch (fallbackErr) {
        setIsSpeaking(false);
        setError(fallbackErr instanceof Error ? fallbackErr.message : '未知错误');
      }
    }
  }, [preferWorker, speakWithWorker, speakWithWebSpeechAPI]);

  return {
    speak,
    isSpeaking,
    error
  };
};
```

## 在"打小人"项目中使用

### 修改 RitualStage 组件

```typescript
import { useHybridTTS } from '../hooks/useHybridTTS';

// 在 RitualStage 组件中
const RitualStage: React.FC<RitualStageProps> = ({ lang }) => {
  const { speak, isSpeaking } = useHybridTTS({
    voice: 'zh-CN-XiaoxiaoNeural', // 普通话女声
    speed: 0.85,
    pitch: 1.0,
    preferWorker: true // 优先使用 Worker
  });

  const speakChant = (text: string) => {
    speak(text);
  };

  const speakAllChants = () => {
    if (chantData.chantLines.length > 0) {
      const allChants = chantData.chantLines.join('，');
      speak(allChants);
    }
  };

  // 在 handleHit 函数中
  const handleHit = () => {
    const newHits = hits + 1;
    setHits(newHits);
    
    // 在第一次击打时播报所有咒语
    if (hits === 0) {
      speakAllChants();
    }
  };

  // ... 其他代码
};
```

## 支持的语音

### 推荐的普通话语音

| 语音名称 | 描述 | 性别 | 推荐度 |
|---------|------|------|--------|
| `zh-CN-XiaoxiaoNeural` | 晓晓 | 女 | ⭐⭐⭐⭐⭐ |
| `zh-CN-YunjianNeural` | 云健 | 男 | ⭐⭐⭐⭐ |
| `zh-CN-XiaoyiNeural` | 晓伊 | 女 | ⭐⭐⭐⭐ |
| `zh-CN-YunyangNeural` | 云扬 | 男 | ⭐⭐⭐⭐ |
| `zh-CN-XiaochenNeural` | 晓晨 | 女 | ⭐⭐⭐ |

### 获取完整语音列表

```typescript
const getVoices = async () => {
  const response = await fetch('https://shu.66666618.xyz/v1/voices');
  const data = await response.json();
  
  // 筛选中文语音
  const chineseVoices = data.data.filter((voice: any) => 
    voice.lang.startsWith('zh')
  );
  
  return chineseVoices;
};
```

## API 参考

### 语音合成端点

**URL**: `POST https://shu.66666618.xyz/v1/audio/speech`

**请求参数**:

| 参数 | 类型 | 必需 | 说明 | 示例 |
|------|------|------|------|------|
| `model` | string | 是 | 模型名称 | `tts-1` |
| `input` | string | 是 | 要转换的文本 | `"你好，世界！"` |
| `voice` | string | 否 | 语音名称 | `zh-CN-XiaoxiaoNeural` |
| `speed` | number | 否 | 语速 (0.25-2.0) | `1.0` |
| `pitch` | number | 否 | 音调 (0.5-1.5) | `1.0` |
| `stream` | boolean | 否 | 是否流式输出 | `false` |

**响应**:

- 成功: `audio/mpeg` (MP3 音频文件)
- 失败: `application/json` (错误信息)

### 模型列表端点

**URL**: `GET https://shu.66666618.xyz/v1/models`

**响应**:

```json
{
  "object": "list",
  "data": [
    {
      "id": "tts-1",
      "object": "model",
      "created": 1234567890,
      "owned_by": "openai"
    }
  ]
}
```

### 语音列表端点

**URL**: `GET https://shu.66666618.xyz/v1/voices`

**响应**:

```json
{
  "object": "list",
  "data": [
    {
      "id": "zh-CN-XiaoxiaoNeural",
      "name": "Xiaoxiao",
      "lang": "zh-CN",
      "gender": "Female",
      "locale": "zh-CN",
      "styleList": [],
      "sampleRateHertz": 24000,
      "voiceType": "Neural",
      "wordsPerMinute": 100
    }
  ]
}
```

## 注意事项

1. **使用 Microsoft 语音名称**: 不要使用 OpenAI 语音映射（如 shimmer），直接使用 Microsoft 语音名称（如 zh-CN-XiaoxiaoNeural）

2. **参数范围**:
   - `speed`: 0.25 - 2.0
   - `pitch`: 0.5 - 1.5

3. **文本长度**: Worker 支持长文本，会自动分块处理

4. **错误处理**: 建议实现降级方案，当 Worker 不可用时使用 Web Speech API

5. **音频格式**: 返回的是 MP3 格式，采样率 24kHz，比特率 48kbit/s，单声道

## 总结

✅ **Worker 可以正常工作**
✅ **普通话语音质量良好**
✅ **可以集成到前端项目**
✅ **支持长文本处理**
✅ **有降级方案**

推荐使用 `zh-CN-XiaoxiaoNeural`（普通话女声）作为默认语音，它质量好且在中国大陆可以稳定访问。
