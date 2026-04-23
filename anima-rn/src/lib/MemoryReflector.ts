import type { EpisodicMemory, SemanticFact, EncodingContext, EvolutionPattern } from '../types'
import {
  getEpisodicMemories as dbGetEpi,
  getSemanticFacts as dbGetSem,
  insertEpisodicMemory as dbInsertEpi,
  insertSemanticFact as dbInsertSem,
  deleteWeakMemories as dbDeleteWeak,
  decayAllEpisodicMemories as dbDecayEpi,
  type EpisodicRow,
  type SemanticRow,
} from './LocalDB'
import { extractKeywordsWithFallback, detectEvolutionPattern } from './CognitiveMemoryExtractor'

export interface ReflectionResult {
  reviewedEpisodic: number
  reviewedSemantic: number
  merged: number
  contradicted: number
  decayed: number
  pruned: number
  insights: string[]
}

interface MemoryCluster {
  topic: string
  memories: EpisodicRow[]
  facts: SemanticRow[]
}

function safeParseJSON<T>(json: string): T | undefined {
  try {
    return JSON.parse(json) as T
  } catch {
    return undefined
  }
}

function clusterByTopic(rows: EpisodicRow[]): MemoryCluster[] {
  const clusters: Map<string, EpisodicRow[]> = new Map()

  for (const row of rows) {
    const keywords = row.keywords_text
      ? row.keywords_text.split(' ').filter(Boolean)
      : extractKeywordsWithFallback(row.content)

    const primaryTopic = keywords[0] || 'uncategorized'

    let assigned = false
    for (const [existingTopic, existingRows] of clusters) {
      const overlap = keywords.filter(k => existingTopic.includes(k) || k.includes(existingTopic))
      if (overlap.length > 0) {
        existingRows.push(row)
        assigned = true
        break
      }
    }

    if (!assigned) {
      clusters.set(primaryTopic, [row])
    }
  }

  return Array.from(clusters.entries()).map(([topic, memories]) => ({
    topic,
    memories,
    facts: [],
  }))
}

async function findContradictions(
  facts: SemanticRow[]
): Promise<Array<{ old: SemanticRow; new_: SemanticRow; pattern: EvolutionPattern }>> {
  const contradictions: Array<{ old: SemanticRow; new_: SemanticRow; pattern: EvolutionPattern }> = []

  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const evolution = detectEvolutionPattern(
        facts[j].key,
        facts[j].value,
        [{ key: facts[i].key, value: facts[i].value, confidence: facts[i].confidence }]
      )
      if (evolution && evolution.pattern === 'contradiction') {
        contradictions.push({
          old: facts[i].confidence >= facts[j].confidence ? facts[i] : facts[j],
          new_: facts[i].confidence >= facts[j].confidence ? facts[j] : facts[i],
          pattern: 'contradiction',
        })
      }
    }
  }

  return contradictions
}

export async function reflectOnMemories(petId: string): Promise<ReflectionResult> {
  const result: ReflectionResult = {
    reviewedEpisodic: 0,
    reviewedSemantic: 0,
    merged: 0,
    contradicted: 0,
    decayed: 0,
    pruned: 0,
    insights: [],
  }

  const epiRows = await dbGetEpi(petId, { limit: 200 })
  const semRows = await dbGetSem(petId)

  result.reviewedEpisodic = epiRows.length
  result.reviewedSemantic = semRows.length

  const clusters = clusterByTopic(epiRows)

  for (const cluster of clusters) {
    if (cluster.memories.length < 3) continue

    const lowImportance = cluster.memories.filter(m => m.importance < 0.3)
    if (lowImportance.length >= 2) {
      const representative = lowImportance.reduce((best, m) =>
        m.importance > best.importance ? m : best
      )

      const mergedContent = `[合并记忆] ${representative.content} (来自${lowImportance.length}条相似记忆)`

      await dbInsertEpi({
        id: `merged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pet_id: petId,
        content: mergedContent,
        timestamp: new Date().toISOString(),
        privacy_level: representative.privacy_level,
        tags: representative.tags,
        importance: Math.min(representative.importance + 0.1, 1.0),
        embedding_json: representative.embedding_json,
        encoding_context_json: representative.encoding_context_json,
        fragment_type: representative.fragment_type,
        keywords_text: representative.keywords_text,
      })

      result.merged++
      result.insights.push(`合并了${lowImportance.length}条关于"${cluster.topic}"的低重要性记忆`)
    }
  }

  const contradictions = await findContradictions(semRows)
  for (const { old, new_, pattern } of contradictions) {
    if (pattern === 'contradiction') {
      await dbInsertSem({
        id: old.id,
        pet_id: petId,
        key: old.key,
        value: `${old.value} → ${new_.value}`,
        category: old.category,
        confidence: Math.min(old.confidence, new_.confidence) * 0.6,
        source_episodic_ids: old.source_episodic_ids,
        privacy_level: old.privacy_level,
      })
      result.contradicted++
      result.insights.push(`发现矛盾: ${old.key} 从 "${old.value}" 变为 "${new_.value}"`)
    }
  }

  const decayed = await dbDecayEpi(0.95)
  result.decayed = decayed

  const pruned = await dbDeleteWeak(0.1)
  result.pruned = pruned

  if (epiRows.length > 100) {
    result.insights.push(`记忆库较大(${epiRows.length}条)，建议增加反思频率`)
  }

  if (semRows.filter(s => s.confidence < 0.2).length > 10) {
    result.insights.push(`有${semRows.filter(s => s.confidence < 0.2).length}条低置信度语义事实，下次整理将清理`)
  }

  const highImportance = epiRows.filter(m => m.importance > 0.8)
  if (highImportance.length > 0) {
    const topics = new Set<string>()
    for (const m of highImportance) {
      const kws = m.keywords_text ? m.keywords_text.split(' ') : []
      if (kws[0]) topics.add(kws[0])
    }
    if (topics.size > 0) {
      result.insights.push(`用户最在意的话题: ${Array.from(topics).slice(0, 5).join('、')}`)
    }
  }

  console.log(
    `[MemoryReflector] 🪞 反思完成 | 审查:${result.reviewedEpisodic}+${result.reviewedSemantic} ` +
    `合并:${result.merged} 矛盾:${result.contradicted} 衰减:${result.decayed} 清理:${result.pruned}`
  )

  return result
}

export function shouldReflect(
  episodicCount: number,
  semanticCount: number,
  lastReflectionTime: number
): boolean {
  const hoursSinceLastReflection = (Date.now() - lastReflectionTime) / (1000 * 60 * 60)

  if (hoursSinceLastReflection < 1) return false

  if (episodicCount > 50 && hoursSinceLastReflection > 4) return true
  if (episodicCount > 100 && hoursSinceLastReflection > 2) return true
  if (episodicCount > 200 && hoursSinceLastReflection > 1) return true

  return false
}
