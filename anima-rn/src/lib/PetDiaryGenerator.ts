import { SPECIES_CONFIG, type Pet, type PetDiary, type UserMood } from '../types'
import {
  isMemoryReady,
  retrieveRelevantEpisodic,
  retrieveSemanticProfile,
} from './MemorySystem'
import { captureEncodingContext } from './CognitiveMemoryExtractor'

const DIARY_PROMPT_TEMPLATE = `你是{petName}，一只{speciesLabel}{speciesEmoji}。
今天是{date}，你要用你的视角写一篇关于主人今天的日记。

规则：
1. 用第一人称"我"来写，你是宠物
2. 语气要{toneHint}，偶尔吐槽但充满爱
3. 引用主人今天说过的话（用「」标注）
4. 最后写一句对主人的悄悄话
5. 字数100-200字
6. 不要用"作为一只猫/狗"这种句式

主人今天的情况：
{ownerContext}

你对主人的了解：
{ownerFacts}

请直接写日记，不要加标题和日期：`

const DIARY_HIGHLIGHT_PROMPT = `从以下宠物日记中提取3个最有趣/最感人的关键点，每个不超过15字，用JSON数组格式返回：
{diaryContent}

只返回JSON数组，例如：["关键点1","关键点2","关键点3"]`

const OWNER_SUMMARY_PROMPT = `用一句话（不超过20字）总结主人今天的状态，从宠物视角出发：
主人今天：{context}

只返回一句话：`

const DIARY_FALLBACKS: Record<UserMood, string[]> = {
  happy: [
    '今天主人笑了好多次！我偷偷数了，至少5次。每次主人笑的时候，我的尾巴就不自觉地摇起来。虽然我假装没在注意，但其实我全都记住了。',
    '主人今天心情超好的！空气都是甜的（也可能是主人偷吃了蛋糕）。总之，主人开心我就开心，这是本{species}的生存法则。',
  ],
  sad: [
    '今天主人好像不太开心...我试着蹭蹭主人的手，主人摸了摸我的头。虽然我听不懂人类所有的烦恼，但我知道陪着就好。',
    '主人今天叹了好多次气。我悄悄靠过去，假装在睡觉，其实一直在听。希望明天主人能笑一笑。',
  ],
  neutral: [
    '又是平凡的一天。主人做了平常的事，说了平常的话。但我觉得，能这样平平淡淡地陪着主人，也挺好的。',
    '今天没什么特别的事发生。主人照常忙碌，我照常等待。不过主人回来的时候，我的尾巴还是诚实地摇了。',
  ],
  anxious: [
    '主人今天好像很焦虑，一直在忙。我试着用头蹭蹭主人，主人说"等一下"。没关系，我可以等，我最擅长等主人了。',
    '主人今天压力好大的样子...我在旁边守着，偶尔叫一声提醒主人还有我在。希望主人知道，不管怎样都有我。',
  ],
  excited: [
    '主人今天超级兴奋！一直在说话，语速好快！虽然我只听懂了一半，但主人的快乐是有传染性的！{sound}！',
    '哇今天主人好high！连我都跟着兴奋起来了！主人开心的时候整个房间都是亮的，这是真的！',
  ],
  angry: [
    '主人今天生气了...我缩在角落里，不敢太靠近。但等主人冷静下来，我慢慢走过去蹭了蹭。主人叹了口气抱住了我。',
    '主人今天火气好大。我保持安全距离观察着，等风暴过去。作为一只{species}，我知道有时候沉默的陪伴比什么都强。',
  ],
}

let _diaryContext: any = null

function getDiaryContext() {
  if (!_diaryContext) {
    try {
      const LocalBrain = require('./LocalBrain')
      _diaryContext = LocalBrain
    } catch {
      _diaryContext = null
    }
  }
  return _diaryContext
}

async function runCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { n_predict?: number; temperature?: number }
): Promise<string | null> {
  const ctx = getDiaryContext()
  if (!ctx) return null

  try {
    const brainState = ctx.getBrainState()
    if (!brainState?.isLoaded) return null

    const llamaContext = (ctx as any)._getLlamaContext?.() || null
    if (!llamaContext) return null

    const result = await llamaContext.completion({
      messages,
      n_predict: options?.n_predict || 256,
      temperature: options?.temperature ?? 0.8,
      top_k: 40,
      top_p: 0.95,
      stop: ['</s>', '<|im_end|>', '\n\n\n'],
    })

    return result.text?.trim() || null
  } catch {
    return null
  }
}

function getToneHint(personality: string[]): string {
  if (personality.includes('sarcastic')) return '毒舌但关心'
  if (personality.includes('proud')) return '傲娇但在意'
  if (personality.includes('gentle')) return '温柔细腻'
  if (personality.includes('playful')) return '活泼调皮'
  if (personality.includes('nerdy')) return '一本正经地吐槽'
  if (personality.includes('philosophical')) return '深沉哲理'
  if (personality.includes('lazy')) return '慵懒随性'
  if (personality.includes('talkative')) return '话痨碎碎念'
  return '可爱真诚'
}

function getSpeciesSound(species: Pet['species']): string {
  return SPECIES_CONFIG[species]?.sound || '嗯'
}

function formatDate(date: Date): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = weekdays[date.getDay()]
  return `${m}月${d}日 星期${w}`
}

function detectMoodFromMemories(memories: string[]): UserMood {
  const text = memories.join(' ')
  const moodKeywords: Record<UserMood, string[]> = {
    happy: ['开心', '高兴', '快乐', '哈哈', '棒', '太好了', '喜欢'],
    sad: ['难过', '伤心', '哭', '悲伤', '郁闷', '不开心', '失落'],
    anxious: ['焦虑', '紧张', '压力', '担心', '害怕', '烦', '急'],
    excited: ['兴奋', '激动', '超棒', '太棒', '终于', '期待', '哇'],
    angry: ['生气', '愤怒', '烦死', '讨厌', '气死', '受不了'],
    neutral: [],
  }

  let bestMood: UserMood = 'neutral'
  let bestScore = 0

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestMood = mood as UserMood
    }
  }

  return bestMood
}

