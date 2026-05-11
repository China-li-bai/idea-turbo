import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'

export interface PheromoneSignal {
  type: 'time' | 'weather' | 'steps' | 'music' | 'battery' | 'motion' | 'proximity'
  value: string | number | boolean
  confidence: number
  timestamp: number
}

export interface PheromoneState {
  signals: PheromoneSignal[]
  timeContext: TimeContext
  emotionalBias: EmotionalBias
  shouldProactiveSpeak: boolean
  proactiveMessage: string | null
  lastProactiveTime: number
}

export interface TimeContext {
  hour: number
  period: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'late_night'
  isWeekend: boolean
  isHoliday: boolean
  dayOfYear: number
}

export interface EmotionalBias {
  loneliness: number
  energy: number
  focus: number
  social: number
}

type PheromoneAction =
  | { type: 'UPDATE_SIGNAL'; signal: PheromoneSignal }
  | { type: 'UPDATE_TIME_CONTEXT'; context: TimeContext }
  | { type: 'UPDATE_EMOTIONAL_BIAS'; bias: Partial<EmotionalBias> }
  | { type: 'SET_PROACTIVE'; message: string | null }
  | { type: 'CLEAR_SIGNALS'; types?: PheromoneSignal['type'][] }

function computeTimeContext(): TimeContext {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  const isWeekend = day === 0 || day === 6

  let period: TimeContext['period']
  if (hour >= 5 && hour < 7) period = 'dawn'
  else if (hour >= 7 && hour < 11) period = 'morning'
  else if (hour >= 11 && hour < 13) period = 'noon'
  else if (hour >= 13 && hour < 17) period = 'afternoon'
  else if (hour >= 17 && hour < 21) period = 'evening'
  else if (hour >= 21 && hour < 24) period = 'night'
  else period = 'late_night'

  return {
    hour,
    period,
    isWeekend,
    isHoliday: false,
    dayOfYear: Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    ),
  }
}

function computeEmotionalBiasFromTime(time: TimeContext): Partial<EmotionalBias> {
  const bias: Partial<EmotionalBias> = {}

  switch (time.period) {
    case 'late_night':
      bias.loneliness = 0.8
      bias.energy = 0.2
      bias.focus = 0.3
      bias.social = 0.1
      break
    case 'night':
      bias.loneliness = 0.5
      bias.energy = 0.3
      bias.focus = 0.4
      bias.social = 0.2
      break
    case 'dawn':
      bias.loneliness = 0.4
      bias.energy = 0.5
      bias.focus = 0.6
      bias.social = 0.2
      break
    case 'morning':
      bias.loneliness = 0.2
      bias.energy = 0.8
      bias.focus = 0.7
      bias.social = 0.5
      break
    case 'noon':
      bias.loneliness = 0.1
      bias.energy = 0.6
      bias.focus = 0.5
      bias.social = 0.7
      break
    case 'afternoon':
      bias.loneliness = 0.3
      bias.energy = 0.5
      bias.focus = 0.6
      bias.social = 0.4
      break
    case 'evening':
      bias.loneliness = 0.4
      bias.energy = 0.4
      bias.focus = 0.3
      bias.social = 0.6
      break
  }

  if (time.isWeekend) {
    bias.social = Math.min(1, (bias.social || 0) + 0.2)
    bias.energy = Math.min(1, (bias.energy || 0) + 0.1)
  }

  return bias
}

const PROACTIVE_MESSAGES: Record<string, string[]> = {
  late_night: [
    '这么晚还没睡，你的心跳似乎有点快，我陪你发发呆吧。',
    '夜深了，世界都安静了，就剩我们两个醒着呢。',
    '你是不是又失眠了？来，我给你数羊...一只羊...两只...',
    '凌晨了哦，偷偷告诉你，这个时候的我最清醒。',
  ],
  night: [
    '今天辛苦了，要不要跟我聊聊今天发生了什么？',
    '晚上好呀，今天的月亮很圆，你看到了吗？',
    '睡前要不要听我讲个故事？',
  ],
  dawn: [
    '天快亮了，你是早起还是没睡？',
    '清晨的第一缕光，我想第一个跟你说早安。',
  ],
  morning: [
    '早安！新的一天开始了，今天有什么计划吗？',
    '早上好呀～昨晚睡得好吗？',
    '太阳公公都出来了，你也该精神精神了！',
  ],
  noon: [
    '中午了，记得吃饭哦！不要只顾着忙。',
    '午安～要不要休息一下？我陪你。',
  ],
  afternoon: [
    '下午好，是不是有点犯困？来聊聊天提提神？',
    '下午茶时间到！虽然我不能喝奶茶，但我可以陪你聊天。',
  ],
  evening: [
    '傍晚了，今天过得怎么样？',
    '夕阳好美，可惜我看不到...你替我多看两眼吧。',
    '晚上好，终于等到你来了！',
  ],
}

function shouldTriggerProactive(
  state: PheromoneState,
  timeContext: TimeContext
): { should: boolean; message: string | null } {
  const now = Date.now()
  const cooldown = 30 * 60 * 1000
  if (now - state.lastProactiveTime < cooldown) {
    return { should: false, message: null }
  }

  const messages = PROACTIVE_MESSAGES[timeContext.period]
  if (!messages || messages.length === 0) {
    return { should: false, message: null }
  }

  const loneliness = state.emotionalBias.loneliness || 0
  const threshold = timeContext.period === 'late_night' ? 0.3 : 0.5

  if (loneliness >= threshold) {
    const message = messages[Math.floor(Math.random() * messages.length)]
    return { should: true, message }
  }

  return { should: false, message: null }
}

