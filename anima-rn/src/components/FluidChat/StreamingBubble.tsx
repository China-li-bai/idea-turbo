import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown, LinearTransition, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, type SharedValue } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { streamEventBus } from './StreamEventBus'
import { theme, petTheme } from '../../theme'
import type { PetSpecies } from '../../types'
import type { PetMood } from '../LivingUI/types'
import type { TokenSpeedLevel } from '../LivingUI/TokenSpeedTracker'
import { getBreathCurve, getBreathPhysicsForCurve, getStreamingCursorAnimation, getBubblePulseAnimation } from '../LivingUI/BreathCurve'

interface StreamingBubbleProps {
  messageId: string
  petEmoji?: string
  species?: PetSpecies
  mood?: PetMood
  speedLevel?: TokenSpeedLevel
  onComplete: (fullText: string) => void
}

function BreathingStreamCursor({ color, speedLevel = 'normal', mood = 'typing' }: { color: string; speedLevel?: TokenSpeedLevel; mood?: PetMood }) {
  const cursorConfig = getStreamingCursorAnimation(speedLevel, mood)
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: cursorConfig.blinkDuration / 2 }),
        withTiming(0.15, { duration: cursorConfig.blinkDuration / 2 })
      ),
      -1,
      true
    )
  }, [cursorConfig.blinkDuration])

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: cursorConfig.width,
    height: cursorConfig.height,
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.4,
    width: cursorConfig.width + cursorConfig.glowRadius * 2,
    height: cursorConfig.height + cursorConfig.glowRadius * 2,
    borderRadius: (cursorConfig.height + cursorConfig.glowRadius * 2) / 2,
  }))

  return (
    <View style={localStyles.cursorContainer}>
      <Animated.View
        style={[localStyles.cursorGlow, { backgroundColor: color }, glowStyle]}
      />
      <Animated.View
        style={[localStyles.cursorBody, { backgroundColor: color }, cursorStyle]}
      />
    </View>
  )
}

function ThinkingDots({ color, speedLevel = 'slow' }: { color: string; speedLevel?: TokenSpeedLevel }) {
  const breathCurve = getBreathCurve(speedLevel, 'thinking')
  const dot1Scale = useSharedValue(0.3)
  const dot2Scale = useSharedValue(0.3)
  const dot3Scale = useSharedValue(0.3)

  const dotDuration = breathCurve.rippleSpeed

  useEffect(() => {
    dot1Scale.value = withRepeat(
      withSequence(withSpring(1.2, { damping: 10, stiffness: 200 }), withSpring(0.3, { damping: 20, stiffness: 100 })),
      -1,
      false,
    )
    dot2Scale.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: dotDuration / 4 }),
        withSpring(1.2, { damping: 10, stiffness: 200 }),
        withSpring(0.3, { damping: 20, stiffness: 100 }),
      ),
      -1,
      false,
    )
    dot3Scale.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: dotDuration / 2 }),
        withSpring(1.2, { damping: 10, stiffness: 200 }),
        withSpring(0.3, { damping: 20, stiffness: 100 }),
      ),
      -1,
      false,
    )
  }, [dotDuration])

  const makeDotStyle = (scale: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: 0.3 + scale.value * 0.5,
    }))

  return (
    <View style={localStyles.dotsRow}>
      {[dot1Scale, dot2Scale, dot3Scale].map((s, i) => (
        <Animated.View
          key={i}
          style={[localStyles.dot, { backgroundColor: color }, makeDotStyle(s)]}
        />
      ))}
    </View>
  )
}

export function StreamingBubble({
  messageId,
  petEmoji = '🐱',
  species = 'cat',
  mood = 'typing',
  speedLevel = 'normal',
  onComplete,
}: StreamingBubbleProps) {
  const [text, setText] = useState('')
  const [isThinking, setIsThinking] = useState(true)
  const textRef = React.useRef('')
  const petColors = petTheme[species] || petTheme.cat

  const breathPhysics = getBreathPhysicsForCurve(speedLevel, mood)
  const pulseConfig = getBubblePulseAnimation(speedLevel, mood)
  const breathCurve = getBreathCurve(speedLevel, mood)

  const breathScale = useSharedValue(0)
  const glowPulse = useSharedValue(0)

  useEffect(() => {
    const tokenListener = streamEventBus.addListener(`token-${messageId}`, (token: string) => {
      if (isThinking) {
        setIsThinking(false)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
      textRef.current += token
      setText(textRef.current)
    })

    const doneListener = streamEventBus.addListener(`done-${messageId}`, () => {
      if (textRef.current) {
        onComplete(textRef.current)
      }
    })

    return () => {
      tokenListener.remove()
      doneListener.remove()
    }
  }, [messageId, isThinking, onComplete])

  useEffect(() => {
    if (!isThinking) {
      breathScale.value = withRepeat(
        withSequence(
          withTiming(pulseConfig.scaleAmplitude, {
            duration: pulseConfig.duration / 2,
          }),
          withTiming(-pulseConfig.scaleAmplitude, {
            duration: pulseConfig.duration / 2,
          })
        ),
        -1,
        true
      )

      glowPulse.value = withRepeat(
        withSequence(
          withTiming(breathCurve.glowIntensity, { duration: breathCurve.rippleSpeed }),
          withTiming(breathCurve.glowIntensity * 0.3, { duration: breathCurve.rippleSpeed })
        ),
        -1,
        true
      )
    }
  }, [isThinking, speedLevel])

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathScale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }))

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(breathPhysics.damping).stiffness(breathPhysics.stiffness)}
      layout={LinearTransition.springify().damping(breathPhysics.damping + 4).stiffness(breathPhysics.stiffness)}
      style={localStyles.bubbleRow}
    >
      <View style={[localStyles.avatarContainer, { backgroundColor: petColors.bg }]}>
        <Text style={localStyles.avatarEmoji}>{petEmoji}</Text>
      </View>
      <Animated.View
        layout={LinearTransition.springify().damping(breathPhysics.damping + 4).stiffness(breathPhysics.stiffness)}
        style={[
          localStyles.bubble,
          {
            borderColor: petColors.primary + '20',
            borderBottomLeftRadius: theme.radius.sm,
          },
          bubbleStyle,
        ]}
      >
        <Animated.View
          style={[
            localStyles.bubbleGlow,
            { backgroundColor: petColors.primary },
            glowStyle,
          ]}
        />

        {isThinking ? (
          <View style={localStyles.thinkingContainer}>
            <ThinkingDots color={petColors.primary} speedLevel={speedLevel} />
            <Text style={[localStyles.thinkingHint, { color: petColors.primary }]}>
              正在翻日记本...
            </Text>
          </View>
        ) : (
          <Text style={[localStyles.chatText, { color: petColors.primaryDark }]} selectable>
            {text}
            <BreathingStreamCursor
              color={petColors.primary}
              speedLevel={speedLevel}
              mood={mood}
            />
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  )
}

const localStyles = StyleSheet.create({
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
    maxWidth: '88%',
    marginVertical: theme.spacing.xs,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[200],
  },
  avatarEmoji: {
    fontSize: 18,
  },
  bubble: {
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  bubbleGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
  },
  thinkingContainer: {
    gap: theme.spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thinkingHint: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    fontStyle: 'italic',
  },
  chatText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
    fontWeight: theme.typography.weights.medium,
  },
  cursorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginLeft: 2,
    height: theme.typography.sizes.md,
  },
  cursorGlow: {
    position: 'absolute',
    left: -4,
    top: -4,
  },
  cursorBody: {
    borderRadius: 1,
  },
})
