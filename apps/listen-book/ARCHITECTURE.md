# Listen Book 架构分析文档

## 1. 项目概述

这是一个基于 Next.js 的文本转语音（TTS）应用，支持 Web Speech API 和 Edge-TTS 两种服务，并支持自动切换。

## 2. 核心模块架构

### 2.1 数据层

#### TextSegment (lib/textSegmenter.ts)
```typescript
interface TextSegment {
  id: number;           // 段落唯一标识
  text: string;         // 段落文本内容
  startIndex: number;   // 在原文中的起始位置
  endIndex: number;     // 在原文中的结束位置
}
```

**职责**：将长文本分割成适合朗读的段落

**实现方式**：
- 使用 `Intl.Segmenter` API 进行句子级别的分割
- 回退方案：使用正则表达式匹配句子结束标点

#### TTSConfig (lib/tts/types.ts)
```typescript
interface TTSConfig {
  voiceURI?: string;    // 语音标识
  rate?: number;        // 语速 (0.5-2.0)
  pitch?: number;       // 音调 (0.5-2.0)
  volume?: number;      // 音量 (0.0-1.0)
}
```

### 2.2 状态管理层

#### PlaybackState (lib/playbackState.ts)
```typescript
interface PlaybackState {
  segments: TextSegment[];      // 所有段落
  currentSegmentId: number | null;  // 当前播放段落ID
  isPlaying: boolean;           // 是否正在播放
  isPaused: boolean;            // 是否暂停
  config: TTSConfig;            // TTS配置
  text: string;                 // 原始文本
}
```

**设计模式**：观察者模式
- `PlaybackStateManager` 维护状态
- 通过 `subscribe(listener)` 方法注册监听器
- 状态变化时通过 `notify()` 通知所有监听器

**核心方法**：
- `getState()`: 获取当前状态快照
- `setText()`: 设置文本，重置播放状态
- `setSegments()`: 设置段落列表
- `setCurrentSegmentId()`: 设置当前播放段落
- `setPlaying()`: 设置播放状态
- `setPaused()`: 设置暂停状态
- `setConfig()`: 更新配置
- `getCurrentSegment()`: 获取当前段落
- `getNextSegment()`: 获取下一段
- `getPreviousSegment()`: 获取上一段

### 2.3 服务层

#### ITTSService 接口 (lib/tts/ITTSService.ts)
所有 TTS 服务必须实现的接口：

```typescript
interface ITTSService {
  getVoices(): SpeechSynthesisVoice[];
  speak(text: string, config: TTSConfig, handlers: SpeechEventHandlers): void;
  speakSegment(segment: TextSegment, config: TTSConfig, handlers: SpeechEventHandlers): void;
  pause(): void;
  resume(): void;
  stop(): void;
  isSpeaking(): boolean;
  isPaused(): boolean;
  getServiceName(): string;
  refreshVoices?(): void | Promise<void>;
}
```

#### WebSpeechTTS (lib/tts/WebSpeechTTS.ts)
**技术栈**：浏览器原生 `SpeechSynthesis` API

**核心实现**：
- 使用 `SpeechSynthesisUtterance` 对象进行语音合成
- 支持本地语音库
- 通过 `onend` 事件触发回调

**优势**：
- 无需网络请求，响应速度快
- 支持暂停/恢复
- 自动连续播放（通过 onend 回调链）

**劣势**：
- 语音质量受限于浏览器
- 语音选择有限

#### EdgeTTSService (lib/tts/EdgeTTSService.ts)
**技术栈**：Edge-TTS 代理服务 + HTMLAudioElement

**核心实现**：
- 通过代理服务获取音频 Blob
- 使用 `URL.createObjectURL(blob)` 创建音频 URL
- 使用 `HTMLAudioElement` 播放音频

**优势**：
- 语音质量高
- 语音选择丰富

**劣势**：
- 需要网络请求
- 暂停/恢复支持有限
- **连续播放存在问题**（核心问题）

#### HybridTTSService (lib/tts/HybridTTSService.ts)
**职责**：根据文本长度和用户偏好自动选择 TTS 服务

**切换策略**：
- 文本长度 ≤ threshold (默认100字符)：使用 WebSpeechTTS
- 文本长度 > threshold：使用 EdgeTTSService
- 支持手动切换和自动降级

### 2.4 表现层

#### Page 组件 (app/page.tsx)
**职责**：主页面，协调所有组件和服务

