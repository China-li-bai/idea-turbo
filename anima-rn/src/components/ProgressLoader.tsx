import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withSequence } from 'react-native-reanimated'
import { theme, petTheme } from '../theme'
import type { PetSpecies } from '../types'

type InitPhase = 'idle' | 'downloading' | 'extracting' | 'loading' | 'memory' | 'ready' | 'error'

const PHASE_CONFIG: Record<InitPhase, { text: string; icon: string; emoji: string }> = {
  idle: { text: '', icon: '', emoji: '🐾' },
  downloading: { text: '正在下载 AI 大脑...', icon: '📥', emoji: '📦' },
  extracting: { text: '正在解压模型...', icon: '📦', emoji: '📂' },
  loading: { text: '正在唤醒宠物...', icon: '🧠', emoji: '✨' },
  memory: { text: '正在整理记忆...', icon: '💾', emoji: '📚' },
  ready: { text: '准备就绪！', icon: '✨', emoji: '🎉' },
  error: { text: '唤醒失败', icon: '💔', emoji: '😢' },
}

interface ProgressLoaderProps {
  phase: InitPhase
  progress: number
  petEmoji?: string
  species?: PetSpecies
  errorMessage?: string | null
  onRetry?: () => void
}

export function ProgressLoader({
  phase,
  progress,
  petEmoji = '🐱',
  species = 'cat',
  errorMessage,
  onRetry,
}: ProgressLoaderProps) {
  const petColors = petTheme[species] || petTheme.cat
  const config = PHASE_CONFIG[phase]
  const isLoading = phase !== 'idle' && phase !== 'ready' && phase !== 'error'
  const floatY = useSharedValue(0)

  useEffect(() => {
    if (isLoading) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1200 }),
          withTiming(6, { duration: 1200 }),
        ),
        -1,
        true,
      )
    }
  }, [isLoading])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  if (!isLoading && phase !== 'error') return null

  if (phase === 'error') {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>{config.emoji}</Text>
        <Text style={[styles.errorTitle, { color: petColors.primary }]}>{config.text}</Text>
        <Text style={styles.errorMessage}>{errorMessage || '初始化遇到问题'}</Text>
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: petColors.primary }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>🔄 重新尝试</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    )
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <Animated.View style={[styles.petEmojiContainer, floatStyle]}>
        <View style={[styles.petEmojiBg, { backgroundColor: petColors.bg }]}>
          <Text style={styles.petEmoji}>{petEmoji}</Text>
        </View>
      </Animated.View>

      <View style={styles.progressSection}>
        <View style={[styles.progressBarBg, { backgroundColor: petColors.primaryLight }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: `${progress}%`,
                backgroundColor: petColors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressPercent, { color: petColors.primaryDark }]}>
          {progress}%
        </Text>
      </View>

      <View style={[styles.phaseRow, { backgroundColor: petColors.bg }]}>
        <Text style={styles.phaseIcon}>{config.icon}</Text>
        <Text style={[styles.phaseText, { color: petColors.primaryDark }]}>
          {config.text}
        </Text>
      </View>

      {phase === 'downloading' && (
        <Text style={styles.hintText}>
          ✨ 首次启动需要下载 AI 模型 (~200MB)，建议连接 WiFi
        </Text>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  petEmojiContainer: {
    marginBottom: theme.spacing.sm,
  },
  petEmojiBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.md,
  },
  petEmoji: {
    fontSize: 44,
  },
  progressSection: {
    width: '82%',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  progressPercent: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[200],
  },
  phaseIcon: {
    fontSize: 16,
  },
  phaseText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  hintText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.xs,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  errorEmoji: {
    fontSize: 52,
  },
  errorTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  errorMessage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.sm,
  },
  retryBtn: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.xl,
    ...theme.shadows.sm,
  },
  retryBtnText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.white,
    fontWeight: theme.typography.weights.semibold,
  },
})
