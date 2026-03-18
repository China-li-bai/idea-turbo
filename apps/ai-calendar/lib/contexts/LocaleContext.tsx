'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  SupportedLocale, 
  supportedLocales, 
  detectUserLocale 
} from '@/lib/utils/i18n';

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = 'ai-calendar-locale';

const translations: Record<SupportedLocale, Record<string, string>> = {
  'zh-CN': {
    'app.title': '智程日历',
    'app.local': '本地优先',
    'view.boss': 'Boss',
    'view.secretary': 'Secretary',
    'search.placeholder': '搜索或输入想法...',
    'search.results': '搜索结果',
    'model.title': 'AI 模型',
    'model.ready': '就绪',
    'model.loading': '加载中',
    'shortcut.hint': '按 Cmd+K 随时捕获',
    'cache.clickToClear': '点击清除模型缓存',
    'cache.clearConfirm': '确定要清除模型缓存吗？下次加载需要重新下载模型。',
    'cache.reloadConfirm': '镜像源设置已更改，需要刷新页面才能生效。是否立即刷新？',
  },
  'zh-TW': {
    'app.title': '智程日曆',
    'app.local': '本地優先',
    'view.boss': 'Boss',
    'view.secretary': 'Secretary',
    'search.placeholder': '搜尋或輸入想法...',
    'search.results': '搜尋結果',
    'model.title': 'AI 模型',
    'model.ready': '就緒',
    'model.loading': '載入中',
    'shortcut.hint': '按 Cmd+K 隨時捕獲',
    'cache.clickToClear': '點擊清除模型快取',
    'cache.clearConfirm': '確定要清除模型快取嗎？下次載入需要重新下載模型。',
    'cache.reloadConfirm': '鏡像源設定已更改，需要重新整理頁面才能生效。是否立即重新整理？',
  },
  'en-US': {
    'app.title': 'SmartJourney',
    'app.local': '100% Local',
    'view.boss': 'Boss',
    'view.secretary': 'Secretary',
    'search.placeholder': 'Search or type an idea...',
    'search.results': 'Search Results',
    'model.title': 'AI Model',
    'model.ready': 'Ready',
    'model.loading': 'Loading',
    'shortcut.hint': 'Press Cmd+K to capture anywhere',
    'cache.clickToClear': 'Click to clear model cache',
    'cache.clearConfirm': 'Are you sure you want to clear the model cache? You will need to re-download models next time.',
    'cache.reloadConfirm': 'Mirror source setting changed. Page reload required. Reload now?',
  },
  'ja-JP': {
    'app.title': 'スマートジャーニー',
    'app.local': 'ローカル優先',
    'view.boss': 'Boss',
    'view.secretary': 'Secretary',
    'search.placeholder': '検索またはアイデアを入力...',
    'search.results': '検索結果',
    'model.title': 'AI モデル',
    'model.ready': '準備完了',
    'model.loading': '読み込み中',
    'shortcut.hint': 'Cmd+K でいつでもキャプチャ',
    'cache.clickToClear': 'クリックしてモデルキャッシュをクリア',
    'cache.clearConfirm': 'モデルキャッシュをクリアしますか？次回はモデルを再ダウンロードする必要があります。',
    'cache.reloadConfirm': 'ミラーソース設定が変更されました。ページを再読み込みする必要があります。今すぐ再読み込みしますか？',
  },
  'ko-KR': {
    'app.title': '스마트저니',
    'app.local': '로컬 우선',
    'view.boss': 'Boss',
    'view.secretary': 'Secretary',
    'search.placeholder': '검색 또는 아이디어 입력...',
    'search.results': '검색 결과',
    'model.title': 'AI 모델',
    'model.ready': '준비됨',
    'model.loading': '로딩 중',
    'shortcut.hint': 'Cmd+K로 언제든 캡처',
    'cache.clickToClear': '클릭하여 모델 캐시 지우기',
    'cache.clearConfirm': '모델 캐시를 지우시겠습니까? 다음에 모델을 다시 다운로드해야 합니다.',
    'cache.reloadConfirm': '미러 소스 설정이 변경되었습니다. 페이지를 새로고침해야 합니다. 지금 새로고침하시겠습니까?',
  },
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('zh-CN');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const savedLocale = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (savedLocale && supportedLocales.some(l => l.code === savedLocale)) {
      setLocaleState(savedLocale);
    } else {
      const detected = detectUserLocale();
      setLocaleState(detected);
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[locale]?.[key] || key;
  }, [locale]);

  if (!mounted) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
