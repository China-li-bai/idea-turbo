import { KeywordEmbeddingEngine, findMostSimilar } from '../lib/EmbeddingEngine'

describe('KeywordEmbeddingEngine — 基础嵌入', () => {
  const engine = new KeywordEmbeddingEngine()

  it('F1. 基础嵌入: "喜欢看电影" → 128维非零向量', async () => {
    const vec = await engine.embed('喜欢看电影')
    expect(vec).toBeInstanceOf(Float32Array)
    expect(vec.length).toBe(128)
    const nonZeroCount = Array.from(vec).filter((v) => v !== 0).length
    expect(nonZeroCount).toBeGreaterThan(0)
  })

  it('F2. 空字符串: 返回零向量', async () => {
    const vec = await engine.embed('')
    expect(vec.length).toBe(128)
    const allZero = Array.from(vec).every((v) => v === 0)
    expect(allZero).toBe(true)
  })

  it('F3. isReady() 始终返回 true', () => {
    expect(engine.isReady()).toBe(true)
  })

  it('engine name 和 dimensions 正确', () => {
    expect(engine.name).toBe('keyword-fallback')
    expect(engine.dimensions).toBe(128)
  })
})

describe('KeywordEmbeddingEngine — 相似度计算', () => {
  const engine = new KeywordEmbeddingEngine()

  it('F3. 相似文本: "加班很累" vs "工作疲惫" → score > 0.1', async () => {
    const vecA = await engine.embed('加班很累，老板又让加班')
    const vecB = await engine.embed('工作疲惫，今天好累')
    const score = engine.similarity(vecA, vecB)
    expect(score).toBeGreaterThan(0.1)
  })

  it('F4. 不相似文本: "加班很累" vs "今天天气好" → score < 相似文本', async () => {
    const vecSimilar = await engine.embed('加班很累，老板又让加班')
    const vecDissimilar = await engine.embed('今天天气真好，阳光明媚')
    const scoreSameTopic = await (async () => {
      const vb = await engine.embed('工作疲惫，今天好累')
      return engine.similarity(vecSimilar, vb)
    })()
    const scoreDiff = engine.similarity(vecSimilar, vecDissimilar)
    expect(scoreDiff).toBeLessThan(scoreSameTopic + 0.05)
  })

  it('F5. 完全相同文本: score ≈ 1.0', async () => {
    const vecA = await engine.embed('今天工作很忙')
    const vecB = await engine.embed('今天工作很忙')
    const score = engine.similarity(vecA, vecB)
    expect(score).toBeCloseTo(1.0, 5)
  })

  it('不同维度向量 → similarity 返回 0', async () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([1, 2, 3, 4])
    expect(engine.similarity(a, b)).toBe(0)
  })

  it('零向量与零向量 → similarity 返回 0 (避免除零)', () => {
    const zeroA = new Float32Array(128)
    const zeroB = new Float32Array(128)
    expect(engine.similarity(zeroA, zeroB)).toBe(0)
  })
})

describe('KeywordEmbeddingEngine — embedBatch', () => {
  const engine = new KeywordEmbeddingEngine()

  it('批量嵌入多段文本', async () => {
    const texts = ['今天天气好', '喜欢看电影', '工作很忙']
    const results = await engine.embedBatch(texts)
    expect(results).toHaveLength(3)
    for (const vec of results) {
      expect(vec).toBeInstanceOf(Float32Array)
      expect(vec.length).toBe(128)
    }
  })
})

describe('findMostSimilar — 检索函数', () => {
  it('从候选中找出最相似的', async () => {
    const candidates = [
      { id: 'c1', content: '今天加班到很晚' },
      { id: 'c2', content: '周末去看了电影' },
      { id: 'c3', content: '老板又让我干活' },
    ]
    const results = await findMostSimilar('工作很累，又要加班', candidates, 2, 0.01)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toHaveProperty('id')
    expect(results[0]).toHaveProperty('score')
    expect(results[0].score).toBeGreaterThanOrEqual(0.01)
  })

  it('无匹配时返回空数组', async () => {
    const candidates = [
      { id: 'c1', content: '今天天气很好' },
    ]
    const results = await findMostSimilar('量子力学的不确定性原理', candidates, 5, 0.9)
    expect(results).toHaveLength(0)
  })
})
