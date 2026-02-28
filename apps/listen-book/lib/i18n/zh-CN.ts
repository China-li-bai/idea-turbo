import { Translations } from './types';

export const zhCN: Translations = {
  common: {
    play: '播放',
    pause: '暂停',
    stop: '停止',
    previous: '上一段',
    next: '下一段',
    continue: '继续',
    custom: '自定义',
    default: '默认'
  },
  page: {
    title: '文本转语音',
    placeholder: '把你想听的内容放这里，马上开始～',
    currentSegment: '当前播放: 第',
    totalSegments: '段',
    currentService: '当前服务',
    autoMode: '(自动选择)'
  },
  controls: {
    previousSegment: '上一段',
    play: '播放',
    pause: '暂停',
    stop: '停止',
    nextSegment: '下一段'
  },
  service: {
    title: 'TTS 服务选择',
    auto: '自动切换',
    webspeech: 'Web Speech API',
    edgetts: 'Edge-TTS',
    currentService: '当前服务',
    autoSelect: '(自动选择)'
  },
  config: {
    profile: '配置文件',
    custom: '自定义',
    rate: '语速',
    pitch: '音调',
    volume: '音量',
    voiceSelection: '语音选择',
    defaultVoice: '默认语音',
    searchVoice: '搜索语音...',
    currentTTSService: '当前 TTS 服务'
  },
  footer: {
    copyright: '© 2025 文本转语音服务. 保留所有权利.',
    privacy: '隐私政策',
    terms: '服务条款',
    cookies: 'Cookie 政策'
  },
  cookieConsent: {
    title: 'Cookie 设置',
    description: '我们使用 Cookie 来改善您的体验并分析网站流量。请选择您是否同意我们使用 Cookie。',
    learnMore: '了解更多',
    necessary: '仅必要',
    customize: '自定义',
    acceptAll: '接受所有'
  },
  landing: {
    heroTitle: '你的文字，<br />现在活了。',
    heroSubtitle: '工作室级AI语音，让你的文字栩栩如生。',
    getStarted: '立即开始',
    inputTitle: '粘贴文本开始',
    inputSubtitle: '即刻体验真实感。',
    inputPlaceholder: '输入一些神奇的内容...',
    featuresTitle: '高级功能',
    featureStudioVoices: '工作室级语音',
    featureStudioVoicesDesc: '水晶般清晰的高保真波形。',
    featureOfflineMode: '离线模式',
    featureOfflineModeDesc: '随时随地安全设备处理。',
    featureNeuralAI: '神经AI',
    featureNeuralAIDesc: '情感深度和人类语调。',
    nowPlaying: '正在播放',
    premiumVoice: '高级语音'
  }
};
