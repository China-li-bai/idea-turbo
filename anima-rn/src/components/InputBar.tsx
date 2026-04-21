import React from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { theme, petTheme } from '../theme'
import type { PetSpecies } from '../types'

interface InputBarProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  placeholder?: string
  editable?: boolean
  maxLength?: number
  species?: PetSpecies
}

export function InputBar({
  value,
  onChangeText,
  onSend,
  placeholder = '说点什么...',
  editable = true,
  maxLength = 500,
  species = 'cat',
}: InputBarProps) {
  const canSend = value.trim().length > 0 && editable
  const petColors = petTheme[species] || petTheme.cat

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, !editable && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.neutral[400]}
          multiline
          maxLength={maxLength}
          editable={editable}
        />
        {value.length > 0 && (
          <Text style={styles.charCount}>{value.length}/{maxLength}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.sendBtn,
          canSend
            ? [styles.sendBtnActive, { backgroundColor: petColors.primary }]
            : styles.sendBtnInactive,
        ]}
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        <Text style={[styles.sendBtnText, canSend && styles.sendBtnTextActive]}>
          ↑
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    gap: theme.spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[200],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    maxHeight: 120,
  },
  input: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[900],
    minHeight: 24,
    maxHeight: 100,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  charCount: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
    textAlign: 'right',
    marginTop: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  sendBtnActive: {
    transform: [{ scale: 1 }],
  },
  sendBtnInactive: {
    backgroundColor: theme.colors.neutral[200],
  },
  sendBtnText: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.neutral[400],
  },
  sendBtnTextActive: {
    color: theme.colors.white,
  },
})
