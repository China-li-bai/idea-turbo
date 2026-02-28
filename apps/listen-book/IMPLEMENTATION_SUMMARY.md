# 语音识别分层架构实现总结

## 🎯 设计目标

本架构旨在实现一个灵活、可扩展的语音识别系统，支持多种识别引擎的动态切换，同时保持代码的模块化和可维护性。

## 📁 文件结构

```
apps/listen-book/
├── lib/
│   └── recognition/
│       ├── index.ts                    # 导出所有模块
│       ├── engine.ts                   # 抽象基类和接口定义
│       ├── webSpeechEngine.ts          # Web Speech API 实现
│       ├── sherpaOnnxEngine.ts         # Sherpa-onnx 实现
│       └── manager.ts                 # 识别引擎管理器
├── components/
│   └── VoiceConversation.tsx           # 语音对话组件
├── RECOGNITION_ARCHITECTURE.md         # 架构设计文档
└── DEPENDENCIES.md                     # 依赖管理文档
```

## 🏗️ 架构分层

### 1. 抽象层 (engine.ts)

定义了统一的识别引擎接口，所有识别引擎必须实现此接口：

```typescript
abstract class RecognitionEngine {
  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract setLanguage(language: string): void;
  abstract updateConfig(config: Partial<RecognitionConfig>): void;
  abstract getCurrentTranscript(): string;
  abstract clearTranscript(): void;
  abstract isSupported(): boolean;
  abstract destroy(): void;
  abstract getSupportedLanguages(): string[];
  abstract getLanguageName(code: string): string;
}
```

**设计原则**：
- 单一职责：只定义接口，不包含具体实现
- 开闭原则：对扩展开放，对修改关闭
- 依赖倒置：高层模块不依赖低层模块，都依赖抽象

### 2. 实现层

#### WebSpeechEngine (webSpeechEngine.ts)

基于浏览器原生 Web Speech API 的实现。

**特点**：
- 零外部依赖
- 浏览器原生支持
- 支持实时预览
- 支持音量检测
- 支持置信度显示

**核心功能**：
- 语音识别初始化和启动
- 实时转录结果处理
- 音量检测和可视化
- 静音超时检测
- 错误处理和重试机制

#### SherpaOnnxEngine (sherpaOnnxEngine.ts)

基于 Sherpa-onnx WebAssembly 的实现。

**特点**：
- 完全离线
- 高性能
- 支持流式识别
- 中文识别优秀

**核心功能**：
- WebAssembly 模型加载
- 音频流处理
- 实时识别
- 端点检测
- 模型管理

**依赖**：
- `sherpa-onnx-wasm`: Sherpa-onnx WebAssembly 包
- 模型文件：需要下载并放置在 `public/models/` 目录

### 3. 管理层 (manager.ts)

统一管理多个识别引擎，提供引擎切换和状态管理。

**核心功能**：
- 引擎实例管理
- 引擎切换
- 统一事件回调
- 状态管理（监听中、处理中、错误等）
- 配置管理
- 引擎可用性检测

**设计模式**：
- 策略模式：根据配置选择不同的识别引擎
- 观察者模式：通过回调通知状态变化
- 单例模式：每个引擎只有一个实例

### 4. 应用层 (VoiceConversation.tsx)

UI 组件，使用 RecognitionManager 提供的接口。

**核心功能**：
- UI 渲染
- 用户交互
- 调用 RecognitionManager
- 显示识别结果
- AI 对话集成
- TTS 语音输出

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

## 🎨 UI 设计

### 设置面板

- 引擎选择：Web Speech API / Sherpa-onnx
- 语言选择：支持多种语言
- 静音超时：可配置静音检测时间
- 音量检测：开关音量可视化
- 实时预览：开关实时转录预览

### 消息显示

- 用户消息：右侧显示，蓝色背景
- AI 消息：左侧显示，白色背景
- 实时预览：斜体显示，带光标动画
- 置信度：显示识别置信度百分比

### 控制区域

- 音量指示器：实时显示音量水平
- 文本输入：支持手动输入消息
- 麦克风按钮：开始/停止语音识别
- 波形动画：显示语音输入状态

## 🔧 配置选项

### 通用配置

```typescript
interface RecognitionConfig {
  engine: 'webspeech' | 'sherpa-onnx';  // 识别引擎
  language: string;                      // 语言设置
  continuous: boolean;                  // 连续识别
  interimResults: boolean;              // 实时预览
  silenceTimeout: number;                // 静音超时（毫秒）
  minConfidence: number;                // 最小置信度
  enableVolumeDetection: boolean;        // 音量检测
  enableRealtimePreview: boolean;        // 实时预览
}
```

### 引擎特定配置

#### WebSpeech 配置

```typescript
interface WebSpeechConfig extends RecognitionConfig {
  maxAlternatives: number;  // 最大备选结果数
  autoRestart: boolean;     // 自动重启
}
```

#### Sherpa-onnx 配置

```typescript
interface SherpaOnnxConfig extends RecognitionConfig {
  modelPath: string;     // 模型路径
  tokensPath: string;    // Token 文件路径
  sampleRate: number;    // 采样率
  featureDim: number;    // 特征维度
}
```

## 🚀 使用示例

### 基本使用

```typescript
import { RecognitionManager } from '@/lib/recognition/manager';

const manager = new RecognitionManager({
  engine: 'webspeech',
  language: 'zh-CN',
  continuous: true,
  interimResults: true,
  silenceTimeout: 3000,
  minConfidence: 0.5,
  enableVolumeDetection: true,
  enableRealtimePreview: true
}, {
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
  language: 'en-US',
  enableVolumeDetection: false,
  silenceTimeout: 5000
});
```

## 📦 依赖管理

### 核心依赖

- **sherpa-onnx-wasm** (可选): Sherpa-onnx WebAssembly 包
  - 仅在使用 Sherpa-onnx 引擎时需要
  - 版本: `^1.0.0`
  - 安装: `npm install sherpa-onnx-wasm`

### 模型文件

Sherpa-onnx 需要模型文件：

```
public/models/
├── sherpa-onnx-streaming-zipformer-zh-2023-02-20/
│   ├── encoder.onnx
│   ├── decoder.onnx
│   ├── joiner.onnx
│   └── tokens.txt
```

下载地址：
- 中文模型: https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2
- 英文模型: https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-en-2023-02-20.tar.bz2

## 🎯 设计原则

1. **开闭原则**: 对扩展开放，对修改关闭
2. **单一职责**: 每层只负责自己的职责
3. **依赖倒置**: 高层不依赖低层，都依赖抽象
4. **接口隔离**: 接口精简，职责明确
5. **里氏替换**: 任何引擎都可以替换使用

## 🔒 错误处理

### 引擎不支持

当浏览器不支持某个引擎时：
- 记录警告日志
- 显示友好提示
- 自动回退到可用引擎

### 模型加载失败

当 Sherpa-onnx 模型加载失败时：
- 记录错误日志
- 显示错误提示
- 自动回退到 Web Speech API

### 识别错误

当识别过程中发生错误时：
- 记录错误详情
- 显示错误提示
- 尝试自动恢复

## 🧪 测试策略

1. **单元测试**: 每个引擎独立测试
2. **集成测试**: 管理器与引擎集成测试
3. **E2E 测试**: 完整流程测试
4. **性能测试**: 识别速度、准确率测试

## 📚 参考资料

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
- [Sherpa-onnx WebAssembly](https://github.com/k2-fsa/sherpa-onnx/tree/master/sherpa-onnx-wasm)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本代码遵循项目的许可证。
