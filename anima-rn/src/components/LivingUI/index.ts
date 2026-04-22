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
export { PetTransitionProvider, usePetTransition, SharedPet } from './PetTransitionContext'
export type { PetPositionMode } from './PetTransitionContext'
export { AmbientBubble, AmbientBubbleManager } from './AmbientBubble'
export { ImmersionVeil, ImmersionPortal } from './ImmersionVeil'
export { ImmersionChat } from './ImmersionChat'
export { MemoryAnchor, MemoryAnchorDetail, MemoryAnchorSidebar } from './MemoryAnchor'
export type { MemoryAnchorData } from './MemoryAnchor'
export { tokenSpeedTracker } from './TokenSpeedTracker'
export type { TokenSpeedLevel, TokenSpeedMetrics, BreathPhysicsParams } from './TokenSpeedTracker'
export {
  getBreathCurve,
  getBreathPhysicsForCurve,
  getStreamingCursorAnimation,
  getBubblePulseAnimation,
  computeBreathState,
} from './BreathCurve'
export type { BreathCurveConfig, BreathState } from './BreathCurve'
export { DevourAnimation, useDevourAnimation } from './DevourAnimation'
export { SubconsciousMap, generateSubconsciousNodes } from './SubconsciousMap'
export type { SubconsciousNode, SubconsciousEdge } from './SubconsciousMap'
