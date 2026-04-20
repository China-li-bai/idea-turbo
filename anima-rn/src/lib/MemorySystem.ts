import type {
  WorkingMemory,
  WorkingMemoryEntry,
  EpisodicMemory,
  SemanticFact,
  PrivacyLevel,
  ChatMode,
  MemoryExtractResult,
} from '../types'
import { classifyPrivacyFromContent } from './PrivacyGuard'
import {
  initLocalDB,
  insertEpisodicMemory as dbInsertEpi,
  getEpisodicMemories as dbGetEpi,
  getRecentEpisodicMemories as dbGetRecentEpi,
  updateEpisodicAccess as dbUpdateAccess,
  decayAllEpisodicMemories as dbDecayEpi,
  deleteWeakMemories as dbDeleteWeak,
  insertSemanticFact as dbInsertSem,
  getSemanticFacts as dbGetSem,
  boostSemanticConfidence as dbBoostSem,
  getConfigValue as dbGetConfig,
  setConfigValue as dbSetConfig,
  getDBStats as dbStats,
  type EpisodicRow,
  type SemanticRow,
} from './LocalDB'
import { getEmbeddingEngine, findMostSimilar, initEmbeddingEngine } from './EmbeddingEngine'

const WORKING_MEMORY_MAX = 20
const EPISODIC_DECAY_RATE = 0.95
const SEMANTIC_CONFIDENCE_BOOST = 0.1
const SEMANTIC_CONFIDENCE_DECAY = 0.02
const IMPORTANCE_THRESHOLD = 0.15
const CONSOLIDATION_INTERVAL_MS = 10 * 60 * 1000
const CONSOLIDATION_DELAY_MS = 5000
const CONSOLIDATION_TURN_THRESHOLD = 6

let workingMemories: Map<string, WorkingMemory> = new Map()
let isInitialized = false
let lastConsolidationTime = Date.now()
let conversationTurnCounter = 0

export async function initMemorySystem(): Promise<void> {
  if (isInitialized) return

  await initLocalDB()

  try {
    const { engine, usingOnnx } = await initEmbeddingEngine()
    console.log(
      `[MemorySystem] 🧮 Embedding: ${engine.name} (${engine.dimensions}d, ONNX=${usingOnnx})`
    )
  } catch (embErr: any) {
    console.warn('[MemorySystem] ⚠️ Embedding engine init failed (non-critical):', embErr.message)
    getEmbeddingEngine()
  }

  isInitialized = true

  const stats = await dbStats()
  console.log(
    `[MemorySystem] ✅ 初始化完成 | 📔事件:${stats.episodicCount} | 🧠事实:${stats.semanticCount} | 💬对话:${stats.conversationCount}`
  )

  const lastConsol = await dbGetConfig('last_consolidation')
  if (lastConsol) {
    lastConsolidationTime = new Date(lastConsol).getTime()
  }
}

export function isMemoryReady(): boolean {
  return isInitialized
}

export function getWorkingMemory(conversationId: string): WorkingMemory {
  let wm = workingMemories.get(conversationId)
  if (!wm) {
    wm = { conversationId, entries: [], maxEntries: WORKING_MEMORY_MAX, topicSummary: '' }
    workingMemories.set(conversationId, wm)
  }
  return wm
}

export function addToWorkingMemory(
  conversationId: string,
  role: WorkingMemoryEntry['role'],
  content: string
): void {
  const wm = getWorkingMemory(conversationId)
  wm.entries.push({ role, content, timestamp: Date.now() })

  if (wm.entries.length > wm.maxEntries) {
    const removed = wm.entries.splice(0, wm.entries.length - wm.maxEntries)
    if (removed.length > 0) {
      console.log(`[MemorySystem] 📦 工作记忆溢出, 归档 ${removed.length} 条`)
    }
  }

  updateTopicSummary(wm)

  if (role === 'user') {
    conversationTurnCounter++
  }

  const timeSinceLastConsolidation = Date.now() - lastConsolidationTime
  const shouldConsolidate =
    (conversationTurnCounter >= CONSOLIDATION_TURN_THRESHOLD) ||
    (timeSinceLastConsolidation > CONSOLIDATION_INTERVAL_MS && conversationTurnCounter >= 2)

  if (shouldConsolidate) {
    scheduleBackgroundConsolidation()
  }
}

