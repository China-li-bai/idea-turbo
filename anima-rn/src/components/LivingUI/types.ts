export type PetMood =
  | 'idle'
  | 'thinking'
  | 'typing'
  | 'sniffing'
  | 'listening'
  | 'happy'
  | 'excited'
  | 'sad'
  | 'angry'
  | 'sleepy'
  | 'curious'
  | 'love'
  | 'surprised'
  | 'shy'

export type ActivityState = 'idle' | 'streaming' | 'waiting' | 'error'

export interface MoodTransition {
  from: PetMood
  to: PetMood
  duration: number
}

export const MOOD_STATE_VALUES: Record<PetMood, number> = {
  idle: 0,
  thinking: 1,
  typing: 2,
  sniffing: 3,
  listening: 4,
  happy: 5,
  excited: 6,
  sad: 7,
  angry: 8,
  sleepy: 9,
  curious: 10,
  love: 11,
  surprised: 12,
  shy: 13,
}

export const MOOD_LABELS: Record<PetMood, string> = {
  idle: '发呆',
  thinking: '思考中',
  typing: '打字中',
  sniffing: '闻气味',
  listening: '倾听',
  happy: '开心',
  excited: '兴奋',
  sad: '难过',
  angry: '生气',
  sleepy: '困了',
  curious: '好奇',
  love: '喜爱',
  surprised: '惊讶',
  shy: '害羞',
}

export const MOOD_EMOJI: Record<PetMood, string> = {
  idle: '😶',
  thinking: '🤔',
  typing: '⌨️',
  sniffing: '👃',
  listening: '👂',
  happy: '😊',
  excited: '🎉',
  sad: '😢',
  angry: '😠',
  sleepy: '😴',
  curious: '🧐',
  love: '🥰',
  surprised: '😲',
  shy: '🙈',
}

export const RIVE_STATE_MACHINE_NAME = 'PetMoodController'
export const RIVE_MOOD_INPUT = 'mood'

export const ACTIVITY_TO_MOOD_MAP: Record<ActivityState, PetMood> = {
  idle: 'idle',
  streaming: 'typing',
  waiting: 'listening',
  error: 'sad',
}

export const AI_MOOD_KEYWORDS: Record<PetMood, string[]> = {
  idle: [],
  thinking: ['思考', '想想', '让我想', '嗯...', '考虑'],
  typing: [],
  sniffing: ['闻', '嗅', '味道', '气味'],
  listening: ['听', '说吧', '我在听'],
  happy: ['开心', '高兴', '太好了', '哈哈', '耶', '棒', '喜欢'],
  excited: ['太兴奋', '哇', '超棒', '激动', '厉害'],
  sad: ['难过', '伤心', '可惜', '遗憾', '呜', '唉'],
  angry: ['生气', '讨厌', '烦', '气死', '哼'],
  sleepy: ['困', '累', '想睡', '好困', '哈欠'],
  curious: ['好奇', '什么', '为什么', '怎么', '疑问'],
  love: ['爱你', '最喜欢', '宝贝', '亲亲', '抱抱'],
  surprised: ['天哪', '不会吧', '什么', '竟然'],
  shy: ['害羞', '不好意思', '嘿嘿', '脸红'],
}

export function detectMoodFromText(text: string): PetMood {
  const lowerText = text.toLowerCase()
  for (const [mood, keywords] of Object.entries(AI_MOOD_KEYWORDS)) {
    if (keywords.length === 0) continue
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return mood as PetMood
      }
    }
  }
  return 'idle'
}

export function getMoodValue(mood: PetMood): number {
  return MOOD_STATE_VALUES[mood] ?? 0
}
