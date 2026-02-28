import { Translations } from './types';

export const jaJP: Translations = {
  common: {
    play: '再生',
    pause: '一時停止',
    stop: '停止',
    previous: '前のセグメント',
    next: '次のセグメント',
    continue: '続行',
    custom: 'カスタム',
    default: 'デフォルト'
  },
  page: {
    title: 'テキスト読み上げ',
    placeholder: '聞きたい文章をここに貼り付けて、すぐにスタート！🎵',
    currentSegment: '現在の再生: セグメント',
    totalSegments: '中',
    currentService: '現在のサービス',
    autoMode: '(自動)'
  },
  controls: {
    previousSegment: '前のセグメント',
    play: '再生',
    pause: '一時停止',
    stop: '停止',
    nextSegment: '次のセグメント'
  },
  service: {
    title: 'TTS サービス選択',
    auto: '自動切替',
    webspeech: 'Web Speech API',
    edgetts: 'Edge-TTS',
    currentService: '現在のサービス',
    autoSelect: '(自動)'
  },
  config: {
    profile: 'プロファイル',
    custom: 'カスタム',
    rate: '速度',
    pitch: 'ピッチ',
    volume: '音量',
    voiceSelection: '音声選択',
    defaultVoice: 'デフォルト音声',
    searchVoice: '音声を検索...',
    currentTTSService: '現在の TTS サービス'
  },
  footer: {
    copyright: '© 2025 テキスト読み上げサービス. 全著作権所有.',
    privacy: 'プライバシーポリシー',
    terms: '利用規約',
    cookies: 'Cookie ポリシー'
  },
  cookieConsent: {
    title: 'Cookie 設定',
    description: 'ユーザー体験の向上とウェブサイトトラフィックの分析のために Cookie を使用しています。Cookie の使用に同意するかどうかを選択してください。',
    learnMore: '詳細を見る',
    necessary: '必要なもののみ',
    customize: 'カスタマイズ',
    acceptAll: 'すべて受け入れる'
  },
  landing: {
    heroTitle: 'あなたの言葉が、<br />今、生きている。',
    heroSubtitle: 'スタジオ級AI音声で、あなたのテキストに命を吹き込みます。',
    getStarted: '今すぐ始める',
    inputTitle: 'テキストを貼り付けて開始',
    inputSubtitle: 'リアリズムを即座に体験。',
    inputPlaceholder: '魔法のような何かを入力...',
    featuresTitle: 'プレミアム機能',
    featureStudioVoices: 'スタジオ音声',
    featureStudioVoicesDesc: 'クリスタルクリアで高忠実度の波形。',
    featureOfflineMode: 'オフラインモード',
    featureOfflineModeDesc: 'どこでも安全なデバイス処理。',
    featureNeuralAI: 'ニューラルAI',
    featureNeuralAIDesc: '感情的深みと人間的な抑揚。',
    nowPlaying: '再生中',
    premiumVoice: 'プレミアム音声'
  }
};
