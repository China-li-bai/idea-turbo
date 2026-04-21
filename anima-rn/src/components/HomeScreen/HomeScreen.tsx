import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FluidBackground } from './FluidBackground'
import { ParticleField } from './ParticleField'
import { GestureLayer } from './GestureLayer'
import { BreathingPet } from '../LivingUI/BreathingPet'
import { ThinkingFlow } from '../LivingUI/ThinkingFlow'
import { MemoryFragment } from '../LivingUI/MemoryFragment'
import { CyberGlass, GlassCard } from '../LivingUI/CyberGlass'
import {
  LivingUIProvider,
  usePetMood,
  usePetActivity,
  triggerHaptic,
  aiEmotionEngine,
  createEmotionIntegration,
} from '../LivingUI'
import { theme, dark, candy } from '../../theme'
import type { PetMood, ActivityState } from '../../components/LivingUI'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface HomeScreenProps {
  onNavigateToChat?: () => void
  onNavigateToMap?: (scale: number) => void
  petName?: string
  petEmoji?: string
  brainActive?: boolean
  isThinking?: boolean
}

function HomeScreenInner({
  onNavigateToChat,
  onNavigateToMap,
  petName = 'Anima',
  petEmoji = '🐱',
  brainActive = false,
  isThinking = false,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets()
  
  const { currentMood, setMood } = usePetMood()
  const { activity, setActivity } = usePetActivity()

  const [memoryFragments] = useState([
    {
      id: 'mem-1',
      content: '主人今天心情不错',
      type: 'emotion' as const,
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'mem-2',
      content: '讨论了电影话题',
      type: 'episodic' as const,
      timestamp: Date.now() - 7200000,
    },
    {
      id: 'mem-3',
      content: '喜欢科幻类型',
      type: 'semantic' as const,
      timestamp: Date.now() - 86400000,
    },
  ])

  const emotionIntegration = useRef(createEmotionIntegration())

  const ambientIntensity = useSharedValue(1)
  const glassOpacity = useSharedValue(0)
  const statusTextOpacity = useSharedValue(1)

  useEffect(() => {
    if (brainActive) {
      setActivity('streaming')
      setMood('thinking')
    }
  }, [brainActive])

  useEffect(() => {
    if (isThinking) {
      statusTextOpacity.value = withTiming(1, { duration: 300 })
    } else {
      statusTextOpacity.value = withTiming(0.3, { duration: 1000 })
    }
  }, [isThinking])

  function handlePetTap() {
    setMood('love')
  }

  function handleSwipeUp() {
    if (onNavigateToChat) {
      onNavigateToChat()
    }
  }

  function handlePinchOut(scale: number) {
    if (onNavigateToMap) {
      onNavigateToMap(scale)
    }
  }

  function handleMoodChange(mood: PetMood) {
    setMood(mood)
    
    const intensityMap: Record<string, number> = {
      idle: 0.8,
      happy: 1.5,
      excited: 2.0,
      love: 2.2,
      thinking: 1.3,
      sad: 0.6,
      sleepy: 0.4,
      angry: 1.8,
    }

    const newIntensity = intensityMap[mood] || 1.0
    ambientIntensity.value = withSpring(newIntensity, {
      damping: 8,
      stiffness: 100,
    })
  }

  const animatedStatusStyle = useAnimatedStyle(() => ({
    opacity: statusTextOpacity.value,
  }))

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.vibeLayer}>
        <FluidBackground
          mood={currentMood}
          intensity={ambientIntensity.value}
          timeSpeed={currentMood === 'sleepy' ? 0.5 : currentMood === 'excited' ? 2.0 : 1.0}
        />
      </View>

      <View style={styles.soulLayer}>
        <ParticleField
          brainActivity={activity === 'streaming' ? 2.5 : activity === 'waiting' ? 1.8 : 1.0}
          particleCount={activity === 'streaming' ? 36 : 24}
          color={
            currentMood === 'love' ? candy.neonPink[400] :
            currentMood === 'happy' ? candy.cyan[400] :
            currentMood === 'excited' ? candy.coral[400] :
            candy.violet[400]
          }
        />

        <GestureLayer
          onPetTap={handlePetTap}
          onSwipeUp={handleSwipeUp}
          onPinchOut={handlePinchOut}
          onMoodChange={handleMoodChange}
        >
          <BreathingPet
            emoji={petEmoji}
            size={160}
            mood={currentMood}
          />

          <ThinkingFlow
            isActive={isThinking}
            texts={[
              '正在分析情绪标签...',
              '检索长期记忆...',
              '整合今日对话...',
              '更新性格模型...',
            ]}
            color={candy.cyan[400]}
          />
        </GestureLayer>

        {memoryFragments.length > 0 && (
          <View style={styles.memoryFragmentContainer}>
            <MemoryFragment
              fragment={memoryFragments[memoryFragments.length - 1]}
              color={candy.violet[400]}
            />
          </View>
        )}
      </View>

      <View style={[styles.glassLayer, { paddingTop: insets.top + 10 }]}>
        <GlassCard
          intensity={0.08}
          tint="dark"
          style={styles.statusCard}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.brainIndicator,
                {
                  backgroundColor: brainActive
                    ? candy.lime[400]
                    : dark.text.tertiary,
                },
              ]}
            />
            <Animated.Text
              style={[
                styles.statusText,
                { color: dark.text.secondary },
                animatedStatusStyle,
              ]}
            >
              {brainActive
                ? `⚡ Qwen-0.5B 正在本地整理今日情绪...`
                : `${petName} 正在待机中...`}
            </Animated.Text>
          </View>

          <View style={styles.moodRow}>
            <Text style={styles.petName}>{petName}</Text>
            <CyberGlass intensity={0.15} tint="neon" glow={candy.violet[400]}>
              <View style={styles.moodBadge}>
                <Text style={styles.moodText}>
                  {getMoodLabel(currentMood)}
                </Text>
              </View>
            </CyberGlass>
          </View>
        </GlassCard>

        <Pressable
          onPress={() => {
            triggerHaptic('light')
            if (onNavigateToChat) onNavigateToChat()
          }}
          style={({ pressed }) => [
            styles.chatTrigger,
            {
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <CyberGlass intensity={0.2} tint="dark">
            <View style={styles.chatTriggerContent}>
              <Text style={styles.chatTriggerText}>说点什么</Text>
              <Text style={styles.chatTriggerHint}>↑ 上滑进入对话</Text>
            </View>
          </CyberGlass>
        </Pressable>
      </View>
    </View>
  )
}

function getMoodLabel(mood: PetMood): string {
  const labels: Record<PetMood, string> = {
    idle: '发呆中',
    thinking: '思考中',
    typing: '打字中',
    sniffing: '闻气味',
    listening: '倾听中',
    happy: '开心',
    excited: '兴奋',
    sad: '难过',
    angry: '生气',
    sleepy: '困了',
    curious: '好奇',
    love: '喜欢',
    surprised: '惊讶',
    shy: '害羞',
  }
  return labels[mood] || '未知'
}

export function HomeScreen(props: HomeScreenProps) {
  return (
    <LivingUIProvider>
      <HomeScreenInner {...props} />
    </LivingUIProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
  },
  vibeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  soulLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  statusCard: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  brainIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  petName: {
    fontSize: 18,
    fontWeight: '700',
    color: dark.text.primary,
  },
  moodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
    color: candy.violet[400],
  },
  memoryFragmentContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25,
    right: 20,
  },
  chatTrigger: {
    marginTop: 8,
  },
  chatTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  chatTriggerText: {
    fontSize: 15,
    fontWeight: '600',
    color: dark.text.primary,
  },
  chatTriggerHint: {
    fontSize: 11,
    color: dark.text.tertiary,
  },
})

export default HomeScreen
