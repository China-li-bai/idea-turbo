import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { triggerHaptic } from './HapticEngine'
import { theme, dark, candy } from '../../theme'
import type { PetMood } from './types'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const MEMORY_ICON_X = SCREEN_WIDTH - 44
const MEMORY_ICON_Y = SCREEN_HEIGHT - 100

interface AmbientBubbleProps {
  text: string
  mood?: PetMood
  duration?: number
  color?: string
  onDisappear?: () => void
  onPress?: () => void
}

interface SparkParticle {
  id: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  controlX: number
  controlY: number
  size: number
  color: string
  delay: number
  trailCount: number
}

interface TrailDot {
  id: string
  x: number
  y: number
  size: number
  color: string
  opacity: number
}

const MOOD_BUBBLE_COLORS: Record<PetMood, string> = {
  idle: candy.violet[400],
  thinking: candy.cyan[400],
  typing: candy.cyan[300],
  sniffing: candy.lime[400],
  listening: candy.electricBlue[400],
  happy: candy.coral[400],
  excited: candy.neonPink[400],
  sad: candy.violet[500],
  angry: candy.coral[600],
  sleepy: candy.violet[300],
  curious: candy.lime[500],
  love: candy.neonPink[500],
  surprised: candy.coral[500],
  shy: candy.neonPink[300],
}

export function AmbientBubble({
  text,
  mood = 'happy',
  duration = 6000,
  color,
  onDisappear,
  onPress,
}: AmbientBubbleProps) {
  const bubbleColor = color || MOOD_BUBBLE_COLORS[mood]

  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.3)
  const translateY = useSharedValue(20)
  const wobbleRotate = useSharedValue(0)
  const shimmerProgress = useSharedValue(0)

  const [phase, setPhase] = useState<'appearing' | 'floating' | 'dissolving' | 'sparking' | 'arriving'>('appearing')
  const [sparkParticles, setSparkParticles] = useState<SparkParticle[]>([])
  const [showArrivalFlash, setShowArrivalFlash] = useState(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 12, stiffness: 150 })
    scale.value = withSpring(1, { damping: 10, stiffness: 180 })
    translateY.value = withSpring(0, { damping: 15, stiffness: 120 })

    wobbleRotate.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )

    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    )

    const floatTimer = setTimeout(() => {
      runOnJS(setPhase)('floating')
    }, 800)

    const dissolveTimer = setTimeout(() => {
      runOnJS(startDissolving)()
    }, duration)

    return () => {
      clearTimeout(floatTimer)
      clearTimeout(dissolveTimer)
    }
  }, [])

  function startDissolving() {
    if (phaseRef.current === 'sparking' || phaseRef.current === 'arriving') return
    setPhase('dissolving')

    opacity.value = withTiming(0.3, { duration: 400 })
    scale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(0.2, { duration: 600 })
    )

    setTimeout(() => {
      runOnJS(startSparking)()
    }, 600)
  }

  function startSparking() {
    setPhase('sparking')
    triggerHaptic('light')

    const particles: SparkParticle[] = []
    const particleCount = 14
    const originX = SCREEN_WIDTH / 2
    const originY = SCREEN_HEIGHT * 0.35

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const scatter = 20 + Math.random() * 40

      const sx = originX + Math.cos(angle) * scatter
      const sy = originY + Math.sin(angle) * scatter * 0.5

      const tx = MEMORY_ICON_X + (Math.random() - 0.5) * 24
      const ty = MEMORY_ICON_Y + (Math.random() - 0.5) * 24

      const midX = (sx + tx) / 2
      const midY = (sy + ty) / 2
      const perpX = -(ty - sy)
      const perpY = tx - sx
      const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1
      const curvature = (Math.random() - 0.5) * 0.4

      particles.push({
        id: i,
        startX: sx,
        startY: sy,
        targetX: tx,
        targetY: ty,
        controlX: midX + (perpX / len) * curvature * 200,
        controlY: midY + (perpY / len) * curvature * 200,
        size: 2.5 + Math.random() * 4,
        color: bubbleColor,
        delay: i * 60,
        trailCount: 3 + Math.floor(Math.random() * 3),
      })
    }

    setSparkParticles(particles)

    setTimeout(() => {
      runOnJS(triggerArrival)()
    }, 1400 + particleCount * 60)
  }

  function triggerArrival() {
    setPhase('arriving')
    setShowArrivalFlash(true)
    triggerHaptic('medium')

    setTimeout(() => {
      setShowArrivalFlash(false)
      onDisappear?.()
    }, 600)
  }

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotate: `${wobbleRotate.value}deg` },
    ],
  }))

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerProgress.value * 0.3,
    transform: [{ translateX: shimmerProgress.value * 40 - 20 }],
  }))

  if (phase === 'sparking' || phase === 'arriving') {
    return (
      <View style={styles.sparkContainer} pointerEvents="none">
        {sparkParticles.map((p) => (
          <MemorySparkParticle key={p.id} particle={p} />
        ))}
        {showArrivalFlash && (
          <ArrivalFlash
            x={MEMORY_ICON_X}
            y={MEMORY_ICON_Y}
            color={bubbleColor}
          />
        )}
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light')
        onPress?.()
      }}
      style={styles.bubbleWrapper}
    >
      <Animated.View style={[styles.bubbleBody, { borderColor: bubbleColor + '60', backgroundColor: bubbleColor + '18' }, bubbleStyle]}>
        <Animated.View style={[styles.shimmerLayer, { backgroundColor: bubbleColor }, shimmerStyle]} />

        <View style={[styles.bubbleTail, { borderTopColor: bubbleColor + '30' }]} />

        <Text style={[styles.bubbleText, { color: bubbleColor }]} numberOfLines={3}>
          {text}
        </Text>

        <View style={[styles.glowDot, { backgroundColor: bubbleColor }]} />
      </Animated.View>
    </Pressable>
  )
}

