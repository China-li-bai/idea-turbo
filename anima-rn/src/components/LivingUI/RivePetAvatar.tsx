import React, { useEffect, useRef, useCallback, useState } from 'react'
import { View, StyleSheet, Pressable, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { theme, petTheme } from '../../theme'
import { triggerHaptic, triggerMoodTransitionHaptic } from './HapticEngine'
import type { PetMood, ActivityState } from './types'
import {
  MOOD_STATE_VALUES,
  MOOD_EMOJI,
  ACTIVITY_TO_MOOD_MAP,
  getMoodValue,
} from './types'
import type { PetSpecies } from '../../types'

const BREATHING_DURATION = 2500
const TYPING_SPEED = 120

interface MicroExpressionConfig {
  translateY: [number, number]
  translateX: [number, number]
  rotate: [number, number]
  scale: [number, number]
  duration: number
  repeat?: boolean
}

const MICRO_EXPRESSIONS: Record<PetMood, MicroExpressionConfig> = {
  idle: {
    translateY: [0, -3],
    translateX: [0, 0],
    rotate: [0, 1],
    scale: [1, 1.02],
    duration: BREATHING_DURATION,
    repeat: true,
  },
  thinking: {
    translateY: [0, -6],
    translateX: [-2, 2],
    rotate: [-8, 8],
    scale: [1, 1.03],
    duration: 800,
    repeat: true,
  },
  typing: {
    translateY: [0, -2],
    translateX: [0, 0],
    rotate: [0, 2],
    scale: [1, 1.01],
    duration: TYPING_SPEED,
    repeat: true,
  },
  sniffing: {
    translateY: [0, -5],
    translateX: [0, 3],
    rotate: [0, 10],
    scale: [1, 1.04],
    duration: 500,
    repeat: true,
  },
  listening: {
    translateY: [0, -2],
    translateX: [0, 0],
    rotate: [-3, 3],
    scale: [1, 1.015],
    duration: 1200,
    repeat: true,
  },
  happy: {
    translateY: [0, -8],
    translateX: [-3, 3],
    rotate: [-8, 8],
    scale: [1, 1.08],
    duration: 350,
    repeat: false,
  },
  excited: {
    translateY: [0, -12],
    translateX: [-5, 5],
    rotate: [-15, 15],
    scale: [1, 1.12],
    duration: 200,
    repeat: true,
  },
  sad: {
    translateY: [3, 0],
    translateX: [0, 0],
    rotate: [0, -3],
    scale: [1, 0.96],
    duration: 800,
    repeat: false,
  },
  angry: {
    translateY: [0, -4],
    translateX: [0, 0],
    rotate: [0, 5],
    scale: [1, 1.06],
    duration: 300,
    repeat: false,
  },
  sleepy: {
    translateY: [2, 0],
    translateX: [0, 0],
    rotate: [0, 2],
    scale: [1, 0.97],
    duration: 2000,
    repeat: true,
  },
  curious: {
    translateY: [0, -5],
    translateX: [0, 2],
    rotate: [-10, 5],
    scale: [1, 1.05],
    duration: 600,
    repeat: false,
  },
  love: {
    translateY: [0, -6],
    translateX: [-2, 2],
    rotate: [-5, 5],
    scale: [1, 1.08],
    duration: 400,
    repeat: true,
  },
  surprised: {
    translateY: [0, -10],
    translateX: [0, 0],
    rotate: [0, 0],
    scale: [1, 1.15],
    duration: 250,
    repeat: false,
  },
  shy: {
    translateY: [3, 0],
    translateX: [2, 0],
    rotate: [5, 0],
    scale: [1, 0.94],
    duration: 500,
    repeat: false,
  },
}

export interface RivePetAvatarProps {
  species?: PetSpecies
  size?: number
  mood?: PetMood
  activity?: ActivityState
  isActive?: boolean
  showPulse?: boolean
  showGlow?: boolean
  emoji?: string
  onPress?: () => void
  onLongPress?: () => void
  onStrokeStart?: () => void
  onStrokeEnd?: () => void
  useRive?: boolean
}

export function RivePetAvatar({
  species = 'cat',
  size = 80,
  mood = 'idle',
  activity = 'idle',
  isActive = false,
  showPulse = false,
  showGlow = false,
  emoji,
  onPress,
  onLongPress,
  onStrokeStart,
  onStrokeEnd,
  useRive = false,
}: RivePetAvatarProps) {
  const petColors = petTheme[species] || petTheme.cat
  const displayEmoji = emoji ?? petTheme[species]?.emoji ?? '🐱'

  const scale = useSharedValue(1)
  const pressScale = useSharedValue(1)
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const rotate = useSharedValue(0)
  const expressionScale = useSharedValue(1)
  const glowOpacity = useSharedValue(showGlow ? 1 : 0)
  const pulseScale = useSharedValue(1)

  const currentMoodRef = useRef<PetMood>(mood)
  const [isPressed, setIsPressed] = useState(false)

  const effectiveMood = activity !== 'idle' ? ACTIVITY_TO_MOOD_MAP[activity] ?? mood : mood

  useEffect(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 180 })
  }, [])

  useEffect(() => {
    glowOpacity.value = withTiming(showGlow ? 1 : 0, { duration: 400 })
  }, [showGlow])

  useEffect(() => {
    if (showPulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.08, { damping: 12, stiffness: 150 }),
          withSpring(1, { damping: 20, stiffness: 120 }),
        ),
        -1,
        true,
      )
    } else {
      pulseScale.value = withSpring(1, { damping: 20, stiffness: 140 })
    }
  }, [showPulse])

  useEffect(() => {
    const prevMood = currentMoodRef.current
    currentMoodRef.current = effectiveMood

    triggerMoodTransitionHaptic(prevMood, effectiveMood)

    const config = MICRO_EXPRESSIONS[effectiveMood] ?? MICRO_EXPRESSIONS.idle

    if (config.repeat) {
      translateY.value = withRepeat(
        withSequence(
          withTiming(config.translateY[1], { duration: config.duration / 2 }),
          withTiming(config.translateY[0], { duration: config.duration / 2 }),
        ),
        -1,
        true,
      )
      translateX.value = withRepeat(
        withSequence(
          withTiming(config.translateX[1], { duration: config.duration / 2 }),
          withTiming(config.translateX[0], { duration: config.duration / 2 }),
        ),
        -1,
        true,
      )
      rotate.value = withRepeat(
        withSequence(
          withTiming(config.rotate[1], { duration: config.duration / 2 }),
          withTiming(config.rotate[0], { duration: config.duration / 2 }),
        ),
        -1,
        true,
      )
      expressionScale.value = withRepeat(
        withSequence(
          withTiming(config.scale[1], { duration: config.duration / 2 }),
          withTiming(config.scale[0], { duration: config.duration / 2 }),
        ),
        -1,
        true,
      )
    } else {
      translateY.value = withSequence(
        withTiming(config.translateY[1], { duration: config.duration * 0.6 }),
        withTiming(config.translateY[0], { duration: config.duration * 0.4 }),
      )
      translateX.value = withSequence(
        withTiming(config.translateX[1], { duration: config.duration * 0.6 }),
        withTiming(config.translateX[0], { duration: config.duration * 0.4 }),
      )
      rotate.value = withSequence(
        withTiming(config.rotate[1], { duration: config.duration * 0.6 }),
        withTiming(config.rotate[0], { duration: config.duration * 0.4 }),
      )
      expressionScale.value = withSequence(
        withTiming(config.scale[1], { duration: config.duration * 0.6 }),
        withTiming(config.scale[0], { duration: config.duration * 0.4 }),
      )

      if (effectiveMood !== 'idle' && effectiveMood !== 'sleepy') {
        setTimeout(() => {
          const idleConfig = MICRO_EXPRESSIONS.idle
          translateY.value = withRepeat(
            withSequence(
              withTiming(idleConfig.translateY[1], { duration: idleConfig.duration / 2 }),
              withTiming(idleConfig.translateY[0], { duration: idleConfig.duration / 2 }),
            ),
            -1,
            true,
          )
          expressionScale.value = withRepeat(
            withSequence(
              withTiming(idleConfig.scale[1], { duration: idleConfig.duration / 2 }),
              withTiming(idleConfig.scale[0], { duration: idleConfig.duration / 2 }),
            ),
            -1,
            true,
          )
        }, config.duration + 300)
      }
    }
  }, [effectiveMood])

  const handlePressIn = useCallback(() => {
    setIsPressed(true)
    pressScale.value = withSpring(0.9, { damping: 15, stiffness: 300 })
    triggerHaptic('petTap')
  }, [])

  const handlePressOut = useCallback(() => {
    setIsPressed(false)
    pressScale.value = withSpring(1, { damping: 10, stiffness: 200 })
  }, [])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }))

  const pressStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value * expressionScale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  const avatarSize = size
  const glowSize = size + 24
  const ringSize = size + 12

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      <Animated.View style={[styles.glowContainer, { width: glowSize, height: glowSize }, glowStyle]}>
        <View
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: petColors.primary + '25',
            },
          ]}
        />
      </Animated.View>

      {isActive && (
        <View
          style={[
            styles.activeRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: petColors.primary,
              backgroundColor: petColors.primaryLight + '60',
            },
          ]}
        />
      )}

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        <Animated.View
          style={[
            styles.avatarWrapper,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: isPressed ? petColors.primaryLight : petColors.bg,
              borderColor: isPressed ? petColors.primary : petColors.primary + '40',
              borderWidth: 2.5,
              shadowColor: petColors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isPressed ? 0.35 : 0.15,
              shadowRadius: isPressed ? 16 : 8,
              elevation: isPressed ? 8 : 4,
            },
            pressStyle,
          ]}
        >
          <Text style={[styles.emoji, { fontSize: avatarSize * 0.52 }]}>
            {displayEmoji}
          </Text>
        </Animated.View>
      </Pressable>

      {isActive && (
        <View style={[styles.statusDot, { backgroundColor: petColors.accent }]} />
      )}

      {mood !== 'idle' && mood !== 'typing' && activity === 'idle' && (
        <View style={[styles.moodBadge, { backgroundColor: petColors.primary + 'E6' }]}>
          <Text style={styles.moodEmoji}>{MOOD_EMOJI[mood]}</Text>
        </View>
      )}
    </View>
  )
}

export function getMoodNumber(mood: PetMood): number {
  return getMoodValue(mood)
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
  },
  activeRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.7,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emoji: {
    textAlign: 'center',
    lineHeight: undefined,
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  moodBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  moodEmoji: {
    fontSize: 13,
    lineHeight: undefined,
  },
})
