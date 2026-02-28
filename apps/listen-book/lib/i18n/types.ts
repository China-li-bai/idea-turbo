export type Language = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';

export interface Translations {
  common: {
    play: string;
    pause: string;
    stop: string;
    previous: string;
    next: string;
    continue: string;
    custom: string;
    default: string;
  };
  page: {
    title: string;
    placeholder: string;
    currentSegment: string;
    totalSegments: string;
    currentService: string;
    autoMode: string;
  };
  controls: {
    previousSegment: string;
    play: string;
    pause: string;
    stop: string;
    nextSegment: string;
  };
  service: {
    title: string;
    auto: string;
    webspeech: string;
    edgetts: string;
    currentService: string;
    autoSelect: string;
  };
  config: {
    profile: string;
    custom: string;
    rate: string;
    pitch: string;
    volume: string;
    voiceSelection: string;
    defaultVoice: string;
    searchVoice: string;
    currentTTSService: string;
  };
  footer: {
    copyright: string;
    privacy: string;
    terms: string;
    cookies: string;
  };
  cookieConsent: {
    title: string;
    description: string;
    learnMore: string;
    necessary: string;
    customize: string;
    acceptAll: string;
  };
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    getStarted: string;
    inputTitle: string;
    inputSubtitle: string;
    inputPlaceholder: string;
    featuresTitle: string;
    featureStudioVoices: string;
    featureStudioVoicesDesc: string;
    featureOfflineMode: string;
    featureOfflineModeDesc: string;
    featureNeuralAI: string;
    featureNeuralAIDesc: string;
    nowPlaying: string;
    premiumVoice: string;
  };
}
