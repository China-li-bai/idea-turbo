这是一个非常棒的问题。`sherpa-onnx` 的官方仓库其实提供了非常详尽的 Web (WASM) 演示，但因为仓库巨大，新手往往找不到具体的文件位置。

以下是**官方推荐的下载路径**、**演示代码仓库**以及**前端集成方案**。

---

### 1. 官方演示仓库 (GitHub)

这是最权威的参考来源。官方所有的 Web 示例都在主仓库的 `web` 目录下。

*   **仓库地址**: [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
*   **Web 示例代码目录**: [`sherpa-onnx/web`](https://github.com/k2-fsa/sherpa-onnx/tree/master/web)

在这个目录下，你会看到很多以模型命名的文件夹（例如 `streaming-asr-paraformer-zh-14`）。每一个文件夹都是一个独立的、可运行的 HTML/JS 演示。

> **注意**：官方示例通常使用 **原生 JavaScript (Vanilla JS)** 编写。这是为了展示最底层的 API 调用逻辑。在 React 中，你只需要把它的 `script.js` 里的逻辑放入 `useEffect` 或 `Web Worker` 即可。

---

### 2. 核心文件下载链接 (WASM & Models)

要在 React 中跑起来，你需要两类文件：**引擎文件 (WASM)** 和 **模型文件 (ONNX)**。

#### A. 引擎文件 (.js 和 .wasm)
这是驱动识别的核心。官方会在 GitHub Releases 中发布编译好的版本。

*   **下载地址**: [Sherpa-onnx GitHub Releases](https://github.com/k2-fsa/sherpa-onnx/releases)
*   **如何寻找**:
    1.  进入 Releases 页面。
    2.  找到最新版本（例如 `v1.10.x`）。
    3.  点击 "Show all assets"。
    4.  找到文件名包含 `wasm` 的压缩包，例如：`sherpa-onnx-wasm-main-x.x.x.tar.bz2`。
    5.  解压后，你需要的核心文件是：
        *   `sherpa-onnx-wasm-main.js` (桥接文件)
        *   `sherpa-onnx-wasm-main.wasm` (编译后的二进制文件)

#### B. 模型文件 (Hugging Face)
你需要下载经过量化（int8）的模型以减小体积。以下是两个最常用的中文模型推荐：

**方案一：Paraformer (阿里达摩院模型，非流式/流式均可，效果好)**
*   **下载地址**: [k2-fsa/sherpa-onnx-streaming-paraformer-bilingual-zh-en](https://huggingface.co/csukuangfj/sherpa-onnx-streaming-paraformer-bilingual-zh-en/tree/main)
*   **所需文件**:
    *   `tokens.txt`
    *   `encoder.int8.onnx`
    *   `decoder.int8.onnx`
    *   `paraformer.int8.onnx` (如果是非流式)

**方案二：Zipformer (新一代架构，体积更小，流式性能极强)** -> **强烈推荐前端使用**
*   **下载地址**: [k2-fsa/sherpa-onnx-streaming-zipformer-zh-14](https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-zh-14/tree/main)
*   **所需文件**:
    *   `tokens.txt`
    *   `encoder-epoch-99-avg-1.int8.onnx`
    *   `decoder-epoch-99-avg-1.int8.onnx`
    *   `joiner-epoch-99-avg-1.int8.onnx`

---

### 3. 正确的前端使用方案 (React 实战结构)

不要试图把 `sherpa-onnx` 直接 `import` 到 React 组件里运行，**这会导致 UI 冻结**。正确的方案是 **"Public 静态资源 + Web Worker"**。

#### 第一步：放置文件
将下载的文件放入 React 项目的 `public` 文件夹，结构如下：

```text
my-react-app/
├── public/
│   ├── sherpa/
│   │   ├── sherpa-onnx-wasm-main.js   <-- 从 Release 下载
│   │   ├── sherpa-onnx-wasm-main.wasm <-- 从 Release 下载
│   │   └── model/                     <-- 从 HuggingFace 下载
│   │       ├── tokens.txt
│   │       ├── encoder.int8.onnx
│   │       ├── decoder.int8.onnx
│   │       └── joiner.int8.onnx
```

#### 第二步：复制官方 Worker 逻辑
去官方仓库 [sherpa-onnx/web/streaming-asr-zipformer-zh-14/worker.js](https://github.com/k2-fsa/sherpa-onnx/blob/master/web/streaming-asr-zipformer-zh-14/worker.js) 复制全部代码。

在你的 React 项目 `src/` 下新建一个 `sherpaWorker.js`，粘贴代码，并做微调：

1.  **修改文件路径**：官方示例通常假设文件在同一目录。你需要把路径指向 `/public/sherpa/...`。
    ```javascript
    // 原始代码可能长这样：
    // importScripts('./sherpa-onnx-wasm-main.js');

    // 修改为指向 public 目录：
    importScripts('/sherpa/sherpa-onnx-wasm-main.js');
    ```
2.  **修改模型加载路径**：
    ```javascript
    // 找到 initSherpaOnnx 函数内的 config
    const config = {
      onlineModelConfig: {
        transducer: {
          encoder: '/sherpa/model/encoder.int8.onnx', // 修改这里
          decoder: '/sherpa/model/decoder.int8.onnx',
          joiner: '/sherpa/model/joiner.int8.onnx',
        },
        tokens: '/sherpa/model/tokens.txt',
        // ...
      }
    };
    ```

#### 第三步：React 组件调用
使用 `Worker` 构造函数加载该文件。

```jsx
// src/components/ASR.jsx
import React, { useEffect, useRef } from 'react';

export default function ASR() {
  const workerRef = useRef(null);

  useEffect(() => {
    // 1. 初始化 Worker
    // Vite/Webpack 现代构建工具通常支持这种语法
    workerRef.current = new Worker(new URL('../sherpaWorker.js', import.meta.url));

    // 2. 监听 Worker 返回的识别结果
    workerRef.current.onmessage = (event) => {
      const { data } = event;
      if (data.status === 'ok') {
         console.log('Result:', data.text);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const handleStart = () => {
     // 这里写录音逻辑 (AudioContext -> ScriptProcessor -> worker.postMessage)
     // 录音部分逻辑请参考官方示例中的 microphone.js
  };

  return <button onClick={handleStart}>开始识别</button>;
}
```

### 总结
1.  **代码参考**：直接看 [GitHub web 目录](https://github.com/k2-fsa/sherpa-onnx/tree/master/web) 下的 `script.js` 和 `worker.js`。
2.  **二进制下载**：去 [GitHub Releases](https://github.com/k2-fsa/sherpa-onnx/releases) 找 `wasm` 压缩包。
3.  **模型下载**：去 Hugging Face 搜 `csukuangfj/sherpa-onnx-streaming-zipformer-zh-14`。

这是目前最稳健的路径。官方虽然没有直接提供 React 组件包，但提供了所有必要的积木。