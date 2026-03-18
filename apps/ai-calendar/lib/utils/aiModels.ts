import type { SupportedLocale } from './i18n'

export type AIModelType = 'zh-specific' | 'multilingual' | 'english'

export type EmbeddingTask = 'query' | 'passage'

export interface AIModelConfig {
  id: string
  name: string
  description: string
  modelName: string
  dimensions: number
  supportedLocales: SupportedLocale[]
  type: AIModelType
  prefixConfig?: {
    query: string
    passage: string
  }
}

export const AI_MODELS: Record<AIModelType, AIModelConfig> = {
  'zh-specific': {
    id: 'zh-specific',
    name: '中文优化模型',
    description: '针对中文优化的 BGE 模型，中文语义理解最佳',
    modelName: 'Xenova/bge-small-zh-v1.5',
    dimensions: 512,
    supportedLocales: ['zh-CN', 'zh-TW'],
    type: 'zh-specific'
  },
  'multilingual': {
    id: 'multilingual',
    name: '多语言模型',
    description: '支持 100+ 语言的 E5 模型，适合国际化场景',
    modelName: 'Xenova/multilingual-e5-small',
    dimensions: 384,
    supportedLocales: ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'],
    type: 'multilingual',
    prefixConfig: {
      query: 'query: ',
      passage: 'passage: '
    }
  },
  'english': {
    id: 'english',
    name: '英文优化模型',
    description: '针对英文优化的 MiniLM 模型，英文语义理解最佳',
    modelName: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    supportedLocales: ['en-US'],
    type: 'english'
  }
}

export const DEFAULT_AI_MODEL: AIModelType = 'zh-specific'

export function getRecommendedModel(locale: SupportedLocale): AIModelType {
  if (locale === 'zh-CN' || locale === 'zh-TW') {
    return 'zh-specific'
  }
  if (locale === 'en-US') {
    return 'english'
  }
  return 'multilingual'
}

export function getModelConfig(modelType: AIModelType): AIModelConfig {
  return AI_MODELS[modelType]
}

export function isModelCompatibleWithLocale(
  modelType: AIModelType, 
  locale: SupportedLocale
): boolean {
  const config = AI_MODELS[modelType]
  return config.supportedLocales.includes(locale)
}

export function formatTextForEmbedding(
  text: string, 
  task: EmbeddingTask,
  config: AIModelConfig
): string {
  if (!config.prefixConfig) {
    return text
  }
  
  const prefix = config.prefixConfig[task]
  return `${prefix}${text}`
}
