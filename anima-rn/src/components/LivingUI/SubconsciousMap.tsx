import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { CyberGlass } from './CyberGlass'
import { triggerHaptic } from './HapticEngine'
import { theme, dark, candy } from '../../theme'
import type { PetMood } from './types'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export interface SubconsciousNode {
  id: string
  keyword: string
  type: 'topic' | 'emotion' | 'entity' | 'memory'
  weight: number
  x: number
  y: number
  color?: string
  connections: string[]
}

export interface SubconsciousEdge {
  from: string
  to: string
  strength: number
}

interface SubconsciousMapProps {
  nodes: SubconsciousNode[]
  edges: SubconsciousEdge[]
  activeNodeId?: string | null
  onNodePress?: (node: SubconsciousNode) => void
  onDismiss?: () => void
  petEmoji?: string
  mood?: PetMood
}

const NODE_TYPE_CONFIG = {
  topic: {
    icon: '📌',
    color: candy.cyan[400],
    glowColor: candy.cyan[500],
    baseRadius: 28,
  },
  emotion: {
    icon: '💭',
    color: candy.neonPink[400],
    glowColor: candy.neonPink[500],
    baseRadius: 24,
  },
  entity: {
    icon: '🏷️',
    color: candy.lime[400],
    glowColor: candy.lime[500],
    baseRadius: 22,
  },
  memory: {
    icon: '🧠',
    color: candy.violet[400],
    glowColor: candy.violet[500],
    baseRadius: 32,
  },
}

function MapNode({
  node,
  isActive,
  onPress,
}: {
  node: SubconsciousNode
  isActive: boolean
  onPress: () => void
}) {
  const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.topic
  const nodeColor = node.color || config.color
  const radius = config.baseRadius + node.weight * 8

  const nodeScale = useSharedValue(0)
  const glowPulse = useSharedValue(0)
  const activePulse = useSharedValue(0)

  useEffect(() => {
    nodeScale.value = withDelay(
      Math.random() * 400,
      withSpring(1, { damping: 10, stiffness: 150 })
    )

    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )

    if (isActive) {
      activePulse.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    }
  }, [isActive])

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: nodeScale.value * (isActive ? activePulse.value : 1) },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
    transform: [{ scale: 1 + glowPulse.value * 0.3 }],
  }))

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.nodeContainer,
        {
          left: node.x - radius,
          top: node.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
      ]}
    >
      <Animated.View style={[styles.nodeBody, nodeStyle]}>
        <Animated.View
          style={[
            styles.nodeGlow,
            {
              backgroundColor: nodeColor,
              width: radius * 2 + 16,
              height: radius * 2 + 16,
              borderRadius: radius + 8,
            },
            glowStyle,
          ]}
        />

        <View
          style={[
            styles.nodeCore,
            {
              backgroundColor: nodeColor + '20',
              borderColor: nodeColor + '60',
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
              borderWidth: isActive ? 2.5 : 1.5,
            },
          ]}
        >
          <Text style={styles.nodeIcon}>{config.icon}</Text>
          <Text
            style={[styles.nodeKeyword, { color: nodeColor }]}
            numberOfLines={2}
          >
            {node.keyword}
          </Text>
        </View>

        {isActive && (
          <View
            style={[
              styles.activeRing,
              {
                borderColor: nodeColor + '40',
                width: radius * 2 + 20,
                height: radius * 2 + 20,
                borderRadius: radius + 10,
              },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  )
}

function GlowEdge({
  fromNode,
  toNode,
  strength,
}: {
  fromNode: SubconsciousNode
  toNode: SubconsciousNode
  strength: number
}) {
  const opacity = useSharedValue(0)
  const pulse = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      300 + Math.random() * 300,
      withTiming(0.3 + strength * 0.4, { duration: 600 })
    )
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )
  }, [])

  const fromConfig = NODE_TYPE_CONFIG[fromNode.type] || NODE_TYPE_CONFIG.topic
  const edgeColor = fromNode.color || fromConfig.color

  const dx = toNode.x - fromNode.x
  const dy = toNode.y - fromNode.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  const edgeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * pulse.value,
  }))

  return (
    <Animated.View
      style={[
        styles.edgeLine,
        {
          left: fromNode.x,
          top: fromNode.y,
          width: length,
          height: 2 + strength * 2,
          backgroundColor: edgeColor,
          transform: [{ rotate: `${angle}deg` }],
          transformOrigin: [0, '50%'],
        },
        edgeStyle,
      ]}
      pointerEvents="none"
    />
  )
}

