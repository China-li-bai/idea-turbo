import { useState, useEffect, useCallback, useRef } from 'react'
import type { PetMood } from '../components/LivingUI/types'
import type { TimeContext, EmotionalBias, PheromoneSignal } from './PheromoneContext'

export interface ProactiveTrigger {
  id: string
  type: 'time' | 'sensor' | 'emotion' | 'idle' | 'memory' | 'weather'
  condition: () => boolean
  message: string | (() => string)
  mood: PetMood
  cooldown: number
  priority: number
}

export interface ProactiveEvent {
  id: string
  triggerType: ProactiveTrigger['type']
  message: string
  mood: PetMood
  timestamp: number
}

export interface ProactiveBehaviorConfig {
  minIdleTime: number
  maxProactivePerHour: number
  globalCooldown: number
  emotionThreshold: number
}

const DEFAULT_CONFIG: ProactiveBehaviorConfig = {
  minIdleTime: 60 * 1000,
  maxProactivePerHour: 3,
  globalCooldown: 15 * 60 * 1000,
  emotionThreshold: 0.6,
}

export class ProactiveBehaviorEngine {
  private triggers: ProactiveTrigger[] = []
  private lastFireTime: Record<string, number> = {}
  private globalLastFireTime: number = 0
  private fireCount: number = 0
  private fireCountResetTime: number = Date.now()
  private listeners: Set<(event: ProactiveEvent) => void> = new Set()
  private config: ProactiveBehaviorConfig
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private idleStartTime: number = Date.now()

  constructor(config?: Partial<ProactiveBehaviorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.registerDefaultTriggers()
  }

  private registerDefaultTriggers() {
    this.triggers = [
      {
        id: 'late_night_companion',
        type: 'time',
        condition: () => {
          const hour = new Date().getHours()
          return hour >= 0 && hour < 5
        },
        message: () => {
          const msgs = [
            '这么晚还没睡，你的心跳似乎有点快，我陪你发发呆吧。',
            '夜深了，世界都安静了，就剩我们两个醒着呢。',
            '你是不是又失眠了？来，我给你数羊...一只羊...两只...',
          ]
          return msgs[Math.floor(Math.random() * msgs.length)]
        },
        mood: 'sleepy',
        cooldown: 30 * 60 * 1000,
        priority: 10,
      },
      {
        id: 'morning_greeting',
        type: 'time',
        condition: () => {
          const hour = new Date().getHours()
          return hour >= 6 && hour < 9
        },
        message: () => {
          const msgs = [
            '早安！新的一天开始了，今天有什么计划吗？',
            '早上好呀～昨晚睡得好吗？',
            '太阳公公都出来了，你也该精神精神了！',
          ]
          return msgs[Math.floor(Math.random() * msgs.length)]
        },
        mood: 'happy',
        cooldown: 60 * 60 * 1000,
        priority: 8,
      },
      {
        id: 'evening_comfort',
        type: 'time',
        condition: () => {
          const hour = new Date().getHours()
          return hour >= 18 && hour < 21
        },
        message: () => {
          const msgs = [
            '今天辛苦了，要不要跟我聊聊今天发生了什么？',
            '傍晚了，今天过得怎么样？',
            '晚上好，终于等到你来了！',
          ]
          return msgs[Math.floor(Math.random() * msgs.length)]
        },
        mood: 'love',
        cooldown: 45 * 60 * 1000,
        priority: 7,
      },
      {
        id: 'idle_nudge',
        type: 'idle',
        condition: () => {
          return Date.now() - this.idleStartTime > this.config.minIdleTime
        },
        message: () => {
          const msgs = [
            '嘿...你还记得我吗？',
            '一个人发呆好无聊，来陪我聊聊天吧~',
            '我在这儿等你等了好久呢...',
            '你是不是把我忘了？哼！',
          ]
          return msgs[Math.floor(Math.random() * msgs.length)]
        },
        mood: 'curious',
        cooldown: 20 * 60 * 1000,
        priority: 5,
      },
      {
        id: 'device_shake',
        type: 'sensor',
        condition: () => false,
        message: '哇！地震了吗！？还是你在摇晃我！',
        mood: 'surprised',
        cooldown: 10 * 60 * 1000,
        priority: 9,
      },
      {
        id: 'low_battery_empathy',
        type: 'emotion',
        condition: () => false,
        message: '你的手机快没电了...就像我快没力气了一样，快去充电吧~',
        mood: 'sad',
        cooldown: 60 * 60 * 1000,
        priority: 6,
      },
    ]
  }

