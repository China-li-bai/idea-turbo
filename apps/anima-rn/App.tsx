import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useAppStore } from './src/store'
import { loadLocalBrain, getBrainState, generatePetReply, generateBackstory, subscribeToBrainState } from './src/lib/LocalBrain'
import type { Pet, PetSpecies } from './src/types'

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
  } = useAppStore()

  const [inputText, setInputText] = useState('')
  const [brainStatus, setBrainStatus] = useState(getBrainState())
  const [isSetupDone, setIsSetupDone] = useState(false)

  useEffect(() => {
    const unsub = subscribeToBrainState((state) => setBrainStatus(state))
    return unsub
  }, [])

  useEffect(() => {
    if (!currentPet) setCurrentPet(DEFAULT_PET)
  }, [])

  async function handleLoadModel() {
    await loadLocalBrain()
  }

  async function handleSend() {
    if (!inputText.trim() || !currentPet || !brainStatus.isLoaded) return

    const userMsg = inputText.trim()
    setInputText('')

    addMessage({
      id: `msg-${Date.now()}`,
      conversationId: 'test-conv',
      role: 'user',
      content: userMsg,
      createdAt: new Date().toISOString(),
    })

    setThinking(true, ['🤔 正在思考...'])

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      const result = await generatePetReply(currentPet, userMsg, history)

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
    setIsSetupDone(true)
    setThinking(false)
  }

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
              {brainStatus.isLoading ? `⏳ 加载中 ${brainStatus.loadProgress}%` : brainStatus.isLoaded ? '🧠 已就绪' : '💤 未加载'}
            </Text>
          </View>
        </View>

        {!brainStatus.isLoaded && (
          <TouchableOpacity style={styles.loadBtn} onPress={handleLoadModel}>
            <Text style={styles.loadBtnText}>加载 AI</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Brain Status Bar */}
      {(brainStatus.isLoading || brainStatus.error) && (
        <View style={[styles.statusBar, brainStatus.error ? styles.statusError : null]}>
          <ActivityIndicator size="small" color={brainStatus.error ? '#ef4444' : '#3b82f6'} />
          <Text style={styles.statusText}>
            {brainStatus.error || `加载中... ${brainStatus.loadProgress}%`}
          </Text>
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
        {!isSetupDone && currentPet && (
          <TouchableOpacity style={styles.setupCard} onPress={handleGenerateBackstory}>
            <Text style={styles.setupTitle}>🎬 开始体验</Text>
            <Text style={styles.setupDesc}>点击为 {currentPet.name} 生成背景故事</Text>
          </TouchableOpacity>
        )}

        {messages.length === 0 && isSetupDone && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{currentPet?.avatarEmoji}</Text>
            <Text style={styles.emptyText}>和 {currentPet?.name} 聊天吧~</Text>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.petBubble]}>
            {msg.role !== 'user' && <Text style={styles.bubbleAvatar}>{currentPet?.avatarEmoji}</Text>}
            <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.petText]}>
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
          placeholder={brainStatus.isLoaded ? '说点什么...' : '请先加载 AI 模型'}
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
          editable={brainStatus.isLoaded}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || !brainStatus.isLoaded) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || !brainStatus.isLoaded}
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
  },
  statusError: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 13,
    color: '#3b82f6',
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
