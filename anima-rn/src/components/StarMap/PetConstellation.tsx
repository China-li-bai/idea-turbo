import React, { useEffect, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated'
import { Canvas, Circle, Group, Line, vec, useClock, Blur } from '@shopify/react-native-skia'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { dark, candy } from '../../theme'
import type {
  ConstellationNode,
  ConstellationEdge,
  ConstellationLayout,
} from '../../lib/ConstellationEngine'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const CENTER_X = SCREEN_W / 2
const CENTER_Y = SCREEN_H / 2
const LAYOUT_RADIUS = Math.min(SCREEN_W, SCREEN_H) * 0.38

interface PetConstellationProps {
  layout: ConstellationLayout
  onNodePress?: (node: ConstellationNode) => void
  onSelfPress?: () => void
}

function StarPoint({
  node,
  onPress,
}: {
  node: ConstellationNode
  onPress?: (node: ConstellationNode) => void
}) {
  const pulse = useSharedValue(0)
  const glowOpacity = useSharedValue(node.brightness)

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    )
  }, [])

  const screenX = CENTER_X + node.x * LAYOUT_RADIUS
  const screenY = CENTER_Y + node.y * LAYOUT_RADIUS

  const baseSize = node.isSelf ? 18 : node.isNPC ? 14 : 8 + (node.matchScore || 0) * 6

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + pulse.value * 0.3
    const opacity = 0.6 + pulse.value * 0.4
    return {
      transform: [{ scale }],
      opacity,
    }
  })

  const starColor = node.isSelf
    ? candy.cyan[400]
    : node.isNPC
    ? candy.coral[400]
    : node.matchScore && node.matchScore > 0.5
    ? candy.neonPink[400]
    : candy.electricBlue[300]

  const glowColor = node.isSelf
    ? candy.cyan.glow
    : node.isNPC
    ? candy.coral.glow
    : candy.neonPink.glow

  return (
    <Pressable
      onPress={() => onPress?.(node)}
      style={[
        styles.starContainer,
        {
          left: screenX - baseSize,
          top: screenY - baseSize,
        },
      ]}
    >
      <Animated.View style={[animatedStyle, styles.starInner]}>
        <View
          style={[
            styles.starGlow,
            {
              width: baseSize * 4,
              height: baseSize * 4,
              borderRadius: baseSize * 2,
              backgroundColor: glowColor,
            },
          ]}
        />
        <View
          style={[
            styles.starCore,
            {
              width: baseSize,
              height: baseSize,
              borderRadius: baseSize / 2,
              backgroundColor: starColor,
            },
          ]}
        />
        <Text style={[styles.starEmoji, { fontSize: node.isSelf ? 24 : node.isNPC ? 20 : 14 }]}>
          {node.emoji}
        </Text>
      </Animated.View>

      {node.isNPC && (
        <View style={[styles.npcBadge, { backgroundColor: candy.coral[500] }]}>
          <Text style={styles.npcBadgeText}>NPC</Text>
        </View>
      )}

      {node.brandId && (
        <View style={[styles.brandDot, { backgroundColor: candy.lime[400] }]} />
      )}

      <Text
        style={[
          styles.starLabel,
          {
            color: node.isSelf ? candy.cyan[300] : node.isNPC ? candy.coral[300] : dark.text.secondary,
          },
        ]}
        numberOfLines={1}
      >
        {node.pseudonym}
      </Text>

      {node.matchScore !== undefined && node.matchScore > 0.3 && !node.isSelf && !node.isNPC && (
        <Text style={styles.matchScore}>{Math.round(node.matchScore * 100)}%</Text>
      )}
    </Pressable>
  )
}

function ConstellationLines({ layout }: { layout: ConstellationLayout }) {
  const selfNode = layout.nodes.find((n) => n.isSelf)
  if (!selfNode) return null

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group opacity={0.4}>
        {layout.edges.map((edge) => {
          const fromNode = layout.nodes.find((n) => n.id === edge.fromId)
          const toNode = layout.nodes.find((n) => n.id === edge.toId)
          if (!fromNode || !toNode) return null

          const fromX = CENTER_X + fromNode.x * LAYOUT_RADIUS
          const fromY = CENTER_Y + fromNode.y * LAYOUT_RADIUS
          const toX = CENTER_X + toNode.x * LAYOUT_RADIUS
          const toY = CENTER_Y + toNode.y * LAYOUT_RADIUS

          const lineColor =
            edge.type === 'match'
              ? candy.neonPink[400]
              : edge.type === 'npc_proximity'
              ? candy.coral[400]
              : candy.electricBlue[400]

          return (
            <Line
              key={`${edge.fromId}-${edge.toId}`}
              p1={vec(fromX, fromY)}
              p2={vec(toX, toY)}
              color={lineColor}
              strokeWidth={edge.strength * 3}
              style="stroke"
              opacity={edge.strength}
            />
          )
        })}
      </Group>
    </Canvas>
  )
}

function BackgroundStars() {
  const clock = useClock()

  const stars = useMemo(() => {
    const s: Array<{ x: number; y: number; r: number; speed: number }> = []
    for (let i = 0; i < 120; i++) {
      s.push({
        x: Math.random() * SCREEN_W,
        y: Math.random() * SCREEN_H,
        r: 0.5 + Math.random() * 1.5,
        speed: 0.5 + Math.random() * 2,
      })
    }
    return s
  }, [])

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group opacity={0.3}>
        {stars.map((star, i) => (
          <Circle key={i} cx={star.x} cy={star.y} r={star.r} color={candy.cyan[200]} />
        ))}
      </Group>
    </Canvas>
  )
}

export function PetConstellation({ layout, onNodePress, onSelfPress }: PetConstellationProps) {
  const handleNodePress = useCallback(
    (node: ConstellationNode) => {
      if (node.isSelf) {
        onSelfPress?.()
      } else {
        onNodePress?.(node)
      }
    },
    [onNodePress, onSelfPress]
  )

  const nearbyCount = layout.nodes.filter((n) => !n.isSelf).length
  const npcCount = layout.nodes.filter((n) => n.isNPC).length
  const matchCount = layout.edges.filter((e) => e.type === 'match').length

  return (
    <View style={styles.container}>
      <BackgroundStars />
      <ConstellationLines layout={layout} />

      {layout.nodes.map((node) => (
        <StarPoint key={node.id} node={node} onPress={handleNodePress} />
      ))}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: candy.cyan[400] }]} />
          <Text style={styles.legendText}>我的宠物</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: candy.coral[400] }]} />
          <Text style={styles.legendText}>NPC</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: candy.neonPink[400] }]} />
          <Text style={styles.legendText}>灵魂契合</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: candy.electricBlue[300] }]} />
          <Text style={styles.legendText}>附近</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          {nearbyCount} 个光点 · {npcCount} 个NPC · {matchCount} 条缘分线
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
    overflow: 'hidden',
  },
  starContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  starInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlow: {
    position: 'absolute',
    opacity: 0.35,
  },
  starCore: {
    position: 'absolute',
  },
  starEmoji: {
    zIndex: 3,
  },
  starLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    zIndex: 3,
  },
  npcBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 4,
  },
  npcBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '700',
  },
  brandDot: {
    position: 'absolute',
    top: -6,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 4,
  },
  matchScore: {
    fontSize: 8,
    color: candy.neonPink[300],
    fontWeight: '600',
    marginTop: 1,
  },
  legend: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: dark.text.tertiary,
  },
  stats: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  statsText: {
    fontSize: 12,
    color: dark.text.tertiary,
    fontWeight: '500',
  },
})