function MemorySparkParticle({ particle }: { particle: SparkParticle }) {
  const progress = useSharedValue(0)
  const opacity = useSharedValue(0)
  const scaleVal = useSharedValue(0)
  const trailOpacities = useRef(
    Array.from({ length: particle.trailCount }, () => useSharedValue(0))
  ).current
  const trailPositions = useRef(
    Array.from({ length: particle.trailCount }, (_, i) => ({
      x: useSharedValue(particle.startX),
      y: useSharedValue(particle.startY),
    }))
  ).current

  useEffect(() => {
    const flightDuration = 900
    const stagger = particle.delay

    opacity.value = withDelay(
      stagger,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.9, { duration: flightDuration - 200 }),
        withTiming(0, { duration: 200 })
      )
    )

    scaleVal.value = withDelay(
      stagger,
      withSequence(
        withSpring(1.3, { damping: 8, stiffness: 300 }),
        withTiming(1, { duration: flightDuration }),
        withTiming(0.3, { duration: 200 })
      )
    )

    progress.value = withDelay(
      stagger,
      withTiming(1, {
        duration: flightDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    )

    for (let i = 0; i < particle.trailCount; i++) {
      const trailDelay = stagger + (i + 1) * 40
      trailOpacities[i].value = withDelay(
        trailDelay,
        withSequence(
          withTiming(0.6 - i * 0.12, { duration: 100 }),
          withTiming(0, { duration: flightDuration - 100 })
        )
      )
    }
  }, [])

  const mainStyle = useAnimatedStyle(() => {
    const t = progress.value
    const x = bezierPoint(particle.startX, particle.controlX, particle.targetX, t)
    const y = bezierPoint(particle.startY, particle.controlY, particle.targetY, t)

    for (let i = particle.trailCount - 1; i > 0; i--) {
      const tTrail = Math.max(0, t - i * 0.06)
      trailPositions[i].x.value = bezierPoint(particle.startX, particle.controlX, particle.targetX, tTrail)
      trailPositions[i].y.value = bezierPoint(particle.startY, particle.controlY, particle.targetY, tTrail)
    }
    if (particle.trailCount > 0) {
      const tTrail = Math.max(0, t - 0.06)
      trailPositions[0].x.value = bezierPoint(particle.startX, particle.controlX, particle.targetX, tTrail)
      trailPositions[0].y.value = bezierPoint(particle.startY, particle.controlY, particle.targetY, tTrail)
    }

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      opacity: opacity.value,
      transform: [{ scale: scaleVal.value }],
    }
  })

  return (
    <>
      {trailPositions.map((pos, i) => (
        <Animated.View
          key={`trail-${i}`}
          style={[
            styles.trailDot,
            {
              backgroundColor: particle.color,
              width: particle.size * (0.7 - i * 0.12),
              height: particle.size * (0.7 - i * 0.12),
              borderRadius: particle.size * (0.35 - i * 0.06),
            },
            {
              position: 'absolute',
              opacity: trailOpacities[i].value,
              left: pos.x.value,
              top: pos.y.value,
            } as any,
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.sparkDot,
          {
            backgroundColor: particle.color,
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
          },
          mainStyle,
        ]}
      />
    </>
  )
}

function bezierPoint(p0: number, p1: number, p2: number, t: number): number {
  'worklet'
  const mt = 1 - t
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2
}

function ArrivalFlash({ x, y, color }: { x: number; y: number; color: string }) {
  const flashScale = useSharedValue(0)
  const flashOpacity = useSharedValue(0)
  const ringScale = useSharedValue(0)
  const ringOpacity = useSharedValue(0)

  useEffect(() => {
    flashScale.value = withSequence(
      withSpring(1.8, { damping: 6, stiffness: 200 }),
      withTiming(0, { duration: 300 })
    )
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 500 })
    )

    ringScale.value = withSequence(
      withTiming(0.5, { duration: 100 }),
      withSpring(3, { damping: 8, stiffness: 100 }),
      withTiming(0, { duration: 200 })
    )
    ringOpacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(0, { duration: 600 })
    )
  }, [])

  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }],
    opacity: flashOpacity.value,
  }))

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }))

  return (
    <View style={[styles.flashContainer, { left: x - 20, top: y - 20 }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.flashCore,
          { backgroundColor: color },
          flashStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.flashRing,
          { borderColor: color },
          ringStyle,
        ]}
      />
    </View>
  )
}

