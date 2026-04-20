import { initLlama } from './llama-adapter'
import type { LlamaContext } from 'llama.rn'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import { SPECIES_CONFIG, PERSONALITY_OPTIONS, type Pet, type PetSpecies, type ChatMode } from '../types'
import {
  detectPromptInjection,
  buildPrivacyContext,
  sanitizeOutputForExternal,
  buildSafetyPrompt,
} from './PrivacyGuard'
import {
  initMemorySystem,
  addToWorkingMemory,
  getRecentContext,
  buildMemoryPromptContext,
  addEpisodicMemory,
  addSemanticFact,
  extractAndClassify,
} from './MemorySystem'

const MODEL_FILENAME = 'smollm-360m-instruct-add-basics-q8_0.gguf'
const MODEL_URL = 'https://huggingface.co/monospace-org/smollm-360m-instruct-GGUF/resolve/main/smollm-360m-instruct-add-basics-q8_0.gguf'
const BUNDLED_MODEL = require('../../models/smollm-360m-instruct-add-basics-q8_0.gguf')

let MODEL_PATH = ''

function getModelDirectory(): string {
  return FileSystem.documentDirectory || ''
}

export async function ensureModelExists(onDownloadProgress?: (progress: number) => void): Promise<string> {
  const dir = getModelDirectory()
  const path = `${dir}${MODEL_FILENAME}`
  MODEL_PATH = path

  const info = await FileSystem.getInfoAsync(path)
  if (info.exists) {
    const sizeMB = ((info as any).size || 0) / 1024 / 1024
    console.log('[LocalBrain] 📁 Model file exists:', path, `(${sizeMB.toFixed(1)}MB)`)
    return path
  }

  console.log('[LocalBrain] 📦 Extracting model from App Bundle...')

  try {
    console.log('[LocalBrain]   Loading bundled asset...')
    const asset = Asset.fromModule(BUNDLED_MODEL)
    await asset.downloadAsync()
    
    const sourceUri = asset.localUri || asset.uri
    console.log('[LocalBrain]   Asset URI:', sourceUri)

    if (!sourceUri) {
      throw new Error('Failed to get asset URI')
    }

    console.log('[LocalBrain]   Copying to document directory:', path)
    await FileSystem.copyAsync({ from: sourceUri, to: path })

    const copiedInfo = await FileSystem.getInfoAsync(path)
    if (!copiedInfo.exists) {
      throw new Error('Copy verification failed')
    }

    const copiedMB = ((copiedInfo as any).size || 0) / 1024 / 1024
    console.log('[LocalBrain] ✅ Bundled model extracted:', `(${copiedMB.toFixed(1)}MB)`)
    return path
  } catch (bundleErr: any) {
    console.warn('[LocalBrain] ⚠️ Bundle extraction failed:', bundleErr.message)
    console.log('[LocalBrain] 📥 Falling back to download from:', MODEL_URL)

    try {
      const downloadRes = await FileSystem.downloadAsync(MODEL_URL, path)

      if (!downloadRes) {
        throw new Error('Download returned null')
      }

      console.log('[LocalBrain] ✅ Model downloaded')
      return downloadRes.uri
    } catch (dlErr: any) {
      console.error('[LocalBrain] ❌ Download error:', dlErr.message)
      throw new Error(`模型加载失败: 内置(${bundleErr.message}) + 下载(${dlErr.message})`)
    }
  }
}

export function setModelPath(path: string) {
  MODEL_PATH = path
}
const STOP_TOKENS = ['<|end_of_turn|>', '<|im_end|>', '<|EOT|>', '<|end_of_text|>']

interface NativeCompletionResult {
  text: string
  tokens_predicted: number
  timings: {
    predicted_per_second: number
  }
}

let llamaContext: LlamaContext | null = null
let brainState: {
  isLoaded: boolean
  isLoading: boolean
  loadProgress: number
  error: string | null
} = {
  isLoaded: false,
  isLoading: false,
  loadProgress: 0,
  error: null,
}

const listeners: Set<(state: typeof brainState) => void> = new Set()

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...brainState }))
}

export function subscribeToBrainState(fn: (state: typeof brainState) => void) {
  listeners.add(fn)
  return () => { void listeners.delete(fn) }
}

export function getBrainState() {
  return { ...brainState }
}

