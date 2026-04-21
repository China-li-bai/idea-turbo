export { PetAvatar } from './PetAvatar'
export { ChatBubble } from './ChatBubble'
export { ThinkingIndicator } from './ThinkingIndicator'
export { ProgressLoader } from './ProgressLoader'
export { InputBar } from './InputBar'
export { PetFluidChat, StreamingBubble, StaticBubble, streamEventBus } from './FluidChat'
export {
  RivePetAvatar,
  LivingUIProvider,
  useLivingUI,
  usePetMood,
  usePetActivity,
  triggerHaptic,
  triggerMoodHaptic,
  triggerMoodTransitionHaptic,
  detectMoodFromText,
} from './LivingUI'
export type { RivePetAvatarProps, PetMood, ActivityState, HapticPattern } from './LivingUI'
