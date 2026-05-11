import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  GestureDetector,
  GestureHandlerRootView,
  Gesture,
} from 'react-native-gesture-handler'

import { FluidBackground } from '../HomeScreen/FluidBackground'
import { ParticleField } from '../HomeScreen/ParticleField'
import { BreathingPet } from '../LivingUI/BreathingPet'
import { ThinkingFlow } from '../LivingUI/ThinkingFlow'
import { MemoryFragment } from '../LivingUI/MemoryFragment'
import { CyberGlass } from '../LivingUI/CyberGlass'
import {
  LivingUIProvider,
  usePetMood,
  usePetActivity,
  triggerHaptic,
  aiEmotionEngine,
  createEmotionIntegration,
} from '../LivingUI'
import { CinematicSubtitle, CinematicSubtitleStack, type CinematicSubtitleLine } from './CinematicSubtitle'
import { SensoryPill, type SensoryPillMode } from './SensoryPill'
import { useDeviceSensors, usePetPhysics } from '../../lib/DeviceSensors'
import { usePheromone } from '../../lib/PheromoneContext'
import { useDormancyController, getDormancyDimColor } from '../../lib/DormancyController'
import { theme, dark, candy } from '../../theme'
import type { PetMood, ActivityState } from '../LivingUI/types'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export interface SpatialHabitatProps {
  petName?: string
  petEmoji?: string
  brainActive?: boolean
  isThinking?: boolean
  messages?: Array<{
    id: string
    role: 'user' | 'pet' | 'system'
    content: string
  }>
  onSendMessage?: (text: string) => void
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onNavigateToMemories?: () => void
  onNavigateToSettings?: () => void
}

