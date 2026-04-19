import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useAppStore } from './src/store'
import { animaCore } from './src/lib/AnimaCore'
import { generateBackstory } from './src/lib/LocalBrain'
import type { Pet } from './src/types'

const DEFAULT_PET: Pet = {
  id: 'test-1',
  name: '小团子',
  species: 'cat',
  personality: ['proud', 'gentle', 'foodie'],
  avatarEmoji: '🐱',
  backstory: '',
  systemPrompt: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export default function App() {
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
    setView,
    setLoading,
  } = useAppStore()

  const [inputText, setInputText] = useState('')
  const [initError, setInitError] = useState<string | null>(null)
  const [showSystemPanel, setShowSystemPanel] = useState(false)

  useEffect(() => {
    if (!currentPet) setCurrentPet(DEFAULT_PET)
  }, [])

  const handleInit = useCallback(async () => {
    setInitError(null)
    setLoading(true)
    try {
      const status = await animaCore.init()
      setSystemStatus(status)
      setCoreInitialized(true)
    } catch (e: any) {
      setInitError(e.message || '初始化失败')
      console.error('[App] Init error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

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
        console.log(`[App] 📝 新记忆: +${result.newMemories.episodic}事件, +${result.newMemories.semantic}事实`)
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
      console.error('[App] Send error:', e)
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

  async function handleGenerateBackstory() {
    if (!currentPet) return
    setThinking(true, ['✨ 正在生成背景故事...'])
    const story = await generateBackstory(currentPet.name, currentPet.species, currentPet.personality)
    setCurrentPet({ ...currentPet, backstory: story })
    setThinking(false)
  }

  async function handleConsolidate() {
    if (!currentPet) return
    setThinking(true, ['🔄 整理记忆中...'])
    await animaCore.runConsolidation(currentPet.id)
    const updatedStatus = animaCore.getSystemStatus()
    setSystemStatus(updatedStatus)
    setThinking(false)
  }

  const brainReady = isCoreInitialized && systemStatus?.brain.isLoaded

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.petEmoji}>{currentPet?.avatarEmoji}</Text>
          <View>
            <Text style={styles.petName}>{currentPet?.name || 'Anima'}</Text>
            <Text style={styles.brainStatus}>
              {!isCoreInitialized
                ? '💤 未初始化'
                : brainReady
                  ? '🧠 已就绪'
                  : `⏳ ${systemStatus?.brain.isLoading ? '加载中...' : '未就绪'}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {systemStatus?.embedding.isOnnx && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⚡ONNX</Text>
            </View>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSystemPanel(!showSystemPanel)}>
            <Text style={styles.iconBtnText}>{showSystemPanel ? '✕' : '⚙'}</Text>
          </TouchableOpacity>
        </View>

        {!isCoreInitialized && (
          <TouchableOpacity style={styles.loadBtn} onPress={handleInit}>
            <Text style={styles.loadBtnText}>启动系统</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {(initError || systemStatus?.brain.error) && (
        <View style={styles.statusBarError}>
          <Text style={styles.statusErrorText}>
            ❌ {initError || systemStatus?.brain.error}
          </Text>
        </View>
      )}

      {/* System Panel */}
      {showSystemPanel && systemStatus && (
        <View style={styles.systemPanel}>
          <Text style={styles.panelTitle}>🔧 系统状态</Text>
          <View style={styles.panelGrid}>
            <View style={styles.panelItem}>
              <Text style={styles.panelLabel}>AI 模型</Text>
              <Text style={styles.panelValue}>{systemStatus.brain.modelInfo || '未加载'}</Text>
            </View>
            <View style={styles.panelItem}>
              <Text style={styles.panelLabel}>Embedding</Text>
              <Text style={styles.panelValue}>
                {systemStatus.embedding.engineName} ({systemStatus.embedding.dimensions}d)
                {systemStatus.embedding.isOnnx ? ' ⚡' : ' 🔤'}
              </Text>
            </View>
            <View style={styles.panelItem}>
              <Text style={styles.panelLabel}>事件记忆</Text>
              <Text style={styles.panelValue}>{systemStatus.memory.episodicCount} 条</Text>
            </View>
            <View style={styles.panelItem}>
              <Text style={styles.panelLabel}>语义事实</Text>
              <Text style={styles.panelValue}>{systemStatus.memory.semanticCount} 条</Text>
            </View>
            <View style={styles.panelItem}>
              <Text style={styles.panelLabel}>PI 防护</Text>
              <Text style={styles.panelValue}>拦截 {systemStatus.privacy.blockedCount} 次</Text>
            </View>
            <View style={styles.panelItem}>
              <Text style={styles.panelLabel}>记忆系统</Text>
              <Text style={styles.panelValue}>{systemStatus.memory.isReady ? '✅ 就绪' : '❌ 离线'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.consolidateBtn} onPress={handleConsolidate}>
            <Text style={styles.consolidateBtnText}>🔄 整理记忆</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thinking Steps */}
      {isPetThinking && thinkingSteps.length > 0 && (
        <ScrollView horizontal style={styles.thinkingBar} showsHorizontalScrollIndicator={false}>
          {thinkingSteps.map((step, i) => (
            <Text key={i} style={styles.thinkingStep}>{step}</Text>
          ))}
        </ScrollView>
      )}

      {/* Messages */}
      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {!isCoreInitialized && currentPet && (
          <TouchableOpacity style={styles.setupCard} onPress={() => handleInit()}>
            <Text style={styles.setupTitle}>🚀 启动 Anima 核心</Text>
            <Text style={styles.setupDesc}>点击初始化 AI 模型 + 记忆系统 + Embedding 引擎</Text>
          </TouchableOpacity>
        )}

        {messages.length === 0 && isCoreInitialized && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{currentPet?.avatarEmoji}</Text>
            <Text style={styles.emptyText}>和 {currentPet?.name} 聊天吧~</Text>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id} style={[
            styles.messageBubble,
            msg.role === 'user' ? styles.userBubble :
            msg.role === 'system' ? styles.systemBubble :
            styles.petBubble
          ]}>
            {msg.role === 'pet' && <Text style={styles.bubbleAvatar}>{currentPet?.avatarEmoji}</Text>}
            {msg.role === 'system' && <Text style={styles.bubbleAvatar}>🛡️</Text>}
            <Text style={[
              styles.bubbleText,
              msg.role === 'user' ? styles.userText :
              msg.role === 'system' ? styles.systemText :
              styles.petText
            ]}>
              {msg.content}
            </Text>
          </View>
        ))}

        {isPetThinking && (
          <View style={[styles.messageBubble, styles.petBubble]}>
            <Text style={styles.bubbleAvatar}>{currentPet?.avatarEmoji}</Text>
            <Text style={styles.typingIndicator}>● ● ●</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={brainReady ? '说点什么...' : isCoreInitialized ? '模型未就绪...' : '请先启动系统'}
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
          editable={brainReady}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || !brainReady) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || !brainReady}
        >
          <Text style={styles.sendBtnText}>发送</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  petEmoji: {
    fontSize: 28,
  },
  petName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  brainStatus: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  statusBarError: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  statusErrorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  systemPanel: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  panelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  panelItem: {
    width: '47%',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
  },
  panelLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  panelValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  consolidateBtn: {
    marginTop: 12,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  consolidateBtnText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  thinkingBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fffbeb',
    gap: 10,
  },
  thinkingStep: {
    fontSize: 12,
    color: '#d97706',
    marginRight: 12,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  setupDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  messageBubble: {
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  petBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  bubbleAvatar: {
    fontSize: 20,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: '#fff',
  },
  petText: {
    color: '#1f2937',
  },
  systemText: {
    color: '#92400e',
  },
  typingIndicator: {
    fontSize: 16,
    color: '#9ca3af',
    letterSpacing: 4,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
