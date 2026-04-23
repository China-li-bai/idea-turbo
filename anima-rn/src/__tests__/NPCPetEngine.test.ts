import {
  getNPCPool,
  getNPCById,
  getNPCsByLocation,
  getNPCsByBrand,
  getRandomNPCs,
  getNPCResponse,
  getNPCAsPet,
  getNPCCatchphrases,
} from '../lib/NPCPetEngine'

describe('NPCPetEngine — NPC池数据结构', () => {
  describe('N1. getNPCPool: NPC池完整性', () => {
    it('返回6只NPC', () => {
      const pool = getNPCPool()
      expect(pool.length).toBe(6)
    })

    it('每只NPC有完整的必填字段', () => {
      const pool = getNPCPool()
      pool.forEach((npc) => {
        expect(npc.id).toMatch(/^npc-\d+$/)
        expect(npc.name).toBeTruthy()
        expect(npc.species).toBeTruthy()
        expect(npc.personality.length).toBeGreaterThan(0)
        expect(npc.avatarEmoji).toBeTruthy()
        expect(npc.locationTag).toBeTruthy()
        expect(npc.h3Cells.length).toBeGreaterThan(0)
        expect(npc.greeting).toBeTruthy()
        expect(npc.catchphrase).toBeTruthy()
        expect(npc.systemPrompt).toBeTruthy()
        expect(npc.keywordTriggers.length).toBeGreaterThan(0)
      })
    })

    it('每只NPC有3个关键词触发器', () => {
      const pool = getNPCPool()
      pool.forEach((npc) => {
        expect(npc.keywordTriggers.length).toBe(3)
        npc.keywordTriggers.forEach((trigger) => {
          expect(trigger.keyword).toBeTruthy()
          expect(trigger.response).toBeTruthy()
        })
      })
    })

    it('每只NPC的h3Cells是有效的H3格子', () => {
      const pool = getNPCPool()
      pool.forEach((npc) => {
        npc.h3Cells.forEach((cell) => {
          expect(typeof cell).toBe('string')
          expect(cell.length).toBeGreaterThan(0)
        })
      })
    })

    it('NPC ID唯一', () => {
      const pool = getNPCPool()
      const ids = pool.map((n) => n.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('N2. getNPCById: 按ID查找', () => {
    it('存在的ID返回NPC', () => {
      const npc = getNPCById('npc-1')
      expect(npc).toBeDefined()
      expect(npc!.name).toBe('拿铁')
    })

    it('不存在的ID返回undefined', () => {
      expect(getNPCById('npc-999')).toBeUndefined()
    })
  })

  describe('N3. getNPCsByLocation: 按位置查找', () => {
    it('能找到星巴克的NPC', () => {
      const npcs = getNPCsByLocation('星巴克')
      expect(npcs.length).toBeGreaterThan(0)
      expect(npcs[0].name).toBe('拿铁')
    })

    it('不存在的位置返回空数组', () => {
      expect(getNPCsByLocation('月球').length).toBe(0)
    })
  })

  describe('N4. getNPCsByBrand: 按品牌查找', () => {
    it('能找到星巴克品牌的NPC', () => {
      const npcs = getNPCsByBrand('starbucks')
      expect(npcs.length).toBe(1)
      expect(npcs[0].name).toBe('拿铁')
    })

    it('不存在的品牌返回空数组', () => {
      expect(getNPCsByBrand('nonexistent').length).toBe(0)
    })
  })
})

describe('NPCPetEngine — 三层响应', () => {
  describe('N5. getNPCResponse: 响应层级', () => {
    const npc = getNPCById('npc-1')!

    it('L1 固定脚本：打招呼 → 返回greeting', () => {
      const result = getNPCResponse(npc, '你好')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('scripted')
      expect(result!.response).toBe(npc.greeting)
    })

    it('L1 固定脚本：hi → 返回greeting', () => {
      const result = getNPCResponse(npc, '嗨')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('scripted')
    })

    it('L2 关键词触发：咖啡 → 返回专属回复', () => {
      const result = getNPCResponse(npc, '我想喝咖啡')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('keyword')
      expect(result!.response).toContain('拿铁')
    })

    it('L2 关键词触发：加班 → 返回专属回复', () => {
      const result = getNPCResponse(npc, '今天又要加班')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('keyword')
    })

    it('无匹配 → 返回null（需要L3 AI兜底）', () => {
      const result = getNPCResponse(npc, '今天天气不错')
      expect(result).toBeNull()
    })

    it('品牌NPC有brandId字段', () => {
      const brandNpc = getNPCsByBrand('starbucks')[0]
      expect(brandNpc.brandId).toBe('starbucks')
    })
  })
})

describe('NPCPetEngine — 数据转换', () => {
  describe('N6. getNPCAsPet: NPC→Pet格式转换', () => {
    it('转换后保留核心字段', () => {
      const npc = getNPCById('npc-1')!
      const pet = getNPCAsPet(npc)
      expect(pet.id).toBe(npc.id)
      expect(pet.name).toBe(npc.name)
      expect(pet.species).toBe(npc.species)
      expect(pet.avatarEmoji).toBe(npc.avatarEmoji)
      expect(pet.systemPrompt).toBe(npc.systemPrompt)
    })
  })

  describe('N7. getNPCCatchphrases: 口头禅提取', () => {
    it('返回catchphrase + 关键词列表', () => {
      const phrases = getNPCCatchphrases('npc-1')
      expect(phrases.length).toBeGreaterThan(0)
      expect(phrases[0]).toBe('咖啡因中毒的打工猫')
    })

    it('不存在的NPC返回空数组', () => {
      expect(getNPCCatchphrases('npc-999')).toEqual([])
    })
  })
})

describe('NPCPetEngine — 随机选取', () => {
  describe('N8. getRandomNPCs: 随机NPC', () => {
    it('默认返回3只', () => {
      const npcs = getRandomNPCs()
      expect(npcs.length).toBe(3)
    })

    it('指定数量返回对应数量', () => {
      const npcs = getRandomNPCs(2)
      expect(npcs.length).toBe(2)
    })

    it('不超过总数', () => {
      const npcs = getRandomNPCs(100)
      expect(npcs.length).toBe(6)
    })
  })
})