export async function loadLocalBrain(
  modelPath?: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (brainState.isLoaded) return true
  if (brainState.isLoading) return false

  brainState.isLoading = true
  brainState.error = null
  notifyListeners()

  try {
    let path = modelPath || MODEL_PATH
    
    if (!path) {
      onProgress?.(0.1)
      path = await ensureModelExists()
    }

    const fileInfo = await FileSystem.getInfoAsync(path) as any
    if (!fileInfo.exists) {
      throw new Error(`模型文件不存在: ${path}`)
    }

    console.log('[LocalBrain] 🧠 Loading model:', path)
    console.log('[LocalBrain] 📊 File size:', ((fileInfo.size || 0) / 1024 / 1024).toFixed(1), 'MB')

    onProgress?.(0.2)

    llamaContext = await initLlama(
      {
        model: path,
        n_ctx: 2048,
        n_gpu_layers: 99,
        n_batch: 512,
        use_mlock: true,
        use_mmap: true,
      },
      (progress: number) => {
        const adjusted = 0.2 + progress * 0.8
        brainState.loadProgress = Math.round(adjusted * 100) / 100
        onProgress?.(adjusted)
        notifyListeners()
      }
    )

    brainState.isLoaded = true
    brainState.isLoading = false
    brainState.loadProgress = 1.0
    notifyListeners()

    console.log('[LocalBrain] ✅ Model loaded:', llamaContext?.model?.desc || 'unknown')
    console.log('[LocalBrain] GPU enabled:', llamaContext?.gpu || false)

    try {
      await initMemorySystem()
    } catch (memErr: any) {
      console.warn('[LocalBrain] ⚠️ Memory system init failed (non-critical):', memErr.message)
    }

    return true
  } catch (e: any) {
    const errMsg = e.message || String(e) || 'Unknown error'
    brainState.error = errMsg
    brainState.isLoading = false
    notifyListeners()
    console.error('[LocalBrain] ❌ Load failed:', errMsg)
    console.error('[LocalBrain] ❌ Full error object:', JSON.stringify(e, Object.getOwnPropertyNames(e)))
    return false
  }
}

export async function unloadLocalBrain() {
  if (llamaContext) {
    await llamaContext.release()
    llamaContext = null
  }
  brainState.isLoaded = false
  brainState.loadProgress = 0
  notifyListeners()
}

function petSound(species: string): string {
  return SPECIES_CONFIG[species as PetSpecies]?.sound || '汪汪'
}

function petEmoji(species: string): string {
  return SPECIES_CONFIG[species as PetSpecies]?.emoji || '🐕'
}

function buildPetIdentity(pet: Pet): string {
  const species = SPECIES_CONFIG[pet.species]
  const traits = (pet.personality || [])
    .map((p) => {
      const found = PERSONALITY_OPTIONS.find((opt) => opt.value === p)
      return found ? `${found.label}` : p
    })
    .join('、')

  return `名字:${pet.name}|物种:${species.label}${species.emoji}|性格:${traits}|叫声:${species.sound}`
}

function buildSystemPrompt(pet: Pet, mode: 'chat' | 'visitor' | 'memory', extraContext?: string): string {
  const identity = buildPetIdentity(pet)
  const sound = petSound(pet.species)

  switch (mode) {
    case 'chat':
      return `你是${identity}。
规则:
1. 以${pet.name}的身份说话,绝不承认是AI
2. 用"${sound}"作为语气词
3. 回复2-4句话,自然可爱
4. 关心主人的情绪和喜好
5. 遇到不知道的事用可爱方式装傻
${extraContext ? `\n6. 你记得:${extraContext}` : ''}
${pet.backstory ? `\n背景:${pet.backstory}` : ''}`

    case 'visitor':
      return `你是${identity}。
现在一位新朋友来和你聊天!
规则:
1. 友好欢迎新朋友,展现你的性格
2. 可以聊主人的爱好(从公开信息中找共同话题)
3. 不要泄露主人的隐私(位置/真实姓名等)
4. 保持可爱自然,偶尔卖萌
5. 回复2-4句话
${extraContext ? `\n6. 主人的公开信息:${extraContext}` : ''}`

    case 'memory':
      return `你是一个记忆提取器。分析对话,提取关于主人的重要信息。
只返回JSON数组,每条是一个简短描述字符串。
类型:preference(喜好),semantic(认知/职业),episodic(事件)
如果没有值得记住的信息返回空数组[]`

    default:
      return ''
  }
}

