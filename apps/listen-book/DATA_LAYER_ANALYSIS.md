# Listen Book 数据层分析文档

## 1. 数据格式定义

### 1.1 TextSegment（文本片段）
**文件位置**: `lib/textSegmenter.ts`

```typescript
export interface TextSegment {
  id: number;           // 片段唯一标识
  text: string;         // 片段文本内容
  startIndex: number;   // 在原文中的起始索引
  endIndex: number;     // 在原文中的结束索引
}
```

**用途**: 将长文本分割成可独立播放的句子片段。

### 1.2 TTSConfig（TTS 配置）
**文件位置**: `lib/tts/types.ts`

```typescript
export interface TTSConfig {
  voiceURI?: string;    // 语音 URI
  rate?: number;        // 语速（默认 1.0）
  pitch?: number;       // 音调（默认 1.0）
  volume?: number;      // 音量（默认 1.0）
}
```

**用途**: 配置文本转语音的参数。

### 1.3 PlaybackState（播放状态）
**文件位置**: `lib/playbackState.ts`

```typescript
export interface PlaybackState {
  segments: TextSegment[];        // 所有文本片段
  currentSegmentId: number | null; // 当前播放片段 ID
  isPlaying: boolean;             // 是否正在播放
  isPaused: boolean;              // 是否暂停
  config: TTSConfig;              // 当前 TTS 配置
  text: string;                   // 原始文本
}
```

**用途**: 管理整个应用的播放状态。

### 1.4 SpeechEventHandlers（语音事件处理器）
**文件位置**: `lib/speechService.ts`

```typescript
export interface SpeechEventHandlers {
  onStart?: () => void;                              // 开始播放时触发
  onEnd?: () => void;                                // 播放结束时触发
  onError?: (error: SpeechSynthesisErrorEvent) => void;  // 错误时触发
  onBoundary?: (event: SpeechSynthesisEvent) => void;  // 边界事件触发
}
```

**用途**: 处理语音播放过程中的各种事件。

## 2. 核心类和组件

### 2.1 TextSegmenter（文本分割器）
**文件位置**: `lib/textSegmenter.ts`

**职责**:
- 将长文本分割成句子片段
- 使用 `Intl.Segmenter` API 进行句子分割
- 提供降级方案（正则表达式分割）

**主要方法**:
- `segment(text: string): TextSegment[]` - 分割文本
- `getSegmentById(segments: TextSegment[], id: number)` - 根据 ID 获取片段
- `getNextSegment(segments: TextSegment[], currentId: number)` - 获取下一个片段
- `getPreviousSegment(segments: TextSegment[], currentId: number)` - 获取上一个片段

**数据流转**:
```
原始文本 → TextCleaner.clean() → TextSegmenter.segment() → TextSegment[]
```

### 2.2 PlaybackStateManager（播放状态管理器）
**文件位置**: `lib/playbackState.ts`

**职责**:
- 管理播放状态
- 提供状态订阅机制
- 提供片段导航方法

**主要方法**:
- `getState(): PlaybackState` - 获取当前状态
- `subscribe(listener): () => void` - 订阅状态变化
- `setText(text: string)` - 设置文本
- `setSegments(segments: TextSegment[])` - 设置片段列表
- `setCurrentSegmentId(id: number | null)` - 设置当前片段 ID
- `setPlaying(isPlaying: boolean)` - 设置播放状态
- `setPaused(isPaused: boolean)` - 设置暂停状态
- `setConfig(config: Partial<TTSConfig>)` - 更新配置
- `getCurrentSegment(): TextSegment | undefined` - 获取当前片段
- `getNextSegment(): TextSegment | undefined` - 获取下一个片段
- `getPreviousSegment(): TextSegment | undefined` - 获取上一个片段
- `reset()` - 重置状态

**状态传递**:
```
PlaybackStateManager → subscribe(listener) → React setState → UI 更新
```

### 2.3 HybridTTSService（混合 TTS 服务）
**文件位置**: `lib/tts/HybridTTSService.ts`

**职责**:
- 整合 Web Speech API 和 Edge-TTS
- 根据文本长度自动选择服务
- 提供服务降级机制

**配置接口**:
```typescript
export interface HybridTTSConfig {
  edgeTTSProxyUrl?: string;      // Edge-TTS 代理 URL
  autoSwitchThreshold?: number;  // 自动切换阈值（默认 100 字符）
  enableAutoSwitch?: boolean;    // 是否启用自动切换
  preferredService?: TTSServiceType; // 首选服务
}
```

**主要方法**:
- `speak(text: string, config, handlers)` - 播放文本
- `speakSegment(segment, config, handlers)` - 播放片段
- `pause()` - 暂停
- `resume()` - 恢复
- `stop()` - 停止
- `getVoices()` - 获取可用语音
- `setServiceType(type)` - 设置服务类型
- `refreshEdgeTTSVoices()` - 刷新 Edge-TTS 语音列表

**数据流转**:
```
TextSegment → HybridTTSService.selectService() → WebSpeechTTS / EdgeTTSService → 音频播放
```

## 3. 数据流转图

### 3.1 初始化流程
```
页面加载
  ↓
创建 TextSegmenter 实例
  ↓
创建 HybridTTSService 实例
  ↓
创建 PlaybackStateManager 实例
  ↓
订阅状态变化
  ↓
加载语音列表
```

### 3.2 文本输入和分割流程
```
用户输入文本
  ↓
handleTextChange(newText)
  ↓
PlaybackStateManager.setText(newText)
  ↓
TextSegmenter.segment(newText)
  ↓
PlaybackStateManager.setSegments(segments)
  ↓
状态更新通知订阅者
  ↓
UI 更新
```

