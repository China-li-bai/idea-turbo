import type { PetMood } from './types'
import type { TokenSpeedLevel, BreathPhysicsParams } from './TokenSpeedTracker'

export interface BreathCurveConfig {
  inhaleDuration: number
  exhaleDuration: number
  restDuration: number
  amplitude: number
  glowIntensity: number
  cursorBlinkSpeed: number
  bubbleScalePulse: number
  rippleSpeed: number
}

export interface BreathState {
  phase: 'inhale' | 'exhale' | 'rest'
  progress: number
  scale: number
  glow: number
  cursorOpacity: number
}

const BREATH_CURVE_MAP: Record<TokenSpeedLevel, BreathCurveConfig> = {
  stalled: {
    inhaleDuration: 2000,
    exhaleDuration: 2500,
    restDuration: 1500,
    amplitude: 0.015,
    glowIntensity: 0.15,
    cursorBlinkSpeed: 1200,
    bubbleScalePulse: 0.005,
    rippleSpeed: 3000,
  },
  slow: {
    inhaleDuration: 1500,
    exhaleDuration: 1800,
    restDuration: 800,
    amplitude: 0.025,
    glowIntensity: 0.25,
    cursorBlinkSpeed: 900,
    bubbleScalePulse: 0.01,
    rippleSpeed: 2200,
  },
  normal: {
    inhaleDuration: 1000,
    exhaleDuration: 1200,
    restDuration: 400,
    amplitude: 0.04,
    glowIntensity: 0.4,
    cursorBlinkSpeed: 600,
    bubbleScalePulse: 0.02,
    rippleSpeed: 1500,
  },
  fast: {
    inhaleDuration: 600,
    exhaleDuration: 700,
    restDuration: 200,
    amplitude: 0.06,
    glowIntensity: 0.6,
    cursorBlinkSpeed: 350,
    bubbleScalePulse: 0.035,
    rippleSpeed: 900,
  },
  burst: {
    inhaleDuration: 350,
    exhaleDuration: 400,
    restDuration: 100,
    amplitude: 0.09,
    glowIntensity: 0.85,
    cursorBlinkSpeed: 180,
    bubbleScalePulse: 0.05,
    rippleSpeed: 500,
  },
}

const MOOD_BREATH_MODIFIER: Record<PetMood, {
  amplitudeMultiplier: number
  glowMultiplier: number
  speedMultiplier: number
}> = {
  idle: { amplitudeMultiplier: 1.0, glowMultiplier: 1.0, speedMultiplier: 1.0 },
  thinking: { amplitudeMultiplier: 0.7, glowMultiplier: 0.6, speedMultiplier: 0.8 },
  typing: { amplitudeMultiplier: 1.0, glowMultiplier: 1.0, speedMultiplier: 1.0 },
  sniffing: { amplitudeMultiplier: 1.3, glowMultiplier: 0.8, speedMultiplier: 1.2 },
  listening: { amplitudeMultiplier: 0.8, glowMultiplier: 0.5, speedMultiplier: 0.9 },
  happy: { amplitudeMultiplier: 1.4, glowMultiplier: 1.3, speedMultiplier: 1.3 },
  excited: { amplitudeMultiplier: 1.8, glowMultiplier: 1.6, speedMultiplier: 1.5 },
  sad: { amplitudeMultiplier: 0.5, glowMultiplier: 0.4, speedMultiplier: 0.6 },
  angry: { amplitudeMultiplier: 1.5, glowMultiplier: 1.4, speedMultiplier: 1.4 },
  sleepy: { amplitudeMultiplier: 0.4, glowMultiplier: 0.3, speedMultiplier: 0.5 },
  curious: { amplitudeMultiplier: 1.2, glowMultiplier: 1.1, speedMultiplier: 1.1 },
  love: { amplitudeMultiplier: 1.3, glowMultiplier: 1.5, speedMultiplier: 1.1 },
  surprised: { amplitudeMultiplier: 1.6, glowMultiplier: 1.3, speedMultiplier: 1.4 },
  shy: { amplitudeMultiplier: 0.6, glowMultiplier: 0.5, speedMultiplier: 0.7 },
}

