import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
  Easing,
  FadeInDown,
} from 'react-native-reanimated'
import { triggerHaptic } from './HapticEngine'
import { CyberGlass } from './CyberGlass'
import { theme, dark, candy } from '../../theme'
import type { PetMood } from './types'
import type { TokenSpeedLevel } from './TokenSpeedTracker'
import { getBreathCurve, getBreathPhysicsForCurve, getStreamingCursorAnimation, getBubblePulseAnimation } from './BreathCurve'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const PET_AREA_HEIGHT = SCREEN_HEIGHT * 0.25

interface ImmersionMessage {
  id: string
  role: 'user' | 'pet' | 'system'
  content: string
  timestamp: number
  mood?: PetMood
  isStreaming?: boolean
  speedLevel?: TokenSpeedLevel
  memoryAnchors?: Array<{
    id: string
    content: string
    type: 'episodic' | 'semantic' | 'emotion'
  }>
}

interface UserPulseProps {
  text: string
  onSent: () => void
}

function UserPulse({ text, onSent }: UserPulseProps) {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.5)
  const translateY = useSharedValue(30)
  const glowOpacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 12, stiffness: 150 })
    scale.value = withSpring(1, { damping: 10, stiffness: 180 })
    translateY.value = withSpring(0, { damping: 15, stiffness: 120 })
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.3, { duration: 800 })
    )

    const timer = setTimeout(onSent, 600)
    return () => clearTimeout(timer)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  return (
    <Animated.View style={[styles.userPulseContainer, animatedStyle]}>
      <Animated.View
        style={[
          styles.userPulseGlow,
          { backgroundColor: candy.cyan[400] },
          glowStyle,
        ]}
      />
      <View style={[styles.userPulseBody, { borderColor: candy.cyan[400] + '50' }]}>
        <Text style={[styles.userPulseText, { color: candy.cyan[300] }]}>
          {text}
        </Text>
      </View>
      <View style={[styles.userPulseRing, { borderColor: candy.cyan[400] + '30' }]} />
    </Animated.View>
  )
}

interface PetEmergenceProps {
  text: string
  mood?: PetMood
  isStreaming?: boolean
  speedLevel?: TokenSpeedLevel
  onComplete?: () => void
}

const MOOD_EMERGENCE_COLORS: Record<PetMood, string> = {
  idle: candy.violet[400],
  thinking: candy.cyan[400],
  typing: candy.cyan[300],
  sniffing: candy.lime[400],
  listening: candy.electricBlue[400],
  happy: candy.coral[400],
  excited: candy.neonPink[400],
  sad: candy.violet[500],
  angry: candy.coral[600],
  sleepy: candy.violet[300],
  curious: candy.lime[500],
  love: candy.neonPink[500],
  surprised: candy.coral[500],
  shy: candy.neonPink[300],
}

function BreathingCursor({ color, speedLevel = 'normal', mood = 'typing' }: { color: string; speedLevel?: TokenSpeedLevel; mood?: PetMood }) {
  const cursorConfig = getStreamingCursorAnimation(speedLevel, mood)
  const opacity = useSharedValue(0)
  const width = useSharedValue(cursorConfig.width)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: cursorConfig.blinkDuration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: cursorConfig.blinkDuration / 2, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )
  }, [cursorConfig.blinkDuration])

  useEffect(() => {
    width.value = withSpring(cursorConfig.width, { damping: 15, stiffness: 200 })
  }, [cursorConfig.width, width])

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: cursorConfig.height,
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.5,
    width: width.value + cursorConfig.glowRadius * 2,
    height: cursorConfig.height + cursorConfig.glowRadius * 2,
    borderRadius: (cursorConfig.height + cursorConfig.glowRadius * 2) / 2,
  }))

  return (
    <View style={styles.cursorContainer}>
      <Animated.View
        style={[
          styles.cursorGlow,
          { backgroundColor: color },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.cursorBody,
          { backgroundColor: color },
          cursorStyle,
        ]}
      />
    </View>
  )
}

