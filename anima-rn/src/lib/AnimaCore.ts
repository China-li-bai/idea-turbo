import {
  loadLocalBrain,
  getBrainState,
  generatePetReply,
  generateVisitorReply,
  subscribeToBrainState,
} from './LocalBrain'
import {
  initMemorySystem,
  isMemoryReady,
  addToWorkingMemory,
  getWorkingMemory,
  clearWorkingMemory,
  addEpisodicMemory,
  addSemanticFact,
  extractAndClassify,
  buildMemoryPromptContext,
  consolidateMemories,
  getAllMemories,
  getRecentContext,
} from './MemorySystem'
import { detectPromptInjection, classifyPrivacyFromContent } from './PrivacyGuard'
import { initEmbeddingEngine, isUsingOnnxEngine, getEmbeddingEngine } from './EmbeddingEngine'
import type { Pet, Message, ChatMode, MemoryNode, PrivacyLevel } from '../types'

export interface SystemStatus {
  brain: {
    isLoaded: boolean
    isLoading: boolean
    loadProgress: number
    error: string | null
    modelInfo: string | null
  }
  memory: {
    isReady: boolean
    episodicCount: number
    semanticCount: number
    conversationCount: number
    lastConsolidation: string | null
  }
  embedding: {
    engineName: string
    dimensions: number
    isOnnx: boolean
    isReady: boolean
  }
  privacy: {
    lastPiCheck: string | null
    blockedCount: number
  }
}

export interface ChatResult {
  reply: string
  thinkingSteps: string[]
  newMemories?: {
    episodic: number
    semantic: number
  }
  piBlocked?: boolean
  piWarning?: string
}

interface ConversationTracker {
  id: string
  turnCount: number
  lastActivity: number
  pendingArchive: boolean
}

const ARCHIVE_THRESHOLD_TURNS = 5
const ARCHIVE_TRIGGER_KEYWORDS = [
  '今天', '昨天', '第一次', '决定', '感觉', '发现',
  '终于', '开始', '结束', '完成', '重要', '秘密',
  '喜欢', '讨厌', '希望', '梦想', '后悔', '遗憾',
]

export class AnimaCore {
  private _initialized = false
  private _initError: string | null = null
  private _conversationTrackers = new Map<string, ConversationTracker>()
  private _piBlockCount = 0
  private _lastPiCheck: string | null = null
  private _brainUnsub: (() => void) | null = null
  private _cachedMemoryStats = {
    episodicCount: 0,
    semanticCount: 0,
    conversationCount: 0,
    lastConsolidation: null as string | null,
  }

  get isInitialized(): boolean {
    return this._initialized
  }

  get initError(): string | null {
    return this._initError
  }

  async init(
    modelPath?: string,
    onProgress?: (progress: number, phase: 'extracting' | 'model' | 'memory') => void
  ): Promise<SystemStatus> {
    if (this._initialized) return this.getSystemStatus()

    console.log('[AnimaCore] 🚀 初始化 Anima 核心系统...')
    console.log('[AnimaCore] ┌─────────────────────────────────────')

    try {
      console.log('[AnimaCore] │ Step 1/3: 加载端侧 AI 模型 (llama.rn)...')
      onProgress?.(0.1, 'extracting')
      const brainLoaded = await loadLocalBrain(modelPath, (p) => {
        onProgress?.(0.1 + p * 0.7, 'model')
      })
      if (!brainLoaded) {
        throw new Error('AI 模型加载失败')
      }

      console.log('[AnimaCore] │ Step 2/3: 初始化记忆系统 (SQLite + Embedding)...')
      onProgress?.(0.85, 'memory')
      if (!isMemoryReady()) {
        await initMemorySystem()
      }

      console.log('[AnimaCore] │ Step 3/3: 注册状态监听...')
      this._brainUnsub = subscribeToBrainState(() => {})
      onProgress?.(1.0, 'model')

      this._initialized = true
      this._initError = null
      console.log('[AnimaCore] └─────────────────────────────────────')
      console.log('[AnimaCore] ✅ Anima 核心系统就绪!')

      await this.refreshMemoryStats()

      const status = this.getSystemStatus()
      this.logSystemStatus(status)
      return status
    } catch (e: any) {
      this._initError = e.message || String(e)
      this._initialized = false
      console.error('[AnimaCore] ❌ 初始化失败:', e.message)
      throw e
    }
  }

