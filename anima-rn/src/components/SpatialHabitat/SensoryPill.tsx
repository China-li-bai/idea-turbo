import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { triggerHaptic } from '../LivingUI/HapticEngine'
import { dark, candy } from '../../theme'
import type { PetMood } from '../LivingUI/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export type SensoryPillMode = 'dormant' | 'listening' | 'text_input' | 'processing'

export interface SensoryPillProps {
  mode?: SensoryPillMode
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onTextSubmit?: (text: string) => void
  onModeChange?: (mode: SensoryPillMode) => void
  petMood?: PetMood
  isBrainActive?: boolean
  placeholder?: string
}

const PILL_COLLAPSED_WIDTH = 64
const PILL_EXPANDED_WIDTH = SCREEN_WIDTH - 48

export function SensoryPill({
  mode: externalMode,
  onVoiceStart,
  onVoiceEnd,
  onTextSubmit,
  onModeChange,
  petMood = 'idle',
  isBrainActive = false,
  placeholder = '说点什么...',
}: SensoryPillProps) {
  const [internalMode, setInternalMode] = useState<SensoryPillMode>('dormant')
  const [inputText, setInputText] = useState('')
  const [isPressed, setIsPressed] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const currentMode = externalMode || internalMode

  const pillWidth = useSharedValue(PILL_COLLAPSED_WIDTH)
  const pillHeight = useSharedValue(64)
  const pillOpacity = useSharedValue(1)
  const breathScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0)
  const glowScale = useSharedValue(1)
  const micScale = useSharedValue(1)
  const inputOpacity = useSharedValue(0)
  const pulseOpacity = useSharedValue(0)
  const processingRotation = useSharedValue(0)

  useEffect(() => {
    switch (currentMode) {
      case 'dormant':
        pillWidth.value = withSpring(PILL_COLLAPSED_WIDTH, { damping: 15, stiffness: 150 })
        pillHeight.value = withSpring(64, { damping: 15, stiffness: 150 })
        inputOpacity.value = withTiming(0, { duration: 200 })
        glowOpacity.value = withTiming(0, { duration: 300 })
        pulseOpacity.value = withTiming(0, { duration: 300 })
        breathScale.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
        break

      case 'listening':
        pillWidth.value = withSpring(96, { damping: 12, stiffness: 180 })
        pillHeight.value = withSpring(72, { damping: 12, stiffness: 180 })
        inputOpacity.value = withTiming(0, { duration: 100 })
        glowOpacity.value = withTiming(0.6, { duration: 300 })
        glowScale.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 800 }),
            withTiming(1, { duration: 800 })
          ),
          -1,
          true
        )
        pulseOpacity.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration: 600 }),
            withTiming(0, { duration: 600 })
          ),
          -1,
          true
        )
        micScale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 400 }),
            withTiming(1, { duration: 400 })
          ),
          -1,
          true
        )
        break

      case 'text_input':
        pillWidth.value = withSpring(PILL_EXPANDED_WIDTH, { damping: 14, stiffness: 120 })
        pillHeight.value = withSpring(52, { damping: 14, stiffness: 120 })
        inputOpacity.value = withTiming(1, { duration: 300 })
        glowOpacity.value = withTiming(0.2, { duration: 300 })
        pulseOpacity.value = withTiming(0, { duration: 200 })
        micScale.value = withTiming(1, { duration: 200 })
        setTimeout(() => inputRef.current?.focus(), 350)
        break

      case 'processing':
        pillWidth.value = withSpring(80, { damping: 12, stiffness: 150 })
        pillHeight.value = withSpring(64, { damping: 12, stiffness: 150 })
        inputOpacity.value = withTiming(0, { duration: 200 })
        glowOpacity.value = withTiming(0.4, { duration: 300 })
        processingRotation.value = withRepeat(
          withTiming(360, { duration: 2000 }),
          -1,
          false
        )
        break
    }
  }, [currentMode])

  const setMode = useCallback((newMode: SensoryPillMode) => {
    setInternalMode(newMode)
    onModeChange?.(newMode)
  }, [onModeChange])

  const handlePress = useCallback(() => {
    if (currentMode === 'dormant') {
      setMode('text_input')
      triggerHaptic('light')
    } else if (currentMode === 'text_input') {
      if (inputText.trim()) {
        onTextSubmit?.(inputText.trim())
        setInputText('')
        setMode('processing')
        setTimeout(() => setMode('dormant'), 1500)
      } else {
        setMode('dormant')
        inputRef.current?.blur()
      }
    }
  }, [currentMode, inputText, onTextSubmit, setMode])

  const handlePressIn = useCallback(() => {
    if (currentMode === 'dormant' || currentMode === 'listening') {
      setIsPressed(true)
      setMode('listening')
      onVoiceStart?.()
      triggerHaptic('medium')
    }
  }, [currentMode, onVoiceStart, setMode])

  const handlePressOut = useCallback(() => {
    if (currentMode === 'listening') {
      setIsPressed(false)
      onVoiceEnd?.()
      setMode('processing')
      setTimeout(() => setMode('dormant'), 1000)
    }
  }, [currentMode, onVoiceEnd, setMode])

  const handleSubmitEditing = useCallback(() => {
    if (inputText.trim()) {
      onTextSubmit?.(inputText.trim())
      setInputText('')
      setMode('processing')
      setTimeout(() => setMode('dormant'), 1500)
    }
  }, [inputText, onTextSubmit, setMode])

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    width: pillWidth.value,
    height: pillHeight.value,
    transform: [{ scale: breathScale.value }],
  }))

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }))

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }))

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
  }))

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))

  const processingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${processingRotation.value}deg` }],
  }))

  const glowColor = petMood === 'love' ? candy.neonPink[400]
    : petMood === 'happy' ? candy.cyan[400]
    : petMood === 'thinking' ? candy.violet[400]
    : candy.violet[400]

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pill, pillAnimatedStyle]}>
        <Animated.View
          style={[
            styles.glowRing,
            { borderColor: glowColor, shadowColor: glowColor },
            glowAnimatedStyle,
          ]}
        />

        {currentMode === 'listening' && (
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: glowColor },
              pulseAnimatedStyle,
            ]}
          />
        )}

        {currentMode === 'dormant' && (
          <Pressable
            style={styles.touchArea}
            onPress={handlePress}
            onLongPress={handlePressIn}
            onPressOut={handlePressOut}
            delayLongPress={200}
          >
            <Animated.View style={[styles.micIcon, micAnimatedStyle]}>
              <Text style={styles.micEmoji}>
                {isBrainActive ? '🎙️' : '💤'}
              </Text>
            </Animated.View>
          </Pressable>
        )}

        {currentMode === 'listening' && (
          <Pressable
            style={styles.touchArea}
            onPressOut={handlePressOut}
          >
            <Animated.View style={[styles.micIcon, micAnimatedStyle]}>
              <Text style={styles.micEmojiActive}>🎙️</Text>
            </Animated.View>
            <View style={styles.listeningWaves}>
              {[0, 1, 2, 3, 4].map(i => (
                <ListeningBar key={i} delay={i * 100} color={glowColor} />
              ))}
            </View>
          </Pressable>
        )}

        {currentMode === 'text_input' && (
          <View style={styles.inputRow}>
            <Animated.View style={[styles.inputWrap, inputAnimatedStyle]}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={placeholder}
                placeholderTextColor={dark.text.tertiary}
                multiline={false}
                maxLength={500}
                onSubmitEditing={handleSubmitEditing}
                returnKeyType="send"
              />
            </Animated.View>
            <Pressable
              onPress={handlePress}
              style={[styles.sendBtn, { opacity: inputText.trim() ? 1 : 0.3 }]}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
        )}

        {currentMode === 'processing' && (
          <Animated.View style={[styles.processingIndicator, processingAnimatedStyle]}>
            <Text style={styles.processingEmoji}>✦</Text>
          </Animated.View>
        )}
      </Animated.View>

      {currentMode === 'dormant' && (
        <Text style={styles.hintText}>
          {isBrainActive ? '按住说话 · 轻触输入' : '休眠中'}
        </Text>
      )}
    </View>
  )
}

function ListeningBar({ delay, color }: { delay: number; color: string }) {
  const height = useSharedValue(4)

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(20 + Math.random() * 12, { duration: 300 + Math.random() * 200 }),
          withTiming(4, { duration: 300 + Math.random() * 200 })
        ),
        -1,
        true
      )
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }))

  return (
    <Animated.View
      style={[
        styles.listeningBar,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  pill: {
    borderRadius: 32,
    backgroundColor: 'rgba(15, 15, 30, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: candy.violet[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 36,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  pulseRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 40,
    borderWidth: 1.5,
  },
  touchArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  micEmoji: {
    fontSize: 24,
  },
  micEmojiActive: {
    fontSize: 28,
  },
  listeningWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  listeningBar: {
    width: 3,
    borderRadius: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    width: '100%',
    height: '100%',
  },
  inputWrap: {
    flex: 1,
  },
  textInput: {
    color: dark.text.primary,
    fontSize: 15,
    paddingVertical: 0,
    maxHeight: 40,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: candy.violet[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingEmoji: {
    fontSize: 22,
    color: candy.cyan[400],
  },
  hintText: {
    fontSize: 11,
    color: dark.text.tertiary,
    marginTop: 8,
    opacity: 0.6,
  },
})
