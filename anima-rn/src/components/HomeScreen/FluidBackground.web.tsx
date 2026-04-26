import React, { useEffect } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated'

interface FluidBackgroundWebProps {
  mood?: string
  intensity?: number
  timeSpeed?: number
}

const MOOD_COLORS: Record<string, { primary: string; secondary: string; ambient: string }> = {
  idle: {
    primary: '#0F172A',
    secondary: '#1E293B',
    ambient: '#334155',
  },
  happy: {
    primary: '#2D143C',
    secondary: '#501E5A',
    ambient: '#78328C',
  },
  sad: {
    primary: '#0A192D',
    secondary: '#12233C',
    ambient: '#1E3250',
  },
  excited: {
    primary: '#3C0F32',
    secondary: '#641E50',
    ambient: '#963278',
  },
  thinking: {
    primary: '#141E32',
    secondary: '#23324B',
    ambient: '#374B6E',
  },
  love: {
    primary: '#461428',
    secondary: '#78233C',
    ambient: '#A0375A',
  },
  sleepy: {
    primary: '#0C0F1E',
    secondary: '#161C30',
    ambient: '#262D46',
  },
  angry: {
    primary: '#320F0F',
    secondary: '#501919',
    ambient: '#6E2626',
  },
}

function FluidBackgroundWeb({
  mood = 'idle',
  intensity = 1.0,
  timeSpeed = 1.0,
}: FluidBackgroundWebProps) {
  const progress = useSharedValue(0)
  const colors = MOOD_COLORS[mood] || MOOD_COLORS.idle

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 15000 / timeSpeed,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    )
  }, [timeSpeed])

  const animatedColor1 = useAnimatedStyle(() => {
    return {
      opacity: 0.4 + progress.value * 0.2 * intensity,
    }
  })

  const animatedColor2 = useAnimatedStyle(() => {
    return {
      opacity: 0.3 + (1 - progress.value) * 0.2 * intensity,
    }
  })

  const animatedColor3 = useAnimatedStyle(() => {
    return {
      opacity: 0.2 + Math.sin(progress.value * Math.PI) * 0.3 * intensity,
    }
  })

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.colorLayer,
          { backgroundColor: colors.primary },
          animatedColor1,
        ]}
      />
      <Animated.View
        style={[
          styles.colorLayer,
          { backgroundColor: colors.secondary },
          animatedColor2,
        ]}
      />
      <Animated.View
        style={[
          styles.colorLayer,
          { backgroundColor: colors.ambient },
          animatedColor3,
        ]}
      />
      <View style={[styles.vignette, { opacity: 0.3 }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  colorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 200,
    elevation: 0,
  },
})

export { FluidBackgroundWeb as FluidBackground }
export default FluidBackgroundWeb
