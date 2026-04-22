import React, { createContext, useContext, useRef, useCallback } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { Dimensions } from 'react-native'
import { BreathingPet } from './BreathingPet'
import { RivePetAvatar } from './RivePetAvatar'
import { triggerHaptic } from './HapticEngine'
import type { PetMood, ActivityState } from './types'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export type PetPositionMode = 'home' | 'chat' | 'map'

interface PetTransitionState {
  mode: PetPositionMode
  petX: SharedValue<number>
  petY: SharedValue<number>
  petScale: SharedValue<number>
  petOpacity: SharedValue<number>
  mood: SharedValue<PetMood>
  activity: SharedValue<ActivityState>
  isTransitioning: SharedValue<boolean>
}

interface PetTransitionContextValue extends PetTransitionState {
  transitionTo: (mode: PetPositionMode, callback?: () => void) => void
  setPetMood: (mood: PetMood) => void
  setPetActivity: (activity: ActivityState) => void
}

const PetTransitionContext = createContext<PetTransitionContextValue | null>(null)

const POSITION_CONFIG: Record<PetPositionMode, {
  x: number
  y: number
  scale: number
  springConfig: { damping: number; stiffness: number; mass: number }
}> = {
  home: {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT * 0.45,
    scale: 1,
    springConfig: { damping: 15, stiffness: 120, mass: 0.8 },
  },
  chat: {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT * 0.18,
    scale: 0.55,
    springConfig: { damping: 18, stiffness: 140, mass: 0.6 },
  },
  map: {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT * 0.12,
    scale: 0.35,
    springConfig: { damping: 20, stiffness: 100, mass: 0.5 },
  },
}

export function PetTransitionProvider({ children }: { children: React.ReactNode }) {
  const petX = useSharedValue(POSITION_CONFIG.home.x)
  const petY = useSharedValue(POSITION_CONFIG.home.y)
  const petScale = useSharedValue(POSITION_CONFIG.home.scale)
  const petOpacity = useSharedValue(1)
  const mood = useSharedValue<PetMood>('idle')
  const activity = useSharedValue<ActivityState>('idle')
  const isTransitioning = useSharedValue(false)
  const modeRef = useRef<PetPositionMode>('home')

  const transitionTo = useCallback((targetMode: PetPositionMode, callback?: () => void) => {
    if (modeRef.current === targetMode) return

    const config = POSITION_CONFIG[targetMode]
    isTransitioning.value = true

    runOnJS(triggerHaptic)('medium')

    petX.value = withSpring(config.x, config.springConfig)
    petY.value = withSpring(config.y, config.springConfig)
    petScale.value = withSpring(config.scale, {
      damping: config.springConfig.damping,
      stiffness: config.springConfig.stiffness,
      mass: config.springConfig.mass,
    })

    if (targetMode === 'chat') {
      petOpacity.value = withSequence(
        withTiming(0.6, { duration: 150 }),
        withTiming(1, { duration: 300 })
      )
    } else if (targetMode === 'home') {
      petOpacity.value = withSequence(
        withTiming(0.6, { duration: 150 }),
        withTiming(1, { duration: 400 })
      )
    } else {
      petOpacity.value = withTiming(1, { duration: 300 })
    }

    modeRef.current = targetMode

    setTimeout(() => {
      isTransitioning.value = false
      callback?.()
    }, 600)
  }, [])

  const setPetMood = useCallback((newMood: PetMood) => {
    mood.value = newMood
  }, [])

  const setPetActivity = useCallback((newActivity: ActivityState) => {
    activity.value = newActivity
  }, [])

  return (
    <PetTransitionContext.Provider
      value={{
        mode: modeRef.current,
        petX,
        petY,
        petScale,
        petOpacity,
        mood,
        activity,
        isTransitioning,
        transitionTo,
        setPetMood,
        setPetActivity,
      }}
    >
      {children}
    </PetTransitionContext.Provider>
  )
}

export function usePetTransition() {
  const ctx = useContext(PetTransitionContext)
  if (!ctx) {
    throw new Error('usePetTransition must be used within a PetTransitionProvider')
  }
  return ctx
}

interface SharedPetProps {
  emoji?: string
  species?: string
  baseSize?: number
  showRive?: boolean
  onPetPress?: () => void
  onPetLongPress?: () => void
}

export function SharedPet({
  emoji = '🐱',
  species = 'cat',
  baseSize = 160,
  showRive = false,
  onPetPress,
  onPetLongPress,
}: SharedPetProps) {
  const { petX, petY, petScale, petOpacity, mood, activity } = usePetTransition()

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: petX.value - (baseSize * petScale.value) / 2,
    top: petY.value - (baseSize * petScale.value) / 2,
    transform: [{ scale: petScale.value }],
    opacity: petOpacity.value,
    zIndex: 100,
  }))

  return (
    <Animated.View style={animatedStyle} pointerEvents="box-none">
      {showRive ? (
        <RivePetAvatar
          species={species as any}
          size={baseSize}
          mood={mood.value}
          activity={activity.value}
          isActive={activity.value !== 'idle'}
          showPulse={activity.value === 'streaming'}
          showGlow={activity.value !== 'idle'}
          emoji={emoji}
          onPress={onPetPress}
          onLongPress={onPetLongPress}
        />
      ) : (
        <BreathingPet
          species={species}
          emoji={emoji}
          mood={mood.value}
          size={baseSize}
          isActive={activity.value !== 'idle'}
          onPress={onPetPress}
          onLongPress={onPetLongPress}
        />
      )}
    </Animated.View>
  )
}
