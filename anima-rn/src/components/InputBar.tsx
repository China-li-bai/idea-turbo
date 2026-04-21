import React from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { theme } from '../theme'

interface InputBarProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  placeholder?: string
  editable?: boolean
  maxLength?: number
}

export function InputBar({
  value,
  onChangeText,
  onSend,
  placeholder = '说点什么...',
  editable = true,
  maxLength = 500,
}: InputBarProps) {
  const canSend = value.trim().length > 0 && editable

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
      </View>
      <TouchableOpacity
        style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnInactive]}
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        <Text style={[styles.sendBtnText, canSend && styles.sendBtnTextActive]}>↑</Text>
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
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
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
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: theme.colors.primary[500],
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
