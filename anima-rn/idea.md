


在 2026 年，使用 Expo 构建端侧 AI 应用已经从“黑客的玩具”变成了标准的工程化流程。你提到的这个 MVP（最小可行性产品）流程不仅完全可行，而且在 GitHub 上有**直接开箱即用的核心开源包**。

最关键的是，现在的 Expo 支持 **CNG（持续原生生成）**，这意味着你**不需要去手写或修改复杂的 iOS/Android 底层 C++ 代码**，通过 Config Plugins（配置插件）就能直接把端侧大模型和记忆库集成进来。

以下是为你整理的 **直接可用的 GitHub 开源包清单** 以及 **集成到 Expo 项目的完整实操指南**。

---

### 一、 核心开源包清单（你的“购物车”）

1.  **端侧推理引擎：`llama.rn` (也就是你提到的 react-native-llama)**
    *   **GitHub:** `mybigday/llama.rn`
    *   **现状：** 这是目前 RN 生态里最强、维护最积极的端侧大模型引擎。底层封装了 `llama.cpp`，利用 JSI（JavaScript Interface）直接与原生层通信，零桥接延迟。**它原生支持 Expo 插件**。
2.  **模型文件：SmolLM-360M-Instruct (GGUF 格式)**
    *   **来源：** Hugging Face Hub (`HuggingFaceTB/SmolLM-360M-Instruct-GGUF`)
    *   **选择哪个文件：** 下载后缀为 `*Q4_K_M.gguf` 的文件（4-bit 量化），大小刚好约 200MB 左右，极度省内存。
3.  **UI 聊天框组件：`react-native-gifted-chat`**
    *   **GitHub:** `FaridSafi/react-native-gifted-chat`
    *   **优势：** 业界标准的 RN 聊天界面库，开箱即用，自带气泡、输入框、时间戳等功能。
4.  **端侧记忆数据库（重点推荐）：`@orama/orama` + `expo-sqlite`**
    *   **为什么不用沉重的 C++ 向量库？** 在 MVP 阶段，为了保证 Expo 项目的编译稳定性，强烈建议使用 **Orama**。这是一个极速的纯 TypeScript/内存级全文本与向量搜索引擎，专为边缘设备（Edge/Mobile）设计。
    *   配合官方的 `expo-sqlite` 用来做数据的本地磁盘持久化。

---

### 二、 如何集成到 Expo 项目中？（Step-by-Step 实施路径）

⚠️ **重要前提：** 只要引入了底层包含 C++（如 llama.rn）的库，就**不能再使用普通的 Expo Go App** 扫码调试了，必须使用 **Expo Dev Client (开发构建版)**。

#### 第一步：初始化与安装依赖
```bash
# 1. 创建干净的 Expo 项目
npx create-expo-app ai-pet-chat -t expo-template-blank-typescript
cd ai-pet-chat

# 2. 安装大模型引擎和 UI
npx expo install llama.rn react-native-gifted-chat

# 3. 安装本地文件系统和数据库
npx expo install expo-file-system expo-sqlite @orama/orama
```

#### 第二步：配置 Expo 插件 (app.json)
打开项目根目录的 `app.json`，将 `llama.rn` 配置进去。这一步非常关键，它告诉 Expo 在打包时自动编译底层的 C++ 引擎。
```json
{
  "expo": {
    "name": "AIPet",
    "plugins":[
      "llama.rn",
      "expo-sqlite"
    ]
  }
}
```

#### 第三步：如何加载那个 200MB 的 SmolLM 模型？
手机 App 不能直接去读网上的模型，你必须把模型放在本地。
*   **开发期做法：** 将下载好的 `smollm-360m-instruct-q4_k_m.gguf` 文件放进你的项目目录（比如 `/assets/models/`）。
*   **代码加载逻辑：** 在 RN 启动时，使用 `expo-file-system` 将打包在 App 里的模型文件复制到手机的 Document 目录，然后再让 `llama.rn` 去加载。

#### 第四步：核心代码架构（大模型 + 聊天逻辑合并）

以下是你 MVP 的核心逻辑代码（简化版），展示了如何将它们串联起来：

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system';