function updateTopicSummary(wm: WorkingMemory): void {
  const recent = wm.entries.slice(-6)
  if (recent.length < 2) return

  const userMsgs = recent.filter((e) => e.role === 'user').map((e) => e.content)
  if (userMsgs.length === 0) return

  const keywords = extractKeywords(userMsgs.join(' '))
  wm.topicSummary = keywords.slice(0, 5).join('、') || '日常聊天'
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['的', '了', '是', '我', '你', '他', '她', '它', '这', '那', '有', '在', '不', '都', '也', '就', '会', '能', '要', '什么', '怎么', '为什么', '吗', '吧', '啊', '呢', '哦', '嗯', '哈哈', '嘿嘿', '嘻嘻'])
  const words = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').split('')
  const freq: Record<string, number> = {}

  for (const word of words) {
    if (word.length >= 2 && !stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)
}

export function getRecentContext(conversationId: string, count?: number): Array<{ role: string; content: string }> {
  const wm = workingMemories.get(conversationId)
  if (!wm || wm.entries.length === 0) return []

  const entries = (count ? wm.entries.slice(-count) : wm.entries).slice(-10)
  return entries.map((e) => ({
    role: e.role === 'user' ? 'user' : 'assistant',
    content: e.content,
  }))
}

export function clearWorkingMemory(conversationId: string): void {
  workingMemories.delete(conversationId)
}

