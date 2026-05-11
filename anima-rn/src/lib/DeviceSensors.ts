import { useState, useEffect, useRef, useCallback } from 'react'

export interface DeviceMotionData {
  alpha: number
  beta: number
  gamma: number
}

export interface AccelerometerData {
  x: number
  y: number
  z: number
}

export interface ShakeEvent {
  timestamp: number
  intensity: number
}

export interface DeviceSensorsState {
  motion: DeviceMotionData | null
  acceleration: AccelerometerData | null
  isShaking: boolean
  isFaceDown: boolean
  isPortrait: boolean
  lastShake: ShakeEvent | null
}

const SHAKE_THRESHOLD = 1.5
const SHAKE_COOLDOWN = 500

export function useDeviceSensors(enabled = true): DeviceSensorsState {
  const [state, setState] = useState<DeviceSensorsState>({
    motion: null,
    acceleration: null,
    isShaking: false,
    isFaceDown: false,
    isPortrait: true,
    lastShake: null,
  })

  const lastShakeTime = useRef(0)
  const subscriptionRefs = useRef<any[]>([])

  useEffect(() => {
    if (!enabled) return

    let Gyroscope: any = null
    let Accelerometer: any = null

    try {
      const sensors = require('expo-sensors')
      Gyroscope = sensors.Gyroscope
      Accelerometer = sensors.Accelerometer
    } catch {
      console.warn('[DeviceSensors] expo-sensors not available')
      return
    }

    if (Accelerometer) {
      Accelerometer.setUpdateInterval(100)
      const sub = Accelerometer.addListener((data: AccelerometerData) => {
        const now = Date.now()
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2)
        const isShaking = magnitude > SHAKE_THRESHOLD
        const isFaceDown = data.z < -0.8
        const isPortrait = Math.abs(data.y) > Math.abs(data.x)

        if (isShaking && now - lastShakeTime.current > SHAKE_COOLDOWN) {
          lastShakeTime.current = now
          setState(prev => ({
            ...prev,
            acceleration: data,
            isShaking: true,
            isFaceDown,
            isPortrait,
            lastShake: { timestamp: now, intensity: magnitude },
          }))

          setTimeout(() => {
            setState(prev => ({ ...prev, isShaking: false }))
          }, 600)
        } else {
          setState(prev => ({
            ...prev,
            acceleration: data,
            isFaceDown,
            isPortrait,
          }))
        }
      })
      subscriptionRefs.current.push(sub)
    }

    if (Gyroscope) {
      Gyroscope.setUpdateInterval(100)
      const sub = Gyroscope.addListener((data: DeviceMotionData) => {
        setState(prev => ({
          ...prev,
          motion: data,
        }))
      })
      subscriptionRefs.current.push(sub)
    }

    return () => {
      subscriptionRefs.current.forEach(sub => {
        try { sub.remove() } catch {}
      })
      subscriptionRefs.current = []
    }
  }, [enabled])

  return state
}

export interface PetPhysicsResponse {
  tiltX: number
  tiltY: number
  wobble: number
  shouldFall: boolean
  fallDirection: 'left' | 'right' | null
}

export function usePetPhysics(sensors: DeviceSensorsState): PetPhysicsResponse {
  const tiltX = sensors.acceleration ? sensors.acceleration.x * 8 : 0
  const tiltY = sensors.acceleration ? sensors.acceleration.y * 5 : 0
  const wobble = sensors.isShaking ? Math.random() * 20 - 10 : 0
  const shouldFall = sensors.isShaking
  const fallDirection = sensors.acceleration
    ? sensors.acceleration.x > 0.3
      ? 'right'
      : sensors.acceleration.x < -0.3
        ? 'left'
        : null
    : null

  return { tiltX, tiltY, wobble, shouldFall, fallDirection }
}
