import { useState, useCallback, useRef, useEffect } from 'react'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export interface VoicePipelineConfig {
  language?: string
  vadThreshold?: number
  silenceTimeout?: number
  maxRecordingDuration?: number
}

export interface VoiceResult {
  transcript: string
  confidence: number
  duration: number
  timestamp: number
}

const DEFAULT_CONFIG: VoicePipelineConfig = {
  language: 'zh-CN',
  vadThreshold: 0.5,
  silenceTimeout: 2000,
  maxRecordingDuration: 30000,
}

export function useVoicePipeline(config: VoicePipelineConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const [state, setState] = useState<VoiceState>('idle')
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTTSAvailable, setIsTTSAvailable] = useState(false)

  const recordingRef = useRef<any>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioLevelRef = useRef<number[]>([])

  useEffect(() => {
    checkTTSAvailability()
  }, [])

  const checkTTSAvailability = async () => {
    try {
      const speech = require('expo-speech')
      const available = await speech.isSpeakingAsync().catch(() => false)
      setIsTTSAvailable(true)
    } catch {
      setIsTTSAvailable(false)
    }
  }

  const startListening = useCallback(async () => {
    setState('listening')
    setError(null)
    audioLevelRef.current = []

    try {
      const { Audio } = require('expo-av')

      await Audio.requestPermissionsAsync()

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      })

      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY)
      await recording.startAndRecordAsync()
      recordingRef.current = recording

      silenceTimerRef.current = setTimeout(() => {
        stopListening()
      }, mergedConfig.maxRecordingDuration)

    } catch (err: any) {
      console.warn('[VoicePipeline] Start listening failed:', err?.message)
      setError(err?.message || '无法启动录音')
      setState('idle')
    }
  }, [mergedConfig.maxRecordingDuration])

  const stopListening = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    setState('processing')

    try {
      const recording = recordingRef.current
      if (!recording) {
        setState('idle')
        return
      }

      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      recordingRef.current = null

      const { Audio } = require('expo-av')
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      })

      const result: VoiceResult = {
        transcript: '',
        confidence: 0,
        duration: 0,
        timestamp: Date.now(),
      }

      setLastResult(result)
      setState('idle')

      return result

    } catch (err: any) {
      console.warn('[VoicePipeline] Stop listening failed:', err?.message)
      setError(err?.message || '录音处理失败')
      setState('idle')
      return null
    }
  }, [])

  const speak = useCallback(async (text: string, options?: {
    language?: string
    pitch?: number
    rate?: number
    onStart?: () => void
    onDone?: () => void
  }) => {
    if (!isTTSAvailable) {
      console.warn('[VoicePipeline] TTS not available')
      return
    }

    setState('speaking')

    try {
      const Speech = require('expo-speech')
      await Speech.speak(text, {
        language: options?.language || mergedConfig.language,
        pitch: options?.pitch || 1.0,
        rate: options?.rate || 0.9,
        onStart: () => {
          options?.onStart?.()
        },
        onDone: () => {
          setState('idle')
          options?.onDone?.()
        },
        onStopped: () => {
          setState('idle')
          options?.onDone?.()
        },
      })
    } catch (err: any) {
      console.warn('[VoicePipeline] TTS failed:', err?.message)
      setState('idle')
    }
  }, [isTTSAvailable, mergedConfig.language])

  const stopSpeaking = useCallback(async () => {
    try {
      const Speech = require('expo-speech')
      await Speech.stop()
      setState('idle')
    } catch {}
  }, [])

  const cancel = useCallback(async () => {
    if (state === 'listening') {
      try {
        const recording = recordingRef.current
        if (recording) {
          await recording.stopAndUnloadAsync()
          recordingRef.current = null
        }
      } catch {}
    }
    if (state === 'speaking') {
      await stopSpeaking()
    }
    setState('idle')
    setError(null)
  }, [state, stopSpeaking])

  return {
    state,
    lastResult,
    error,
    isTTSAvailable,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    cancel,
  }
}

export interface PetVoiceProfile {
  species: string
  baseRate: number
  basePitch: number
  moodModifiers: Record<string, { rate?: number; pitch?: number }>
}

const DEFAULT_VOICE_PROFILES: Record<string, PetVoiceProfile> = {
  cat: {
    species: 'cat',
    baseRate: 0.85,
    basePitch: 1.2,
    moodModifiers: {
      happy: { rate: 0.95, pitch: 1.3 },
      sad: { rate: 0.7, pitch: 1.0 },
      excited: { rate: 1.1, pitch: 1.4 },
      sleepy: { rate: 0.6, pitch: 1.0 },
      love: { rate: 0.8, pitch: 1.25 },
      angry: { rate: 1.0, pitch: 1.1 },
      curious: { rate: 0.9, pitch: 1.3 },
      shy: { rate: 0.7, pitch: 1.15 },
    },
  },
  dog: {
    species: 'dog',
    baseRate: 0.9,
    basePitch: 1.1,
    moodModifiers: {
      happy: { rate: 1.05, pitch: 1.2 },
      excited: { rate: 1.15, pitch: 1.35 },
      sad: { rate: 0.75, pitch: 0.95 },
      sleepy: { rate: 0.65, pitch: 0.95 },
      love: { rate: 0.85, pitch: 1.15 },
    },
  },
  rabbit: {
    species: 'rabbit',
    baseRate: 0.95,
    basePitch: 1.35,
    moodModifiers: {
      happy: { rate: 1.0, pitch: 1.4 },
      curious: { rate: 1.05, pitch: 1.45 },
      shy: { rate: 0.75, pitch: 1.3 },
    },
  },
}

export function getPetVoiceProfile(species: string): PetVoiceProfile {
  return DEFAULT_VOICE_PROFILES[species] || DEFAULT_VOICE_PROFILES.cat
}

export function getVoiceParamsForMood(
  profile: PetVoiceProfile,
  mood: string
): { rate: number; pitch: number } {
  const modifier = profile.moodModifiers[mood] || {}
  return {
    rate: modifier.rate || profile.baseRate,
    pitch: modifier.pitch || profile.basePitch,
  }
}

export const PET_VOICE_CUES: Record<string, Record<string, string>> = {
  cat: {
    thinking: '嗯~',
    affirmative: '喵~',
    greeting: '喵呜~',
    surprised: '喵！',
    content: '呼噜~',
    question: '喵？',
  },
  dog: {
    thinking: '嗯...',
    affirmative: '汪！',
    greeting: '汪汪~',
    surprised: '汪！？',
    content: '呼~',
    question: '汪？',
  },
  rabbit: {
    thinking: '...',
    affirmative: '嗯嗯~',
    greeting: '~',
    surprised: '！',
    content: '~',
    question: '？',
  },
}

export function getPetVoiceCue(species: string, cueType: string): string | null {
  return PET_VOICE_CUES[species]?.[cueType] || PET_VOICE_CUES.cat[cueType] || null
}
