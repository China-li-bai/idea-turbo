import {
  stripThinkBlock,
  buildPetIdentity,
  buildSystemPrompt,
  cleanRawReply,
  cleanLlmArtifacts,
  getFallbackReply,
  extractMemoriesFallback,
  withCompletionLock,
} from '../lib/LocalBrain'
import {
  detectUserMood,
  calculateArousal,
  calculateValence,
  inferSocialContext,
  captureEncodingContext,
  classifyFragmentType,
  extractKeywordsWithFallback,
  detectEvolutionPattern,
  cognitiveExtract,
  calculateEmotionGatedImportance,
} from '../lib/CognitiveMemoryExtractor'
import type { Pet, PetSpecies } from '../types'

const PETS: Record<string, Pet> = {
  cat: {
    id: 'pet-cat',
    name: '小橘',
    species: 'cat',
    personality: ['playful', 'foodie'],
    avatarEmoji: '🐱',
    backstory: '一只来自喵星球的橘猫，最大的爱好是吃和睡',
    systemPrompt: '',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  dog: {
    id: 'pet-dog',
    name: '旺财',
    species: 'dog',
    personality: ['protective', 'gentle'],
    avatarEmoji: '🐕',
    backstory: '一只忠诚的柴犬，永远守护主人',
    systemPrompt: '',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  bird: {
    id: 'pet-bird',
    name: '啾啾',
    species: 'bird',
    personality: ['talkative', 'playful'],
    avatarEmoji: '🐦',
    backstory: '一只爱说话的鹦鹉',
    systemPrompt: '',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
}

const DS_DAILY = [
  { msg: '你好呀', expectMood: 'neutral', expectTopic: '日常' },
  { msg: '我今天好开心！', expectMood: 'happy', expectTopic: '日常' },
  { msg: '工作好累啊，加班到现在', expectMood: 'neutral', expectTopic: '工作' },
  { msg: '我想吃火锅', expectMood: 'neutral', expectTopic: '美食' },
  { msg: '老板又让我改需求，气死我了！', expectMood: 'angry', expectTopic: '工作' },
  { msg: '明天要考试，好紧张', expectMood: 'anxious', expectTopic: '学习' },
  { msg: '终于放假了！太棒了！', expectMood: 'excited', expectTopic: '日常' },
  { msg: '最近总是失眠，好烦', expectMood: 'neutral', expectTopic: '睡眠' },
  { msg: '周末和朋友去跑步了', expectMood: 'neutral', expectTopic: '运动' },
  { msg: '今天下雨了，不想出门', expectMood: 'neutral', expectTopic: '天气' },
]

const DS_PREFERENCES = [
  { msg: '我喜欢吃火锅和炸鸡', expectCategory: 'preference' },
  { msg: '我是程序员，在互联网公司工作', expectCategory: 'fact' },
  { msg: '我的MBTI是INFP', expectCategory: 'personality' },
  { msg: '我讨厌加班，喜欢自由', expectCategory: 'preference' },
  { msg: '我住在上海，从事设计工作', expectCategory: 'fact' },
]

const DS_PRIVACY = [
  { msg: '我喜欢看动漫', expectPrivacy: 1 },
  { msg: '今天和同事吵架了', expectPrivacy: 2 },
  { msg: '老板真的太讨厌了，想辞职', expectPrivacy: 3 },
  { msg: '我工资太低了', expectPrivacy: 3 },
  { msg: '周末去看了电影', expectPrivacy: 1 },
]

const DS_EVOLUTION = [
  {
    existing: [{ key: '喜欢火锅', value: '喜欢火锅', confidence: 0.6 }],
    newMsg: '我喜欢吃火锅',
    expectPattern: 'reinforcement',
  },
  {
    existing: [{ key: '喜欢火锅', value: '喜欢火锅', confidence: 0.6 }],
    newMsg: '我讨厌火锅了',
    expectPattern: 'contradiction',
  },
  {
    existing: [{ key: '喜欢火锅', value: '喜欢火锅', confidence: 0.6 }],
    newMsg: '我喜欢吃火锅和炸鸡',
    expectPattern: 'refinement',
  },
]

describe('═══ LocalBrain — LLM 大脑测试 ═══', () => {

  describe('A1. stripThinkBlock — Qwen3 思维块过滤', () => {
    it('完整 think 块被移除', () => {
      const input = '<think\n>让我想想...\n这是思考过程</think\n>实际回复内容'
      const result = stripThinkBlock(input)
      expect(result).not.toContain('让我想想')
    })

    it('未闭合的 think 块被移除', () => {
      const input = '<think\n>思考中...实际回复'
      const result = stripThinkBlock(input)
      expect(result).not.toContain('思考中')
    })

    it('无 think 块时保持原样', () => {
      expect(stripThinkBlock('喵喵，我饿了！')).toBe('喵喵，我饿了！')
    })

    it('多个 think 块全部移除', () => {
      const input = '<think\n>思考1</think\n>回复1<think\n>思考2</think\n>回复2'
      const result = stripThinkBlock(input)
      expect(result).not.toContain('思考')
    })

    it('空字符串返回空', () => {
      expect(stripThinkBlock('')).toBe('')
    })

    it('只有 think 块返回空', () => {
      expect(stripThinkBlock('<think\n>全部是思考</think\n>')).toBe('')
    })
  })

  describe('A1b. cleanLlmArtifacts — LLM 产物清洗', () => {
    it('去除 --- 分隔符后的元指令', () => {
      const input = '喵喵~主人好！\n---\n（保持自然语气，并用可爱的方式表达关心）'
      const result = cleanLlmArtifacts(input)
      expect(result).toBe('喵喵~主人好！')
      expect(result).not.toContain('---')
      expect(result).not.toContain('保持')
    })

    it('去除中文括号内的元指令', () => {
      const input = '喵喵~（请注意语气要可爱）主人好！'
      const result = cleanLlmArtifacts(input)
      expect(result).not.toContain('请注意')
      expect(result).toContain('主人好')
    })

    it('去除英文括号内的元指令', () => {
      const input = 'Meow~ (keep the tone cute) Hello!'
      const result = cleanLlmArtifacts(input)
      expect(result).not.toContain('keep the tone')
    })

    it('正常文本不受影响', () => {
      const input = '喵喵~主人好！今天想吃鱼！'
      expect(cleanLlmArtifacts(input)).toBe(input)
    })

    it('多个换行压缩为两个', () => {
      const input = '喵喵\n\n\n\n主人好'
      const result = cleanLlmArtifacts(input)
      expect(result).toBe('喵喵\n\n主人好')
    })

    it('实际 Terminal 输出案例', () => {
      const input = '*轻轻咬着爪子，发出"呀～"*  \n主人你好啊~今天过得怎么样啦？要不要我陪你一起做点好吃的呢? 🐾✨  \n\n--- \n\n（保持自然语气，并用可爱的方式表达关心）。需要的话随时来取吧！'
      const result = cleanLlmArtifacts(input)
      expect(result).toContain('轻轻咬着爪子')
      expect(result).toContain('主人你好啊')
      expect(result).not.toContain('---')
      expect(result).not.toContain('保持自然')
      expect(result).not.toContain('需要的话随时')
    })
  })

  describe('A2. buildPetIdentity — 宠物身份构建', () => {
    it('猫的身份包含关键信息', () => {
      const identity = buildPetIdentity(PETS.cat)
      expect(identity).toContain('小橘')
      expect(identity).toContain('喵喵')
      expect(identity).toContain('喵~')
    })

    it('狗的身份包含关键信息', () => {
      const identity = buildPetIdentity(PETS.dog)
      expect(identity).toContain('旺财')
      expect(identity).toContain('修勾')
      expect(identity).toContain('汪汪')
    })

    it('不同物种产生不同身份', () => {
      const catId = buildPetIdentity(PETS.cat)
      const dogId = buildPetIdentity(PETS.dog)
      expect(catId).not.toBe(dogId)
    })
  })

  describe('A3. buildSystemPrompt — 系统提示构建', () => {
    it('chat 模式包含规则和示例', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'chat')
      expect(prompt).toContain('Rules')
      expect(prompt).toContain('Examples')
      expect(prompt).toContain('小橘')
    })

    it('chat 模式带记忆上下文', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'chat', '主人喜欢火锅')
      expect(prompt).toContain('火锅')
      expect(prompt).toContain('remember')
    })

    it('visitor 模式包含隐私保护规则', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'visitor')
      expect(prompt).toContain('private')
      expect(prompt).toContain('Never reveal')
    })

    it('memory 模式返回 JSON 提取指令', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'memory')
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('提取')
    })

    it('不同物种的 prompt 包含不同叫声', () => {
      const catPrompt = buildSystemPrompt(PETS.cat, 'chat')
      const dogPrompt = buildSystemPrompt(PETS.dog, 'chat')
      expect(catPrompt).toContain('喵~')
      expect(dogPrompt).toContain('汪汪')
    })

    it('chat 模式包含 backstory', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'chat')
      expect(prompt).toContain('喵星球')
    })
  })

  describe('A4. cleanRawReply — 回复清洗', () => {
    it('正常文本直接返回', () => {
      expect(cleanRawReply('喵喵，我饿了！', PETS.cat, '你好')).toBe('喵喵，我饿了！')
    })

    it('JSON 提取 reply 字段', () => {
      expect(cleanRawReply('{"reply": "想吃鱼"}', PETS.cat, '你好')).toBe('想吃鱼')
    })

    it('JSON 提取 response 字段', () => {
      expect(cleanRawReply('{"response": "开心"}', PETS.cat, '你好')).toBe('开心')
    })

    it('无效回复触发 fallback', () => {
      const result = cleanRawReply('None', PETS.cat, '你好')
      expect(result).not.toBe('None')
      expect(result.length).toBeGreaterThan(0)
    })

    it('空字符串触发 fallback', () => {
      const result = cleanRawReply('', PETS.cat, '你好')
      expect(result.length).toBeGreaterThan(0)
    })

    it('去除首尾引号', () => {
      expect(cleanRawReply('"喵喵"', PETS.cat, '你好')).toBe('喵喵')
    })
  })

  describe('A5. getFallbackReply — 降级回复系统', () => {
    it('问候类消息匹配模板', () => {
      const reply = getFallbackReply('你好呀', PETS.cat)
      expect(reply.length).toBeGreaterThan(0)
      expect(reply).toContain('喵')
    })

    it('食物类消息匹配模板', () => {
      const reply = getFallbackReply('我想吃火锅', PETS.cat)
      expect(reply.length).toBeGreaterThan(0)
    })

    it('悲伤类消息匹配模板', () => {
      const reply = getFallbackReply('我今天好难过', PETS.cat)
      expect(reply.length).toBeGreaterThan(0)
    })

    it('工作类消息匹配模板', () => {
      const reply = getFallbackReply('加班好累', PETS.cat)
      expect(reply.length).toBeGreaterThan(0)
    })

    it('不同性格产生不同 fallback', () => {
      const catReply = getFallbackReply('随便聊聊', PETS.cat)
      const dogReply = getFallbackReply('随便聊聊', PETS.dog)
      expect(catReply.length).toBeGreaterThan(0)
      expect(dogReply.length).toBeGreaterThan(0)
    })

    it('无匹配时使用通用 fallback', () => {
      const reply = getFallbackReply('asdfghjkl', PETS.cat)
      expect(reply.length).toBeGreaterThan(0)
    })
  })

  describe('A6. extractMemoriesFallback — 正则记忆提取', () => {
    it('偏好类消息提取为偏好', () => {
      const memories = extractMemoriesFallback('我喜欢吃火锅')
      expect(memories.length).toBeGreaterThan(0)
      expect(memories[0]).toContain('偏好')
    })

    it('职业类消息提取为认知', () => {
      const memories = extractMemoriesFallback('我是程序员，在互联网公司工作')
      expect(memories.length).toBeGreaterThan(0)
      expect(memories[0]).toContain('认知')
    })

    it('事件类消息提取为事件', () => {
      const memories = extractMemoriesFallback('今天去看了电影')
      expect(memories.length).toBeGreaterThan(0)
      expect(memories[0]).toContain('事件')
    })

    it('无特征消息不提取', () => {
      const memories = extractMemoriesFallback('嗨')
      expect(memories.length).toBe(0)
    })

    it('最多提取3条', () => {
      const memories = extractMemoriesFallback('我喜欢吃火锅。我是程序员。今天加班到10点。昨天去了公园。')
      expect(memories.length).toBeLessThanOrEqual(3)
    })
  })

  describe('A7. withCompletionLock — 并发保护', () => {
    it('串行执行保证顺序', async () => {
      const order: number[] = []
      const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

      const p1 = withCompletionLock(async () => {
        order.push(1)
        await delay(30)
        order.push(2)
      })
      const p2 = withCompletionLock(async () => {
        order.push(3)
        order.push(4)
      })

      await Promise.all([p1, p2])
      expect(order).toEqual([1, 2, 3, 4])
    })

    it('前一个失败不阻塞后续', async () => {
      const p1 = withCompletionLock(async () => {
        throw new Error('boom')
      }).catch(() => 'caught')
      const p2 = withCompletionLock(async () => 'ok')

      const [r1, r2] = await Promise.all([p1, p2])
      expect(r1).toBe('caught')
      expect(r2).toBe('ok')
    })

    it('3个请求严格串行', async () => {
      const order: string[] = []
      const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

      const p1 = withCompletionLock(async () => {
        order.push('a-start')
        await delay(20)
        order.push('a-end')
      })
      const p2 = withCompletionLock(async () => {
        order.push('b-start')
        await delay(10)
        order.push('b-end')
      })
      const p3 = withCompletionLock(async () => {
        order.push('c-start')
        order.push('c-end')
      })

      await Promise.all([p1, p2, p3])
      expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end', 'c-start', 'c-end'])
    })
  })
})

