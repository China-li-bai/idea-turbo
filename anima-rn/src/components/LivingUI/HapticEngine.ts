import * as Haptics from 'expo-haptics'
import type { PetMood } from './types'

export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'petStroke'
  | 'petTap'
  | 'moodChange'
  | 'messageSend'
  | 'streamToken'
  | 'encounterPet'

interface HapticConfig {
  pattern: HapticPattern
  intensity: number
  description: string
}

const HAPTIC_REGISTRY: Record<HapticPattern, () => Promise<void>> = {
  light: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  },
  medium: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  },
  heavy: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  },
  success: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  },
  warning: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  },
  error: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  },
  selection: async () => {
    await Haptics.selectionAsync()
  },
  petStroke: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await new Promise(resolve => setTimeout(resolve, 80))
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  },
  petTap: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  },
  moodChange: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
  },
  messageSend: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  },
  streamToken: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
  },
  encounterPet: async () => {
    for (let i = 0; i < 3; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  },
}

let hapticEnabled = true
let lastHapticTime = 0
const HAPTIC_DEBOUNCE_MS = 50

export function setHapticEnabled(enabled: boolean) {
  hapticEnabled = enabled
}

export function isHapticEnabled(): boolean {
  return hapticEnabled
}

export async function triggerHaptic(pattern: HapticPattern): Promise<void> {
  if (!hapticEnabled) return

  const now = Date.now()
  if (now - lastHapticTime < HAPTIC_DEBOUNCE_MS && pattern === 'streamToken') return

  lastHapticTime = now
  try {
    await HAPTIC_REGISTRY[pattern]()
  } catch {
    // Haptics not available on this device
  }
}

export async function triggerMoodHaptic(mood: PetMood): Promise<void> {
  const moodHapticMap: Record<PetMood, HapticPattern> = {
    idle: 'light',
    thinking: 'selection',
    typing: 'streamToken',
    sniffing: 'light',
    listening: 'selection',
    happy: 'success',
    excited: 'petStroke',
    sad: 'light',
    angry: 'heavy',
    sleepy: 'light',
    curious: 'selection',
    love: 'petStroke',
    surprised: 'medium',
    shy: 'light',
  }

  await triggerHaptic(moodHapticMap[mood] ?? 'light')
}

const MOOD_HAPTIC_HISTORY: PetMood[] = []
const MAX_HISTORY = 5

export async function triggerMoodTransitionHaptic(fromMood: PetMood, toMood: PetMood): Promise<void> {
  if (fromMood === toMood) return

  MOOD_HAPTIC_HISTORY.push(toMood)
  if (MOOD_HAPTIC_HISTORY.length > MAX_HISTORY) {
    MOOD_HAPTIC_HISTORY.shift()
  }

  const recentUnique = new Set(MOOD_HAPTIC_HISTORY).size

  if (recentUnique <= 2 && MOOD_HAPTIC_HISTORY.length >= 3) return

  await triggerMoodHaptic(toMood)
}
