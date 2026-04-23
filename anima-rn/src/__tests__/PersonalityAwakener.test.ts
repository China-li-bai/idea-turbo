import {
  classifySpeechStyle,
  classifyEmotionalTendency,
  classifyValueOrientation,
  getPersonalityLabel,
  getAwakeningProgress,
  getAwakeningSystemPromptAddon,
  checkAwakeningEligibility,
} from '../lib/PersonalityAwakener'
import type { Pet, SpeechStyle, EmotionalTendency, ValueOrientation } from '../types'

const mockPet: Pet = {
  id: 'test-pet-1',
  name: '小团子',
  species: 'cat',
  personality: ['sarcastic', 'foodie'],
  avatarEmoji: '🐱',
  backstory: 'test',
  systemPrompt: 'test',
  createdAt: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
  updatedAt: new Date().toISOString(),
}

const youngPet: Pet = {
  ...mockPet,
  id: 'young-pet',
  createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
}

describe('PersonalityAwakener — 三维分类', () => {
  describe('P1. classifySpeechStyle: 说话风格分类', () => {
    it('毒舌关键词 → sarcastic', () => {
      const facts = ['吐槽: 经常吐槽主人', '讽刺: 喜欢讽刺', '哼: 总是哼哼']
      expect(classifySpeechStyle(facts)).toBe('sarcastic')
    })

    it('温柔关键词 → gentle', () => {
      const facts = ['温柔: 说话很温柔', '关心: 总是关心主人', '陪你: 愿意陪伴']
      expect(classifySpeechStyle(facts)).toBe('gentle')
    })

    it('中二关键词 → chuunibyou', () => {
      const facts = ['封印: 声称有封印的力量', '觉醒: 总说觉醒', '宿命: 谈论宿命']
      expect(classifySpeechStyle(facts)).toBe('chuunibyou')
    })

    it('学术关键词 → academic', () => {
      const facts = ['分析: 喜欢分析问题', '数据: 用数据说话', '逻辑: 讲究逻辑']
      expect(classifySpeechStyle(facts)).toBe('academic')
    })

    it('无匹配关键词 → 默认gentle', () => {
      const facts = ['颜色: 喜欢蓝色', '天气: 今天晴天']
      expect(classifySpeechStyle(facts)).toBe('gentle')
    })
  })

  describe('P2. classifyEmotionalTendency: 情感倾向分类', () => {
    it('热情关键词 → passionate', () => {
      const facts = ['超级: 超级开心', '最棒: 主人最棒', '绝对: 绝对支持']
      expect(classifyEmotionalTendency(facts)).toBe('passionate')
    })

    it('傲娇关键词 → tsundere', () => {
      const facts = ['才不是: 才不是在意', '哼: 哼', '别误会: 别误会']
      expect(classifyEmotionalTendency(facts)).toBe('tsundere')
    })

    it('高冷关键词 → aloof', () => {
      const facts = ['无所谓: 无所谓', '随便: 随便吧', '嗯: 嗯']
      expect(classifyEmotionalTendency(facts)).toBe('aloof')
    })

    it('黏人关键词 → clingy', () => {
      const facts = ['不要走: 不要走', '陪我: 陪我玩', '想你了: 想你了']
      expect(classifyEmotionalTendency(facts)).toBe('clingy')
    })
  })

  describe('P3. classifyValueOrientation: 价值取向分类', () => {
    it('务实关键词 → pragmatic', () => {
      const facts = ['实用: 讲究实用', '效率: 追求效率', '结果: 看重结果']
      expect(classifyValueOrientation(facts)).toBe('pragmatic')
    })

    it('理想关键词 → idealistic', () => {
      const facts = ['梦想: 有梦想', '意义: 追求意义', '价值: 价值观']
      expect(classifyValueOrientation(facts)).toBe('idealistic')
    })

    it('享乐关键词 → hedonistic', () => {
      const facts = ['开心: 要开心', '享受: 享受生活', '好吃: 好吃的']
      expect(classifyValueOrientation(facts)).toBe('hedonistic')
    })

    it('野心关键词 → ambitious', () => {
      const facts = ['目标: 有目标', '成功: 追求成功', '进步: 不断进步']
      expect(classifyValueOrientation(facts)).toBe('ambitious')
    })
  })
})

