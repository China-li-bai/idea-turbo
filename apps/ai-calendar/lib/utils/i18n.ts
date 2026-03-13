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
  if (typeof navigator === 'undefined') {
    return 'en-US'
  }

  const browserLang = navigator.language || (navigator as any).userLanguage || 'en-US'
  
  const langMap: Record<string, SupportedLocale> = {
    'zh': 'zh-CN',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'zh-HK': 'zh-TW',
    'zh-SG': 'zh-CN',
    'en': 'en-US',
    'en-US': 'en-US',
    'en-GB': 'en-US',
    'ja': 'ja-JP',
    'ja-JP': 'ja-JP',
    'ko': 'ko-KR',
    'ko-KR': 'ko-KR',
  }

  return langMap[browserLang] || 'en-US'
}

export function getLocaleFromUrl(): SupportedLocale | null {
  if (typeof window === 'undefined') return null
  
  const path = window.location.pathname
  const langMatch = path.match(/^\/(zh-CN|zh-TW|en-US|ja-JP|ko-KR)/)
  
  if (langMatch) {
    return langMatch[1] as SupportedLocale
  }
  
  return null
}

export async function loadScheduleXTranslations(locale: SupportedLocale) {
  const translations = await import('@schedule-x/translations')
  
  const localeMap: Record<SupportedLocale, any> = {
    'zh-CN': translations.zhCN,
    'zh-TW': translations.zhTW,
    'en-US': translations.enUS,
    'ja-JP': translations.jaJP,
    'ko-KR': translations.koKR,
  }

  return localeMap[locale] || translations.enUS
}
