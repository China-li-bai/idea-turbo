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
