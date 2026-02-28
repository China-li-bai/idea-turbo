# 语音识别依赖管理文档

## 📦 核心依赖

### Web Speech API（默认）

**用途**: 浏览器原生语音识别

**版本**: 无需安装

**说明**:
- 浏览器原生支持，无需任何额外依赖
- 支持实时预览和音量检测
- 需要网络连接
- 识别准确率中等

**浏览器支持**:
- Chrome/Edge: ✅ 完全支持
- Safari: ✅ 完全支持
- Firefox: ⚠️ 部分支持
- 其他浏览器: ❌ 不支持

### Sherpa-onnx（可选）

**用途**: 离线高性能语音识别引擎

**版本**: WebAssembly 版本

**说明**:
- 完全离线，无需网络连接
- 识别准确率高，特别是中文
- 需要下载模型文件
- 首次加载较慢
- 占用内存较大

**重要**: Sherpa-onnx **不是通过 npm 包安装的**，而是通过 WebAssembly 在浏览器中运行。

## 🔧 Sherpa-onnx 配置说明

### 文件结构

Sherpa-onnx 需要以下文件：

```
public/
├── sherpa-onnx-wasm-main.js      # WebAssembly JavaScript 胶水代码
├── sherpa-onnx-wasm-main.wasm    # WebAssembly 二进制文件
├── sherpa-worker.js              # Web Worker 脚本
└── models/
    └── sherpa-onnx-streaming-zipformer-zh-2023-02-20/
        ├── encoder-epoch-99-avg-1.int8.onnx
        ├── decoder-epoch-99-avg-1.onnx
        ├── joiner-epoch-99-avg-1.int8.onnx
        └── tokens.txt
```

### 下载方式

#### 1. 下载 WebAssembly 文件

```bash
# 下载 JS 文件
curl -L -o public/sherpa-onnx-wasm-main.js \
  https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/wasm/asr/sherpa-onnx-asr.js

# 下载 WASM 文件
curl -L -o public/sherpa-onnx-wasm-main.wasm \
  https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-wasm-main-asr.wasm
```

#### 2. 下载模型文件

```bash
# 创建模型目录
mkdir -p public/models

# 下载中文模型
cd public/models
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2
tar -xjf sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2
rm sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2
```

### 工作原理

1. **Web Worker**: 使用 Web Worker 在后台线程加载和运行模型，避免阻塞主线程
2. **WebAssembly**: 通过 WASM 在浏览器中高效运行 C++ 代码
3. **音频处理**: 主线程捕获音频，通过 postMessage 发送给 Worker 进行识别

### 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        主线程 (Main Thread)                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   React UI   │    │ AudioContext │    │   Worker     │  │
│  │              │◄───│  (录音)      │───►│  (通信)      │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
└──────────────────────────────────────────────────┼──────────┘
                                                   │
                           postMessage(audioData)  │
                           onmessage(result)      │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     Web Worker 线程                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Sherpa-onnx WebAssembly                     ││
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ ││
│  │  │   Module    │───►│ Recognizer  │───►│   Stream    │ ││
│  │  │  (WASM)     │    │  (模型)     │    │  (解码)     │ ││
│  │  └─────────────┘    └─────────────┘    └─────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 模型文件

Sherpa-onnx 需要模型文件才能工作。模型文件需要放置在项目的 `public/models/` 目录下：

```
public/
├── models/
│   └── sherpa-onnx-streaming-zipformer-zh-2023-02-20/
│       ├── encoder-epoch-99-avg-1.int8.onnx
│       ├── decoder-epoch-99-avg-1.onnx
│       ├── joiner-epoch-99-avg-1.int8.onnx
│       └── tokens.txt
```

### 模型下载

可以从以下地址下载预训练模型：

#### 中文模型
```bash
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2
```

#### 英文模型
```bash
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-en-2023-02-20.tar.bz2
```

#### 更多模型
访问 [Sherpa-onnx 预训练模型页面](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/online-transducer/index.html) 查看更多模型。

### 下载和安装模型

```bash
# 创建模型目录
mkdir -p public/models
cd public/models

# 下载中文模型
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2

# 解压模型
tar -xjf sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2

# 删除压缩包
rm sherpa-onnx-streaming-zipformer-zh-2023-02-20.tar.bz2
```

## 🚀 使用方法

### 自动检测

系统会自动检测 Sherpa-onnx 是否可用：
1. 检查 Web Worker 支持
2. 检查 WebAssembly 支持
3. 检查 AudioContext 支持
4. 尝试加载模型文件

### 引擎选择

在语音对话界面中，可以通过下拉菜单选择识别引擎：
- **Web Speech API**: 浏览器原生，需要网络
- **Sherpa-onnx**: 离线识别，需要模型文件

### 故障排除

#### Sherpa-onnx 无法加载

1. 检查 `public/sherpa-onnx-wasm-main.js` 是否存在
2. 检查 `public/sherpa-onnx-wasm-main.wasm` 是否存在
3. 检查 `public/sherpa-worker.js` 是否存在
4. 检查模型文件是否已下载并解压到 `public/models/` 目录

#### 模型加载失败

1. 检查模型文件路径是否正确
2. 检查浏览器控制台是否有 404 错误
3. 检查模型文件是否完整（文件大小是否正确）

#### 识别无结果

1. 检查麦克风权限是否已授予
2. 检查音频采样率是否为 16000Hz
3. 检查浏览器控制台是否有错误信息

## 📚 参考链接

- [Sherpa-onnx GitHub](https://github.com/k2-fsa/sherpa-onnx)
- [Sherpa-onnx 文档](https://k2-fsa.github.io/sherpa/onnx/)
- [WebAssembly 文档](https://webassembly.org/)
- [Web Workers 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