describe('PersonalityAwakener — 人格标签矩阵', () => {
  describe('P4. getPersonalityLabel: 64种人格标签', () => {
    it('sarcastic × passionate × pragmatic → 烈焰毒舌家', () => {
      expect(getPersonalityLabel('sarcastic', 'passionate', 'pragmatic')).toBe('烈焰毒舌家')
    })

    it('gentle × tsundere × pragmatic → 傲娇暖宝宝', () => {
      expect(getPersonalityLabel('gentle', 'tsundere', 'pragmatic')).toBe('傲娇暖宝宝')
    })

    it('chuunibyou × passionate × idealistic → 暗黑救世主', () => {
      expect(getPersonalityLabel('chuunibyou', 'passionate', 'idealistic')).toBe('暗黑救世主')
    })

    it('academic × aloof × pragmatic → 冷静分析家', () => {
      expect(getPersonalityLabel('academic', 'aloof', 'pragmatic')).toBe('冷静分析家')
    })

    it('所有组合都返回非空字符串', () => {
      const styles: SpeechStyle[] = ['sarcastic', 'gentle', 'chuunibyou', 'academic']
      const emotions: EmotionalTendency[] = ['passionate', 'tsundere', 'aloof', 'clingy']
      const values: ValueOrientation[] = ['pragmatic', 'idealistic', 'hedonistic', 'ambitious']

      for (const s of styles) {
        for (const e of emotions) {
          for (const v of values) {
            const label = getPersonalityLabel(s, e, v)
            expect(label).toBeTruthy()
            expect(label.length).toBeGreaterThan(0)
          }
        }
      }
    })
  })
})

describe('PersonalityAwakener — 觉醒条件', () => {
  describe('P5. checkAwakeningEligibility: 觉醒资格检查', () => {
    it('宠物年龄<10天 → 不符合', async () => {
      const result = await checkAwakeningEligibility(youngPet)
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('天')
    })

    it('宠物年龄≥10天但记忆不足 → 不符合', async () => {
      const result = await checkAwakeningEligibility(mockPet)
      expect(result.eligible).toBe(false)
    })
  })
})

describe('PersonalityAwakener — 觉醒进度', () => {
  describe('P6. getAwakeningProgress: 四阶段进度', () => {
    it('0% → seed阶段', () => {
      const progress = getAwakeningProgress(mockPet, 0)
      expect(progress.stage).toBe('seed')
      expect(progress.percent).toBe(0)
    })

    it('少量事实 → sprout阶段', () => {
      const progress = getAwakeningProgress(mockPet, 5)
      expect(progress.percent).toBeLessThan(50)
    })

    it('充足事实 → bloom阶段', () => {
      const progress = getAwakeningProgress(mockPet, 15)
      expect(progress.percent).toBeGreaterThanOrEqual(80)
      expect(progress.stage).toBe('bloom')
    })

    it('进度百分比在[0,100]范围', () => {
      const progress = getAwakeningProgress(mockPet, 7)
      expect(progress.percent).toBeGreaterThanOrEqual(0)
      expect(progress.percent).toBeLessThanOrEqual(100)
    })
  })
})

describe('PersonalityAwakener — 系统提示注入', () => {
  describe('P7. getAwakeningSystemPromptAddon: 觉醒人格注入', () => {
    it('包含人格标签', () => {
      const addon = getAwakeningSystemPromptAddon({
        id: 'test',
        petId: 'test',
        awakenedAt: new Date().toISOString(),
        speechStyle: 'sarcastic',
        emotionalTendency: 'tsundere',
        valueOrientation: 'pragmatic',
        label: '傲娇毒舌猫',
        description: 'test',
        triggerReasons: [],
        observationDays: 10,
        isNew: true,
      })
      expect(addon).toContain('傲娇毒舌猫')
      expect(addon).toContain('毒舌但关心')
      expect(addon).toContain('傲娇')
    })

    it('不包含"我觉醒了"的刻意表述', () => {
      const addon = getAwakeningSystemPromptAddon({
        id: 'test',
        petId: 'test',
        awakenedAt: new Date().toISOString(),
        speechStyle: 'gentle',
        emotionalTendency: 'passionate',
        valueOrientation: 'idealistic',
        label: '浪漫理想主义者',
        description: 'test',
        triggerReasons: [],
        observationDays: 10,
        isNew: true,
      })
      expect(addon).not.toContain('我觉醒了')
    })
  })
})

describe('PersonalityAwakener — 数据流完整性', () => {
  describe('P8. 语义事实→分类→标签→注入 数据流', () => {
    it('完整分类链：关键词→三维→标签', () => {
      const facts = [
        '吐槽: 经常吐槽主人',
        '哼: 总是哼',
        '超级: 超级喜欢',
        '才不是: 才不是在意主人',
        '实用: 讲究实用',
        '效率: 追求效率',
      ]

      const speech = classifySpeechStyle(facts)
      const emotion = classifyEmotionalTendency(facts)
      const value = classifyValueOrientation(facts)

      expect(speech).toBe('sarcastic')
      expect(emotion).toBe('tsundere')
      expect(value).toBe('pragmatic')

      const label = getPersonalityLabel(speech, emotion, value)
      expect(label).toBe('傲娇毒舌猫')
    })
  })
})
