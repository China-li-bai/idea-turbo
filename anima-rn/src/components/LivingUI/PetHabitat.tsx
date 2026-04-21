import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme, dark, candy } from '../../theme'
import { BreathingPet } from './BreathingPet'
import { ThinkingFlow } from './ThinkingFlow'
import { MemoryFragment } from './MemoryFragment'
import { CyberGlass } from './CyberGlass'
import type { PetMood, ActivityState } from './types'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface PetHabitatProps {
  petName?: string
  petSpecies?: string
  petEmoji?: string
  mood?: PetMood
  activity?: ActivityState
  isBrainActive?: boolean
  isThinking?: boolean
  memoryFragments?: Array<{
    id: string
    content: string
    type: 'episodic' | 'semantic' | 'emotion'
    timestamp: number
  }>
  thinkingTexts?: string[]
  onPetPress?: () => void
  onPetLongPress?: () => void
  onChatToggle?: () => void
  showChat?: boolean
}

export function PetHabitat({
  petName = 'Anima',
  petSpecies = 'cat',
  petEmoji = '🐱',
  mood = 'idle',
  activity = 'idle',
  isBrainActive = false,
  isThinking = false,
  memoryFragments = [],
  thinkingTexts = [],
  onPetPress,
  onPetLongPress,
  onChatToggle,
  showChat = false,
}: PetHabitatProps) {
  const insets = useSafeAreaInsets()
  
  const [ambientPhase, setAmbientPhase] = useState(0)
  const [showMemoryFragment, setShowMemoryFragment] = useState<string | null>(null)
  const breatheAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current
  const floatAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    )
    
    breatheLoop.start()

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    )
    
    glowLoop.start()

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    )
    
    floatLoop.start()

    return () => {
      breatheLoop.stop()
      glowLoop.stop()
      floatLoop.stop()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setAmbientPhase(prev => (prev + 1) % 360)
    }, 50)

    if (memoryFragments.length > 0 && !showMemoryFragment) {
      const randomFragment = memoryFragments[Math.floor(Math.random() * memoryFragments.length)]
      setShowMemoryFragment(randomFragment.id)
      setTimeout(() => setShowMemoryFragment(null), 3000)
    }

    return () => clearInterval(interval)
  }, [memoryFragments])

  const breatheTranslateY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  })

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  })

  const ambientRotate = `${ambientPhase}deg`
  const petColors = getPetColorScheme(petSpecies)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View
        style={[
          styles.ambientBackground,
          {
            transform: [{ rotate: ambientRotate }],
            opacity: glowOpacity,
          },
        ]}
      >
        <View style={[
          styles.ambientOrb1,
          { backgroundColor: petColors.primary + '15' },
        ]} />
        <View style={[
          styles.ambientOrb2,
          { backgroundColor: petColors.accent + '10' },
        ]} />
      </Animated.View>

      <View style={styles.headerArea}>
        <CyberGlass style={styles.headerGlass} intensity={0.1}>
          <View style={styles.headerContent}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot,
                {
                  backgroundColor: isBrainActive 
                    ? candy.lime[500] 
                    : isThinking 
                      ? candy.coral[400] 
                      : dark.text.tertiary,
                  shadowColor: isBrainActive ? candy.lime[500] : 'transparent',
                },
              ]} />
              <Text style={styles.statusText}>
                {isThinking ? '💭 思考中...' : isBrainActive ? '✨ 在线' : '😴 休眠中'}
              </Text>
            </View>
            
            <Text style={styles.petTitle}>{petName}</Text>
            
            <View style={styles.brainStatus}>
              <Text style={styles.brainIcon}>⚡</Text>
              <Text style={styles.brainText}>
                {isThinking ? 'Qwen-0.5B 正在本地推理...' : '端侧 AI 已就绪'}
              </Text>
            </View>
          </View>
        </CyberGlass>
      </View>

      <View style={styles.petStage}>
        <Animated.View
          style={[
            styles.petContainer,
            {
              transform: [
                { translateY: Animated.add(breatheTranslateY, floatTranslateY) },
              ],
            },
          ]}
        >
          <BreathingPet
            species={petSpecies}
            emoji={petEmoji}
            mood={mood}
            size={SCREEN_WIDTH * 0.5}
            isActive={isBrainActive}
            glowColor={petColors.glow}
            onPress={onPetPress}
            onLongPress={onPetLongPress}
          />
          
          {showMemoryFragment && (
            <MemoryFragment
              fragment={memoryFragments.find(f => f.id === showMemoryFragment)!}
              color={petColors.primary}
            />
          )}
        </Animated.View>

        <ThinkingFlow
          texts={thinkingTexts}
          isActive={isThinking || activity === 'streaming'}
          color={petColors.primary}
        />
      </View>

      <View style={styles.bottomArea}>
        {!showChat ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onChatToggle}
            style={[styles.chatTrigger, { borderColor: petColors.primary + '40' }]}
          >
            <CyberGlass style={styles.triggerGlass} intensity={0.2}>
              <Text style={[styles.triggerText, { color: petColors.primary }]}>
                ✨ 说点什么...
              </Text>
              <View style={[styles.triggerArrow, { backgroundColor: petColors.primary }]} />
            </CyberGlass>
          </TouchableOpacity>
        ) : (
          <View style={[styles.chatExpanded, { borderTopColor: petColors.primary + '30' }]}>
            <TouchableOpacity
              onPress={onChatToggle}
              style={styles.collapseButton}
            >
              <Text style={[styles.collapseText, { color: petColors.primary }]}>
                ▼ 收起聊天
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.memoryStatusBar}>
          <Text style={styles.memoryStatusText}>
            🧠 Mnemosyne · {memoryFragments.length} 个记忆碎片
          </Text>
          {isThinking && (
            <Animated.View style={{ opacity: glowOpacity }}>
              <Text style={styles.thinkingIndicator}>
                ⚡ 正在整理今日情绪...
              </Text>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  )
}

