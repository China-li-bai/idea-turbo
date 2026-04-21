import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { theme, dark, candy } from '../../theme'
import type { PetMood } from './types'

interface BreathingPetProps {
  species?: string
  emoji?: string
  mood?: PetMood
  size?: number
  isActive?: boolean
  glowColor?: string
  onPress?: () => void
  onLongPress?: () => void
}

const MOOD_ANIMATIONS: Record<PetMood, {
  scale: [number, number]
  rotate: [number, number]
  translateY: [number, number]
  duration: number
}> = {
  idle: { scale: [1, 1.03], rotate: [-2, 2], translateY: [0, -5], duration: 4000 },
  thinking: { scale: [1, 1.05], rotate: [-3, 3], translateY: [0, -8], duration: 2500 },
  typing: { scale: [0.98, 1.02], rotate: [-5, 5], translateY: [0, -3], duration: 1500 },
  sniffing: { scale: [1, 1.08], rotate: [-8, 8], translateY: [0, -10], duration: 1200 },
  listening: { scale: [0.97, 1.03], rotate: [-3, 3], translateY: [0, -6], duration: 2000 },
  happy: { scale: [1, 1.12], rotate: [-10, 10], translateY: [0, -15], duration: 1800 },
  excited: { scale: [1, 1.18], rotate: [-15, 15], translateY: [0, -20], duration: 1000 },
  sad: { scale: [1, 0.95], rotate: [-2, 2], translateY: [0, -3], duration: 3000 },
  angry: { scale: [1, 1.1], rotate: [-5, 5], translateY: [0, -8], duration: 1400 },
  sleepy: { scale: [1, 0.98], rotate: [-1, 1], translateY: [0, -2], duration: 5000 },
  curious: { scale: [1, 1.06], rotate: [-4, 4], translateY: [0, -7], duration: 2200 },
  love: { scale: [1, 1.15], rotate: [-12, 12], translateY: [0, -18], duration: 1600 },
  surprised: { scale: [1, 1.2], rotate: [-8, 8], translateY: [0, -12], duration: 800 },
  shy: { scale: [1, 0.96], rotate: [-3, 3], translateY: [0, -4], duration: 2800 },
}

export function BreathingPet({
  species = 'cat',
  emoji = '🐱',
  mood = 'idle',
  size = 200,
  isActive = false,
  glowColor = candy.neonPink.glow,
  onPress,
  onLongPress,
}: BreathingPetProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const translateYAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(0)).current
  const glowOpacityAnim = useRef(new Animated.Value(0)).current

  const prevMoodRef = useRef(mood)

  useEffect(() => {
    if (mood === prevMoodRef.current) return
    
    prevMoodRef.current = mood
    const config = MOOD_ANIMATIONS[mood] || MOOD_ANIMATIONS.idle

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: config.scale[1],
        duration: config.duration / 2,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: config.rotate[1],
        duration: config.duration / 2,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: config.translateY[1],
        duration: config.duration / 2,
        useNativeDriver: true,
      }),
    ]).start()

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: config.scale[0],
          duration: config.duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: config.rotate[0],
          duration: config.duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: config.translateY[0],
          duration: config.duration / 2,
          useNativeDriver: true,
        }),
      ]).start()
    }, config.duration / 2)
  }, [mood])

  useEffect(() => {
    if (!isActive) return

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    )

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacityAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacityAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    )

    pulseLoop.start()
    glowLoop.start()

    return () => {
      pulseLoop.stop()
      glowLoop.stop()
    }
  }, [isActive])

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  })

  const glowOpacity = glowOpacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  })

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.petCore,
          {
            width: size,
            height: size,
            transform: [
              { scale: scaleAnim },
              { rotate: rotateAnim.interpolate({
                inputRange: [-15, 15],
                outputRange: ['-15deg', '15deg'],
              }) },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        {isActive && (
          <>
            <Animated.View
              style={[
                styles.glowLayer,
                {
                  width: size * 1.5,
                  height: size * 1.5,
                  backgroundColor: glowColor,
                  opacity: glowOpacity,
                },
              ]}
            />
            
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  width: size * 1.2,
                  height: size * 1.2,
                  transform: [{ scale: pulseScale }],
                  borderColor: glowColor,
                },
              ]}
            />
          </>
        )}

        <View style={[styles.petBody, { width: size, height: size }]}>
          <Text style={[styles.petEmoji, { fontSize: size * 0.6 }]}>
            {emoji}
          </Text>
          
          <Animated.View
            style={[
              styles.moodIndicator,
              {
                opacity: glowOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          >
            <Text style={styles.moodEmoji}>{getMoodEmoji(mood)}</Text>
          </Animated.View>
        </View>

        <View style={[styles.shadowLayer, { 
          width: size * 0.8, 
          height: size * 0.1, 
          borderRadius: size * 0.05,
        }]} />
      </Animated.View>
    </TouchableOpacity>
  )
}

function getMoodEmoji(mood: PetMood): string {
  const emojis: Record<PetMood, string> = {
    idle: '💫',
    thinking: '💭',
    typing: '⌨️',
    sniffing: '👃',
    listening: '👂',
    happy: '😊',
    excited: '✨',
    sad: '💧',
    angry: '💢',
    sleepy: '💤',
    curious: '❓',
    love: '💕',
    surprised: '❗',
    shy: '😳',
  }
  return emojis[mood] || '💫'
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petCore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowLayer: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0.5,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 2,
    opacity: 0.6,
  },
  petBody: {
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  petEmoji: {
    textAlign: 'center',
  },
  moodIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  moodEmoji: {
    fontSize: 16,
  },
  shadowLayer: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.5,
  },
})
