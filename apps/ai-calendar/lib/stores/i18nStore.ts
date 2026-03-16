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
