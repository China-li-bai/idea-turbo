import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, StyleSheet, StatusBar } from 'react-native'
import { useAppStore } from '../store'
import { animaCore } from '../lib/AnimaCore'
import { ProgressLoader } from '../components'
import {
  LivingUIProvider,
  PetTransitionProvider,
  usePetTransition,
  usePetMood,
  usePetActivity,
  triggerHaptic,
  createEmotionIntegration,
  DevourAnimation,
  useDevourAnimation,
} from '../components/LivingUI'
import { SpatialHabitat } from '../components/SpatialHabitat'
import { PheromoneProvider, usePheromone } from '../lib/PheromoneContext'
import { useProactiveBehavior } from '../lib/ProactiveBehaviorEngine'
import { useVoicePipeline, getPetVoiceProfile, getVoiceParamsForMood, getPetVoiceCue } from '../lib/VoicePipeline'
import { useDeviceSensors } from '../lib/DeviceSensors'
import { dark } from '../theme'
import type { PetMood } from '../components/LivingUI'

export type InitPhase = 'idle' | 'downloading' | 'extracting' | 'loading' | 'memory' | 'ready' | 'error'

function SpatialChatScreenInner() {
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
  const pheromone = usePheromone()
  const proactive = useProactiveBehavior(isCoreInitialized)
  const voice = useVoicePipeline({ language: 'zh-CN' })
  const sensors = useDeviceSensors(isCoreInitialized)

  const [initError, setInitError] = useState<string | null>(null)
  const [initPhase, setInitPhase] = useState<InitPhase>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const { devouring, devourTarget, triggerDevour, finishDevour } = useDevourAnimation()

  const emotionIntegration = useRef(createEmotionIntegration())
  const petVoiceCuePlayedRef = useRef(false)

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

  useEffect(() => {
    if (sensors.isShaking) {
      proactive.notifySensor('shake')
      setMood('surprised')
      setPetMood('surprised')
      setTimeout(() => {
        setMood('shy')
        setPetMood('shy')
      }, 1500)
    }
  }, [sensors.isShaking])

  useEffect(() => {
    proactive.notifyEmotion(pheromone.emotionalBias)
  }, [pheromone.emotionalBias.loneliness])

  useEffect(() => {
    if (proactive.lastEvent) {
      addMessage({
        id: proactive.lastEvent.id,
        conversationId: 'test-conv',
        role: 'pet',
        content: proactive.lastEvent.message,
        createdAt: new Date().toISOString(),
      })
      setMood(proactive.lastEvent.mood)
      setPetMood(proactive.lastEvent.mood)

      if (voice.isTTSAvailable) {
        const profile = getPetVoiceProfile(currentPet?.species || 'cat')
        const params = getVoiceParamsForMood(profile, proactive.lastEvent.mood)
        voice.speak(proactive.lastEvent.message, {
          rate: params.rate,
          pitch: params.pitch,
        })
      }
    }
  }, [proactive.lastEvent?.id])

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
      console.error('[SpatialChatScreen] Auto-init error:', e)
    } finally {
      setLoading(false)
    }
  }, [currentPet])

  const handleSendMessage = useCallback(async (userMsg: string) => {
    if (!userMsg.trim() || !currentPet) return

    const trimmedMsg = userMsg.trim()
    emotionIntegration.current.onUserMessage(trimmedMsg)
    await triggerHaptic('messageSend')
    proactive.resetIdle()

    const userMsgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    addMessage({
      id: userMsgId,
      conversationId: 'test-conv',
      role: 'user',
      content: trimmedMsg,
      createdAt: new Date().toISOString(),
    })

    if (!isCoreInitialized) {
      const statusMsg = initPhase === 'error'
        ? `⚠️ ${initError || 'AI系统初始化失败，请返回首页重试'}`
        : initPhase === 'idle'
          ? '🔄 AI系统正在启动中...'
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

    const species = currentPet?.species || 'cat'
    const voiceCue = getPetVoiceCue(species, 'thinking')
    if (voiceCue && voice.isTTSAvailable && !petVoiceCuePlayedRef.current) {
      petVoiceCuePlayedRef.current = true
      voice.speak(voiceCue, { rate: 1.0, pitch: 1.2 })
    }

    try {
      const result = await animaCore.chatStream(currentPet, trimmedMsg, streamId, 'test-conv', 'owner')

      petVoiceCuePlayedRef.current = false

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

        if (voice.isTTSAvailable) {
          const profile = getPetVoiceProfile(species)
          const finalMood = emotionIntegration.current.onStreamComplete() || 'happy'
          const params = getVoiceParamsForMood(profile, finalMood)
          voice.speak(result.reply, {
            rate: params.rate,
            pitch: params.pitch,
          })
        }
      }

      setActiveStreamId(null)
      setThinking(false)

      const finalStreamMood = emotionIntegration.current.onStreamComplete()
      if (finalStreamMood && finalStreamMood !== 'idle') {
        setMood(finalStreamMood)
        setPetMood(finalStreamMood)
      }
    } catch (e: any) {
      console.error('[SpatialChatScreen] Send error:', e)
      petVoiceCuePlayedRef.current = false
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
  }, [currentPet, isCoreInitialized, initPhase, initError, voice.isTTSAvailable])

  const handleVoiceStart = useCallback(() => {
    voice.startListening()
    setMood('listening')
    setPetMood('listening')
  }, [voice])

  const handleVoiceEnd = useCallback(async () => {
    const result = await voice.stopListening()
    if (result?.transcript) {
      handleSendMessage(result.transcript)
    } else {
      setMood('curious')
      setPetMood('curious')
    }
  }, [voice, handleSendMessage])

  const brainReady = isCoreInitialized && systemStatus?.brain.isLoaded
  const isLoading = initPhase !== 'idle' && initPhase !== 'ready' && initPhase !== 'error'

  const spatialMessages = messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'pet' | 'system',
    content: m.content,
  }))

  if (isLoading || initPhase === 'error') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={dark.bg.primary} translucent />
        <ProgressLoader
          phase={initPhase === 'error' ? 'error' : initPhase}
          progress={loadProgress}
          petEmoji={currentPet?.avatarEmoji}
          species={currentPet?.species}
          errorMessage={initError || undefined}
          onRetry={initPhase === 'error' ? handleAutoInit : undefined}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SpatialHabitat
        petName={currentPet?.name}
        petEmoji={currentPet?.avatarEmoji || '🐱'}
        brainActive={brainReady}
        isThinking={isPetThinking}
        messages={spatialMessages}
        onSendMessage={handleSendMessage}
        onVoiceStart={handleVoiceStart}
        onVoiceEnd={handleVoiceEnd}
        onNavigateToMemories={() => {}}
        onNavigateToSettings={() => {}}
      />

      <DevourAnimation
        visible={devouring}
        petEmoji={currentPet?.avatarEmoji || '🐱'}
        bubbleX={devourTarget?.bubbleX}
        bubbleY={devourTarget?.bubbleY}
        bubbleColor={devourTarget?.color}
        onBurp={() => {}}
        onComplete={finishDevour}
      />
    </View>
  )
}

export function ChatScreen() {
  return (
    <LivingUIProvider>
      <PetTransitionProvider>
        <PheromoneProvider>
          <SpatialChatScreenInner />
        </PheromoneProvider>
      </PetTransitionProvider>
    </LivingUIProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: dark.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
