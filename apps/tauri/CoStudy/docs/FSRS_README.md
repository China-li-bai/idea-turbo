# FSRS (Free Spaced Repetition Scheduler) 智能学习系统

## 项目概述

基于脑科学研究和个性化学习理论的间隔重复算法实现，集成了单一FSRS算法栈，实现了真正的科学化学习管理。

## 核心特性

### 🧠 科学算法基础
- **DSR模型**: 基于Difficulty(难度)、Stability(稳定性)、Retrievability(可检索性)三维记忆模型
- **FSRS-6算法**: 使用21个优化参数，相比传统SM-2算法提升30%效率
- **机器学习优化**: 使用反向传播和最大似然估计训练个性化参数

### 📊 个性化学习分析
- **学习模式识别**: 基于复习历史分析用户学习特征
- **自适应调度**: 根据个人表现动态调整复习间隔
- **智能推荐**: 提供基于数据分析的学习策略建议

### 🎯 主动检索策略
- **最适困难度**: 实现认知科学中的"期望困难"理论
- **交替学习**: 基于间隔效应和分散学习的科学排序
- **预测性调度**: 精确预测最佳复习时机

## 技术架构

### 算法层 (`src/lib/fsrs.ts`)
```typescript
// 核心FSRS算法实现
export class FSRS {
  // 计算可检索性: R(t,S) = (1 + factor * t/S)^(-w[19])
  private calculateRetrievability(elapsed_days: number, stability: number): number
  
  // 更新稳定性: S_(n+1) = S * e^(复杂公式...)
  private nextRecallStability(difficulty, stability, retrievability, rating): number
  
  // 计划卡片复习的所有可能结果
  scheduleCard(card: Card, now = new Date()): SchedulingCards
}

// 主动检索策略
export class ActiveRetrievalStrategy {
  // 生成基于认知负荷理论的测试间隔
  generateTestingIntervals(difficulty: number): number[]
  
  // 实现交替学习策略
  generateInterleavedSchedule(cards: Card[], sessionDuration: number): Card[]
}

// 个性化学习分析
export class PersonalizedLearningAnalyzer {
  // 分析用户学习模式并生成个性化建议
  analyzeUserPattern(reviewLogs: ReviewLog[]): AnalysisResult
}
```

### 数据层 (`src/lib/fsrsDatabase.ts`)
```typescript
export class FSRSDatabase {
  // 完整的CRUD操作
  async createCard(content: any, deckId: string): Promise<string>
  async reviewCard(cardId: string, rating: Rating): Promise<SchedulingCards>
  async getDueCards(userId?: string): Promise<Card[]>
  
  // 高级分析功能
  async getPersonalizedRecommendations(userId: string): Promise<any[]>
  async getPredictedWorkload(userId: string, days: number): Promise<number[]>
  async getCardPerformanceAnalysis(userId: string): Promise<any[]>
}
```

### 界面层 (`src/components/FSRSLearningSystem.tsx`)
- 完整的学习界面：卡片展示、评分、统计
- 实时数据可视化：工作负载预测、学习分析
- 个性化推荐系统

## 数据库设计

### 核心表结构
```sql
-- 卡片表：存储FSRS核心参数（统一术语：front/back）
CREATE TABLE cards (
  id UUID PRIMARY KEY,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  due TIMESTAMP NOT NULL,
  stability REAL NOT NULL,      -- FSRS稳定性参数
  difficulty REAL NOT NULL,     -- FSRS难度参数
  elapsed_days INTEGER,
  scheduled_days INTEGER,
  reps INTEGER,                 -- 复习次数
  lapses INTEGER,               -- 遗忘次数
  state INTEGER                 -- 卡片状态
);

-- 复习日志：完整的学习历史记录
CREATE TABLE review_logs (
  id UUID PRIMARY KEY,
  card_id UUID REFERENCES cards(id),
  rating INTEGER NOT NULL,      -- 1:忘记 2:困难 3:良好 4:简单
  stability REAL,
  difficulty REAL,
  elapsed_days INTEGER,
  review_time TIMESTAMP
);
```

## 核心算法公式

### 1. 可检索性计算
```
R(t,S) = (1 + factor * t/S)^(-w[19])
其中 factor = 0.9^(-1/w[19]) - 1
```

### 2. 稳定性更新
```
S_(n+1) = S * e^(w[8] * (11-D) * S^(-w[9]) * (e^(w[10]*(1-R)) - 1) * hard_penalty * easy_bonus)
```

### 3. 难度调整
```
D_(n+1) = D - w[6] * (G - 3)
限制在 [1, 10] 范围内
```

### 4. 遗忘后稳定性
```
S_f = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * e^(w[14] * (1-R))
```

## 使用指南

### 1. 基本使用
```typescript
import { FSRSLearningSystem } from '@/components/FSRSLearningSystem'

function App() {
  return (
    <PGliteProvider>
      <FSRSLearningSystem />
    </PGliteProvider>
  )
}
```

### 2. 创建学习内容
```typescript
const { fsrsDb } = useFSRSDatabase()

// 创建套牌
const deckId = await fsrsDb.createDeck('英语单词', '日常英语学习')

// 添加卡片
await fsrsDb.createCard({
  front: 'Apple',
  back: '苹果',
  phonetic: '/ˈæpəl/',
  examples: ['I like apples.']
}, deckId, userId, ['水果', '基础词汇'])
```

### 3. 进行复习
```typescript
// 获取待复习卡片
const dueCards = await fsrsDb.getDueCards(userId)

// 复习卡片 (评分: 1=忘记, 2=困难, 3=良好, 4=简单)
const result = await fsrsDb.reviewCard(cardId, Rating.GOOD, userId)
```

### 4. 获取学习分析
```typescript
// 获取个性化推荐
const recommendations = await fsrsDb.getPersonalizedRecommendations(userId)

// 获取工作负载预测
const workload = await fsrsDb.getPredictedWorkload(userId, 7) // 未来7天

// 获取卡片性能分析
const analysis = await fsrsDb.getCardPerformanceAnalysis(userId)
```

## 科学依据

### 认知心理学原理
1. **Hermann Ebbinghaus遗忘曲线**: FSRS算法基础理论
2. **间隔效应 (Spacing Effect)**: 分散学习优于集中学习
3. **测试效应 (Testing Effect)**: 主动回忆强化记忆
4. **期望困难 (Desirable Difficulty)**: 适度困难促进长期保持

### 记忆科学研究
1. **DSR三维模型**: 基于Piotr Wozniak的SuperMemo研究
2. **遗忘曲线数学建模**: 精确预测记忆衰减
3. **个体差异适应**: 机器学习优化个人参数

## 性能优势

相比传统学习方法：
- **效率提升30%**: 达到相同记忆保持率所需时间减少
- **个性化适应**: 根据个人学习特点动态调整
- **科学预测**: 精确预测遗忘时间和复习需求
- **长期保持**: 优化长期记忆巩固

## 开发团队

基于Open Spaced Repetition组织的FSRS算法研究，结合现代Web技术栈实现的完整学习系统。

## 技术栈
- **算法**: FSRS-6 (21参数优化)
- **前端**: React 19 + TypeScript + Tailwind CSS
- **数据库**: PGlite (本地) + Supabase (同步)
- **桌面**: Tauri v2
- **组件**: shadcn/ui + Radix UI

## 未来规划
1. **多模态学习**: 支持图像、音频、视频内容
2. **协作学习**: 多用户共享套牌和学习进度
3. **AI增强**: 集成大语言模型自动生成学习内容
4. **移动端**: React Native版本开发