export async function addEpisodicMemory(
  memory: Omit<EpisodicMemory, 'id' | 'createdAt' | 'accessCount' | 'lastAccessed'>
): Promise<EpisodicMemory> {
  const engine = getEmbeddingEngine()
  const embeddingVec = await engine.embed(memory.content)
  const embeddingArr = Array.from(embeddingVec)

  const newMemory: EpisodicMemory = {
    ...memory,
    id: `epi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    accessCount: 0,
    lastAccessed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    embedding: embeddingArr,
  }

  await dbInsertEpi({
    id: newMemory.id,
    pet_id: memory.petId,
    content: memory.content,
    timestamp: memory.timestamp || new Date().toISOString(),
    privacy_level: memory.privacyLevel as number,
    tags: JSON.stringify(memory.tags),
    importance: memory.importance ?? 0.5,
    embedding_json: JSON.stringify(embeddingArr),
  })

  console.log(`[MemorySystem] +Episodic [${PRIVACY_ICONS[memory.privacyLevel]}] ${memory.content.slice(0, 50)}...`)

  return newMemory
}

export async function retrieveRelevantEpisodic(
  petId: string,
  query: string,
  mode: ChatMode,
  limit: number = 3
): Promise<EpisodicMemory[]> {
  if (!isInitialized) return []

  const allowedLevels: PrivacyLevel[] =
    mode === 'owner' ? [1, 2, 3] : mode === 'friend' ? [1, 2] : [1]

  const rows = await dbGetEpi(petId, { maxPrivacyLevel: Math.max(...allowedLevels) as 1 | 2 | 3, limit: 50 })

  if (rows.length === 0) return []

  try {
    const candidates = rows.map((r) => ({ id: r.id, content: r.content }))
    const similar = await findMostSimilar(query, candidates, limit * 2, 0.15)

    const similarIds = new Set(similar.map((s) => s.id))
    const results: EpisodicMemory[] = []

    for (const row of rows) {
      if (!allowedLevels.includes(row.privacy_level as 1 | 2 | 3)) continue
      if (results.length >= limit) break

      const simScore = similar.find((s) => s.id === row.id)?.score ?? 0
      const keywordScore = calculateKeywordScore(query, row.content)
      const recencyBonus = Math.max(0, 1 - daysSince(row.last_accessed || row.created_at) / 30)
      const finalScore = simScore * 0.5 + keywordScore * 0.3 + row.importance * 0.15 + recencyBonus * 0.05

      if (finalScore > 0.2 || similarIds.has(row.id)) {
        results.push({
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
        })

        dbUpdateAccess(row.id)
      }
    }

    results.sort((a, b) => b.importance - a.importance)
    return results.slice(0, limit)
  } catch (err: any) {
    console.warn('[MemorySystem] 向量检索失败, 回退到关键词匹配:', err.message)
    return fallbackKeywordSearch(rows, query, allowedLevels, limit)
  }
}

function calculateKeywordScore(query: string, content: string): number {
  const queryKeywords = new Set(extractKeywords(query))
  const contentKeywords = extractKeywords(content)
  let score = 0

  for (const qk of queryKeywords) {
    if (contentKeywords.some((ck) => ck.includes(qk) || qk.includes(ck))) {
      score += 0.3
    }
    if (content.toLowerCase().includes(qk.toLowerCase())) {
      score += 0.2
    }
  }

  return Math.min(score, 1)
}

function fallbackKeywordSearch(
  rows: EpisodicRow[],
  query: string,
  allowedLevels: PrivacyLevel[],
  limit: number
): EpisodicMemory[] {
  const queryKeywords = new Set(extractKeywords(query))

  const scored = rows
    .filter((r) => allowedLevels.includes(r.privacy_level as 1 | 2 | 3))
    .map((row) => ({
      row,
      score:
        calculateKeywordScore(query, row.content) +
        row.importance * 0.5 +
        Math.log(row.access_count + 1) * 0.1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(({ row }) => ({
    id: row.id,
    petId: row.pet_id,
    content: row.content,
    timestamp: row.timestamp,
    privacyLevel: row.privacy_level as PrivacyLevel,
    tags: JSON.parse(row.tags || '[]'),
    importance: row.importance,
    accessCount: row.access_count,
    lastAccessed: row.last_accessed || row.created_at,
    createdAt: row.created_at,
  }))
}

export async function addSemanticFact(
  fact: Omit<SemanticFact, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SemanticFact> {
  const existingRows = await dbGetSem(fact.petId, { categories: [fact.category] })
  const existing = existingRows.find((r) => r.key === fact.key)

  let result: SemanticFact

  if (existing) {
    const newConfidence = Math.min(1, existing.confidence + SEMANTIC_CONFIDENCE_BOOST)
    await dbInsertSem({
      id: existing.id,
      pet_id: fact.petId,
      key: fact.key,
      value: fact.value,
      category: fact.category,
      confidence: newConfidence,
      source_episodic_ids: JSON.stringify(fact.sourceEpisodicIds),
      privacy_level: fact.privacyLevel,
    })

    result = {
      id: existing.id,
      petId: fact.petId,
      key: fact.key,
      value: fact.value,
      category: fact.category,
      confidence: newConfidence,
      sourceEpisodicIds: fact.sourceEpisodicIds,
      privacyLevel: fact.privacyLevel,
      createdAt: existing.created_at,
      updatedAt: new Date().toISOString(),
    }

    console.log(`[MemorySystem] ~Semantic ↑ ${fact.key}=${fact.value} (${(newConfidence * 100).toFixed(0)}%)`)
  } else {
    const id = `sem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()

    await dbInsertSem({
      id,
      pet_id: fact.petId,
      key: fact.key,
      value: fact.value,
      category: fact.category,
      confidence: fact.confidence,
      source_episodic_ids: JSON.stringify(fact.sourceEpisodicIds),
      privacy_level: fact.privacyLevel,
    })

    result = {
      ...fact,
      id,
      createdAt: now,
      updatedAt: now,
    }

    console.log(`[MemorySystem] +Semantic [${fact.category}] ${fact.key}=${fact.value}`)
  }

  return result
}