function CentralAxis({ mood }: { mood?: PetMood }) {
  const axisGlow = useSharedValue(0)
  const axisColor = mood === 'happy' ? candy.cyan[400]
    : mood === 'sad' ? candy.violet[500]
    : mood === 'excited' ? candy.neonPink[400]
    : candy.violet[400]

  useEffect(() => {
    axisGlow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )
  }, [])

  const axisStyle = useAnimatedStyle(() => ({
    opacity: axisGlow.value,
  }))

  return (
    <View style={styles.axisContainer} pointerEvents="none">
      <Animated.View
        style={[
          styles.axisLine,
          { backgroundColor: axisColor },
          axisStyle,
        ]}
      />
      <View style={[styles.axisDot, { backgroundColor: axisColor, top: SCREEN_HEIGHT * 0.15 }]} />
      <View style={[styles.axisDot, { backgroundColor: axisColor, top: SCREEN_HEIGHT * 0.5 }]} />
      <View style={[styles.axisDot, { backgroundColor: axisColor, top: SCREEN_HEIGHT * 0.85 }]} />
    </View>
  )
}

export function SubconsciousMap({
  nodes,
  edges,
  activeNodeId,
  onNodePress,
  onDismiss,
  petEmoji = '🐱',
  mood = 'curious',
}: SubconsciousMapProps) {
  const mapScale = useSharedValue(1)
  const mapTranslateX = useSharedValue(0)
  const mapTranslateY = useSharedValue(0)
  const savedScale = useSharedValue(1)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)
  const [selectedId, setSelectedId] = useState<string | null>(activeNodeId || null)

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      mapScale.value = savedScale.value * e.scale
    })
    .onEnd(() => {
      savedScale.value = mapScale.value
      if (mapScale.value < 0.5) {
        mapScale.value = withSpring(0.5, { damping: 15, stiffness: 150 })
        savedScale.value = 0.5
      } else if (mapScale.value > 3) {
        mapScale.value = withSpring(3, { damping: 15, stiffness: 150 })
        savedScale.value = 3
      }
    })

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      mapTranslateX.value = savedTranslateX.value + e.translationX
      mapTranslateY.value = savedTranslateY.value + e.translationY
    })
    .onEnd(() => {
      savedTranslateX.value = mapTranslateX.value
      savedTranslateY.value = mapTranslateY.value
    })

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture)

  const mapAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: mapTranslateX.value },
      { translateY: mapTranslateY.value },
      { scale: mapScale.value },
    ],
  }))

  const handleNodePress = useCallback((node: SubconsciousNode) => {
    setSelectedId(node.id)
    triggerHaptic('selection')
    onNodePress?.(node)
  }, [onNodePress])

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <CentralAxis mood={mood} />

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.mapCanvas, mapAnimatedStyle]}>
            {edges.map((edge, i) => {
              const fromNode = nodeMap.get(edge.from)
              const toNode = nodeMap.get(edge.to)
              if (!fromNode || !toNode) return null
              return (
                <GlowEdge
                  key={`edge-${i}`}
                  fromNode={fromNode}
                  toNode={toNode}
                  strength={edge.strength}
                />
              )
            })}

            {nodes.map((node) => (
              <MapNode
                key={node.id}
                node={node}
                isActive={node.id === selectedId}
                onPress={() => handleNodePress(node)}
              />
            ))}
          </Animated.View>
        </GestureDetector>

        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            style={styles.dismissButton}
          >
            <CyberGlass intensity={0.2} tint="dark">
              <View style={styles.dismissContent}>
                <Text style={styles.dismissIcon}>▼</Text>
                <Text style={styles.dismissText}>返回意识空间</Text>
              </View>
            </CyberGlass>
          </Pressable>
        )}

        <View style={styles.legendContainer}>
          <CyberGlass intensity={0.15} tint="dark">
            <View style={styles.legendContent}>
              {(Object.entries(NODE_TYPE_CONFIG) as Array<[keyof typeof NODE_TYPE_CONFIG, typeof NODE_TYPE_CONFIG.topic]>).map(([type, config]) => (
                <View key={type} style={styles.legendItem}>
                  <Text style={styles.legendIcon}>{config.icon}</Text>
                  <Text style={[styles.legendLabel, { color: config.color }]}>
                    {type === 'topic' ? '话题' : type === 'emotion' ? '情绪' : type === 'entity' ? '实体' : '记忆'}
                  </Text>
                </View>
              ))}
            </View>
          </CyberGlass>
        </View>

        <View style={styles.petObserver} pointerEvents="none">
          <Text style={styles.petObserverEmoji}>{petEmoji}</Text>
          <Text style={styles.petObserverHint}>正在观察思维...</Text>
        </View>
      </View>
    </GestureHandlerRootView>
  )
}