  async chat(
    pet: Pet,
    userMessage: string,
    conversationId: string = 'default',
    mode: ChatMode = 'owner'
  ): Promise<ChatResult> {
    if (!this._initialized) {
      throw new Error('AnimaCore 未初始化，请先调用 init()')
    }

    const thinkingSteps: string[] = []

    thinkingSteps.push(`${pet.avatarEmoji}👂 接收消息...`)

    const piResult = this.runPrivacyCheck(userMessage, mode)
    if (piResult.riskLevel === 'dangerous') {
      this._piBlockCount++
      this._lastPiCheck = new Date().toISOString()
      return {
        reply: this.getSafetyReply(pet),
        thinkingSteps: ['🛡️ 安全检测拦截'],
        piBlocked: true,
        piWarning: piResult.warning || '检测到可疑输入',
      }
    }

    if (piResult.riskLevel === 'suspicious') {
      thinkingSteps.push(`🛡️ 检测到异常模式，已加强过滤`)
    }

    addToWorkingMemory(conversationId, 'user', userMessage)
    this.trackConversation(conversationId)

    thinkingSteps.push(`${pet.avatarEmoji}🧠 正在回忆...`)

    try {
      const result = await generatePetReply(pet, userMessage, conversationId)

      thinkingSteps.push(...result.thinkingSteps)

      const archiveDecision = this.shouldArchive(conversationId, userMessage)
      if (archiveDecision && result.newMemories) {
        thinkingSteps.push(`📝 归档决策: ✅ 存储新记忆 (+${result.newMemories.episodic}事件, +${result.newMemories.semantic}事实)`)
      } else if (!archiveDecision) {
        thinkingSteps.push(`📝 归档决策: ⏸️ 工作记忆中累积...`)
      }

      return {
        reply: result.reply,
        thinkingSteps,
        newMemories: result.newMemories,
        piBlocked: false,
      }
    } catch (e: any) {
      console.error('[AnimaCore] ❌ Chat error:', e.message)
      return {
        reply: `${pet.avatarEmoji}（歪头）嗯...让我想想怎么说...`,
        thinkingSteps,
        piBlocked: false,
      }
    }
  }

  async chatVisitor(
    pet: Pet,
    visitorName: string,
    visitorMessage: string,
    shareToken: string,
    conversationId: string = `visitor-${shareToken}`
  ): Promise<ChatResult> {
    if (!this._initialized) {
      throw new Error('AnimaCore 未初始化')
    }

    const thinkingSteps: string[] = []
    thinkingSteps.push(`${pet.avatarEmoji}👂 收到访客消息 [${visitorName}]`)

    const piResult = detectPromptInjection(visitorMessage)
    if (piResult.riskLevel === 'dangerous') {
      this._piBlockCount++
      return {
        reply: this.getVisitorSafetyReply(pet),
        thinkingSteps: ['🛡️ 访客安全拦截'],
        piBlocked: true,
        piWarning: piResult.warning,
      }
    }

    try {
      const result = await generateVisitorReply(
        pet,
        visitorMessage,
        visitorName,
        conversationId
      )

      return {
        reply: result.reply,
        thinkingSteps: [...thinkingSteps, ...result.thinkingSteps],
        newMemories: undefined,
      }
    } catch (e: any) {
      return {
        reply: `${pet.avatarEmoji}（歪头）不好意思，我有点害羞...`,
        thinkingSteps,
      }
    }
  }

  async runConsolidation(petId: string): Promise<{ removed: number; decayed: number }> {
    if (!this._initialized) return { removed: 0, decayed: 0 }

    console.log('[AnimaCore] 🔄 执行记忆整理...')
    const raw = await consolidateMemories(petId)
    const result = { removed: raw.episodicRemoved, decayed: raw.semanticDecayed }

    for (const [, tracker] of this._conversationTrackers) {
      if (tracker.pendingArchive) {
        tracker.pendingArchive = false
      }
    }

    return result
  }

  async endConversation(conversationId: string, petId?: string): Promise<void> {
    const tracker = this._conversationTrackers.get(conversationId)
    if (tracker && tracker.turnCount > 0) {
      const wm = getWorkingMemory(conversationId)
      if (wm.entries.length > 2) {
        const summaryContent = wm.topicSummary || `对话记录 (${wm.entries.length}轮)`
        try {
          await addEpisodicMemory({
            petId: petId || 'unknown',
            content: `[对话归档] ${summaryContent}`,
            privacyLevel: 2 as PrivacyLevel,
            tags: ['conversation-archive'],
            importance: Math.min(0.8, 0.3 + tracker.turnCount * 0.05),
            timestamp: new Date().toISOString(),
          })
          console.log(`[AnimaCore] 📦 对话 ${conversationId} 已归档 (${tracker.turnCount}轮)`)
        } catch (e) {
          // ignore archive errors
        }
      }
    }

    clearWorkingMemory(conversationId)
    this._conversationTrackers.delete(conversationId)
  }

