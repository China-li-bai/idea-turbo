import type { SupportedLocale } from './i18n'

export type AIModelType = 'multilingual'

export type EmbeddingTask = 'query' | 'passage'

export interface AIModelConfig {
  id: string
  name: string
  description: string
  modelName: string
  dimensions: number
  supportedLocales: SupportedLocale[]
  type: AIModelType
  preferredDtype: string
  prefixConfig?: {
    query: string
    passage: string
  }
}

export const AI_MODELS: Record<AIModelType, AIModelConfig> = {
  'multilingual': {
    id: 'multilingual',
    name: 'BGE-M3 多语言模型',
    description: '2026年SOTA多语言Embedding模型，支持100+语言，中英文语义理解最佳',
    modelName: 'Xenova/bge-m3',
    dimensions: 1024,
    supportedLocales: ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'],
    type: 'multilingual',
    preferredDtype: 'q8',
  }
}

export const DEFAULT_AI_MODEL: AIModelType = 'multilingual'

export const LEGACY_MODEL_TYPES = ['zh-specific', 'english'] as const

export function migrateModelType(saved: string | null): AIModelType {
  if (!saved) return DEFAULT_AI_MODEL
  if (saved in AI_MODELS) return saved as AIModelType
  return DEFAULT_AI_MODEL
}

export function getRecommendedModel(_locale: SupportedLocale): AIModelType {
  return 'multilingual'
}

export function getModelConfig(modelType: AIModelType): AIModelConfig {
  return AI_MODELS[modelType]
}

export function isModelCompatibleWithLocale(
  _modelType: AIModelType,
  _locale: SupportedLocale
): boolean {
  return true
}

export function formatTextForEmbedding(
  text: string,
  _task: EmbeddingTask,
  config: AIModelConfig
): string {
  if (!config.prefixConfig) {
    return text
  }

  const prefix = config.prefixConfig[_task]
  return `${prefix}${text}`
}
