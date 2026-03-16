---
name: "multilingual-i18n"
description: "Implements multilingual support for React/Next.js apps. Invoke when user asks for i18n, language switching, or translations."
---

# Multilingual i18n Implementation Skill

This skill provides complete guidance for implementing multilingual support in React/Next.js applications with TypeScript, Zustand, and SCSS modules.

## When to Use This Skill

Invoke this skill when:
- User asks for multilingual/i18n support
- User needs language switching functionality
- User wants to add translations to the app
- User asks for browser language detection
- User wants to persist language preference

## Architecture Overview

```
i18n System
├── i18n Utils (lib/utils/i18n.ts)
│   ├── Language type definitions
│   ├── Locale configuration
│   └── Browser language detection
├── Translations (lib/utils/translations.ts)
│   ├── Translation interface
│   ├── Translation data (5 languages)
│   └── useTranslation hook
├── i18n Store (lib/stores/i18nStore.ts)
│   ├── Zustand store
│   ├── Persist middleware
│   └── Initialization hook
└── Language Switcher (components/LanguageSwitcher.tsx)
    ├── Dropdown menu
    ├── Flag emoji icons
    └── Click-outside-to-close
```

## Implementation Steps

### Step 1: Create i18n Utils

File: `lib/utils/i18n.ts`

```typescript
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

export function detectUserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en-US'
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en-US'
  const langMap: Record<string, SupportedLocale> = {
    'zh': 'zh-CN', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW',
    'en': 'en-US', 'en-US': 'en-US',
    'ja': 'ja-JP', 'ja-JP': 'ja-JP',
    'ko': 'ko-KR', 'ko-KR': 'ko-KR',
  }
  return langMap[browserLang] || 'en-US'
}
```

### Step 2: Create Translations File

File: `lib/utils/translations.ts`

```typescript
import type { SupportedLocale } from './i18n'

export interface Translations {
  page: {
    title: string
    description: string
  }
}

export const translations: Record<SupportedLocale, Translations> = {
  'zh-CN': { page: { title: '标题', description: '描述' } },
  'zh-TW': { page: { title: '標題', description: '描述' } },
  'en-US': { page: { title: 'Title', description: 'Description' } },
  'ja-JP': { page: { title: 'タイトル', description: '説明' } },
  'ko-KR': { page: { title: '제목', description: '설명' } },
}

export function useTranslation(locale: SupportedLocale): Translations {
  return translations[locale] || translations['en-US']
}
```

### Step 3: Create i18n Store

File: `lib/stores/i18nStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type SupportedLocale } from '@/lib/utils/i18n'

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
    { name: 'app-i18n' }
  )
)
```

### Step 4: Create Language Switcher Component

File: `components/LanguageSwitcher.tsx`

```typescript
'use client'
import { useState, useRef, useEffect } from 'react'
import { supportedLocales, type SupportedLocale } from '@/lib/utils/i18n'
import styles from './LanguageSwitcher.module.scss'

interface Props {
  currentLocale: SupportedLocale
  onChange: (locale: SupportedLocale) => void
}

export default function LanguageSwitcher({ currentLocale, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const flagMap: Record<SupportedLocale, string> = {
    'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', 'en-US': '🇺🇸', 'ja-JP': '🇯🇵', 'ko-KR': '🇰🇷',
  }

  return (
    <div ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)}>
        {flagMap[currentLocale]} {supportedLocales.find(l => l.code === currentLocale)?.nativeName}
      </button>
      {isOpen && (
        <div className={styles.dropdown}>
          {supportedLocales.map(l => (
            <button key={l.code} onClick={() => { onChange(l.code); setIsOpen(false) }}>
              {flagMap[l.code]} {l.nativeName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Step 5: Integrate in Page

File: `app/page.tsx` or component

```typescript
'use client'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18nStore } from '@/lib/stores/i18nStore'
import { useTranslation } from '@/lib/utils/translations'

export default function Page() {
  const { locale, setLocale } = useI18nStore()
  const t = useTranslation(locale)

  return (
    <div>
      <LanguageSwitcher currentLocale={locale} onChange={setLocale} />
      <h1>{t.page.title}</h1>
    </div>
  )
}
```

## Common Issues & Solutions

### Issue: Dev Server Lock File Conflict

```bash
# Solution: Delete .next directory and restart
rm -rf .next && pnpm dev
```

### Issue: Language Not Persisting

- Ensure persist middleware is properly configured
- Check localStorage is accessible
- Verify store name is unique

### Issue: TypeScript Errors

- Run `tsc --noEmit` to check for type errors
- Ensure all translation keys are defined in interface
- Use fallback: `translations[locale] || translations['en-US']`

## Checklist

- [ ] Create i18n utils with language detection
- [ ] Define translation interface and data
- [ ] Create Zustand store with persist
- [ ] Build language switcher component
- [ ] Integrate in pages
- [ ] Test language switching
- [ ] Test persistence across refresh
- [ ] Run type check

## Supported Languages

| Code | Name | Flag |
|------|------|------|
| zh-CN | Simplified Chinese | 🇨🇳 |
| zh-TW | Traditional Chinese | 🇹🇼 |
| en-US | English | 🇺🇸 |
| ja-JP | Japanese | 🇯🇵 |
| ko-KR | Korean | 🇰🇷 |

## Key Files

| Purpose | Path |
|---------|------|
| i18n utilities | `lib/utils/i18n.ts` |
| Translations | `lib/utils/translations.ts` |
| Store | `lib/stores/i18nStore.ts` |
| Component | `components/LanguageSwitcher.tsx` |
| Styles | `components/LanguageSwitcher.module.scss` |
| Skill doc | `MULTILINGUAL_I18N_SKILL.md` |
