import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useAppStore } from '../store'
import { animaCore } from '../lib/AnimaCore'
import { generateBackstory } from '../lib/LocalBrain'
import { ChatBubble, ThinkingIndicator, ProgressLoader, InputBar, PetAvatar } from '../components'
import { theme } from '../theme'
import type { Pet } from '../types'

type InitPhase = 'idle' | 'downloading' | 'extracting' | 'loading' | 'memory' | 'ready' | 'error'

export function ChatScreen() {
  const {
    messages,
    addMessage,
    setThinking,
    isPetThinking,
    thinkingSteps,
    currentPet,
    setCurrentPet,
    systemStatus,
    setSystemStatus,
    isCoreInitialized,
    setCoreInitialized,
    setLoading,
  } = useAppStore()

  const [inputText, setInputText] = useState('')
  const [initError, setInitError] = useState<string | null>(null)
  const [initPhase, setInitPhase] = useState<InitPhase>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const scrollViewRef = useRef<ScrollView>(null)

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
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages, isPetThinking])

  const handleAutoInit = useCallback(async () => {
    setInitError(null)
    setInitPhase('downloading')
    setLoadProgress(5)
    setLoading(true)

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
      setTimeout(() => setInitPhase('ready'), 500)
    } catch (e: any) {
      setInitPhase('error')
      setInitError(e.message || '初始化失败')
      console.error('[ChatScreen] Auto-init error:', e)
    } finally {
      setLoading(false)
    }
  }, [currentPet])

  async function handleSend() {
    if (!inputText.trim() || !currentPet || !isCoreInitialized) return

    const userMsg = inputText.trim()
    setInputText('')

    addMessage({
      id: `msg-${Date.now()}`,
      conversationId: 'test-conv',
      role: 'user',
      content: userMsg,
      createdAt: new Date().toISOString(),
    })

    setThinking(true, ['👂 接收消息...'])

    try {
      const result = await animaCore.chat(currentPet, userMsg, 'test-conv', 'owner')

      if (result.piBlocked) {
        addMessage({
          id: `msg-${Date.now()}-pi`,
          conversationId: 'test-conv',
          role: 'system',
          content: `🛡️ ${result.piWarning || '安全拦截'}`,
          createdAt: new Date().toISOString(),
        })
      }

      if (result.newMemories && (result.newMemories.episodic > 0 || result.newMemories.semantic > 0)) {
        console.log(`[ChatScreen] 📝 新记忆: +${result.newMemories.episodic}事件, +${result.newMemories.semantic}事实`)
        const updatedStatus = animaCore.getSystemStatus()
        setSystemStatus(updatedStatus)
      }

      addMessage({
        id: `msg-${Date.now() + 1}`,
        conversationId: 'test-conv',
        role: 'pet',
        content: result.reply,
        createdAt: new Date().toISOString(),
      })
    } catch (e: any) {
      console.error('[ChatScreen] Send error:', e)
      addMessage({
        id: `msg-${Date.now() + 1}`,
        conversationId: 'test-conv',
        role: 'pet',
        content: '（歪头）嗯...让我想想怎么说...',
        createdAt: new Date().toISOString(),
      })
    }

    setThinking(false)
  }

  const brainReady = isCoreInitialized && systemStatus?.brain.isLoaded
  const isLoading = initPhase !== 'idle' && initPhase !== 'ready' && initPhase !== 'error'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PetAvatar
            emoji={currentPet?.avatarEmoji || '🐱'}
            size={40}
            isActive={brainReady}
            showPulse={isPetThinking}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.petName}>{currentPet?.name || 'Anima'}</Text>
            <Text style={styles.brainStatus}>
              {!isCoreInitialized
                ? isLoading ? '正在准备...' : '等待初始化'
                : brainReady
                  ? '🧠 已就绪'
                  : '⏳ 加载中...'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {systemStatus?.embedding.isOnnx && (
            <View style={styles.onnxBadge}>
              <Text style={styles.onnxBadgeText}>⚡ONNX</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && (
          <ProgressLoader
            phase={initPhase}
            progress={loadProgress}
            petEmoji={currentPet?.avatarEmoji}
          />
        )}

        {!isLoading && !isCoreInitialized && !initError && (
          <View style={styles.loadingState}>
            <Text style={styles.loadingEmoji}>{currentPet?.avatarEmoji}</Text>
            <Text style={styles.loadingText}>正在准备...</Text>
          </View>
        )}

        {messages.length === 0 && isCoreInitialized && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{currentPet?.avatarEmoji}</Text>
            <Text style={styles.emptyTitle}>和 {currentPet?.name} 聊天吧</Text>
            <Text style={styles.emptySubtitle}>你的 AI 宠物伙伴正在等你~</Text>
          </View>
        )}

        {messages.map((msg, index) => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            role={msg.role}
            petEmoji={currentPet?.avatarEmoji}
            index={index}
          />
        ))}

        {isPetThinking && (
          <ThinkingIndicator
            petEmoji={currentPet?.avatarEmoji}
            steps={thinkingSteps}
          />
        )}
      </ScrollView>

      <InputBar
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        placeholder={brainReady ? '说点什么...' : isLoading ? '正在准备 AI 系统...' : '请稍候...'}
        editable={brainReady && !isLoading}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
    ...theme.shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerInfo: {
    gap: 2,
  },
  petName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.neutral[900],
  },
  brainStatus: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  onnxBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  onnxBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary[600],
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  loadingEmoji: {
    fontSize: 64,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[500],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxxl,
    gap: theme.spacing.md,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.neutral[700],
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[400],
  },
})
