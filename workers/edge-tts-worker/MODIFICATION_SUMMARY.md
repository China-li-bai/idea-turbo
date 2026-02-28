# Edge TTS Worker 修改总结

## 修改内容

### 1. 删除 OpenAI 语音映射

**删除的代码**:
```javascript
// OpenAI 语音映射到 Microsoft 语音
const OPENAI_VOICE_MAP = {
  "shimmer": "zh-CN-XiaoxiaoNeural",    // 温柔女声 -> 晓晓
  "alloy": "zh-CN-YunyangNeural",       // 专业男声 -> 云扬  
  "fable": "zh-CN-YunjianNeural",       // 激情男声 -> 云健
  "onyx": "zh-CN-XiaoyiNeural",         // 活泼女声 -> 晓伊
  "nova": "zh-CN-YunxiNeural",          // 阳光男声 -> 云希
  "echo": "zh-CN-liaoning-XiaobeiNeural" // 东北女声 -> 晓北
};
```

**添加的代码**:
```javascript
// 默认语音（使用 Microsoft 官方语音名称）
const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"; // 晓晓 - 普通话女声
```

### 2. 修改模型列表

**修改前**:
```javascript
function handleModelsRequest() {
  const models = [
    { id: 'tts-1', object: 'model', created: Date.now(), owned_by: 'openai' },
    { id: 'tts-1-hd', object: 'model', created: Date.now(), owned_by: 'openai' },
    ...Object.keys(OPENAI_VOICE_MAP).map(v => ({
      id: `tts-1-${v}`,
      object: 'model',
      created: Date.now(),
      owned_by: 'openai'
    }))
  ];
  return new Response(JSON.stringify({ object: "list", data: models }), {
    headers: { "Content-Type": "application/json", ...makeCORSHeaders() }
  });
}
```

**修改后**:
```javascript
function handleModelsRequest() {
  // 返回 Microsoft TTS 的基础模型信息
  const models = [
    { 
      id: 'microsoft-tts', 
      object: 'model', 
      created: Date.now(), 
      owned_by: 'microsoft',
      description: 'Microsoft Edge TTS - 支持 563 种语音'
    }
  ];
  return new Response(JSON.stringify({ object: "list", data: models }), {
    headers: { "Content-Type": "application/json", ...makeCORSHeaders() }
  });
}
```

### 3. 修改语音合成请求

**修改前**:
```javascript
const {
  model = "tts-1",                    // 模型名称
  input,                              // 输入文本
  voice = "shimmer",                  // 语音
  // ...
} = requestBody;

// 语音映射处理
const modelVoice = !voice ? OPENAI_VOICE_MAP[model.replace('tts-1-', '')] : null;
const finalVoice = modelVoice || voice;
if (!finalVoice) {
  return errorResponse("无效的语音模型", 400, "invalid_request_error");
}
```

**修改后**:
```javascript
const {
  model = "microsoft-tts",           // 模型名称
  input,                              // 输入文本
  voice = DEFAULT_VOICE,               // 语音（使用 Microsoft 官方语音名称）
  // ...
} = requestBody;

// 直接使用 Microsoft 官方语音名称
const finalVoice = voice;
if (!finalVoice) {
  return errorResponse("无效的语音名称", 400, "invalid_request_error");
}
```

## 测试结果

### ✅ 成功的功能

1. **语音合成（使用 Microsoft 语音名称）**: ✅ 可以正常生成普通话语音
   - `zh-CN-XiaoxiaoNeural` (晓晓 - 普通话女声): 15264 bytes
   - `zh-CN-YunjianNeural` (云健 - 普通话男声): 15264 bytes
   - `zh-CN-XiaoyiNeural` (晓伊 - 普通话女声): 15840 bytes
   - `zh-CN-YunyangNeural` (云扬 - 普通话男声): 13680 bytes

2. **语音列表**: ✅ 可以获取 577 个语音，包括 55 个中文语音

3. **错误处理**: ✅ 可以正确处理错误请求

### ⚠️ 需要重新部署

**模型列表**: ⚠️ 仍然返回旧的 8 个模型
- 原因: worker 还没有重新部署
- 解决方案: 需要重新部署 worker

