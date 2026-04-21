import { PetMood, detectMoodFromText, MOOD_STATE_VALUES, type MoodTransition } from './types'

export interface EmotionEvent {
  mood: PetMood
  confidence: number
  timestamp: number
  source: 'user_input' | 'pet_reply' | 'stream_token' | 'system'
  triggerText?: string
}

export interface EmotionStreamState {
  currentMood: PetMood
  previousMoods: PetMood[]
  confidenceHistory: EmotionEvent[]
  isTransitioning: boolean
  lastUpdateTime: number
  streamMoodBuffer: Record<string, number>
}

const EMOTION_CONFIG = {
  minConfidence: 0.3,
  transitionThreshold: 0.5,
  streamBufferSize: 10,
  historyMaxLength: 20,
  moodStabilityFrames: 3,
  smoothingFactor: 0.7,
}

class AIEmotionEngineClass {
  state: EmotionStreamState
  private listeners: Array<(state: EmotionStreamState) => void>
  private transitionListeners: Array<(transition: MoodTransition) => void>
  private moodFrameCount: Record<string, number>
  private isProcessing: boolean

  constructor() {
    this.state = this.createInitialState()
    this.listeners = []
    this.transitionListeners = []
    this.moodFrameCount = {}
    this.isProcessing = false
  }

  private createInitialState(): EmotionStreamState {
    return {
      currentMood: 'idle',
      previousMoods: [],
      confidenceHistory: [],
      isTransitioning: false,
      lastUpdateTime: Date.now(),
      streamMoodBuffer: {},
    }
  }