function getPetColorScheme(species: string) {
  const schemes: Record<string, any> = {
    cat: { primary: candy.neonPink[500], accent: candy.coral[400], glow: candy.neonPink.glow },
    dog: { primary: candy.coral[500], accent: candy.lime[400], glow: candy.coral.glow },
    bird: { primary: candy.electricBlue[500], accent: candy.cyan[400], glow: candy.electricBlue.glow },
    rabbit: { primary: candy.neonPink[400], accent: candy.coral[300], glow: candy.neonPink.glow },
    hamster: { primary: candy.lime[500], accent: candy.coral[400], glow: candy.lime.glow },
    fox: { primary: candy.coral[600], accent: candy.neonPink[400], glow: candy.coral.glow },
    axolotl: { primary: candy.lime[500], accent: candy.cyan[400], glow: candy.lime.glow },
  }
  return schemes[species] || schemes.cat
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
  },
  ambientBackground: {
    position: 'absolute',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT * 2,
    top: -SCREEN_HEIGHT / 2,
    left: -SCREEN_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientOrb1: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: SCREEN_WIDTH * 0.6,
    opacity: 0.4,
  },
  ambientOrb2: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    opacity: 0.3,
    top: -SCREEN_HEIGHT * 0.2,
  },
  headerArea: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  headerGlass: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  headerContent: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: dark.text.secondary,
    fontWeight: theme.typography.weights.medium,
  },
  petTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: dark.text.primary,
    letterSpacing: 1,
  },
  brainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  brainIcon: {
    fontSize: theme.typography.sizes.sm,
  },
  brainText: {
    fontSize: theme.typography.sizes.xs,
    color: candy.lime[400],
    fontWeight: theme.typography.weights.medium,
  },
  petStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxxxl,
  },
  petContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArea: {
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  chatTrigger: {
    borderRadius: theme.radius.xxl,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  triggerGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  triggerText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  triggerArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatExpanded: {
    borderTopWidth: 1,
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  collapseButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  collapseText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  memoryStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  memoryStatusText: {
    fontSize: theme.typography.sizes.xs,
    color: dark.text.tertiary,
  },
  thinkingIndicator: {
    fontSize: theme.typography.sizes.xs,
    color: candy.cyan[400],
  },
})
