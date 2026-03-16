# 多语言国际化（i18n）完整实现 Skill

## 概述

这是一个关于**多语言国际化（i18n）完整实现**的经验总结，包含功能架构、数据结构、最佳实践、问题解决方案等，适用于需要支持多语言的前端项目开发。

## 核心原则

### 1️⃣ 本地化优先
- 默认使用用户系统语言
- 提供语言切换功能
- 支持语言状态持久化

### 2️⃣ 类型安全
- 使用 TypeScript 严格类型定义
- 确保翻译键的类型安全
- 避免运行时错误

### 3️⃣ 模块化设计
- 翻译文件独立管理
- 语言切换组件可复用
- 状态管理与UI分离

### 4️⃣ 用户体验
- 流畅的语言切换体验
- 清晰的语言选择界面
- 立即生效的翻译更新

---

## 功能架构

### 核心模块

```
多语言系统
├── i18n 工具库 (lib/utils/i18n.ts)
│   ├── 语言类型定义
│   ├── 语言配置
│   ├── 浏览器语言检测
│   └── 第三方库翻译加载
├── 翻译文件 (lib/utils/translations.ts)
│   ├── 翻译接口定义
│   ├── 翻译数据
│   └── useTranslation Hook
├── i18n 状态管理 (lib/stores/i18nStore.ts)
│   ├── Zustand Store
│   ├── 持久化中间件
│   └── 初始化 Hook
├── 语言切换组件 (components/LanguageSwitcher.tsx)
│   ├── 下拉菜单
│   ├── 国旗图标
│   └── 点击外部关闭
└── 页面集成
    ├── 导入相关组件
    ├── 使用翻译 Hook
    └── 集成语言切换器
```

---

## 数据结构设计

### 1. 语言类型定义

```typescript
// lib/utils/i18n.ts
export type SupportedLocale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR'

export interface LocaleConfig {
  code: SupportedLocale
  name: string
  nativeName: string
}

export const supportedLocales: LocaleConfig[] = [
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
]
```

### 2. 翻译接口定义

```typescript
// lib/utils/translations.ts
export interface Translations {
  landing: {
    nav: {
      features: string
      comparison: string
      testimonials: string
      cta: string
    }
    hero: {
      badge: string
      title: string
      highlight: string
      subtitle: string
      primaryButton: string
      secondaryButton: string
    }
    // ... 其他翻译字段
  }
}
```

### 3. 翻译数据结构

```typescript
export const translations: Record<SupportedLocale, Translations> = {
  'zh-CN': {
    landing: {
      nav: {
        features: '功能',
        comparison: '对比',
        testimonials: '用户评价',
        cta: '立即体验 →',
      },
      // ... 其他翻译内容
    },
  },
  'en-US': {
    landing: {
      nav: {
        features: 'Features',
        comparison: 'Comparison',
        testimonials: 'Testimonials',
        cta: 'Try Now →',
      },
      // ... 其他翻译内容
    },
  },
  // ... 其他语言
}
```

---

## 完整实现步骤

### 步骤1：创建 i18n 工具库

#### 核心功能
1. **语言类型定义** - 确保类型安全
2. **语言配置列表** - 集中管理所有支持的语言
3. **浏览器语言检测** - 自动识别用户系统语言
4. **第三方库翻译加载** - 支持第三方库的多语言

```typescript
// lib/utils/i18n.ts
export function detectUserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') {
    return 'en-US'
  }

  const browserLang = navigator.language || (navigator as any).userLanguage || 'en-US'
  
  const langMap: Record<string, SupportedLocale> = {
    'zh': 'zh-CN',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'zh-HK': 'zh-TW',
    'en': 'en-US',
    'en-US': 'en-US',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
  }

  return langMap[browserLang] || 'en-US'
}
```

---

### 步骤2：创建翻译文件

#### 设计原则
1. **分层结构** - 按页面/功能模块组织
2. **键名语义化** - 使用描述性的键名
3. **默认值处理** - 提供默认语言作为fallback

```typescript
// lib/utils/translations.ts
export function useTranslation(locale: SupportedLocale): Translations {
  return translations[locale] || translations['en-US']
}
```

---

### 步骤3：创建 i18n 状态管理

#### 使用 Zustand + persist
1. **状态持久化** - 使用 localStorage 保存用户选择
2. **初始化逻辑** - 首次使用时检测浏览器语言
3. **类型安全** - 完整的 TypeScript 类型