function PetEmergence({ text, mood = 'happy', isStreaming, speedLevel = 'normal', onComplete }: PetEmergenceProps) {
  const emergenceColor = MOOD_EMERGENCE_COLORS[mood] || candy.violet[400]
  const breathCurve = getBreathCurve(speedLevel, mood)
  const breathPhysics = getBreathPhysicsForCurve(speedLevel, mood)
  const pulseConfig = getBubblePulseAnimation(speedLevel, mood)

  const opacity = useSharedValue(0)
  const translateY = useSharedValue(40)
  const scale = useSharedValue(0.8)
  const breathScale = useSharedValue(0)
  const glowPulse = useSharedValue(0)
  const textReveal = useSharedValue(0)
  const rippleScale = useSharedValue(1)
  const rippleOpacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withSpring(1, breathPhysics)
    translateY.value = withSpring(0, {
      damping: breathPhysics.damping + 2,
      stiffness: breathPhysics.stiffness - 20,
      mass: breathPhysics.mass,
    })
    scale.value = withSpring(1, breathPhysics)

    const glowDuration = breathCurve.rippleSpeed
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(breathCurve.glowIntensity, { duration: glowDuration, easing: Easing.inOut(Easing.sin) }),
        withTiming(breathCurve.glowIntensity * 0.3, { duration: glowDuration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )

    if (isStreaming) {
      breathScale.value = withRepeat(
        withSequence(
          withTiming(pulseConfig.scaleAmplitude, {
            duration: pulseConfig.duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(-pulseConfig.scaleAmplitude, {
            duration: pulseConfig.duration / 2,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )

      rippleScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: pulseConfig.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: pulseConfig.duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
      rippleOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: pulseConfig.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.1, { duration: pulseConfig.duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    }

    if (!isStreaming) {
      textReveal.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    }
  }, [speedLevel])

  useEffect(() => {
    if (!isStreaming && text.length > 0) {
      textReveal.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
      breathScale.value = withSpring(0, { damping: 20, stiffness: 100 })
      rippleScale.value = withSpring(1, { damping: 20, stiffness: 100 })
      rippleOpacity.value = withTiming(0, { duration: 400 })
    }
  }, [isStreaming])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value + breathScale.value },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }))

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }))

  return (
    <Animated.View style={[styles.petEmergenceContainer, animatedStyle]}>
      <Animated.View
        style={[
          styles.emergenceGlow,
          { backgroundColor: emergenceColor },
          glowStyle,
        ]}
      />

      <View style={[styles.emergenceBody, { borderColor: emergenceColor + '30', backgroundColor: emergenceColor + '10' }]}>
        <View style={[styles.emergenceTail, { borderTopColor: emergenceColor + '20' }]} />

        <Text style={[styles.emergenceText, { color: dark.text.primary }]}>
          {text}
        </Text>

        {isStreaming && (
          <BreathingCursor
            color={emergenceColor}
            speedLevel={speedLevel}
            mood={mood}
          />
        )}
      </View>

      <Animated.View style={[styles.emergenceRipple, { borderColor: emergenceColor + '15' }, rippleStyle]} />
    </Animated.View>
  )
}

interface ImmersionInputProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  placeholder?: string
  editable?: boolean
  petMood?: PetMood
  speedLevel?: TokenSpeedLevel
}

function ImmersionInput({
  value,
  onChangeText,
  onSend,
  placeholder = '向它倾诉...',
  editable = true,
  petMood = 'idle',
  speedLevel = 'normal',
}: ImmersionInputProps) {
  const inputGlow = useSharedValue(0)
  const isFocused = useRef(false)

  const moodColor = MOOD_EMERGENCE_COLORS[petMood] || candy.violet[400]
  const breathCurve = getBreathCurve(speedLevel, petMood)

  useEffect(() => {
    if (isFocused.current) {
      inputGlow.value = withRepeat(
        withSequence(
          withTiming(breathCurve.glowIntensity, { duration: breathCurve.rippleSpeed, easing: Easing.inOut(Easing.sin) }),
          withTiming(breathCurve.glowIntensity * 0.3, { duration: breathCurve.rippleSpeed, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    } else {
      inputGlow.value = withTiming(0.2, { duration: 300 })
    }
  }, [petMood, speedLevel])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: inputGlow.value,
  }))

  return (
    <View style={styles.inputContainer}>
      <Animated.View
        style={[
          styles.inputGlowRing,
          { backgroundColor: moodColor },
          glowStyle,
        ]}
      />

      <CyberGlass intensity={0.15} tint="dark">
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={dark.text.tertiary}
            editable={editable}
            multiline
            maxLength={500}
            onFocus={() => {
              isFocused.current = true
              inputGlow.value = withTiming(0.6, { duration: 300 })
            }}
            onBlur={() => {
              isFocused.current = false
              inputGlow.value = withTiming(0.2, { duration: 300 })
            }}
            onSubmitEditing={onSend}
          />

          <Pressable
            onPress={() => {
              if (value.trim()) {
                runOnJS(triggerHaptic)('messageSend')
                onSend()
              }
            }}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: value.trim() ? moodColor + '30' : 'transparent',
                borderColor: moodColor + '50',
                transform: [{ scale: pressed ? 0.9 : 1 }],
              },
            ]}
          >
            <Text style={[styles.sendIcon, { color: moodColor }]}>↑</Text>
          </Pressable>
        </View>
      </CyberGlass>
    </View>
  )
}

