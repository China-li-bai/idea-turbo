import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { triggerHaptic } from './HapticEngine'
import { theme, dark, candy } from '../../theme'
import type { PetMood } from './types'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface DevourAnimationProps {
  visible: boolean
  petX?: number
  petY?: number
  bubbleX?: number
  bubbleY?: number
  bubbleColor?: string
  petEmoji?: string
  onBurp?: () => void
  onComplete?: () => void
}

function DevourBubble({
  startX,
  startY,
  targetX,
  targetY,
  color,
  delay,
  onReachMouth,
}: {
  startX: number
  startY: number
  targetX: number
  targetY: number
  color: string
  delay: number
  onReachMouth?: () => void
}) {
  const translateX = useSharedValue(startX)
  const translateY = useSharedValue(startY)
  const scaleVal = useSharedValue(1)
  const opacity = useSharedValue(1)
  const rotateZ = useSharedValue(0)

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withSpring(targetX, { damping: 10, stiffness: 80 })
    )
    translateY.value = withDelay(
      delay,
      withSpring(targetY, { damping: 10, stiffness: 80 })
    )
    scaleVal.value = withDelay(
      delay,
      withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(0.3, { duration: 400, easing: Easing.in(Easing.cubic) })
      )
    )
    rotateZ.value = withDelay(
      delay,
      withTiming(360, { duration: 600, easing: Easing.inOut(Easing.cubic) })
    )
    opacity.value = withDelay(
      delay + 400,
      withTiming(0, { duration: 200 })
    )

    const timer = setTimeout(() => {
      onReachMouth?.()
    }, delay + 500)

    return () => clearTimeout(timer)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: translateX.value,
    top: translateY.value,
    opacity: opacity.value,
    transform: [
      { scale: scaleVal.value },
      { rotateZ: `${rotateZ.value}deg` },
    ],
  }))

  return (
    <Animated.View
      style={[
        styles.devourBubble,
        {
          backgroundColor: color + '30',
          borderColor: color + '60',
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.devourBubbleGlow, { backgroundColor: color }]} />
    </Animated.View>
  )
}

function PetMouthAnimation({
  emoji,
  x,
  y,
  isEating,
  onBurp,
}: {
  emoji: string
  x: number
  y: number
  isEating: boolean
  onBurp?: () => void
}) {
  const mouthOpen = useSharedValue(0)
  const bodyScale = useSharedValue(1)
  const chewCycle = useSharedValue(0)
  const burpScale = useSharedValue(0)
  const burpOpacity = useSharedValue(0)
  const [showBurpText, setShowBurpText] = React.useState(false)

  useEffect(() => {
    if (!isEating) return

    mouthOpen.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(0.7, { duration: 400 }),
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })
    )

    bodyScale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 200 }),
      withDelay(
        600,
        withSequence(
          withSpring(1.05, { damping: 6, stiffness: 300 }),
          withSpring(1.12, { damping: 6, stiffness: 300 }),
          withSpring(1.0, { damping: 12, stiffness: 150 })
        )
      )
    )

    chewCycle.value = withSequence(
      withDelay(500, withTiming(1, { duration: 150 })),
      withTiming(0.5, { duration: 150 }),
      withTiming(1, { duration: 150 }),
      withTiming(0.5, { duration: 150 }),
      withTiming(0, { duration: 150 })
    )

    const burpTimer = setTimeout(() => {
      runOnJS(setShowBurpText)(true)
      triggerHaptic('heavy')

      burpScale.value = withSequence(
        withSpring(1.5, { damping: 6, stiffness: 200 }),
        withSpring(1.2, { damping: 10, stiffness: 150 })
      )
      burpOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0.8, { duration: 400 }),
        withTiming(0, { duration: 300 })
      )

      onBurp?.()

      setTimeout(() => {
        runOnJS(setShowBurpText)(false)
      }, 900)
    }, 1200)

    return () => clearTimeout(burpTimer)
  }, [isEating])

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bodyScale.value }],
  }))

  const mouthStyle = useAnimatedStyle(() => ({
    height: 4 + mouthOpen.value * 16,
    width: 8 + mouthOpen.value * 12,
    borderRadius: mouthOpen.value * 8,
    opacity: 0.3 + mouthOpen.value * 0.5,
  }))

  const burpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burpScale.value }],
    opacity: burpOpacity.value,
  }))

  return (
    <View style={[styles.petMouthContainer, { left: x - 30, top: y - 30 }]} pointerEvents="none">
      <Animated.View style={[styles.petBody, bodyStyle]}>
        <Text style={styles.petEmojiText}>{emoji}</Text>
        <Animated.View style={[styles.mouth, mouthStyle]} />
      </Animated.View>

      {showBurpText && (
        <Animated.View style={[styles.burpContainer, burpStyle]}>
          <Text style={styles.burpEmoji}>🫧</Text>
          <Text style={styles.burpText}>嗝~</Text>
        </Animated.View>
      )}
    </View>
  )
}

export function DevourAnimation({
  visible,
  petX = SCREEN_WIDTH / 2,
  petY = SCREEN_HEIGHT * 0.3,
  bubbleX = SCREEN_WIDTH * 0.3,
  bubbleY = SCREEN_HEIGHT * 0.5,
  bubbleColor = candy.cyan[400],
  petEmoji = '🐱',
  onBurp,
  onComplete,
}: DevourAnimationProps) {
  const [isEating, setIsEating] = React.useState(false)

  useEffect(() => {
    if (!visible) return

    const eatTimer = setTimeout(() => {
      setIsEating(true)
      triggerHaptic('medium')
    }, 200)

    const completeTimer = setTimeout(() => {
      setIsEating(false)
      onComplete?.()
    }, 2200)

    return () => {
      clearTimeout(eatTimer)
      clearTimeout(completeTimer)
    }
  }, [visible])

  if (!visible) return null

  return (
    <View style={styles.container} pointerEvents="none">
      <DevourBubble
        startX={bubbleX}
        startY={bubbleY}
        targetX={petX - 10}
        targetY={petY + 10}
        color={bubbleColor}
        delay={0}
        onReachMouth={() => {
          triggerHaptic('light')
        }}
      />

      <PetMouthAnimation
        emoji={petEmoji}
        x={petX}
        y={petY}
        isEating={isEating}
        onBurp={onBurp}
      />
    </View>
  )
}

export function useDevourAnimation() {
  const [devouring, setDevouring] = React.useState(false)
  const [devourTarget, setDevourTarget] = React.useState<{
    bubbleX: number
    bubbleY: number
    color: string
  } | null>(null)

  const triggerDevour = React.useCallback((bubbleX: number, bubbleY: number, color: string) => {
    setDevourTarget({ bubbleX, bubbleY, color })
    setDevouring(true)
  }, [])

  const finishDevour = React.useCallback(() => {
    setDevouring(false)
    setDevourTarget(null)
  }, [])

  return {
    devouring,
    devourTarget,
    triggerDevour,
    finishDevour,
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 250,
  },
  devourBubble: {
    width: 48,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  devourBubbleGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  petMouthContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petEmojiText: {
    fontSize: 40,
  },
  mouth: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: dark.bg.primary,
  },
  burpContainer: {
    position: 'absolute',
    top: -20,
    right: -30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  burpEmoji: {
    fontSize: 20,
  },
  burpText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: candy.lime[400],
  },
})