export async function retrieveSemanticProfile(petId: string, mode: ChatMode): Promise<SemanticFact[]> {
  if (!isInitialized) return []

  const allowedLevels: PrivacyLevel[] =
    mode === 'owner' ? [1, 2, 3] : mode === 'friend' ? [1, 2] : [1]

  const rows = await dbGetSem(petId, { maxPrivacyLevel: Math.max(...allowedLevels) as 1 | 2 | 3 })

  return rows
    .filter((r) => allowedLevels.includes(r.privacy_level as 1 | 2 | 3))
    .sort((a, b) => b.confidence - a.confidence)
    .map((r) => ({
      id: r.id,
      petId: r.pet_id,
      key: r.key,
      value: r.value,
      category: r.category as SemanticFact['category'],
      confidence: r.confidence,
      sourceEpisodicIds: JSON.parse(r.source_episodic_ids),
      privacyLevel: r.privacy_level as PrivacyLevel,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
}

export async function consolidateMemories(petId: string): Promise<{ episodicRemoved: number; semanticDecayed: number }> {
  if (!isInitialized) return { episodicRemoved: 0, semanticDecayed: 0 }

  console.log('[MemorySystem] 🔄 开始记忆整理...')

  const decayed = await dbDecayEpi(EPISODIC_DECAY_RATE)
  console.log(`[MemorySystem] 事件重要性衰减: ${decayed} 条`)

  const deleted = await dbDeleteWeak(IMPORTANCE_THRESHOLD)
  console.log(`[MemorySystem] 弱记忆遗忘: ${deleted} 条`)

  const semRows = await dbGetSem(petId)
  let semanticDecayed = 0
  for (const row of semRows) {
    if (row.confidence - SEMANTIC_CONFIDENCE_DECAY < 0.1) {
      semanticDecayed++
    }
  }

  await dbSetConfig('last_consolidation', new Date().toISOString())
  lastConsolidationTime = Date.now()

  const stats = await dbStats()
  console.log(
    `[MemorySystem] ✅ 整理完成 | 📔事件:${stats.episodicCount} | 🧠事实:${stats.semanticCount} (遗忘${deleted}, 衰减${semanticDecayed})`
  )

  return { episodicRemoved: deleted, semanticDecayed }
}

let consolidationTimer: ReturnType<typeof setTimeout> | null = null

function scheduleBackgroundConsolidation(): void {
  if (consolidationTimer) return

  consolidationTimer = setTimeout(async () => {
    consolidationTimer = null
    try {
      const turns = conversationTurnCounter
      conversationTurnCounter = 0
      console.log(`[MemorySystem] 🔄 自动触发记忆整理 (累积${turns}轮对话)`)
      await consolidateMemories('*')
    } catch (e: any) {
      console.error('[MemorySystem] 后台整理失败:', e.message)
    }
  }, CONSOLIDATION_DELAY_MS)
}

export function clearConsolidationTimer(): void {
  if (consolidationTimer) {
    clearTimeout(consolidationTimer)
    consolidationTimer = null
  }
}

export function extractAndClassify(rawText: string, petId: string): MemoryExtractResult {
  const sentences = rawText
    .split(/(?<=[。！？\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 150)

  const episodic: MemoryExtractResult['episodic'] = []
  const semantic: MemoryExtractResult['semantic'] = []

  for (const sentence of sentences) {
    const privacyLevel = classifyPrivacyFromContent(sentence)
    const tags = extractKeywords(sentence)

    if (looksLikeEvent(sentence)) {
      episodic.push({
        content: sentence,
        privacyLevel,
        tags: tags.slice(0, 4),
      })
    }

    const factMatch = sentence.match(/(?:主人|用户|他|她)(.{0,3})(?:是|喜欢|讨厌|想|会|觉得|认为|从事|在)(.{2,30})/)
    if (factMatch) {
      const category = categorizeFact(factMatch[2])
      semantic.push({
        key: factMatch[2].trim().slice(0, 40),
        value: factMatch[2].trim(),
        category,
        privacyLevel,
      })
    }
  }

  return { episodic: episodic.slice(0, 3), semantic: semantic.slice(0, 3) }
}

function looksLikeEvent(text: string): boolean {
  const eventIndicators = [
    /今天|昨天|刚才|刚刚|这周|最近/,
    /打算|准备|要去|去了|正在/,
    /说|告诉|提到|聊起/,
    /因为|所以|但是|然后/,
    /开心|难过|生气|兴奋|累|忙/,
  ]
  return eventIndicators.some((p) => p.test(text)) && text.length > 6
}

function categorizeFact(value: string): SemanticFact['category'] {
  if (/喜欢|爱|爱好|兴趣|迷上|沉迷/i.test(value)) return 'preference'
  if (/是.{0,4}(INFP|INTJ|ENTP|[A-Z]{4})|性格|MBTI|内向|外向/i.test(value)) return 'personality'
  if (/工作|职业|公司|学校|住|住在/i.test(value)) return 'fact'
  return 'preference'
}

export async function buildMemoryPromptContext(
  petId: string,
  query: string,
  mode: ChatMode
): Promise<string> {
  if (!isInitialized) return ''

  const [relevantEpi, profile] = await Promise.all([
    retrieveRelevantEpisodic(petId, query, mode, 2),
    retrieveSemanticProfile(petId, mode),
  ])

  const parts: string[] = []

  if (profile.length > 0) {
    const profileStr = profile
      .filter((f) => f.confidence >= 0.25)
      .map((f) => `${f.key}: ${f.value}`)
      .join('；')
    parts.push(`已知信息: ${profileStr}`)
  }

  if (relevantEpi.length > 0 && mode !== 'visitor') {
    const epiStr = relevantEpi.map((e) => e.content).join('；')
    parts.push(`相关记忆: ${epiStr}`)
  }

  return parts.join('\n') || ''
}

export async function getAllMemories(petId: string): Promise<{
  episodic: EpisodicMemory[]
  semantic: SemanticFact[]
}> {
  if (!isInitialized) return { episodic: [], semantic: [] }

  const [epiRows, semRows] = await Promise.all([dbGetEpi(petId, { limit: 100 }), dbGetSem(petId)])

  return {
    episodic: epiRows.map((r) => ({
      id: r.id,
      petId: r.pet_id,
      content: r.content,
      timestamp: r.timestamp,
      privacyLevel: r.privacy_level as PrivacyLevel,
      tags: JSON.parse(r.tags || '[]'),
      importance: r.importance,
      accessCount: r.access_count,
      lastAccessed: r.last_accessed || r.created_at,
      createdAt: r.created_at,
    })),
    semantic: semRows.map((r) => ({
      id: r.id,
      petId: r.pet_id,
      key: r.key,
      value: r.value,
      category: r.category as SemanticFact['category'],
      confidence: r.confidence,
      sourceEpisodicIds: JSON.parse(r.source_episodic_ids),
      privacyLevel: r.privacy_level as PrivacyLevel,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  }
}

export async function resetAllMemory(confirmToken?: string): Promise<void> {
  if (confirmToken !== 'CONFIRM_RESET_ALL_MEMORY') {
    console.warn('[MemorySystem] ⚠️ 记忆清空需要确认令牌')
    return
  }

  workingMemories.clear()
  conversationTurnCounter = 0
  try {
    const { getDB } = await import('./LocalDB')
    const database = getDB()
    await database.execAsync(`
      DELETE FROM episodic_memories;
      DELETE FROM semantic_facts;
      DELETE FROM conversations;
      UPDATE memory_config SET value = '' WHERE key = 'last_consolidation';
      UPDATE memory_config SET value = '0' WHERE key = 'total_episodic_count';
    `)
    console.log('[MemorySystem] 🗑️ 所有记忆已清空')
  } catch {
    console.warn('[MemorySystem] 数据库未初始化, 跳过清理')
  }
}

const PRIVACY_ICONS: Record<PrivacyLevel, string> = { 1: '🌐', 2: '👥', 3: '🔒' }

function daysSince(isoDate: string): number {
  const diff = Date.now() - new Date(isoDate).getTime()
  return diff / (1000 * 60 * 60 * 24)
}