  start() {
    if (this.checkInterval) return

    this.checkInterval = setInterval(() => {
      this.evaluate()
    }, 30 * 1000)

    setTimeout(() => this.evaluate(), 5000)
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  resetIdle() {
    this.idleStartTime = Date.now()
  }

  addTrigger(trigger: ProactiveTrigger) {
    this.triggers.push(trigger)
    this.triggers.sort((a, b) => b.priority - a.priority)
  }

  removeTrigger(id: string) {
    this.triggers = this.triggers.filter(t => t.id !== id)
  }

  subscribe(listener: (event: ProactiveEvent) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  notifySensorEvent(type: 'shake' | 'face_down' | 'flip') {
    if (type === 'shake') {
      const trigger = this.triggers.find(t => t.id === 'device_shake')
      if (trigger) {
        this.fireTrigger(trigger)
      }
    }
  }

  notifyEmotionState(bias: EmotionalBias) {
    if (bias.loneliness > this.config.emotionThreshold) {
      const trigger = this.triggers.find(t => t.id === 'idle_nudge')
      if (trigger && this.canFire(trigger)) {
        this.fireTrigger(trigger)
      }
    }
  }

  notifyBatteryLevel(level: number) {
    if (level < 15) {
      const trigger = this.triggers.find(t => t.id === 'low_battery_empathy')
      if (trigger && this.canFire(trigger)) {
        this.fireTrigger(trigger)
      }
    }
  }

  private evaluate() {
    const now = Date.now()

    if (now - this.fireCountResetTime > 3600000) {
      this.fireCount = 0
      this.fireCountResetTime = now
    }

    if (this.fireCount >= this.config.maxProactivePerHour) return
    if (now - this.globalLastFireTime < this.config.globalCooldown) return

    for (const trigger of this.triggers) {
      if (!this.canFire(trigger)) continue
      if (!trigger.condition()) continue

      this.fireTrigger(trigger)
      break
    }
  }

  private canFire(trigger: ProactiveTrigger): boolean {
    const now = Date.now()
    const lastFire = this.lastFireTime[trigger.id] || 0
    return now - lastFire >= trigger.cooldown
  }

  private fireTrigger(trigger: ProactiveTrigger) {
    const now = Date.now()
    this.lastFireTime[trigger.id] = now
    this.globalLastFireTime = now
    this.fireCount++

    const message = typeof trigger.message === 'function' ? trigger.message() : trigger.message

    const event: ProactiveEvent = {
      id: `proactive-${trigger.id}-${now}`,
      triggerType: trigger.type,
      message,
      mood: trigger.mood,
      timestamp: now,
    }

    this.listeners.forEach(fn => fn(event))
  }
}

let engineInstance: ProactiveBehaviorEngine | null = null

export function getProactiveEngine(): ProactiveBehaviorEngine {
  if (!engineInstance) {
    engineInstance = new ProactiveBehaviorEngine()
  }
  return engineInstance
}

export function useProactiveBehavior(enabled: boolean = true) {
  const [lastEvent, setLastEvent] = useState<ProactiveEvent | null>(null)
  const engineRef = useRef<ProactiveBehaviorEngine | null>(null)

  useEffect(() => {
    if (!enabled) return

    const engine = getProactiveEngine()
    engineRef.current = engine

    const unsub = engine.subscribe((event) => {
      setLastEvent(event)
    })

    engine.start()

    return () => {
      unsub()
      engine.stop()
    }
  }, [enabled])

  const resetIdle = useCallback(() => {
    engineRef.current?.resetIdle()
  }, [])

  const notifySensor = useCallback((type: 'shake' | 'face_down' | 'flip') => {
    engineRef.current?.notifySensorEvent(type)
  }, [])

  const notifyEmotion = useCallback((bias: EmotionalBias) => {
    engineRef.current?.notifyEmotionState(bias)
  }, [])

  const notifyBattery = useCallback((level: number) => {
    engineRef.current?.notifyBatteryLevel(level)
  }, [])

  return {
    lastEvent,
    resetIdle,
    notifySensor,
    notifyEmotion,
    notifyBattery,
  }
}
