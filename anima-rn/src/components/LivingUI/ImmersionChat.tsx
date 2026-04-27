import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { triggerHaptic } from './HapticEngine'
import { theme, dark, candy } from '../../theme'
import type { PetMood } from './types'
import type { InitPhase } from '../../screens/ChatScreen'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const PET_AREA_HEIGHT = SCREEN_HEIGHT * 0.18

export interface ImmersionMessage {
  id: string
  role: 'user' | 'pet' | 'system'
  content: string
  timestamp: number
  mood?: PetMood
}

interface ImmersionChatProps {
  messages: ImmersionMessage[]
  onSend: (text: string) => void
  onDismiss?: () => void
  inputPlaceholder?: string
  editable?: boolean
  initPhase?: InitPhase
  loadProgress?: number
  initError?: string | null
  onRetryInit?: () => void
}

export function ImmersionChat({
  messages,
  onSend,
  onDismiss,
  inputPlaceholder,
  editable = true,
  initPhase,
  loadProgress = 0,
  initError,
  onRetryInit,
}: ImmersionChatProps) {
  const [inputText, setInputText] = useState('')
  const scrollViewRef = useRef<ScrollView>(null)
  const [localMsgCount, setLocalMsgCount] = useState(0)

  useEffect(() => {
    if (messages.length !== localMsgCount) {
      setLocalMsgCount(messages.length)
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 50)
    }
  }, [messages.length, localMsgCount])

  const handleSend = useCallback(() => {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    triggerHaptic('messageSend')
    console.log('[ImmersionChat] 发送消息:', text.substring(0, 30))
    onSend(text)
  }, [inputText, onSend])

  const isInitializing = initPhase && initPhase !== 'ready' && initPhase !== 'idle' && initPhase !== 'error'
  const isError = initPhase === 'error'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.petReserveArea} />

      {onDismiss && (
        <Pressable onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>▼ 返回</Text>
        </Pressable>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={true}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="handled"
      >
        {isInitializing && messages.length === 0 && (
          <View style={styles.centerBox}>
            {isError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{initError || '初始化失败'}</Text>
                {onRetryInit && (
                  <Pressable onPress={onRetryInit} style={styles.retryButton}>
                    <Text style={styles.retryText}>重试</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.loadingBox}>
                <Text style={styles.loadingEmoji}>
                  {initPhase === 'downloading' ? '📥' : initPhase === 'extracting' ? '📦' : initPhase === 'loading' ? '🧠' : '💾'}
                </Text>
                <Text style={styles.loadingLabel}>
                  {initPhase === 'downloading' ? '下载模型中...' : initPhase === 'extracting' ? '解压资源中...' : initPhase === 'loading' ? '加载引擎中...' : '准备记忆系统中...'}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${loadProgress}%` }]} />
                </View>
                <Text style={styles.loadingPercent}>{loadProgress}%</Text>
              </View>
            )}
          </View>
        )}

        {!isInitializing && messages.length === 0 && (
          <View style={styles.centerBox}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>开始对话</Text>
            <Text style={styles.emptyHint}>向它倾诉你的想法吧~</Text>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id} style={msg.role === 'user' ? styles.userRow : msg.role === 'pet' ? styles.petRow : styles.systemRow}>
            {msg.role === 'user' && (
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{msg.content}</Text>
              </View>
            )}
            {msg.role === 'pet' && (
              <View style={styles.petBubble}>
                <Text style={styles.petText}>{msg.content}</Text>
              </View>
            )}
            {msg.role === 'system' && (
              <Text style={styles.systemText}>{msg.content}</Text>
            )}
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.debugBar}>
        <Text style={styles.debugText}>消息数: {messages.length}</Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={inputPlaceholder || '说点什么...'}
            placeholderTextColor={dark.text.tertiary}
            multiline
            maxLength={500}
            editable={editable}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.3 }]}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  petReserveArea: {
    height: PET_AREA_HEIGHT,
  },
  dismissButton: {
    position: 'absolute',
    top: PET_AREA_HEIGHT - 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 8,
    zIndex: 10,
  },
  dismissText: {
    color: dark.text.tertiary,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    minHeight: SCREEN_HEIGHT * 0.4,
  },
  userRow: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  userBubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    backgroundColor: candy.violet[500] + '20',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: candy.violet[400] + '60',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  userText: {
    fontSize: 17,
    color: dark.text.primary,
    lineHeight: 24,
  },
  petRow: {
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  petBubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    backgroundColor: dark.bg.tertiary + '80',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: dark.border.subtle,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  petText: {
    fontSize: 17,
    color: dark.text.primary,
    lineHeight: 24,
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  systemText: {
    fontSize: 14,
    color: dark.text.tertiary,
    fontStyle: 'italic',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingEmoji: {
    fontSize: 36,
    marginBottom: theme.spacing.md,
  },
  loadingLabel: {
    fontSize: 16,
    color: dark.text.secondary,
    marginBottom: theme.spacing.md,
  },
  progressBarBg: {
    width: 200,
    height: 4,
    backgroundColor: dark.bg.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: candy.violet[400],
    borderRadius: 2,
  },
  loadingPercent: {
    fontSize: 14,
    color: dark.text.tertiary,
  },
  errorBox: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: candy.coral[300],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: candy.coral[400] + '20',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: candy.coral[400] + '40',
  },
  retryText: {
    color: candy.coral[300],
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    color: dark.text.secondary,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
  },
  emptyHint: {
    fontSize: 16,
    color: dark.text.tertiary,
  },
  debugBar: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    backgroundColor: dark.bg.primary + '60',
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: dark.text.tertiary,
  },
  inputContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: dark.border.subtle,
    backgroundColor: dark.bg.primary + '90',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: dark.bg.tertiary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: dark.border.subtle,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: dark.text.primary,
    maxHeight: 100,
    paddingVertical: theme.spacing.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: candy.violet[500] + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.xs,
  },
  sendIcon: {
    fontSize: 18,
    color: candy.violet[400],
    fontWeight: '600',
  },
})