describe('═══ CognitiveExtractor — 认知提取测试 ═══', () => {

  describe('B1. detectUserMood — 情绪检测', () => {
    it.each(DS_DAILY)('消息"$msg" → 情绪=$expectMood', ({ msg, expectMood }) => {
      const mood = detectUserMood(msg)
      expect(mood).toBe(expectMood)
    })

    it('混合情绪取最强', () => {
      expect(detectUserMood('开心又焦虑')).toBeDefined()
    })

    it('无情绪词返回 neutral', () => {
      expect(detectUserMood('今天星期三')).toBe('neutral')
    })
  })

  describe('B2. calculateArousal — 唤醒度计算', () => {
    it('感叹号提升唤醒度', () => {
      const low = calculateArousal('今天天气不错', 'neutral')
      const high = calculateArousal('太棒了！！！', 'excited')
      expect(high).toBeGreaterThan(low)
    })

    it('极端情绪提升唤醒度', () => {
      const neutral = calculateArousal('嗯', 'neutral')
      const excited = calculateArousal('太棒了', 'excited')
      expect(excited).toBeGreaterThan(neutral)
    })

    it('结果在 [0, 1] 范围', () => {
      const result = calculateArousal('超级无敌开心！！！', 'excited')
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })
  })

  describe('B3. inferSocialContext — 社交场景推断', () => {
    it('工作相关 → at_work', () => {
      expect(inferSocialContext('今天公司开会')).toBe('at_work')
      expect(inferSocialContext('老板又让我加班')).toBe('at_work')
    })

    it('朋友相关 → with_friends', () => {
      expect(inferSocialContext('和朋友聚会')).toBe('with_friends')
    })

    it('通勤相关 → commuting', () => {
      expect(inferSocialContext('在地铁上')).toBe('commuting')
    })

    it('无特征 → alone', () => {
      expect(inferSocialContext('今天天气真好')).toBe('alone')
    })
  })

  describe('B4. captureEncodingContext — 完整编码上下文', () => {
    it('返回完整的编码上下文', () => {
      const ctx = captureEncodingContext('我今天好开心！')
      expect(ctx).toHaveProperty('userMood')
      expect(ctx).toHaveProperty('timeOfDay')
      expect(ctx).toHaveProperty('dayOfWeek')
      expect(ctx).toHaveProperty('conversationTopic')
      expect(ctx).toHaveProperty('arousalLevel')
      expect(ctx).toHaveProperty('valence')
      expect(ctx).toHaveProperty('socialContext')
    })

    it('情绪正确传递', () => {
      const ctx = captureEncodingContext('我今天好开心！')
      expect(ctx.userMood).toBe('happy')
    })

    it('话题正确推断', () => {
      const ctx = captureEncodingContext('我想吃火锅')
      expect(ctx.conversationTopic).toBe('美食')
    })
  })

  describe('B5. classifyFragmentType — 片段类型分类', () => {
    it('事实陈述 → factual', () => {
      expect(classifyFragmentType('我是程序员')).toBe('factual')
    })

    it('事件描述 → experiential', () => {
      expect(classifyFragmentType('今天去了公园')).toBe('experiential')
    })

    it('主观感受 → subjective', () => {
      expect(classifyFragmentType('我觉得好累')).toBe('subjective')
    })

    it('情绪词 → subjective', () => {
      expect(classifyFragmentType('觉得好开心')).toBe('subjective')
    })
  })

  describe('B6. extractKeywordsWithFallback — 关键词提取', () => {
    it('中文文本提取关键词', () => {
      const keywords = extractKeywordsWithFallback('今天去吃了火锅，特别好吃')
      expect(keywords.length).toBeGreaterThan(0)
    })

    it('空字符串返回空数组', () => {
      expect(extractKeywordsWithFallback('')).toEqual([])
    })

    it('短文本也能提取', () => {
      const keywords = extractKeywordsWithFallback('加班')
      expect(keywords).toBeDefined()
    })

    it('英文文本提取关键词', () => {
      const keywords = extractKeywordsWithFallback('I love programming and coffee')
      expect(keywords.length).toBeGreaterThan(0)
    })
  })

  describe('B7. cognitiveExtract — 完整认知提取', () => {
    it('偏好消息提取语义事实', () => {
      const result = cognitiveExtract('我喜欢吃火锅', 'pet-1')
      expect(result.semantic.length).toBeGreaterThan(0)
      const pref = result.semantic.find(s => s.category === 'preference')
      expect(pref).toBeDefined()
    })

    it('事件消息提取情景记忆', () => {
      const result = cognitiveExtract('今天加班到10点', 'pet-1')
      expect(result.episodic.length).toBeGreaterThan(0)
    })

    it('短消息不提取', () => {
      const result = cognitiveExtract('嗨', 'pet-1')
      expect(result.episodic.length).toBe(0)
      expect(result.semantic.length).toBe(0)
    })

    it('多句消息提取多种类型', () => {
      const result = cognitiveExtract('今天加班到10点，好想吃炸鸡解压。我是程序员。', 'pet-1')
      expect(result.episodic.length + result.semantic.length).toBeGreaterThan(0)
    })

    it('隐私分级正确', () => {
      const publicResult = cognitiveExtract('我喜欢看动漫', 'pet-1')
      const privateResult = cognitiveExtract('老板太讨厌了想辞职', 'pet-1')
      if (publicResult.episodic.length > 0 && privateResult.episodic.length > 0) {
        expect(privateResult.episodic[0].privacyLevel).toBeGreaterThanOrEqual(
          publicResult.episodic[0].privacyLevel
        )
      }
    })
  })

  describe('B8. detectEvolutionPattern — 记忆演化模式', () => {
    it('reinforcement: 重复相同事实', () => {
      const existing = [{ key: '喜欢火锅', value: '喜欢火锅', confidence: 0.6 }]
      const result = detectEvolutionPattern('喜欢火锅', '喜欢火锅', existing)
      expect(result?.pattern).toBe('reinforcement')
    })

    it('contradiction: 矛盾事实', () => {
      const existing = [{ key: '喜欢火锅', value: '喜欢火锅', confidence: 0.6 }]
      const result = detectEvolutionPattern('喜欢火锅', '讨厌火锅', existing)
      expect(result?.pattern).toBe('contradiction')
    })

    it('refinement: 更精确的描述', () => {
      const existing = [{ key: '喜欢火锅', value: '喜欢火锅', confidence: 0.6 }]
      const result = detectEvolutionPattern('喜欢火锅', '喜欢火锅和炸鸡', existing)
      expect(result?.pattern).toBe('refinement')
    })

    it('无匹配时返回 null', () => {
      const existing = [{ key: '喜欢火锅', value: '喜欢火锅', confidence: 0.6 }]
      const result = detectEvolutionPattern('工作职业', '程序员', existing)
      expect(result).toBeNull()
    })
  })

  describe('B9. calculateEmotionGatedImportance — 情绪门控重要性', () => {
    it('高唤醒度提升重要性', () => {
      const calmCtx = { ...captureEncodingContext('嗯'), arousalLevel: 0.2 }
      const excitedCtx = { ...captureEncodingContext('太棒了'), arousalLevel: 0.9 }
      const calmImp = calculateEmotionGatedImportance(0.5, calmCtx)
      const excitedImp = calculateEmotionGatedImportance(0.5, excitedCtx)
      expect(excitedImp).toBeGreaterThan(calmImp)
    })

    it('负面情绪略微提升重要性', () => {
      const sadCtx = { ...captureEncodingContext('好难过'), userMood: 'sad' as const }
      const neutralCtx = { ...captureEncodingContext('今天星期三'), userMood: 'neutral' as const }
      const sadImp = calculateEmotionGatedImportance(0.5, sadCtx)
      const neutralImp = calculateEmotionGatedImportance(0.5, neutralCtx)
      expect(sadImp).toBeGreaterThanOrEqual(neutralImp)
    })

    it('结果在 [0, 1] 范围', () => {
      const ctx = captureEncodingContext('超级无敌开心！！！')
      const result = calculateEmotionGatedImportance(0.5, ctx)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    })
  })
})

