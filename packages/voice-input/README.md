# @idea-turbo/voice-input

🎯 **非阻塞语音输入组件库** - 提供微信风格的语音输入UI，完全异步设计，不会阻塞页面渲染。

## ✨ 特性

- 🚀 **非阻塞设计** - 异步初始化，不影响页面渲染和交互
- 🎨 **微信风格UI** - 按住说话，松开结束，符合用户习惯
- 🔧 **完全可定制** - 提供Hook和组件两种使用方式
- 📦 **零配置** - 自动处理模型加载、缓存和错误
- 🛡️ **错误隔离** - 组件错误不会影响整个应用
- 📊 **进度反馈** - 实时显示初始化进度和状态

## 📦 安装

```bash
pnpm add @idea-turbo/voice-input
```

## 🎯 快速开始

### 方式一：使用微信风格组件（推荐）

```tsx
'use client';

import { WeChatVoiceInput } from '@idea-turbo/voice-input';
import '@idea-turbo/voice-input/styles.css';

export default function VoicePage() {
  return (
    <WeChatVoiceInput
      language="zh-CN"
      autoInitialize={true}
      showProgress={true}
      onResult={(text, isFinal) => {
        console.log('识别结果:', text);
      }}
      onError={(error) => {
        console.error('错误:', error);
      }}
      onReady={() => {
        console.log('语音引擎已就绪');
      }}
    />
  );
}
```

### 方式二：使用自定义Hook

```tsx
'use client';

import { useVoiceRecognition } from '@idea-turbo/voice-input';

export default function CustomVoiceInput() {
  const {
    state,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript
  } = useVoiceRecognition({
    language: 'zh-CN',
    autoInitialize: true,
    onResult: (text, isFinal) => {
      console.log('识别结果:', text, isFinal);
    }
  });

  return (
    <div>
      <button
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        disabled={!state.isReady}
      >
        {state.isRecording ? '录音中...' : '按住说话'}
      </button>
      
      <p>{transcript.fullText}</p>
    </div>
  );
}
```

## 📖 API 文档

### WeChatVoiceInput Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `language` | `'zh-CN' \| 'en-US'` | `'zh-CN'` | 识别语言 |
| `autoInitialize` | `boolean` | `true` | 是否自动初始化 |
| `showProgress` | `boolean` | `true` | 是否显示初始化进度 |
| `showDiagnostics` | `boolean` | `false` | 是否显示诊断面板 |
| `placeholder` | `string` | `'按住下方按钮开始说话'` | 占位文本 |
| `onResult` | `(text: string, isFinal: boolean) => void` | - | 识别结果回调 |
| `onError` | `(error: string) => void` | - | 错误回调 |
| `onStatusChange` | `(status: string) => void` | - | 状态变化回调 |
| `onReady` | `() => void` | - | 引擎就绪回调 |
| `onRecordingStart` | `() => void` | - | 开始录音回调 |
| `onRecordingEnd` | `() => void` | - | 结束录音回调 |

### useVoiceRecognition Options

与 `WeChatVoiceInput Props` 相同。

### useVoiceRecognition Returns

```typescript
{
  state: {
    isReady: boolean;          // 引擎是否就绪
    isRecording: boolean;      // 是否正在录音
    isInitializing: boolean;   // 是否正在初始化
    error: string | null;      // 错误信息
    volume: number;            // 音量大小 (0-100)
    initProgress: number;      // 初始化进度 (0-100)
    initStatus: string;        // 初始化状态描述
  };
  transcript: {
    segments: string[];        // 已完成的识别片段
    currentSegment: string;    // 当前正在识别的片段
    fullText: string;          // 完整文本
  };
  initialize: () => Promise<void>;      // 手动初始化
  startRecording: () => Promise<void>;  // 开始录音
  stopRecording: () => Promise<void>;   // 停止录音
  clearTranscript: () => void;          // 清空识别结果
  retry: () => Promise<void>;           // 重试初始化
}
```

## 🎨 样式定制

组件使用纯CSS，你可以通过覆盖CSS类来自定义样式：

```css
/* 自定义按钮颜色 */
.voice-input-record-button {
  background: #your-color;
}

/* 自定义进度条颜色 */
.voice-input-progress-fill {
  background: #your-color;
}
```

## 🔧 高级用法

### 懒加载组件

```tsx
import dynamic from 'next/dynamic';

const WeChatVoiceInput = dynamic(
  () => import('@idea-turbo/voice-input').then(mod => mod.WeChatVoiceInput),
  { ssr: false }
);
```

### 手动控制初始化

```tsx
const { initialize, state } = useVoiceRecognition({
  autoInitialize: false
});

// 在需要时手动初始化
<button onClick={initialize}>
  初始化语音引擎
</button>
```

## 🐛 故障排除

### 1. Worker initialization timeout

**原因**: 模型文件下载慢或CDN无法访问

**解决方案**:
- 检查网络连接
- 使用VPN
- 等待模型缓存完成（首次需要下载约30MB）

### 2. 麦克风权限被拒绝

**解决方案**:
- 在浏览器设置中允许麦克风访问
- 使用HTTPS协议（本地开发使用localhost）

### 3. 页面卡顿

**原因**: 本包设计为非阻塞，不应该出现卡顿

**排查**:
- 检查是否有其他阻塞代码
- 查看浏览器控制台是否有错误

## 📊 性能特点

- ✅ **非阻塞初始化** - 使用Promise异步加载，不阻塞页面渲染
- ✅ **Web Worker** - 语音识别在独立线程运行
- ✅ **懒加载** - 组件和引擎按需加载
- ✅ **内存优化** - 正确清理资源和事件监听器
- ✅ **错误隔离** - 组件错误不影响整个应用

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交Issue和Pull Request！
