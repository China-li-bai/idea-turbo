import type { EpisodicMemory, SemanticFact, EncodingContext, ChatMode, PrivacyLevel } from '../types'
import {
  getEpisodicMemories as dbGetEpi,
  searchEpisodicByKeywords as dbSearchKeywords,
  getSemanticFacts as dbGetSem,
  updateEpisodicAccess as dbUpdateAccess,
  type EpisodicRow,
} from './LocalDB'
import { findMostSimilar } from './EmbeddingEngine'
import { extractKeywordsWithFallback } from './CognitiveMemoryExtractor'

export interface RetrievalSignal {
  semantic: number
  keyword: number
  recency: number
  importance: number
  context: number
}

export const DEFAULT_WEIGHTS: RetrievalSignal = {
  semantic: 0.30,
  keyword: 0.25,
  recency: 0.15,
  importance: 0.15,
  context: 0.15,
}

export interface HybridRetrievalOptions {
  petId: string
  query: string
  mode: ChatMode
  limit?: number
  queryContext?: EncodingContext
  weights?: Partial<RetrievalSignal>
  minScore?: number
}

export interface ScoredMemory {
  memory: EpisodicMemory
  score: number
  signals: RetrievalSignal
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
}

function safeParseJSON<T>(json: string): T | undefined {
  try {
    return JSON.parse(json) as T
  } catch {
    return undefined
  }
}

function rowToEpisodicMemory(row: EpisodicRow): EpisodicMemory {
  return {
    id: row.id,
    petId: row.pet_id,
    content: row.content,
    timestamp: row.timestamp,
    privacyLevel: row.privacy_level as 1 | 2 | 3,
    tags: JSON.parse(row.tags || '[]'),
    importance: row.importance,
    accessCount: row.access_count,
    lastAccessed: row.last_accessed || row.created_at,
    createdAt: row.created_at,
    embedding: row.embedding_json ? JSON.parse(row.embedding_json) : undefined,
    encodingContext: row.encoding_context_json ? safeParseJSON<EncodingContext>(row.encoding_context_json) : undefined,
    fragmentType: (row.fragment_type as any) ?? undefined,
    keywords: row.keywords_text ? row.keywords_text.split(' ').filter(Boolean) : undefined,
  }
}

function calculateContextMatch(
  queryCtx: EncodingContext,
  memoryCtxJson: string | null
): number {
  if (!memoryCtxJson) return 0

  const memCtx = safeParseJSON<EncodingContext>(memoryCtxJson)
  if (!memCtx) return 0

  let score = 0

  if (queryCtx.userMood === memCtx.userMood) {
    score += 0.4
  } else if (
    (queryCtx.userMood === 'sad' && memCtx.userMood === 'anxious') ||
    (queryCtx.userMood === 'anxious' && memCtx.userMood === 'sad') ||
    (queryCtx.userMood === 'happy' && memCtx.userMood === 'excited') ||
    (queryCtx.userMood === 'excited' && memCtx.userMood === 'happy')
  ) {
    score += 0.25
  }

  if (queryCtx.timeOfDay === memCtx.timeOfDay) {
    score += 0.3
  }

  if (queryCtx.conversationTopic && memCtx.conversationTopic) {
    if (queryCtx.conversationTopic === memCtx.conversationTopic) {
      score += 0.3
    } else {
      const qTopicWords = new Set(queryCtx.conversationTopic.split(''))
      const mTopicWords = new Set(memCtx.conversationTopic.split(''))
      const overlap = [...qTopicWords].filter(w => mTopicWords.has(w)).length
      score += Math.min(overlap * 0.1, 0.2)
    }
  }

  return Math.min(score, 1.0)
}

export async function hybridRetrieve(
  options: HybridRetrievalOptions
): Promise<ScoredMemory[]> {
  const {
    petId,
    query,
    mode,
    limit = 5,
    queryContext,
    weights: customWeights,
    minScore = 0.12,
  } = options

  const allowedLevels: PrivacyLevel[] =
    mode === 'owner' ? [1, 2, 3] : mode === 'friend' ? [1, 2] : [1]

  const w: RetrievalSignal = { ...DEFAULT_WEIGHTS, ...customWeights }

  const rows = await dbGetEpi(petId, {
    maxPrivacyLevel: Math.max(...allowedLevels) as 1 | 2 | 3,
    limit: 80,
  })

  if (rows.length === 0) return []

  const queryKeywords = extractKeywordsWithFallback(query)

  const keywordResults = await dbSearchKeywords(petId, queryKeywords, 30)
  const keywordMap = new Map(keywordResults.map(kr => [kr.row.id, kr.score]))

  let semanticMap = new Map<string, number>()
  try {
    const candidates = rows.map(r => ({ id: r.id, content: r.content }))
    const similar = await findMostSimilar(query, candidates, 20, 0.1)
    semanticMap = new Map(similar.map(s => [s.id, s.score]))
  } catch (err: any) {
    console.warn('[HybridRetriever] 语义检索失败:', err.message)
  }

  const scored: ScoredMemory[] = []

  for (const row of rows) {
    if (!allowedLevels.includes(row.privacy_level as 1 | 2 | 3)) continue

    const signals: RetrievalSignal = {
      semantic: semanticMap.get(row.id) ?? 0,
      keyword: keywordMap.get(row.id) ?? 0,
      recency: Math.max(0, 1 - daysSince(row.last_accessed || row.created_at) / 30),
      importance: row.importance,
      context: queryContext ? calculateContextMatch(queryContext, row.encoding_context_json) : 0,
    }

    const finalScore =
      signals.semantic * w.semantic +
      signals.keyword * w.keyword +
      signals.recency * w.recency +
      signals.importance * w.importance +
      signals.context * w.context

    if (finalScore >= minScore) {
      scored.push({
        memory: rowToEpisodicMemory(row),
        score: finalScore,
        signals,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  const results = scored.slice(0, limit)

  for (const { memory } of results) {
    dbUpdateAccess(memory.id).catch(() => {})
  }

  return results
}

export async function retrieveSemanticFacts(
  petId: string,
  query: string,
  mode: ChatMode,
  limit: number = 5
): Promise<Array<SemanticFact & { relevanceScore: number }>> {
  const allowedLevels: PrivacyLevel[] =
    mode === 'owner' ? [1, 2, 3] : mode === 'friend' ? [1, 2] : [1]

  const rows = await dbGetSem(petId)
  const queryKeywords = new Set(extractKeywordsWithFallback(query).map(k => k.toLowerCase()))

  const scored = rows
    .filter(r => allowedLevels.includes(r.privacy_level as 1 | 2 | 3))
    .map(row => {
      let relevanceScore = row.confidence * 0.5

      const keyWords = new Set(row.key.toLowerCase().split(''))
      const valueWords = new Set(row.value.toLowerCase().split(''))

      for (const qk of queryKeywords) {
        if (keyWords.has(qk) || valueWords.has(qk)) {
          relevanceScore += 0.2
        }
        if (row.key.toLowerCase().includes(qk) || row.value.toLowerCase().includes(qk)) {
          relevanceScore += 0.15
        }
      }

      return {
        id: row.id,
        petId: row.pet_id,
        key: row.key,
        value: row.value,
        category: row.category as SemanticFact['category'],
        confidence: row.confidence,
        sourceEpisodicIds: JSON.parse(row.source_episodic_ids || '[]'),
        privacyLevel: row.privacy_level as PrivacyLevel,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        relevanceScore,
      } as SemanticFact & { relevanceScore: number }
    })
    .filter(f => f.relevanceScore > 0.15)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)

  return scored
}
