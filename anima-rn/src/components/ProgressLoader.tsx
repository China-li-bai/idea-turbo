import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { theme } from '../theme'

type InitPhase = 'idle' | 'downloading' | 'extracting' | 'loading' | 'memory' | 'ready' | 'error'

const PHASE_TEXT: Record<InitPhase, string> = {
  idle: '',
  downloading: '正在下载 AI 模型...',
  extracting: '正在提取 AI 模型...',
  loading: '正在唤醒大脑...',
  memory: '正在整理记忆...',
  ready: '准备就绪！',
  error: '初始化失败',
}

const PHASE_ICON: Record<InitPhase, string> = {
  idle: '🐾',
  downloading: '📥',
  extracting: '📦',
  loading: '🧠',
  memory: '💾',
  ready: '✨',
  error: '💔',
}

interface ProgressLoaderProps {
  phase: InitPhase
  progress: number
  petEmoji?: string
  errorMessage?: string | null
  onRetry?: () => void
}

export function ProgressLoader({ phase, progress, petEmoji = '🐱', errorMessage, onRetry }: ProgressLoaderProps) {
  const isLoading = phase !== 'idle' && phase !== 'ready' && phase !== 'error'

  if (!isLoading && phase !== 'error') return null

  if (phase === 'error') {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>💔</Text>
        <Text style={styles.errorTitle}>唤醒失败</Text>
        <Text style={styles.errorMessage}>{errorMessage || '初始化遇到问题'}</Text>
        {onRetry && (
          <Text style={styles.retryLink} onPress={onRetry}>
            🔄 重新尝试
          </Text>
        )}
      </Animated.View>
    )
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <Text style={styles.petEmoji}>{petEmoji}</Text>
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressPercent}>{progress}%</Text>
      </View>
      <View style={styles.phaseRow}>
        <Text style={styles.phaseIcon}>{PHASE_ICON[phase]}</Text>
        <Text style={styles.phaseText}>{PHASE_TEXT[phase]}</Text>
      </View>
      {phase === 'downloading' && (
        <Text style={styles.hintText}>首次启动需要下载 AI 模型 (~200MB)，请连接 WiFi</Text>
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
  petEmoji: {
    fontSize: 64,
  },
  progressSection: {
    width: '80%',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radius.full,
  },
  progressPercent: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
    fontWeight: theme.typography.weights.medium,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  phaseIcon: {
    fontSize: 14,
  },
  phaseText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
    fontWeight: theme.typography.weights.semibold,
  },
  hintText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
    textAlign: 'center',
    maxWidth: 280,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.rose[500],
  },
  errorMessage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  retryLink: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.weights.semibold,
    marginTop: theme.spacing.sm,
  },
})
