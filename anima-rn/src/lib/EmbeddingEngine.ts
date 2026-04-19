export interface IEmbeddingEngine {
  readonly name: string
  readonly dimensions: number
  embed(text: string): Promise<Float32Array>
  embedBatch(texts: string[]): Promise<Float32Array[]>
  similarity(a: Float32Array, b: Float32Array): number
  isReady(): boolean
}

import { OnnxEmbeddingEngine } from './OnnxEmbeddingEngine'

const VOCAB: Record<string, number> = {
  '工作': 0.9, '加班': 0.85, '老板': 0.8, '同事': 0.75, '项目': 0.7,
  '会议': 0.65, ' deadline ': 0.7, '薪资': 0.85, '升职': 0.8, '跳槽': 0.85,
  '学习': 0.75, '考试': 0.7, '成绩': 0.65, '毕业': 0.7, '论文': 0.68,
  '爱好': 0.72, '运动': 0.68, '游戏': 0.6, '电影': 0.62, '音乐': 0.6,
  '旅行': 0.7, '美食': 0.65, '摄影': 0.63, '阅读': 0.67, '画画': 0.6,
  '家人': 0.88, '父母': 0.87, '朋友': 0.82, '恋爱': 0.85, '结婚': 0.86,
  '孩子': 0.88, '分手': 0.84, '吵架': 0.78, '和好': 0.76, '想念': 0.83,
  '开心': 0.7, '难过': 0.72, '焦虑': 0.78, '压力': 0.76, '疲惫': 0.74,
  '孤独': 0.77, '兴奋': 0.68, '生气': 0.71, '失望': 0.73, '害怕': 0.69,
  '健康': 0.82, '生病': 0.8, '睡眠': 0.75, '饮食': 0.65, '锻炼': 0.67,
  '天气': 0.5, '周末': 0.55, '假期': 0.6, '生日': 0.72, '节日': 0.58,
  'MBTI': 0.85, 'INFP': 0.8, 'INTJ': 0.8, 'ENFP': 0.78, '性格': 0.82,
  '内向': 0.78, '外向': 0.76, '敏感': 0.74, '理性': 0.72, '感性': 0.73,
  '计划': 0.65, '目标': 0.68, '梦想': 0.71, '遗憾': 0.74, '后悔': 0.73,
  '秘密': 0.9, '隐私': 0.88, '日记': 0.85, '吐槽': 0.8, '倾诉': 0.82,
  '今天': 0.3, '昨天': 0.35, '明天': 0.3, '最近': 0.4, '经常': 0.35,
  '有时候': 0.3, '总是': 0.35, '从来': 0.4, '非常': 0.25, '特别': 0.28,
  '喜欢': 0.65, '讨厌': 0.7, '爱': 0.68, '恨': 0.72, '希望': 0.55,
  '觉得': 0.3, '感觉': 0.32, '知道': 0.2, '想': 0.25, '要': 0.15,
  '是': 0.1, '的': 0.08, '了': 0.08, '在': 0.1, '有': 0.12, '我': 0.15,
  '不': 0.15, '都': 0.12, '和': 0.1, '就': 0.12, '这': 0.13, '那': 0.13,
  '什么': 0.2, '怎么': 0.22, '为什么': 0.25, '因为': 0.25, '所以': 0.23,
  '但是': 0.24, '不过': 0.22, '然后': 0.18, '如果': 0.2, '虽然': 0.21,
}

const DIMENSIONS = 128
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '都', '这',
  '那', '着', '与', '或', '及', '等', '到', '从', '把', '被',
  '让', '给', '向', '往', '对', '比', '为', '以', '按', '因',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once',
])

function tokenize(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
  const tokens: string[] = []

  let i = 0
  while (i < cleaned.length) {
    const code = cleaned.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) {
      tokens.push(cleaned[i])
      i++
    } else if (/[a-zA-Z0-9]/.test(cleaned[i])) {
      let word = ''
      while (i < cleaned.length && /[a-zA-Z0-9]/.test(cleaned[i])) {
        word += cleaned[i]
        i++
      }
      tokens.push(word.toLowerCase())
    } else {
      i++
    }
  }

  return tokens.filter((t) => t.length > 0 && !STOP_WORDS.has(t))
}

