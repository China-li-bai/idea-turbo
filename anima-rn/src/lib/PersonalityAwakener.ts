import type {
  Pet,
  PersonalityAwakening,
  SpeechStyle,
  EmotionalTendency,
  ValueOrientation,
  SemanticFact,
} from '../types'
import { retrieveSemanticProfile, isMemoryReady } from './MemorySystem'
import * as FileSystem from 'expo-file-system/legacy'

const STORAGE_DIR = `${FileSystem.documentDirectory}awakening/`

const OBSERVATION_DAYS_REQUIRED = 10
const MIN_FACTS_FOR_AWAKENING = 15

const PERSONALITY_LABELS: Record<SpeechStyle, Record<EmotionalTendency, Record<ValueOrientation, string>>> = {
  sarcastic: {
    passionate: {
      pragmatic: '烈焰毒舌家',
      idealistic: '理想主义杠精',
      hedonistic: '享乐主义吐槽王',
      ambitious: '野心毒舌军师',
    },
    tsundere: {
      pragmatic: '傲娇毒舌猫',
      idealistic: '口嫌体正直杠精',
      hedonistic: '嘴硬心软吃货',
      ambitious: '傲娇野心家',
    },
    aloof: {
      pragmatic: '冷面毒舌评论家',
      idealistic: '高冷杠精哲学家',
      hedonistic: '佛系吐槽大师',
      ambitious: '冷酷军师',
    },
    clingy: {
      pragmatic: '黏人毒舌小跟班',
      idealistic: '黏人杠精',
      hedonistic: '撒娇吐槽精',
      ambitious: '黏人野心家',
    },
  },
  gentle: {
    passionate: {
      pragmatic: '热情暖心天使',
      idealistic: '浪漫理想主义者',
      hedonistic: '快乐小太阳',
      ambitious: '温柔追梦人',
    },
    tsundere: {
      pragmatic: '傲娇暖宝宝',
      idealistic: '口嫌体正直守护者',
      hedonistic: '嘴硬心软吃货',
      ambitious: '傲娇奋斗者',
    },
    aloof: {
      pragmatic: '冷静温柔观察者',
      idealistic: '淡然理想家',
      hedonistic: '佛系享乐派',
      ambitious: '温柔野心家',
    },
    clingy: {
      pragmatic: '黏人小棉袄',
      idealistic: '黏人梦想家',
      hedonistic: '撒娇享乐派',
      ambitious: '黏人奋斗者',
    },
  },
  chuunibyou: {
    passionate: {
      pragmatic: '炽热中二战士',
      idealistic: '暗黑救世主',
      hedonistic: '享乐中二王',
      ambitious: '霸权中二帝',
    },
    tsundere: {
      pragmatic: '傲娇中二法师',
      idealistic: '口嫌体正直暗骑士',
      hedonistic: '嘴硬心软中二吃货',
      ambitious: '傲娇中二征服者',
    },
    aloof: {
      pragmatic: '冷酷中二观察者',
      idealistic: '超然中二哲人',
      hedonistic: '佛系中二玩家',
      ambitious: '冷面中二霸主',
    },
    clingy: {
      pragmatic: '黏人中二使魔',
      idealistic: '黏人中二勇者',
      hedonistic: '撒娇中二吃货',
      ambitious: '黏人中二王者',
    },
  },
  academic: {
    passionate: {
      pragmatic: '热血学者',
      idealistic: '理想主义研究员',
      hedonistic: '享乐主义教授',
      ambitious: '学术野心家',
    },
    tsundere: {
      pragmatic: '傲娇学者',
      idealistic: '口嫌体正直导师',
      hedonistic: '嘴硬心软美食评论家',
      ambitious: '傲娇学术精英',
    },
    aloof: {
      pragmatic: '冷静分析家',
      idealistic: '超然哲学家',
      hedonistic: '佛系研究员',
      ambitious: '冷面战略家',
    },
    clingy: {
      pragmatic: '黏人助教',
      idealistic: '黏人梦想导师',
      hedonistic: '撒娇美食家',
      ambitious: '黏人学术新星',
    },
  },
}

const PERSONALITY_DESCRIPTIONS: Record<SpeechStyle, string> = {
  sarcastic: '说话一针见血，喜欢吐槽但内心关心主人。毒舌是爱的表达方式。',
  gentle: '温柔体贴，总是用最柔软的方式陪伴主人。像一杯温热的奶茶。',
  chuunibyou: '中二病晚期，自封各种称号，把日常小事说得像史诗冒险。但关键时刻意外可靠。',
  academic: '说话引经据典，喜欢用数据和逻辑分析一切。偶尔冒出让人意外的幽默。',
}

