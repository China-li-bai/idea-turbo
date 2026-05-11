import { useState, useEffect, useRef, useCallback } from 'react'
import { getPowerMode, subscribeToBatteryState, type PowerMode } from './BatteryManager'

export type DormancyLevel = 'active' | 'drowsy' | 'dormant'

export interface DormancyState {
  level: DormancyLevel
  targetFPS: number
  dimOverlay: number
  particleMultiplier: number
  animationSpeed: number
  shouldShowSleepIndicator: boolean
}

const DORMANCY_CONFIG: Record<DormancyLevel, Omit<DormancyState, 'level'>> = {
  active: {
    targetFPS: 60,
    dimOverlay: 0,
    particleMultiplier: 1.0,
    animationSpeed: 1.0,
    shouldShowSleepIndicator: false,
  },
  drowsy: {
    targetFPS: 30,
    dimOverlay: 0.15,
    particleMultiplier: 0.5,
    animationSpeed: 0.6,
    shouldShowSleepIndicator: true,
  },
  dormant: {
    targetFPS: 12,
    dimOverlay: 0.4,
    particleMultiplier: 0.2,
    animationSpeed: 0.3,
    shouldShowSleepIndicator: true,
  },
}

const IDLE_TIMEOUT_DROWSY = 30 * 1000
const IDLE_TIMEOUT_DORMANT = 90 * 1000

export function useDormancyController(interactionDetected: boolean): DormancyState {
  const [level, setLevel] = useState<DormancyLevel>('active')
  const lastInteractionRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const powerModeRef = useRef<PowerMode>('full')

  useEffect(() => {
    const unsub = subscribeToBatteryState((state) => {
      powerModeRef.current = state.powerMode
    })
    return unsub
  }, [])

  useEffect(() => {
    if (interactionDetected) {
      lastInteractionRef.current = Date.now()
      if (level !== 'active') {
        setLevel('active')
      }
    }
  }, [interactionDetected, level])

  useEffect(() => {
    const checkDormancy = () => {
      const elapsed = Date.now() - lastInteractionRef.current
      const powerMode = powerModeRef.current

      if (powerMode === 'critical') {
        setLevel('dormant')
        return
      }

      if (powerMode === 'saving') {
        if (elapsed > IDLE_TIMEOUT_DROWSY / 2) {
          setLevel('dormant')
        } else {
          setLevel('drowsy')
        }
        return
      }

      if (elapsed > IDLE_TIMEOUT_DORMANT) {
        setLevel('dormant')
      } else if (elapsed > IDLE_TIMEOUT_DROWSY) {
        setLevel('drowsy')
      } else {
        setLevel('active')
      }
    }

    const interval = setInterval(checkDormancy, 5000)
    checkDormancy()

    return () => clearInterval(interval)
  }, [])

  const config = DORMANCY_CONFIG[level]
  return { level, ...config }
}

export function useAnimationFrameThrottle(targetFPS: number): (callback: () => void) => void {
  const lastFrameRef = useRef(0)
  const intervalRef = useRef(1000 / targetFPS)

  useEffect(() => {
    intervalRef.current = 1000 / targetFPS
  }, [targetFPS])

  const scheduleFrame = useCallback((callback: () => void) => {
    const now = performance.now()
    const elapsed = now - lastFrameRef.current

    if (elapsed >= intervalRef.current) {
      lastFrameRef.current = now
      callback()
    }
  }, [])

  return scheduleFrame
}

export function getDormancyDimColor(level: DormancyLevel): string {
  switch (level) {
    case 'active': return 'transparent'
    case 'drowsy': return 'rgba(0, 0, 20, 0.15)'
    case 'dormant': return 'rgba(0, 0, 20, 0.4)'
  }
}
