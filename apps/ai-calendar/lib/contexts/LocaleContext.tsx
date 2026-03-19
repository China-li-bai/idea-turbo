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
    'cache.reindexConfirm': '切换模型将需要重新生成所有项目的向量索引，可能需要几分钟时间。是否继续？',
    'boss.aiLoading': 'AI 引擎加载中...',
    'boss.inputPlaceholder': '在这里输入明天的会议，或是突发的灵感...',
    'boss.createFailed': '创建失败，请重试',
    'boss.todayTitle': 'Today / 执行线',
    'boss.noEvents': '暂无日程',
    'boss.ideasTitle': 'Ideas / 灵感胶囊',
    'boss.quickCapture': '按 Cmd + K 快速捕捉',
    'boss.convertToEvent': '转换为日程',
    'boss.deleteIdea': '删除灵感',
    'boss.deleteEvent': '删除事件',
    'boss.completeEvent': '完成',
    'secretary.noResults': '抱歉，我没有找到相关的信息。您可以尝试用不同的关键词搜索。',
    'secretary.foundItems': '我找到了 {count} 个相关项目：',
    'secretary.idea': '灵感',
    'secretary.event': '日程',
    'secretary.time': '时间',
    'secretary.location': '地点',
    'secretary.unknownTitle': '未知标题',
    'secretary.proposalTitle': '日程建议',
    'secretary.proposalTime': '备选时间',
    'secretary.confirmSchedule': '确认安排',
    'secretary.cancel': '取消',
    'secretary.inputPlaceholder': '问我任何关于日程的问题...',
    'secretary.processing': '思考中...',
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
    'cache.reindexConfirm': '切換模型將需要重新生成所有項目的向量索引，可能需要幾分鐘時間。是否繼續？',
    'boss.aiLoading': 'AI 引擎載入中...',
    'boss.inputPlaceholder': '在這裡輸入明天的會議，或是突發的靈感...',
    'boss.createFailed': '建立失敗，請重試',
    'boss.todayTitle': 'Today / 執行線',
    'boss.noEvents': '暫無日程',
    'boss.ideasTitle': 'Ideas / 靈感膠囊',
    'boss.quickCapture': '按 Cmd + K 快速捕捉',
    'boss.convertToEvent': '轉換為日程',
    'boss.deleteIdea': '刪除靈感',
    'boss.deleteEvent': '刪除事件',
    'boss.completeEvent': '完成',
    'secretary.noResults': '抱歉，我沒有找到相關的資訊。您可以嘗試用不同的關鍵字搜尋。',
    'secretary.foundItems': '我找到了 {count} 個相關項目：',
    'secretary.idea': '靈感',
    'secretary.event': '日程',
    'secretary.time': '時間',
    'secretary.location': '地點',
    'secretary.unknownTitle': '未知標題',
    'secretary.proposalTitle': '日程建議',
    'secretary.proposalTime': '備選時間',
    'secretary.confirmSchedule': '確認安排',
    'secretary.cancel': '取消',
    'secretary.inputPlaceholder': '問我任何關於日程的問題...',
    'secretary.processing': '思考中...',
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
    'cache.reindexConfirm': 'Switching models requires regenerating vector embeddings for all items. This may take a few minutes. Continue?',
    'boss.aiLoading': 'AI Engine loading...',
    'boss.inputPlaceholder': 'Type tomorrow\'s meeting, or a sudden inspiration...',
    'boss.createFailed': 'Failed to create, please try again',
    'boss.todayTitle': 'Today / Execution',
    'boss.noEvents': 'No events',
    'boss.ideasTitle': 'Ideas / Inspiration Capsules',
    'boss.quickCapture': 'Press Cmd + K to quick capture',
    'boss.convertToEvent': 'Convert to event',
    'boss.deleteIdea': 'Delete idea',
    'boss.deleteEvent': 'Delete event',
    'boss.completeEvent': 'Complete',
    'secretary.noResults': 'Sorry, I couldn\'t find any relevant information. Try different keywords.',
    'secretary.foundItems': 'I found {count} related items:',
    'secretary.idea': 'Idea',
    'secretary.event': 'Event',
    'secretary.time': 'Time',
    'secretary.location': 'Location',
    'secretary.unknownTitle': 'Unknown title',
    'secretary.proposalTitle': 'Schedule Proposal',
    'secretary.proposalTime': 'Alternative times',
    'secretary.confirmSchedule': 'Confirm',
    'secretary.cancel': 'Cancel',
    'secretary.inputPlaceholder': 'Ask me anything about your schedule...',
    'secretary.processing': 'Thinking...',
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
    'cache.reindexConfirm': 'モデルの切り替えには、すべてのアイテムのベクトル埋め込みを再生成する必要があります。これには数分かかる場合があります。続けますか？',
    'boss.aiLoading': 'AI エンジン読み込み中...',
    'boss.inputPlaceholder': '明日の会議や、突然のアイデアを入力...',
    'boss.createFailed': '作成に失敗しました、もう一度お試しください',
    'boss.todayTitle': 'Today / 実行ライン',
    'boss.noEvents': '予定なし',
    'boss.ideasTitle': 'Ideas / インスピレーションカプセル',
    'boss.quickCapture': 'Cmd + K でクイックキャプチャ',
    'boss.convertToEvent': '予定に変換',
    'boss.deleteIdea': 'アイデアを削除',
    'boss.deleteEvent': '予定を削除',
    'boss.completeEvent': '完了',
    'secretary.noResults': '申し訳ございません、関連情報が見つかりませんでした。別のキーワードをお試しください。',
    'secretary.foundItems': '{count} 件の関連項目が見つかりました：',
    'secretary.idea': 'アイデア',
    'secretary.event': '予定',
    'secretary.time': '時間',
    'secretary.location': '場所',
    'secretary.unknownTitle': '不明なタイトル',
    'secretary.proposalTitle': 'スケジュール提案',
    'secretary.proposalTime': '代替時間',
    'secretary.confirmSchedule': '確認',
    'secretary.cancel': 'キャンセル',
    'secretary.inputPlaceholder': 'スケジュールについて何でも聞いてください...',
    'secretary.processing': '考え中...',
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
    'cache.reindexConfirm': '모델을 전환하려면 모든 아이템의 벡터 임베딩을 다시 생성해야 합니다. 몇 분이 걸릴 수 있습니다. 계속하시겠습니까?',
    'boss.aiLoading': 'AI 엔진 로딩 중...',
    'boss.inputPlaceholder': '내일 회의나 갑작스러운 영감을 입력하세요...',
    'boss.createFailed': '생성 실패, 다시 시도해 주세요',
    'boss.todayTitle': 'Today / 실행 라인',
    'boss.noEvents': '일정 없음',
    'boss.ideasTitle': 'Ideas / 영감 캡슐',
    'boss.quickCapture': 'Cmd + K 로 빠른 캡처',
    'boss.convertToEvent': '일정으로 변환',
    'boss.deleteIdea': '아이디어 삭제',
    'boss.deleteEvent': '일정 삭제',
    'boss.completeEvent': '완료',
    'secretary.noResults': '죄송합니다, 관련 정보를 찾을 수 없습니다. 다른 키워드를 시도해 보세요.',
    'secretary.foundItems': '{count}개의 관련 항목을 찾았습니다:',
    'secretary.idea': '아이디어',
    'secretary.event': '일정',
    'secretary.time': '시간',
    'secretary.location': '장소',
    'secretary.unknownTitle': '알 수 없는 제목',
    'secretary.proposalTitle': '일정 제안',
    'secretary.proposalTime': '대체 시간',
    'secretary.confirmSchedule': '확인',
    'secretary.cancel': '취소',
    'secretary.inputPlaceholder': '일정에 대해 무엇이든 물어보세요...',
    'secretary.processing': '생각 중...',
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