**核心状态**：
```typescript
const [text, setText] = useState('');
const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
const [ttsServiceType, setTTSServiceType] = useState<TTSServiceType>('auto');
const [currentServiceName, setCurrentServiceName] = useState<string>('Web Speech API');
```

**关键引用**：
```typescript
const segmenterRef = useRef<TextSegmenter | null>(null);
const speechServiceRef = useRef<SpeechService | HybridTTSService | null>(null);
const playbackManagerRef = useRef<PlaybackStateManager | null>(null);
```

**播放流程**：
1. 用户输入文本 → `handleTextChange`
2. 文本被分割成段落 → `segmenterRef.current.segment(newText)`
3. 点击播放 → `handlePlay`
4. 调用 `speechServiceRef.current.speakSegment(segmentToPlay, state.config, handlers)`
5. `onEnd` 回调触发 → `handleNextSegment` → 播放下一段

#### PlaybackControlSection 组件
**职责**：播放控制按钮（播放、暂停、停止、上一段、下一段）

#### ConfigSection 组件
**职责**：TTS 配置界面（语速、音调、音量、语音选择）

## 3. 数据流转分析

### 3.1 文本输入流程
```
用户输入文本
  ↓
TextInputSection.onChange
  ↓
handleTextChange(newText)
  ↓
playbackManagerRef.current.setText(newText)
  ↓
segmenterRef.current.segment(newText)
  ↓
playbackManagerRef.current.setSegments(segments)
  ↓
PlaybackStateManager.notify()
  ↓
setPlaybackState(newState)
  ↓
UI 更新
```

### 3.2 播放流程（WebSpeechTTS - 正常工作）
```
用户点击播放
  ↓
handlePlay()
  ↓
获取当前段落 segmentToPlay
  ↓
playbackManagerRef.current.setPlaying(true)
  ↓
speechServiceRef.current.speakSegment(segmentToPlay, config, {
  onEnd: () => {
    handleNextSegment()  // 关键：自动播放下一段
  }
})
  ↓
WebSpeechTTS.speak()
  ↓
synthesis.speak(utterance)
  ↓
utterance.onend 触发
  ↓
handlers.onEnd()
  ↓
handleNextSegment()
  ↓
获取下一段 nextSegment
  ↓
speechServiceRef.current.speakSegment(nextSegment, ...)
  ↓
循环直到没有下一段
```

### 3.3 播放流程（EdgeTTSService - 存在问题）
```
用户点击播放
  ↓
handlePlay()
  ↓
获取当前段落 segmentToPlay
  ↓
playbackManagerRef.current.setPlaying(true)
  ↓
speechServiceRef.current.speakSegment(segmentToPlay, config, {
  onEnd: () => {
    handleNextSegment()  // 问题：这个回调可能不会正确触发
  }
})
  ↓
EdgeTTSService.speakSegment()
  ↓
EdgeTTSService.speak() (async)
  ↓
fetch audio blob
  ↓
URL.createObjectURL(blob)
  ↓
audioElement = new Audio(audioUrl)
  ↓
audioElement.onended = () => {
  this.eventHandlers.onEnd?.()  // 问题：这里触发回调
}
  ↓
audioElement.play()
  ↓
音频播放结束
  ↓
audioElement.onended 触发
  ↓
handlers.onEnd()
  ↓
handleNextSegment()
  ↓
获取下一段 nextSegment
  ↓
speechServiceRef.current.speakSegment(nextSegment, ...)
  ↓
问题：新的音频还没准备好，onend 就被触发了
```

## 4. 问题根源分析

### 4.1 WebSpeechTTS 为什么能连续播放？

1. **同步 API 设计**：`SpeechSynthesis.speak()` 是同步调用，立即开始播放
2. **可靠的事件机制**：`utterance.onend` 事件在语音真正结束时触发
3. **内置队列管理**：浏览器内部管理语音队列

### 4.2 EdgeTTSService 为什么不能连续播放？

1. **异步 API 设计**：`speak()` 是异步方法，返回 Promise
2. **事件触发时机问题**：
   - `audioElement.onended` 在音频播放结束时触发
   - 但是在 page.tsx 中调用 `speakSegment` 时没有 await
   - 导致 `onEnd` 回调可能在音频还没播放完就被触发了
3. **资源管理问题**：
   - 每次播放都创建新的 Audio 元素
   - 没有清理之前的 Audio 元素
   - 可能导致多个音频同时播放