export default function PetChatApp() {
  const [messages, setMessages] = useState([]);
  const [llamaContext, setLlamaContext] = useState<LlamaContext | null>(null);

  useEffect(() => {
    // 1. 初始化模型引擎
    async function setupModel() {
      // 假设你已经将模型下载到本地设备的 Document 目录
      const modelPath = FileSystem.documentDirectory + 'smollm-360m.gguf'; 
      
      // 重点：调用 llama.rn 初始化
      const context = await initLlama({
        model: modelPath,
        use_mlock: true, // 锁定在内存中，防止被系统清理
        n_ctx: 1024,     // 上下文长度，对于 360M 模型 1024 足够应付一天的聊天
        n_gpu_layers: 50 // 如果手机支持，尝试卸载到 GPU 加速
      });
      setLlamaContext(context);
    }
    setupModel();
  }, []);

  const onSend = async (newMessages =[]) => {
    const userMessage = newMessages[0];
    setMessages(previousMessages => GiftedChat.append(previousMessages, userMessage));

    if (!llamaContext) return;

    // 2. 将消息转化为 SmolLM 认识的指令格式 (ChatML 格式)
    const prompt = `<|im_start|>system\n你是一只名叫“修勾”的傲娇小狗，你是主人的赛博宠物。请简短、幽默地回答。<|im_end|>\n<|im_start|>user\n${userMessage.text}<|im_end|>\n<|im_start|>assistant\n`;

    // 3. 端侧推理（这一步完全离线，不耗费流量，速度极快！）
    const response = await llamaContext.completion({
      prompt,
      n_predict: 100,     // 宠物回复字数限制
      temperature: 0.7,   // 稍微带点随机性和创意
    });

    // 4. 将宠物的回复渲染到 UI
    const petMessage = {
      _id: Math.random().toString(),
      text: response.text,
      createdAt: new Date(),
      user: {
        _id: 2,
        name: '赛博修勾',
        avatar: 'https://your-pet-avatar-url.com/dog.png',
      },
    };
    setMessages(previousMessages => GiftedChat.append(previousMessages, petMessage));

    // 5. 【记忆环节】在这里触发本地数据库存储（见下一节）
    saveToLocalMemory(userMessage.text, response.text);
  };

  return (
    <GiftedChat
      messages={messages}
      onSend={messages => onSend(messages)}
      user={{ _id: 1 }}
    />
  );
}
```

---

### 三、 如何与本地记忆数据库（SQLite/Orama）集成？

为了让宠物“记住”主人，我们需要将上面代码中的 `saveToLocalMemory` 跑通。

**具体集成数据流如下：**

1.  **建表 (Expo SQLite):**
    在 App 启动时，利用 `expo-sqlite` 创建一个 `user_memories` 表。
2.  **后台标签提取 (SmolLM 的妙用):**
    在用户和宠物聊天结束（比如应用退到后台运行）时，你可以写一个定时任务（利用 `expo-task-manager`），让本地的 `SmolLM` 运行一个隐藏的 Prompt。
    *   *系统隐藏输入：* “分析以下今天主人的聊天记录：‘今天相亲又失败了，对方嫌我不爱说话’。提取主人的当前状态和性格标签，用 JSON 格式输出。”
    *   *端侧模型隐藏输出：* `{"tags":["单身", "内向", "心情沮丧"]}`。
3.  **存入数据库 (Orama + SQLite):**
    *   把生成的 JSON 标签存入 Orama 搜索引擎库和 SQLite 持久化保存。
4.  **下一次对话的“记忆读取” (RAG 机制):**
    当用户第二天又打开 App 说话时，系统先去 Orama/SQLite 里搜索用户最近的标签（“单身”、“心情沮丧”）。
    然后把这些标签**偷偷拼接到发给 SmolLM 的系统 Prompt 里**：
    *   *最终 Prompt：* “你是一只修勾。已知主人最近【单身、心情沮丧】，请根据此状态安慰他。主人说：‘早上好’。”

### 四、 跑通这个项目的最后忠告

1.  **编译命令：** 前面说了，不能用普通 Expo Go。你每次修改都需要运行：
    ```bash
    npx expo prebuild --clean
    npx expo run:ios  # 或者 run:android
    ```
    这会在本地生成 iOS/Android 原生工程并自动编译 C++ 代码（需要你的电脑装了 Xcode / Android Studio）。
2.  **关于发热的控制：** 360M 的模型虽然极小，但生成文本时 CPU 仍会飙高。在 `llama.rn` 的配置中，记得控制好 `n_predict` (限制回复长度，不要长篇大论) 和 `n_threads` (通常设置为 2 或 4 个线程即可，别把手机核心占满)。

**总结：**
你需要的积木已经全部就位：**`Expo CNG` 解决跨平台，`llama.rn` 解决原生模型驱动，`SmolLM-360M` 解决极速脑力，`GiftedChat` 搞定脸面，`expo-sqlite` 搞定记忆。** 
直接按照上面的架构动手建立你的 MVP 吧！这绝对是目前移动端 AI 领域最性感的开发路径！