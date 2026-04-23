import type {
  EncodingContext,
  UserMood,
  TimeOfDay,
  SocialContext,
  MemoryFragmentType,
  EvolutionPattern,
  MemoryExtractResult,
  PrivacyLevel,
} from '../types'
import { classifyPrivacyFromContent } from './PrivacyGuard'

let jiebaModule: any = null
let jiebaAvailable = false

async function tryLoadJieba(): Promise<void> {
  if (jiebaModule !== null) return
  try {
    jiebaModule = await import('jieba-node')
    jiebaAvailable = true
    console.log('[CognitiveExtractor] ✅ jieba-node loaded')
  } catch (e: any) {
    jiebaModule = null
    jiebaAvailable = false
    console.warn('[CognitiveExtractor] ⚠️ jieba-node unavailable, using fallback:', e.message)
  }
}

tryLoadJieba()

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

export function getDayOfWeek(): 'weekday' | 'weekend' {
  const day = new Date().getDay()
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

const MOOD_KEYWORDS: Record<UserMood, string[]> = {
  happy: ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '棒', '太好了', '好开心', '幸福', '满足', '愉快', '爽'],
  sad: ['难过', '伤心', '哭', '悲伤', '郁闷', '不开心', '失落', '沮丧', '心痛', '心碎', '想哭'],
  anxious: ['焦虑', '担心', '紧张', '害怕', '不安', '烦躁', '着急', '压力', '慌', '忐忑'],
  excited: ['兴奋', '激动', '期待', '太棒了', '哇', '超级', '终于', '迫不及待', '好激动'],
  angry: ['生气', '愤怒', '烦死', '讨厌', '气死', '受不了', '恼火', '火大', '暴怒', '无语'],
  neutral: [],
}

export function detectUserMood(text: string): UserMood {
  let bestMood: UserMood = 'neutral'
  let bestScore = 0

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS) as [UserMood, string[]][]) {
    let score = 0
    for (const kw of keywords) {
      if (text.includes(kw)) {
        score += kw.length
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMood = mood
    }
  }

  return bestMood
}

export function calculateArousal(text: string, mood: UserMood): number {
  let arousal = 0.3

  const highArousalPatterns = [
    { pattern: /[！!]{2,}/, boost: 0.2 },
    { pattern: /[？?]{2,}/, boost: 0.15 },
    { pattern: /[。…]{3,}/, boost: 0.1 },
    { pattern: /太|超|极|巨|贼|特别|非常|超级|极其/, boost: 0.15 },
    { pattern: /死|完蛋|崩溃|受不了|不行/, boost: 0.2 },
  ]

  for (const { pattern, boost } of highArousalPatterns) {
    if (pattern.test(text)) {
      arousal += boost
    }
  }

  if (mood === 'excited' || mood === 'angry') {
    arousal += 0.25
  } else if (mood === 'happy' || mood === 'sad') {
    arousal += 0.15
  } else if (mood === 'anxious') {
    arousal += 0.2
  }

  return Math.min(arousal, 1.0)
}

export function calculateValence(mood: UserMood): number {
  const valenceMap: Record<UserMood, number> = {
    happy: 0.7,
    excited: 0.8,
    neutral: 0.0,
    anxious: -0.5,
    sad: -0.7,
    angry: -0.8,
  }
  return valenceMap[mood]
}

export function inferSocialContext(text: string): SocialContext {
  if (/同事|公司|老板|开会|客户|上班|办公室/.test(text)) return 'at_work'
  if (/朋友|闺蜜|兄弟|一起|聚会|约/.test(text)) return 'with_friends'
  if (/路上|地铁|公交|打车|开车|通勤/.test(text)) return 'commuting'
  return 'alone'
}

export function captureEncodingContext(
  userMessage: string,
  conversationTopic: string = ''
): EncodingContext {
  const userMood = detectUserMood(userMessage)
  const arousalLevel = calculateArousal(userMessage, userMood)
  const valence = calculateValence(userMood)

  return {
    userMood,
    timeOfDay: getTimeOfDay(),
    dayOfWeek: getDayOfWeek(),
    conversationTopic: conversationTopic || inferTopicFromMessage(userMessage),
    arousalLevel,
    valence,
    socialContext: inferSocialContext(userMessage),
  }
}

