import {
  createDiaryHighlightSlice,
  createAwakeningSlice,
  createRoastQuoteSlice,
  createEncounterSlice,
  createOwnerPortraitSlice,
  getShareText,
  markSliceShared,
} from '../lib/ShareSliceRenderer'
import type { Pet, PetDiary, PersonalityAwakening } from '../types'

const mockPet: Pet = {
  id: 'test-pet-1',
  name: '小团子',
  species: 'cat',
  personality: ['sarcastic', 'foodie'],
  avatarEmoji: '🐱',
  backstory: 'test',
  systemPrompt: 'test',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockDiary: PetDiary = {
  id: 'diary-1',
  petId: 'test-pet-1',
  date: '2026-04-23',
  content: '今天主人又加班了，我只好趴在键盘上帮他写代码',
  highlights: ['主人又加班了', '帮他写代码'],
  mood: 'neutral' as const,
  ownerSummary: '主人今天加班了',
  createdAt: new Date().toISOString(),
}

const mockAwakening: PersonalityAwakening = {
  id: 'awaken-1',
  petId: 'test-pet-1',
  awakenedAt: new Date().toISOString(),
  speechStyle: 'sarcastic',
  emotionalTendency: 'tsundere',
  valueOrientation: 'pragmatic',
  label: '傲娇毒舌猫',
  description: '毒舌但关心主人，嘴上说不爱身体很诚实',
  triggerReasons: ['吐槽频率超过阈值', '傲娇行为模式确认'],
  observationDays: 15,
  isNew: true,
}

describe('ShareSliceRenderer — 5种切片创建', () => {
  describe('S1. createDiaryHighlightSlice: 日记切片', () => {
    it('生成diary_highlight类型切片', () => {
      const slice = createDiaryHighlightSlice(mockPet, mockDiary)
      expect(slice.type).toBe('diary_highlight')
      expect(slice.petId).toBe('test-pet-1')
    })

    it('标题或副标题包含宠物名或物种', () => {
      const slice = createDiaryHighlightSlice(mockPet, mockDiary)
      const allText = slice.title + slice.subtitle
      expect(
        allText.includes('小团子') || allText.includes('喵喵')
      ).toBe(true)
    })

    it('内容取自日记highlight', () => {
      const slice = createDiaryHighlightSlice(mockPet, mockDiary)
      expect(mockDiary.highlights).toContain(slice.content)
    })

    it('无highlight时取content前30字', () => {
      const emptyDiary: PetDiary = { ...mockDiary, highlights: [] }
      const slice = createDiaryHighlightSlice(mockPet, emptyDiary)
      expect(slice.content).toBe(mockDiary.content.slice(0, 30))
    })

    it('sharedAt初始为null', () => {
      const slice = createDiaryHighlightSlice(mockPet, mockDiary)
      expect(slice.sharedAt).toBeNull()
    })
  })

  describe('S2. createAwakeningSlice: 觉醒切片', () => {
    it('生成awakening类型切片', () => {
      const slice = createAwakeningSlice(mockPet, mockAwakening)
      expect(slice.type).toBe('awakening')
    })

    it('内容包含人格标签', () => {
      const slice = createAwakeningSlice(mockPet, mockAwakening)
      expect(slice.content).toContain('傲娇毒舌猫')
    })

    it('标题包含觉醒相关词或标签', () => {
      const slice = createAwakeningSlice(mockPet, mockAwakening)
      const allText = slice.title + slice.subtitle + slice.content
      expect(
        allText.includes('觉醒') || allText.includes('傲娇毒舌猫')
      ).toBe(true)
    })
  })

  describe('S3. createRoastQuoteSlice: 毒舌金句切片', () => {
    it('生成roast_quote类型切片', () => {
      const slice = createRoastQuoteSlice(mockPet, '你今天又迟到了吧')
      expect(slice.type).toBe('roast_quote')
    })

    it('内容是传入的quote', () => {
      const quote = '你的代码有bug，但我不说'
      const slice = createRoastQuoteSlice(mockPet, quote)
      expect(slice.content).toBe(quote)
    })
  })

  describe('S4. createEncounterSlice: 邂逅切片', () => {
    it('生成encounter类型切片', () => {
      const slice = createEncounterSlice(mockPet, '柴犬', 85)
      expect(slice.type).toBe('encounter')
    })

    it('内容包含匹配度', () => {
      const slice = createEncounterSlice(mockPet, '柴犬', 85)
      expect(slice.content).toContain('85%')
      expect(slice.content).toContain('柴犬')
    })

    it('内容或副标题包含匹配度', () => {
      const slice = createEncounterSlice(mockPet, '柴犬', 85)
      const allText = slice.title + slice.subtitle + slice.content
      expect(allText).toContain('85')
    })
  })

  describe('S5. createOwnerPortraitSlice: 主人画像切片', () => {
    it('生成owner_portrait类型切片', () => {
      const slice = createOwnerPortraitSlice(mockPet, '一个爱加班的程序员')
      expect(slice.type).toBe('owner_portrait')
    })

    it('内容是传入的ownerSummary', () => {
      const summary = '一个爱加班的程序员'
      const slice = createOwnerPortraitSlice(mockPet, summary)
      expect(slice.content).toBe(summary)
    })
  })
})

describe('ShareSliceRenderer — 切片数据结构', () => {
  describe('S6. ShareSlice通用字段验证', () => {
    const allSlices = [
      createDiaryHighlightSlice(mockPet, mockDiary),
      createAwakeningSlice(mockPet, mockAwakening),
      createRoastQuoteSlice(mockPet, 'test quote'),
      createEncounterSlice(mockPet, 'dog', 75),
      createOwnerPortraitSlice(mockPet, 'test summary'),
    ]

    it('所有切片有id字段且格式正确', () => {
      allSlices.forEach((slice) => {
        expect(slice.id).toMatch(/^slice-/)
        expect(slice.id).toContain('test-pet-1')
      })
    })

    it('所有切片有petId', () => {
      allSlices.forEach((slice) => {
        expect(slice.petId).toBe('test-pet-1')
      })
    })

    it('所有切片有createdAt时间戳', () => {
      allSlices.forEach((slice) => {
        expect(new Date(slice.createdAt).getTime()).not.toBeNaN()
      })
    })

    it('5种类型全覆盖', () => {
      const types = new Set(allSlices.map((s) => s.type))
      expect(types.has('diary_highlight')).toBe(true)
      expect(types.has('awakening')).toBe(true)
      expect(types.has('roast_quote')).toBe(true)
      expect(types.has('encounter')).toBe(true)
      expect(types.has('owner_portrait')).toBe(true)
    })
  })
})

describe('ShareSliceRenderer — 分享与标记', () => {
  describe('S7. getShareText: 分享文案生成', () => {
    it('包含标题、内容、副标题', () => {
      const slice = createRoastQuoteSlice(mockPet, '你又在加班')
      const text = getShareText(slice, '小团子')
      expect(text).toContain(slice.title)
      expect(text).toContain(slice.content)
      expect(text).toContain(slice.subtitle)
    })

    it('末尾包含宠物名和emoji', () => {
      const slice = createRoastQuoteSlice(mockPet, 'test')
      const text = getShareText(slice, '小团子')
      expect(text).toContain('小团子')
      expect(text).toContain('🐾')
    })
  })

  describe('S8. markSliceShared: 标记已分享', () => {
    it('设置sharedAt时间戳', () => {
      const slice = createRoastQuoteSlice(mockPet, 'test')
      expect(slice.sharedAt).toBeNull()

      const shared = markSliceShared(slice)
      expect(shared.sharedAt).not.toBeNull()
      expect(new Date(shared.sharedAt!).getTime()).not.toBeNaN()
    })

    it('不修改原始切片', () => {
      const slice = createRoastQuoteSlice(mockPet, 'test')
      const before = slice.sharedAt
      markSliceShared(slice)
      expect(slice.sharedAt).toBe(before)
    })
  })
})

describe('ShareSliceRenderer — 模板填充数据流', () => {
  describe('S9. {name}/{species}/{emoji} 变量替换', () => {
    it('标题/副标题中的{name}被替换', () => {
      const slice = createDiaryHighlightSlice(mockPet, mockDiary)
      const allText = slice.title + slice.subtitle
      expect(allText).not.toContain('{name}')
      expect(allText).not.toContain('{species}')
    })

    it('副标题中的{species}被替换为物种中文名', () => {
      const slice = createDiaryHighlightSlice(mockPet, mockDiary)
      expect(slice.subtitle).not.toContain('{species}')
    })

    it('觉醒切片中的{days}被替换', () => {
      const slice = createAwakeningSlice(mockPet, mockAwakening)
      const allText = slice.title + slice.subtitle + slice.content
      expect(allText).not.toContain('{days}')
      expect(allText).toContain('15')
    })

    it('邂逅切片中的{score}被替换为匹配度', () => {
      const slice = createEncounterSlice(mockPet, 'dog', 92)
      const allText = slice.title + slice.subtitle + slice.content
      expect(allText).not.toContain('{score}')
      expect(allText).toContain('92')
    })
  })
})