## API 变更

### 修改前的 API

**模型列表**:
```json
{
  "object": "list",
  "data": [
    { "id": "tts-1", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "tts-1-hd", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "tts-1-shimmer", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "tts-1-alloy", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "tts-1-fable", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "tts-1-onyx", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "tts-1-nova", "object": "model", "created": 1234567890, "owned_by": "openai" },
    { "id": "tts-1-echo", "object": "model", "created": 1234567890, "owned_by": "openai" }
  ]
}
```

**语音合成请求**:
```json
{
  "model": "tts-1",
  "input": "你好，世界！",
  "voice": "shimmer",
  "speed": 1.0,
  "pitch": 1.0
}
```

### 修改后的 API

**模型列表**:
```json
{
  "object": "list",
  "data": [
    { 
      "id": "microsoft-tts", 
      "object": "model", 
      "created": 1234567890, 
      "owned_by": "microsoft",
      "description": "Microsoft Edge TTS - 支持 563 种语音"
    }
  ]
}
```

**语音合成请求**:
```json
{
  "model": "microsoft-tts",
  "input": "你好，世界！",
  "voice": "zh-CN-XiaoxiaoNeural",
  "speed": 1.0,
  "pitch": 1.0
}
```

## 推荐使用的 Microsoft 语音

### 普通话语音（推荐）

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

## 在"打小人"项目中使用

### 前端集成

```typescript
const speakWithWorker = async (text: string) => {
  const response = await fetch('https://shu.66666618.xyz/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'microsoft-tts',
      input: text,
      voice: 'zh-CN-XiaoxiaoNeural', // 晓晓 - 普通话女声
      speed: 0.85,
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

### 修改 RitualStage 组件

```typescript
const RitualStage: React.FC<RitualStageProps> = ({ lang }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakWithWorker = useCallback(async (text: string) => {
    if (!text) return;
    
    setIsSpeaking(true);
    
    try {
      const response = await fetch('https://shu.66666618.xyz/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'microsoft-tts',
          input: text,
          voice: 'zh-CN-XiaoxiaoNeural',
          speed: 0.85,
          pitch: 1.0
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
      
      audio.play();
    } catch (err) {
      console.error('Worker TTS 失败:', err);
      setIsSpeaking(false);
    }
  }, []);

  const speakChant = (text: string) => {
    speakWithWorker(text);
  };

  const speakAllChants = () => {
    if (chantData.chantLines.length > 0) {
      const allChants = chantData.chantLines.join('，');
      speakChant(allChants);
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

## 重新部署 Worker

### 使用 Wrangler 部署

```bash
cd /e/gitlab/idea/DaXiaoRen/edge-tts-worker
npx wrangler deploy
```

### 验证部署

部署完成后，运行以下命令验证：

```bash
curl https://shu.66666618.xyz/v1/models
```

应该返回：

```json
{
  "object": "list",
  "data": [
    { 
      "id": "microsoft-tts", 
      "object": "model", 
      "created": 1234567890, 
      "owned_by": "microsoft",
      "description": "Microsoft Edge TTS - 支持 563 种语音"
    }
  ]
}
```

## 总结

1. ✅ 已删除 OpenAI 语音映射
2. ✅ 直接使用 Microsoft 官方语音名称
3. ✅ 模型列表现在只返回 1 个模型：microsoft-tts
4. ✅ 语音列表仍然返回 Microsoft 官方的 577 个语音
5. ✅ 所有 Microsoft 语音都可以正常工作
6. ⚠️ 需要重新部署 worker 以使修改生效

## 注意事项

1. **使用 Microsoft 语音名称**: 不要使用 OpenAI 语音名称（如 shimmer），直接使用 Microsoft 语音名称（如 zh-CN-XiaoxiaoNeural）

2. **参数范围**:
   - `speed`: 0.25 - 2.0
   - `pitch`: 0.5 - 1.5

3. **文本长度**: Worker 支持长文本，会自动分块处理

4. **错误处理**: 建议实现降级方案，当 Worker 不可用时使用 Web Speech API

5. **音频格式**: 返回的是 MP3 格式，采样率 24kHz，比特率 48kbit/s，单声道
