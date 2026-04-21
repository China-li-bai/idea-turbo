import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { theme, dark } from '../../theme'

interface CyberGlassProps {
  children: React.ReactNode
  style?: ViewStyle
  intensity?: number
  borderLight?: boolean
  glow?: string
  tint?: 'light' | 'dark' | 'neon'
}

export function CyberGlass({
  children,
  style,
  intensity = 0.1,
  borderLight = true,
  glow,
  tint = 'dark',
}: CyberGlassProps) {
  const baseOpacity = Math.min(Math.max(intensity, 0), 0.3)

  const backgroundColor = tint === 'light' 
    ? `rgba(255, 255, 255, ${baseOpacity * 0.6})`
    : `rgba(30, 30, 42, ${baseOpacity})`

  const borderColor = borderLight 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'transparent'

  return (
    <View 
      style={[
        styles.glassContainer, 
        {
          backgroundColor,
          borderColor,
          borderWidth: borderLight ? 1 : 0,
        },
        style,
      ]}
    >
      {glow && intensity > 0.15 && (
        <View 
          style={[
            styles.glowEffect,
            {
              backgroundColor: glow,
              opacity: intensity * 1.5,
              shadowColor: glow,
            },
          ]} 
        />
      )}

      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  )
}

export function GlassCard({
  children,
  style,
  ...props
}: CyberGlassProps & { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <CyberGlass
      {...props}
      intensity={0.15}
    >
      <View style={[styles.glassCard, style]}>
        {children}
      </View>
    </CyberGlass>
  )
}

export function GlassButton({
  children,
  onPress,
  style,
  ...props
}: CyberGlassProps & {
  children: React.ReactNode
  onPress?: () => void
  style?: ViewStyle
}) {
  return (
    <CyberGlass
      {...props}
      intensity={0.2}
    >
      <View style={[styles.glassButton, style]}>
        {children}
      </View>
    </CyberGlass>
  )
}

const glassStyles = StyleSheet.create({
  glassContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  contentContainer: {
    position: 'relative',
    zIndex: 1,
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  glassCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  glassButton: {
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
})

const styles = glassStyles
