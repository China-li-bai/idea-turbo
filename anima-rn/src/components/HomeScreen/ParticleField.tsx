import React from 'react'
import { Canvas, Circle, useClock, Group, vec } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'
import { StyleSheet, View } from 'react-native'

interface Particle {
  id: number
  baseX: number
  baseY: number
  radius: number
  orbitRadius: number
  orbitSpeed: number
  phase: number
  opacity: number
}

interface ParticleFieldProps {
  brainActivity?: number
  particleCount?: number
  centerOffset?: { x: number; y: number }
  color?: string
}

function generateParticles(count: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const orbitRadius = 80 + Math.random() * 120
    particles.push({
      id: i,
      baseX: Math.cos(angle) * orbitRadius,
      baseY: Math.sin(angle) * orbitRadius,
      radius: 1 + Math.random() * 2.5,
      orbitRadius,
      orbitSpeed: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.3 + Math.random() * 0.5,
    })
  }
  return particles
}

const DEFAULT_PARTICLES = generateParticles(24)

function ParticleSystem({
  brainActivity = 1,
  particleCount = 24,
  centerOffset = { x: 0, y: -50 },
  color = '#6366f1',
}: ParticleFieldProps) {
  const clock = useClock()
  const centerX = 187.5 + centerOffset.x
  const centerY = 350 + centerOffset.y

  const particles = particleCount !== 24 ? generateParticles(particleCount) : DEFAULT_PARTICLES

  return (
    <Group>
      {particles.map((particle) => {
        const transform = useDerivedValue(() => {
          const t = clock.value * 0.001 * particle.orbitSpeed * brainActivity
          const wobble = Math.sin(t * 2.3 + particle.phase) * 15 * brainActivity
          const x = centerX + particle.baseX + wobble
          const y = centerY + particle.baseY + Math.cos(t * 1.7 + particle.phase) * 10 * brainActivity
          const pulseScale = 1 + Math.sin(t * 4 + particle.phase) * 0.3 * brainActivity

          return [
            { translateX: x },
            { translateY: y },
            { scale: pulseScale },
          ]
        })

        const opacity = useDerivedValue(() => {
          const t = clock.value * 0.001
          const baseOpacity = particle.opacity
          const flicker = Math.sin(t * 3 + particle.phase) * 0.2 + 0.8
          const activityBoost = 0.5 + brainActivity * 0.5
          return baseOpacity * flicker * activityBoost
        })

        return (
          <Circle
            key={particle.id}
            cx={0}
            cy={0}
            r={particle.radius}
            color={color}
            opacity={opacity}
            transform={transform}
          />
        )
      })}
    </Group>
  )
}

export function ParticleField(props: ParticleFieldProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={{ flex: 1 }}>
        <ParticleSystem {...props} />
      </Canvas>
    </View>
  )
}

export default ParticleField
