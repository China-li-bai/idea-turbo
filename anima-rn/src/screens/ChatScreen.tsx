import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, StatusBar } from 'react-native'
import { useAppStore } from '../store'
import { animaCore } from '../lib/AnimaCore'
import { PetFluidChat } from '../components/FluidChat'
import { ProgressLoader, InputBar } from '../components'
import {
  RivePetAvatar,
  LivingUIProvider,
  usePetMood,
  usePetActivity,
  triggerHaptic,
  detectMoodFromText,
  aiEmotionEngine,
  createEmotionIntegration,
} from '../components/LivingUI'
import { theme, petTheme, dark } from '../theme'
import type { ActivityState, PetMood } from '../components/LivingUI'

type InitPhase = 'idle' | 'downloading' | 'extracting' | 'loading' | 'memory' | 'ready' | 'error'

function ChatScreenInner() {
  const {
    messages,
    addMessage,
    setThinking,
    isPetThinking,
    currentPet,
    setCurrentPet,
    systemStatus,
    setSystemStatus,
    isCoreInitialized,
    setCoreInitialized,
    setLoading,
    activeStreamId,
    setActiveStreamId,
  } = useAppStore()

  const { currentMood, setMood, detectMood } = usePetMood()
  const { activity, setActivity } = usePetActivity()

  const [inputText, setInputText] = useState('')
  const [initError, setInitError] = useState<string | null>(null)
  const [initPhase, setInitPhase] = useState<InitPhase>('idle')
  const [loadProgress, setLoadProgress] = useState(0)

  const emotionIntegration = useRef(createEmotionIntegration())
  const streamSubscriptionRef = useRef<(() => void) | null>(null)
  const transitionSubscriptionRef = useRef<(() => void) | null>(null)

  const petColors = currentPet ? (petTheme[currentPet.species] || petTheme.cat) : petTheme.cat

  useEffect(() => {
    if (!currentPet) {
      setCurrentPet({
        id: 'test-1',
        name: '小团子',
        species: 'cat',
        personality: ['proud', 'gentle', 'foodie'],
        avatarEmoji: '🐱',
        backstory: '',
        systemPrompt: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }, [])

  useEffect(() => {
    if (currentPet && initPhase === 'idle') {
      handleAutoInit()
    }
  }, [currentPet])

  useEffect(() => {
    const unsubscribe = emotionIntegration.current.subscribeToMoodChanges((mood: PetMood) => {
      if (mood !== currentMood) {
        setMood(mood)
      }
    })

    const unsubTransition = emotionIntegration.current.onMoodTransition((transition) => {
      console.log(`[LivingUI] Mood transition: ${transition.from} → ${transition.to} (${transition.duration}ms)`)
    })

    streamSubscriptionRef.current = unsubscribe
    transitionSubscriptionRef.current = unsubTransition

    return () => {
      unsubscribe()
      unsubTransition()
    }
  }, [])

  useEffect(() => {
    if (activeStreamId) {
      setActivity('streaming')
      setMood('typing')
    } else if (isPetThinking) {
      setActivity('waiting')
      setMood('listening')
    } else {
      setActivity('idle')
      if (messages.length > 0) {
        setMood('happy')
      }
    }
  }, [activeStreamId, isPetThinking])

  const handleAutoInit = useCallback(async () => {
    setInitError(null)
    setInitPhase('downloading')
    setLoadProgress(5)
    setLoading(true)
    setMood('thinking')

    try {
      const status = await animaCore.init(undefined, (progress, phase) => {
        setLoadProgress(Math.round(progress * 100))
        if (phase === 'extracting') setInitPhase('extracting')
        if (phase === 'model') setInitPhase('loading')
        if (phase === 'memory') setInitPhase('memory')
      })
      setInitPhase('ready')
      setLoadProgress(100)
      setSystemStatus(status)
      setCoreInitialized(true)
      setMood('excited')
      setTimeout(() => {
        setInitPhase('ready')
        setMood('happy')
      }, 500)
    } catch (e: any) {
      setInitPhase('error')
      setInitError(e.message || '初始化失败')
      setMood('sad')
      console.error('[ChatScreen] Auto-init error:', e)
    } finally {
      setLoading(false)
    }
  }, [currentPet])

  const handleStreamComplete = useCallback((messageId: string, fullText: string) => {
    addMessage({
      id: messageId,
      conversationId: 'test-conv',
      role: 'pet',
      content: fullText,
      createdAt: new Date().toISOString(),
    })
    setActiveStreamId(null)
    setThinking(false)

    emotionIntegration.current.onPetReply(fullText)

    const detectedMood = detectMoodFromText(fullText)
    if (detectedMood !== 'idle') {
      setMood(detectedMood)
    }

    const stats = emotionIntegration.current.getStatistics()
    console.log(`[LivingUI] Emotion stats: ${stats.totalEvents} events, dominant: ${stats.dominantMood}`)
  }, [addMessage, setActiveStreamId, setThinking, setMood, detectMood])

  async function handleSend() {
    if (!inputText.trim() || !currentPet || !isCoreInitialized) return

    const userMsg = inputText.trim()
    setInputText('')

    emotionIntegration.current.onUserMessage(userMsg)

    await triggerHaptic('messageSend')

    addMessage({
      id: `msg-${Date.now()}`,
      conversationId: 'test-conv',
      role: 'user',
      content: userMsg,
      createdAt: new Date().toISOString(),
    })

    const streamId = `pet-${Date.now()}`
    setActiveStreamId(streamId)
    setThinking(true, ['👂 接收消息...'])
    setMood('sniffing')

    try {
      const result = await animaCore.chatStream(currentPet, userMsg, streamId, 'test-conv', 'owner')

      if (result.piBlocked) {
        addMessage({
          id: `msg-${Date.now()}-pi`,
          conversationId: 'test-conv',
          role: 'system',
          content: `${result.piWarning || '安全拦截'}`,
          createdAt: new Date().toISOString(),
        })
        setMood('angry')
        emotionIntegration.current.engine.analyzePetReply(result.piWarning || '安全拦截')
      }

      if (result.newMemories && (result.newMemories.episodic > 0 || result.newMemories.semantic > 0)) {
        console.log(`[ChatScreen] 新记忆: +${result.newMemories.episodic}事件, +${result.newMemories.semantic}事实`)
        const updatedStatus = animaCore.getSystemStatus()
        setSystemStatus(updatedStatus)
      }

      if (activeStreamId === streamId) {
        setActiveStreamId(null)
        setThinking(false)

        const finalStreamMood = emotionIntegration.current.onStreamComplete()
        if (finalStreamMood && finalStreamMood !== 'idle') {
          setMood(finalStreamMood)
        }
      }
    } catch (e: any) {
      console.error('[ChatScreen] Send error:', e)
      if (activeStreamId === streamId) {
        setActiveStreamId(null)
        setThinking(false)
      }
      setMood('shy')
      emotionIntegration.current.engine.analyzePetReply('（歪头）嗯...让我想想怎么说...')
      addMessage({
        id: `msg-${Date.now() + 1}`,
        conversationId: 'test-conv',
        role: 'pet',
        content: '（歪头）嗯...让我想想怎么说...',
        createdAt: new Date().toISOString(),
      })
    }
  }

  const brainReady = isCoreInitialized && systemStatus?.brain.isLoaded
  const isLoading = initPhase !== 'idle' && initPhase !== 'ready' && initPhase !== 'error'

  const listHeader = (() => {
    if (isLoading) {
      return (
        <ProgressLoader
          phase={initPhase}
          progress={loadProgress}
          petEmoji={currentPet?.avatarEmoji}
          species={currentPet?.species}
        />
      )
    }

    if (initPhase === 'error') {
      return (
        <ProgressLoader
          phase="error"
          progress={0}
          petEmoji={currentPet?.avatarEmoji}
          species={currentPet?.species}
          errorMessage={initError || '初始化失败，请检查网络后重试'}
          onRetry={handleAutoInit}
        />
      )
    }

    if (!isCoreInitialized && !initError) {
      return (
        <View style={styles.loadingState}>
          <RivePetAvatar
            species={currentPet?.species}
            size={88}
            mood="sleepy"
            showGlow={false}
          />
          <Text style={styles.loadingText}>正在唤醒宠物...</Text>
        </View>
      )
    }

    if (messages.length === 0 && !activeStreamId) {
      return (
        <View style={styles.emptyState}>
          <RivePetAvatar
            species={currentPet?.species}
            size={96}
            mood="curious"
            showGlow={brainReady}
          />
          <Text style={[styles.emptyTitle, { color: petColors.primary }]}>
            和 {currentPet?.name} 聊天吧
          </Text>
          <Text style={styles.emptySubtitle}>
            你的 AI 宠物伙伴正在等你~
          </Text>
          <View style={[styles.emptyHint, { backgroundColor: dark.bg.elevated, borderColor: petColors.primary + '30' }]}>
            <Text style={[styles.emptyHintText, { color: petColors.primary }]}>
              💡 试着说："今天好累" 或 "我喜欢看电影"
            </Text>
          </View>
        </View>
      )
    }

    return null
  })()

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={dark.bg.headerBg} />

      <View style={[styles.header, { borderBottomColor: dark.border.default }]}>
        <View style={styles.headerLeft}>
          <RivePetAvatar
            species={currentPet?.species}
            size={48}
            mood={currentMood}
            activity={activity}
            isActive={brainReady}
            showPulse={isPetThinking}
            showGlow={brainReady}
            emoji={currentPet?.avatarEmoji}
            onPress={() => {
              setMood('love')
              triggerHaptic('petTap')
            }}
          />
          <View style={styles.headerInfo}>
            <Text style={[styles.petName, { color: dark.text.primary }]}>
              {currentPet?.name || 'Anima'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                {
                  backgroundColor: brainReady
                    ? petColors.accent
                    : isLoading
                      ? theme.colors.warm[400]
                      : dark.text.tertiary,
                },
              ]} />
              <Text style={[styles.brainStatus, { color: dark.text.secondary }]}>
                {!isCoreInitialized
                  ? isLoading ? '正在准备...' : '等待初始化'
                  : brainReady
                    ? '在线中 🟢'
                    : '加载中...'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {systemStatus?.embedding.isOnnx && (
            <View style={[styles.badge, { backgroundColor: petColors.primary + '25', borderColor: petColors.primary + '40' }]}>
              <Text style={[styles.badgeText, { color: petColors.primary }]}>
                ⚡ 本地 AI
              </Text>
            </View>
          )}
        </View>
      </View>

      <PetFluidChat
        messages={messages}
        activeStreamId={activeStreamId}
        petEmoji={currentPet?.avatarEmoji}
        species={currentPet?.species}
        onStreamComplete={handleStreamComplete}
        ListHeaderComponent={listHeader}
      />

      <InputBar
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        placeholder={brainReady ? '说点什么...' : isLoading ? '正在准备 AI 系统...' : '请稍候...'}
        editable={brainReady && !isLoading && !activeStreamId}
        species={currentPet?.species}
      />
    </View>
  )
}

export function ChatScreen() {
  return (
    <LivingUIProvider>
      <ChatScreenInner />
    </LivingUIProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: dark.bg.headerBg,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerInfo: {
    gap: 3,
  },
  petName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  brainStatus: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxxl,
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: dark.text.secondary,
    fontWeight: theme.typography.weights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxxl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: dark.text.tertiary,
    fontWeight: theme.typography.weights.medium,
  },
  emptyHint: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
  },
  emptyHintText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
})