function hashToken(token: string): number {
  let hash = 2166136261
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }
  return hash % DIMENSIONS
}

export class KeywordEmbeddingEngine implements IEmbeddingEngine {
  readonly name = 'keyword-fallback'
  readonly dimensions = DIMENSIONS
  private _ready = true

  isReady(): boolean {
    return this._ready
  }

  async embed(text: string): Promise<Float32Array> {
    const vec = new Float32Array(DIMENSIONS)
    const tokens = tokenize(text)
    const tf: Record<string, number> = {}

    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1
    }

    for (const [token, count] of Object.entries(tf)) {
      const weight = VOCAB[token] || 0.3
      const tfidf = Math.sqrt(count) * weight
      const idx = hashToken(token)
      vec[idx] += tfidf

      const idx2 = (idx + 37) % DIMENSIONS
      vec[idx2] += tfidf * 0.5

      const idx3 = (idx + 73) % DIMENSIONS
      vec[idx3] += tfidf * 0.25
    }

    let norm = 0
    for (let i = 0; i < DIMENSIONS; i++) {
      norm += vec[i] * vec[i]
    }
    norm = Math.sqrt(norm) || 1

    for (let i = 0; i < DIMENSIONS; i++) {
      vec[i] /= norm
    }

    return vec
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)))
  }

  similarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    if (denom === 0) return 0
    return dotProduct / denom
  }
}

let engineInstance: IEmbeddingEngine | null = null
let onnxEngine: OnnxEmbeddingEngine | null = null

export function getEmbeddingEngine(): IEmbeddingEngine {
  if (!engineInstance) {
    engineInstance = new KeywordEmbeddingEngine()
    console.log('[EmbeddingEngine] ✅ 使用关键词嵌入引擎 (Keyword Fallback)')
  }
  return engineInstance
}

export function setEmbeddingEngine(engine: IEmbeddingEngine): void {
  engineInstance = engine
  console.log(`[EmbeddingEngine] 🔄 切换到: ${engine.name} (${engine.dimensions}d)`)
}

export async function initEmbeddingEngine(modelDir?: string): Promise<{ engine: IEmbeddingEngine; usingOnnx: boolean }> {
  console.log('[EmbeddingEngine] 🚀 初始化嵌入引擎...')

  try {
    onnxEngine = new OnnxEmbeddingEngine()
    const success = await onnxEngine.init(modelDir)

    if (success && onnxEngine.isReady()) {
      engineInstance = onnxEngine
      console.log(`[EmbeddingEngine] ✅ BGE-Micro-v2 ONNX 引擎就绪! (${onnxEngine.dimensions}d)`)
      return { engine: engineInstance, usingOnnx: true }
    }

    console.warn('[EmbeddingEngine] ⚠️ ONNX 引擎初始化失败，降级到关键词引擎')
    console.warn(`[EmbeddingEngine]   原因: ${onnxEngine.error}`)
  } catch (e: any) {
    console.warn('[EmbeddingEngine] ⚠️ ONNX 加载异常:', e.message || e)
  }

  onnxEngine = null
  engineInstance = new KeywordEmbeddingEngine()
  console.log('[EmbeddingEngine] ✅ 使用关键词嵌入引擎 (Keyword Fallback, 128d)')
  return { engine: engineInstance, usingOnnx: false }
}

export function isUsingOnnxEngine(): boolean {
  return engineInstance instanceof OnnxEmbeddingEngine && engineInstance.isReady()
}

export async function releaseEmbeddingEngine(): Promise<void> {
  if (onnxEngine) {
    await onnxEngine.release()
    onnxEngine = null
  }
  engineInstance = null
  console.log('[EmbeddingEngine] 🔓 已释放')
}

export async function findMostSimilar(
  query: string,
  candidates: Array<{ id: string; content: string }>,
  topK: number = 5,
  minScore: number = 0.3
): Promise<Array<{ id: string; score: number }>> {
  const engine = getEmbeddingEngine()
  const queryVec = await engine.embed(query)

  const scored: Array<{ id: string; score: number }> = []

  for (const candidate of candidates) {
    const candVec = await engine.embed(candidate.content)
    const score = engine.similarity(queryVec, candVec)
    if (score >= minScore) {
      scored.push({ id: candidate.id, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