interface AmbientBubbleManagerProps {
  bubbles: Array<{
    id: string
    text: string
    mood?: PetMood
  }>
  onBubbleDisappear: (id: string) => void
}

export function AmbientBubbleManager({ bubbles, onBubbleDisappear }: AmbientBubbleManagerProps) {
  return (
    <View style={styles.managerContainer} pointerEvents="box-none">
      {bubbles.map((bubble, index) => (
        <View
          key={bubble.id}
          style={[styles.bubbleSlot, { transform: [{ translateY: -index * 70 }] }]}
        >
          <AmbientBubble
            text={bubble.text}
            mood={bubble.mood || 'happy'}
            onDisappear={() => onBubbleDisappear(bubble.id)}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    alignItems: 'center',
  },
  bubbleBody: {
    maxWidth: SCREEN_WIDTH * 0.65,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
  },
  bubbleText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    lineHeight: theme.typography.lineHeights.relaxed,
    textAlign: 'center',
  },
  shimmerLayer: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    height: 2,
    borderRadius: 1,
  },
  glowDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  sparkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  sparkDot: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  trailDot: {
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  flashContainer: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  flashCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
  },
  flashRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    position: 'absolute',
  },
  managerContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  bubbleSlot: {
    marginBottom: theme.spacing.sm,
  },
})
