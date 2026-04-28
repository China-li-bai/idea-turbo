import { cleanRawReply, withCompletionLock } from '../lib/LocalBrain'
import type { Pet } from '../types'

const mockPet: Pet = {
  id: 'test-pet',
  name: '小橘',
  species: 'cat',
  personality: ['lively'],
  avatarEmoji: '🐱',
  backstory: '一只活泼的小猫',
  systemPrompt: '你是一只活泼的小猫',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('LocalBrain — cleanRawReply', () => {
  it('C1. 正常文本直接返回', () => {
    const result = cleanRawReply('喵喵，我饿了！', mockPet, '你好')
    expect(result).toBe('喵喵，我饿了！')
  })

  it('C2. JSON 包裹的回复提取 reply 字段', () => {
    const raw = '{"reply": "我想吃鱼！"}'
    const result = cleanRawReply(raw, mockPet, '你好')
    expect(result).toBe('我想吃鱼！')
  })

  it('C3. JSON 包裹的回复提取 response 字段', () => {
    const raw = '{"response": "今天很开心"}'
    const result = cleanRawReply(raw, mockPet, '你好')
    expect(result).toBe('今天很开心')
  })

  it('C4. JSON 包裹的回复提取 text 字段', () => {
    const raw = '{"text": "陪我玩"}'
    const result = cleanRawReply(raw, mockPet, '你好')
    expect(result).toBe('陪我玩')
  })

  it('C5. JSON 解析失败时返回原始文本', () => {
    const raw = '{broken json}'
    const result = cleanRawReply(raw, mockPet, '你好')
    expect(result).toBe('{broken json}')
  })

  it('C6. 去除首尾引号', () => {
    const result = cleanRawReply('"喵喵"', mockPet, '你好')
    expect(result).toBe('喵喵')
  })

  it('C7. 空字符串返回 fallback', () => {
    const result = cleanRawReply('', mockPet, '你好')
    expect(result.length).toBeGreaterThan(0)
  })

  it('C8. "None" 返回 fallback', () => {
    const result = cleanRawReply('None', mockPet, '你好')
    expect(result).not.toBe('None')
    expect(result.length).toBeGreaterThan(0)
  })

  it('C9. "null" 返回 fallback', () => {
    const result = cleanRawReply('null', mockPet, '你好')
    expect(result).not.toBe('null')
  })

  it('C10. "NaN" 返回 fallback', () => {
    const result = cleanRawReply('NaN', mockPet, '你好')
    expect(result).not.toBe('NaN')
  })

  it('C11. 混合文本中的 JSON 提取', () => {
    const raw = '一些前缀文本 {"reply": "核心回复"} 一些后缀'
    const result = cleanRawReply(raw, mockPet, '你好')
    expect(result).toBe('核心回复')
  })
})

describe('LocalBrain — withCompletionLock 并发保护', () => {
  it('L1. 单次调用正常执行', async () => {
    const result = await withCompletionLock(async () => 42)
    expect(result).toBe(42)
  })

  it('L2. 串行执行：多个调用不会并发', async () => {
    const order: number[] = []
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    const p1 = withCompletionLock(async () => {
      order.push(1)
      await delay(50)
      order.push(2)
      return 'a'
    })
    const p2 = withCompletionLock(async () => {
      order.push(3)
      await delay(10)
      order.push(4)
      return 'b'
    })

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBe('a')
    expect(r2).toBe('b')
    expect(order).toEqual([1, 2, 3, 4])
  })

  it('L3. 前一个失败不阻塞后续调用', async () => {
    const p1 = withCompletionLock(async () => {
      throw new Error('test error')
    }).catch(() => 'caught')
    const p2 = withCompletionLock(async () => 'success')

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBe('caught')
    expect(r2).toBe('success')
  })

  it('L4. 返回值正确传递', async () => {
    const result = await withCompletionLock(async () => ({ text: 'hello', count: 5 }))
    expect(result).toEqual({ text: 'hello', count: 5 })
  })
})
