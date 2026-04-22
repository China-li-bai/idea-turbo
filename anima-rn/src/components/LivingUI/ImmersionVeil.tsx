import React, { useEffect } from 'react'
import { View, StyleSheet, Dimensions, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { triggerHaptic } from './HapticEngine'
import { dark, candy, theme } from '../../theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface ImmersionVeilProps {
  visible: boolean
  intensity?: number
  tint?: 'dark' | 'deep' | 'void'
  onFullyCovered?: () => void
  onDismissed?: () => void
}

export function ImmersionVeil({
  visible,
  intensity = 0.85,
  tint = 'deep',
  onFullyCovered,
  onDismissed,
}: ImmersionVeilProps) {
  const veilTranslateY = useSharedValue(SCREEN_HEIGHT)
  const veilOpacity = useSharedValue(0)
  const borderGlowOpacity = useSharedValue(0)
  const borderGlowWidth = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      runOnJS(triggerHaptic)('medium')

      veilTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 80,
        mass: 1.0,
      })
      veilOpacity.value = withTiming(intensity, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })

      borderGlowOpacity.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(0.6, { duration: 400 }),
        withTiming(0.3, { duration: 600 })
      )
      borderGlowWidth.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 800 })
      )

      const timer = setTimeout(() => {
        onFullyCovered?.()
      }, 700)

      return () => clearTimeout(timer)
    } else {
      veilTranslateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 500,
        easing: Easing.in(Easing.cubic),
      })
      veilOpacity.value = withTiming(0, { duration: 400 })
      borderGlowOpacity.value = withTiming(0, { duration: 300 })

      const timer = setTimeout(() => {
        onDismissed?.()
      }, 550)

      return () => clearTimeout(timer)
    }
  }, [visible])

  const veilStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: veilTranslateY.value }],
    opacity: veilOpacity.value,
  }))

  const borderGlowStyle = useAnimatedStyle(() => ({
    opacity: borderGlowOpacity.value,
    transform: [{ scaleX: borderGlowWidth.value || 0.01 }],
  }))

  const tintColor = tint === 'void'
    ? 'rgba(5, 5, 12, 0.92)'
    : tint === 'deep'
      ? 'rgba(10, 10, 25, 0.88)'
      : 'rgba(15, 15, 30, 0.85)'

  return (
    <Animated.View
      style={[
        styles.veil,
        { backgroundColor: tintColor },
        veilStyle,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.frostedLayer} />

      <Animated.View
        style={[
          styles.topBorderGlow,
          {
            backgroundColor: candy.violet[400],
            shadowColor: candy.violet[400],
          },
          borderGlowStyle,
        ]}
      />

      <View style={styles.noiseTexture} />
    </Animated.View>
  )
}

interface ImmersionPortalProps {
  isActive: boolean
  children: React.ReactNode
  onEnterComplete?: () => void
  onExitComplete?: () => void
}

export function ImmersionPortal({
  isActive,
  children,
  onEnterComplete,
  onExitComplete,
}: ImmersionPortalProps) {
  const contentTranslateY = useSharedValue(SCREEN_HEIGHT * 0.3)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    if (isActive) {
      contentTranslateY.value = withSpring(0, {
        damping: 22,
        stiffness: 90,
        mass: 0.8,
      })
      contentOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      })
    } else {
      contentTranslateY.value = withTiming(SCREEN_HEIGHT * 0.3, {
        duration: 400,
        easing: Easing.in(Easing.cubic),
      })
      contentOpacity.value = withTiming(0, { duration: 300 })
    }
  }, [isActive])

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }))

  return (
    <View style={styles.portalContainer} pointerEvents={isActive ? 'auto' : 'none'}>
      <ImmersionVeil
        visible={isActive}
        onFullyCovered={onEnterComplete}
        onDismissed={onExitComplete}
      />
      <Animated.View style={[styles.portalContent, contentStyle]}>
        {children}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  frostedLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  noiseTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.015,
    backgroundColor: 'transparent',
  },
  topBorderGlow: {
    position: 'absolute',
    top: 0,
    left: -10,
    right: -10,
    height: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  portalContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  portalContent: {
    flex: 1,
    zIndex: 20,
  },
})