### 4.3 已实施的解决方案

**问题根源**：
- `EdgeTTSService.speak()` 方法被声明为 `async`，返回 `Promise<void>`
- `await this.audioElement.play()` 会等待音频播放完成才返回
- 但 `audioElement.onended` 回调也在音频结束时触发
- 这导致 `onEnd` 回调在 `speak()` 方法返回后才触发
- 而 page.tsx 中的 `handleNextSegment()` 没有等待 `speak()` 完成

**解决方案**：
1. 将 `EdgeTTSService.speak()` 方法改为返回 `void` 而非 `Promise<void>`
2. 将异步逻辑包装在 IIFE（立即执行函数表达式）中
3. 移除 `await this.audioElement.play()`，改为直接调用 `this.audioElement.play()`
4. 让 `onended` 事件自然触发 `onEnd` 回调，从而触发 `handleNextSegment()`

**修复后的代码**：
```typescript
speak(text: string, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): void {
  this.stop();
  
  this.currentText = text;
  this.currentConfig = config;
  this.eventHandlers = handlers;
  this.isPlaying = true;
  this.isPausedState = false;

  this.eventHandlers.onStart?.();

  (async () => {  // IIFE 包装异步逻辑
    try {
      const detectedLang = this.detectLanguage(text);
      const voiceName = config.voiceURI || this.getDefaultVoiceForLanguage(detectedLang);

      const requestBody = {
        model: 'tts-1',
        input: text,
        voice: voiceName
      };

      const response = await fetch(`${this.proxyUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge-TTS request failed: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      this.audioElement = new Audio(audioUrl);
      
      this.audioElement.onplay = () => {
        this.mediaSessionManager.setPlaybackState('playing');
        this.mediaSessionManager.setMetadata({
          title: '文本朗读',
          artist: 'Edge-TTS',
          album: 'Listen Book'
        });
      };

      this.audioElement.onended = () => {
        this.isPlaying = false;
        this.isPausedState = false;
        this.mediaSessionManager.setPlaybackState('none');
        this.eventHandlers.onEnd?.();  // 正确触发回调
        URL.revokeObjectURL(audioUrl);
        this.audioElement = null;
      };

      this.audioElement.onerror = (event) => {
        console.error('Audio playback error:', event);
        this.isPlaying = false;
        this.isPausedState = false;
        this.mediaSessionManager.setPlaybackState('none');
        const error = new Error('Audio playback failed');
        this.eventHandlers.onError?.(error);
      };

      this.audioElement.play();  // 不使用 await，立即返回
    } catch (error) {
      this.isPlaying = false;
      this.isPausedState = false;
      this.mediaSessionManager.setPlaybackState('none');
      this.eventHandlers.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  })();
}
```

**修复后的播放流程**：
```
用户点击播放
  ↓
handlePlay()
  ↓
获取当前段落 segmentToPlay
  ↓
playbackManagerRef.current.setPlaying(true)
  ↓
speechServiceRef.current.speakSegment(segmentToPlay, config, {
  onEnd: () => {
    handleNextSegment()  // 现在可以正确触发
  }
})
  ↓
EdgeTTSService.speakSegment()
  ↓
EdgeTTSService.speak() (void)
  ↓
立即返回，不等待
  ↓
IIFE 异步逻辑执行
  ↓
fetch audio blob
  ↓
URL.createObjectURL(blob)
  ↓
audioElement = new Audio(audioUrl)
  ↓
audioElement.onended = () => {
  this.eventHandlers.onEnd?.()  // 音频播放结束后触发
}
  ↓
audioElement.play()
  ↓
音频播放结束
  ↓
audioElement.onended 触发
  ↓
handlers.onEnd()
  ↓
handleNextSegment()
  ↓
获取下一段 nextSegment
  ↓
speechServiceRef.current.speakSegment(nextSegment, ...)
  ↓