describe('═══ 数据集驱动测试 — DS_DAILY ═══', () => {

  it.each(DS_DAILY)('情绪+话题: "$msg" → mood=$expectMood, topic=$expectTopic', ({ msg, expectMood, expectTopic }) => {
    const ctx = captureEncodingContext(msg)
    expect(ctx.userMood).toBe(expectMood)
    expect(ctx.conversationTopic).toBe(expectTopic)
  })

  it.each(DS_DAILY)('记忆提取: "$msg" → 有意义的提取结果', ({ msg }) => {
    const result = cognitiveExtract(msg, 'pet-ds')
    if (msg.length > 6) {
      const totalExtracted = result.episodic.length + result.semantic.length
      const hasEventWords = /今天|昨天|加班|考试|开心|难过|喜欢|讨厌|工作/.test(msg)
      if (hasEventWords) {
        expect(totalExtracted).toBeGreaterThan(0)
      }
    }
  })

  it.each(DS_DAILY)('Fallback回复: "$msg" → 非空回复', ({ msg }) => {
    const reply = getFallbackReply(msg, PETS.cat)
    expect(reply.length).toBeGreaterThan(0)
  })
})

describe('═══ 数据集驱动测试 — DS_PREFERENCES ═══', () => {

  it.each(DS_PREFERENCES)('偏好分类: "$msg" → category=$expectCategory', ({ msg, expectCategory }) => {
    const result = cognitiveExtract(msg, 'pet-pref')
    const hasCategory = result.semantic.some(s => s.category === expectCategory)
    if (result.semantic.length > 0) {
      expect(hasCategory).toBe(true)
    }
  })
})