function inferTopicFromMessage(text: string): string {
  const topicPatterns: Array<{ pattern: RegExp; topic: string }> = [
    { pattern: /工作|加班|老板|项目|需求|代码|bug|上线/, topic: '工作' },
    { pattern: /吃|喝|美食|火锅|炸鸡|奶茶|做饭|外卖/, topic: '美食' },
    { pattern: /游戏|王者|原神|黑神话|塞尔达|手游/, topic: '游戏' },
    { pattern: /电影|剧|综艺|动漫|追剧|看/, topic: '影视' },
    { pattern: /运动|健身|跑步|游泳|打球|瑜伽/, topic: '运动' },
    { pattern: /旅行|旅游|出去玩|度假|景点/, topic: '旅行' },
    { pattern: /学习|考试|读书|课程|论文|复习/, topic: '学习' },
    { pattern: /家人|父母|妈妈|爸爸|孩子|宝宝/, topic: '家庭' },
    { pattern: /恋爱|对象|男朋友|女朋友|分手|暗恋/, topic: '感情' },
    { pattern: /睡|失眠|熬夜|早起|起床|困/, topic: '睡眠' },
    { pattern: /压力|焦虑|烦|累|崩溃|emo|难过/, topic: '情绪' },
    { pattern: /天气|下雨|热|冷|台风|雪/, topic: '天气' },
  ]

  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(text)) return topic
  }

  return '日常'
}

export function calculateEmotionGatedImportance(
  baseImportance: number,
  encodingContext: EncodingContext
): number {
  let importance = baseImportance

  if (encodingContext.arousalLevel > 0.8) {
    importance = Math.max(importance, 0.85)
  } else if (encodingContext.arousalLevel > 0.6) {
    importance = Math.max(importance, 0.7)
  } else if (encodingContext.arousalLevel > 0.4) {
    importance = Math.max(importance, 0.55)
  }

  if (encodingContext.userMood === 'sad' || encodingContext.userMood === 'angry') {
    importance = Math.min(importance + 0.1, 1.0)
  }

  if (encodingContext.timeOfDay === 'night' && encodingContext.valence < -0.3) {
    importance = Math.min(importance + 0.05, 1.0)
  }

  return Math.round(importance * 100) / 100
}

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '你', '他', '她', '它', '这', '那',
  '有', '不', '都', '也', '就', '会', '能', '要', '什么', '怎么',
  '为什么', '吗', '吧', '啊', '呢', '哦', '嗯', '哈哈', '嘿嘿', '嘻嘻',
  '然后', '所以', '但是', '不过', '如果', '虽然', '因为', '还是', '或者',
  '一个', '这个', '那个', '自己', '他们', '我们', '你们', '什么', '怎样',
  '可以', '已经', '应该', '可能', '需要', '知道', '觉得', '感觉', '想',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'and',
  'but', 'or', 'not', 'no', 'so', 'if', 'it', 'me', 'my', 'your',
])

export function extractKeywordsWithFallback(text: string): string[] {
  if (jiebaAvailable && jiebaModule) {
    try {
      return extractKeywordsJieba(text)
    } catch (e: any) {
      console.warn('[CognitiveExtractor] jieba extraction failed, fallback:', e.message)
    }
  }

  return extractKeywordsBigram(text)
}

function extractKeywordsJieba(text: string): string[] {
  const jieba = jiebaModule

  if (typeof jieba.extract === 'function') {
    const keywords = jieba.extract(text, 8)
    if (Array.isArray(keywords)) {
      return keywords
        .map((k: any) => (typeof k === 'string' ? k : k.word || k.keyword || String(k)))
        .filter((w: string) => w.length >= 2 && !STOP_WORDS.has(w))
        .slice(0, 8)
    }
  }

  if (typeof jieba.cut === 'function') {
    const words = jieba.cut(text, false)
    if (Array.isArray(words)) {
      const freq: Record<string, number> = {}
      for (const w of words) {
        if (w.length >= 2 && !STOP_WORDS.has(w)) {
          freq[w] = (freq[w] || 0) + 1
        }
      }
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([w]) => w)
    }
  }

  return extractKeywordsBigram(text)
}

