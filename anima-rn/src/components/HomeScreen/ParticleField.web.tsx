import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'

interface ParticleFieldWebProps {
  brainActivity?: number
  particleCount?: number
  centerOffset?: { x: number; y: number }
  color?: string
}

const DEFAULT_PARTICLES = [
  { id: 1, x: 80, y: 120, size: 4, delay: 0 },
  { id: 2, x: 140, y: 80, size: 3, delay: 0.2 },
  { id: 3, x: 200, y: 100, size: 5, delay: 0.4 },
  { id: 4, x: 100, y: 160, size: 3, delay: 0.6 },
  { id: 5, x: 160, y: 140, size: 4, delay: 0.8 },
  { id: 6, x: 220, y: 120, size: 3, delay: 1.0 },
  { id: 7, x: 120, y: 180, size: 4, delay: 1.2 },
  { id: 8, x: 180, y: 160, size: 5, delay: 1.4 },
]

function ParticleWeb({
  x,
  y,
  size,
  color,
  delay,
  brainActivity,
}: {
  x: number
  y: number
  size: number
  color: string
  delay: number
  brainActivity: number
}) {
  const progress = useSharedValue(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, {
          duration: 3000 / brainActivity,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      )
    }, delay * 1000)

    return () => clearTimeout(timeout)
  }, [brainActivity, delay])

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 0.8 + progress.value * 0.4 * brainActivity
    const opacity = 0.3 + progress.value * 0.5 * brainActivity
    const translateY = -20 * progress.value * brainActivity

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    }
  })

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          width: size * 2,
          height: size * 2,
          borderRadius: size,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  )
}

function ParticleFieldWeb({
  brainActivity = 1,
  particleCount = 8,
  centerOffset = { x: 0, y: 0 },
  color = '#6366f1',
}: ParticleFieldWebProps) {
  const particles = DEFAULT_PARTICLES.slice(0, particleCount)

  return (
    <View style={[styles.container, { transform: [{ translateX: centerOffset.x }, { translateY: centerOffset.y }] }]}>
      {particles.map((particle) => (
        <ParticleWeb
          key={particle.id}
          x={particle.x}
          y={particle.y}
          size={particle.size}
          color={color}
          delay={particle.delay}
          brainActivity={brainActivity}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 300,
    height: 300,
  },
  particle: {
    position: 'absolute',
  },
})

export { ParticleFieldWeb as ParticleField }
export default ParticleFieldWeb
