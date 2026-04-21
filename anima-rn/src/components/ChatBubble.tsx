import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { theme } from '../theme'
import type { MessageRole } from '../types'

interface ChatBubbleProps {
  content: string
  role: MessageRole
  petEmoji?: string
  index?: number
}

export function ChatBubble({ content, role, petEmoji = '🐱', index = 0 }: ChatBubbleProps) {
  if (role === 'system') {
    return (
      <Animated.View entering={FadeInUp.duration(300).delay(index * 50)} style={styles.systemWrapper}>
        <View style={styles.systemBubble}>
          <Text style={styles.systemIcon}>🛡️</Text>
          <Text style={styles.systemText}>{content}</Text>
        </View>
      </Animated.View>
    )
  }

  const isUser = role === 'user'

  return (
    <Animated.View
      entering={isUser ? FadeInDown.duration(300).delay(index * 50) : FadeInUp.duration(300).delay(index * 50)}
      style={[styles.bubbleRow, isUser ? styles.userRow : styles.petRow]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>{petEmoji}</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.petBubble,
        isUser ? { borderBottomRightRadius: theme.radius.sm } : { borderBottomLeftRadius: theme.radius.sm },
      ]}>
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.petText]}>
          {content}
        </Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.md,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  petRow: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubble: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    ...theme.shadows.sm,
  },
  userBubble: {
    backgroundColor: theme.colors.primary[500],
  },
  petBubble: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  bubbleText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
  },
  userText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.medium,
  },
  petText: {
    color: theme.colors.neutral[900],
  },
  systemWrapper: {
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
    maxWidth: '90%',
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warm[50],
    borderWidth: 1,
    borderColor: theme.colors.warm[200],
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  systemIcon: {
    fontSize: 14,
  },
  systemText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warm[500],
    fontWeight: theme.typography.weights.medium,
    flex: 1,
  },
})
