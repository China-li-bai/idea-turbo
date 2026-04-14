# @idea-turbo/wisdom-ui

Minecraft 风格像素角色 UI 组件库，为 Brain Trust 智囊团提供可视化交互层。支持鼠标触发的角色动画反应。

---

## 人类使用指南

### 安装

```bash
pnpm add @idea-turbo/wisdom-ui @idea-turbo/brain-trust react react-dom
```

### 快速上手

```tsx
import { WisdomTeamBoard } from '@idea-turbo/wisdom-ui';
import '@idea-turbo/wisdom-ui/styles.css';
import { createAgent, createCrew, wisdomTeam } from '@idea-turbo/brain-trust';
import { createOpenAI } from '@ai-sdk/openai';

function App() {
  const [activeId, setActiveId] = useState<string>();
  const [streamingText, setStreamingText] = useState<Record<string, string>>({});

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const crew = useMemo(() => createCrew({
    agents: [
      createAgent({ ...wisdomTeam.jobs, model: openai('gpt-4o') }),
      createAgent({ ...wisdomTeam.musk, model: openai('gpt-4o') }),
      createAgent({ ...wisdomTeam.sunzi, model: openai('gpt-4o') }),
    ],
  }), []);

  const askQuestion = async (question: string) => {
    for await (const event of crew.run(question)) {
      if (event.type === 'agent_start') {
        setActiveId(event.agent.id);
        setStreamingText(prev => ({ ...prev, [event.agent.id]: '' }));
      }
      if (event.type === 'agent_chunk') {
        setStreamingText(prev => ({
          ...prev,
          [event.agent.id]: (prev[event.agent.id] || '') + event.text,
        }));
      }
      if (event.type === 'crew_done') {
        setActiveId(undefined);
      }
    }
  };

  return (
    <WisdomTeamBoard
      agents={crew.agentsList}
      activeAgentId={activeId}
      streamingText={streamingText}
      onCharacterClick={(agent) => console.log('Clicked:', agent.name)}
    />
  );
}
```

### 核心 API

#### `<WisdomTeamBoard />`

智囊团主面板组件，编排所有角色。

```tsx
interface WisdomTeamBoardProps {
  agents: Agent[];              // brain-trust Agent 实例数组
  onCharacterClick?: (agent: Agent) => void;
  onCharacterHover?: (agent: Agent | null) => void;
  activeAgentId?: string;       // 当前发言的角色 ID
  streamingText?: Record<string, string>; // 流式文本映射
  className?: string;
}
```

**使用示例**：

```tsx
<WisdomTeamBoard
  agents={crew.agentsList}
  activeAgentId="jobs"
  streamingText={{ jobs: '极简主义的本质是...' }}
  onCharacterClick={(agent) => {
    console.log(`${agent.name} 被点击`);
  }}
/>
```

#### `<PixelCharacter />`

单个像素角色组件。

```tsx
interface PixelCharacterProps {
  agent: Agent;                 // brain-trust Agent 实例
  sprite: SpriteData;           // 像素精灵数据
  reaction?: 'bounce' | 'spin' | 'shake' | 'jump' | 'wave' | 'glow';
  isActive?: boolean;           // 是否激活状态
  isSpeaking?: boolean;         // 是否正在发言
  streamingText?: string;       // 流式文本内容
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}
```

**使用示例**：

```tsx
import { PixelCharacter, sprites } from '@idea-turbo/wisdom-ui';

<PixelCharacter
  agent={myAgent}
  sprite={sprites.jobs}
  isSpeaking={true}
  streamingText="正在思考..."
  onClick={() => console.log('clicked')}
/>
```

### 鼠标交互

| 操作 | 效果 | CSS 类 |
|------|------|--------|
| **Hover** | 角色放大 8%，轻微浮动 | `pixel-character--hover` |
| **Click** | 弹跳动画（压扁→弹起→落地） | `pixel-character--clicked` |
| **Double-Click** | 角色专属反应（旋转/抖动/发光） | `pixel-character--reaction-*` |

### 自定义精灵

```tsx
import { PixelCharacter, SpriteData } from '@idea-turbo/wisdom-ui';

const customSprite: SpriteData = {
  id: 'custom',
  width: 8,
  height: 10,
  palette: {
    '1': '#F5CBA7', // 肤色
    '2': '#E0B896', // 肤色阴影
    '3': '#FF0000', // 主色
  },
  grid: [
    '00333300',
    '03111130',
    '02111120',
    // ... 8x10 像素网格
  ],
};

<PixelCharacter agent={agent} sprite={customSprite} />
```

### 样式定制

CSS 变量覆盖：

```css
:root {
  --obsidian-deep: #0F0F13;     /* 背景色 */
  --cave-stone: #1A1A24;        /* 卡片色 */
  --pixel-scale: 8;             /* 像素缩放比例 */
  --spring-stiffness: 180;      /* 弹簧刚度 */
  --spring-damping: 12;         /* 弹簧阻尼 */
}
```

### 完整示例：集成 Brain Trust

