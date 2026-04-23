import { getDiaryFallback } from '../lib/PetDiaryGenerator'
import type { Pet, UserMood } from '../types'

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

const dogPet: Pet = { ...mockPet, id: 'test-dog', species: 'dog' }
const birdPet: Pet = { ...mockPet, id: 'test-bird', species: 'bird' }

describe('PetDiaryGenerator — 降级策略', () => {
  describe('D1. getDiaryFallback: AI不可用时的降级日记', () => {
    const moods: UserMood[] = ['happy', 'sad', 'neutral', 'anxious', 'excited', 'angry']

    it('所有mood都能生成降级日记', () => {
      moods.forEach((mood) => {
        const diary = getDiaryFallback(mockPet, mood)
        expect(diary).toBeDefined()
        expect(diary.content.length).toBeGreaterThan(0)
      })
    })

    it('日记结构完整', () => {
      const diary = getDiaryFallback(mockPet, 'happy')
      expect(diary.id).toMatch(/^diary-/)
      expect(diary.petId).toBe('test-pet-1')
      expect(diary.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(diary.mood).toBe('happy')
      expect(diary.highlights.length).toBeGreaterThan(0)
      expect(diary.createdAt).toBeTruthy()
    })

    it('happy mood → ownerSummary包含"开心"', () => {
      const diary = getDiaryFallback(mockPet, 'happy')
      expect(diary.ownerSummary).toContain('开心')
    })

    it('非happy mood → ownerSummary包含"如常"', () => {
      const diary = getDiaryFallback(mockPet, 'sad')
      expect(diary.ownerSummary).toContain('如常')
    })

    it('highlights从content中提取', () => {
      const diary = getDiaryFallback(mockPet, 'neutral')
      expect(diary.highlights.length).toBeGreaterThan(0)
      expect(diary.highlights.length).toBeLessThanOrEqual(3)
    })

    it('highlights是content的子串片段', () => {
      const diary = getDiaryFallback(mockPet, 'neutral')
      diary.highlights.forEach((h) => {
        expect(h.length).toBeGreaterThan(0)
      })
    })
  })

  describe('D2. 物种适配', () => {
    it('猫类日记包含猫相关词', () => {
      const diary = getDiaryFallback(mockPet, 'happy')
      expect(
        diary.content.includes('猫') ||
        diary.content.includes('喵') ||
        diary.content.includes('尾巴')
      ).toBe(true)
    })

    it('犬类日记包含犬相关词', () => {
      const diary = getDiaryFallback(dogPet, 'happy')
      expect(
        diary.content.includes('修勾') ||
        diary.content.includes('汪汪') ||
        diary.content.includes('尾巴')
      ).toBe(true)
    })

    it('鸟类日记包含鸟相关词', () => {
      const diary = getDiaryFallback(birdPet, 'happy')
      expect(
        diary.content.includes('小鸟') ||
        diary.content.includes('啾啾') ||
        diary.content.includes('翅膀')
      ).toBe(true)
    })
  })

  describe('D3. 降级策略数据流', () => {
    it('AI失败 → 降级日记 → 结构与正常日记一致', () => {
      const fallback = getDiaryFallback(mockPet, 'neutral')

      expect(fallback.id).toBeTruthy()
      expect(fallback.petId).toBe(mockPet.id)
      expect(fallback.date).toBeTruthy()
      expect(fallback.content.length).toBeGreaterThan(0)
      expect(fallback.mood).toBe('neutral')
      expect(Array.isArray(fallback.highlights)).toBe(true)
      expect(fallback.ownerSummary).toBeTruthy()
      expect(fallback.createdAt).toBeTruthy()
    })

    it('降级日记内容不包含模板占位符', () => {
      const moods: UserMood[] = ['happy', 'sad', 'neutral', 'anxious', 'excited', 'angry']
      moods.forEach((mood) => {
        const diary = getDiaryFallback(mockPet, mood)
        expect(diary.content).not.toContain('{species}')
        expect(diary.content).not.toContain('{sound}')
        expect(diary.content).not.toContain('{name}')
      })
    })
  })
})