function extractKeywordsBigram(text: string): string[] {
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
  const keywords: string[] = []
  const seen = new Set<string>()

  const chineseChunks = cleaned.match(/[\u4e00-\u9fa5]{2,}/g) || []
  for (const chunk of chineseChunks) {
    for (let i = 0; i < chunk.length - 1; i++) {
      const bigram = chunk.slice(i, i + 2)
      if (!STOP_WORDS.has(bigram) && !seen.has(bigram)) {
        seen.add(bigram)
        keywords.push(bigram)
      }
    }
    for (let i = 0; i < chunk.length - 2; i++) {
      const trigram = chunk.slice(i, i + 3)
      if (!STOP_WORDS.has(trigram) && !seen.has(trigram)) {
        seen.add(trigram)
        keywords.push(trigram)
      }
    }
  }

  const englishWords = cleaned.match(/[a-zA-Z]{3,}/g) || []
  for (const w of englishWords) {
    const lower = w.toLowerCase()
    if (!STOP_WORDS.has(lower) && !seen.has(lower)) {
      seen.add(lower)
      keywords.push(lower)
    }
  }

  return keywords.slice(0, 8)
}

export function classifyFragmentType(text: string): MemoryFragmentType {
  if (/是|从事|职业|工作|住在|来自|属于|叫|名叫/.test(text)) {
    return 'factual'
  }

  if (/今天|昨天|刚才|刚刚|这周|上周|去了|做了|发生了|遇到/.test(text)) {
    return 'experiential'
  }

  if (/觉得|感觉|认为|希望|讨厌|喜欢|害怕|担心|后悔|遗憾|想|应该/.test(text)) {
    return 'subjective'
  }

  if (/开心|难过|生气|焦虑|兴奋|累|烦|压力|孤独|满足/.test(text)) {
    return 'subjective'
  }

  return 'experiential'
}

export function detectEvolutionPattern(
  newKey: string,
  newValue: string,
  existingFacts: Array<{ key: string; value: string; confidence: number }>
): { pattern: EvolutionPattern; mergedValue?: string } | null {
  for (const fact of existingFacts) {
    if (fact.key === newKey) {
      if (fact.value === newValue) {
        return { pattern: 'reinforcement' }
      }

      if (newValue.length > fact.value.length && newValue.includes(fact.value)) {
        return { pattern: 'refinement', mergedValue: newValue }
      }

      if (isContradictory(fact.value, newValue)) {
        return { pattern: 'contradiction', mergedValue: `${fact.value} → ${newValue}` }
      }

      if (isGeneralizable(fact.key, newKey)) {
        return { pattern: 'generalization', mergedValue: generalizeValues(fact.value, newValue) }
      }
    }

    if (isGeneralizable(fact.key, newKey)) {
      return {
        pattern: 'generalization',
        mergedValue: generalizeValues(fact.value, newValue),
      }
    }
  }

  return null
}

function isContradictory(oldValue: string, newValue: string): boolean {
  const negationPatterns = [
    { pos: /喜欢|爱|想|要/, neg: /不喜欢|讨厌|不爱|不想|不要/ },
    { pos: /是|在|有/, neg: /不是|不在|没有/ },
  ]

  for (const { pos, neg } of negationPatterns) {
    if ((pos.test(oldValue) && neg.test(newValue)) || (neg.test(oldValue) && pos.test(newValue))) {
      return true
    }
  }

  return false
}

function isGeneralizable(key1: string, key2: string): boolean {
  const categoryMap: Record<string, string> = {
    '喜欢火锅': '饮食偏好', '喜欢炸鸡': '饮食偏好', '喜欢奶茶': '饮食偏好',
    '喜欢吃': '饮食偏好', '喜欢喝': '饮食偏好',
    '喜欢看电影': '娱乐偏好', '喜欢听音乐': '娱乐偏好', '喜欢打游戏': '娱乐偏好',
    '工作压力': '压力来源', '生活压力': '压力来源', '经济压力': '压力来源',
  }

  const cat1 = categoryMap[key1]
  const cat2 = categoryMap[key2]
  if (cat1 && cat2 && cat1 === cat2) return true

  if (key1.length >= 2 && key2.length >= 2) {
    const overlap = [...key1].filter(c => key2.includes(c)).length
    if (overlap / Math.max(key1.length, key2.length) > 0.5) return true
  }

  return false
}

function generalizeValues(v1: string, v2: string): string {
  if (/吃|喝|美食|火锅|炸鸡|奶茶/.test(v1) && /吃|喝|美食|火锅|炸鸡|奶茶/.test(v2)) {
    return `${v1}、${v2}`
  }
  if (/看|听|玩|电影|音乐|游戏/.test(v1) && /看|听|玩|电影|音乐|游戏/.test(v2)) {
    return `${v1}、${v2}`
  }
  if (/压力|焦虑|烦|累/.test(v1) && /压力|焦虑|烦|累/.test(v2)) {
    return `${v1}；${v2}`
  }
  return `${v1}、${v2}`
}