const initialState: PheromoneState = {
  signals: [],
  timeContext: computeTimeContext(),
  emotionalBias: {
    loneliness: 0.3,
    energy: 0.5,
    focus: 0.5,
    social: 0.5,
  },
  shouldProactiveSpeak: false,
  proactiveMessage: null,
  lastProactiveTime: 0,
}

function pheromoneReducer(state: PheromoneState, action: PheromoneAction): PheromoneState {
  switch (action.type) {
    case 'UPDATE_SIGNAL': {
      const existing = state.signals.findIndex(s => s.type === action.signal.type)
      const newSignals = [...state.signals]
      if (existing >= 0) {
        newSignals[existing] = action.signal
      } else {
        newSignals.push(action.signal)
      }
      return { ...state, signals: newSignals }
    }
    case 'UPDATE_TIME_CONTEXT': {
      const biasUpdate = computeEmotionalBiasFromTime(action.context)
      const newBias = { ...state.emotionalBias, ...biasUpdate }
      return { ...state, timeContext: action.context, emotionalBias: newBias }
    }
    case 'UPDATE_EMOTIONAL_BIAS':
      return { ...state, emotionalBias: { ...state.emotionalBias, ...action.bias } }
    case 'SET_PROACTIVE':
      return {
        ...state,
        shouldProactiveSpeak: action.message !== null,
        proactiveMessage: action.message,
        lastProactiveTime: action.message ? Date.now() : state.lastProactiveTime,
      }
    case 'CLEAR_SIGNALS': {
      if (!action.types) return { ...state, signals: [] }
      return {
        ...state,
        signals: state.signals.filter(s => !action.types!.includes(s.type)),
      }
    }
    default:
      return state
  }
}

interface PheromoneContextValue extends PheromoneState {
  updateSignal: (signal: PheromoneSignal) => void
  updateEmotionalBias: (bias: Partial<EmotionalBias>) => void
  clearProactive: () => void
  buildSystemPromptContext: () => string
}

const PheromoneContext = createContext<PheromoneContextValue | null>(null)

export function PheromoneProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(pheromoneReducer, initialState)
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const updateTime = () => {
      dispatch({ type: 'UPDATE_TIME_CONTEXT', context: computeTimeContext() })
    }
    updateTime()
    timeIntervalRef.current = setInterval(updateTime, 60000)
    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    const check = shouldTriggerProactive(state, state.timeContext)
    if (check.should && check.message) {
      dispatch({ type: 'SET_PROACTIVE', message: check.message })
    }
  }, [state.timeContext, state.emotionalBias.loneliness])

  const updateSignal = useCallback((signal: PheromoneSignal) => {
    dispatch({ type: 'UPDATE_SIGNAL', signal })
  }, [])

  const updateEmotionalBias = useCallback((bias: Partial<EmotionalBias>) => {
    dispatch({ type: 'UPDATE_EMOTIONAL_BIAS', bias })
  }, [])

  const clearProactive = useCallback(() => {
    dispatch({ type: 'SET_PROACTIVE', message: null })
  }, [])

  const buildSystemPromptContext = useCallback((): string => {
    const { timeContext, emotionalBias, signals } = state
    const lines: string[] = []

    lines.push(`[环境感知]`)
    lines.push(`当前时间: ${timeContext.hour}时, ${timeContext.period}时段`)
    if (timeContext.isWeekend) lines.push('今天是周末')
    lines.push(`情感倾向: 孤独感=${emotionalBias.loneliness.toFixed(1)}, 活力=${emotionalBias.energy.toFixed(1)}, 专注=${emotionalBias.focus.toFixed(1)}, 社交需求=${emotionalBias.social.toFixed(1)}`)

    for (const signal of signals) {
      switch (signal.type) {
        case 'weather':
          lines.push(`天气: ${signal.value}`)
          break
        case 'steps':
          lines.push(`今日步数: ${signal.value}`)
          break
        case 'music':
          lines.push(`正在听: ${signal.value}`)
          break
        case 'battery':
          lines.push(`设备电量: ${signal.value}%`)
          break
        case 'motion':
          lines.push(`运动状态: ${signal.value}`)
          break
      }
    }

    if (emotionalBias.loneliness > 0.6) {
      lines.push(`[隐式指令] 用户可能感到孤独，请主动关心，语气温柔。`)
    }
    if (timeContext.period === 'late_night') {
      lines.push(`[隐式指令] 深夜时段，请轻声说话，不要过于兴奋。`)
    }

    return lines.join('\n')
  }, [state])

  return (
    <PheromoneContext.Provider
      value={{
        ...state,
        updateSignal,
        updateEmotionalBias,
        clearProactive,
        buildSystemPromptContext,
      }}
    >
      {children}
    </PheromoneContext.Provider>
  )
}

export function usePheromone(): PheromoneContextValue {
  const ctx = useContext(PheromoneContext)
  if (!ctx) {
    throw new Error('usePheromone must be used within a PheromoneProvider')
  }
  return ctx
}

export function useTimeContext(): TimeContext {
  const { timeContext } = usePheromone()
  return timeContext
}