export function getBreathCurve(speedLevel: TokenSpeedLevel, mood: PetMood = 'idle'): BreathCurveConfig {
  const base = BREATH_CURVE_MAP[speedLevel]
  const mod = MOOD_BREATH_MODIFIER[mood]

  return {
    inhaleDuration: Math.round(base.inhaleDuration / mod.speedMultiplier),
    exhaleDuration: Math.round(base.exhaleDuration / mod.speedMultiplier),
    restDuration: Math.round(base.restDuration / mod.speedMultiplier),
    amplitude: base.amplitude * mod.amplitudeMultiplier,
    glowIntensity: Math.min(1, base.glowIntensity * mod.glowMultiplier),
    cursorBlinkSpeed: Math.round(base.cursorBlinkSpeed / mod.speedMultiplier),
    bubbleScalePulse: base.bubbleScalePulse * mod.amplitudeMultiplier,
    rippleSpeed: Math.round(base.rippleSpeed / mod.speedMultiplier),
  }
}

export function getBreathPhysicsForCurve(
  speedLevel: TokenSpeedLevel,
  mood: PetMood = 'idle'
): BreathPhysicsParams {
  const curve = getBreathCurve(speedLevel, mood)
  const mod = MOOD_BREATH_MODIFIER[mood]

  const baseStiffness = 120
  const baseDamping = 15
  const baseMass = 0.8

  const speedFactor = (curve.inhaleDuration + curve.exhaleDuration) / 2000

  return {
    stiffness: Math.round(baseStiffness * mod.speedMultiplier / speedFactor),
    damping: Math.round(baseDamping / mod.speedMultiplier * speedFactor),
    mass: Math.round(baseMass * 100) / 100,
    overshootClamping: speedLevel === 'stalled' || speedLevel === 'slow',
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.05,
  }
}

export function computeBreathState(
  timeMs: number,
  curve: BreathCurveConfig
): BreathState {
  const cycleDuration = curve.inhaleDuration + curve.exhaleDuration + curve.restDuration
  const cycleProgress = (timeMs % cycleDuration) / cycleDuration

  const inhaleRatio = curve.inhaleDuration / cycleDuration
  const exhaleRatio = curve.exhaleDuration / cycleDuration

  let phase: BreathState['phase']
  let phaseProgress: number

  if (cycleProgress < inhaleRatio) {
    phase = 'inhale'
    phaseProgress = cycleProgress / inhaleRatio
  } else if (cycleProgress < inhaleRatio + exhaleRatio) {
    phase = 'exhale'
    phaseProgress = (cycleProgress - inhaleRatio) / exhaleRatio
  } else {
    phase = 'rest'
    phaseProgress = (cycleProgress - inhaleRatio - exhaleRatio) / (1 - inhaleRatio - exhaleRatio)
  }

  let scale: number
  if (phase === 'inhale') {
    scale = 1 + curve.amplitude * easeInOutSine(phaseProgress)
  } else if (phase === 'exhale') {
    scale = 1 + curve.amplitude * (1 - easeInOutSine(phaseProgress))
  } else {
    scale = 1
  }

  const glow = phase === 'rest'
    ? curve.glowIntensity * 0.5
    : curve.glowIntensity * (0.5 + 0.5 * Math.sin(phaseProgress * Math.PI))

  const cursorOpacity = phase === 'rest'
    ? 0.3
    : 0.3 + 0.7 * Math.sin(phaseProgress * Math.PI)

  return { phase, progress: phaseProgress, scale, glow, cursorOpacity }
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

export function getStreamingCursorAnimation(
  speedLevel: TokenSpeedLevel,
  mood: PetMood = 'idle'
): { blinkDuration: number; width: number; height: number; glowRadius: number } {
  const curve = getBreathCurve(speedLevel, mood)

  return {
    blinkDuration: curve.cursorBlinkSpeed,
    width: speedLevel === 'burst' ? 3 : 2,
    height: speedLevel === 'burst' ? 20 : 16,
    glowRadius: Math.round(curve.glowIntensity * 8),
  }
}

export function getBubblePulseAnimation(
  speedLevel: TokenSpeedLevel,
  mood: PetMood = 'idle'
): { scaleAmplitude: number; duration: number; glowSpread: number } {
  const curve = getBreathCurve(speedLevel, mood)

  return {
    scaleAmplitude: curve.bubbleScalePulse,
    duration: curve.inhaleDuration + curve.exhaleDuration,
    glowSpread: Math.round(curve.glowIntensity * 6),
  }
}