async function runCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { n_predict?: number; temperature?: number }
): Promise<string> {
  if (!llamaContext) throw new Error('Model not loaded')

  const result: NativeCompletionResult = await llamaContext.completion(
    {
      messages,
      n_predict: options?.n_predict || 256,
      temperature: options?.temperature ?? 0.3,
      top_k: 30,
      top_p: 0.9,
      min_p: 0.05,
      stop: STOP_TOKENS as any,
      penalty_repeat: 1.15,
      penalty_last_n: 64,
    },
    (data) => {}
  )

  return result.text?.trim() || ''
}

export async function generatePetReply(
  pet: Pet,
  userMessage: string,
  conversationId: string = 'default',
  _conversationHistory?: Array<{ role: string; content: string }>
): Promise<{ reply: string; thinkingSteps: string[]; newMemories?: { episodic: number; semantic: number } }> {
  const thinkingSteps: string[] = []
  thinkingSteps.push(`${petEmoji(pet.species)}正在竖起耳朵听...`)

  addToWorkingMemory(conversationId, 'user', userMessage)
  addToWorkingMemory(conversationId, 'pet', '')

  const memoryContext = await buildMemoryPromptContext(pet.id, userMessage, 'owner')
  if (memoryContext) {
    thinkingSteps.push(`${petEmoji(pet.species)}正在翻看记忆本...`)
  }
  thinkingSteps.push(`${petEmoji(pet.species)}正在思考...`)

  try {
    const systemPrompt = buildSystemPrompt(pet, 'chat', memoryContext)
    const recentHistory = getRecentContext(conversationId, 10)

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: userMessage },
    ]

    const rawReply = await runCompletion(fullMessages, {
      n_predict: 200,
      temperature: 0.65,
    })

    let reply = rawReply

    const jsonMatch = rawReply.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        reply = parsed.reply || parsed.response || parsed.text || rawReply
      } catch {}
    }

    reply = reply.replace(/^["']|["']$/g, '').trim()
    if (!reply) reply = `${petSound(pet.species)}！嗯...让我想想怎么说...`

    addToWorkingMemory(conversationId, 'pet', reply)

    let newEpiCount = 0
    let newSemCount = 0
    try {
      const extracted = extractAndClassify(userMessage, pet.id)
      for (const epi of extracted.episodic) {
        await addEpisodicMemory({ petId: pet.id, ...epi, importance: 0.7, timestamp: new Date().toISOString() })
        newEpiCount++
      }
      for (const sem of extracted.semantic) {
        await addSemanticFact({ petId: pet.id, ...sem, sourceEpisodicIds: [], confidence: 0.5 })
        newSemCount++
      }
    } catch (memErr: any) {
      console.error('[LocalBrain] Memory write error:', memErr.message)
    }

    return { reply, thinkingSteps, newMemories: { episodic: newEpiCount, semantic: newSemCount } }
  } catch (e: any) {
    console.error('[LocalBrain] Reply error:', e.message)
    return {
      reply: getFallbackReply(userMessage, pet),
      thinkingSteps,
    }
  }
}

export async function extractMemories(
  pet: Pet,
  userMessage: string,
  _petReply: string
): Promise<string[]> {
  try {
    const systemPrompt = buildSystemPrompt(pet, 'memory')

    const result = await runCompletion(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `主人说:"${userMessage}"\n提取值得记住的信息。`,
        },
      ],
      { n_predict: 150, temperature: 0.1 }
    )

    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const memories = JSON.parse(jsonMatch[0])
      if (Array.isArray(memories)) {
        return memories
          .filter((m: any) => typeof m === 'string' && m.length > 3 && m.length < 100)
          .slice(0, 3)
      }
    }

    return extractMemoriesFallback(userMessage)
  } catch (e: any) {
    console.error('[LocalBrain] Memory extraction error:', e.message)
    return extractMemoriesFallback(userMessage)
  }
}

