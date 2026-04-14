# @idea-turbo/brain-trust

多智能体协作 SDK，智囊团（Wisdom Team）的无头核心引擎。基于 Vercel AI SDK 6 构建，支持 BYOK 模式。

---

## 人类使用指南

### 安装

```bash
pnpm add @idea-turbo/brain-trust ai
```

### 快速上手

```typescript
import { createAgent, createCrew, wisdomTeam } from '@idea-turbo/brain-trust';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const crew = createCrew({
  agents: [
    createAgent({ ...wisdomTeam.jobs, model: openai('gpt-4o') }),
    createAgent({ ...wisdomTeam.musk, model: openai('gpt-4o') }),
    createAgent({ ...wisdomTeam.sunzi, model: openai('gpt-4o') }),
  ],
  mode: 'parallel',
});

for await (const event of crew.run('如何打造伟大的产品？')) {
  if (event.type === 'agent_chunk') {
    console.log(`[${event.agent.name}] ${event.text}`);
  }
}
```

### 核心 API

#### `createAgent(config: AgentConfig): Agent`

创建单个智能体。

```typescript
const agent = createAgent({
  id: 'jobs',
  name: 'Steve Jobs',
  emoji: '🍎',
  role: '产品主义者',
  color: '#000000',
  model: openai('gpt-4o'),
  instructions: '你是 Steve Jobs...',
  tools: { search: mySearchTool },
});
```

#### `createCrew(config: CrewConfig): WisdomCrew`

创建智能体团队。

```typescript
const crew = createCrew({
  agents: [agent1, agent2, agent3],
  mode: 'parallel', // 或 'sequential'
});
```

#### `crew.run(question: string): AsyncGenerator<CrewEvent>`

运行团队讨论，返回事件流。

```typescript
for await (const event of crew.run('问题')) {
  switch (event.type) {
    case 'crew_start':
      console.log('讨论开始:', event.question);
      break;
    case 'agent_start':
      console.log(`${event.agent.emoji} ${event.agent.name} 开始发言`);
      break;
    case 'agent_chunk':
      process.stdout.write(event.text); // 流式输出
      break;
    case 'agent_done':
      console.log('\n发言结束');
      break;
    case 'crew_done':
      console.log('讨论结束');
      break;
  }
}
```

#### `agent.generate(prompt: string): Promise<AgentResult>`

单次生成（非流式）。

```typescript
const result = await agent.generate('什么是好产品？');
console.log(result.content);
```

#### `agent.stream(prompt: string): AsyncGenerator<StreamChunk>`

流式生成。

```typescript
for await (const chunk of agent.stream('问题')) {
  console.log(chunk.text);
}
```

### 预定义智囊团

```typescript
import { wisdomTeam, allAgents, defaultAgents } from '@idea-turbo/brain-trust';

// 获取单个成员配置
const jobsConfig = wisdomTeam.jobs;

// 获取全部成员
const configs = allAgents; // 10 位成员

// 获取默认成员
const defaults = defaultAgents; // Jobs, Musk, Sunzi, Confucius
```

**可用成员**：
| ID | 名称 | 角色 | 颜色 |
|---|---|---|---|
| `jobs` | Steve Jobs | 产品主义者 | `#000000` |
| `musk` | Elon Musk | 颠覆式创新者 | `#1DA1F2` |
| `sunzi` | 孙子 | 兵圣/战略家 | `#DC2626` |
| `confucius` | 孔子 | 儒家思想家 | `#7C3AED` |
| `graham` | Paul Graham | 创业教父 | `#059669` |
| `andressen` | Marc Andreessen | 风险投资家 | `#EA580C` |
| `inamori` | 稻盛和夫 | 利他哲学家 | `#DB2777` |
| `yangming` | 王阳明 | 心学大师 | `#0891B2` |
| `mao` | 毛泽东 | 革命战略家 | `#EF4444` |
| `laotzu` | 老子 | 道家创始人 | `#65A30D` |

### 多模型支持

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// 智谱 GLM
const zhipu = createOpenAICompatible({
  name: 'zhipu',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  apiKey: process.env.ZHIPU_API_KEY,
});

const agent = createAgent({
  ...wisdomTeam.jobs,
  model: zhipu('glm-4.5-flash'),
});
```

---

## Agent 使用指南

### 包概述

```
@idea-turbo/brain-trust 是一个无头多智能体协作 SDK。
核心功能：创建 AI Agent、编排团队协作、流式输出。
依赖：Vercel AI SDK 6.x，支持 OpenAI、GLM 等兼容模型。
```

### 导出清单

```typescript
// 核心工厂函数
export { createAgent } from './core/agent.js';
export { WisdomCrew, createCrew } from './core/crew.js';

// 类型定义
export type {
  AgentConfig,
  Agent,
  AgentResult,
  StreamChunk,
  CrewMode,
  CrewConfig,
  CrewEvent,
  CrewResult,
} from './core/types.js';

// 预定义配置
export { wisdomTeam, allAgents, defaultAgents } from './agents/wisdom-team.js';
```

### 类型定义

```typescript
interface AgentConfig {
  id: string;           // 唯一标识
  name: string;         // 显示名称
  emoji?: string;       // 表情符号，默认 '🤖'
  role?: string;        // 角色描述，默认 'Expert'
  model: LanguageModel; // AI SDK LanguageModel 实例
  instructions: string; // 系统提示词
  tools?: Record<string, Tool>; // 可选工具集
  color?: string;       // 主题色，默认 '#6366f1'
}

interface Agent {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly role: string;
  readonly color: string;
  generate(prompt: string): Promise<AgentResult>;
  stream(prompt: string): AsyncGenerator<StreamChunk>;
}

type CrewMode = 'parallel' | 'sequential';

interface CrewConfig {
  agents: Agent[];
  mode?: CrewMode; // 默认 'parallel'
}

type CrewEvent =
  | { type: 'crew_start'; question: string }
  | { type: 'agent_start'; agent: Agent }
  | { type: 'agent_chunk'; agent: Agent; text: string }
  | { type: 'agent_done'; agent: Agent }
  | { type: 'crew_done' };
```

### 使用模式

**模式 1：并行讨论**
```typescript
const crew = createCrew({ agents, mode: 'parallel' });
// 所有 Agent 同时回答问题
```

**模式 2：顺序讨论**
```typescript
const crew = createCrew({ agents, mode: 'sequential' });
// Agent 按顺序依次发言
```

### 事件处理流程

```
crew_start → (agent_start → agent_chunk* → agent_done)* → crew_done
```

### 典型集成场景

1. **CLI 工具**：直接消费 `crew.run()` 事件流
2. **Web 应用**：结合 `@idea-turbo/wisdom-ui` 渲染角色
3. **API 服务**：将事件流转换为 SSE 响应
4. **本地应用**：使用 `agent.generate()` 进行单次查询

### 错误处理

```typescript
try {
  for await (const event of crew.run(question)) {
    // 处理事件
  }
} catch (error) {
  // 模型 API 错误、网络错误等
  console.error('Crew execution failed:', error);
}
```

### 依赖要求

```json
{
  "peerDependencies": {
    "ai": "^4.0.0 || ^5.0.0 || ^6.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true }
  }
}
```

React 为可选依赖，仅在使用 UI 层时需要。