interface ImmersionChatProps {
  messages: ImmersionMessage[]
  activeStreamId: string | null
  petMood?: PetMood
  speedLevel?: TokenSpeedLevel
  onSend: (text: string) => void
  onStreamComplete?: (messageId: string, fullText: string) => void
  onDismiss?: () => void
  inputPlaceholder?: string
  editable?: boolean
}

export function ImmersionChat({
  messages,
  activeStreamId,
  petMood = 'idle',
  speedLevel = 'normal',
  onSend,
  onStreamComplete,
  onDismiss,
  inputPlaceholder,
  editable = true,
}: ImmersionChatProps) {
  const [inputText, setInputText] = useState('')
  const [sendingPulse, setSendingPulse] = useState<string | null>(null)
  const flatListRef = useRef<FlatList>(null)

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return
    const text = inputText.trim()
    setInputText('')
    setSendingPulse(text)
    onSend(text)
  }, [inputText, onSend])

  const renderItem = useCallback(({ item }: { item: ImmersionMessage; index: number }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userMessageRow}>
          <View style={styles.userPulseWrapper}>
            <PetEmergence
              text={item.content}
              mood={petMood}
              speedLevel={speedLevel}
            />
          </View>
        </View>
      )
    }

    if (item.role === 'pet') {
      return (
        <View style={styles.petMessageRow}>
          <PetEmergence
            text={item.content}
            mood={item.mood || petMood}
            isStreaming={item.isStreaming}
            speedLevel={item.isStreaming ? speedLevel : 'normal'}
          />
        </View>
      )
    }

    if (item.role === 'system') {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      )
    }

    return null
  }, [petMood, speedLevel])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.petReserveArea} />

      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          style={styles.dismissButton}
        >
          <Text style={styles.dismissText}>▼ 返回</Text>
        </Pressable>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={11}
      />

      {sendingPulse && (
        <UserPulse
          text={sendingPulse}
          onSent={() => setSendingPulse(null)}
        />
      )}

      <ImmersionInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        placeholder={inputPlaceholder || '向它倾诉...'}
        editable={editable}
        petMood={petMood}
        speedLevel={speedLevel}
      />
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
    paddingVertical: theme.spacing.sm,
    zIndex: 10,
  },
  dismissText: {
    fontSize: theme.typography.sizes.xs,
    color: dark.text.tertiary,
    fontWeight: theme.typography.weights.medium,
  },
  messageList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  userMessageRow: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  userPulseWrapper: {
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  petMessageRow: {
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  systemText: {
    fontSize: theme.typography.sizes.xs,
    color: dark.text.tertiary,
    fontStyle: 'italic',
  },
  userPulseContainer: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  userPulseGlow: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
  },
  userPulseBody: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    backgroundColor: candy.cyan[400] + '10',
  },
  userPulseText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.relaxed,
  },
  userPulseRing: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
  },
  petEmergenceContainer: {
    maxWidth: SCREEN_WIDTH * 0.75,
    position: 'relative',
  },
  emergenceGlow: {
    position: 'absolute',
    bottom: -6,
    left: 10,
    width: 50,
    height: 12,
    borderRadius: 6,
    opacity: 0.2,
  },
  emergenceBody: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    position: 'relative',
  },
  emergenceTail: {
    position: 'absolute',
    bottom: -8,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
  },
  emergenceText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.lineHeights.relaxed,
  },
  emergenceRipple: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 26,
    borderWidth: 1,
  },
  cursorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    height: 20,
    position: 'relative',
  },
  cursorGlow: {
    position: 'absolute',
    left: -4,
    top: -4,
  },
  cursorBody: {
    borderRadius: 1,
  },
  inputContainer: {
    position: 'relative',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  inputGlowRing: {
    position: 'absolute',
    top: -4,
    left: theme.spacing.lg - 8,
    right: theme.spacing.lg - 8,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    color: dark.text.primary,
    maxHeight: 100,
    paddingVertical: theme.spacing.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
  },
})