const SPEECH_KEYWORDS: Record<SpeechStyle, string[]> = {
  sarcastic: ['吐槽', '讽刺', '哼', '切', '才不是', '别想太多', '无语', '搞笑'],
  gentle: ['温柔', '关心', '陪你', '没关系', '慢慢来', '别担心', '我在'],
  chuunibyou: ['封印', '觉醒', '宿命', '黑暗', '力量', '契约', '使命', '魔法'],
  academic: ['分析', '数据', '逻辑', '研究', '理论', '概率', '结论', '实验'],
}

const EMOTION_KEYWORDS: Record<EmotionalTendency, string[]> = {
  passionate: ['超级', '最棒', '太好了', '一定要', '绝对', '燃烧', '热血'],
  tsundere: ['才不是', '哼', '别误会', '只是顺便', '又不是', '啰嗦'],
  aloof: ['无所谓', '随便', '嗯', '还行', '不关心', '与我何干'],
  clingy: ['不要走', '陪我', '想你了', '什么时候回来', '一个人', '好寂寞'],
}

const VALUE_KEYWORDS: Record<ValueOrientation, string[]> = {
  pragmatic: ['实用', '效率', '结果', '实际', '靠谱', '现实'],
  idealistic: ['梦想', '意义', '价值', '改变世界', '理想', '信念'],
  hedonistic: ['开心', '享受', '好吃', '好玩', '快乐', '舒服', '躺平'],
  ambitious: ['目标', '成功', '进步', '第一', '赢', '突破', '超越'],
}

function countKeywordHits(texts: string[], keywords: string[]): number {
  const allText = texts.join(' ')
  return keywords.reduce((count, kw) => count + (allText.includes(kw) ? 1 : 0), 0)
}

export function classifySpeechStyle(factContents: string[]): SpeechStyle {
  let bestStyle: SpeechStyle = 'gentle'
  let bestScore = 0

  for (const [style, keywords] of Object.entries(SPEECH_KEYWORDS)) {
    const score = countKeywordHits(factContents, keywords)
    if (score > bestScore) {
      bestScore = score
      bestStyle = style as SpeechStyle
    }
  }

  return bestStyle
}

