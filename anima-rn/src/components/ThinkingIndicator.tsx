import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay } from 'react-native-reanimated'
import { theme } from '../theme'

interface ThinkingIndicatorProps {
  petEmoji?: string
  steps?: string[]
}

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 400 }), -1, true),
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return <Animated.View style={[styles.dot, animatedStyle]} />
}

export function ThinkingIndicator({ petEmoji = '🐱', steps }: ThinkingIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bubbleRow}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>{petEmoji}</Text>
        </View>
        <View style={styles.bubble}>
          <View style={styles.dotsRow}>
            <Dot delay={0} />
            <Dot delay={200} />
            <Dot delay={400} />
          </View>
        </View>
      </View>
      {steps && steps.length > 0 && (
        <View style={styles.stepsContainer}>
          {steps.map((step, i) => (
            <Text key={i} style={styles.stepText}>{step}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubble: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderBottomLeftRadius: theme.radius.sm,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.sm,
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
    backgroundColor: theme.colors.primary[400],
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
    marginLeft: 40,
    gap: theme.spacing.sm,
  },
  stepText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.secondary[500],
    backgroundColor: theme.colors.secondary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
})
