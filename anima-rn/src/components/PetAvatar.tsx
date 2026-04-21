import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated'
import { theme } from '../theme'

interface PetAvatarProps {
  emoji: string
  size?: number
  isActive?: boolean
  showPulse?: boolean
}

export function PetAvatar({ emoji, size = 48, isActive = false, showPulse = false }: PetAvatarProps) {
  const scale = useSharedValue(1)
  const pulseScale = useSharedValue(1)

  useEffect(() => {
    if (showPulse) {
      pulseScale.value = withSequence(
        withSpring(1.08, theme.animation.easing.gentle),
        withSpring(1, theme.animation.easing.gentle),
      )
      const interval = setInterval(() => {
        pulseScale.value = withSequence(
          withSpring(1.08, theme.animation.easing.gentle),
          withSpring(1, theme.animation.easing.gentle),
        )
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [showPulse])

  useEffect(() => {
    scale.value = withSpring(1, theme.animation.easing.bouncy)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }))

  return (
    <View style={[styles.container, { width: size + 8, height: size + 8 }]}>
      {isActive && <View style={[styles.activeRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]} />}
      <Animated.View style={[styles.emojiContainer, { width: size, height: size, borderRadius: size / 2 }, animatedStyle]}>
        <Text style={[styles.emoji, { fontSize: size * 0.55 }]}>{emoji}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.primary[400],
    backgroundColor: theme.colors.primary[50],
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral[50],
  },
  emoji: {
    textAlign: 'center',
  },
})