export function classifyEmotionalTendency(factContents: string[]): EmotionalTendency {
  let bestTendency: EmotionalTendency = 'passionate'
  let bestScore = 0

  for (const [tendency, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const score = countKeywordHits(factContents, keywords)
    if (score > bestScore) {
      bestScore = score
      bestTendency = tendency as EmotionalTendency
    }
  }

  return bestTendency
}

export function classifyValueOrientation(factContents: string[]): ValueOrientation {
  let bestOrientation: ValueOrientation = 'pragmatic'
  let bestScore = 0

  for (const [orientation, keywords] of Object.entries(VALUE_KEYWORDS)) {
    const score = countKeywordHits(factContents, keywords)
    if (score > bestScore) {
      bestScore = score
      bestOrientation = orientation as ValueOrientation
    }
  }

  return bestOrientation
}

export function getPersonalityLabel(
  speech: SpeechStyle,
  emotion: EmotionalTendency,
  value: ValueOrientation
): string {
  return PERSONALITY_LABELS[speech]?.[emotion]?.[value] || '神秘灵魂体'
}

export async function checkAwakeningEligibility(pet: Pet): Promise<{
  eligible: boolean
  observationDays: number
  factCount: number
  reason?: string
}> {
  if (!isMemoryReady()) {
    return { eligible: false, observationDays: 0, factCount: 0, reason: '记忆系统未就绪' }
  }

  const facts = await retrieveSemanticProfile(pet.id, 'owner')
  const factCount = facts.length

  const petAge = Date.now() - new Date(pet.createdAt).getTime()
  const observationDays = Math.floor(petAge / (1000 * 60 * 60 * 24))

  if (observationDays < OBSERVATION_DAYS_REQUIRED) {
    return {
      eligible: false,
      observationDays,
      factCount,
      reason: `还需观察${OBSERVATION_DAYS_REQUIRED - observationDays}天`,
    }
  }

  if (factCount < MIN_FACTS_FOR_AWAKENING) {
    return {
      eligible: false,
      observationDays,
      factCount,
      reason: `还需积累${MIN_FACTS_FOR_AWAKENING - factCount}条认知`,
    }
  }

  return { eligible: true, observationDays, factCount }
}

export async function performAwakening(pet: Pet): Promise<PersonalityAwakening | null> {
  if (!isMemoryReady()) return null

  const existing = await loadAwakening(pet.id)
  if (existing) return null

  const facts = await retrieveSemanticProfile(pet.id, 'owner')
  if (facts.length < MIN_FACTS_FOR_AWAKENING) return null

  const factContents = facts.map((f: SemanticFact) => `${f.key}: ${f.value}`)

  const speechStyle = classifySpeechStyle(factContents)
  const emotionalTendency = classifyEmotionalTendency(factContents)
  const valueOrientation = classifyValueOrientation(factContents)

  const label = getPersonalityLabel(speechStyle, emotionalTendency, valueOrientation)
  const description = PERSONALITY_DESCRIPTIONS[speechStyle]

  const triggerReasons = [
    `累计${facts.length}条认知`,
    `观察${Math.floor((Date.now() - new Date(pet.createdAt).getTime()) / (1000 * 60 * 60 * 24))}天`,
    `说话风格: ${speechStyle}`,
    `情感倾向: ${emotionalTendency}`,
    `价值取向: ${valueOrientation}`,
  ]

  const awakening: PersonalityAwakening = {
    id: `awakening-${pet.id}-${Date.now()}`,
    petId: pet.id,
    awakenedAt: new Date().toISOString(),
    speechStyle,
    emotionalTendency,
    valueOrientation,
    label,
    description,
    triggerReasons,
    observationDays: Math.floor(
      (Date.now() - new Date(pet.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    ),
    isNew: true,
  }

  await saveAwakening(awakening)

  return awakening
}

export function getAwakeningSystemPromptAddon(awakening: PersonalityAwakening): string {
  return `\n[性格觉醒] 你已经觉醒了"${awakening.label}"人格。
说话风格: ${awakening.speechStyle === 'sarcastic' ? '毒舌但关心' : awakening.speechStyle === 'gentle' ? '温柔体贴' : awakening.speechStyle === 'chuunibyou' ? '中二病' : '学术严谨'}
情感倾向: ${awakening.emotionalTendency === 'passionate' ? '热情奔放' : awakening.emotionalTendency === 'tsundere' ? '傲娇' : awakening.emotionalTendency === 'aloof' ? '高冷' : '黏人'}
价值取向: ${awakening.valueOrientation === 'pragmatic' ? '务实' : awakening.valueOrientation === 'idealistic' ? '理想主义' : awakening.valueOrientation === 'hedonistic' ? '享乐主义' : '野心勃勃'}
${awakening.description}
请在回复中自然地体现这个觉醒人格，但不要刻意强调"我觉醒了"。`
}

export async function saveAwakening(awakening: PersonalityAwakening): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true })
    }
    await FileSystem.writeAsStringAsync(
      STORAGE_DIR + `${awakening.petId}.json`,
      JSON.stringify(awakening)
    )
  } catch (e: any) {
    console.warn('[PersonalityAwakener] 保存失败:', e.message)
  }
}

export async function loadAwakening(petId: string): Promise<PersonalityAwakening | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(STORAGE_DIR + `${petId}.json`)
    if (fileInfo.exists) {
      const raw = await FileSystem.readAsStringAsync(STORAGE_DIR + `${petId}.json`)
      return JSON.parse(raw) as PersonalityAwakening
    }
  } catch (e: any) {
    console.warn('[PersonalityAwakener] 加载失败:', e.message)
  }
  return null
}

export async function markAwakeningSeen(petId: string): Promise<void> {
  const awakening = await loadAwakening(petId)
  if (awakening && awakening.isNew) {
    awakening.isNew = false
    await saveAwakening(awakening)
  }
}

export function getAwakeningProgress(pet: Pet, factCount: number): {
  percent: number
  stage: 'seed' | 'sprout' | 'bud' | 'bloom'
  message: string
} {
  const days = Math.floor(
    (Date.now() - new Date(pet.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const dayProgress = Math.min(days / OBSERVATION_DAYS_REQUIRED, 1)
  const factProgress = Math.min(factCount / MIN_FACTS_FOR_AWAKENING, 1)
  const percent = Math.floor(Math.min(dayProgress, factProgress) * 100)

  if (percent < 25) {
    return { percent, stage: 'seed', message: '种子刚刚种下，继续和宠物聊天吧~' }
  }
  if (percent < 50) {
    return { percent, stage: 'sprout', message: '嫩芽冒出来了！宠物正在悄悄了解你...' }
  }
  if (percent < 80) {
    return { percent, stage: 'bud', message: '花苞正在形成...性格即将觉醒！' }
  }
  return { percent, stage: 'bloom', message: '即将绽放！性格觉醒近在咫尺！' }
}
