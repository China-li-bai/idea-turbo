import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useAppStore } from '../store'
import { animaCore } from '../lib/AnimaCore'
import { theme } from '../theme'

export function SystemScreen() {
  const { systemStatus, setSystemStatus, setThinking, currentPet } = useAppStore()

  async function handleConsolidate() {
    if (!currentPet) return
    setThinking(true, ['🔄 整理记忆中...'])
    await animaCore.runConsolidation(currentPet.id)
    const updatedStatus = animaCore.getSystemStatus()
    setSystemStatus(updatedStatus)
    setThinking(false)
  }

  if (!systemStatus) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>⚙️</Text>
        <Text style={styles.emptyText}>系统尚未初始化</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>🧠 AI 大脑</Text>
      <View style={styles.card}>
        <StatusRow label="模型" value={systemStatus.brain.modelInfo || '未加载'} />
        <StatusRow label="状态" value={systemStatus.brain.isLoaded ? '✅ 已加载' : '⏳ 未加载'} />
        <StatusRow label="加载进度" value={`${Math.round(systemStatus.brain.loadProgress * 100)}%`} />
        {systemStatus.brain.error && (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>❌ {systemStatus.brain.error}</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>🔢 Embedding 引擎</Text>
      <View style={styles.card}>
        <StatusRow label="引擎" value={systemStatus.embedding.engineName} />
        <StatusRow label="维度" value={`${systemStatus.embedding.dimensions}d`} />
        <StatusRow
          label="类型"
          value={systemStatus.embedding.isOnnx ? '⚡ ONNX (GPU加速)' : '🔤 关键词 (降级)'}
        />
        <StatusRow label="状态" value={systemStatus.embedding.isReady ? '✅ 就绪' : '❌ 离线'} />
      </View>

      <Text style={styles.sectionTitle}>💾 记忆系统</Text>
      <View style={styles.card}>
        <StatusRow label="事件记忆" value={`${systemStatus.memory.episodicCount} 条`} />
        <StatusRow label="语义事实" value={`${systemStatus.memory.semanticCount} 条`} />
        <StatusRow label="对话数" value={`${systemStatus.memory.conversationCount}`} />
        <StatusRow
          label="上次整理"
          value={systemStatus.memory.lastConsolidation
            ? new Date(systemStatus.memory.lastConsolidation).toLocaleString('zh-CN')
            : '从未'}
        />
        <StatusRow label="状态" value={systemStatus.memory.isReady ? '✅ 就绪' : '❌ 离线'} />
      </View>

      <Text style={styles.sectionTitle}>🛡️ 安全防护</Text>
      <View style={styles.card}>
        <StatusRow label="PI 拦截次数" value={`${systemStatus.privacy.blockedCount} 次`} />
        <StatusRow
          label="上次检测"
          value={systemStatus.privacy.lastPiCheck
            ? new Date(systemStatus.privacy.lastPiCheck).toLocaleString('zh-CN')
            : '无'}
        />
      </View>

      <Text style={styles.sectionTitle}>🔋 电池状态</Text>
      <View style={styles.card}>
        <StatusRow label="电量" value={`${systemStatus.battery.level}%`} />
        <StatusRow label="充电" value={systemStatus.battery.isCharging ? '⚡ 充电中' : '🔋 未充电'} />
        <StatusRow
          label="电源模式"
          value={
            systemStatus.battery.powerMode === 'full' ? '🟢 完整模式' :
            systemStatus.battery.powerMode === 'saving' ? '🟡 省电模式' : '🔴 低电量模式'
          }
        />
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={handleConsolidate} activeOpacity={0.7}>
        <Text style={styles.actionBtnText}>🔄 整理记忆</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Anima-RN v1.0.0 · 端侧 AI · 隐私优先</Text>
      </View>
    </ScrollView>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral[50],
    gap: theme.spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[400],
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.neutral[700],
    marginTop: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[100],
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  statusValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.neutral[800],
  },
  errorRow: {
    backgroundColor: theme.colors.rose[50],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.rose[500],
  },
  actionBtn: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  actionBtnText: {
    color: theme.colors.white,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
  },
})
