import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, StatusBar, Dimensions, Pressable } from 'react-native'
import { useAppStore } from '../store'
import { animaCore } from '../lib/AnimaCore'
import { ProgressLoader } from '../components'
import {
  LivingUIProvider,
  PetTransitionProvider,
  usePetTransition,
  SharedPet,
  usePetMood,
  usePetActivity,
  triggerHaptic,
  detectMoodFromText,
  createEmotionIntegration,
  ImmersionPortal,
  ImmersionChat,
  AmbientBubbleManager,
  MemoryAnchorSidebar,
  CyberGlass,
  GlassCard,
  SubconsciousMap,
  generateSubconsciousNodes,
  DevourAnimation,
  useDevourAnimation,
} from '../components/LivingUI'
import type { SubconsciousNode, SubconsciousEdge } from '../components/LivingUI/SubconsciousMap'
import { FluidBackground } from '../components/HomeScreen/FluidBackground'
import { ParticleField } from '../components/HomeScreen/ParticleField'
import { petTheme, dark, candy } from '../theme'
import type { PetMood, MemoryAnchorData } from '../components/LivingUI'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export type InitPhase = 'idle' | 'downloading' | 'extracting' | 'loading' | 'memory' | 'ready' | 'error'

interface AmbientBubbleData {
  id: string
  text: string
  mood?: PetMood
}

