# 语言学习应用技术文档

## 1. 技术架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Web App │  │ Mobile   │  │ Desktop  │  │
│  │ (Next.js) │  │ (React   │  │ (Electron)│  │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  │
└────────┼──────────────┼──────────────┼───────────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
         ┌──────────────┴──────────────┐
         │      API Layer (REST/GraphQL)  │
         └──────────────┬──────────────┘
                        │
         ┌──────────────┴──────────────┐
         │     Business Logic Layer        │
         │  ┌──────────────────────┐   │
         │  │  Learning Engine     │   │
         │  │  - Stage Manager    │   │
         │  │  - Content Router   │   │
         │  │  - Progress Tracker │   │
         │  └──────────────────────┘   │
         └──────────────┬──────────────┘
                        │
         ┌──────────────┴──────────────┐
         │      Data Layer               │
         │  ┌──────────┐  ┌────────┐ │
         │  │ IndexedDB │  │ Local  │ │
         │  │ (Browser) │  │ Storage│ │
         │  └──────────┘  └────────┘ │
         └──────────────┬──────────────┘
                        │
         ┌──────────────┴──────────────┐
         │   External Services            │
         │  ┌──────────┐  ┌────────┐ │
         │  │ Edge TTS │  │  Anki  │ │
         │  │ Service  │  │  Sync  │ │
         │  └──────────┘  └────────┘ │
         └─────────────────────────────┘
```

### 1.2 分层说明

#### 1.2.1 前端层

- **Web 应用**：Next.js + React
- **移动应用**：React Native（可选）
- **桌面应用**：Electron（可选）

#### 1.2.2 API 层

- RESTful API
- GraphQL（可选，用于复杂查询）
- WebSocket（实时功能）

#### 1.2.3 业务逻辑层

- 学习引擎
- 内容路由
- 进度追踪
- 个性化推荐

#### 1.2.4 数据层

- IndexedDB（浏览器）
- LocalStorage（配置）
- SQLite（桌面应用）

#### 1.2.5 外部服务

- Edge TTS 服务（已部署）
- Anki 同步服务（可选）

## 2. 技术栈选择

### 2.1 前端技术栈

| 技术 | 版本 | 用途 | 理由 |
|------|------|------|------|
| Next.js | 16.x | 框架 | SSR/SSG 支持，优秀的开发体验 |
| React | 19.x | UI 库 | 生态丰富，组件化开发 |
| TypeScript | 5.x | 类型系统 | 类型安全，提高代码质量 |
| Tailwind CSS | 4.x | 样式框架 | 快速开发，响应式设计 |
| Zustand | 4.x | 状态管理 | 轻量级，简单易用 |
| React Query | 5.x | 数据获取 | 缓存、自动重试、乐观更新 |
| Framer Motion | 11.x | 动画库 | 流畅的动画效果 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 | 理由 |
|------|------|------|------|
| Node.js | 20.x | 运行时 | 与前端统一技术栈 |
| tRPC | 11.x | API | 类型安全的 API |
| Prisma | 5.x | ORM | 类型安全的数据库操作 |
| PostgreSQL | 16.x | 数据库 | 可靠的关系型数据库 |

### 2.3 存储技术栈

| 技术 | 用途 | 理由 |
|------|------|------|
| IndexedDB | 浏览器存储 | 大容量，异步操作 |
| LocalStorage | 配置存储 | 简单键值对存储 |
| Dexie.js | IndexedDB 封装 | 更友好的 API |

### 2.4 第三方服务

| 服务 | 用途 | 集成方式 |
|------|------|----------|
| Edge TTS | 文本转语音 | HTTP API |
| Anki | 间隔重复 | AnkiConnect API |
| OpenAI | AI 辅助（可选） | OpenAI API |

### 2.5 开发工具

| 工具 | 用途 |
|------|------|
| Turbo | 构建工具 |
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Vitest | 单元测试 |
| Playwright | E2E 测试 |
| Turborepo | Monorepo 管理 |

## 3. 核心模块设计

### 3.1 学习阶段管理器

```typescript
interface LearningStage {
  id: string;
  name: string;
  description: string;
  duration: number; // 月
  goals: string[];
  methods: string[];
}

interface UserStage {
  userId: string;
  currentStage: LearningStage['id'];
  startDate: Date;
  progress: number; // 0-100
  completedGoals: string[];
}
```

**功能**：
- 阶段检测和切换
- 进度计算
- 目标追踪

### 3.2 看图识音模块

```typescript
interface PictureQuiz {
  id: string;
  stage: LearningStage['id'];
  images: QuizImage[];
  audioUrl: string;
  correctImageId: string;
}

interface QuizImage {
  id: string;
  url: string;
  altText: string;
  keywords: string[];
}

interface QuizAttempt {
  quizId: string;
  userId: string;
  attempts: number;
  correct: boolean;
  timeSpent: number;
  timestamp: Date;
}
```

**功能**：
- 四选一游戏
- 声音与图片关联
- 重复和替换次序

### 3.3 TPR 训练模块

```typescript
interface TPRCommand {
  id: string;
  text: string;
  audioUrl: string;
  actionType: 'body' | 'object' | 'picture' | 'story';
  difficulty: number;
  category: string;
}

interface TPRSession {
  id: string;
  commands: TPRCommand[];
  userId: string;
  mode: 'single' | 'multiplayer';
  startTime: Date;
  endTime?: Date;
}

interface TPRResponse {
  commandId: string;
  userId: string;
  responseTime: number; // ms
  correct: boolean;
  timestamp: Date;
}
```

**功能**：
- 指令播放
- 反应时间测量
- 多人游戏模式

### 3.4 续列法模块

```typescript
interface SeriesScenario {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: SeriesStep[];
  difficulty: number;
}

interface SeriesStep {
  id: string;
  order: number;
  text: string;
  audioUrl: string;
  visualAid?: {
    type: 'image' | 'animation' | 'video';
    url: string;
  };
  newVocabulary: string[];
}

interface SeriesProgress {
  scenarioId: string;
  userId: string;
  completedSteps: string[];
  attempts: number;
  lastAttempted: Date;
}
```

**功能**：
- 场景播放
- 步骤追踪
- 词汇收集

### 3.5 生成对话模块

```typescript
interface DialogueScenario {
  id: string;
  title: string;
  background: SeriesScenario;
  dialogues: Dialogue[];
  difficulty: number;
}

interface Dialogue {
  id: string;
  order: number;
  speaker: string;
  text: string;
  audioUrl: string;
  emotion?: string;
}

interface DialogueProgress {
  scenarioId: string;
  userId: string;
  completedDialogues: string[];
  comprehensionScore: number;
  lastAttempted: Date;
}
```

**功能**：
- 背景介绍
- 对话播放
- 理解评估

### 3.6 间隔重复模块

```typescript
interface Flashcard {
  id: string;
  front: string;
  back: string;
  type: 'simple' | 'reverse' | 'cloze' | 'audio' | 'image';
  audioUrl?: string;
  imageUrl?: string;
  tags: string[];
  deck: string;
  stage: LearningStage['id'];
}

interface ReviewLog {
  cardId: string;
  userId: string;
  rating: number; // 1-4 (FSRS)
  reviewTime: Date;
  nextReviewTime: Date;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Flashcard[];
  settings: DeckSettings;
}

interface DeckSettings {
  algorithm: 'sm2' | 'fsrs';
  newCardsPerDay: number;
  reviewCardsPerDay: number;
  easeFactor: number;
  intervalModifier: number;
}
```

**功能**：
- FSRS 算法集成
- 复习计划生成
- 学习统计

### 3.7 语音合成模块

```typescript
interface TTSConfig {
  provider: 'edge' | 'web-speech' | 'coqui';
  voice: string;
  speed: number; // 0.25-2.0
  pitch: number; // 0.5-1.5
  volume: number; // 0-1
}

interface TTSRequest {
  text: string;
  config: TTSConfig;
  cache?: boolean;
}

interface TTSResponse {
  audioUrl: string;
  duration: number;
  cached: boolean;
}
```

**功能**：
- 多 TTS 提供商支持
- 音频缓存
- 批量处理

## 4. 数据结构设计

### 4.1 用户数据

```typescript
interface User {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  statistics: UserStatistics;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPreferences {
  language: string;
  stage: LearningStage['id'];
  dailyGoal: number; // 分钟
  reminderTime?: string;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
}

interface UserStatistics {
  totalStudyTime: number; // 分钟
  vocabularySize: number;
  cardsReviewed: number;
  accuracy: number;
  streakDays: number;
  lastStudyDate: Date;
}
```

### 4.2 学习内容数据

```typescript
interface Vocabulary {
  id: string;
  word: string;
  phonetic?: string;
  meanings: Meaning[];
  examples: Example[];
  stage: LearningStage['id'];
  frequency: number;
  createdAt: Date;
}

interface Meaning {
  partOfSpeech: string;
  definition: string;
  translation?: string;
}

interface Example {
  sentence: string;
  translation?: string;
  audioUrl?: string;
}
```

### 4.3 进度数据

```typescript
interface StudySession {
  id: string;
  userId: string;
  module: string;
  duration: number;
  itemsCompleted: number;
  accuracy: number;
  startTime: Date;
  endTime: Date;
}

interface DailyProgress {
  userId: string;
  date: Date;
  sessions: StudySession[];
  totalDuration: number;
  goalAchieved: boolean;
}
```

## 5. API 设计

### 5.1 RESTful API 端点

#### 5.1.1 用户相关

```
GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/:id/preferences
PUT    /api/users/:id/preferences
GET    /api/users/:id/statistics
```

#### 5.1.2 学习阶段相关

```
GET    /api/stages
GET    /api/stages/:id
GET    /api/users/:id/stage
PUT    /api/users/:id/stage
```

#### 5.1.3 学习内容相关

```
GET    /api/content/quizzes
GET    /api/content/quizzes/:id
POST   /api/content/quizzes/:id/attempt

GET    /api/content/tpr-commands
GET    /api/content/tpr-commands/:id

GET    /api/content/scenarios
GET    /api/content/scenarios/:id
POST   /api/content/scenarios/:id/attempt

GET    /api/content/dialogues
GET    /api/content/dialogues/:id
POST   /api/content/dialogues/:id/attempt
```

#### 5.1.4 间隔重复相关

```
GET    /api/decks
POST   /api/decks
GET    /api/decks/:id
PUT    /api/decks/:id
DELETE /api/decks/:id

GET    /api/decks/:id/cards
POST   /api/decks/:id/cards
GET    /api/decks/:id/reviews
POST   /api/decks/:id/reviews
```

#### 5.1.5 语音合成相关

```
POST   /api/tts/synthesize
GET    /api/tts/voices
GET    /api/tts/cache
DELETE /api/tts/cache
```

### 5.2 WebSocket 事件

```typescript
// 客户端 -> 服务器
type ClientEvent =
  | { type: 'join_session'; sessionId: string }
  | { type: 'submit_answer'; answer: any }
  | { type: 'request_hint' }
  | { type: 'pause_session' }
  | { type: 'resume_session' };

// 服务器 -> 客户端
type ServerEvent =
  | { type: 'session_started'; data: SessionData }
  | { type: 'next_question'; data: QuestionData }
  | { type: 'answer_feedback'; data: FeedbackData }
  | { type: 'session_ended'; data: SessionResult }
  | { type: 'user_joined'; data: UserData }
  | { type: 'user_left'; data: { userId: string } };
```

## 6. 部署方案

### 6.1 前端部署

#### 6.1.1 Vercel（推荐）

**优势**：
- 零配置部署
- 自动 HTTPS
- 全球 CDN
- 预览环境

**部署步骤**：
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

#### 6.1.2 Netlify（备选）

**优势**：
- 免费额度高
- Form 支持
- Functions 集成

### 6.2 后端部署

#### 6.2.1 Railway

**优势**：
- 支持 Node.js
- PostgreSQL 内置
- 环境变量管理

#### 6.2.2 Render（备选）

**优势**：
- 免费层可用
- 自动扩展
- 监控工具

### 6.3 数据库部署

#### 6.3.1 Supabase（推荐）

**优势**：
- 开源 Firebase 替代
- PostgreSQL 内置
- 实时订阅
- 认证集成

#### 6.3.2 Neon（备选）

**优势**：
- Serverless PostgreSQL
- 按使用付费
- 自动扩展

### 6.4 Edge TTS 服务

已部署在 Cloudflare Workers：
- URL: `https://shu.66666618.xyz`
- API: `/v1/audio/speech`
- 语音列表: `/v1/voices`

## 7. 开发规范

### 7.1 代码规范

#### 7.1.1 TypeScript 规范

```typescript
// 使用接口定义类型
interface User {
  id: string;
  name: string;
}

// 使用类型别名
type UserId = string;

// 使用泛型
function getData<T>(url: string): Promise<T> {
  return fetch(url).then(res => res.json());
}

// 避免使用 any
// ❌
function process(data: any) { }

// ✅
function process(data: unknown) {
  if (typeof data === 'string') { }
}
```

#### 7.1.2 React 规范

```typescript
// 使用函数组件
const Component: React.FC<Props> = ({ prop }) => {
  return <div>{prop}</div>;
};

// 使用 hooks
const [state, setState] = useState(initialState);
const ref = useRef<HTMLDivElement>(null);
const memoizedValue = useMemo(() => compute(value), [value]);
const callback = useCallback(() => {}, [deps]);

// 避免不必要的重渲染
const MemoizedComponent = React.memo(Component);
```

#### 7.1.3 命名规范

```typescript
// 文件名：PascalCase
// UserProfile.tsx

// 组件名：PascalCase
// UserProfile

// 函数名：camelCase
// getUserData()

// 常量名：UPPER_SNAKE_CASE
// MAX_RETRY_COUNT

// 接口名：PascalCase
// UserData

// 类型别名：PascalCase
// UserId
```

### 7.2 Git 规范

#### 7.2.1 分支策略

```
main          - 生产环境
develop       - 开发环境
feature/*     - 功能分支
bugfix/*      - 修复分支
hotfix/*      - 紧急修复
```

#### 7.2.2 提交信息规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**：
- feat: 新功能
- fix: 修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建

**示例**：
```
feat(tpr): add multiplayer mode support

Add support for multiple users in TPR training sessions.
Users can now join a session and compete for fastest response.

Closes #123
```

### 7.3 测试规范

#### 7.3.1 单元测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('calls callback on click', () => {
    const onClick = vi.fn();
    render(<Component onClick={onClick} />);
    screen.getByRole('button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

#### 7.3.2 E2E 测试

```typescript
import { test, expect } from '@playwright/test';

test('user can complete quiz', async ({ page }) => {
  await page.goto('/quiz/123');
  await page.click('button[data-testid="option-a"]');
  await expect(page.locator('.feedback')).toContainText('Correct!');
});
```

### 7.4 性能优化

#### 7.4.1 代码分割

```typescript
// 动态导入
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 路由级代码分割
const routes = [
  {
    path: '/dashboard',
    lazy: () => import('./pages/Dashboard'),
  },
];
```

#### 7.4.2 图片优化

```typescript
// 使用 Next.js Image
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={false}
  loading="lazy"
/>
```

#### 7.4.3 音频优化

```typescript
// 使用音频缓存
const audioCache = new Map<string, Blob>();

async function getAudio(url: string): Promise<Blob> {
  if (audioCache.has(url)) {
    return audioCache.get(url)!;
  }
  const response = await fetch(url);
  const blob = await response.blob();
  audioCache.set(url, blob);
  return blob;
}
```

## 8. 安全性

### 8.1 数据安全

- 敏感数据加密存储
- HTTPS 传输
- 定期备份

### 8.2 输入验证

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
});

function validateInput(data: unknown) {
  return schema.parse(data);
}
```

### 8.3 XSS 防护

```typescript
// 使用 React 自动转义
<div>{userInput}</div>

// 避免使用 dangerouslySetInnerHTML
// ❌
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅
<div>{userInput}</div>
```

## 9. 监控和日志

### 9.1 错误监控

```typescript
// 使用 Sentry
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 9.2 性能监控

```typescript
// 使用 Web Vitals
import { getCLS, getFID, getFCP } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
```

### 9.3 用户行为分析

```typescript
// 使用 Plausible（隐私友好）
import Plausible from 'plausible-tracker';

plausible('pageview');
plausible('quiz_completed', { props: { type: 'picture' } });
```

## 10. 扩展性设计

### 10.1 插件系统

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  hooks: {
    beforeQuiz?: (quiz: Quiz) => Quiz;
    afterQuiz?: (result: QuizResult) => void;
    onProgress?: (progress: Progress) => void;
  };
}

