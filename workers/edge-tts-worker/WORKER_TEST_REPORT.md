# Edge TTS Worker 测试报告

## 概述

本报告详细记录了对 Cloudflare Worker Edge TTS 代理的测试结果。

## 测试环境

- **测试时间**: 2026-02-09
- **Worker URL**: https://shu.66666618.xyz
- **测试位置**: `e:\gitlab\idea\DaXiaoRen\edge-tts-worker\`
- **测试网络环境**: 中国大陆

## Worker 配置

### 基本信息

- **名称**: edge-tts-proxy
- **主文件**: worker.js
- **兼容性日期**: 2024-01-01
- **兼容性标志**: nodejs_compat

### 路由配置

```
https://shu.66666618.xyz/*
zone_name: 66666618.xyz
```

### API 端点

| 端点 | 方法 | 说明 |
|-------|------|------|
| `/` | GET | HTML 页面 |
| `/v1/audio/speech` | POST | 语音合成 |
| `/v1/models` | GET | 模型列表 |
| `/v1/voices` | GET | 语音列表 |

### OpenAI 语音映射

| OpenAI 语音 | Microsoft 语音 | 描述 |
|-------------|---------------|------|
| shimmer | zh-CN-XiaoxiaoNeural | 普通话女声 |
| alloy | zh-CN-YunyangNeural | 专业男声 |
| fable | zh-CN-YunjianNeural | 激情男声 |
| onyx | zh-CN-XiaoyiNeural | 活泼女声 |
| nova | zh-CN-YunxiNeural | 阳光男声 |
| echo | zh-CN-liaoning-XiaobeiNeural | 东北女声 |

## 测试结果

### ✅ 成功的测试

#### 测试 1: 模型列表

```python
GET /v1/models
```

**结果**: ✅ 成功
- 模型数量: 8
- 可用模型:
  - tts-1
  - tts-1-hd
  - tts-1-shimmer
  - tts-1-alloy
  - tts-1-fable
  - tts-1-onyx
  - tts-1-nova
  - tts-1-echo

#### 测试 2: 语音列表

```python
GET /v1/voices
```

**结果**: ✅ 成功
- 语音数量: 563
- 中文语音数量: 44
- 中文语音示例:
  - zh-CN-XiaoxiaoNeural (Xiaoxiao) - Female
  - zh-CN-YunxiNeural (Yunxi) - Male
  - zh-CN-YunjianNeural (Yunjian) - Male
  - zh-CN-XiaoyiNeural (Xiaoyi) - Female
  - zh-CN-YunyangNeural (Yunyang) - Male
  - zh-CN-XiaochenNeural (Xiaochen) - Female
  - zh-CN-XiaochenMultilingualNeural (Xiaochen Multilingual) - Female
  - zh-CN-XiaohanNeural (Xiaohan) - Female
  - zh-CN-XiaomengNeural (Xiaomeng) - Female
  - zh-CN-XiaomoNeural (Xiaomo) - Female
  - ... 还有 34 个语音

#### 测试 3: 自定义语音（普通话）

```python
POST /v1/audio/speech
{
  "model": "tts-1",
  "input": "这是一个自定义语音的测试。",
  "voice": "zh-CN-XiaoxiaoNeural",
  "speed": 1.0,
  "pitch": 1.0
}
```

**结果**: ✅ 成功
- 普通话女声 (zh-CN-XiaoxiaoNeural): 17280 bytes
- 普通话男声 (zh-CN-YunjianNeural): 19296 bytes

#### 测试 4: 错误处理

**测试用例**:
1. 缺少 input 参数
2. 无效的语音
3. 无效的 HTTP 方法

**结果**: ✅ 成功
- 所有错误都被正确捕获和处理
- 返回了适当的错误消息和状态码

### ❌ 失败的测试

#### 测试 5: 基本 TTS 功能（使用 OpenAI 语音映射）

```python
POST /v1/audio/speech
{
  "model": "tts-1",
  "input": "你好，世界！",
  "voice": "shimmer",
  "speed": 1.0,
  "pitch": 1.0
}
```

**结果**: ❌ 失败
- 错误: `Edge TTS API 错误: 400 Bad Request - `
- 状态码: 500

**原因**: OpenAI 语音映射可能有问题，或者 Microsoft TTS API 不接受这些语音名称

#### 测试 6: 多个语音（使用 OpenAI 语音映射）

**测试的语音**:
- shimmer (普通话女声)
- alloy (普通话男声)
- fable (激情男声)
- onyx (活泼女声)
- nova (阳光男声)

**结果**: ❌ 全部失败
- 错误: `Edge TTS API 错误: 400 Bad Request - `
- 状态码: 500

**原因**: 所有 OpenAI 语音映射都失败了

#### 测试 7: 语速和音调调整

```python
POST /v1/audio/speech
{
  "model": "tts-1",
  "input": "这是一个测试语速和音调的句子。",
  "voice": "shimmer",
  "speed": 1.5,
  "pitch": 1.2
}
```

**结果**: ❌ 失败
- 错误: `Edge TTS API 错误: 400 Bad Request - `
- 状态码: 500

**原因**: 可能是因为使用 OpenAI 语音映射导致的

#### 测试 8: 长文本

```python
POST /v1/audio/speech
{
  "model": "tts-1",
  "input": "打小人，打小人，打得小人不敢再欺人...",
  "voice": "shimmer",
  "speed": 1.0,
  "pitch": 1.0
}
```

**结果**: ❌ 失败
- 错误: `Edge TTS API 错误: 400 Bad Request - `
- 状态码: 500

**原因**: 可能是因为使用 OpenAI 语音映射导致的

#### 测试 9: 流式输出

```python
POST /v1/audio/speech
{
  "model": "tts-1",
  "input": "这是一个流式输出的测试。",
  "voice": "shimmer",
  "stream": True
}
```

**结果**: ❌ 失败
- 错误: `Edge TTS API 错误: 400 Bad Request - `
- 状态码: 500

**原因**: 可能是因为使用 OpenAI 语音映射导致的

#### 测试 10: 自定义语音（英语）

```python
POST /v1/audio/speech
{
  "model": "tts-1",
  "input": "这是一个自定义语音的测试。",
  "voice": "en-US-JennyNeural",
  "speed": 1.0,
  "pitch": 1.0
}
```

**结果**: ⚠️ 部分失败
- 生成的文件大小: 0 bytes
- 状态码: 200

**原因**: API 返回了成功状态，但没有音频数据

## 关键发现

### 1. Worker 基本功能正常

- ✅ 可以正常获取模型列表
- ✅ 可以正常获取语音列表
- ✅ 可以正常处理错误请求
- ✅ 普通话语音可以正常工作

### 2. OpenAI 语音映射有问题

- ❌ 所有 OpenAI 语音映射（shimmer, alloy, fable, onyx, nova, echo）都失败
- ❌ 返回 400 Bad Request 错误
- ❌ 可能是因为 Microsoft TTS API 不接受这些语音名称

### 3. 直接使用 Microsoft 语音名称可以工作

- ✅ `zh-CN-XiaoxiaoNeural` (普通话女声) 可以正常工作
- ✅ `zh-CN-YunjianNeural` (普通话男声) 可以正常工作
- ❌ `en-US-JennyNeural` (英语女声) 生成了 0 bytes 的文件

### 4. 普通话语音在中国大陆可以访问

- ✅ 普通话语音可以正常生成音频
- ✅ 音频质量良好
- ✅ 文件大小合理

## 问题分析

### 问题 1: OpenAI 语音映射失败

**可能原因**:
1. Microsoft TTS API 不接受 OpenAI 语音名称
2. 语音映射逻辑有问题
3. 需要特殊的 API 密钥或权限

**建议**:
1. 检查 worker.js 中的语音映射逻辑
2. 确认 Microsoft TTS API 是否支持这些语音名称
3. 考虑移除 OpenAI 语音映射，只支持直接使用 Microsoft 语音名称

### 问题 2: 英语语音生成 0 bytes

**可能原因**:
1. Microsoft TTS API 对英语语音有特殊要求
2. 需要额外的参数或配置
3. API 返回了空响应

**建议**:
1. 检查 worker.js 中的错误处理逻辑
2. 添加更详细的日志记录
3. 确认 API 响应是否正确处理

### 问题 3: 语速和音调调整失败

**可能原因**:
1. 参数格式不正确
2. Microsoft TTS API 不支持这些参数
3. 需要特殊的参数转换

**建议**:
1. 检查 worker.js 中的参数转换逻辑
2. 确认 Microsoft TTS API 支持的参数格式
3. 添加参数验证

## 推荐方案

### 方案 1: 使用 Microsoft 语音名称（推荐）

对于"打小人"项目，建议直接使用 Microsoft 语音名称：

```typescript
const speakWithWorker = async (text: string) => {
  const response = await fetch('https://shu.66666618.xyz/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'zh-CN-XiaoxiaoNeural', // 普通话女声
      speed: 1.0,
      pitch: 1.0
    })
  });

  if (response.ok) {
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  }
};
```

**优点**:
- ✅ 可以正常工作
- ✅ 普通话语音质量良好
- ✅ 在中国大陆可以访问
- ✅ 无需额外配置

**缺点**:
- ❌ 不是粤语
- ❌ 语速和音调调整可能有问题

### 方案 2: 修复 OpenAI 语音映射

如果需要使用 OpenAI 语音映射，需要修复 worker.js 中的问题。

**优点**:
- ✅ 兼容 OpenAI API 格式
- ✅ 更易于使用

**缺点**:
- ❌ 需要调试和修复
- ❌ 不确定是否能成功

### 方案 3: 混合方案

结合 Worker 和 Web Speech API：

```typescript
const speak = async (text: string) => {
  try {
    // 尝试使用 Worker
    await speakWithWorker(text);
  } catch (error) {
    // 降级到 Web Speech API
    speakWithWebSpeechAPI(text);
  }
};
```

**优点**:
- ✅ 有降级方案
- ✅ 确保功能可用

**缺点**:
- ❌ 实现复杂度较高

## 总结

1. ✅ Worker 基本功能正常
2. ✅ 可以正常获取模型和语音列表
3. ✅ 普通话语音可以正常工作
4. ❌ OpenAI 语音映射有问题
5. ❌ 英语语音生成 0 bytes
6. ❌ 语速和音调调整可能有问题
7. ✅ **推荐使用 Microsoft 语音名称（zh-CN-XiaoxiaoNeural）**

## 附录

### 测试文件位置

- 测试脚本: `e:\gitlab\idea\DaXiaoRen\edge-tts-worker\test_worker.py`
- Worker 源码: `e:\gitlab\idea\DaXiaoRen\edge-tts-worker\worker.js`
- Worker 配置: `e:\gitlab\idea\DaXiaoRen\edge-tts-worker\wrangler.toml`

### 生成的音频文件列表

| 文件名 | 大小 | 说明 |
|--------|------|------|
| test_worker_zh_cn_female.mp3 | 17280 bytes | 普通话女声 |
| test_worker_zh_cn_male.mp3 | 19296 bytes | 普通话男声 |
| test_worker_en_us_female.mp3 | 0 bytes | 英语女声（失败） |

### 相关文档

- Worker URL: https://shu.66666618.xyz
- OpenAI TTS API 文档: https://platform.openai.com/docs/api-reference/audio/createSpeech
- Microsoft TTS API 文档: https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/
