export interface LanguageMapping {
  shortCode: string;
  fullCode: string;
  edgeTTSCode?: string;
  displayName: string;
}

export const LANGUAGE_MAPPINGS: Record<string, LanguageMapping> = {
  'zh-CN': { shortCode: 'zh', fullCode: 'zh-CN', edgeTTSCode: 'zh-CN', displayName: '简体中文' },
  'zh': { shortCode: 'zh', fullCode: 'zh-CN', edgeTTSCode: 'zh-CN', displayName: '简体中文' },
  'en-US': { shortCode: 'en', fullCode: 'en-US', edgeTTSCode: 'en-US', displayName: '英语' },
  'en': { shortCode: 'en', fullCode: 'en-US', edgeTTSCode: 'en-US', displayName: '英语' },
  'ja-JP': { shortCode: 'ja', fullCode: 'ja-JP', edgeTTSCode: 'ja-JP', displayName: '日语' },
  'ja': { shortCode: 'ja', fullCode: 'ja-JP', edgeTTSCode: 'ja-JP', displayName: '日语' },
  'ko-KR': { shortCode: 'ko', fullCode: 'ko-KR', edgeTTSCode: 'ko-KR', displayName: '韩语' },
  'ko': { shortCode: 'ko', fullCode: 'ko-KR', edgeTTSCode: 'ko-KR', displayName: '韩语' },
  'fr-FR': { shortCode: 'fr', fullCode: 'fr-FR', edgeTTSCode: 'fr-FR', displayName: '法语' },
  'fr': { shortCode: 'fr', fullCode: 'fr-FR', edgeTTSCode: 'fr-FR', displayName: '法语' },
  'de-DE': { shortCode: 'de', fullCode: 'de-DE', edgeTTSCode: 'de-DE', displayName: '德语' },
  'de': { shortCode: 'de', fullCode: 'de-DE', edgeTTSCode: 'de-DE', displayName: '德语' },
  'es-ES': { shortCode: 'es', fullCode: 'es-ES', edgeTTSCode: 'es-ES', displayName: '西班牙语' },
  'es': { shortCode: 'es', fullCode: 'es-ES', edgeTTSCode: 'es-ES', displayName: '西班牙语' },
  'it-IT': { shortCode: 'it', fullCode: 'it-IT', edgeTTSCode: 'it-IT', displayName: '意大利语' },
  'it': { shortCode: 'it', fullCode: 'it-IT', edgeTTSCode: 'it-IT', displayName: '意大利语' },
  'pt-BR': { shortCode: 'pt', fullCode: 'pt-BR', edgeTTSCode: 'pt-BR', displayName: '葡萄牙语' },
  'pt': { shortCode: 'pt', fullCode: 'pt-BR', edgeTTSCode: 'pt-BR', displayName: '葡萄牙语' },
  'ru-RU': { shortCode: 'ru', fullCode: 'ru-RU', edgeTTSCode: 'ru-RU', displayName: '俄语' },
  'ru': { shortCode: 'ru', fullCode: 'ru-RU', edgeTTSCode: 'ru-RU', displayName: '俄语' },
  'ar-SA': { shortCode: 'ar', fullCode: 'ar-SA', edgeTTSCode: 'ar-SA', displayName: '阿拉伯语' },
  'ar': { shortCode: 'ar', fullCode: 'ar-SA', edgeTTSCode: 'ar-SA', displayName: '阿拉伯语' },
};

export function normalizeLanguageCode(code: string): LanguageMapping {
  return LANGUAGE_MAPPINGS[code] || {
    shortCode: code,
    fullCode: code,
    edgeTTSCode: code,
    displayName: code
  };
}

export function matchLanguageCode(voiceLang: string, targetLang: string): boolean {
  const normalized = normalizeLanguageCode(targetLang);
  
  return voiceLang === normalized.fullCode || 
         voiceLang === normalized.shortCode || 
         voiceLang.startsWith(normalized.fullCode + '-') || 
         voiceLang.startsWith(normalized.shortCode + '-');
}

export function getBackendLanguageCode(code: string): string {
  const normalized = normalizeLanguageCode(code);
  return normalized.shortCode;
}
