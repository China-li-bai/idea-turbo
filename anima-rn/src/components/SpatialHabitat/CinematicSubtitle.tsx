import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
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
import { triggerHaptic } from '../LivingUI/HapticEngine'
import { dark, candy } from '../../theme'
import type { PetMood } from '../LivingUI/types'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export interface CinematicSubtitleLine {
  id: string
  text: string
  mood?: PetMood
  timestamp: number
  role: 'pet' | 'user' | 'system'
}

interface CinematicSubtitleProps {
  line: CinematicSubtitleLine | null
  petPositionX?: number
  petPositionY?: number
  visibleDuration?: number
  onDissolved?: (id: string) => void
}

interface DissolveParticle {
  id: number
  x: number
  y: number
  targetX: number
  targetY: number
  size: number
  opacity: number
  color: string
  delay: number
}

const MOOD_SUBTITLE_COLORS: Record<PetMood, string> = {
  idle: candy.violet[300],
  thinking: candy.cyan[300],
  typing: candy.cyan[400],
  sniffing: candy.lime[300],
  listening: candy.electricBlue[400],
  happy: candy.coral[300],
  excited: candy.neonPink[400],
  sad: candy.violet[500],
  angry: candy.coral[500],
  sleepy: candy.violet[200],
  curious: candy.lime[400],
  love: candy.neonPink[300],
  surprised: candy.coral[400],
  shy: candy.neonPink[200],
}