export function cognitiveExtract(
  rawText: string,
  petId: string,
  existingFacts?: Array<{ key: string; value: string; confidence: number }>
): MemoryExtractResult {
  const sentences = rawText
    .split(/(?<=[。！？\n；;])/)
    .map(s => s.trim())
    .filter(s => s.length > 4 && s.length < 150)

  const episodic: MemoryExtractResult['episodic'] = []
  const semantic: MemoryExtractResult['semantic'] = []
  const evolutionHints: MemoryExtractResult['evolutionHints'] = []

  for (const sentence of sentences) {
    const privacyLevel = classifyPrivacyFromContent(sentence)
    const keywords = extractKeywordsWithFallback(sentence)
    const fragmentType = classifyFragmentType(sentence)

    if (looksWorthRemembering(sentence)) {
      episodic.push({
        content: sentence,
        privacyLevel,
        tags: keywords.slice(0, 4),
        fragmentType,
        keywords,
      })
    }

    const factPatterns = [
      {
        regex: /(?:我|主人|用户|他|她)(.{0,3})(?:是|喜欢|讨厌|想|会|觉得|认为|从事|在|住|工作)(.{2,30})/,
        extractKey: (m: RegExpMatchArray) => m[2].trim().slice(0, 40),
        extractValue: (m: RegExpMatchArray) => m[2].trim(),
      },
      {
        regex: /(?:喜欢|爱|讨厌|恨|想|要)(.{2,20})/,
        extractKey: (m: RegExpMatchArray) => m[0].trim().slice(0, 40),
        extractValue: (m: RegExpMatchArray) => m[0].trim(),
      },
    ]

    for (const { regex, extractKey, extractValue } of factPatterns) {
      const match = sentence.match(regex)
      if (match) {
        const key = extractKey(match)
        const value = extractValue(match)
        const category = categorizeFact(value)

        semantic.push({
          key,
          value,
          category,
          privacyLevel,
        })

        if (existingFacts && existingFacts.length > 0) {
          const evolution = detectEvolutionPattern(key, value, existingFacts)
          if (evolution) {
            evolutionHints.push({
              key,
              pattern: evolution.pattern,
              mergedValue: evolution.mergedValue,
            })
          }
        }

        break
      }
    }
  }

  return {
    episodic: episodic.slice(0, 3),
    semantic: semantic.slice(0, 3),
    evolutionHints: evolutionHints.length > 0 ? evolutionHints : undefined,
  }
}

function looksWorthRemembering(text: string): boolean {
  const eventIndicators = [
    /今天|昨天|刚才|刚刚|这周|最近|上周|明天|下周/,
    /打算|准备|要去|去了|正在|已经|终于/,
    /说|告诉|提到|聊起|分享/,
    /因为|所以|但是|然后|不过|虽然/,
    /开心|难过|生气|兴奋|累|忙|烦|焦虑|压力|孤独|满足/,
    /喜欢|讨厌|爱|恨|想|希望|害怕|担心/,
    /工作|加班|学习|考试|旅行|搬家|升职|跳槽|分手|恋爱/,
  ]

  const matchCount = eventIndicators.filter(p => p.test(text)).length
  return matchCount >= 1 && text.length > 6
}

function categorizeFact(value: string): 'personality' | 'preference' | 'fact' | 'relationship' {
  if (/喜欢|爱|爱好|兴趣|迷上|沉迷|偏好|口味/.test(value)) return 'preference'
  if (/是.{0,4}(INFP|INTJ|ENTP|[A-Z]{4})|性格|MBTI|内向|外向|敏感|理性|感性/.test(value)) return 'personality'
  if (/工作|职业|公司|学校|住|住在|来自|从事|行业|岗位/.test(value)) return 'fact'
  if (/朋友|闺蜜|兄弟|对象|男|女|恋|婚|家人|父母/.test(value)) return 'relationship'
  return 'preference'
}

export function segmentForFTS(text: string): string {
  const keywords = extractKeywordsWithFallback(text)
  if (keywords.length > 0) {
    return keywords.join(' ')
  }

  const chars = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
  const segments: string[] = []
  for (let i = 0; i < chars.length - 1; i += 2) {
    segments.push(chars.slice(i, i + 2))
  }
  return segments.join(' ')
}
