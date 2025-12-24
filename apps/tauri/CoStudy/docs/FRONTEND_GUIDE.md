# Linus × Jobs 前端开发指南

> "Simple is the ultimate sophistication. But correctness is non-negotiable."

本指南结合Linus Torvalds的技术严谨性和Steve Jobs的设计极致主义，指导make-gold项目的前端开发。

---

## 📚 目录

- [核心理念](#-核心理念)
- [代码架构规范](#-代码架构规范)
- [UI/UX设计标准](#-uiux设计标准)
- [响应式设计策略](#-响应式设计策略)
- [组件使用指南](#-组件使用指南)
- [最佳实践](#-最佳实践)

---

## 🎯 核心理念

### Linus Torvalds (技术架构)

> "Bad programmers worry about the code. Good programmers worry about data structures and their relationships."

**关键原则**:
1. **数据结构 > 算法** - 先设计数据流，再写代码
2. **消除特殊情况** - if/else超过3层？重构！
3. **简单胜过聪明** - 最直接的解决方案通常是最好的
4. **测试驱动正确性** - 先写测试，再写实现
5. **删除比添加重要** - 代码审查要残酷

### Steve Jobs (设计哲学)

> "Simplicity is the ultimate sophistication."

**关键原则**:
1. **移动端优先** - 先设计320px，再适配大屏
2. **简约即复杂** - 每屏不超过3个主要操作
3. **用户不需要学习** - 手势直观，反馈即时
4. **细节决定成败** - 44px最小触摸区域
5. **去除明显元素** - 保留本质，去除噪音

---

## 🏗️ 代码架构规范

### 文件结构

```
src/
├── components/
│   ├── FSRS/              # FSRS学习组件
│   │   ├── FSSRCard.tsx      # 学习卡片
│   │   └── FSRSLearningPanel.tsx  # 学习面板
│   └── ui/                # 基础UI组件
├── lib/
│   ├── hooks/
│   │   └── useResponsive.ts   # 响应式Hook
│   ├── fsrs/              # FSRS算法
│   └── utils.ts           # 工具函数
└── styles/
    └── 3d-flip.css        # 动画样式
```

### 函数设计原则

```typescript
// ✅ Linus方式: 单一职责
async function getDueCards(userId: string, limit = 20): Promise<Card[]> {
  // 直接、清晰、无隐藏逻辑
}

// ❌ 避免: 过度抽象
async function fetchOptimizedCards(config: FetchConfig): Promise<Card[]> {
  // 什么是FetchConfig？为什么要优化？
}
```

### 错误处理

```typescript
// ✅ Linus: 明确错误处理
try {
  await reviewCard(cardId, rating)
} catch (error) {
  console.error('Review failed:', error)
  alert('复习记录失败，请重试')
}

// ❌ 避免: 返回null
const card = getCard() // 可能是null！
```

---

## 🎨 UI/UX设计标准

### 颜色系统

```css
/* 主色调: 最多3种 */
--primary: blue-500      /* 品牌色 */
--success: green-500     /* 成功/正确 */
--warning: orange-500    /* 警告 */
--danger: red-500        /* 错误 */

/* 语义化使用 */
.btn-primary { background: var(--primary); }
.btn-success { background: var(--success); }
```

### 字体系统

```css
/* 最多2种字重 */
--font-regular: 400     /* 正文 */
--font-semibold: 600    /* 标题 */
--font-bold: 700        /* 强调 */

/* 响应式字体大小 */
.text-responsive {
  font-size: 1rem;           /* 移动端 */
}
@media (min-width: 768px) {
  .text-responsive {
    font-size: 1.125rem;     /* 桌面端 */
  }
}
```

### 间距系统

```css
/* 8px网格系统 */
.space-1 { margin: 0.5rem; }   /* 8px */
.space-2 { margin: 1rem; }     /* 16px */
.space-3 { margin: 1.5rem; }   /* 24px */
.space-4 { margin: 2rem; }     /* 32px */
.space-6 { margin: 3rem; }     /* 48px */
.space-8 { margin: 4rem; }     /* 64px */
```

---

## 📱 响应式设计策略

### 断点系统 (Mobile First)

```typescript
// useResponsive Hook
const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive()

// 使用示例
<div className={cn(
  "base-class",                    // 移动端 (默认)
  isTablet && "tablet-class",      // 平板
  isDesktop && "desktop-class"     // 桌面
)} />
```

### 布局模式

| 屏幕 | 布局 | 导航 | 内容 |
|------|------|------|------|
| **手机** (320-768px) | 单列 | Bottom Tab | 卡片列表 |
| **平板** (768-1024px) | 双列 | 侧边栏 | 网格布局 |
| **桌面** (1024px+) | 三列 | 固定侧边 | 表格/图表 |

### 组件适配

```typescript
// 按钮尺寸自适应
const buttonSize = useButtonSize()
<button className={cn(
  "font-semibold rounded-lg transition-colors",
  buttonSize.padding,
  buttonSize.fontSize,
  `min-h-[${buttonSize.minHeight}]`
)}>
  按钮
</button>
```

---

## 🧩 组件使用指南

### FSSRCard (学习卡片)

```typescript
import { FSSRCard } from '@/components/FSRS/FSSRCard'
import { useFSRSDatabase } from '@/lib/fsrs/fsrsDatabase'
import { Rating } from '@/lib/fsrs/fsrs'

function LearningScreen() {
  const { fsrsDb } = useFSRSDatabase()
  const [card, setCard] = useState<Card | null>(null)

  const handleReview = async (rating: Rating) => {
    if (!fsrsDb || !card) return
    await fsrsDb.reviewCard(card.id, rating)
    // 加载下一张卡...
  }

  return card ? (
    <FSSRCard
      card={card}
      onReview={handleReview}
      className="w-full max-w-2xl mx-auto"
    />
  ) : (
    <EmptyState />
  )
}
```

**特性**:
- ✅ 触摸/点击翻转
- ✅ 向上滑动显示答案
- ✅ 44px最小触摸区域
- ✅ 300ms流畅动画
- ✅ 移动端优化

### FSRSLearningPanel (学习面板)

```typescript
import { FSRSLearningPanel } from '@/components/FSRS/FSRSLearningPanel'

// 完整的学习界面
// 包含: 卡片学习 + 进度统计 + 响应式布局
function App() {
  return <FSRSLearningPanel />
}
```

**特性**:
- ✅ 响应式布局 (移动端优先)
- ✅ 实时进度跟踪
- ✅ 空状态引导
- ✅ 桌面端侧边栏
- ✅ 移动端底部统计

---

## ✅ 最佳实践

### Do's (要做)

```typescript
// ✅ 1. 简单数据流
const dueCards = await fsrsDb.getDueCards(userId)

// ✅ 2. 响应式Hook
const { isMobile } = useResponsive()
<div className={isMobile ? 'mobile-class' : 'desktop-class'}>

// ✅ 3. 明确错误处理
try {
  await saveData()
} catch (error) {
  alert('保存失败')
}

// ✅ 4. 语义化类名
<div className="card-header">
  <h2 className="card-title">标题</h2>
</div>

// ✅ 5. 触摸友好
<button className="min-h-[44px] px-6 py-3">
  按钮
</button>
```

### Don'ts (不要做)

```typescript
// ❌ 1. 复杂抽象
const optimizedData = await repository
  .withContext(user, config)
  .chain()
  .fetch()

// ❌ 2. 魔法数字
if (user.age > 18.7) { } // 什么？！

// ❌ 3. 隐藏逻辑
const data = transform(transform(transform(rawData)))

// ❌ 4. 全局状态滥用
const globalState = useGlobalStore()

// ❌ 5. 触摸区域过小
<button className="w-4 h-4">X</button> // 无法点击！
```

---

## 📊 性能预算

### 移动端

- First Contentful Paint: **< 1.5s**
- Time to Interactive: **< 3s**
- Bundle size: **< 200KB** (gzipped)
- Memory: **< 50MB**

### 桌面端

- First Contentful Paint: **< 1s**
- Time to Interactive: **< 2s**
- Bundle size: **< 500KB** (gzipped)

---

## 🔍 代码审查Checklist

### Linus式技术审查

- [ ] 函数 < 30行
- [ ] 缩进 < 3层
- [ ] 重复代码 = 0
- [ ] 无硬编码Magic Number
- [ ] 注释解释WHY而非WHAT
- [ ] 数据流清晰
- [ ] 错误处理明确

### Jobs式设计审查

- [ ] 移动端优先布局
- [ ] 触摸区域 >= 44px
- [ ] 颜色 < 5种
- [ ] 动画 < 400ms
- [ ] 空状态有引导
- [ ] 手势直观
- [ ] 反馈即时

---

## 📝 提交规范

```bash
# 功能添加
feat(fsrs): add responsive learning card
- implement 3D flip animation
- add touch gesture support
- optimize for mobile devices

# 问题修复
fix(ui): button touch target too small
- increase to 44px minimum
- update all button variants
- test on iOS/Android

# 重构
refactor(components): simplify data flow
- remove unnecessary mapping layer
- reduce 15 lines -> 8 lines
- Linus: "Just use the data!"
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

### 3. 使用组件

```typescript
// 导入所需组件
import { FSSRCard } from '@/components/FSRS/FSSRCard'
import { useFSRSDatabase } from '@/lib/fsrs/fsrsDatabase'
import { useResponsive } from '@/lib/hooks/useResponsive'
```

### 4. 添加样式

```css
/* 在main.tsx中导入 */
import '@/styles/3d-flip.css'
```

---

## 📖 参考资源

- [Linus Torvalds关于代码质量的经典言论](https://lkml.org/)
- [Steve Jobs的设计哲学](https://www.apple.com/stevejobs/)
- [响应式设计最佳实践](https://web.dev/responsive-web-design-basics/)
- [Web性能优化指南](https://web.dev/fast/)

---

**记住**: 在技术正确性的基础上，追求设计的极致简洁。用户应该感受到的是**魔法**，而非复杂性。

> **"Stay simple, stay fast."** - Linus × Jobs
