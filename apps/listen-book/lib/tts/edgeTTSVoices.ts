export interface EdgeTTSVoice {
  id: string;
  name: string;
  displayName: string;
  locale: string;
  gender: 'Male' | 'Female';
  language: string;
}

export const EDGE_TTS_VOICES: EdgeTTSVoice[] = [
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: 'XiaoxiaoNeural',
    displayName: '晓晓',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaoyiNeural',
    name: 'XiaoyiNeural',
    displayName: '晓伊',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-YunxiNeural',
    name: 'YunxiNeural',
    displayName: '云希',
    locale: 'zh-CN',
    gender: 'Male',
    language: '中文'
  },
  {
    id: 'zh-CN-YunyangNeural',
    name: 'YunyangNeural',
    displayName: '云扬',
    locale: 'zh-CN',
    gender: 'Male',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaohanNeural',
    name: 'XiaohanNeural',
    displayName: '晓涵',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaomengNeural',
    name: 'XiaomengNeural',
    displayName: '晓梦',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaochenNeural',
    name: 'XiaochenNeural',
    displayName: '晓辰',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaoruiNeural',
    name: 'XiaoruiNeural',
    displayName: '晓睿',
    locale: 'zh-CN',
    gender: 'Male',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaoshuangNeural',
    name: 'XiaoshuangNeural',
    displayName: '晓双',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-YunfengNeural',
    name: 'YunfengNeural',
    displayName: '云枫',
    locale: 'zh-CN',
    gender: 'Male',
    language: '中文'
  },
  {
    id: 'zh-CN-YunjianNeural',
    name: 'YunjianNeural',
    displayName: '云健',
    locale: 'zh-CN',
    gender: 'Male',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaoxuanNeural',
    name: 'XiaoxuanNeural',
    displayName: '晓萱',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-YunxiaNeural',
    name: 'YunxiaNeural',
    displayName: '云夏',
    locale: 'zh-CN',
    gender: 'Male',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaomoNeural',
    name: 'XiaomoNeural',
    displayName: '晓墨',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'zh-CN-XiaozhenNeural',
    name: 'XiaozhenNeural',
    displayName: '晓甄',
    locale: 'zh-CN',
    gender: 'Female',
    language: '中文'
  },
  {
    id: 'en-US-JennyNeural',
    name: 'JennyNeural',
    displayName: 'Jenny',
    locale: 'en-US',
    gender: 'Female',
    language: 'English'
  },
  {
    id: 'en-US-GuyNeural',
    name: 'GuyNeural',
    displayName: 'Guy',
    locale: 'en-US',
    gender: 'Male',
    language: 'English'
  },
  {
    id: 'ja-JP-NanamiNeural',
    name: 'NanamiNeural',
    displayName: 'Nanami',
    locale: 'ja-JP',
    gender: 'Female',
    language: '日本語'
  },
  {
    id: 'ja-JP-KeitaNeural',
    name: 'KeitaNeural',
    displayName: 'Keita',
    locale: 'ja-JP',
    gender: 'Male',
    language: '日本語'
  },
  {
    id: 'ko-KR-SunHiNeural',
    name: 'SunHiNeural',
    displayName: 'Sun-Hi',
    locale: 'ko-KR',
    gender: 'Female',
    language: '한국어'
  },
  {
    id: 'ko-KR-InJoonNeural',
    name: 'InJoonNeural',
    displayName: 'InJoon',
    locale: 'ko-KR',
    gender: 'Male',
    language: '한국어'
  }
];

export function getEdgeTTSVoices(): SpeechSynthesisVoice[] {
  return EDGE_TTS_VOICES.map(voice => ({
    name: voice.displayName,
    lang: voice.locale,
    voiceURI: voice.id,
    default: false,
    localService: false
  }));
}
