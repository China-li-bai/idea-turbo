import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'
import type { PetMood, ActivityState } from './types'
import { ACTIVITY_TO_MOOD_MAP, detectMoodFromText } from './types'
import { triggerMoodTransitionHaptic } from './HapticEngine'

interface LivingUIState {
  currentMood: PetMood
  activity: ActivityState
  previousMood: PetMood
  moodHistory: PetMood[]
  isInteracting: boolean
}

type LivingUIAction =
  | { type: 'SET_MOOD'; mood: PetMood }
  | { type: 'SET_ACTIVITY'; activity: ActivityState }
  | { type: 'SET_INTERACTING'; isInteracting: boolean }
  | { type: 'DETECT_MOOD_FROM_TEXT'; text: string }
  | { type: 'RESET' }

const initialState: LivingUIState = {
  currentMood: 'idle',
  activity: 'idle',
  previousMood: 'idle',
  moodHistory: [],
  isInteracting: false,
}

function livingUIReducer(state: LivingUIState, action: LivingUIAction): LivingUIState {
  switch (action.type) {
    case 'SET_MOOD': {
      if (state.currentMood === action.mood) return state
      const newHistory = [...state.moodHistory, state.currentMood].slice(-20)
      return {
        ...state,
        previousMood: state.currentMood,
        currentMood: action.mood,
        moodHistory: newHistory,
      }
    }
    case 'SET_ACTIVITY':
      return {
        ...state,
        activity: action.activity,
        currentMood: ACTIVITY_TO_MOOD_MAP[action.activity] ?? state.currentMood,
      }
    case 'SET_INTERACTING':
      return { ...state, isInteracting: action.isInteracting }
    case 'DETECT_MOOD_FROM_TEXT': {
      const detected = detectMoodFromText(action.text)
      if (detected === 'idle') return state
      return {
        ...state,
        previousMood: state.currentMood,
        currentMood: detected,
        moodHistory: [...state.moodHistory, state.currentMood].slice(-20),
      }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface LivingUIContextValue extends LivingUIState {
  setMood: (mood: PetMood) => void
  setActivity: (activity: ActivityState) => void
  setInteracting: (isInteracting: boolean) => void
  detectMood: (text: string) => void
  reset: () => void
}

const LivingUIContext = createContext<LivingUIContextValue | null>(null)

export function LivingUIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(livingUIReducer, initialState)
  const prevMoodRef = useRef<PetMood>('idle')

  const setMood = useCallback((mood: PetMood) => {
    triggerMoodTransitionHaptic(prevMoodRef.current, mood)
    prevMoodRef.current = mood
    dispatch({ type: 'SET_MOOD', mood })
  }, [])

  const setActivity = useCallback((activity: ActivityState) => {
    dispatch({ type: 'SET_ACTIVITY', activity })
  }, [])

  const setInteracting = useCallback((isInteracting: boolean) => {
    dispatch({ type: 'SET_INTERACTING', isInteracting })
  }, [])

  const detectMood = useCallback((text: string) => {
    dispatch({ type: 'DETECT_MOOD_FROM_TEXT', text })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    prevMoodRef.current = 'idle'
  }, [])

  return (
    <LivingUIContext.Provider
      value={{
        ...state,
        setMood,
        setActivity,
        setInteracting,
        detectMood,
        reset,
      }}
    >
      {children}
    </LivingUIContext.Provider>
  )
}

export function useLivingUI(): LivingUIContextValue {
  const ctx = useContext(LivingUIContext)
  if (!ctx) {
    throw new Error('useLivingUI must be used within a LivingUIProvider')
  }
  return ctx
}

export function usePetMood() {
  const { currentMood, setMood, previousMood, detectMood } = useLivingUI()
  return { currentMood, setMood, previousMood, detectMood }
}

export function usePetActivity() {
  const { activity, setActivity } = useLivingUI()
  return { activity, setActivity }
}
