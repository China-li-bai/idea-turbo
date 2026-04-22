import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions, Modal } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { CyberGlass } from './CyberGlass'
import { theme, dark, candy } from '../../theme'
import type { PetMood } from './types'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export interface MemoryAnchorData {
  id: string
  content: string
  type: 'episodic' | 'semantic' | 'emotion'
  timestamp: number
  relatedKeywords: string[]
  mood?: PetMood
}

interface MemoryAnchorProps {
  anchor: MemoryAnchorData
  position: 'left' | 'right'
  sideOffset?: number
  onPress?: (anchor: MemoryAnchorData) => void
}

const TYPE_CONFIG = {
  episodic: {
    icon: '📖',
    color: candy.neonPink[400],
    glowColor: candy.neonPink[500],
  },
  semantic: {
    icon: '💡',
    color: candy.electricBlue[400],
    glowColor: candy.electricBlue[500],
  },
  emotion: {
    icon: '💭',
    color: candy.lime[400],
    glowColor: candy.lime[500],
  },
}

export function MemoryAnchor({
  anchor,
  position = 'left',
  sideOffset = 12,
  onPress,
}: MemoryAnchorProps) {
  const config = TYPE_CONFIG[anchor.type] || TYPE_CONFIG.episodic

  const glowOpacity = useSharedValue(0)
  const glowScale = useSharedValue(1)
  const dotScale = useSharedValue(1)
  const pulseScale = useSharedValue(0)

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(2.5, { duration: 2000 }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    )
  }, [])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }))

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 1 - pulseScale.value / 2.5,
  }))

  const isLeft = position === 'left'

  return (
    <Pressable
      onPress={() => onPress?.(anchor)}
      style={[
        styles.anchorContainer,
        {
          [isLeft ? 'left' : 'right']: sideOffset,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.glowRing,
          { borderColor: config.color },
          glowStyle,
        ]}
      />

      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: config.color },
          pulseStyle,
        ]}
      />

      <View style={[styles.dot, { backgroundColor: config.color }]}>
        <Text style={styles.dotIcon}>{config.icon}</Text>
      </View>

      <View
        style={[
          styles.connectorLine,
          {
            [isLeft ? 'right' : 'left']: 10,
            backgroundColor: config.color + '30',
          },
        ]}
      />
    </Pressable>
  )
}

interface MemoryAnchorDetailProps {
  anchor: MemoryAnchorData | null
  visible: boolean
  onClose: () => void
}

export function MemoryAnchorDetail({
  anchor,
  visible,
  onClose,
}: MemoryAnchorDetailProps) {
  if (!anchor || !visible) return null

  const config = TYPE_CONFIG[anchor.type] || TYPE_CONFIG.episodic

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.detailCard}>
          <CyberGlass intensity={0.2} tint="dark" glow={config.color}>
            <View style={styles.detailContent}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailIcon}>{config.icon}</Text>
                <View style={styles.detailMeta}>
                  <Text style={[styles.detailType, { color: config.color }]}>
                    {anchor.type === 'episodic' ? '事件记忆' : anchor.type === 'semantic' ? '知识记忆' : '情绪记忆'}
                  </Text>
                  <Text style={styles.detailTime}>
                    {getTimeAgo(anchor.timestamp)}
                  </Text>
                </View>
              </View>

              <Text style={styles.detailText}>{anchor.content}</Text>

              {anchor.relatedKeywords.length > 0 && (
                <View style={styles.keywordRow}>
                  {anchor.relatedKeywords.map((kw, i) => (
                    <View key={i} style={[styles.keywordTag, { borderColor: config.color + '40' }]}>
                      <Text style={[styles.keywordText, { color: config.color }]}>
                        #{kw}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {anchor.mood && (
                <Text style={styles.moodHint}>
                  当时的情绪：{anchor.mood}
                </Text>
              )}
            </View>
          </CyberGlass>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

interface MemoryAnchorSidebarProps {
  anchors: MemoryAnchorData[]
  onAnchorPress: (anchor: MemoryAnchorData) => void
}

export function MemoryAnchorSidebar({
  anchors,
  onAnchorPress,
}: MemoryAnchorSidebarProps) {
  const [selectedAnchor, setSelectedAnchor] = useState<MemoryAnchorData | null>(null)

  return (
    <View style={styles.sidebarContainer} pointerEvents="box-none">
      {anchors.map((anchor, index) => (
        <MemoryAnchor
          key={anchor.id}
          anchor={anchor}
          position={index % 2 === 0 ? 'left' : 'right'}
          sideOffset={8 + (index % 3) * 6}
          onPress={(a) => {
            setSelectedAnchor(a)
            onAnchorPress(a)
          }}
        />
      ))}

      <MemoryAnchorDetail
        anchor={selectedAnchor}
        visible={!!selectedAnchor}
        onClose={() => setSelectedAnchor(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  anchorContainer: {
    position: 'absolute',
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  glowRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  pulseRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  dotIcon: {
    fontSize: 6,
    lineHeight: undefined,
  },
  connectorLine: {
    position: 'absolute',
    top: 11,
    width: 20,
    height: 1,
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: {
    width: '80%',
    maxWidth: 320,
  },
  detailContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  detailIcon: {
    fontSize: 24,
  },
  detailMeta: {
    flex: 1,
  },
  detailType: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  detailTime: {
    fontSize: theme.typography.sizes.xs,
    color: dark.text.tertiary,
  },
  detailText: {
    fontSize: theme.typography.sizes.md,
    color: dark.text.primary,
    lineHeight: theme.typography.lineHeights.relaxed,
    marginBottom: theme.spacing.md,
  },
  keywordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  keywordTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  keywordText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  moodHint: {
    fontSize: theme.typography.sizes.xs,
    color: dark.text.tertiary,
    fontStyle: 'italic',
  },
})
