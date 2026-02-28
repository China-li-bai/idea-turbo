# 语音识别架构设计文档

## 📋 架构概述

本设计采用分层架构，将语音识别功能模块化，支持多种识别引擎的灵活切换。

```
┌─────────────────────────────────────────────────────────────┐
│                   VoiceConversation 组件                    │
│                  (应用层 - UI 交互)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              RecognitionManager (管理器)                  │
│         (管理层 - 引擎切换、状态管理)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ WebSpeechEngine  │      │ SherpaOnnxEngine│
│  (浏览器原生)    │      │  (离线高性能)     │
└──────────────────┘      └──────────────────┘
         │                           │
         └───────────┬───────────┘
                     ▼
              RecognitionEngine (抽象接口)
```

## 🏗️ 分层设计

### 1. 抽象层 (RecognitionEngine)

定义统一的识别引擎接口，所有识别引擎必须实现此接口。

**文件**: `lib/recognition/engine.ts`

```typescript
interface RecognitionEngine {
  // 初始化引擎
  initialize(): Promise<void>;
  
  // 开始识别
  start(): Promise<void>;
  
  // 停止识别
  stop(): Promise<void>;
  
  // 设置语言
  setLanguage(language: string): void;
  
  // 获取当前转录
  getCurrentTranscript(): string;
  
  // 清空转录
  clearTranscript(): void;
  
  // 是否支持
  isSupported(): boolean;
  
  // 销毁引擎
  destroy(): void;
}
```

### 2. 实现层

#### 2.1 WebSpeechEngine

基于浏览器原生 Web Speech API 的实现。

**文件**: `lib/recognition/webSpeechEngine.ts`

**特点**:
- 零依赖
- 浏览器原生支持
- 支持实时预览
- 支持音量检测
- 支持置信度显示

**依赖**:
- 无外部依赖
- 浏览器 API: `SpeechRecognition` 或 `webkitSpeechRecognition`

#### 2.2 SherpaOnnxEngine

基于 Sherpa-onnx WebAssembly 的实现。

**文件**: `lib/recognition/sherpaOnnxEngine.ts`

**特点**:
- 完全离线
- 高性能
- 支持流式识别
- 中文识别优秀

**依赖**:
- `sherpa-onnx-wasm`: Sherpa-onnx WebAssembly 包

### 3. 管理层 (RecognitionManager)

统一管理多个识别引擎，提供引擎切换和状态管理。

**文件**: `lib/recognition/manager.ts`

**职责**:
- 管理多个识别引擎实例
- 提供引擎切换接口
- 统一事件回调
- 状态管理（监听中、处理中、错误等）
- 配置管理

### 4. 应用层 (VoiceConversation)

UI 组件，使用 RecognitionManager 提供的接口。

**文件**: `components/VoiceConversation.tsx`

**职责**:
- UI 渲染
- 用户交互
- 调用 RecognitionManager
- 显示识别结果

## 🔄 数据流

### 识别流程

```
用户说话 → 麦克风采集 → RecognitionManager 
    → RecognitionEngine (WebSpeech/SherpaOnnx)
    → 识别结果 (interim/final)
    → RecognitionManager 处理
    → VoiceConversation 显示
```

### 配置流程

```
用户设置 → VoiceConversation 
    → RecognitionManager.updateConfig()
    → RecognitionEngine.updateConfig()
    → 引擎重新配置
```

### 引擎切换流程

```
用户切换引擎 → VoiceConversation 
    → RecognitionManager.switchEngine()
    → 停止当前引擎
    → 启动新引擎
    → 更新状态
```

## 📦 依赖管理

### 核心依赖

```json
{
  "dependencies": {
    "sherpa-onnx-wasm": "^1.0.0"
  }
}
```

### 可选依赖

- `sherpa-onnx-wasm`: 仅在使用 Sherpa-onnx 引擎时需要

### 依赖关系图

```
VoiceConversation
    ↓
RecognitionManager
    ↓
RecognitionEngine (interface)
    ↓           ↓
WebSpeechEngine  SherpaOnnxEngine
    ↓              ↓
无外部依赖    sherpa-onnx-wasm
```

## 🎯 设计原则

1. **开闭原则**: 对扩展开放，对修改关闭
2. **单一职责**: 每层只负责自己的职责
3. **依赖倒置**: 高层不依赖低层，都依赖抽象
4. **接口隔离**: 接口精简，职责明确
5. **里氏替换**: 任何引擎都可以替换使用

## 📝 使用示例

### 基本使用

```typescript
import { RecognitionManager } from '@/lib/recognition/manager';

const manager = new RecognitionManager({
  engine: 'webspeech', // 或 'sherpa-onnx'
  onResult: (result) => console.log(result),
  onError: (error) => console.error(error),
  onVolumeChange: (volume) => console.log(volume)
});

await manager.initialize();
await manager.start();
```

### 切换引擎

```typescript
await manager.switchEngine('sherpa-onnx');
```

### 更新配置

```typescript
manager.updateConfig({
  language: 'zh-CN',
  enableVolumeDetection: true,
  silenceTimeout: 3000
});
```

## 🔧 配置选项

### 通用配置

```typescript
interface RecognitionConfig {
  // 识别引擎类型
  engine: 'webspeech' | 'sherpa-onnx';
  
  // 语言设置
  language: string;
  
  // 连续识别
  continuous: boolean;
  
  // 实时预览
  interimResults: boolean;
  
  // 静音超时（毫秒）
  silenceTimeout: number;
  
  // 音量检测
  enableVolumeDetection: boolean;
  
  // 最小置信度
  minConfidence: number;
}
```

### 引擎特定配置

#### WebSpeech 配置

```typescript
interface WebSpeechConfig extends RecognitionConfig {
  maxAlternatives: number;
  autoRestart: boolean;
}
```

#### Sherpa-onnx 配置

```typescript
interface SherpaOnnxConfig extends RecognitionConfig {
  modelPath: string;
  tokensPath: string;
  sampleRate: number;
  featureDim: number;
}
```

## 🚀 性能优化

1. **懒加载**: Sherpa-onnx 模型按需加载
2. **缓存**: 已加载的模型缓存
3. **防抖**: 识别结果防抖处理
4. **节流**: 音量检测节流
5. **WebWorker**: Sherpa-onnx 在 WebWorker 中运行

## 🧪 测试策略

1. **单元测试**: 每个引擎独立测试
2. **集成测试**: 管理器与引擎集成测试
3. **E2E 测试**: 完整流程测试
4. **性能测试**: 识别速度、准确率测试

## 📚 参考资料

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
- [Sherpa-onnx WebAssembly](https://github.com/k2-fsa/sherpa-onnx/tree/master/sherpa-onnx-wasm)