```typescript
// lib/stores/i18nStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { detectUserLocale, type SupportedLocale } from '@/lib/utils/i18n'

interface I18nState {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'zh-CN',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ai-calendar-i18n',
    }
  )
)

export function useInitI18n() {
  const { locale, setLocale } = useI18nStore()

  if (typeof window !== 'undefined' && locale === 'zh-CN') {
    const detected = detectUserLocale()
    if (detected !== locale) {
      setLocale(detected)
    }
  }

  return { locale, setLocale }
}
```

---

### 步骤4：创建语言切换组件

#### 组件特性
1. **下拉菜单** - 点击展开语言选项
2. **国旗图标** - 使用 emoji 作为国旗
3. **点击外部关闭** - 提升用户体验
4. **黑金配色** - 与项目主题一致

```tsx
// components/LanguageSwitcher.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { supportedLocales, type SupportedLocale } from '@/lib/utils/i18n'
import styles from './LanguageSwitcher.module.scss'

interface LanguageSwitcherProps {
  currentLocale: SupportedLocale
  onChange: (locale: SupportedLocale) => void
}

export default function LanguageSwitcher({ currentLocale, onChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLocaleConfig = supportedLocales.find(l => l.code === currentLocale)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocaleChange = (locale: SupportedLocale) => {
    onChange(locale)
    setIsOpen(false)
  }

  return (
    <div className={styles.switcher} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.flag}>{getFlagEmoji(currentLocale)}</span>
        <span className={styles.localeName}>{currentLocaleConfig?.nativeName}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {supportedLocales.map((locale) => (
            <button
              key={locale.code}
              className={`${styles.option} ${currentLocale === locale.code ? styles.active : ''}`}
              onClick={() => handleLocaleChange(locale.code)}
            >
              <span className={styles.flag}>{getFlagEmoji(locale.code)}</span>
              <span className={styles.localeName}>{locale.nativeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getFlagEmoji(locale: SupportedLocale): string {
  const flagMap: Record<SupportedLocale, string> = {
    'zh-CN': '🇨🇳',
    'zh-TW': '🇹🇼',
    'en-US': '🇺🇸',
    'ja-JP': '🇯🇵',
    'ko-KR': '🇰🇷',
  }
  return flagMap[locale] || '🌐'
}
```

---

### 步骤5：在页面中集成

#### 集成流程
1. **导入相关组件** - 导入语言切换器、i18n store、翻译 hook
2. **获取当前语言** - 使用 useI18nStore 获取当前语言
3. **获取翻译函数** - 使用 useTranslation 获取翻译数据
4. **渲染语言切换器** - 在页面合适位置渲染语言切换组件
5. **使用翻译数据** - 用翻译数据替换硬编码文本

```tsx
// components/landing/LandingPage.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18nStore } from '@/lib/stores/i18nStore'
import { useTranslation } from '@/lib/utils/translations'
import styles from './landing.module.scss'

export default function LandingPage() {
  const { locale, setLocale } = useI18nStore()
  const t = useTranslation(locale)

  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>📅</span>
          <span className={styles.logoText}>智程日历</span>
        </div>
        <nav className={styles.nav}>
          <Link href="#features" className={styles.navLink}>{t.landing.nav.features}</Link>
          <Link href="#comparison" className={styles.navLink}>{t.landing.nav.comparison}</Link>
          <Link href="#testimonials" className={styles.navLink}>{t.landing.nav.testimonials}</Link>
          <Link href="/app" className={styles.ctaButton}>{t.landing.nav.cta}</Link>
        </nav>
        <LanguageSwitcher currentLocale={locale} onChange={setLocale} />
      </header>

      {/* 页面其他内容使用 t.landing.xxx 进行翻译 */}
    </div>
  )
}
```

---

## 常见问题与解决方案

### 问题1：开发服务器锁文件冲突

**问题描述：**
```
Error: Unable to acquire lock at .../.next/dev/lock
```

**解决方案：**
1. 删除 `.next/dev/lock` 文件
2. 或者直接删除整个 `.next` 目录
3. 重新启动开发服务器

```bash
# 删除锁文件
rm -rf .next/dev/lock

# 或者删除整个 .next 目录
rm -rf .next

# 重新启动开发服务器
pnpm dev
```

---

### 问题2：多语言功能不显示

**问题排查清单：**
- [ ] 检查翻译文件是否存在
- [ ] 检查语言切换组件是否正确导入
- [ ] 检查 i18n store 是否正确配置
- [ ] 检查页面是否正确集成了语言切换器
- [ ] 检查样式文件是否正确导入
- [ ] 检查开发服务器是否正常运行