export function generateSubconsciousNodes(
  messages: Array<{ content: string; role: string }>,
  _mood?: PetMood
): { nodes: SubconsciousNode[]; edges: SubconsciousEdge[] } {
  const keywordMap = new Map<string, { count: number; type: SubconsciousNode['type']; related: Set<string> }>()
  const emotionKeywords: Record<string, string[]> = {
    happy: ['开心', '高兴', '快乐', '棒', '喜欢'],
    sad: ['难过', '伤心', '累', '压力', '烦'],
    angry: ['生气', '讨厌', '烦'],
    curious: ['好奇', '什么', '为什么', '怎么'],
    love: ['爱', '喜欢', '宝贝', '抱抱'],
  }

  for (const msg of messages) {
    const words = msg.content.split(/[\s,，。！？!?、]+/).filter(w => w.length >= 2)
    for (const word of words) {
      if (!keywordMap.has(word)) {
        let type: SubconsciousNode['type'] = 'topic'
        for (const [, kws] of Object.entries(emotionKeywords)) {
          if (kws.includes(word)) {
            type = 'emotion'
            break
          }
        }
        keywordMap.set(word, { count: 1, type, related: new Set() })
      } else {
        keywordMap.get(word)!.count++
      }
    }

    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < Math.min(words.length, i + 4); j++) {
        if (words[i] !== words[j] && keywordMap.has(words[i]) && keywordMap.has(words[j])) {
          keywordMap.get(words[i])!.related.add(words[j])
          keywordMap.get(words[j])!.related.add(words[i])
        }
      }
    }
  }

  const sortedKeywords = [...keywordMap.entries()]
    .filter(([, v]) => v.count >= 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)

  const centerX = SCREEN_WIDTH / 2
  const centerY = SCREEN_HEIGHT / 2
  const nodes: SubconsciousNode[] = []
  const keywordToId = new Map<string, string>()

  sortedKeywords.forEach(([keyword, data], index) => {
    const id = `node-${index}`
    keywordToId.set(keyword, id)

    const angle = (index / sortedKeywords.length) * Math.PI * 2
    const radiusBase = 80 + index * 18
    const jitter = (Math.random() - 0.5) * 40

    nodes.push({
      id,
      keyword,
      type: data.type,
      weight: Math.min(data.count / 3, 1),
      x: centerX + Math.cos(angle) * radiusBase + jitter,
      y: centerY + Math.sin(angle) * radiusBase * 0.7 + jitter,
      connections: [...data.related].filter(r => keywordToId.has(r)),
    })
  })

  const edges: SubconsciousEdge[] = []
  const edgeSet = new Set<string>()

  for (const node of nodes) {
    for (const relatedKeyword of node.connections) {
      const targetId = keywordToId.get(relatedKeyword)
      if (!targetId) continue

      const edgeKey = [node.id, targetId].sort().join('-')
      if (edgeSet.has(edgeKey)) continue
      edgeSet.add(edgeKey)

      edges.push({
        from: node.id,
        to: targetId,
        strength: 0.3 + Math.random() * 0.7,
      })
    }
  }

  return { nodes, edges }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
    overflow: 'hidden',
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  axisContainer: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 1,
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 1,
  },
  axisLine: {
    flex: 1,
    borderRadius: 1,
  },
  axisDot: {
    position: 'absolute',
    left: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  nodeContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  nodeBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeGlow: {
    position: 'absolute',
    opacity: 0.15,
  },
  nodeCore: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  nodeIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  nodeKeyword: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  activeRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 999,
  },
  edgeLine: {
    position: 'absolute',
    borderRadius: 1,
    transformOrigin: [0, '50%'],
  },
  dismissButton: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  dismissContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  dismissIcon: {
    fontSize: 12,
    color: dark.text.tertiary,
  },
  dismissText: {
    fontSize: 13,
    color: dark.text.secondary,
    fontWeight: theme.typography.weights.medium,
  },
  legendContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    zIndex: 20,
  },
  legendContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendIcon: {
    fontSize: 12,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.medium,
  },
  petObserver: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    alignItems: 'center',
    zIndex: 20,
  },
  petObserverEmoji: {
    fontSize: 32,
  },
  petObserverHint: {
    fontSize: 10,
    color: dark.text.tertiary,
    marginTop: 2,
  },
})