循环直到没有下一段
```

### 4.3 核心问题代码分析

**page.tsx 中的问题代码**：
```typescript
const handlePlay = () => {
  if (!speechServiceRef.current || !playbackManagerRef.current) return;

  const state = playbackManagerRef.current.getState();
  
  if (state.isPaused) {
    speechServiceRef.current.resume();
    playbackManagerRef.current.setPaused(false);
    return;
  }

  let segmentToPlay: TextSegment | undefined;

  if (state.currentSegmentId !== null) {
    segmentToPlay = playbackManagerRef.current.getCurrentSegment();
  } else if (state.segments.length > 0) {
    segmentToPlay = state.segments[0];
    playbackManagerRef.current.setCurrentSegmentId(0);
  }

  if (segmentToPlay) {
    playbackManagerRef.current.setPlaying(true);
    speechServiceRef.current.speakSegment(segmentToPlay, state.config, {
      onStart: () => {},
      onEnd: () => {
        handleNextSegment();  // 问题：这里没有 await
      },
      onError: (error) => {
        console.error('Speech error:', error);
        playbackManagerRef.current?.setPlaying(false);
      }
    });
  }
};
```

**EdgeTTSService.ts 中的问题代码**：
```typescript
async speak(text: string, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): Promise<void> {
  this.stop();
  
  this.currentText = text;
  this.currentConfig = config;
  this.eventHandlers = handlers;
  this.isPlaying = true;
  this.isPausedState = false;

  this.eventHandlers.onStart?.();

  try {
    const detectedLang = this.detectLanguage(text);
    const voiceName = config.voiceURI || this.getDefaultVoiceForLanguage(detectedLang);

    const requestBody = {
      model: 'tts-1',
      input: text,
      voice: voiceName
    };

    const response = await fetch(`${this.proxyUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge-TTS request failed: ${response.statusText} - ${errorText}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);

    this.audioElement = new Audio(audioUrl);
    
    this.audioElement.onplay = () => {
      this.mediaSessionManager.setPlaybackState('playing');
      this.mediaSessionManager.setMetadata({
        title: '文本朗读',
        artist: 'Edge-TTS',
        album: 'Listen Book'
      });
    };

    this.audioElement.onended = () => {
      this.isPlaying = false;
      this.isPausedState = false;
      this.mediaSessionManager.setPlaybackState('none');
      this.eventHandlers.onEnd?.();  // 问题：这里触发回调
      URL.revokeObjectURL(audioUrl);
      this.audioElement = null;
    };

    this.audioElement.onerror = (event) => {
      console.error('Audio playback error:', event);
      this.isPlaying = false;
      this.isPausedState = false;
      this.mediaSessionManager.setPlaybackState('none');
      const error = new Error('Audio playback failed');
      this.eventHandlers.onError?.(error);
    };

    await this.audioElement.play();  // 问题：这里等待播放完成
  } catch (error) {
    this.isPlaying = false;
    this.isPausedState = false;
    this.mediaSessionManager.setPlaybackState('none');
    this.eventHandlers.onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}
```

**问题总结**：
1. `EdgeTTSService.speak()` 是 async 方法，返回 Promise
2. `await this.audioElement.play()` 会等待音频播放完成
3. 但是 `audioElement.onended` 回调在音频结束时触发
4. 这导致 `onEnd` 回调在 `speak()` 方法返回后才触发
5. 而 page.tsx 中的 `handleNextSegment()` 没有等待 `speak()` 完成

## 5. 社区最佳实践调研

### 5.1 音频连续播放方案

根据搜索结果，社区有以下几种方案：

#### 方案1：使用 HTMLAudioElement 的 ended 事件
```javascript
const audio = new Audio(url);
audio.onended = () => {
  // 播放下一段
  playNextSegment();
};
audio.play();
```

**优点**：简单直接
**缺点**：需要手动管理音频队列

#### 方案2：使用 Web Audio API 的 AudioBuffer
```javascript
const audioContext = new AudioContext();
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.onended = () => {
  // 播放下一段
  playNextSegment();
};
source.connect(audioContext.destination);
source.start();
```

**优点**：更底层的控制，可以实现无缝衔接
**缺点**：需要手动解码音频数据

#### 方案3：使用音频队列（Queue）模式
```javascript
class AudioQueue {
  constructor() {
    this.queue = [];
    this.current = null;
  }

  add(url) {
    this.queue.push(url);
    if (!this.current) {
      this.playNext();
    }
  }

  playNext() {
    if (this.queue.length === 0) {
      this.current = null;
      return;
    }

    const url = this.queue.shift();
    this.current = new Audio(url);
    this.current.onended = () => {
      this.current = null;
      this.playNext();
    };
    this.current.play();
  }
}
```

**优点**：自动管理队列，支持预加载
**缺点**：需要额外的队列管理逻辑

#### 方案4：使用 SeamlessLoop 库
根据搜索结果，SeamlessLoop 2.0 是一个专注于解决音频无缝衔接的 JavaScript 库。

**核心技术**：双缓冲和定时间隔
**优点**：实现无缝衔接
**缺点**：主要用于循环播放，不太适合段落播放

### 5.2 TTS 流式播放方案

根据搜索结果，流式 TTS 播放有以下方案：

#### 方案1：使用 WebSocket 实时传输音频
```javascript
const ws = new WebSocket('wss://api.example.com/tts/stream');
ws.onmessage = (event) => {
  const audioData = event.data;
  // 实时播放音频数据
  playAudioChunk(audioData);
};
```

**优点**：低延迟，实时性好
**缺点**：需要服务端支持流式传输

#### 方案2：使用 HTTP 分块传输
```javascript
const response = await fetch('https://api.example.com/tts/stream', {
  headers: {
    'Accept': 'audio/mpeg'
  }
});
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 播放音频块
  playAudioChunk(value);
}
```

**优点**：兼容性好，易于实现
**缺点**：需要手动管理音频缓冲

### 5.3 推荐方案

基于当前项目的技术栈和需求，推荐以下方案：

**方案 A：修复现有代码（最小改动）**
- 修改 `EdgeTTSService.speak()` 方法，移除 `await this.audioElement.play()`
- 让 `onended` 事件自然触发 `onEnd` 回调
- 确保 `handleNextSegment()` 正确等待

**方案 B：实现音频队列（推荐）**
- 创建 `AudioQueue` 类管理音频播放队列
- 支持预加载下一段音频
- 实现无缝衔接

**方案 C：使用 Web Audio API（最佳体验）**
- 使用 `AudioContext` 和 `AudioBufferSourceNode`
- 实现更精确的音频控制
- 支持音频混合和效果处理

## 6. 状态设计总结

### 6.1 状态流转图

```
初始状态
  ↓
输入文本
  ↓
分割段落
  ↓
[未播放状态]
  ↓
点击播放
  ↓
[播放中状态]
  ↓
点击暂停 → [暂停状态]
  ↓
点击继续 → [播放中状态]
  ↓
点击停止 → [未播放状态]
  ↓
播放完成 → [未播放状态]
```

### 6.2 状态转换规则

1. **未播放 → 播放中**：
   - 条件：有段落且点击播放
   - 动作：设置 `isPlaying = true`, `isPaused = false`

2. **播放中 → 暂停**：
   - 条件：点击暂停
   - 动作：调用 `pause()`, 设置 `isPaused = true`

3. **暂停 → 播放中**：
   - 条件：点击继续
   - 动作：调用 `resume()`, 设置 `isPaused = false`

4. **播放中 → 未播放**：
   - 条件：播放完成或点击停止
   - 动作：设置 `isPlaying = false`, `isPaused = false`

### 6.3 状态传递链

```
PlaybackStateManager (数据层)
  ↓ subscribe(listener)
  ↓ notify()
  ↓
Page 组件 (状态层)
  ↓ setPlaybackState()
  ↓
PlaybackControlSection (表现层)
  ↓
ConfigSection (表现层)
```

## 7. 依赖关系图

```
Page
  ├─→ TextInputSection
  ├─→ PlaybackControlSection
  ├─→ ConfigSection
  │
  ├─→ TextSegmenter
  ├─→ PlaybackStateManager
  └─→ HybridTTSService
        ├─→ WebSpeechTTS
        │     └─→ MediaSessionManager
        └─→ EdgeTTSService
              └─→ MediaSessionManager
```

## 8. 关键问题清单

1. ~~**EdgeTTSService 连续播放问题**~~：
   - ~~根本原因：`await this.audioElement.play()` 导致方法在音频播放完成后才返回~~
   - ~~解决方案：移除 await，让 onended 事件自然触发回调~~
   - **状态**：已修复 ✓

2. ~~**音频资源管理问题**~~：
   - ~~每次播放都创建新的 Audio 元素~~
   - ~~没有及时清理旧的 Audio 元素~~
   - **状态**：已通过队列模式优化 ✓

3. ~~**状态同步问题**~~：
   - ~~`isPlaying` 状态可能不准确~~
   - ~~需要确保状态和实际播放状态一致~~
   - **状态**：已通过队列模式优化 ✓

4. **错误处理问题**：
   - 网络请求失败时的降级策略
   - 音频播放失败时的重试机制

## 9. 队列模式和缓存系统

### 9.1 架构设计

#### 核心组件

1. **AudioCache** (lib/audio/AudioCache.ts)
   - 职责：管理音频 Blob 的缓存
   - 特性：
     * LRU（最近最少使用）淘汰策略
     * 支持最大缓存大小限制（默认 50MB）
     * 支持最大缓存条目数限制（默认 100 条）
     * 支持 TTL（生存时间）机制（默认 30 分钟）
   - 核心方法：
     * `set(key, blob)`: 存储音频 Blob
     * `get(key)`: 获取音频 Blob
     * `has(key)`: 检查缓存是否存在
     * `delete(key)`: 删除缓存条目
     * `clear()`: 清空所有缓存
     * `size()`: 获取缓存条目数
     * `getCurrentSize()`: 获取当前缓存大小

2. **AudioPreloader** (lib/audio/AudioPreloader.ts)
   - 职责：管理音频预加载任务
   - 特性：
     * 支持并发限制（默认 2 个并发请求）
     * 支持任务优先级
     * 支持任务取消
   - 核心方法：
     * `preload(requests)`: 预加载多个音频
     * `cancel(id)`: 取消特定预加载任务
     * `cancelAll()`: 取消所有预加载任务
     * `getActiveCount()`: 获取当前活跃任务数

3. **AudioQueue** (lib/audio/AudioQueue.ts)
   - 职责：管理音频播放队列
   - 特性：
     * 自动管理音频播放顺序
     * 支持预加载（默认预加载 3 段）
     * 支持暂停/恢复
     * 支持跳转到指定段落
   - 核心方法：
     * `play()`: 开始播放队列
     * `pause()`: 暂停播放
     * `resume()`: 恢复播放
     * `stop()`: 停止播放
     * `seek(index)`: 跳转到指定段落
     * `getCurrentIndex()`: 获取当前播放段落索引
     * `isQueuePlaying()`: 检查是否正在播放
     * `isQueuePaused()`: 检查是否暂停
     * `getCacheStats()`: 获取缓存统计信息
     * `clearCache()`: 清空缓存

4. **AudioQueueManager** (lib/audio/AudioQueueManager.ts)
   - 职责：管理音频队列的高级接口
   - 特性：
     * 统一管理缓存和预加载
     * 提供配置接口
   - 核心方法：
     * `play()`: 开始播放
     * `pause()`: 暂停播放
     * `resume()`: 恢复播放
     * `stop()`: 停止播放
     * `seek(index)`: 跳转到指定段落
     * `getCurrentIndex()`: 获取当前播放段落索引
     * `getCacheStats()`: 获取缓存统计信息
     * `clearCache()`: 清空缓存
     * `setSegments(segments)`: 设置段落列表
     * `setConfig(config)`: 设置配置
     * `setHandlers(handlers)`: 设置事件处理器

### 9.2 队列模式集成

#### EdgeTTSService 集成

```typescript
class EdgeTTSService {
  private audioQueueManager: AudioQueueManager | null = null;
  private useQueueMode: boolean = false;

  enableQueueMode(enable: boolean = true): void {
    this.useQueueMode = enable;
    if (enable && !this.audioQueueManager) {
      this.audioQueueManager = new AudioQueueManager(
        async (text: string, signal: AbortSignal) => {
          // 音频获取逻辑
        },
        {
          cacheOptions: {
            maxSize: 50 * 1024 * 1024,  // 50MB
            maxEntries: 100,
            ttl: 30 * 60 * 1000         // 30分钟
          },
          preloadOptions: {
            concurrentLimit: 2,
            preloadAhead: 3
          }
        }
      );
    }
  }

  async playQueue(): Promise<void> {
    if (this.audioQueueManager) {
      await this.audioQueueManager.play();
    }
  }

  pauseQueue(): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.pause();
    }
  }

  async resumeQueue(): Promise<void> {
    if (this.audioQueueManager) {
      await this.audioQueueManager.resume();
    }
  }

  stopQueue(): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.stop();
    }
  }

  seekQueue(index: number): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.seek(index);
    }
  }

  getQueueCurrentIndex(): number {
    return this.audioQueueManager?.getCurrentIndex() ?? 0;
  }

  getCacheStats(): { size: number; currentSize: number } | null {
    return this.audioQueueManager?.getCacheStats() ?? null;
  }

  clearCache(): void {
    if (this.audioQueueManager) {
      this.audioQueueManager.clearCache();
    }
  }
}
```

#### HybridTTSService 集成

```typescript
class HybridTTSService {
  private useQueueMode: boolean = false;
  private allSegments: TextSegment[] = [];
  private queueCurrentIndex: number = 0;

  enableQueueMode(enable: boolean): void {
    this.useQueueMode = enable;
    this.edgeTTSService.enableQueueMode(enable);
  }

  isQueueModeEnabled(): boolean {
    return this.useQueueMode;
  }

  setSegments(segments: TextSegment[]): void {
    this.allSegments = segments;
    this.edgeTTSService.setSegments(segments);
  }

  getQueueSegments(): TextSegment[] {
    return this.allSegments;
  }

  playAllSegments(segments: TextSegment[], startIndex: number = 0, config: TTSConfig = {}, handlers: SpeechEventHandlers = {}): void {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      this.allSegments = segments;
      this.queueCurrentIndex = startIndex;
      this.edgeTTSService.setSegments(segments);
      this.edgeTTSService.setConfig(config);
      this.edgeTTSService.setHandlers(handlers);
      this.edgeTTSService.playQueue();
      return;
    }
    this.speak(segments[startIndex].text, config, handlers);
  }

  async resume(): Promise<void> {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      await this.edgeTTSService.resumeQueue();
    } else {
      this.currentService.resume();
    }
  }

  pauseQueue(): void {
    this.edgeTTSService.pauseQueue();
  }

  stopQueue(): void {
    this.edgeTTSService.stopQueue();
  }

  seekQueue(index: number): void {
    this.edgeTTSService.seekQueue(index);
  }
}
```

### 9.3 队列模式播放流程

```
用户点击播放
  ↓
handlePlay()
  ↓
检查是否使用 HybridTTSService
  ↓
调用 playAllSegments(segments, startIndex, config, handlers)
  ↓
HybridTTSService.playAllSegments()
  ↓
检查是否启用队列模式且使用 EdgeTTS
  ↓
设置段落列表、配置和事件处理器
  ↓
调用 EdgeTTSService.playQueue()
  ↓
AudioQueueManager.play()
  ↓
AudioQueue.play()
  ↓
AudioQueue.playSegment(currentIndex)
  ↓
获取音频 URL（从缓存或网络）
  ↓
创建 Audio 元素并播放
  ↓
触发预加载（预加载后 3 段）
  ↓
音频播放结束
  ↓
audioElement.onended 触发
  ↓
currentIndex++
  ↓
播放下一段
  ↓
循环直到所有段落播放完成
  ↓
触发 onEnd 回调
```

### 9.4 预加载机制

#### 预加载策略

```typescript
private triggerPreload(currentIndex: number): void {
  const preloadRequests: PreloadRequest[] = [];
  const preloadAhead = 3;  // 预加载 3 段

  for (let i = 1; i <= preloadAhead; i++) {
    const nextIndex = currentIndex + i;
    if (nextIndex >= this.segments.length) {
      break;
    }

    const segment = this.segments[nextIndex];
    const cacheKey = this.getCacheKey(segment);

    if (!this.cache.has(cacheKey)) {
      preloadRequests.push({
        id: cacheKey,
        text: segment.text,
        priority: preloadAhead - i + 1  // 优先级：下一段 > 下下段 > 下下下段
      });
    }
  }

  if (preloadRequests.length > 0) {
    this.preloader.preload(preloadRequests);
  }
}
```

#### 预加载流程

```
当前播放第 N 段
  ↓
检查缓存中是否有 N+1、N+2、N+3 段
  ↓
对于未缓存的段落：
  ↓
创建预加载请求
  ↓
AudioPreloader.preload(requests)
  ↓
根据并发限制（默认 2）执行预加载
  ↓
获取音频 Blob
  ↓
存入 AudioCache
  ↓
等待播放时直接从缓存获取
```

### 9.5 缓存机制

#### LRU 淘汰策略

```typescript
private evictIfNeeded(): void {
  while (this.currentSize > this.maxSize || this.entries.size > this.maxEntries) {
    const oldestKey = this.lruQueue.shift();
    if (oldestKey) {
      const entry = this.entries.get(oldestKey);
      if (entry) {
        URL.revokeObjectURL(entry.url);
        this.currentSize -= entry.size;
        this.entries.delete(oldestKey);
      }
    }
  }
}
```

#### 缓存键生成

```typescript
private getCacheKey(segment: QueueSegment): string {
  return `segment_${segment.index}_${segment.text.slice(0, 50)}`;
}
```

#### 缓存流程

```
请求音频
  ↓
生成缓存键
  ↓
检查缓存是否存在
  ↓
存在：
  ↓
  更新 LRU 队列
  ↓
  返回缓存 URL
  ↓
不存在：
  ↓
  从网络获取音频 Blob
  ↓
  创建 Object URL
  ↓
  存入缓存
  ↓
  检查是否需要淘汰（LRU）
  ↓
  返回 Object URL
```

### 9.6 双指针管理

#### cursor_text（当前渲染到的文字位置）

- 由 `PlaybackStateManager` 维护
- 表示当前正在显示/高亮的段落
- 通过 `currentSegmentId` 标识

#### cursor_audio（当前音频播放到的位置）

- 由 `AudioQueue` 维护
- 表示当前正在播放的音频段落
- 通过 `currentIndex` 标识

#### 双指针同步

```typescript
audioElement.onended = () => {
  this.handlers.onSegmentEnd?.(segment);
  this.currentIndex++;  // cursor_audio 前进
  
  if (this.isPlaying) {
    this.playSegment(this.currentIndex);
  }
};

// 在 page.tsx 中
const handlePlay = async () => {
  // ...
  if (speechServiceRef.current instanceof HybridTTSService) {
    speechServiceRef.current.playAllSegments(state.segments, startIndex, state.config, {
      onSegmentStart: (segment) => {
        // 更新 cursor_text
        playbackManagerRef.current?.setCurrentSegmentId(segment.id);
      },
      onSegmentEnd: (segment) => {
        // 段落播放结束
      },
      onEnd: () => {
        playbackManagerRef.current?.setPlaying(false);
      },
      onError: (error) => {
        console.error('Speech error:', error);
        playbackManagerRef.current?.setPlaying(false);
      }
    });
  }
};
```

### 9.7 队列模式配置

#### 默认配置

```typescript
{
  cacheOptions: {
    maxSize: 50 * 1024 * 1024,  // 50MB 缓存大小
    maxEntries: 100,            // 最多 100 个缓存条目
    ttl: 30 * 60 * 1000         // 30 分钟 TTL
  },
  preloadOptions: {
    concurrentLimit: 2,         // 最多 2 个并发预加载
    preloadAhead: 3             // 预加载 3 段
  }
}
```

#### 配置调优建议

1. **缓存大小**：
   - 小文本（< 1000 字符）：10-20 MB
   - 中等文本（1000-5000 字符）：50 MB
   - 大文本（> 5000 字符）：100-200 MB

2. **并发限制**：
   - 网络较慢：1-2 个并发
   - 网络较快：2-4 个并发

3. **预加载段数**：
   - 短段落（< 50 字符）：3-5 段
   - 中等段落（50-100 字符）：2-3 段
   - 长段落（> 100 字符）：1-2 段

### 9.8 队列模式优势

1. **性能提升**：
   - 预加载减少播放等待时间
   - 缓存减少重复网络请求
   - LRU 淘汰策略优化内存使用

2. **用户体验**：
   - 播放更流畅，减少卡顿
   - 支持暂停/恢复
   - 支持跳转到任意段落

3. **资源管理**：
   - 自动清理过期缓存
   - 自动淘汰最少使用的缓存
   - 支持手动清空缓存

4. **可扩展性**：
   - 支持自定义配置
   - 支持事件监听
   - 支持状态查询

## 10. 重构建议

### 9.1 短期修复（最小改动）

1. 修改 `EdgeTTSService.speak()` 方法
2. 移除 `await this.audioElement.play()`
3. 确保 `onended` 事件正确触发回调

### 9.2 中期优化（音频队列）

1. 创建 `AudioQueue` 类
2. 实现音频预加载
3. 支持无缝衔接

### 9.3 长期改进（Web Audio API）

1. 使用 `AudioContext` 替代 `HTMLAudioElement`
2. 实现更精确的音频控制
3. 支持音频效果处理

## 10. 测试建议

1. **单元测试**：
   - TextSegmenter 分割逻辑
   - PlaybackStateManager 状态管理
   - 各 TTS 服务的基本功能

2. **集成测试**：
   - 连续播放流程
   - 暂停/恢复功能
   - 服务切换逻辑

3. **端到端测试**：
   - 完整的用户交互流程：输入文本 → 播放 → 暂停 → 继续 → 停止
   - 边界情况：空文本、单段落、多段落
   - 错误情况：网络失败、音频加载失败