  subscribe(listener: (state: EmotionStreamState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  onTransition(listener: (transition: MoodTransition) => void): () => void {
    this.transitionListeners.push(listener)
    return () => {
      const index = this.transitionListeners.indexOf(listener)
      if (index > -1) {
        this.transitionListeners.splice(index, 1)
      }
    }
  }

  getState(): EmotionStreamState {
    return JSON.parse(JSON.stringify(this.state))
  }

  reset() {
    this.state = this.createInitialState()
    this.moodFrameCount = {}
    this.notifyListeners()
  }

  analyzeUserInput(text: string): PetMood {
    const detectedMood = this.enhancedMoodDetection(text, 'user_input')
    this.updateMoodWithConfidence(detectedMood, 0.8, 'user_input', text)
    return this.state.currentMood
  }

  analyzePetReply(text: string): PetMood {
    const detectedMood = this.enhancedMoodDetection(text, 'pet_reply')
    
    const finalMood = this.applyReplyPostProcessing(detectedMood, text)
    this.updateMoodWithConfidence(finalMood, 0.9, 'pet_reply', text)
    return this.state.currentMood
  }

  processStreamToken(token: string): PetMood | null {
    if (!token || token.trim().length === 0) return null

    const tokenMood = this.detectTokenMood(token)
    
    if (tokenMood) {
      const bufferKey = tokenMood
      const currentCount = this.state.streamMoodBuffer[bufferKey] || 0
      this.state.streamMoodBuffer[bufferKey] = currentCount + 1

      if (this.shouldUpdateStreamMood(tokenMood)) {
        this.updateMoodWithConfidence(tokenMood, 0.6, 'stream_token', token)
        return this.state.currentMood
      }
    }

    return null
  }

  clearStreamBuffer() {
    this.state.streamMoodBuffer = {}
    this.moodFrameCount = {}
  }

  getDominantStreamMood(): PetMood | null {
    let maxCount = 0
    let dominantMood: PetMood | null = null

    for (const [mood, count] of Object.entries(this.state.streamMoodBuffer)) {
      if (count > maxCount) {
        maxCount = count
        dominantMood = mood as PetMood
      }
    }

    return dominantMood && maxCount >= EMOTION_CONFIG.moodStabilityFrames 
      ? dominantMood 
      : null
  }

  private enhancedMoodDetection(text: string, source: EmotionEvent['source']): PetMood {
    const basicMood = detectMoodFromText(text)

    const contextMood = this.analyzeContextualCues(text)
    const intensityMood = this.analyzeIntensityIndicators(text)
    const emojiMood = this.analyzeEmojiSentiment(text)

    const moodScores: Record<string, number> = {}

    this.addMoodScore(moodScores, basicMood, 1.0)
    this.addMoodScore(moodScores, contextMood, 0.8)
    this.addMoodScore(moodScores, intensityMood, 0.6)
    this.addMoodScore(moodScores, emojiMood, 0.7)

    return this.getWeightedMood(moodScores)
  }

  private analyzeContextualCues(text: string): PetMood {
    const lowerText = text.toLowerCase()

    const questionPatterns = ['?', '？', '什么', '怎么', '为什么', '吗', '呢']
    const hasQuestion = questionPatterns.some(p => lowerText.includes(p))

    const exclamationPatterns = ['!', '！', '~', '～', '啊', '呀', '哇']
    const hasExcitement = exclamationPatterns.filter(p => lowerText.includes(p)).length >= 2

    const repetitionPatterns = /(哈哈|嘻嘻|嘿嘿|呵呵|呜呜|哼哼)/g
    const repetitions = text.match(repetitionPatterns) || []

    if (hasQuestion && !hasExcitement) return 'curious'
    if (hasExcitement && repetitions.length > 0) return 'excited'
    if (repetitions.length >= 2) {
      const repText = repetitions[0] || ''
      if (['哈哈', '嘻嘻', '嘿嘿'].includes(repText)) return 'happy'
      if (['呜呜'].includes(repText)) return 'sad'
      if (['哼哼'].includes(repText)) return 'angry'
    }

    const length = text.length
    if (length < 5 && hasExcitement) return 'surprised'
    if (length > 50 && !hasQuestion) return 'thinking'

    return 'idle'
  }

  private analyzeIntensityIndicators(text: string): PetMood {
    const lowerText = text.toLowerCase()

    const intensifiers = ['非常', '特别', '超级', '极其', '太', '真的', '好']
    const negations = ['不', '没', '别', '不要', '不能']

    const hasHighIntensity = intensifiers.some(i => lowerText.includes(i))
    const hasNegation = negations.some(n => lowerText.includes(n))

    const emotionalWords: Record<string, string[]> = {
      happy: ['开心', '高兴', '快乐', '棒', '好', '喜欢', '爱'],
      sad: ['难过', '伤心', '悲伤', '痛苦', '难受'],
      angry: ['生气', '愤怒', '讨厌', '烦', '气'],
      excited: ['兴奋', '激动', '太好了', '哇', '耶'],
      love: ['爱你', '宝贝', '亲爱的', '最喜欢'],
      sleepy: ['困', '累', '想睡', '疲倦', '疲惫'],
    }

    for (const [mood, words] of Object.entries(emotionalWords)) {
      const matchCount = words.filter(w => lowerText.includes(w)).length
      if (matchCount >= 2 || (matchCount >= 1 && hasHighIntensity)) {
        return mood as PetMood
      }
    }

    if (hasNegation && hasHighIntensity) {
      return 'shy'
    }

    return 'idle'
  }

  private analyzeEmojiSentiment(text: string): PetMood {
    const emojiMap: Record<string, PetMood> = {
      '😊': 'happy', '😄': 'happy', '😁': 'excited', '🎉': 'excited',
      '😢': 'sad', '😭': 'sad', '😞': 'sad',
      '😠': 'angry', '😡': 'angry', '💢': 'angry',
      '😴': 'sleepy', '🥱': 'sleepy',
      '🤔': 'thinking', '💭': 'thinking',
      '❓': 'curious', '🧐': 'curious',
      '🥰': 'love', '😍': 'love', '💕': 'love',
      '😲': 'surprised', '😱': 'surprised',
      '🙈': 'shy', '😳': 'shy',
      '👃': 'sniffing', '👂': 'listening',
    }

    for (const [emoji, mood] of Object.entries(emojiMap)) {
      if (text.includes(emoji)) {
        return mood
      }
    }

    return 'idle'
  }

  private detectTokenMood(token: string): PetMood | null {
    const cleanToken = token.trim()
    if (cleanToken.length === 0) return null

    const punctuationMood = this.detectPunctuationMood(cleanToken)
    if (punctuationMood) return punctuationMood

    const keywordMood = this.detectKeywordMood(cleanToken)
    if (keywordMood) return keywordMood

    return null
  }

  private detectPunctuationMood(token: string): PetMood | null {
    if (token.includes('!') || token.includes('！')) return 'excited'
    if (token.includes('?') || token.includes('？')) return 'curious'
    if (token.includes('~') || token.includes('～')) return 'happy'
    if (token.includes('...') || token.includes('…')) return 'thinking'
    return null
  }

  private detectKeywordMood(token: string): PetMood | null {
    const emotionKeywords: Record<string, string[]> = {
      happy: ['哈', '嘿', '嘻', '棒', '好', '喜', '爱', '开', '兴'],
      sad: ['呜', '唉', '难', '伤', '悲', '苦'],
      angry: ['哼', '气', '烦', '讨厌', '怒'],
      excited: ['哇', '耶', '太', '超', '激'],
      love: ['亲', '抱', '宝', '贝', '最'],
      sleepy: ['困', '累', '睡'],
      surprised: ['天', '竟', '不会'],
      shy: ['害', '羞', '脸红'],
    }

    for (const [mood, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(k => token.includes(k))) {
        return mood as PetMood
      }
    }

    return null
  }

  private addMoodScore(scores: Record<string, number>, mood: PetMood, weight: number) {
    if (mood === 'idle') return
    const currentScore = scores[mood] || 0
    scores[mood] = currentScore + weight
  }

  private getWeightedMood(scores: Record<string, number>): PetMood {
    let maxScore = 0
    let dominantMood: PetMood = 'idle'

    for (const [mood, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score
        dominantMood = mood as PetMood
      }
    }

    return maxScore >= EMOTION_CONFIG.minConfidence ? dominantMood : 'idle'
  }

  private shouldUpdateStreamMood(newMood: PetMood): boolean {
    if (newMood === this.state.currentMood) return false

    const frameCount = this.moodFrameCount[newMood] || 0
    return frameCount >= EMOTION_CONFIG.moodStabilityFrames
  }

  private applyReplyPostProcessing(detectedMood: PetMood, text: string): PetMood {
    const length = text.length
    
    if (detectedMood === 'idle' && length > 30) {
      return 'happy'
    }

    if (detectedMood === 'thinking' && length < 10) {
      return 'curious'
    }

    const soundPatterns = ['{sound}', '汪', '喵', '吱', '嘎']
    const hasSound = soundPatterns.some(p => text.includes(p))
    
    if (hasSound && detectedMood === 'idle') {
      return 'happy'
    }

    return detectedMood
  }

  private updateMoodWithConfidence(
    newMood: PetMood,
    confidence: number,
    source: EmotionEvent['source'],
    triggerText?: string
  ) {
    if (newMood === this.state.currentMood && !this.state.isTransitioning) {
      this.addEmotionEvent(newMood, confidence, source, triggerText)
      return
    }

    const shouldTransition = this.evaluateTransition(newMood, confidence)

    if (shouldTransition) {
      this.executeMoodTransition(newMood, confidence, source, triggerText)
    } else {
      this.addEmotionEvent(this.state.currentMood, confidence * 0.5, source, triggerText)
    }
  }

  private evaluateTransition(newMood: PetMood, confidence: number): boolean {
    if (confidence < EMOTION_CONFIG.transitionThreshold) return false

    if (this.state.isTransitioning) return false

    const recentTransitions = this.state.confidenceHistory
      .filter(e => Date.now() - e.timestamp < 2000)
      .slice(-5)

    if (recentTransitions.length >= 3) {
      const uniqueMoodsSet = new Set(recentTransitions.map(e => e.mood))
      if (uniqueMoodsSet.size >= 3) return false
    }

    return true
  }

  private executeMoodTransition(
    newMood: PetMood,
    confidence: number,
    source: EmotionEvent['source'],
    triggerText?: string
  ) {
    const previousMood = this.state.currentMood
    
    this.state.previousMoods = [...this.state.previousMoods.slice(-9), previousMood]
    this.state.currentMood = newMood
    this.state.isTransitioning = true
    this.state.lastUpdateTime = Date.now()

    const transition: MoodTransition = {
      from: previousMood,
      to: newMood,
      duration: this.calculateTransitionDuration(previousMood, newMood),
    }

    this.transitionListeners.forEach(listener => listener(transition))
    this.addEmotionEvent(newMood, confidence, source, triggerText)
    this.notifyListeners()

    setTimeout(() => {
      this.state.isTransitioning = false
      this.notifyListeners()
    }, transition.duration)
  }

  private calculateTransitionDuration(from: PetMood, to: PetMood): number {
    const sameGroup = (a: PetMood, b: PetMood): boolean => {
      const positive = ['happy', 'excited', 'love', 'curious']
      const negative = ['sad', 'angry', 'shy']
      const neutral = ['idle', 'thinking', 'typing', 'listening', 'sleepy', 'sniffing']

      return (positive.includes(a) && positive.includes(b)) ||
             (negative.includes(a) && negative.includes(b)) ||
             (neutral.includes(a) && neutral.includes(b))
    }

    if (sameGroup(from, to)) return 250
    if (from === to) return 150
    return 350
  }

  private addEmotionEvent(
    mood: PetMood,
    confidence: number,
    source: EmotionEvent['source'],
    triggerText?: string
  ) {
    const event: EmotionEvent = {
      mood,
      confidence,
      timestamp: Date.now(),
      source,
      triggerText,
    }

    this.state.confidenceHistory = [...this.state.confidenceHistory.slice(-(EMOTION_CONFIG.historyMaxLength - 1)), event]

    if (source === 'stream_token') {
      const frameCount = this.moodFrameCount[mood] || 0
      this.moodFrameCount[mood] = frameCount + 1
    }
  }

  private notifyListeners() {
    const stateSnapshot = this.getState()
    this.listeners.forEach(listener => listener(stateSnapshot))
  }

  getMoodStatistics(): {
    totalEvents: number
    moodDistribution: Record<PetMood, number>
    averageConfidence: number
    dominantMood: PetMood
  } {
    const events = this.state.confidenceHistory
    const totalEvents = events.length

    const moodDistribution: Record<string, number> = {}
    let totalConfidence = 0

    for (const event of events) {
      moodDistribution[event.mood] = (moodDistribution[event.mood] || 0) + 1
      totalConfidence += event.confidence
    }

    let dominantMood: PetMood = 'idle'
    let maxCount = 0

    for (const [mood, count] of Object.entries(moodDistribution)) {
      if (count > maxCount) {
        maxCount = count
        dominantMood = mood as PetMood
      }
    }

    return {
      totalEvents,
      moodDistribution: moodDistribution as Record<PetMood, number>,
      averageConfidence: totalEvents > 0 ? totalConfidence / totalEvents : 0,
      dominantMood,
    }
  }

  exportState(): string {
    return JSON.stringify({
      currentState: this.state.currentMood,
      history: this.state.confidenceHistory.slice(-10),
      statistics: this.getMoodStatistics(),
      timestamp: Date.now(),
    })
  }
}

export const aiEmotionEngine = new AIEmotionEngineClass()

export function createEmotionIntegration() {
  return {
    engine: aiEmotionEngine,

    onUserMessage: (text: string) => aiEmotionEngine.analyzeUserInput(text),

    onPetReply: (text: string) => aiEmotionEngine.analyzePetReply(text),

    onStreamToken: (token: string) => aiEmotionEngine.processStreamToken(token),

    onStreamComplete: (): PetMood | null => {
      const finalMood = aiEmotionEngine.getDominantStreamMood()
      aiEmotionEngine.clearStreamBuffer()
      return finalMood
    },

    getCurrentMood: (): PetMood => aiEmotionEngine.getState().currentMood,

    subscribeToMoodChanges: (callback: (mood: PetMood) => void) => {
      return aiEmotionEngine.subscribe((state) => callback(state.currentMood))
    },

    onMoodTransition: (callback: (transition: MoodTransition) => void) => {
      return aiEmotionEngine.onTransition(callback)
    },

    reset: () => aiEmotionEngine.reset(),

    getStatistics: () => aiEmotionEngine.getMoodStatistics(),
  }
}
