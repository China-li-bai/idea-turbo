export type TokenSpeedLevel = 'stalled' | 'slow' | 'normal' | 'fast' | 'burst'

export interface TokenSpeedMetrics {
  level: TokenSpeedLevel
  tokensPerSecond: number
  avgIntervalMs: number
  totalTokens: number
  elapsedTimeMs: number
  recentBurstCount: number
  isIdle: boolean
}

export interface BreathPhysicsParams {
  damping: number
  stiffness: number
  mass: number
  overshootClamping: boolean
  restDisplacementThreshold: number
  restSpeedThreshold: number
}

const SPEED_THRESHOLDS: Record<TokenSpeedLevel, { minTps: number; maxTps: number }> = {
  stalled: { minTps: 0, maxTps: 2 },
  slow: { minTps: 2, maxTps: 8 },
  normal: { minTps: 8, maxTps: 18 },
  fast: { minTps: 18, maxTps: 35 },
  burst: { minTps: 35, maxTps: Infinity },
}

const BREATH_PHYSICS_MAP: Record<TokenSpeedLevel, BreathPhysicsParams> = {
  stalled: {
    damping: 22,
    stiffness: 60,
    mass: 1.2,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  slow: {
    damping: 20,
    stiffness: 80,
    mass: 1.0,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.02,
  },
  normal: {
    damping: 15,
    stiffness: 120,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.05,
  },
  fast: {
    damping: 12,
    stiffness: 180,
    mass: 0.6,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.1,
  },
  burst: {
    damping: 8,
    stiffness: 260,
    mass: 0.4,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.2,
  },
}

const MOOD_SPEED_MODIFIER: Record<string, number> = {
  idle: 1.0,
  thinking: 0.7,
  typing: 1.0,
  sniffing: 0.8,
  listening: 0.9,
  happy: 1.2,
  excited: 1.5,
  sad: 0.6,
  angry: 1.3,
  sleepy: 0.5,
  curious: 1.1,
  love: 1.1,
  surprised: 1.4,
  shy: 0.8,
}

const BURST_WINDOW_MS = 500
const BURST_THRESHOLD = 5
const INTERVAL_BUFFER_SIZE = 20
const IDLE_TIMEOUT_MS = 2000

class TokenSpeedTrackerClass {
  private tokenTimestamps: number[] = []
  private intervals: number[] = []
  private startTime: number | null = null
  private totalTokenCount = 0
  private lastTokenTime: number | null = null
  private burstWindows: number[] = []
  private listeners: Array<(metrics: TokenSpeedMetrics) => void> = []
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private currentMood: string = 'idle'

  recordToken(): TokenSpeedMetrics {
    const now = Date.now()

    if (this.startTime === null) {
      this.startTime = now
    }

    if (this.lastTokenTime !== null) {
      const interval = now - this.lastTokenTime
      this.intervals.push(interval)
      if (this.intervals.length > INTERVAL_BUFFER_SIZE) {
        this.intervals.shift()
      }
    }

    this.lastTokenTime = now
    this.totalTokenCount++
    this.tokenTimestamps.push(now)

    this.burstWindows.push(now)
    this.burstWindows = this.burstWindows.filter(t => now - t < BURST_WINDOW_MS)

    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }
    this.idleTimer = setTimeout(() => {
      this.notifyListeners()
    }, IDLE_TIMEOUT_MS)

    const metrics = this.getMetrics()
    this.notifyListeners()
    return metrics
  }

  setMood(mood: string): void {
    this.currentMood = mood
  }

  getMetrics(): TokenSpeedMetrics {
    if (this.startTime === null || this.totalTokenCount === 0) {
      return {
        level: 'stalled',
        tokensPerSecond: 0,
        avgIntervalMs: 0,
        totalTokens: 0,
        elapsedTimeMs: 0,
        recentBurstCount: 0,
        isIdle: true,
      }
    }

    const now = Date.now()
    const elapsedTimeMs = now - this.startTime
    const tokensPerSecond = (this.totalTokenCount / elapsedTimeMs) * 1000

    const avgIntervalMs = this.intervals.length > 0
      ? this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length
      : 0

    const recentBurstCount = this.burstWindows.length
    const isIdle = this.lastTokenTime !== null && (now - this.lastTokenTime > IDLE_TIMEOUT_MS)

    const moodModifier = MOOD_SPEED_MODIFIER[this.currentMood] || 1.0
    const adjustedTps = tokensPerSecond * moodModifier

    let level: TokenSpeedLevel = 'normal'
    for (const [lvl, range] of Object.entries(SPEED_THRESHOLDS)) {
      if (adjustedTps >= range.minTps && adjustedTps < range.maxTps) {
        level = lvl as TokenSpeedLevel
        break
      }
    }

    if (recentBurstCount >= BURST_THRESHOLD && level !== 'burst') {
      level = 'fast'
    }

    return {
      level,
      tokensPerSecond: Math.round(adjustedTps * 10) / 10,
      avgIntervalMs: Math.round(avgIntervalMs),
      totalTokens: this.totalTokenCount,
      elapsedTimeMs,
      recentBurstCount,
      isIdle,
    }
  }

  getBreathPhysics(mood?: string): BreathPhysicsParams {
    const metrics = this.getMetrics()
    let basePhysics = BREATH_PHYSICS_MAP[metrics.level]

    if (mood) {
      const modifier = MOOD_SPEED_MODIFIER[mood] || 1.0
      basePhysics = {
        ...basePhysics,
        stiffness: Math.round(basePhysics.stiffness * modifier),
        damping: Math.round(basePhysics.damping / modifier),
      }
    }

    return basePhysics
  }

  getGlowPulseSpeed(): number {
    const metrics = this.getMetrics()
    const speedMap: Record<TokenSpeedLevel, number> = {
      stalled: 3000,
      slow: 2200,
      normal: 1500,
      fast: 900,
      burst: 500,
    }
    return speedMap[metrics.level]
  }

  getBreathScale(): number {
    const metrics = this.getMetrics()
    const scaleMap: Record<TokenSpeedLevel, number> = {
      stalled: 0.02,
      slow: 0.03,
      normal: 0.05,
      fast: 0.08,
      burst: 0.12,
    }
    return scaleMap[metrics.level]
  }

  subscribe(listener: (metrics: TokenSpeedMetrics) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const idx = this.listeners.indexOf(listener)
      if (idx > -1) this.listeners.splice(idx, 1)
    }
  }

  reset(): void {
    this.tokenTimestamps = []
    this.intervals = []
    this.startTime = null
    this.totalTokenCount = 0
    this.lastTokenTime = null
    this.burstWindows = []
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    this.notifyListeners()
  }

  private notifyListeners() {
    const metrics = this.getMetrics()
    this.listeners.forEach(fn => fn(metrics))
  }
}

export const tokenSpeedTracker = new TokenSpeedTrackerClass()

export function getTokenSpeedTracker(): TokenSpeedTrackerClass {
  return tokenSpeedTracker
}

export function getBreathPhysicsForLevel(level: TokenSpeedLevel, mood?: string): BreathPhysicsParams {
  let basePhysics = BREATH_PHYSICS_MAP[level]
  if (mood) {
    const modifier = MOOD_SPEED_MODIFIER[mood] || 1.0
    basePhysics = {
      ...basePhysics,
      stiffness: Math.round(basePhysics.stiffness * modifier),
      damping: Math.round(basePhysics.damping / modifier),
    }
  }
  return basePhysics
}

export function getSpeedLevelFromTps(tps: number): TokenSpeedLevel {
  for (const [level, range] of Object.entries(SPEED_THRESHOLDS)) {
    if (tps >= range.minTps && tps < range.maxTps) {
      return level as TokenSpeedLevel
    }
  }
  return 'normal'
}