function LivingChatScreenInner() {
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

  const { currentMood, setMood } = usePetMood()
  const { activity, setActivity } = usePetActivity()
  const { transitionTo, setPetMood, setPetActivity } = usePetTransition()

  const [inputText, setInputText] = useState('')
  const [initError, setInitError] = useState<string | null>(null)
  const [initPhase, setInitPhase] = useState<InitPhase>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [immersionActive, setImmersionActive] = useState(false)
  const [ambientBubbles, setAmbientBubbles] = useState<AmbientBubbleData[]>([])
  const [mapModeActive, setMapModeActive] = useState(false)
  const [mapNodes, setMapNodes] = useState<SubconsciousNode[]>([])
  const [mapEdges, setMapEdges] = useState<SubconsciousEdge[]>([])
  const { devouring, devourTarget, triggerDevour, finishDevour } = useDevourAnimation()
  const [memoryAnchors] = useState<MemoryAnchorData[]>([
    {
      id: 'anchor-1',
      content: '主人今天心情不错，聊了工作上的事',
      type: 'episodic',
      timestamp: Date.now() - 3600000,
      relatedKeywords: ['工作', '心情'],
      mood: 'happy',
    },
    {
      id: 'anchor-2',
      content: '喜欢科幻电影，特别是星际穿越',
      type: 'semantic',
      timestamp: Date.now() - 86400000,
      relatedKeywords: ['科幻', '电影'],
    },
    {
      id: 'anchor-3',
      content: '深夜时常感到孤独',
      type: 'emotion',
      timestamp: Date.now() - 172800000,
      relatedKeywords: ['深夜', '孤独'],
      mood: 'sad',
    },
  ])

  const emotionIntegration = useRef(createEmotionIntegration())

  useEffect(() => {
    if (!activeStreamId) return
    return () => {}
  }, [activeStreamId])

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
    if (activeStreamId) {
      setActivity('streaming')
      setMood('typing')
      setPetMood('typing')
      setPetActivity('streaming')
    } else if (isPetThinking) {
      setActivity('waiting')
      setMood('listening')
      setPetMood('listening')
      setPetActivity('waiting')
    } else {
      setActivity('idle')
      setPetActivity('idle')
      if (messages.length > 0) {
        setMood('happy')
        setPetMood('happy')
      }
    }
  }, [activeStreamId, isPetThinking])

  useEffect(() => {
    const unsubscribe = emotionIntegration.current.subscribeToMoodChanges((mood: PetMood) => {
      if (mood !== currentMood) {
        setMood(mood)
        setPetMood(mood)
      }
    })
    return () => unsubscribe()
  }, [])

  const enterImmersion = useCallback(() => {
    triggerHaptic('medium')
    transitionTo('chat')
    setImmersionActive(true)
    setMapModeActive(false)
  }, [transitionTo])

  const exitImmersion = useCallback(() => {
    triggerHaptic('light')
    transitionTo('home')
    setImmersionActive(false)
    setMapModeActive(false)
  }, [transitionTo])

  const enterMapMode = useCallback(() => {
    if (messages.length < 6) return
    triggerHaptic('heavy')
    const { nodes, edges } = generateSubconsciousNodes(
      messages.map(m => ({ content: m.content, role: m.role })),
      currentMood
    )
    setMapNodes(nodes)
    setMapEdges(edges)
    setMapModeActive(true)
  }, [messages, currentMood])

  const exitMapMode = useCallback(() => {
    triggerHaptic('light')
    setMapModeActive(false)
  }, [])

  const handleDeleteMessage = useCallback((messageId: string) => {
    const msg = messages.find(m => m.id === messageId)
    if (!msg || msg.role !== 'pet') return
    triggerDevour(SCREEN_WIDTH * 0.3, SCREEN_HEIGHT * 0.5, candy.cyan[400])
  }, [messages, triggerDevour])

  const handleAutoInit = useCallback(async () => {
    setInitError(null)
    setInitPhase('downloading')
    setLoadProgress(5)
    setLoading(true)
    setMood('thinking')
    setPetMood('thinking')

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
      setPetMood('excited')

      setTimeout(() => {
        setInitPhase('ready')
        setMood('happy')
        setPetMood('happy')
      }, 500)
    } catch (e: any) {
      setInitPhase('error')
      setInitError(e.message || '初始化失败')
      setMood('sad')
      setPetMood('sad')
      console.error('[ChatScreen] Auto-init error:', e)
    } finally {
      setLoading(false)
    }
  }, [currentPet])

  async function handleSendText(userMsg: string) {
    if (!userMsg.trim() || !currentPet) {
      console.log('[ChatScreen] handleSendText 拒绝: 空消息或无宠物')
      return
    }

    const trimmedMsg = userMsg.trim()
    setInputText('')
    console.log('[ChatScreen] handleSendText:', trimmedMsg.substring(0, 30))

    emotionIntegration.current.onUserMessage(trimmedMsg)
    await triggerHaptic('messageSend')

    const userMsgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    addMessage({
      id: userMsgId,
      conversationId: 'test-conv',
      role: 'user',
      content: trimmedMsg,
      createdAt: new Date().toISOString(),
    })
    console.log('[ChatScreen] 用户消息已添加, id:', userMsgId)

    if (!isCoreInitialized) {
      const statusMsg = initPhase === 'error'
        ? `⚠️ ${initError || 'AI系统初始化失败，请返回首页重试'}`
        : initPhase === 'idle'
          ? '🔄 AI系统正在启动中，马上就好...'
          : `🔄 AI系统正在${initPhase === 'downloading' ? '下载模型' : initPhase === 'extracting' ? '解压资源' : initPhase === 'loading' ? '加载引擎' : '准备记忆系统'}...`
      addMessage({
        id: `msg-${Date.now()}-status`,
        conversationId: 'test-conv',
        role: 'system',
        content: statusMsg,
        createdAt: new Date().toISOString(),
      })
      return
    }

    const streamId = `pet-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    setActiveStreamId(streamId)
    setThinking(true, ['👂 接收消息...'])
    setMood('sniffing')
    setPetMood('sniffing')
    console.log('[ChatScreen] 开始流式请求, streamId:', streamId)

    try {
      const result = await animaCore.chatStream(currentPet, trimmedMsg, streamId, 'test-conv', 'owner')
      console.log('[ChatScreen] 流式请求完成, result:', JSON.stringify(result).slice(0, 200))

      if (result.piBlocked) {
        addMessage({
          id: `msg-${Date.now()}-pi`,
          conversationId: 'test-conv',
          role: 'system',
          content: `${result.piWarning || '安全拦截'}`,
          createdAt: new Date().toISOString(),
        })
        setMood('angry')
        setPetMood('angry')
      }

      if (result.newMemories && (result.newMemories.episodic > 0 || result.newMemories.semantic > 0)) {
        console.log(`[ChatScreen] 新记忆: +${result.newMemories.episodic}事件, +${result.newMemories.semantic}事实`)
        const updatedStatus = animaCore.getSystemStatus()
        setSystemStatus(updatedStatus)
      }

      if (result.reply && !result.piBlocked) {
        addMessage({
          id: streamId,
          conversationId: 'test-conv',
          role: 'pet',
          content: result.reply,
          createdAt: new Date().toISOString(),
        })
        console.log('[ChatScreen] 宠物回复已添加, id:', streamId, 'content:', result.reply.slice(0, 50))
      }

      console.log('[ChatScreen] 流式完成，重置状态')
      setActiveStreamId(null)
      setThinking(false)

      const finalStreamMood = emotionIntegration.current.onStreamComplete()
      if (finalStreamMood && finalStreamMood !== 'idle') {
        setMood(finalStreamMood)
        setPetMood(finalStreamMood)
      }
    } catch (e: any) {
      console.error('[ChatScreen] Send error:', e)
      setActiveStreamId(null)
      setThinking(false)
      setMood('shy')
      setPetMood('shy')
      addMessage({
        id: `msg-${Date.now() + 1}`,
        conversationId: 'test-conv',
        role: 'pet',
        content: '（歪头）嗯...让我想想怎么说...',
        createdAt: new Date().toISOString(),
      })
    }
  }

  function handleImmersionSend(text: string) {
    console.log('[ChatScreen] handleImmersionSend 收到文本:', text.substring(0, 30))
    handleSendText(text)
  }

  function addAmbientBubble(text: string, mood?: PetMood) {
    const id = `bubble-${Date.now()}`
    setAmbientBubbles(prev => [...prev, { id, text, mood }])
  }

  function removeAmbientBubble(id: string) {
    setAmbientBubbles(prev => prev.filter(b => b.id !== id))
  }

  const brainReady = isCoreInitialized && systemStatus?.brain.isLoaded
  const isLoading = initPhase !== 'idle' && initPhase !== 'ready' && initPhase !== 'error'

  const immersionMessages = messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'pet' | 'system',
    content: m.content,
    timestamp: new Date(m.createdAt).getTime(),
    mood: m.role === 'pet' ? currentMood : undefined,
  }))

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={dark.bg.primary} translucent />

      {!immersionActive && (
        <View style={styles.vibeLayer}>
          <FluidBackground
            mood={currentMood}
            intensity={1}
            timeSpeed={currentMood === 'sleepy' ? 0.5 : currentMood === 'excited' ? 2.0 : 1.0}
          />
        </View>
      )}

      {!immersionActive && (
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
        </View>
      )}

      <SharedPet
        emoji={currentPet?.avatarEmoji || '🐱'}
        species={currentPet?.species || 'cat'}
        baseSize={immersionActive ? 100 : 160}
        onPetPress={() => {
          setMood('love')
          setPetMood('love')
          triggerHaptic('petTap')
          addAmbientBubble('喵~ 主人摸摸我~', 'love')
        }}
        onPetLongPress={() => {
          setMood('surprised')
          setPetMood('surprised')
          triggerHaptic('heavy')
        }}
      />

      <AmbientBubbleManager
        bubbles={ambientBubbles}
        onBubbleDisappear={removeAmbientBubble}
      />

      {!immersionActive && (
        <View style={styles.glassLayer}>
          <GlassCard intensity={0.08} tint="dark" style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.brainIndicator,
                  {
                    backgroundColor: brainReady
                      ? candy.lime[400]
                      : dark.text.tertiary,
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: dark.text.secondary }]}>
                {brainReady
                  ? `⚡ Qwen-0.5B 正在本地整理今日情绪...`
                  : `${currentPet?.name || 'Anima'} 正在待机中...`}
              </Text>
            </View>

            <View style={styles.moodRow}>
              <Text style={styles.petName}>{currentPet?.name || 'Anima'}</Text>
              <CyberGlass intensity={0.15} tint="neon" glow={candy.violet[400]}>
                <View style={styles.moodBadge}>
                  <Text style={styles.moodText}>{getMoodLabel(currentMood)}</Text>
                </View>
              </CyberGlass>
            </View>
          </GlassCard>

          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ProgressLoader
                phase={initPhase}
                progress={loadProgress}
                petEmoji={currentPet?.avatarEmoji}
                species={currentPet?.species}
              />
            </View>
          )}

          {initPhase === 'error' && !isLoading && (
            <View style={styles.errorOverlay}>
              <ProgressLoader
                phase="error"
                progress={0}
                petEmoji={currentPet?.avatarEmoji}
                species={currentPet?.species}
                errorMessage={initError || '初始化失败，请检查网络后重试'}
                onRetry={handleAutoInit}
              />
            </View>
          )}

          <Pressable
            onPress={() => {
              triggerHaptic('light')
              enterImmersion()
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
                <Text style={styles.chatTriggerHint}>↑ 上滑进入意识空间</Text>
              </View>
            </CyberGlass>
          </Pressable>

          <View style={styles.memoryStatusBar}>
            <Text style={styles.memoryStatusText}>
              🧠 Mnemosyne · {memoryAnchors.length} 个记忆碎片
            </Text>
          </View>
        </View>
      )}

      <ImmersionPortal isActive={immersionActive && !mapModeActive}>
        <ImmersionChat
          messages={immersionMessages}
          onSend={handleImmersionSend}
          onDismiss={exitImmersion}
          inputPlaceholder={brainReady ? '向它倾诉...' : '正在准备 AI 系统...'}
          editable={brainReady && !isLoading && !activeStreamId}
          initPhase={initPhase}
          loadProgress={loadProgress}
          initError={initError}
          onRetryInit={handleAutoInit}
        />

        {immersionActive && !mapModeActive && messages.length >= 6 && (
          <Pressable
            onPress={enterMapMode}
            style={styles.mapTrigger}
          >
            <CyberGlass intensity={0.15} tint="dark">
              <View style={styles.mapTriggerContent}>
                <Text style={styles.mapTriggerIcon}>🧠</Text>
                <Text style={styles.mapTriggerText}>思维导图</Text>
              </View>
            </CyberGlass>
          </Pressable>
        )}

        {immersionActive && memoryAnchors.length > 0 && (
          <MemoryAnchorSidebar
            anchors={memoryAnchors}
            onAnchorPress={(anchor) => {
              triggerHaptic('selection')
              console.log('[MemoryAnchor] Tapped:', anchor.content)
            }}
          />
        )}
      </ImmersionPortal>

      {mapModeActive && immersionActive && (
        <View style={styles.mapLayer}>
          <SubconsciousMap
            nodes={mapNodes}
            edges={mapEdges}
            onDismiss={exitMapMode}
            petEmoji={currentPet?.avatarEmoji || '🐱'}
            mood={currentMood}
            onNodePress={(node) => {
              triggerHaptic('selection')
              console.log('[SubconsciousMap] Node pressed:', node.keyword)
            }}
          />
        </View>
      )}

      <DevourAnimation
        visible={devouring}
        petEmoji={currentPet?.avatarEmoji || '🐱'}
        bubbleX={devourTarget?.bubbleX}
        bubbleY={devourTarget?.bubbleY}
        bubbleColor={devourTarget?.color}
        onBurp={() => {
          addAmbientBubble('嗝~ 味道不错~', 'happy')
        }}
        onComplete={finishDevour}
      />
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

export function ChatScreen() {
  return (
    <LivingUIProvider>
      <PetTransitionProvider>
        <LivingChatScreenInner />
      </PetTransitionProvider>
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
  memoryStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memoryStatusText: {
    fontSize: 11,
    color: dark.text.tertiary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: dark.bg.primary,
    zIndex: 10,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: dark.bg.primary,
    zIndex: 10,
  },
  mapTrigger: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 25,
  },
  mapTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mapTriggerIcon: {
    fontSize: 16,
  },
  mapTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: dark.text.secondary,
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
})