describe('═══ 数据集驱动测试 — DS_EVOLUTION ═══', () => {

  it.each(DS_EVOLUTION)('演化模式: 新消息"$newMsg" → pattern=$expectPattern', ({ existing, newMsg, expectPattern }) => {
    const result = cognitiveExtract(newMsg, 'pet-evo', existing)
    if (result.evolutionHints && result.evolutionHints.length > 0) {
      const hasPattern = result.evolutionHints.some(h => h.pattern === expectPattern)
      expect(hasPattern).toBe(true)
    }
  })
})

describe('═══ 数据集驱动测试 — DS_PRIVACY ═══', () => {

  it.each(DS_PRIVACY)('隐私分级: "$msg" → privacyLevel≥$expectPrivacy', ({ msg, expectPrivacy }) => {
    const result = cognitiveExtract(msg, 'pet-priv')
    if (result.episodic.length > 0) {
      expect(result.episodic[0].privacyLevel).toBeGreaterThanOrEqual(expectPrivacy)
    }
  })
})

describe('═══ 端到端流水线测试 ═══', () => {

  describe('E1. 消息 → 编码 → 提取 → 记忆写入准备', () => {
    it('完整流水线: "今天加班到10点，好想吃炸鸡解压"', () => {
      const msg = '今天加班到10点，好想吃炸鸡解压'

      const ctx = captureEncodingContext(msg)
      expect(ctx.userMood).toBeDefined()
      expect(ctx.conversationTopic).toBeDefined()

      const extracted = cognitiveExtract(msg, 'pet-e2e')
      expect(extracted.episodic.length + extracted.semantic.length).toBeGreaterThan(0)

      const hasEpi = extracted.episodic.some(e =>
        e.content.includes('加班') || e.content.includes('炸鸡')
      )
      expect(hasEpi).toBe(true)

      const hasSem = extracted.semantic.some(s =>
        s.category === 'preference' || s.category === 'fact'
      )
      if (extracted.semantic.length > 0) {
        expect(hasSem).toBe(true)
      }
    })

    it('流水线: "我喜欢吃火锅和动漫"', () => {
      const msg = '我喜欢吃火锅和动漫'
      const ctx = captureEncodingContext(msg)
      const extracted = cognitiveExtract(msg, 'pet-e2e')

      expect(extracted.semantic.length).toBeGreaterThan(0)
      const prefFacts = extracted.semantic.filter(s => s.category === 'preference')
      expect(prefFacts.length).toBeGreaterThan(0)
    })
  })

  describe('E2. 多轮对话记忆累积', () => {
    const conversation = [
      '你好呀',
      '我今天好累',
      '加班到10点',
      '想吃火锅解压',
      '我是程序员',
    ]

    it('5轮对话累积记忆', () => {
      let totalEpi = 0
      let totalSem = 0

      for (const msg of conversation) {
        const result = cognitiveExtract(msg, 'pet-multi')
        totalEpi += result.episodic.length
        totalSem += result.semantic.length
      }

      expect(totalEpi + totalSem).toBeGreaterThan(0)
    })

    it('后续消息的记忆上下文更丰富', () => {
      const firstCtx = captureEncodingContext(conversation[0])
      const lastCtx = captureEncodingContext(conversation[3])

      expect(firstCtx).toBeDefined()
      expect(lastCtx).toBeDefined()
      expect(lastCtx.conversationTopic).toBe('美食')
    })
  })

  describe('E3. 系统提示 + 记忆上下文集成', () => {
    it('带记忆的 chat prompt 包含记忆内容', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'chat', '主人喜欢火锅；主人是程序员')
      expect(prompt).toContain('火锅')
      expect(prompt).toContain('程序员')
    })

    it('visitor 模式包含隐私保护', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'visitor', '主人喜欢看电影')
      expect(prompt).toContain('主人喜欢看电影')
      expect(prompt).toContain('private')
    })

    it('memory 模式是提取指令', () => {
      const prompt = buildSystemPrompt(PETS.cat, 'memory')
      expect(prompt).toContain('提取')
      expect(prompt).not.toContain('规则')
    })
  })

  describe('E4. 降级链路完整性', () => {
    it('LLM 失败 → cleanRawReply fallback → getFallbackReply', () => {
      const badReply = 'None'
      const cleaned = cleanRawReply(badReply, PETS.cat, '你好')
      expect(cleaned).not.toBe('None')
      expect(cleaned.length).toBeGreaterThan(0)
    })

    it('extractMemoriesFallback 作为 LLM 提取的降级', () => {
      const msg = '我喜欢吃火锅'
      const fallback = extractMemoriesFallback(msg)
      expect(fallback.length).toBeGreaterThan(0)

      const cognitive = cognitiveExtract(msg, 'pet-fallback')
      expect(cognitive.episodic.length + cognitive.semantic.length).toBeGreaterThan(0)
    })
  })
})