export function CinematicSubtitle({
  line,
  petPositionX = SCREEN_WIDTH / 2,
  petPositionY = SCREEN_HEIGHT * 0.35,
  visibleDuration = 5000,
  onDissolved,
}: CinematicSubtitleProps) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(20)
  const scale = useSharedValue(0.8)
  const breathScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0)

  const [displayedText, setDisplayedText] = useState('')
  const [charIndex, setCharIndex] = useState(0)
  const [phase, setPhase] = useState<'hidden' | 'appearing' | 'floating' | 'dissolving'>('hidden')
  const [particles, setParticles] = useState<DissolveParticle[]>([])
  const currentLineRef = useRef<CinematicSubtitleLine | null>(null)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!line) {
      if (phase !== 'hidden') {
        dissolve()
      }
      return
    }

    currentLineRef.current = line
    appear(line.text)
  }, [line?.id])

  const appear = useCallback((text: string) => {
    setPhase('appearing')
    setDisplayedText('')
    setCharIndex(0)
    setParticles([])

    opacity.value = withSpring(1, { damping: 12, stiffness: 150 })
    translateY.value = withSpring(0, { damping: 15, stiffness: 120 })
    scale.value = withSpring(1, { damping: 10, stiffness: 180 })
    glowOpacity.value = withSequence(
      withTiming(0.8, { duration: 300 }),
      withTiming(0.3, { duration: 600 })
    )

    triggerHaptic('light')

    let idx = 0
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    typewriterRef.current = setInterval(() => {
      idx++
      if (idx <= text.length) {
        setDisplayedText(text.substring(0, idx))
        setCharIndex(idx)
        if (idx % 3 === 0) {
          breathScale.value = withSequence(
            withTiming(1.02, { duration: 80 }),
            withTiming(1, { duration: 120 })
          )
        }
      } else {
        if (typewriterRef.current) clearInterval(typewriterRef.current)
        setPhase('floating')
        startFloating()
        scheduleDissolve()
      }
    }, 45)
  }, [])

  const startFloating = useCallback(() => {
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.015, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )
  }, [])

  const scheduleDissolve = useCallback(() => {
    setTimeout(() => {
      dissolve()
    }, visibleDuration)
  }, [visibleDuration])

  const dissolve = useCallback(() => {
    if (phase === 'dissolving' || phase === 'hidden') return
    setPhase('dissolving')

    opacity.value = withTiming(0, { duration: 800 })
    scale.value = withSequence(
      withTiming(1.05, { duration: 200 }),
      withTiming(0.6, { duration: 600 })
    )
    translateY.value = withTiming(-30, { duration: 800 })

    spawnDissolveParticles()

    setTimeout(() => {
      setPhase('hidden')
      setDisplayedText('')
      setParticles([])
      if (currentLineRef.current && onDissolved) {
        runOnJS(onDissolved)(currentLineRef.current.id)
      }
    }, 1200)
  }, [phase, onDissolved])

  const spawnDissolveParticles = useCallback(() => {
    const count = 20
    const newParticles: DissolveParticle[] = []
    const color = line?.mood ? MOOD_SUBTITLE_COLORS[line.mood] : candy.violet[400]

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const distance = 40 + Math.random() * 80
      newParticles.push({
        id: i,
        x: 0,
        y: 0,
        targetX: Math.cos(angle) * distance,
        targetY: Math.sin(angle) * distance - 30,
        size: 2 + Math.random() * 4,
        opacity: 0.8 + Math.random() * 0.2,
        color,
        delay: i * 30,
      })
    }
    setParticles(newParticles)
  }, [line?.mood])

  const subtitleColor = line?.mood ? MOOD_SUBTITLE_COLORS[line.mood] : candy.violet[300]
  const isUser = line?.role === 'user'
  const isSystem = line?.role === 'system'

  const subtitleX = isUser
    ? SCREEN_WIDTH * 0.65
    : petPositionX

  const subtitleY = isUser
    ? petPositionY + 60
    : petPositionY - 40

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value * breathScale.value },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  if (phase === 'hidden' && !line) return null

  return (
    <View style={[styles.container, { left: subtitleX - 140, top: subtitleY }]} pointerEvents="none">
      <Animated.View style={[styles.subtitleWrap, animatedStyle]}>
        <Animated.View
          style={[
            styles.glowLayer,
            { backgroundColor: subtitleColor },
            glowStyle,
          ]}
        />

        <View style={[styles.textContainer, isUser && styles.userTextContainer]}>
          {isSystem && (
            <Text style={[styles.systemLabel]}>✦</Text>
          )}
          <Text style={[styles.subtitleText, { color: subtitleColor }, isUser && styles.userText]}>
            {displayedText}
            {phase === 'appearing' && charIndex < (line?.text.length || 0) && (
              <Text style={styles.cursor}>|</Text>
            )}
          </Text>
        </View>

        {phase === 'dissolving' && particles.length > 0 && (
          <View style={styles.particleLayer} pointerEvents="none">
            {particles.map((p) => (
              <DissolveParticleDot key={p.id} particle={p} />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  )
}

function DissolveParticleDot({ particle }: { particle: DissolveParticle }) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(particle.opacity)
  const scale = useSharedValue(1)

  useEffect(() => {
    const timeout = setTimeout(() => {
      translateX.value = withTiming(particle.targetX, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
      translateY.value = withTiming(particle.targetY, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
      opacity.value = withTiming(0, { duration: 700 })
      scale.value = withTiming(0.2, { duration: 600 })
    }, particle.delay)

    return () => clearTimeout(timeout)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: particle.color,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
        },
        animatedStyle,
      ]}
    />
  )
}

export function CinematicSubtitleStack({
  lines,
  petPositionX,
  petPositionY,
  maxVisible = 2,
  onLineDissolved,
}: {
  lines: CinematicSubtitleLine[]
  petPositionX?: number
  petPositionY?: number
  maxVisible?: number
  onLineDissolved?: (id: string) => void
}) {
  const [dissolvedIds, setDissolvedIds] = useState<Set<string>>(new Set())
  const activeLines = lines
    .filter(l => !dissolvedIds.has(l.id))
    .slice(-maxVisible)

  const handleDissolved = useCallback((id: string) => {
    setDissolvedIds(prev => new Set([...prev, id]))
    onLineDissolved?.(id)
  }, [onLineDissolved])

  return (
    <View style={styles.stackContainer} pointerEvents="none">
      {activeLines.map((line, index) => (
        <View key={line.id} style={{ transform: [{ translateY: index * -10 }] }}>
          <CinematicSubtitle
            line={index === activeLines.length - 1 ? line : { ...line, timestamp: 0 }}
            petPositionX={petPositionX}
            petPositionY={petPositionY}
            visibleDuration={index === activeLines.length - 1 ? 5000 : 2000}
            onDissolved={handleDissolved}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 280,
    zIndex: 20,
  },
  subtitleWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  glowLayer: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
    opacity: 0.15,
    filter: [{ blur: 15 }],
  },
  textContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 10, 25, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxWidth: 260,
  },
  userTextContainer: {
    backgroundColor: 'rgba(20, 15, 40, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  subtitleText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userText: {
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.85,
    fontStyle: 'italic',
  },
  systemLabel: {
    fontSize: 10,
    color: candy.violet[300],
    marginBottom: 2,
    opacity: 0.6,
  },
  cursor: {
    color: candy.cyan[400],
    fontWeight: '300',
  },
  particleLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  stackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
