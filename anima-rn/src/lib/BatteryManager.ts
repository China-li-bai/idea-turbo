export type PowerMode = 'full' | 'saving' | 'critical'

export interface BatteryState {
  level: number
  isCharging: boolean
  powerMode: PowerMode
}

const POWER_MODE_THRESHOLDS = {
  saving: 30,
  critical: 15,
} as const

let _currentState: BatteryState = {
  level: 100,
  isCharging: true,
  powerMode: 'full',
}

let _listeners = new Set<(state: BatteryState) => void>()

function computePowerMode(level: number, isCharging: boolean): PowerMode {
  if (isCharging) return 'full'
  if (level <= POWER_MODE_THRESHOLDS.critical) return 'critical'
  if (level <= POWER_MODE_THRESHOLDS.saving) return 'saving'
  return 'full'
}

export function updateBatteryState(level: number, isCharging: boolean): BatteryState {
  const powerMode = computePowerMode(level, isCharging)
  _currentState = { level, isCharging, powerMode }

  _listeners.forEach((fn) => fn({ ..._currentState }))
  return { ..._currentState }
}

export function getBatteryState(): BatteryState {
  return { ..._currentState }
}

export function getPowerMode(): PowerMode {
  return _currentState.powerMode
}

export function shouldUseLocalModel(): boolean {
  return _currentState.powerMode !== 'critical'
}

export function shouldUseOnnxEmbedding(): boolean {
  return _currentState.powerMode === 'full'
}

export function getMaxResponseTokens(): number {
  switch (_currentState.powerMode) {
    case 'full':
      return 200
    case 'saving':
      return 100
    case 'critical':
      return 0
  }
}

export function shouldRunConsolidation(): boolean {
  return _currentState.powerMode === 'full' || _currentState.isCharging
}

export type RecommendedModelQuality = 'full' | 'standard' | 'lite' | 'none'

export function getRecommendedModelQuality(): RecommendedModelQuality {
  switch (_currentState.powerMode) {
    case 'full':
      return 'full'
    case 'saving':
      return 'lite'
    case 'critical':
      return 'none'
  }
}

export function shouldAutoUpgradeModel(): boolean {
  return _currentState.powerMode === 'full' && _currentState.isCharging
}

export function subscribeToBatteryState(fn: (state: BatteryState) => void): () => void {
  _listeners.add(fn)
  fn({ ..._currentState })
  return () => {
    void _listeners.delete(fn)
  }
}

export function initBatteryManager(): () => void {
  try {
    const { NativeModules, DeviceEventEmitter } = require('react-native')
    const BatteryManager = NativeModules.BatteryManager

    if (BatteryManager?.getBatteryLevel) {
      BatteryManager.getBatteryLevel?.((level: number) => {
        if (typeof level === 'number' && level >= 0) {
          updateBatteryState(Math.round(level * 100), false)
        }
      })
    }

    const sub = DeviceEventEmitter?.addListener(
      'batteryLevelDidChange',
      (data: { level: number }) => {
        if (typeof data?.level === 'number') {
          const currentCharging = _currentState.isCharging
          updateBatteryState(Math.round(data.level), currentCharging)
        }
      }
    )

    const chargingSub = DeviceEventEmitter?.addListener(
      'batteryChargingDidChange',
      (data: { isCharging: boolean }) => {
        updateBatteryState(_currentState.level, !!data?.isCharging)
      }
    )

    return () => {
      sub?.remove()
      chargingSub?.remove()
    }
  } catch {
    return () => {}
  }
}
