import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInDown, LinearTransition, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, type SharedValue } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { streamEventBus } from './StreamEventBus'
import { theme, petTheme } from '../../theme'
import type { PetSpecies } from '../../types'

interface StreamingBubbleProps {
  messageId: string
  petEmoji?: string
  species?: PetSpecies
  onComplete: (fullText: string) => void
}

function ThinkingDots({ color }: { color: string }) {
  const dot1Scale = useSharedValue(0.3)
  const dot2Scale = useSharedValue(0.3)
  const dot3Scale = useSharedValue(0.3)

  useEffect(() => {
    dot1Scale.value = withRepeat(
      withSequence(withSpring(1.2, theme.animation.easing.bouncy), withSpring(0.3, theme.animation.easing.gentle)),
      -1,
      false,
    )
    dot2Scale.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 180 }),
        withSpring(1.2, theme.animation.easing.bouncy),
        withSpring(0.3, theme.animation.easing.gentle),
      ),
      -1,
      false,
    )
    dot3Scale.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 360 }),
        withSpring(1.2, theme.animation.easing.bouncy),
        withSpring(0.3, theme.animation.easing.gentle),
      ),
      -1,
      false,
    )
  }, [])

  const makeDotStyle = (scale: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: 0.3 + scale.value * 0.5,
    }))

  return (
    <View style={styles.dotsRow}>
      {[dot1Scale, dot2Scale, dot3Scale].map((s, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { backgroundColor: color }, makeDotStyle(s)]}
        />
      ))}
    </View>
  )
}

export function StreamingBubble({
  messageId,
  petEmoji = '🐱',
  species = 'cat',
  onComplete,
}: StreamingBubbleProps) {
  const [text, setText] = useState('')
  const [isThinking, setIsThinking] = useState(true)
  const textRef = React.useRef('')
  const petColors = petTheme[species] || petTheme.cat

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

  const handleLayout = useCallback(() => {}, [])

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(14).stiffness(200)}
      layout={LinearTransition.springify().damping(18).stiffness(250)}
      onLayout={handleLayout}
      style={styles.bubbleRow}
    >
      <View style={[styles.avatarContainer, { backgroundColor: petColors.bg }]}>
        <Text style={styles.avatarEmoji}>{petEmoji}</Text>
      </View>
      <Animated.View
        layout={LinearTransition.springify().damping(18).stiffness(250)}
        style={[
          styles.bubble,
          {
            borderColor: petColors.primary + '20',
            borderBottomLeftRadius: theme.radius.sm,
          },
        ]}
      >
        {isThinking ? (
          <View style={styles.thinkingContainer}>
            <ThinkingDots color={petColors.primary} />
            <Text style={[styles.thinkingHint, { color: petColors.primary }]}>
              正在翻日记本...
            </Text>
          </View>
        ) : (
          <Text style={[styles.chatText, { color: petColors.primaryDark }]} selectable>
            {text}
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={[styles.cursor, { backgroundColor: petColors.primary }]}
            />
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
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
  cursor: {
    width: 2,
    height: theme.typography.sizes.md,
    borderRadius: 1,
    marginLeft: 2,
  },
})
