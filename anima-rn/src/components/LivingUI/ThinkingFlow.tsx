import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native'
import { theme, dark, candy } from '../../theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface ThinkingFlowProps {
  texts?: string[]
  isActive?: boolean
  color?: string
}

interface ThoughtBubble {
  id: number
  text: string
  opacity: Animated.Value
  translateY: Animated.Value
  scale: Animated.Value
}

const DEFAULT_THOUGHTS = [
  '正在分析情绪标签...',
  '检索长期记忆...',
  '整合今日对话...',
  '更新性格模型...',
  '优化回复策略...',
]

export function ThinkingFlow({
  texts = DEFAULT_THOUGHTS,
  isActive = false,
  color = candy.cyan[400],
}: ThinkingFlowProps) {
  const [bubbles, setBubbles] = useState<ThoughtBubble[]>([])
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const flowAnim = useRef(new Animated.Value(0)).current
  const particleAnim1 = useRef(new Animated.Value(0)).current
  const particleAnim2 = useRef(new Animated.Value(0)).current
  const bubbleIdCounter = useRef(0)

  useEffect(() => {
    if (!isActive) {
      Animated.timing(flowAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start()
      return
    }

    Animated.timing(flowAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()

    const particleLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(particleAnim1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(particleAnim1, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    )

    const particleLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(particleAnim2, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(particleAnim2, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    )

    particleLoop1.start()
    particleLoop2.start()

    const textInterval = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1) % texts.length)
      
      addBubble(texts[currentTextIndex])
    }, 3000)

    return () => {
      clearInterval(textInterval)
      particleLoop1.stop()
      particleLoop2.stop()
    }
  }, [isActive, texts])

  function addBubble(text: string) {
    const id = bubbleIdCounter.current++
    const newBubble: ThoughtBubble = {
      id,
      text,
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
      scale: new Animated.Value(0.5),
    }

    setBubbles(prev => [...prev.slice(-3), newBubble])

    Animated.parallel([
      Animated.timing(newBubble.opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(newBubble.translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(newBubble.scale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(newBubble.opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(newBubble.translateY, {
          toValue: -20,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setBubbles(prev => prev.filter(b => b.id !== id))
      })
    }, 2500)
  }

  const flowOpacity = flowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const particle1TranslateY = particleAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  })

  const particle2TranslateY = particleAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  })

  if (!isActive && bubbles.length === 0) return null

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: flowOpacity },
      ]}
    >
      <View style={styles.flowTrack}>
        <View style={[styles.flowLine, { backgroundColor: color + '40' }]}>
          <Animated.View
            style={[
              styles.flowParticle,
              {
                backgroundColor: color,
                transform: [{ translateY: particle1TranslateY }],
                shadowColor: color,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.flowParticleSecondary,
              {
                backgroundColor: color + '80',
                transform: [{ translateY: particle2TranslateY }],
              },
            ]}
          />
        </View>

        <View style={styles.bubblesContainer}>
          {bubbles.map((bubble) => (
            <Animated.View
              key={bubble.id}
              style={[
                styles.thoughtBubble,
                {
                  opacity: bubble.opacity,
                  transform: [
                    { translateY: bubble.translateY },
                    { scale: bubble.scale },
                  ],
                  borderColor: color + '60',
                  backgroundColor: color + '15',
                },
              ]}
            >
              <Text style={[styles.bubbleText, { color }]}>
                💭 {bubble.text}
              </Text>
            </Animated.View>
          ))}
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.pulseDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>
            Qwen-0.5B 推理中...
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: -80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  flowTrack: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  flowLine: {
    width: 2,
    height: 60,
    borderRadius: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'visible',
  },
  flowParticle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  flowParticleSecondary: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 10,
  },
  bubblesContainer: {
    marginTop: theme.spacing.sm,
    minHeight: 40,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  thoughtBubble: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.xs,
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  bubbleText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
})