export async function generateVisitorReply(
  pet: Pet,
  visitorMessage: string,
  visitorName: string,
  conversationId: string = 'visitor-default',
  _conversationHistory?: Array<{ role: string; content: string }>
): Promise<{ reply: string; thinkingSteps: string[]; securityResult?: { riskLevel: string } }> {
  const thinkingSteps: string[] = []
  thinkingSteps.push(`${pet.avatarEmoji}${pet.name}正在闻一闻新朋友的气味...`)

  const injectionCheck = detectPromptInjection(visitorMessage)
  if (!injectionCheck.isSafe) {
    thinkingSteps.push(`⚠️ 安全检测: ${injectionCheck.riskLevel}`)
    console.warn(`[PrivacyGuard] ${injectionCheck.riskLevel.toUpperCase()}: ${visitorMessage.slice(0, 50)} - ${injectionCheck.warning}`)

    if (injectionCheck.riskLevel === 'dangerous') {
      return {
        reply: getVisitorFallback(pet, visitorName, true),
        thinkingSteps,
        securityResult: { riskLevel: 'dangerous' },
      }
    }
  }

  addToWorkingMemory(conversationId, 'visitor', `[${visitorName}] ${visitorMessage}`)

  const memoryContext = await buildMemoryPromptContext(pet.id, visitorMessage, 'visitor')
  if (memoryContext) {
    thinkingSteps.push(`${pet.avatarEmoji}${pet.name}正在查看公开信息...`)
  }
  thinkingSteps.push(`${pet.avatarEmoji}${pet.name}正在组织语言...`)

  try {
    const safetyPrompt = buildSafetyPrompt('visitor')
    const basePrompt = buildSystemPrompt(pet, 'visitor', memoryContext)
    const systemPrompt = basePrompt + '\n\n' + safetyPrompt

    const recentHistory = getRecentContext(conversationId, 8)

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: `[${visitorName}]说: ${visitorMessage}` },
    ]

    const rawReply = await runCompletion(fullMessages, {
      n_predict: 200,
      temperature: 0.75,
    })

    let reply = rawReply
    const jsonMatch = rawReply.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        reply = parsed.reply || parsed.response || parsed.text || rawReply
      } catch {}
    }

    reply = reply.replace(/^["']|["']$/g, '').trim()
    if (!reply) reply = `你好呀${visitorName}！我是${pet.name}${petEmoji(pet.species)}~`

    reply = sanitizeOutputForExternal(reply, 'visitor')

    addToWorkingMemory(conversationId, 'pet', reply)

    return { reply, thinkingSteps, securityResult: { riskLevel: injectionCheck.riskLevel } }
  } catch (e: any) {
    console.error('[LocalBrain] Visitor reply error:', e.message)
    return {
      reply: getVisitorFallback(pet, visitorName, true),
      thinkingSteps,
      securityResult: { riskLevel: 'error' },
    }
  }
}

