import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native'
import { useAppStore } from '../store'
import { animaCore } from '../lib/AnimaCore'
import { ChatBubble, ThinkingIndicator, ProgressLoader, InputBar, PetAvatar } from '../components'
import { theme, petTheme } from '../theme'
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
          content: `${result.piWarning || '安全拦截'}`,
          createdAt: new Date().toISOString(),
        })
      }

      if (result.newMemories && (result.newMemories.episodic > 0 || result.newMemories.semantic > 0)) {
        console.log(`[ChatScreen] 新记忆: +${result.newMemories.episodic}事件, +${result.newMemories.semantic}事实`)
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
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />

      <View style={[styles.header, { borderBottomColor: petColors.primary + '15' }]}>
        <View style={styles.headerLeft}>
          <PetAvatar
            emoji={currentPet?.avatarEmoji || '🐱'}
            species={currentPet?.species || 'cat'}
            size={44}
            isActive={brainReady}
            showPulse={isPetThinking}
            showGlow={brainReady}
            mood={isPetThinking ? 'curious' : brainReady ? 'happy' : 'default'}
          />
          <View style={styles.headerInfo}>
            <Text style={[styles.petName, { color: petColors.primaryDark }]}>
              {currentPet?.name || 'Anima'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                {
                  backgroundColor: brainReady
                    ? petColors.accent
                    : isLoading
                      ? theme.colors.warm[500]
                      : theme.colors.neutral[400],
                },
              ]} />
              <Text style={styles.brainStatus}>
                {!isCoreInitialized
                  ? isLoading ? '正在准备...' : '等待初始化'
                  : brainReady
                    ? '在线中'
                    : '加载中...'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {systemStatus?.embedding.isOnnx && (
            <View style={[styles.badge, { backgroundColor: petColors.primaryLight }]}>
              <Text style={[styles.badgeText, { color: petColors.primaryDark }]}>
                ⚡ 本地 AI
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <ProgressLoader
            phase={initPhase}
            progress={loadProgress}
            petEmoji={currentPet?.avatarEmoji}
            species={currentPet?.species}
          />
        )}

        {!isLoading && !isCoreInitialized && !initError && (
          <View style={styles.loadingState}>
            <View style={[styles.loadingEmojiBg, { backgroundColor: petColors.bg }]}>
              <Text style={styles.loadingEmoji}>{currentPet?.avatarEmoji}</Text>
            </View>
            <Text style={styles.loadingText}>正在唤醒宠物...</Text>
          </View>
        )}

        {messages.length === 0 && isCoreInitialized && !isLoading && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyEmojiBg, { backgroundColor: petColors.bg }]}>
              <Text style={styles.emptyEmoji}>{currentPet?.avatarEmoji}</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: petColors.primaryDark }]}>
              和 {currentPet?.name} 聊天吧
            </Text>
            <Text style={styles.emptySubtitle}>
              你的 AI 宠物伙伴正在等你~
            </Text>
            <View style={[styles.emptyHint, { backgroundColor: petColors.bg, borderColor: petColors.primary + '20' }]}>
              <Text style={[styles.emptyHintText, { color: petColors.primaryDark }]}>
                💡 试着说："今天好累" 或 "我喜欢看电影"
              </Text>
            </View>
          </View>
        )}

        {messages.map((msg, index) => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            role={msg.role}
            petEmoji={currentPet?.avatarEmoji}
            species={currentPet?.species}
            index={index}
          />
        ))}

        {isPetThinking && (
          <ThinkingIndicator
            petEmoji={currentPet?.avatarEmoji}
            species={currentPet?.species}
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
        species={currentPet?.species}
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
    ...theme.shadows.sm,
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
    color: theme.colors.neutral[500],
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
    borderColor: theme.colors.neutral[200],
  },
  badgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
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
    paddingVertical: theme.spacing.xxxxl,
    gap: theme.spacing.md,
  },
  loadingEmojiBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.md,
  },
  loadingEmoji: {
    fontSize: 44,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[500],
    fontWeight: theme.typography.weights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxxl,
    gap: theme.spacing.md,
  },
  emptyEmojiBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.md,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[400],
    fontWeight: theme.typography.weights.medium,
  },
  emptyHint: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    ...theme.shadows.sm,
  },
  emptyHintText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
})
