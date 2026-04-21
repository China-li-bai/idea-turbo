import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { theme, petTheme } from '../../theme'
import type { MessageRole, PetSpecies } from '../../types'

interface StaticBubbleProps {
  id: string
  content: string
  role: MessageRole
  petEmoji?: string
  species?: PetSpecies
  index?: number
}

export function StaticBubble({
  content,
  role,
  petEmoji = '🐱',
  species = 'cat',
  index = 0,
}: StaticBubbleProps) {
  const petColors = petTheme[species] || petTheme.cat

  if (role === 'system') {
    return (
      <Animated.View
        entering={FadeInUp.duration(300).delay(Math.min(index * 30, 300))}
        style={styles.systemWrapper}
      >
        <View style={[styles.systemBubble, { borderColor: petColors.primary + '25' }]}>
          <Text style={styles.systemIcon}>✨</Text>
          <Text style={[styles.systemText, { color: petColors.primaryDark }]} selectable>
            {content}
          </Text>
        </View>
      </Animated.View>
    )
  }

  const isUser = role === 'user'

  return (
    <Animated.View
      entering={
        isUser
          ? FadeInDown.duration(300).delay(Math.min(index * 30, 300))
          : FadeInUp.duration(300).delay(Math.min(index * 30, 300))
      }
      style={[styles.bubbleRow, isUser ? styles.userRow : styles.petRow]}
    >
      {!isUser && (
        <View style={[styles.avatarContainer, { backgroundColor: petColors.bg }]}>
          <Text style={styles.avatarEmoji}>{petEmoji}</Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: petColors.primary }]
              : [styles.petBubble, { borderColor: petColors.primary + '20' }],
            isUser
              ? { borderBottomRightRadius: theme.radius.sm }
              : { borderBottomLeftRadius: theme.radius.sm },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.userText : [styles.petText, { color: petColors.primaryDark }],
            ]}
            selectable
          >
            {content}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.md,
    maxWidth: '88%',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  petRow: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[200],
  },
  avatarEmoji: {
    fontSize: 18,
  },
  bubbleWrapper: {
    position: 'relative',
  },
  bubble: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    ...theme.shadows.sm,
  },
  userBubble: {
    borderBottomRightRadius: theme.radius.sm,
  },
  petBubble: {
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderBottomLeftRadius: theme.radius.sm,
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
    fontWeight: theme.typography.weights.medium,
  },
  systemWrapper: {
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
    maxWidth: '92%',
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  systemIcon: {
    fontSize: 14,
  },
  systemText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    flex: 1,
  },
})