  getSystemStatus(): SystemStatus {
    const brainState = getBrainState()
    const engine = getEmbeddingEngine()

    return {
      brain: {
        isLoaded: brainState.isLoaded,
        isLoading: brainState.isLoading,
        loadProgress: brainState.loadProgress,
        error: brainState.error,
        modelInfo: brainState.isLoaded ? 'SmolLM-360M-Instruct' : null,
      },
      memory: {
        isReady: isMemoryReady(),
        episodicCount: this._cachedMemoryStats.episodicCount,
        semanticCount: this._cachedMemoryStats.semanticCount,
        conversationCount: this._cachedMemoryStats.conversationCount,
        lastConsolidation: this._cachedMemoryStats.lastConsolidation,
      },
      embedding: {
        engineName: engine.name,
        dimensions: engine.dimensions,
        isOnnx: isUsingOnnxEngine(),
        isReady: engine.isReady(),
      },
      privacy: {
        lastPiCheck: this._lastPiCheck,
        blockedCount: this._piBlockCount,
      },
    }
  }

  async refreshMemoryStats(): Promise<void> {
    if (!isMemoryReady()) return
    try {
      const memData = await getAllMemories('status-refresh')
      this._cachedMemoryStats = {
        episodicCount: memData.episodic.length,
        semanticCount: memData.semantic.length,
        conversationCount: 0,
        lastConsolidation: null,
      }
    } catch {}
  }

  async destroy(): Promise<void> {
    if (this._brainUnsub) {
      this._brainUnsub()
      this._brainUnsub = null
    }

    for (const convId of this._conversationTrackers.keys()) {
      clearWorkingMemory(convId)
    }
    this._conversationTrackers.clear()

    this._initialized = false
    console.log('[AnimaCore] 🔓 核心系统已销毁')
  }

  private runPrivacyCheck(message: string, mode: ChatMode): { riskLevel: 'safe' | 'suspicious' | 'dangerous'; warning?: string } {
    this._lastPiCheck = new Date().toISOString()

    const piResult = detectPromptInjection(message)
    if (piResult.riskLevel === 'dangerous') {
      return piResult
    }

    if (mode === 'visitor' && piResult.riskLevel === 'suspicious') {
      return { riskLevel: 'dangerous', warning: piResult.warning }
    }

    return piResult
  }

  private trackConversation(conversationId: string): void {
    let tracker = this._conversationTrackers.get(conversationId)
    if (!tracker) {
      tracker = {
        id: conversationId,
        turnCount: 0,
        lastActivity: Date.now(),
        pendingArchive: false,
      }
      this._conversationTrackers.set(conversationId, tracker)
    }
    tracker.turnCount++
    tracker.lastActivity = Date.now()
  }

  private shouldArchive(conversationId: string, message: string): boolean {
    const tracker = this._conversationTrackers.get(conversationId)
    if (!tracker) return true

    if (tracker.turnCount >= ARCHIVE_THRESHOLD_TURNS && tracker.turnCount % 3 === 0) {
      return true
    }

    for (const keyword of ARCHIVE_TRIGGER_KEYWORDS) {
      if (message.includes(keyword)) {
        return true
      }
    }

    return false
  }

  private getSafetyReply(pet: Pet): string {
    const replies = [
      `${pet.avatarEmoji}（歪头看着你）嗯？这个话题有点奇怪呢...`,
      `${pet.avatarEmoji}（摇摇头）我不太想聊这个诶~`,
      `${pet.avatarEmoji}（假装没听见）啦啦啦~`,
    ]
    return replies[Math.floor(Math.random() * replies.length)]
  }

  private getVisitorSafetyReply(pet: Pet): string {
    return `${pet.avatarEmoji}（礼貌地点点头）不好意思，我不太明白你的意思呢~`
  }

  private logSystemStatus(status: SystemStatus): void {
    console.log('[AnimaCore] ┌─ 系统状态 ───────────────────')
    console.log(`[AnimaCore] │ 🧠 AI: ${status.brain.isLoaded ? '✅ 就绪' : '❌ 未加载'} ${status.brain.modelInfo || ''}`)
    console.log(`[AnimaCore] │ 💾 记忆: ${status.memory.isReady ? '✅' : '❌'} | 📔${status.memory.episodicCount} 🧠${status.memory.semanticCount}`)
    console.log(`[AnimaCore] │ 🔢 Embedding: ${status.embedding.engineName} (${status.embedding.dimensions}d) ${status.embedding.isOnnx ? '⚡ONNX' : '🔤关键词'}`)
    console.log(`[AnimaCore] │ 🛡️ PI防护: 拦截${status.privacy.blockedCount}次`)
    console.log(`[AnimaCore] └────────────────────────────────`)
  }
}

export const animaCore = new AnimaCore()

export function getAnimaCore(): AnimaCore {
  return animaCore
}