### 3.3 播放流程
```
用户点击播放
  ↓
handlePlay()
  ↓
获取当前片段（currentSegmentId 或第一个片段）
  ↓
PlaybackStateManager.setPlaying(true)
  ↓
HybridTTSService.speakSegment(segment, config, handlers)
  ↓
选择服务（WebSpeech 或 Edge-TTS）
  ↓
播放音频
  ↓
onEnd 事件触发
  ↓
handleNextSegment()
  ↓
获取下一个片段
  ↓
继续播放或结束
```

### 3.4 状态更新流程
```
状态变化
  ↓
PlaybackStateManager.notify()
  ↓
遍历所有订阅者
  ↓
调用 listener(state)
  ↓
React setState
  ↓
UI 重新渲染
```

## 4. 状态设计

### 4.1 状态结构
```typescript
{
  segments: TextSegment[],      // 所有片段
  currentSegmentId: number | null,  // 当前播放位置
  isPlaying: boolean,           // 播放状态
  isPaused: boolean,            // 暂停状态
  config: TTSConfig,            // TTS 配置
  text: string                  // 原始文本
}
```

### 4.2 状态变化触发条件
1. **文本变化**: 用户输入文本时
2. **片段变化**: 文本分割后
3. **播放状态变化**: 播放、暂停、停止时
4. **配置变化**: 用户修改 TTS 配置时
5. **片段导航**: 切换到上一个/下一个片段时

### 4.3 状态传递机制
- 使用观察者模式（Observer Pattern）
- `PlaybackStateManager` 维护订阅者列表
- 状态变化时通知所有订阅者
- React 组件通过 `subscribe` 方法订阅状态变化

## 5. 关键依赖关系

### 5.1 组件依赖
```
page.tsx
  ├── TextSegmenter
  ├── HybridTTSService
  │   ├── WebSpeechTTS
  │   └── EdgeTTSService
  ├── PlaybackStateManager
  └── React Components
      ├── TextInputSection
      ├── PlaybackControlSection
      └── ConfigSection
```

### 5.2 数据依赖
```
TextSegment
  ├── id: number
  ├── text: string
  ├── startIndex: number
  └── endIndex: number

PlaybackState
  ├── segments: TextSegment[]
  ├── currentSegmentId: number | null
  ├── isPlaying: boolean
  ├── isPaused: boolean
  ├── config: TTSConfig
  └── text: string

TTSConfig
  ├── voiceURI?: string
  ├── rate?: number
  ├── pitch?: number
  └── volume?: number
```

## 6. 重构注意事项

### 6.1 不要改动的部分
1. **page.tsx 的核心逻辑**: 保持现有的状态管理和事件处理流程
2. **数据格式**: TextSegment、TTSConfig、PlaybackState 接口保持不变
3. **状态管理**: PlaybackStateManager 的接口和行为保持不变
4. **用户交互**: 保持现有的用户交互流程

### 6.2 可以扩展的部分
1. **添加新的服务**: 可以在 HybridTTSService 中添加新的 TTS 服务
2. **优化缓存**: 可以添加音频缓存机制
3. **优化预加载**: 可以添加音频预加载机制
4. **优化性能**: 可以优化文本分割和音频播放性能

### 6.3 重构原则
1. **保持向后兼容**: 新功能不应破坏现有功能
2. **最小化改动**: 只修改必要的部分
3. **渐进式重构**: 逐步添加新功能，确保每一步都能正常工作
4. **充分测试**: 每次修改后都要进行测试

## 7. 新增的缓存和预加载系统

### 7.1 AudioCache（音频缓存）
**文件位置**: `lib/audio/AudioCache.ts`

**职责**:
- 缓存音频 Blob
- 管理 URL 生命周期
- 实现 LRU 淘汰策略

### 7.2 AudioPreloader（音频预加载器）
**文件位置**: `lib/audio/AudioPreloader.ts`

**职责**:
- 管理预加载队列
- 控制并发请求数量
- 支持任务取消

### 7.3 AudioQueue（音频队列）
**文件位置**: `lib/audio/AudioQueue.ts`

**职责**:
- 整合缓存和预加载
- 管理播放队列
- 自动触发预加载

### 7.4 AudioQueueManager（音频队列管理器）
**文件位置**: `lib/audio/AudioQueueManager.ts`

**职责**:
- 提供简化的接口
- 与现有 TTS 服务集成

### 7.5 EdgeTTSService 集成
**文件位置**: `lib/tts/EdgeTTSService.ts`

**新增方法**:
- `enableQueueMode(enable: boolean)` - 启用队列模式
- `setSegments(segments: TextSegment[])` - 设置片段
- `playQueue()` - 播放队列
- `pauseQueue()` - 暂停队列
- `resumeQueue()` - 恢复队列
- `stopQueue()` - 停止队列
- `seekQueue(index: number)` - 跳转到指定片段

## 8. 数据流转总结

### 8.1 输入到输出
```
用户输入文本
  ↓
TextSegmenter 分割
  ↓
TextSegment[]
  ↓
PlaybackStateManager 管理
  ↓
PlaybackState
  ↓
HybridTTSService 播放
  ↓
音频输出
```

### 8.2 状态更新
```
用户操作 / 事件触发
  ↓
状态更新方法
  ↓
PlaybackStateManager.notify()
  ↓
订阅者收到通知
  ↓
React setState
  ↓
UI 更新
```

### 8.3 播放控制
```
播放控制操作
  ↓
HybridTTSService 方法
  ↓
WebSpeechTTS / EdgeTTSService
  ↓
音频播放
  ↓
事件回调
  ↓
状态更新
```