**解决方案：**
1. 确认所有相关文件存在
2. 检查导入路径是否正确
3. 重启开发服务器
4. 清除浏览器缓存和 localStorage

---

### 问题3：TypeScript 类型错误

**常见错误：**
- 翻译键不存在
- 语言类型不匹配
- Hook 返回值类型错误

**解决方案：**
1. 确保翻译接口定义完整
2. 使用类型安全的翻译访问方式
3. 定期运行 `tsc --noEmit` 检查类型错误

---

## 关键技术点

### 1. Zustand + persist 状态持久化

**优势：**
- 自动将状态保存到 localStorage
- 页面刷新后保留用户语言选择
- 简洁的 API 设计

**使用注意事项：**
- 为 persist 提供唯一的 name
- 避免存储敏感信息
- 考虑存储大小限制

---

### 2. 浏览器语言检测

**检测策略：**
1. 优先使用 `navigator.language`
2. fallback 到 `navigator.userLanguage`
3. 提供默认语言作为最终 fallback

**语言映射：**
```typescript
const langMap: Record<string, SupportedLocale> = {
  'zh': 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'en': 'en-US',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
}
```

---

### 3. 点击外部关闭下拉菜单

**实现原理：**
1. 使用 ref 引用下拉菜单容器
2. 监听 document 的 mousedown 事件
3. 检查点击目标是否在容器外部
4. 如果是，则关闭下拉菜单

**代码示例：**
```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

---

### 4. 国旗 Emoji 映射

**使用 Emoji 作为国旗的优势：**
- 无需额外的图片资源
- 加载速度快
- 跨平台兼容性好
- 易于维护

**映射表：**
```typescript
const flagMap: Record<SupportedLocale, string> = {
  'zh-CN': '🇨🇳',
  'zh-TW': '🇹🇼',
  'en-US': '🇺🇸',
  'ja-JP': '🇯🇵',
  'ko-KR': '🇰🇷',
}
```

---

## 检查清单

### 开发前
- [ ] 确定需要支持的语言列表
- [ ] 设计翻译数据结构
- [ ] 规划组件架构
- [ ] 选择状态管理方案

### 开发中
- [ ] 创建 i18n 工具库
- [ ] 创建翻译文件
- [ ] 创建 i18n store
- [ ] 创建语言切换组件
- [ ] 在页面中集成
- [ ] 测试语言切换功能
- [ ] 检查类型错误

### 开发后
- [ ] 验证所有语言翻译完整
- [ ] 测试语言持久化功能
- [ ] 测试浏览器语言检测
- [ ] 检查响应式布局
- [ ] 优化用户体验

---

## 实战案例：智程日历多语言实现

### 实现内容

| 模块 | 文件 | 说明 |
|------|------|------|
| i18n 工具库 | `lib/utils/i18n.ts` | 语言类型、配置、检测 |
| 翻译文件 | `lib/utils/translations.ts` | 5种语言完整翻译 |
| i18n Store | `lib/stores/i18nStore.ts` | Zustand + persist |
| 语言切换器 | `components/LanguageSwitcher.tsx` | 下拉菜单组件 |
| 样式文件 | `components/LanguageSwitcher.module.scss` | 黑金配色样式 |
| 页面集成 | `components/landing/LandingPage.tsx` | 落地页集成 |

### 支持的语言

| 语言代码 | 语言名称 | 国旗 |
|---------|---------|------|
| zh-CN | 简体中文 | 🇨🇳 |
| zh-TW | 繁體中文 | 🇹🇼 |
| en-US | English | 🇺🇸 |
| ja-JP | 日本語 | 🇯🇵 |
| ko-KR | 한국어 | 🇰🇷 |

---

## 总结

### 成功因素
1. ✅ 清晰的功能架构设计
2. ✅ 完整的 TypeScript 类型安全
3. ✅ 模块化的组件设计
4. ✅ 流畅的用户体验
5. ✅ 完善的状态持久化
6. ✅ 智能的浏览器语言检测

### 经验教训
1. ⚠️ 开发前要做好完整规划
2. ⚠️ 注意开发服务器锁文件问题
3. ⚠️ 翻译文件要保持同步更新
4. ⚠️ 定期运行类型检查
5. ⚠️ 测试时要清除 localStorage

### 核心原则
- **类型安全** - 完整的 TypeScript 类型定义
- **用户体验** - 流畅的语言切换体验
- **持久化** - 保存用户语言选择
- **模块化** - 可复用的组件设计
- **可维护** - 清晰的代码结构

---

**记住：好的多语言功能不是简单的文本翻译，而是完整的国际化体验！** 🌍
