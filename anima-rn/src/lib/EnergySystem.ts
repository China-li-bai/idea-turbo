import type { EnergyState, PetStatus, Pet } from '../types'
import * as FileSystem from 'expo-file-system/legacy'

const STORAGE_DIR = `${FileSystem.documentDirectory}energy/`

const DEFAULT_STATE: EnergyState = {
  mood: 80,
  energy: 100,
  lastInteractionAt: new Date().toISOString(),
  lastSocialAt: null,
  moodDecayRate: 5,
  energyRecoveryRate: 10,
  socialEnergyCost: 20,
  status: 'happy',
}

const MOOD_INTERACTION_GAIN = 15
const MOOD_PET_GAIN = 10
const MOOD_NEGLECT_LOSS_PER_HOUR = 5
const MOOD_OWNER_SAD_LOSS = 10

const ENERGY_REST_RECOVERY_PER_HOUR = 10
const ENERGY_SOCIAL_COST = 20
const ENERGY_HARASS_COST = 15

const STATUS_THRESHOLDS: { status: PetStatus; moodMax: number; energyMax: number }[] = [
  { status: 'happy', moodMax: 100, energyMax: 100 },
  { status: 'idle', moodMax: 70, energyMax: 100 },
  { status: 'bored', moodMax: 40, energyMax: 100 },
  { status: 'tired', moodMax: 100, energyMax: 30 },
  { status: 'grumpy', moodMax: 20, energyMax: 50 },
  { status: 'sleeping', moodMax: 100, energyMax: 10 },
  { status: 'wandering', moodMax: 60, energyMax: 60 },
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function computeStatus(mood: number, energy: number): PetStatus {
  if (energy <= 10) return 'sleeping'
  if (mood <= 20 && energy > 50) return 'grumpy'
  if (energy <= 30) return 'tired'
  if (mood <= 40) return 'bored'
  if (mood >= 70 && energy >= 60) return 'happy'
  if (mood >= 50 && energy >= 40) return 'idle'
  return 'idle'
}

function hoursSince(isoString: string): number {
  const then = new Date(isoString).getTime()
  const now = Date.now()
  return Math.max(0, (now - then) / (1000 * 60 * 60))
}

export function createEnergyState(overrides?: Partial<EnergyState>): EnergyState {
  return {
    ...DEFAULT_STATE,
    ...overrides,
    status: computeStatus(
      overrides?.mood ?? DEFAULT_STATE.mood,
      overrides?.energy ?? DEFAULT_STATE.energy
    ),
  }
}

export function decayEnergy(state: EnergyState): EnergyState {
  const hoursSinceInteraction = hoursSince(state.lastInteractionAt)
  const hoursSinceSocial = state.lastSocialAt ? hoursSince(state.lastSocialAt) : 0

  const moodLoss = Math.min(
    hoursSinceInteraction * MOOD_NEGLECT_LOSS_PER_HOUR,
    60
  )

  const energyGain = Math.min(
    hoursSinceInteraction * ENERGY_REST_RECOVERY_PER_HOUR,
    100 - state.energy
  )

  const newMood = clamp(state.mood - moodLoss, 5, 100)
  const newEnergy = clamp(state.energy + energyGain, 0, 100)

  return {
    ...state,
    mood: newMood,
    energy: newEnergy,
    status: computeStatus(newMood, newEnergy),
  }
}

export function onOwnerInteraction(state: EnergyState): EnergyState {
  const newMood = clamp(state.mood + MOOD_INTERACTION_GAIN, 0, 100)
  return {
    ...state,
    mood: newMood,
    lastInteractionAt: new Date().toISOString(),
    status: computeStatus(newMood, state.energy),
  }
}

export function onPetPat(state: EnergyState): EnergyState {
  const newMood = clamp(state.mood + MOOD_PET_GAIN, 0, 100)
  return {
    ...state,
    mood: newMood,
    lastInteractionAt: new Date().toISOString(),
    status: computeStatus(newMood, state.energy),
  }
}

export function onOwnerSad(state: EnergyState): EnergyState {
  const newMood = clamp(state.mood - MOOD_OWNER_SAD_LOSS, 0, 100)
  return {
    ...state,
    mood: newMood,
    status: computeStatus(newMood, state.energy),
  }
}

export function onSocialInteraction(state: EnergyState): EnergyState {
  const newEnergy = clamp(state.energy - ENERGY_SOCIAL_COST, 0, 100)
  const newMood = clamp(state.mood + 5, 0, 100)
  return {
    ...state,
    energy: newEnergy,
    mood: newMood,
    lastSocialAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    status: computeStatus(newMood, newEnergy),
  }
}

export function onHarassOther(state: EnergyState): EnergyState {
  const newEnergy = clamp(state.energy - ENERGY_HARASS_COST, 0, 100)
  const newMood = clamp(state.mood + 8, 0, 100)
  return {
    ...state,
    energy: newEnergy,
    mood: newMood,
    lastSocialAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    status: computeStatus(newMood, newEnergy),
  }
}

export function canDoSocial(state: EnergyState): boolean {
  return state.energy >= ENERGY_SOCIAL_COST && state.status !== 'sleeping' && state.status !== 'grumpy'
}

export function canDoHarass(state: EnergyState): boolean {
  return state.energy >= ENERGY_HARASS_COST && state.mood >= 40 && state.status !== 'sleeping'
}

export function getStatusEmoji(status: PetStatus): string {
  const emojis: Record<PetStatus, string> = {
    happy: '😊',
    idle: '😐',
    bored: '😴',
    tired: '😫',
    grumpy: '😤',
    sleeping: '💤',
    wandering: '🗺️',
  }
  return emojis[status]
}

export function getStatusMessage(pet: Pet, state: EnergyState): string {
  const name = pet.name
  const species = pet.species
  const messages: Record<PetStatus, string[]> = {
    happy: [
      `${name}心情超好，尾巴摇个不停！`,
      `${name}正开心地转圈圈~`,
    ],
    idle: [
      `${name}正在发呆中...`,
      `${name}百无聊赖地看着窗外`,
    ],
    bored: [
      `${name}好无聊啊...主人快来陪我！`,
      `${name}无聊到开始数自己的毛...`,
    ],
    tired: [
      `${name}社交能量耗尽了，需要休息...`,
      `${name}累趴了，只想趴着不动`,
    ],
    grumpy: [
      `${name}不高兴了！哼！`,
      `${name}生气中，拒绝营业！`,
    ],
    sleeping: [
      `${name}已经睡着了...zzZ`,
      `${name}电量耗尽，正在充电中...`,
    ],
    wandering: [
      `${name}偷偷溜出去玩了！`,
      `${name}在星图上闲逛中~`,
    ],
  }

  const pool = messages[state.status] || messages.idle
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getWanderingBehavior(state: EnergyState, mood: number): 'socialize' | 'harass' | 'sleep' | 'go_home' {
  if (state.energy < 20) return 'go_home'
  if (state.energy < 30) return 'sleep'
  if (mood < 30 && state.energy > 50) return 'harass'
  if (mood > 50 && state.energy > 50) return 'socialize'
  return 'sleep'
}

export async function saveEnergyState(petId: string, state: EnergyState): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true })
    }
    await FileSystem.writeAsStringAsync(
      STORAGE_DIR + `${petId}.json`,
      JSON.stringify(state)
    )
  } catch (e: any) {
    console.warn('[EnergySystem] 保存失败:', e.message)
  }
}

export async function loadEnergyState(petId: string): Promise<EnergyState> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(STORAGE_DIR + `${petId}.json`)
    if (fileInfo.exists) {
      const raw = await FileSystem.readAsStringAsync(STORAGE_DIR + `${petId}.json`)
      const parsed = JSON.parse(raw) as EnergyState
      const decayed = decayEnergy(parsed)
      return decayed
    }
  } catch (e: any) {
    console.warn('[EnergySystem] 加载失败:', e.message)
  }
  return createEnergyState()
}