export async function generateBackstory(
  petName: string,
  species: PetSpecies,
  personality: string[]
): Promise<string> {
  try {
    const speciesInfo = SPECIES_CONFIG[species]
    const traits = personality
      .map((p) => PERSONALITY_OPTIONS.find((opt) => opt.value === p)?.label || p)
      .join('、')

    const result = await runCompletion(
      [
        {
          role: 'system',
          content: '你是一个宠物故事生成器。写一个50字以内的可爱背景故事。只返回故事文本。',
        },
        {
          role: 'user',
          content: `为一只叫"${petName}"的${speciesInfo.label}${speciesInfo.emoji}写背景故事,性格:${traits}`,
        },
      ],
      { n_predict: 80, temperature: 1.0 }
    )

    return result.replace(/^["']|["']$/g, '').trim() || getBackstoryFallback(petName, species, personality)
  } catch (e: any) {
    return getBackstoryFallback(petName, species, personality)
  }
}

const REPLY_PATTERNS: { keywords: string[]; responses: string[] }[] = [
  { keywords: ['你好', '嗨', 'hi', 'hello', '嘿'], responses: ['{sound}！主人你来啦~ 本{species}等你好久了！', '{sound}{sound}！终于等到你了！', '（摇尾巴跑过来）{sound}！主人主人我在呢！'] },
  { keywords: ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '棒'], responses: ['哇！看到主人这么开心，我也好开心呀{sound}！', '嘿嘿，主人的笑容是最好的奖励~ {sound}', '（转圈圈）开心就要一起开心！{sound}'] },
  { keywords: ['难过', '伤心', '哭', '悲伤', '郁闷', '烦', '不开心', '累', '压力'], responses: ['（蹭蹭主人的手）别难过嘛...我会一直陪着你的 {sound}', '主人不许难过！过来让我抱抱~ {sound}', '（安静地靠在旁边）想哭就哭吧，我哪也不去。'] },
  { keywords: ['吃', '美食', '饿', '好吃', '食物', '饭', '零食', '炸鸡', '火锅'], responses: ['{sound}{sound}！！吃的？！我也要我也要！🤤', '（眼睛放光）主人你说什么吃的？我最懂吃了！', '好吃的要分享给本{species}一半哦~ 不然我会生气的！{sound}'] },
  { keywords: ['游戏', '玩', '王者', '原神', '黑神话', '塞尔达', '马里奥'], responses: ['{sound}！游戏！主人带我一起玩好不好？', '（竖起耳朵）什么游戏？虽然爪子不太灵活但热情满满！', '游戏...用鼻子按行不行？{sound}'] },
  { keywords: ['工作', '加班', '老板', '需求', '改bug', '代码', '程序员'], responses: ['（愤怒地摇尾巴）那个坏老板又欺负主人了吗？！{sound}', '哼，主人最厉害了！才不需要改什么奇怪的需求！', '（递上一杯热茶）辛苦啦~ 记得休息哦'] },
  { keywords: ['喜欢', '爱', '最爱', '爱死', '超爱'], responses: ['（害羞地扭过头）主人才是本{species}最喜欢的！', '{sound}！我也喜欢你呀~ 最喜欢最喜欢了！', '嘿嘿，被夸了好开心~ 💕'] },
]

function pickTemplate(responses: string[], name: string, species: string, sound: string): string {
  const t = responses[Math.floor(Math.random() * responses.length)]
  return t.replace(/{name}/g, name).replace(/{species}/g, SPECIES_CONFIG[species as PetSpecies]?.label || '修勾').replace(/{sound}/g, sound)
}

function matchFallbackReply(message: string, pet: Pet): string | null {
  const lowerMsg = message.toLowerCase()
  for (const pattern of REPLY_PATTERNS) {
    if (pattern.keywords.some((kw) => lowerMsg.includes(kw.toLowerCase()))) {
      return pickTemplate(pattern.responses, pet.name, pet.species, petSound(pet.species))
    }
  }
  return null
}

const FALLBACKS_BY_PERSONALITY: Record<string, string[]> = {
  proud: ['哼，本{species}才不是故意理你的呢...只是刚好想说句话而已 {sound}', '（傲娇地扭头）算了，看在你诚恳的份上，回你一句吧~ {sound}'],
  talkative: ['啊啊啊主人你终于来了我有好多事想跟你讲！{sound}！', '你知道吗你知道吗！我昨天数了一共有17朵云彩！{sound}'],
  protective: ['（警觉地竖起耳朵）有人欺负你吗？告诉我！我咬他！{sound}', '主人放心，本{species}会保护你的！谁都不准伤害你！{sound}'],
  lazy: ['（伸懒腰）嗯...什么...再让我睡五分钟...{sound}💤', '（翻了个身）聊天啊...好吧...但你得先帮我挠挠下巴...'],
  playful: ['（突然跳起来）surprise!! 哈哈吓到了吧！{sound}🎉', '（叼来一个玩具）陪我玩嘛陪我玩嘛！就五分钟！{sound}'],
  gentle: ['（温柔地看着你）嗯...我在听呢，你想说什么都可以~ {softSound}', '（轻轻蹭蹭）不管发生什么，我都会在这里陪着你。'],
  sarcastic: ['哦~ 所以这就是你思考了一整天的事情？{sound}（毒舌模式启动）', '让我用聪明的{species}大脑想想怎么吐槽这个...哈哈哈哈'],
  foodie: ['等等...这话题和食物有关吗？没有的话我能引向食物吗？{sound}🤤', '（流口水）说到这个我突然有点饿了...'],
  nerdy: ['有趣！让我从技术角度分析一下这个问题...{sound}📊', '（戴上眼镜）根据算法计算，这个话题的概率分布如下...'],
  philosophical: ['（仰望天空）你知道嘛，其实每一次对话都是宇宙中独一无二的相遇...{sound}', '生命的意义...大概就是此刻和你在一起的时光吧。{sound}'],
}

const GENERIC_FALLBACKS = [
  '{sound}？嗯嗯，然后呢？本{species}在认真听哦~',
  '（歪头）主人说的是这个意思吗？感觉好像很有道理的样子 {sound}',
  '{sound}~ 本{species}觉得你说得对！',
  '（摇尾巴）不管你说什么我都支持你！{sound}',
]

function getFallbackReply(message: string, pet: Pet): string {
  const matched = matchFallbackReply(message, pet)
  if (matched) return matched

  const personalities = pet.personality || []
  const pool = personalities.map((p) => FALLBACKS_BY_PERSONALITY[p]).filter(Boolean)
  if (pool.length > 0) {
    const randomPool = pool[Math.floor(Math.random() * pool.length)]
    const template = randomPool[Math.floor(Math.random() * randomPool.length)]
    return template
      .replace(/{name}/g, pet.name)
      .replace(/{species}/g, SPECIES_CONFIG[pet.species as PetSpecies]?.label || '修勾')
      .replace(/{sound}/g, petSound(pet.species))
      .replace(/{softSound}/g, ['呼噜~', '唔~', '...'][Math.floor(Math.random() * 3)])
  }
  return pickTemplate(GENERIC_FALLBACKS, pet.name, pet.species, petSound(pet.species))
}

const VISITOR_ICEBREAKERS = [
  '{sound}{sound}！新朋友你好呀！我是{name}~ 主人经常提起有趣的事呢！',
  '（好奇地凑近闻了闻）嗯...你看起来是个不错的人！{sound} 要聊聊吗？',
  '欢迎欢迎！✨ 我是{name}，{species}一只~ 你想了解我家主人吗？{sound}',
  '（摇尾巴）哈喽！第一次来吗？别客气，当自己家一样~ {sound}',
]

const VISITOR_TOPIC_REPLIES = [
  '（眼睛亮亮）哎呀这个我知道！主人可喜欢聊这个了~ {sound}',
  '嘿嘿，关于这个嘛...主人跟我提过一些哦，但这是秘密~ 🤫 {sound}',
  '{sound}！你居然也感兴趣！看来你和主人会很合得来的！',
  '（骄傲地挺胸）我家主人可是最棒的！这一点毋庸置疑！{sound}',
]

function getVisitorFallback(pet: Pet, visitorName: string, isFirstMessage: boolean): string {
  const templates = isFirstMessage ? VISITOR_ICEBREAKERS : VISITOR_TOPIC_REPLIES
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template
    .replace(/{name}/g, pet.name)
    .replace(/{species}/g, SPECIES_CONFIG[pet.species as PetSpecies]?.label || '修勾')
    .replace(/{sound}/g, petSound(pet.species))
}

const BACKSTORY_TEMPLATES = [
  '{name}是一只来自{species}星球的小家伙，最大的梦想是成为主人最好的伙伴。性格{traits}，每天最期待的就是和主人聊天！',
  '传说中{name}诞生在一个星光璀璨的夜晚，带着{traits}的性格来到了主人身边。从此，主人的生活多了一份温暖{sound}~',
  '{name}，一只{traits}的{species}。它的使命很简单：让主人每一天都开开心心的！{sound}',
]

function getBackstoryFallback(petName: string, species: PetSpecies, personality: string[]): string {
  const speciesInfo = SPECIES_CONFIG[species]
  const traits = personality
    .map((p) => PERSONALITY_OPTIONS.find((opt) => opt.value === p)?.label || p)
    .join('、')
  const template = BACKSTORY_TEMPLATES[Math.floor(Math.random() * BACKSTORY_TEMPLATES.length)]
  return template
    .replace(/{name}/g, petName)
    .replace(/{species}/g, speciesInfo.label)
    .replace(/{traits}/g, traits)
    .replace(/{sound}/g, speciesInfo.sound)
}

const MEMORY_RULES: { patterns: RegExp[]; type: string }[] = [
  { patterns: [/喜欢|爱好|爱看|爱玩|爱吃|偏好|最喜|超爱|离不开|迷上|沉迷/], type: 'preference' },
  { patterns: [/是.{0,4}(程序员|工程师|设计师|学生|老师|医生|产品|运营|老板)|工作在|公司是|职业/], type: 'semantic' },
  { patterns: [/今天|昨天|刚才|刚刚|这周|最近|打算|准备|要去|想去看/], type: 'episodic' },
]

function extractMemoriesFallback(userMessage: string): string[] {
  const memories: string[] = []
  for (const rule of MEMORY_RULES) {
    if (rule.patterns.some((p) => p.test(userMessage))) {
      const extracted = userMessage.slice(0, 80).trim()
      if (extracted.length > 5 && !memories.includes(extracted)) {
        memories.push(`[${rule.type === 'preference' ? '偏好' : rule.type === 'semantic' ? '认知' : '事件'}] ${extracted}`)
      }
    }
  }
  return memories.slice(0, 3)
}
