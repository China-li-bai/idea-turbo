export { RivePetAvatar, getMoodNumber } from './RivePetAvatar'
export type { RivePetAvatarProps } from './RivePetAvatar'
export { LivingUIProvider, useLivingUI, usePetMood, usePetActivity } from './LivingUIContext'
export {
  triggerHaptic,
  triggerMoodHaptic,
  triggerMoodTransitionHaptic,
  setHapticEnabled,
  isHapticEnabled,
} from './HapticEngine'
export type { HapticPattern } from './HapticEngine'
export type {
  PetMood,
  ActivityState,
  MoodTransition,
} from './types'
export {
  MOOD_STATE_VALUES,
  MOOD_LABELS,
  MOOD_EMOJI,
  RIVE_STATE_MACHINE_NAME,
  RIVE_MOOD_INPUT,
  ACTIVITY_TO_MOOD_MAP,
  AI_MOOD_KEYWORDS,
  detectMoodFromText,
  getMoodValue,
} from './types'
export {
  aiEmotionEngine,
  createEmotionIntegration,
} from './AIEmotionEngine'
export type {
  EmotionEvent,
  EmotionStreamState,
} from './AIEmotionEngine'
export { PetHabitat } from './PetHabitat'
export { BreathingPet } from './BreathingPet'
export { ThinkingFlow } from './ThinkingFlow'
export { MemoryFragment } from './MemoryFragment'
export { CyberGlass, GlassCard, GlassButton } from './CyberGlass'