function registerPlugin(plugin: Plugin) {
  plugins.set(plugin.id, plugin);
}
```

### 10.2 主题系统

```typescript
interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.style.setProperty('--primary', theme.colors.primary);
}
```

### 10.3 多语言支持

```typescript
interface I18nConfig {
  language: string;
  translations: Record<string, string>;
}

function t(key: string): string {
  return translations[currentLanguage][key] || key;
}
```

## 11. 附录

### 11.1 开源项目参考

| 项目 | 地址 | 用途 |
|------|------|------|
| Anki | https://github.com/ankitects/anki | 间隔重复算法 |
| FSRS | https://github.com/open-spaced-repetition/fsrs.js | 自适应间隔重复 |
| Coqui TTS | https://github.com/coqui-ai/TTS | 离线文本转语音 |
| obsidian-spaced-repetition | https://github.com/st3v3nmw/obsidian-spaced-repetition | Obsidian 插件 |
| Flashcards-Obsidian | https://github.com/reuseman/flashcards-obsidian | Obsidian 闪卡 |

### 11.2 技术文档参考

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [tRPC Documentation](https://trpc.io/docs)

### 11.3 API 文档

- [Edge TTS API](https://shu.66666618.xyz/docs)
- [AnkiConnect API](https://foosoft.net/projects/anki-connect/)
- [OpenAI API](https://platform.openai.com/docs)
