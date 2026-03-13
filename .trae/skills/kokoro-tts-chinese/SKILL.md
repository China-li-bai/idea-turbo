---
name: "kokoro-tts-chinese"
description: "为 kokoro-js TTS 引擎添加中文支持。适用于用户请求添加中文语音、中文音素化或中文 TTS 支持时。"
---

# Kokoro TTS 中文支持扩展

本技能文档记录了如何为官方 kokoro-js TTS 引擎添加中文语音支持。

## 适用场景

- 用户请求为 Kokoro TTS 添加中文支持
- 需要让 TTS 支持中文语音合成
- 需要添加新的语言支持到 TTS 引擎

## 实施步骤

### 1. 下载官方核心代码

从官方仓库或 node_modules 复制核心 JS 文件：

```bash
# 从 node_modules 复制（如果已安装）
cp node_modules/.pnpm/kokoro-js@*/node_modules/kokoro-js/src/*.js ./src/kokoro-core/

# 或从临时目录复制
cp /tmp/kokoro-official/kokoro.js/src/*.js ./src/kokoro-core/
```

### 2. 核心文件结构

```
src/kokoro-core/
├── kokoro.js      # 主引擎类
├── phonemize.js   # 音素化模块
├── voices.js      # 语音定义
└── splitter.js    # 文本分割
```

### 3. 添加中文音素化 (phonemize.js)

#### 3.1 添加拼音到 IPA 映射表

```javascript
const PINYIN_TO_IPA = {
  a: 'ɑ',
  ai: 'aɪ',
  an: 'an',
  ang: 'ɑŋ',
  ao: 'aʊ',
  b: 'p',
  ch: 'tʂʰ',
  // ... 更多映射
};
```

#### 3.2 实现中文音素化函数

```javascript
async function phonemize_chinese(text) {
  const normalized = normalize_chinese_text(text);
  
  // 使用 pinyin-pro 获取拼音
  const { pinyin } = await import('pinyin-pro');
  const py = pinyin(normalized, { 
    toneType: 'none',
    type: 'array'
  });
  
  // 转换为 IPA
  const ipaParts = py.map(p => PINYIN_TO_IPA[p]).filter(Boolean);
  return ipaParts.join(' ');
}
```

#### 3.3 修改主 phonemize 函数

```javascript
export async function phonemize(text, language = "a", norm = true) {
  if (language === "z") {
    return phonemize_chinese(text);
  }
  // ... 原有逻辑
}
```

#### 3.4 添加中文语音检测

```javascript
export function is_chinese_voice(voice) {
  return voice.startsWith('zf_') || voice.startsWith('zm_');
}
```

### 4. 启用中文语音 (voices.js)

取消注释或添加中文语音定义：

```javascript
export const VOICES = Object.freeze({
  // ... 英文语音

  // 中文语音 (zf_ = female, zm_ = male)
  zf_xiaobei: {
    name: "Xiaobei",
    language: "zh",
    gender: "Female",
    traits: "🚺",
    targetQuality: "C",
    overallGrade: "D",
  },
  zf_xiaoxiao: {
    name: "Xiaoxiao",
    language: "zh",
    gender: "Female",
    traits: "🚺",
    targetQuality: "C",
    overallGrade: "D",
  },
  zm_yunxi: {
    name: "Yunxi",
    language: "zh",
    gender: "Male",
    traits: "🚹",
    targetQuality: "C",
    overallGrade: "D",
  },
  // ... 更多中文语音
});
```

### 5. 修改引擎支持中文 (kokoro.js)

修改 `_validate_voice` 方法：

```javascript
_validate_voice(voice) {
  if (!VOICES.hasOwnProperty(voice)) {
    console.error(`Voice "${voice}" not found. Available voices:`);
    console.table(VOICES);
    throw new Error(`Voice "${voice}" not found.`);
  }
  
  // 检测中文语音
  if (is_chinese_voice(voice)) {
    return "z";  // 返回中文语言代码
  }
  
  // 英文: a = 美式, b = 英式
  const language = voice.at(0);
  return language;
}
```

### 6. 依赖配置 (package.json)

```json
{
  "dependencies": {
    "@huggingface/transformers": "^3.0.0",
    "phonemizer": "^1.2.1",
    "pinyin-pro": "^3.24.0"
  }
}
```

### 7. 导出入口 (index.ts)

```typescript
export { KokoroTTS, env, TextSplitterStream } from './kokoro-core/kokoro.js';
export { VOICES, getVoiceData, getVoiceDataUrl, setVoiceDataUrl } from './kokoro-core/voices.js';
export { phonemize, is_chinese_voice } from './kokoro-core/phonemize.js';
export { split, TextSplitterStream as TextSplitter } from './kokoro-core/splitter.js';
```

### 8. 浏览器兼容性处理

确保 voices.js 不包含 Node.js 特定模块：

```javascript
// 错误 - 浏览器不兼容
import fs from "fs/promises";
import path from "path";

// 正确 - 仅使用浏览器 API
async function getVoiceFile(id) {
  const url = `${voiceDataUrl}/${id}.bin`;
  const response = await fetch(url);
  return await response.arrayBuffer();
}
```

## 使用示例

```typescript
import { KokoroTTS, VOICES } from '@idea-turbo/sherpa-onnx-tts';

// 加载模型
const tts = await KokoroTTS.from_pretrained(
  'onnx-community/Kokoro-82M-v1.0-ONNX',
  { dtype: 'q8', device: 'webgpu' }
);

// 生成中文语音
const audio = await tts.generate('你好，世界', { voice: 'zf_xiaoxiao' });

// 播放音频
const audioContext = new AudioContext(24000);
const audioBuffer = audioContext.createBuffer(1, audio.data.length, 24000);
audioBuffer.getChannelData(0).set(audio.data);
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(audioContext.destination);
source.start();
```

## 中文语音列表

| 语音 ID | 名称 | 性别 | 语言 |
|---------|------|------|------|
| zf_xiaobei | Xiaobei | 女 | 中文 |
| zf_xiaoni | Xiaoni | 女 | 中文 |
| zf_xiaoxiao | Xiaoxiao | 女 | 中文 |
| zf_xiaoyi | Xiaoyi | 女 | 中文 |
| zm_yunjian | Yunjian | 男 | 中文 |
| zm_yunxi | Yunxi | 男 | 中文 |
| zm_yunxia | Yunxia | 男 | 中文 |
| zm_yunyang | Yunyang | 男 | 中文 |

## 关键经验

1. **语言代码约定**: 使用 `z` 表示中文，`a` 表示美式英语，`b` 表示英式英语
2. **语音前缀规则**: `zf_` = 中文女声，`zm_` = 中文男声
3. **拼音转换**: 使用 `pinyin-pro` 库将中文转换为拼音，再映射到 IPA 音素
4. **浏览器兼容**: 移除所有 Node.js 特定导入（fs, path），仅使用 fetch 和 caches API
5. **模型下载**: 语音数据文件托管在 Hugging Face，需确保网络访问

## 常见问题

### Q: 中文语音生成出来听不清
A: 检查拼音到 IPA 的映射是否正确，可参考官方模型的训练数据调整映射表

### Q: 模型加载失败
A: 确认 device 参数设置正确（webgpu/wasm/cpu），检查网络连接

### Q: 浏览器报错 fs/promises not found
A: 修改 voices.js，移除所有 Node.js 导入，仅使用浏览器原生 API
