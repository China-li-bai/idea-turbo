import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSpring, withSequence } from 'react-native-reanimated'
import { theme, petTheme } from '../theme'
import type { PetSpecies } from '../types'

interface ThinkingIndicatorProps {
  petEmoji?: string
  species?: PetSpecies
  steps?: string[]
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0.3)
  const scale = useSharedValue(1)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 500 }), -1, true),
    )
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withSpring(1.3, { damping: 10, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        ),
        -1,
        true,
      ),
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />
}

export function ThinkingIndicator({ petEmoji = '🐱', species = 'cat', steps }: ThinkingIndicatorProps) {
  const petColors = petTheme[species] || petTheme.cat

  return (
    <View style={styles.container}>
      <View style={styles.bubbleRow}>
        <View style={[styles.avatarContainer, { backgroundColor: petColors.bg }]}>
          <Text style={styles.avatarEmoji}>{petEmoji}</Text>
        </View>
        <View style={[styles.bubble, { borderColor: petColors.primary + '20' }]}>
          <View style={styles.dotsRow}>
            <Dot delay={0} color={petColors.primary} />
            <Dot delay={180} color={petColors.accent} />
            <Dot delay={360} color={petColors.primary} />
          </View>
        </View>
      </View>
      {steps && steps.length > 0 && (
        <View style={styles.stepsContainer}>
          {steps.map((step, i) => (
            <View
              key={i}
              style={[
                styles.stepBadge,
                {
                  backgroundColor: petColors.primaryLight,
                  borderColor: petColors.primary + '15',
                },
              ]}
            >
              <Text style={[styles.stepText, { color: petColors.primaryDark }]}>
                {step}
              </Text>
            </View>
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
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
    marginLeft: 44,
    gap: theme.spacing.sm,
  },
  stepBadge: {
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  stepText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
})