export async function generateDiary(pet: Pet): Promise<PetDiary> {
  const now = new Date()
  const dateStr = formatDate(now)
  const speciesInfo = SPECIES_CONFIG[pet.species]
  const sound = getSpeciesSound(pet.species)

  let ownerContext = '主人今天没有和我聊天，我一直在等...'
  let ownerFacts = '我还在了解主人中...'
  let mood: UserMood = 'neutral'

  if (isMemoryReady()) {
    try {
      const recentMemories = await retrieveRelevantEpisodic(
        pet.id,
        '今天发生了什么',
        'owner',
        5
      )

      if (recentMemories.length > 0) {
        const memorySummaries = recentMemories
          .slice(0, 5)
          .map((m, i) => `${i + 1}. 「${m.content.slice(0, 60)}」`)
          .join('\n')
        ownerContext = `主人今天说了这些：\n${memorySummaries}`
        mood = detectMoodFromMemories(recentMemories.map((m) => m.content))
      }

      const encodingCtx = captureEncodingContext('')
      if (encodingCtx.userMood !== 'neutral') {
        mood = encodingCtx.userMood
      }

      const facts = await retrieveSemanticProfile(pet.id, 'owner')
      if (facts.length > 0) {
        ownerFacts = facts
          .slice(0, 5)
          .map((f: { key: string; value: string }) => `- ${f.key}: ${f.value}`)
          .join('\n')
      }
    } catch (e: any) {
      console.warn('[PetDiary] 记忆检索失败:', e.message)
    }
  }

  const prompt = DIARY_PROMPT_TEMPLATE
    .replace('{petName}', pet.name)
    .replace('{speciesLabel}', speciesInfo.label)
    .replace('{speciesEmoji}', speciesInfo.emoji)
    .replace('{date}', dateStr)
    .replace('{toneHint}', getToneHint(pet.personality))
    .replace('{ownerContext}', ownerContext)
    .replace('{ownerFacts}', ownerFacts)

  let content: string | null = null

  try {
    content = await runCompletion(
      [
        {
          role: 'system',
          content: '你是一只正在写日记的宠物，用宠物的视角和语气写作。只返回日记内容。',
        },
        { role: 'user', content: prompt },
      ],
      { n_predict: 300, temperature: 0.85 }
    )
  } catch (e: any) {
    console.warn('[PetDiary] AI生成失败:', e.message)
  }

  if (!content || content.length < 20) {
    const fallbacks = DIARY_FALLBACKS[mood]
    content = fallbacks[Math.floor(Math.random() * fallbacks.length)]
      .replace(/{species}/g, speciesInfo.label)
      .replace(/{sound}/g, sound)
  }

  let highlights: string[] = []
  try {
    const hlResult = await runCompletion(
      [
        {
          role: 'system',
          content: '你是一个关键点提取器，只返回JSON数组。',
        },
        {
          role: 'user',
          content: DIARY_HIGHLIGHT_PROMPT.replace('{diaryContent}', content),
        },
      ],
      { n_predict: 80, temperature: 0.3 }
    )

    if (hlResult) {
      const parsed = JSON.parse(hlResult)
      if (Array.isArray(parsed)) {
        highlights = parsed.slice(0, 3).map(String)
      }
    }
  } catch {
    highlights = content!.slice(0, 45).split(/[。！？]/).filter(Boolean).slice(0, 3)
  }

  let ownerSummary = ''
  try {
    const summaryResult = await runCompletion(
      [
        {
          role: 'system',
          content: '你是一句话总结器，只返回一句话。',
        },
        {
          role: 'user',
          content: OWNER_SUMMARY_PROMPT.replace(
            '{context}',
            ownerContext.slice(0, 100)
          ),
        },
      ],
      { n_predict: 40, temperature: 0.5 }
    )
    ownerSummary = summaryResult || '主人今天如常度过'
  } catch {
    ownerSummary = '主人今天如常度过'
  }

  return {
    id: `diary-${pet.id}-${now.toISOString().slice(0, 10)}`,
    petId: pet.id,
    date: now.toISOString().slice(0, 10),
    content: content!,
    mood,
    highlights,
    ownerSummary,
    createdAt: now.toISOString(),
  }
}

export async function generateDiaryIfNeeded(pet: Pet, lastDiaryDate?: string): Promise<PetDiary | null> {
  const today = new Date().toISOString().slice(0, 10)
  if (lastDiaryDate === today) return null

  const hour = new Date().getHours()
  if (hour < 20) return null

  return generateDiary(pet)
}

export function getDiaryFallback(pet: Pet, mood: UserMood): PetDiary {
  const now = new Date()
  const speciesInfo = SPECIES_CONFIG[pet.species]
  const sound = getSpeciesSound(pet.species)
  const fallbacks = DIARY_FALLBACKS[mood]
  const content = fallbacks[Math.floor(Math.random() * fallbacks.length)]
    .replace(/{species}/g, speciesInfo.label)
    .replace(/{sound}/g, sound)

  return {
    id: `diary-${pet.id}-${now.toISOString().slice(0, 10)}`,
    petId: pet.id,
    date: now.toISOString().slice(0, 10),
    content,
    mood,
    highlights: content.slice(0, 45).split(/[。！？]/).filter(Boolean).slice(0, 3),
    ownerSummary: mood === 'happy' ? '主人今天很开心' : '主人今天如常度过',
    createdAt: now.toISOString(),
  }
}
