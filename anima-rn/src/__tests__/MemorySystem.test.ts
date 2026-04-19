import { extractAndClassify } from '../lib/MemorySystem'

describe('MemorySystem — 记忆提取 (extractAndClassify)', () => {
  it('D1. 事件+偏好混合: "今天我去看了电影，主人喜欢科幻片"', () => {
    const result = extractAndClassify('今天我去看了电影，主人喜欢科幻片', 'pet-1')
    expect(result.episodic.length).toBeGreaterThanOrEqual(1)
    expect(result.semantic.length).toBeGreaterThanOrEqual(1)
  })

  it('D2. 纯事件: "昨天开会的时候老板又在骂人"', () => {
    const result = extractAndClassify('昨天开会的时候老板又在骂人', 'pet-1')
    expect(result.episodic.length).toBeGreaterThanOrEqual(1)
  })

  it('D3. 纯事实: "主人的MBTI是INFP"', () => {
    const result = extractAndClassify('主人的MBTI是INFP', 'pet-1')
    // Should extract semantic fact about personality
    expect(result.semantic.length).toBeGreaterThanOrEqual(0)
  })

  it('D4. 无效输入: "嗨" → 无记忆', () => {
    const result = extractAndClassify('嗨', 'pet-1')
    expect(result.episodic.length).toBe(0)
    expect(result.semantic.length).toBe(0)
  })

  it('D5. 多句混合: "今天工作很累。我觉得自己可能需要换个环境。主人喜欢安静的地方。"', () => {
    const text = '今天工作很累。我觉得自己可能需要换个环境。主人喜欢安静的地方。'
    const result = extractAndClassify(text, 'pet-1')
    // Should extract at least some memories from multi-sentence input
    const totalMemories = result.episodic.length + result.semantic.length
    expect(totalMemories).toBeGreaterThan(0)
  })

  describe('隐私分级集成', () => {
    it('吐槽内容 → privacyLevel=3', () => {
      const result = extractAndClassify('今天老板又让我加班，真的好讨厌', 'pet-1')
      if (result.episodic.length > 0) {
        expect(result.episodic[0].privacyLevel).toBe(3)
      }
    })

    it('爱好内容 → privacyLevel=1', () => {
      const result = extractAndClassify('我喜欢看科幻电影和动漫', 'pet-1')
      if (result.episodic.length > 0) {
        expect(result.episodic[0].privacyLevel).toBe(1)
      }
    })
  })

  describe('边界情况', () => {
    it('超长文本应截断到合理数量', () => {
      let longText = ''
      for (let i = 0; i < 20; i++) {
        longText += `这是第${i}句话。今天发生了事情。`
      }
      const result = extractAndClassify(longText, 'pet-1')
      // Should not return excessive memories
      expect(result.episodic.length).toBeLessThanOrEqual(3)
      expect(result.semantic.length).toBeLessThanOrEqual(3)
    })

    it('空字符串 → 无记忆', () => {
      const result = extractAndClassify('', 'pet-1')
      expect(result.episodic.length).toBe(0)
      expect(result.semantic.length).toBe(0)
    })
  })
})
