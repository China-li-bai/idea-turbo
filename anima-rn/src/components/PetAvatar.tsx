import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withRepeat, withTiming } from 'react-native-reanimated'
import { theme, petTheme } from '../theme'
import type { PetSpecies } from '../types'

interface PetAvatarProps {
  emoji: string
  species?: PetSpecies
  size?: number
  isActive?: boolean
  showPulse?: boolean
  showGlow?: boolean
  mood?: 'happy' | 'sleepy' | 'excited' | 'curious' | 'default'
}

export function PetAvatar({
  emoji,
  species = 'cat',
  size = 48,
  isActive = false,
  showPulse = false,
  showGlow = false,
  mood = 'default',
}: PetAvatarProps) {
  const scale = useSharedValue(1)
  const pulseScale = useSharedValue(1)
  const rotate = useSharedValue(0)
  const translateY = useSharedValue(0)

  const petColors = petTheme[species] || petTheme.cat

  useEffect(() => {
    scale.value = withSpring(1, theme.animation.easing.bouncy)
  }, [])

  useEffect(() => {
    if (showPulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.1, theme.animation.easing.gentle),
          withSpring(1, theme.animation.easing.gentle),
        ),
        -1,
        true,
      )
    } else {
      pulseScale.value = withSpring(1)
    }
  }, [showPulse])

  useEffect(() => {
    switch (mood) {
      case 'happy':
        translateY.value = withRepeat(
          withSequence(
            withTiming(-4, { duration: 300 }),
            withTiming(0, { duration: 300 }),
          ),
          3,
          false,
        )
        break
      case 'excited':
        rotate.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 150 }),
            withTiming(5, { duration: 150 }),
          ),
          6,
          true,
        )
        break
      case 'curious':
        rotate.value = withSequence(
          withTiming(-8, { duration: 400 }),
          withTiming(8, { duration: 400 }),
          withTiming(0, { duration: 300 }),
        )
        break
      case 'sleepy':
        translateY.value = withTiming(2, { duration: 1000 })
        break
      default:
        translateY.value = withSpring(0)
        rotate.value = withSpring(0)
    }
  }, [mood])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pulseScale.value },
      { rotate: `${rotate.value}deg` },
      { translateY: translateY.value },
    ],
  }))

  const glowSize = size + 16

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {showGlow && (
        <View
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: petColors.primary + '18',
            },
          ]}
        />
      )}
      {isActive && (
        <View
          style={[
            styles.activeRing,
            {
              width: size + 10,
              height: size + 10,
              borderRadius: (size + 10) / 2,
              borderColor: petColors.primary,
              backgroundColor: petColors.primaryLight,
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.emojiContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: petColors.bg,
            borderColor: petColors.primary + '30',
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.emoji, { fontSize: size * 0.55 }]}>{emoji}</Text>
      </Animated.View>
      {isActive && (
        <View style={[styles.statusDot, { backgroundColor: petColors.accent }]} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  activeRing: {
    position: 'absolute',
    borderWidth: 2.5,
    opacity: 0.6,
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...theme.shadows.sm,
  },
  emoji: {
    textAlign: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
})