function SpatialHabitatInner({
  petName = 'Anima',
  petEmoji = '🐱',
  brainActive = false,
  isThinking = false,
  messages = [],
  onSendMessage,
  onVoiceStart,
  onVoiceEnd,
  onNavigateToMemories,
  onNavigateToSettings,
}: SpatialHabitatProps) {
  const insets = useSafeAreaInsets()
  const { currentMood, setMood } = usePetMood()
  const { activity, setActivity } = usePetActivity()
  const pheromone = usePheromone()
  const sensors = useDeviceSensors(brainActive)
  const petPhysics = usePetPhysics(sensors)

  const [interactionDetected, setInteractionDetected] = useState(false)
  const dormancy = useDormancyController(interactionDetected)

  const [subtitleLines, setSubtitleLines] = useState<CinematicSubtitleLine[]>([])
  const [sensoryMode, setSensoryMode] = useState<SensoryPillMode>('dormant')
  const [showMemorySidebar, setShowMemorySidebar] = useState(false)
  const [showSettingsHint, setShowSettingsHint] = useState(false)

  const petX = useSharedValue(SCREEN_WIDTH / 2)
  const petY = useSharedValue(SCREEN_HEIGHT * 0.38)
  const petTiltX = useSharedValue(0)
  const petTiltY = useSharedValue(0)
  const dimOverlayOpacity = useSharedValue(0)

  const lastInteractionRef = useRef(Date.now())

  useEffect(() => {
    dimOverlayOpacity.value = withTiming(dormancy.dimOverlay, { duration: 1000 })
  }, [dormancy.dimOverlay])

  useEffect(() => {
    petTiltX.value = withSpring(petPhysics.tiltX, { damping: 12, stiffness: 100 })
    petTiltY.value = withSpring(petPhysics.tiltY, { damping: 12, stiffness: 100 })

    if (petPhysics.shouldFall) {
      setMood('surprised')
      setTimeout(() => setMood('shy'), 1500)
    }
  }, [petPhysics.tiltX, petPhysics.tiltY, petPhysics.shouldFall])

  useEffect(() => {
    if (pheromone.shouldProactiveSpeak && pheromone.proactiveMessage) {
      const line: CinematicSubtitleLine = {
        id: `proactive-${Date.now()}`,
        text: pheromone.proactiveMessage,
        mood: 'sleepy',
        timestamp: Date.now(),
        role: 'pet',
      }
      setSubtitleLines(prev => [...prev, line])
      pheromone.clearProactive()
    }
  }, [pheromone.shouldProactiveSpeak, pheromone.proactiveMessage])

  useEffect(() => {
    if (messages.length === 0) return
    const latest = messages[messages.length - 1]
    const existingIds = new Set(subtitleLines.map(l => l.id))
    if (existingIds.has(latest.id)) return

    const line: CinematicSubtitleLine = {
      id: latest.id,
      text: latest.content,
      mood: currentMood,
      timestamp: Date.now(),
      role: latest.role as 'user' | 'pet' | 'system',
    }
    setSubtitleLines(prev => [...prev.slice(-4), line])
  }, [messages.length])

  useEffect(() => {
    if (brainActive) {
      setActivity('streaming')
      setMood('thinking')
    }
  }, [brainActive])

  useEffect(() => {
    if (isThinking) {
      setMood('thinking')
    }
  }, [isThinking])

  const markInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
    setInteractionDetected(true)
    setTimeout(() => setInteractionDetected(false), 100)
  }, [])

  const handlePetTap = useCallback(() => {
    markInteraction()
    setMood('love')
    triggerHaptic('petTap')
  }, [markInteraction, setMood])

  const handlePetDoubleTap = useCallback(() => {
    markInteraction()
    setMood('excited')
    triggerHaptic('heavy')
    setTimeout(() => setMood('happy'), 2000)
  }, [markInteraction, setMood])

  const handlePetLongPress = useCallback(() => {
    markInteraction()
    setMood('curious')
    triggerHaptic('medium')
  }, [markInteraction, setMood])

  const handleSwipeFromLeft = useCallback(() => {
    markInteraction()
    setShowMemorySidebar(true)
    triggerHaptic('light')
  }, [markInteraction])

  const handleSwipeFromRight = useCallback(() => {
    markInteraction()
    setShowSettingsHint(true)
    triggerHaptic('light')
    setTimeout(() => setShowSettingsHint(false), 2000)
  }, [markInteraction])

  const handleThrowObject = useCallback((velocityX: number, velocityY: number) => {
    markInteraction()
    setMood('excited')
    triggerHaptic('heavy')
    setTimeout(() => setMood('happy'), 2000)
  }, [markInteraction, setMood])

  const handleTextSubmit = useCallback((text: string) => {
    markInteraction()
    onSendMessage?.(text)
  }, [markInteraction, onSendMessage])

  const handleSubtitleDissolved = useCallback((id: string) => {
    setSubtitleLines(prev => prev.filter(l => l.id !== id))
  }, [])

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(handlePetTap)()
    })

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handlePetDoubleTap)()
    })

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(handlePetLongPress)()
    })

  const swipeLeftGesture = Gesture.Pan()
    .activeOffsetX([-30, -10])
    .failOffsetY([-50, 50])
    .onEnd((e) => {
      if (e.translationX > 80) {
        runOnJS(handleSwipeFromLeft)()
      }
    })

  const swipeRightGesture = Gesture.Pan()
    .activeOffsetX([10, 30])
    .failOffsetY([-50, 50])
    .onEnd((e) => {
      if (e.translationX < -80) {
        runOnJS(handleSwipeFromRight)()
      }
    })

  const throwGesture = Gesture.Pan()
    .activeOffsetY([-20, -20])
    .onEnd((e) => {
      if (e.translationY < -100 && Math.abs(e.translationX) > 50) {
        runOnJS(handleThrowObject)(e.velocityX, e.velocityY)
      }
    })

  const composedGesture = Gesture.Race(
    doubleTapGesture,
    tapGesture,
    longPressGesture,
    swipeLeftGesture,
    swipeRightGesture,
    throwGesture
  )

  const petAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: petTiltX.value },
      { translateY: petTiltY.value },
    ],
  }))

  const dimAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dimOverlayOpacity.value,
  }))

  const ambientIntensity = dormancy.particleMultiplier
  const timeSpeed = dormancy.animationSpeed

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Layer 0: Entity Layer - Full-screen habitat */}
      <View style={styles.layer0} pointerEvents="none">
        <FluidBackground
          mood={currentMood}
          intensity={ambientIntensity}
          timeSpeed={timeSpeed}
        />
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
      </View>

      {/* Layer 1: Spatial UI - Pet + Cinematic Subtitles */}
      <View style={styles.layer1}>
        <Animated.View style={[styles.petArea, petAnimatedStyle]}>
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
        </Animated.View>

        <CinematicSubtitleStack
          lines={subtitleLines}
          petPositionX={SCREEN_WIDTH / 2}
          petPositionY={SCREEN_HEIGHT * 0.32}
          maxVisible={2}
          onLineDissolved={handleSubtitleDissolved}
        />

        {dormancy.shouldShowSleepIndicator && (
          <View style={styles.sleepIndicator}>
            <CyberGlass style={styles.sleepGlass} intensity={0.08}>
              <View style={styles.sleepDot} />
            </CyberGlass>
          </View>
        )}
      </View>

      {/* Layer 2: Gesture Area - Invisible touch grid */}
      <View style={styles.layer2}>
        <GestureDetector gesture={composedGesture}>
          <View style={styles.gestureGrid} />
        </GestureDetector>
      </View>

      {/* Layer 3: HUD - Sensory Pill + Menu */}
      <View style={[styles.layer3, { paddingBottom: insets.bottom + 8 }]}>
        <SensoryPill
          mode={sensoryMode}
          onModeChange={setSensoryMode}
          onTextSubmit={handleTextSubmit}
          onVoiceStart={() => {
            markInteraction()
            onVoiceStart?.()
            setMood('listening')
          }}
          onVoiceEnd={() => {
            onVoiceEnd?.()
            setMood('thinking')
          }}
          petMood={currentMood}
          isBrainActive={brainActive}
        />

        {showSettingsHint && (
          <View style={styles.settingsHint}>
            <CyberGlass intensity={0.1}>
              <Pressable onPress={onNavigateToSettings} style={styles.settingsHintInner}>
                <Text style={styles.settingsHintText}>⚙️ 设置</Text>
              </Pressable>
            </CyberGlass>
          </View>
        )}
      </View>

      {/* Memory Sidebar (left edge swipe) */}
      {showMemorySidebar && (
        <Pressable
          style={styles.sidebarOverlay}
          onPress={() => setShowMemorySidebar(false)}
        >
          <View style={styles.sidebarPanel}>
            <CyberGlass style={styles.sidebarGlass} intensity={0.15}>
              <View style={styles.sidebarContent}>
                <Text style={styles.sidebarTitle}>记忆手账</Text>
                <Text style={styles.sidebarHint}>过往对话将以时间轴形式展示</Text>
                {onNavigateToMemories && (
                  <Pressable
                    onPress={() => {
                      setShowMemorySidebar(false)
                      onNavigateToMemories()
                    }}
                    style={styles.sidebarLink}
                  >
                    <Text style={styles.sidebarLinkText}>查看完整记忆 →</Text>
                  </Pressable>
                )}
              </View>
            </CyberGlass>
          </View>
        </Pressable>
      )}

      {/* Dormancy dim overlay */}
      <Animated.View
        style={[
          styles.dimOverlay,
          { backgroundColor: getDormancyDimColor(dormancy.level) },
          dimAnimatedStyle,
        ]}
        pointerEvents="none"
      />
    </View>
  )
}

export function SpatialHabitat(props: SpatialHabitatProps) {
  return (
    <LivingUIProvider>
      <SpatialHabitatInner {...props} />
    </LivingUIProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
  },
  layer0: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  layer1: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layer2: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  layer3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: 'center',
  },
  petArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureGrid: {
    flex: 1,
  },
  sleepIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  sleepGlass: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sleepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: candy.violet[300],
  },
  settingsHint: {
    position: 'absolute',
    top: -50,
    right: 20,
  },
  settingsHintInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  settingsHintText: {
    color: dark.text.secondary,
    fontSize: 14,
  },
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sidebarPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
  },
  sidebarGlass: {
    flex: 1,
    borderRadius: 0,
  },
  sidebarContent: {
    padding: 24,
    paddingTop: 80,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: dark.text.primary,
    marginBottom: 8,
  },
  sidebarHint: {
    fontSize: 13,
    color: dark.text.tertiary,
    marginBottom: 24,
  },
  sidebarLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sidebarLinkText: {
    color: candy.cyan[400],
    fontSize: 14,
    fontWeight: '500',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
})