```tsx
import { useState, useEffect } from 'react';
import { WisdomTeamBoard } from '@idea-turbo/wisdom-ui';
import '@idea-turbo/wisdom-ui/styles.css';
import { createAgent, createCrew, wisdomTeam } from '@idea-turbo/brain-trust';
import { createOpenAI } from '@ai-sdk/openai';

export function WisdomApp() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const crew = createCrew({
      agents: [
        createAgent({ ...wisdomTeam.jobs, model: openai('gpt-4o-mini') }),
        createAgent({ ...wisdomTeam.musk, model: openai('gpt-4o-mini') }),
        createAgent({ ...wisdomTeam.sunzi, model: openai('gpt-4o-mini') }),
      ],
    });
    setAgents([...crew.agentsList]);
  }, []);

  const ask = async (question: string) => {
    setLoading(true);
    const crew = createCrew({ agents, mode: 'parallel' });

    for await (const event of crew.run(question)) {
      switch (event.type) {
        case 'agent_start':
          setActiveId(event.agent.id);
          setTexts(prev => ({ ...prev, [event.agent.id]: '' }));
          break;
        case 'agent_chunk':
          setTexts(prev => ({
            ...prev,
            [event.agent.id]: (prev[event.agent.id] || '') + event.text,
          }));
          break;
        case 'crew_done':
          setActiveId(undefined);
          setLoading(false);
          break;
      }
    }
  };

  return (
    <div>
      <button onClick={() => ask('什么是好产品？')} disabled={loading}>
        提问
      </button>
      <WisdomTeamBoard
        agents={agents}
        activeAgentId={activeId}
        streamingText={texts}
      />
    </div>
  );
}
```

---

## Agent 使用指南

### 包概述

```
@idea-turbo/wisdom-ui 是 @idea-turbo/brain-trust 的视觉层组件库。
核心功能：渲染 Minecraft 风格像素角色、处理鼠标交互动画、显示流式文本。
技术：纯 CSS box-shadow 像素渲染，无图片依赖，GPU 加速动画。
```

### 导出清单

```typescript
// 组件
export { PixelCharacter } from './components/PixelCharacter.js';
export { WisdomTeamBoard } from './components/WisdomTeamBoard.js';

// 精灵系统
export { sprites } from './sprites/index.js';
export { spriteToBoxShadow, getSpriteDimensions } from './sprites/index.js';

// Hooks
export { useCharacterInteraction } from './hooks/useCharacterInteraction.js';

// 类型
export type {
  CharacterState,
  CharacterReaction,
  SpritePalette,
  SpriteData,
  CharacterConfig,
  WisdomTeamBoardProps,
  PixelCharacterProps,
} from './types.js';
```

### 类型定义

```typescript
type CharacterState = 'idle' | 'hover' | 'active' | 'speaking' | 'clicked';

type CharacterReaction =
  | { type: 'bounce' }
  | { type: 'spin' }
  | { type: 'shake' }
  | { type: 'jump' }
  | { type: 'wave' }
  | { type: 'glow' };

interface SpriteData {
  id: string;
  grid: string[];        // 像素网格，每行一个字符串
  palette: SpritePalette; // 颜色映射
  width: number;         // 网格宽度
  height: number;        // 网格高度
}

interface WisdomTeamBoardProps {
  agents: Agent[];       // 来自 brain-trust
  onCharacterClick?: (agent: Agent) => void;
  onCharacterHover?: (agent: Agent | null) => void;
  activeAgentId?: string;
  streamingText?: Record<string, string>;
  className?: string;
}

interface PixelCharacterProps {
  agent: Agent;
  sprite: SpriteData;
  reaction?: CharacterReaction['type'];
  isActive?: boolean;
  isSpeaking?: boolean;
  streamingText?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}
```

### 预定义精灵

```typescript
import { sprites } from '@idea-turbo/wisdom-ui';

// 可用精灵 ID（与 brain-trust wisdomTeam 成员对应）
const spriteIds = [
  'jobs', 'musk', 'sunzi', 'confucius', 'graham',
  'andressen', 'inamori', 'yangming', 'mao', 'laotzu'
];

// 访问精灵数据
const jobsSprite = sprites.jobs;
// { id: 'jobs', width: 8, height: 10, grid: [...], palette: {...} }
```

### 渲染原理

```
精灵数据 (SpriteData)
    ↓
spriteToBoxShadow() 转换
    ↓
CSS box-shadow 像素点
    ↓
单 <div> 元素渲染
    ↓
transform: scale(8) 放大
```

### 动画系统

| 状态 | 动画 | 触发条件 |
|------|------|----------|
| `idle` | 呼吸（translateY ±2px） | 默认状态 |
| `hover` | 浮动 + 放大 | 鼠标悬停 |
| `speaking` | 弹跳 + 气泡 | `isSpeaking=true` |
| `clicked` | 跳跃动画 | 点击触发 |

### 与 Brain Trust 集成模式

```
brain-trust (逻辑层)
    ↓ Agent 实例
wisdom-ui (视觉层)
    ↓ 渲染 + 交互
用户界面
```

**数据流**：
1. `brain-trust` 创建 Agent 实例
2. Agent 传入 `WisdomTeamBoard.agents`
3. `crew.run()` 产生事件流
4. 事件更新 `activeAgentId` 和 `streamingText`
5. UI 实时反映发言状态

### 样式导入

```typescript
// 必须导入 CSS
import '@idea-turbo/wisdom-ui/styles.css';
```

### 依赖要求

```json
{
  "dependencies": {
    "@idea-turbo/brain-trust": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

### 无障碍支持

- `role="button"` 语义化
- `tabIndex={0}` 键盘可聚焦
- `aria-label` 包含角色名称和职位

### 性能优化

- `will-change: transform` GPU 加速
- `contain: layout style paint` 隔离重绘
- 仅动画 `transform` 和 `opacity`
- 像素精灵使用 CSS box-shadow（单元素）
