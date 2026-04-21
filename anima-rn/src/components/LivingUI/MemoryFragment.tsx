import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { theme, dark, candy } from '../../theme'

interface MemoryFragmentProps {
  fragment: {
    id: string
    content: string
    type: 'episodic' | 'semantic' | 'emotion'
    timestamp: number
  }
  color?: string
}

const FRAGMENT_TYPE_CONFIG = {
  episodic: {
    icon: '📖',
    label: '事件',
    bgColor: 'rgba(255, 37, 143, 0.15)',
    borderColor: 'rgba(255, 37, 143, 0.4)',
  },
  semantic: {
    icon: '💡',
    label: '知识',
    bgColor: 'rgba(37, 107, 255, 0.15)',
    borderColor: 'rgba(37, 107, 255, 0.4)',
  },
  emotion: {
    icon: '💭',
    label: '情绪',
    bgColor: 'rgba(107, 255, 37, 0.15)',
    borderColor: 'rgba(107, 255, 37, 0.4)',
  },
}

export function MemoryFragment({
  fragment,
  color = candy.neonPink[400],
}: MemoryFragmentProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current
  const translateYAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const shimmerAnim = useRef(new Animated.Value(0)).current

  const config = FRAGMENT_TYPE_CONFIG[fragment.type] || FRAGMENT_TYPE_CONFIG.episodic

  useEffect(() => {
    const entranceAnimation = Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ])

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    )

    const wobbleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    )

    entranceAnimation.start()
    shimmerLoop.start()
    wobbleLoop.start()

    return () => {
      shimmerLoop.stop()
      wobbleLoop.stop()
    }
  }, [])

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  })

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0],
  })

  const rotation = rotateAnim.interpolate({
    inputRange: [-3, 3],
    outputRange: ['-3deg', '3deg'],
  })

  return (
    <Animated.View
      style={[
        styles.fragmentContainer,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: translateYAnim },
            { scale: scaleAnim },
            { rotate: rotation },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerLayer,
          {
            backgroundColor: color,
            opacity: shimmerOpacity,
            transform: [{ translateX: shimmerTranslateX }],
          },
        ]}
      />

      <View style={[
        styles.fragmentBody,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}>
        <View style={styles.fragmentHeader}>
          <Text style={styles.fragmentIcon}>{config.icon}</Text>
          <View style={styles.fragmentMeta}>
            <Text style={[styles.fragmentType, { color }]}>
              {config.label}
            </Text>
            <Text style={styles.fragmentTime}>
              {getTimeAgo(fragment.timestamp)}
            </Text>
          </View>
        </View>

        <Text style={styles.fragmentContent} numberOfLines={2}>
          {fragment.content}
        </Text>

        <View style={[styles.fragmentGlow, { backgroundColor: color + '20' }]} />
      </View>

      <Animated.View
        style={[
          styles.floatingParticle,
          {
            backgroundColor: color,
            opacity: shimmerOpacity,
            transform: [
              { translateX: shimmerTranslateX },
              { translateY: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 10],
              }) },
            ],
          },
        ]}
      />
    </Animated.View>
  )
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

const styles = StyleSheet.create({
  fragmentContainer: {
    position: 'absolute',
    top: -60,
    right: -20,
    width: 200,
    zIndex: 10,
  },
  shimmerLayer: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    height: 2,
    borderRadius: 1,
  },
  fragmentBody: {
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    padding: theme.spacing.md,
    overflow: 'hidden',
  },
  fragmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  fragmentIcon: {
    fontSize: 16,
  },
  fragmentMeta: {
    flex: 1,
  },
  fragmentType: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  fragmentTime: {
    fontSize: 10,
    color: dark.text.tertiary,
  },
  fragmentContent: {
    fontSize: theme.typography.sizes.sm,
    color: dark.text.primary,
    lineHeight: theme.typography.lineHeights.normal,
  },
  fragmentGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    borderRadius: theme.radius.lg,
  },
  floatingParticle: {
    position: 'absolute',
    top: -5,
    right: 10,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
