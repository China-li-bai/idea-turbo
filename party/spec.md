为了确保“粘贴即朗读”的 MVP 既能快速上线，又能避开常见的技术坑点（如长文本卡顿、浏览器内存泄露、语音中断等），我采用**逆向思维（从失败场景反推需求）**进行深度架构设计。

---

### 一、 逆向思维：为什么大多数 TTS 软件不好用？（痛点分析）

1. **断句生硬**：直接把一万字塞给浏览器，它会卡死，或者读到一半断掉。
2. **进度丢失**：刷新页面或浏览器崩溃，刚才粘贴的长文和读到的进度全没了。
3. **声音机械**：原生 API 音质太差，听久了头疼。
4. **无法后台**：手机浏览器切到后台，朗读立即停止。
5. **音画不同步**：声音读到了第十句，屏幕还停留在第一句。

---

### 二、 MVP 技术架构设计文档

#### 1. 系统总体架构方案

采用**"生产者-消费者-协作"模型**。将文本处理（生产者）与音频播放（消费者）解耦，中间通过一个**逻辑缓冲区（Queue）**调度，并利用 **PartyKit** 实现实时协作和状态同步。

* **核心技术栈**：

  * **前端**：React + Tailwind CSS
  * **状态机**：[XState](https://github.com/statelyai/xstate)（严谨控制：空闲 -> 解析中 -> 播放中 -> 暂停 -> 错误）
  * **实时协作层**：[PartyKit](https://docs.partykit.io/)（基于 Cloudflare Durable Objects 的全局分布式实时服务器）

  * **存储**：[Dexie.js](https://github.com/dexie/Dexie.js) (IndexedDB 封装) + PartyKit Durable Objects 持久化
  * **TTS 驱动**：混合模式（原生 Web Speech API + 远程 Edge-TTS 代理）
  * **分句引擎**：`Intl.Segmenter` (浏览器原生高性能分词)
* **PartyKit 集成优势**：


  * **全局分布式**：基于 Cloudflare 边缘网络，全球低延迟访问
  * **状态持久化**：Durable Objects 保证房间状态永不丢失，即使所有用户断开连接
  * **按需扩展**：每个文档独立 Party，轻量级启动，自动扩缩容

#### 2. 详细模块设计

##### A. 文本预处理层（The Producer）

不要直接处理原始文本。

* **清理**：去除多余空格、乱码。
* **智能切片**：使用 `Intl.Segmenter` 按句子（sentence）切分。
  * *逆向考量*：防止单句过长。若单句超过 100 字，强制按逗号拆分，防止 TTS 引擎超时。
* **持久化策略**：
  * **本地缓存**：粘贴后立即存入 IndexedDB，快速恢复离线状态。
  * **云端同步**：通过 PartyKit 的 Yjs provider 实时同步到云端，支持多设备访问。
  * **房间隔离**：每个文档对应一个 Party Room ID（如 `doc_${documentId}`），保证状态隔离。

##### B. 调度与缓冲区（The Orchestrator）

* **双指针管理**：
  * `cursor_text`：当前渲染到的文字位置。
  * `cursor_audio`：当前音频播放到的位置。
* **预加载逻辑**：始终保持当前句子后 3 句的音频已进入缓存队列。
* **实时同步机制**（新增）：
  * **状态广播**：通过 PartyKit WebSocket 广播播放状态（playing/paused/stopped）、当前播放索引、播放时间戳。
  * **冲突解决**：使用 XState 状态机 + PartyKit 消息队列，确保多用户操作的一致性。
  * **主从模式**：第一个加入房间的用户成为"主播"，其他用户为"听众"，主播控制播放，听众实时同步。

##### C. 播放引擎层（The Consumer / TTS Adapter）

设计一个 `TTS_Provider` 接口，支持多引擎切换：

1. **L1 引擎 (Web Speech)**：秒开，离线可用，用于快速反馈。
2. **L2 引擎 (Edge-TTS)**：通过后端 Proxy 调用微软声音，音质极佳。
   * *技术实现*：GitHub 开源项目 [edge-tts-vercel](https://github.com/skygongque/edge-tts-vercel)（可部署在 Vercel 上的 Serverless 函数）。


### 四、 关键技术细节实现（可执行路径）

#### 1. 解决浏览器后台停止问题

* **方案**：使用 **Web Wake Lock API**。
* **代码思路**：当播放开始时，请求 `screen` 类型的锁，防止移动端设备进入休眠，从而维持浏览器的 JS 运行环境。
* **PartyKit 增强**：即使浏览器进入后台，PartyKit WebSocket 连接仍保持活跃，当用户返回时可以快速同步最新状态。

#### 2. 解决长文本滚动定位（音画同步）

* **方案**：**虚拟列表 + 引用映射**。
* **代码思路**：
  * 给每一个分好的句子生成一个唯一的 `id` (例如 `sent_001`)。
  * 渲染时长列表使用虚拟滚动。
  * 当 TTS 回调 `onBoundary`（如果是原生 API）或音频播放到特定时间点时，通过 `scrollIntoView({ behavior: 'smooth' })` 将对应 ID 的 DOM 元素滚动到视口中央。
* **PartyKit 同步**：通过 Yjs 的 `Y.Map` 存储当前高亮的句子 ID，所有客户端实时同步高亮位置。

#### 3. 性能优化：防内存溢出

* **逆向思考**：如果用户粘贴了一本《三国演义》，直接渲染 10 万个 DOM 节点会卡死。
* **执行策略**：
  * **内存只存索引**：IndexedDB 存储全文，内存中只保留当前视图可见的约 50 个句子。
  * **Audio Blob 及时释放**：使用 `URL.createObjectURL` 生成的音频链接，在播放完毕后必须立即调用 `URL.revokeObjectURL` 释放内存。
* **PartyKit 优化**：
  * **文档分片**：超大文档可按章节拆分为多个 Party Room，每个 Room 负责一个章节。
  * **增量同步**：Yjs 的 CRDT 特性确保只同步变化的部分，而非整个文档。
  * **智能预加载**：根据用户阅读速度预测，动态调整预加载策略。


#### 5. 离线优先架构（新增）

* **策略**：结合 IndexedDB 和 PartyKit，实现离线优先体验。
* **实现**：
  * **优先使用本地**：文本编辑和播放状态优先保存到 IndexedDB。
  * **后台同步**：网络恢复后，自动将本地变更同步到 PartyKit。
  * **冲突检测**：使用 Yjs 的版本向量检测离线期间的冲突，自动合并或提示用户。
* **优势**：即使在弱网或离线环境下，用户仍可正常使用核心功能。

#### 6. 全局低延迟访问（新增）

* **PartyKit 优势**：基于 Cloudflare 边缘网络，全球 200+ 数据中心。
* **实现**：
  * **智能路由**：PartyKit 自动将用户连接到最近的边缘节点。
  * **状态迁移**：当用户地理位置变化时，Durable Objects 自动迁移到最近的节点。
* **效果**：无论用户在哪个国家，都能享受 <50ms 的延迟。


### 六、 推荐 GitHub 开源组件清单

1. **实时协作平台**: `partykit/partykit` (全局分布式实时服务器，基于 Cloudflare Durable Objects)
2. **协作数据结构**: `yjs/yjs` + `partykit/y-partykit` (CRDT 实时协作，PartyKit 官方集成)
3. **状态管理**: `xstate` (处理复杂的播放、加载、错误状态)
4. **存储**: `dexie` (最快的 IndexedDB 封装，用于离线缓存)
5. **TTS 代理后端**: `rany2/edge-tts` (Python) 或 `pipecat-ai/pipecat` (更前沿的实时流)
6. **UI 库**: `shadcn/ui` (快速构建专业外观的播放控制器)
7. **虚拟滚动**: `tanstack/react-virtual` (高性能长列表渲染)
8. **客户端 SDK**: `partykit/client` (PartyKit 官方客户端 SDK)
9. **React Hooks**: `partykit/react` (PartyKit React 集成，包含 usePartySocket 等 hooks)

### 七、 PartyKit 服务器端代码示例

#### 服务器端实现 (party/rooms.ts)

```typescript
import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class TTSRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onRequest(req: Party.Request) {
    if (req.method === "GET") {
      return new Response(JSON.stringify({
        room: this.room.id,
        connections: this.room.connections.size,
      }));
    }
    return new Response("Method not allowed", { status: 405 });
  }

  onConnect(conn: Party.Connection) {
    const connections = this.room.getConnections();
    const isFirstUser = connections.length === 0;
  
    conn.send(JSON.stringify({
      type: "role",
      role: isFirstUser ? "host" : "listener",
    }));

    return onConnect(conn, this.room, {
      persist: { mode: "snapshot" },
      callback: {
        async handler(yDoc) {
          const state = yDoc.getMap("state");
          const playbackState = {
            isPlaying: state.get("isPlaying") || false,
            currentIndex: state.get("currentIndex") || 0,
            timestamp: state.get("timestamp") || 0,
          };
          this.room.broadcast(JSON.stringify({
            type: "state",
            ...playbackState,
          }));
        },
        debounceWait: 1000,
      },
    });
  }
}

TTSRoom satisfies Party.Worker;
```

#### 客户端连接示例 (app/client.tsx)

```typescript
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import { usePartySocket } from "partykit/react";

function TTSApp() {
  const yDoc = useMemo(() => new Y.Doc(), []);
  const provider = useMemo(
    () => new YPartyKitProvider(
      "localhost:1999",
      "doc_123",
      yDoc,
      {
        connect: true,
        params: { token: "auth-token" },
      }
    ),
    [yDoc]
  );

  const ws = usePartySocket({
    host: "localhost:1999",
    room: "doc_123",
    onMessage: (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "role") {
        console.log("My role:", data.role);
      } else if (data.type === "state") {
        console.log("Playback state:", data);
      }
    },
  });

  return (
    <div>
      <textarea
        value={yDoc.getText("content").toString()}
        onChange={(e) => {
          yDoc.getText("content").delete(0, yDoc.getText("content").length);
          yDoc.getText("content").insert(0, e.target.value);
        }}
      />
    </div>
  );
}
```

### 一、核心问题分析（从失败场景出发） 失败场景 1：长文本播放中断

现象 ：用户粘贴 10 万字，播放到 30% 时突然停止 原因 ：

- Web Speech API 有内部缓冲区限制
- 长时间播放可能导致浏览器内存泄漏
- 浏览器标签页被挂起（background throttling）
  解决方案 ：

1. 分段播放 ：将长文本分成多个"段落"，每段 1000 字左右
2. 自动续播 ：当前段落播放完毕后，自动加载下一段
3. 进度保存 ：每播放完一个段落，保存当前进度到 localStorage
4. 错误重试 ：如果播放中断，自动从断点恢复 失败场景 2：浏览器不支持 Web Speech API
   现象 ：用户在旧版浏览器中打开页面，点击播放无反应 原因 ：

- Web Speech API 是实验性 API，不是所有浏览器都支持
- 不同浏览器的实现差异很大
  解决方案 ：

1. 特性检测 ：在页面加载时检测 window.speechSynthesis 是否存在
2. 优雅降级 ：如果不支持，显示提示信息，引导用户使用现代浏览器
3. 备用方案 ：提供"下载音频"功能，使用第三方 TTS 服务生成音频文件 失败场景 3：播放进度不同步
   现象 ：音频播放到第 10 句，但 UI 还停留在第 1 句 原因 ：

- Web Speech API 的 onboundary 事件不可靠
- 播放速度和 UI 更新速度不一致
- 滚动动画和音频播放不同步
  解决方案 ：

1. 基于时间的同步 ：记录每句话的开始时间，通过 setTimeout 同步 UI
2. 主动轮询 ：每 100ms 检查一次播放状态，更新 UI
3. 滚动优化 ：使用 scrollIntoView 的 block: 'center' 参数，确保句子在视口中央 失败场景 4：内存溢出
   现象 ：用户粘贴超长文本（100 万字），页面卡死 原因 ：

- 一次性加载所有文本到 DOM
- 音频 Blob 没有及时释放
- 虚拟列表实现不当
  解决方案 ：

1. 懒加载 ：只渲染当前可见的 50 个句子
2. 内存管理 ：播放完毕后立即释放音频 Blob
3. 文本分页 ：将长文本分成多个"页面"，每页 5000 字

核心模块 ：

1. 文本预处理模块 ：清理文本、去除多余空格
2. 分句模块 ：使用正则表达式按句子切分
3. 分段模块 ：将长文本分成多个段落，每段 1000 字
4. 播放控制模块 ：管理播放状态、播放进度、错误处理
5. UI 渲染模块 ：渲染文本、高亮当前句子、自动滚动
6. 存储模块 ：保存文本、播放进度到 localStorage
7. 
8. 2. 数据结构设计

```
// 文本数据结构
const textData = {
  id: 'unique-id',
  content: '原始文本',
  segments: [
    { id: 0, text: '第一句', startIndex: 
    0, endIndex: 5 },
    { id: 1, text: '第二句', startIndex: 
    6, endIndex: 11 },
    // ...
  ],
  paragraphs: [
    { id: 0, startSegmentId: 0, 
    endSegmentId: 20 },
    { id: 1, startSegmentId: 21, 
    endSegmentId: 40 },
    // ...
  ]
};

// 播放状态数据结构
const playbackState = {
  isPlaying: false,
  currentSegmentId: 0,
  currentParagraphId: 0,
  startTime: 0,
  pausedAt: 0,
  speed: 1.0,
  voice: null
};
``` 3. 核心算法
算法 1：智能分句

这个架构在逆向上解决了"卡顿、丢失、难听"三大痛点，并利用 PartyKit 的实时协作能力，实现了多用户同步听书、协作编辑等创新功能，确保即使在弱网环境下，用户依然能有流畅的听书体验。

---

### 八、 项目进度跟踪

#### 1. 模块完成状态

| 模块 | 状态 | 文件路径 | 说明 |
|------|------|----------|------|
| 类型定义 | ✅ 完成 | `party/types/index.ts` | 定义 TextSegment、TextParagraph、TextDocument、PlaybackState 等核心数据结构 |
| 工具函数 | ✅ 完成 | `party/utils/index.ts` | validateTextInput、debounce、throttle 等辅助函数 |
| 文本预处理 | ✅ 完成 | `party/modules/preprocessor.ts` | 文本清理、空格标准化、换行处理 |
| 分句模块 | ✅ 完成 | `party/modules/segmenter.ts` | 集成 sentence-splitter，支持中英文分句 |
| 分段模块 | ✅ 完成 | `party/modules/paragraph.ts` | 自动分段、段落导航、标题识别 |
| 播放控制 | ✅ 完成 | `party/modules/playback.ts` | Web Speech API 集成、播放状态管理、事件系统 |
| TextReader 组件 | ✅ 完成 | `app/components/TextReader.tsx` | 文本输入、处理、显示、播放一体化组件 |
| PlaybackControls 组件 | ✅ 完成 | `app/components/PlaybackControls.tsx` | 播放控制面板、进度条、语速、音量、语音选择 |
| PartyKit Server | 🔄 进行中 | `party/server.ts` | Yjs 集成、房间管理、状态持久化 |
| PartyKit Client | ⏳ 待开发 | `party/client.ts` | WebSocket 连接、实时同步 |
| UI 渲染模块 | ⏳ 待开发 | `app/components/` | React 组件、高亮显示、虚拟滚动 |
| 存储模块 | ⏳ 待开发 | `party/modules/storage.ts` | IndexedDB 集成、离线缓存 |

#### 2. 技术选型确认

| 功能 | 选型 | 版本 | 状态 |
|------|------|------|------|
| 句子分割 | sentence-splitter | ^5.0.0 | ✅ 已安装 |
| NLP 处理 | compromise | ^14.10.0 | ✅ 已安装（备用） |
| 状态管理 | XState | - | ⏳ 待集成 |
| 实时协作 | y-partykit | - | ⏳ 待集成 |
| 本地存储 | Dexie.js | - | ⏳ 待集成 |

#### 3. 已集成依赖

```json
{
  "dependencies": {
    "sentence-splitter": "^5.0.0",
    "compromise": "^14.10.0"
  }
}
```

#### 4. 下一步开发计划

**短期目标（本周）**

- [X] 实现 TextReader 组件（文本输入、处理、播放一体化）
- [X] 集成 sentence-splitter 和 compromise 库
- [X] 实现 PlaybackControls 组件（进度条、语速、音量、语音选择）
- [X] 添加键盘快捷键支持（空格、S、←、→）
- [ ] 集成 XState 状态机，管理播放流程
- [ ] 完成 PartyKit Client 模块，实现实时同步
- [ ] 开发 UI 渲染模块，支持高亮和自动滚动
- [ ] 添加单元测试覆盖核心模块

**中期目标（本月）**

- [ ] 集成 Dexie.js 实现离线缓存
- [ ] 实现多用户协作功能
- [ ] 添加 Web Wake Lock 防止后台停止
- [ ] 性能测试和优化

**长期目标**

- [ ] 集成 Edge-TTS 提升音质
- [ ] 移动端适配
- [ ] 生产环境部署

#### 5. 关键文件清单

```
party/
├── types/
│   └── index.ts          # 类型定义
├── utils/
│   └── index.ts          # 工具函数
├── modules/
│   ├── preprocessor.ts   # 文本预处理
│   ├── segmenter.ts      # 分句模块
│   ├── paragraph.ts      # 分段模块
│   └── playback.ts       # 播放控制
├── server.ts             # PartyKit 服务器
└── client.ts             # PartyKit 客户端（待开发）

app/
├── components/
│   ├── Editor.tsx        # 文本编辑器
│   ├── Player.tsx        # 播放控制器
│   └── TextView.tsx      # 文本显示（待开发）
└── hooks/
    └── usePlayback.ts    # 播放 Hook（待开发）
```

#### 6. 已知技术债务

- [ ] PartyKit 服务器类型错误（Doc | undefined 类型不兼容）
- [ ] WebSocket 类型扩展（添加 on 方法）
- [ ] 缺少错误边界处理
- [ ] 缺少加载状态处理

---

*最后更新: 2025-01-07*
