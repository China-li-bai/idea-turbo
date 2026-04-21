import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useAppStore } from '../store'
import { theme } from '../theme'

export function MemoriesScreen() {
  const { memories, systemStatus } = useAppStore()

  const episodicCount = systemStatus?.memory.episodicCount ?? 0
  const semanticCount = systemStatus?.memory.semanticCount ?? 0

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>记忆宫殿</Text>
        <Text style={styles.headerSubtitle}>你的宠物记得一切</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📔</Text>
          <Text style={styles.statNumber}>{episodicCount}</Text>
          <Text style={styles.statLabel}>事件记忆</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🧠</Text>
          <Text style={styles.statNumber}>{semanticCount}</Text>
          <Text style={styles.statLabel}>语义事实</Text>
        </View>
      </View>

      {memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💭</Text>
          <Text style={styles.emptyTitle}>还没有记忆</Text>
          <Text style={styles.emptySubtitle}>和你的宠物聊天，它会记住重要的事</Text>
        </View>
      ) : (
        <View style={styles.memoryList}>
          {memories.map((memory) => (
            <View key={memory.id} style={styles.memoryCard}>
              <Text style={styles.memoryContent}>{memory.content}</Text>
              <View style={styles.memoryMeta}>
                <Text style={styles.memoryTag}>{memory.memoryType}</Text>
                <Text style={styles.memoryImportance}>重要度: {(memory.importance * 100).toFixed(0)}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[400],
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[100],
    ...theme.shadows.sm,
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: theme.spacing.sm,
  },
  statNumber: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary[600],
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
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
  memoryList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  memoryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[100],
    ...theme.shadows.sm,
  },
  memoryContent: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
  },
  memoryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  memoryTag: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  memoryImportance: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
  },
})
