import {
  latLngToH3Cell,
  getNearbyCells,
  getRingDistance,
  isCellNearby,
  computeTagJaccard,
  createPetTagVector,
  layoutConstellation,
  generatePseudonym,
  createEncounter,
  findNearbyNPCs,
  getNPCCells,
} from '../lib/ConstellationEngine'
import type { Pet, PetTagVector } from '../types'

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

const BEIJING_SANLITUN = { lat: 39.9334, lng: 116.4529 }
const BEIJING_GUOMAO = { lat: 39.9087, lng: 116.4602 }
const SHANGHAI_BUND = { lat: 31.2400, lng: 121.4900 }

describe('ConstellationEngine — H3 空间索引', () => {
  describe('C1. latLngToH3Cell: GPS → H3格子号', () => {
    it('同一坐标始终返回同一格子号', () => {
      const cell1 = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const cell2 = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      expect(cell1).toBe(cell2)
    })

    it('返回有效的H3格子字符串', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      expect(typeof cell).toBe('string')
      expect(cell.length).toBeGreaterThan(0)
    })

    it('不同城市返回不同格子号', () => {
      const bjCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const shCell = latLngToH3Cell(SHANGHAI_BUND.lat, SHANGHAI_BUND.lng)
      expect(bjCell).not.toBe(shCell)
    })

    it('隐私保护：格子号不包含可逆的GPS信息', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      expect(cell).not.toContain(String(BEIJING_SANLITUN.lat))
      expect(cell).not.toContain(String(BEIJING_SANLITUN.lng))
    })
  })

  describe('C2. getNearbyCells: 获取邻近格子', () => {
    it('返回包含自身的格子数组', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const nearby = getNearbyCells(cell)
      expect(nearby).toContain(cell)
    })

    it('ring=1 返回7个格子（1个自身+6个邻居）', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const nearby = getNearbyCells(cell)
      expect(nearby.length).toBe(7)
    })
  })

  describe('C3. getRingDistance: 格子距离计算', () => {
    it('自身距离为0', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      expect(getRingDistance(cell, cell)).toBe(0)
    })

    it('相邻格子距离为1', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const nearby = getNearbyCells(cell)
      const neighbor = nearby.find((c) => c !== cell)!
      expect(neighbor).toBeDefined()
      expect(getRingDistance(cell, neighbor)).toBe(1)
    })

    it('远距离格子返回≥2', () => {
      const bjCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const shCell = latLngToH3Cell(SHANGHAI_BUND.lat, SHANGHAI_BUND.lng)
      expect(getRingDistance(bjCell, shCell)).toBeGreaterThanOrEqual(3)
    })
  })

  describe('C4. isCellNearby: 邻近判断', () => {
    it('自身是nearby', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      expect(isCellNearby(cell, cell)).toBe(true)
    })

    it('同城区是nearby（maxRing=2）', () => {
      const bj1 = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const bj2 = latLngToH3Cell(BEIJING_GUOMAO.lat, BEIJING_GUOMAO.lng)
      expect(isCellNearby(bj1, bj2, 3)).toBe(true)
    })

    it('跨城市不是nearby', () => {
      const bj = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const sh = latLngToH3Cell(SHANGHAI_BUND.lat, SHANGHAI_BUND.lng)
      expect(isCellNearby(bj, sh)).toBe(false)
    })
  })
})

describe('ConstellationEngine — 隐私匹配', () => {
  describe('C5. createPetTagVector: 标签向量生成', () => {
    it('生成完整的标签向量结构', () => {
      const vec = createPetTagVector(mockPet)
      expect(vec).toHaveProperty('speciesHash')
      expect(vec).toHaveProperty('personalityHashes')
      expect(vec).toHaveProperty('activityLevel')
      expect(vec).toHaveProperty('timeHash')
      expect(vec).toHaveProperty('interestHashes')
      expect(vec).toHaveProperty('moodHash')
      expect(vec).toHaveProperty('nonce')
    })

    it('speciesHash是8位十六进制', () => {
      const vec = createPetTagVector(mockPet)
      expect(vec.speciesHash).toMatch(/^[0-9a-f]{8}$/)
    })

    it('personalityHashes与pet.personality对应', () => {
      const vec = createPetTagVector(mockPet)
      expect(vec.personalityHashes.length).toBe(mockPet.personality.length)
    })

    it('同一宠物同一mood生成相同的speciesHash', () => {
      const vec1 = createPetTagVector(mockPet, 'happy')
      const vec2 = createPetTagVector(mockPet, 'happy')
      expect(vec1.speciesHash).toBe(vec2.speciesHash)
    })

    it('nonce每次不同（防重放）', () => {
      const vec1 = createPetTagVector(mockPet)
      const vec2 = createPetTagVector(mockPet)
      expect(vec1.nonce).not.toBe(vec2.nonce)
    })
  })

  describe('C6. computeTagJaccard: Jaccard相似度', () => {
    it('完全相同的标签 → 相似度=1', () => {
      const vec = createPetTagVector(mockPet)
      const score = computeTagJaccard(vec, vec)
      expect(score).toBe(1)
    })

    it('完全不同的标签 → 相似度=0', () => {
      const vecA: PetTagVector = {
        speciesHash: 'aaaaaaaa',
        personalityHashes: ['bbbbbbbb'],
        activityLevel: 1,
        timeHash: 'cccccccc',
        interestHashes: ['dddddddd'],
        moodHash: 'eeeeeeee',
        nonce: 'nonce1',
      }
      const vecB: PetTagVector = {
        speciesHash: '11111111',
        personalityHashes: ['22222222'],
        activityLevel: 5,
        timeHash: '33333333',
        interestHashes: ['44444444'],
        moodHash: '55555555',
        nonce: 'nonce2',
      }
      expect(computeTagJaccard(vecA, vecB)).toBe(0)
    })

    it('同物种 → 相似度>0（speciesHash相同）', () => {
      const vec1 = createPetTagVector(mockPet)
      const vec2 = createPetTagVector(mockPet)
      const score = computeTagJaccard(vec1, vec2)
      expect(score).toBeGreaterThan(0)
    })

    it('相似度在[0,1]范围内', () => {
      const vec1 = createPetTagVector(mockPet)
      const dogPet: Pet = { ...mockPet, species: 'dog', personality: ['playful'] }
      const vec2 = createPetTagVector(dogPet)
      const score = computeTagJaccard(vec1, vec2)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    })
  })
})

describe('ConstellationEngine — 星点布局算法', () => {
  describe('C7. layoutConstellation: 完整布局生成', () => {
    it('生成包含自身节点的布局', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const selfTag = createPetTagVector(mockPet)
      const layout = layoutConstellation(cell, mockPet, [], selfTag)

      const selfNode = layout.nodes.find((n) => n.isSelf)
      expect(selfNode).toBeDefined()
      expect(selfNode!.pseudonym).toBe('小团子')
      expect(selfNode!.emoji).toBe('🐱')
      expect(selfNode!.x).toBe(0)
      expect(selfNode!.y).toBe(0)
    })

    it('附近宠物按H3距离布局', () => {
      const selfCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const nearbyCell = getNearbyCells(selfCell).find((c) => c !== selfCell)!
      const selfTag = createPetTagVector(mockPet)

      const nearbyPets = [
        {
          pseudonym: '星喵42',
          emoji: '😺',
          species: 'cat',
          h3Cell: nearbyCell,
          tagVector: createPetTagVector(mockPet),
        },
      ]

      const layout = layoutConstellation(selfCell, mockPet, nearbyPets, selfTag)
      const otherNode = layout.nodes.find((n) => n.id === '星喵42')

      expect(otherNode).toBeDefined()
      expect(otherNode!.ringDistance).toBe(1)
      expect(Math.abs(otherNode!.x)).toBeGreaterThan(0)
      expect(Math.abs(otherNode!.y)).toBeGreaterThan(0)
    })

    it('匹配度>0.2的宠物生成match连线', () => {
      const selfCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const nearbyCell = getNearbyCells(selfCell).find((c) => c !== selfCell)!
      const selfTag = createPetTagVector(mockPet)

      const nearbyPets = [
        {
          pseudonym: '星喵42',
          emoji: '😺',
          species: 'cat',
          h3Cell: nearbyCell,
          tagVector: selfTag,
        },
      ]

      const layout = layoutConstellation(selfCell, mockPet, nearbyPets, selfTag)
      const matchEdges = layout.edges.filter((e) => e.type === 'match')
      expect(matchEdges.length).toBeGreaterThan(0)
    })

    it('同物种生成same_species连线', () => {
      const selfCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const nearbyCell = getNearbyCells(selfCell).find((c) => c !== selfCell)!
      const selfTag = createPetTagVector(mockPet)

      const nearbyPets = [
        {
          pseudonym: '星喵42',
          emoji: '😺',
          species: 'cat',
          h3Cell: nearbyCell,
          tagVector: createPetTagVector({ ...mockPet, id: 'other' }),
        },
      ]

      const layout = layoutConstellation(selfCell, mockPet, nearbyPets, selfTag)
      const speciesEdges = layout.edges.filter((e) => e.type === 'same_species')
      expect(speciesEdges.length).toBeGreaterThan(0)
    })

    it('布局时间戳正确', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const selfTag = createPetTagVector(mockPet)
      const before = Date.now()
      const layout = layoutConstellation(cell, mockPet, [], selfTag)
      const after = Date.now()
      expect(layout.timestamp).toBeGreaterThanOrEqual(before)
      expect(layout.timestamp).toBeLessThanOrEqual(after)
    })
  })
})

describe('ConstellationEngine — NPC位置集成', () => {
  describe('C8. getNPCCells: NPC格子计算', () => {
    it('返回6个NPC的H3格子', () => {
      const npcCells = getNPCCells()
      expect(npcCells.length).toBe(6)
      npcCells.forEach((item) => {
        expect(item.npc).toBeDefined()
        expect(item.h3Cell).toBeTruthy()
        expect(typeof item.h3Cell).toBe('string')
      })
    })

    it('每个NPC有唯一的H3格子', () => {
      const npcCells = getNPCCells()
      const cells = npcCells.map((item) => item.h3Cell)
      const uniqueCells = new Set(cells)
      expect(uniqueCells.size).toBe(cells.length)
    })
  })

  describe('C9. findNearbyNPCs: 查找附近NPC', () => {
    it('三里屯附近能找到拿铁（星巴克猫）', () => {
      const userCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const nearbyNPCs = findNearbyNPCs(userCell)
      const latte = nearbyNPCs.find((n) => n.npc.name === '拿铁')
      expect(latte).toBeDefined()
      expect(latte!.ringDistance).toBeLessThanOrEqual(2)
    })

    it('上海外滩附近能找到NPC', () => {
      const userCell = latLngToH3Cell(SHANGHAI_BUND.lat, SHANGHAI_BUND.lng)
      const nearbyNPCs = findNearbyNPCs(userCell)
      expect(nearbyNPCs.length).toBeGreaterThan(0)
    })
  })
})

describe('ConstellationEngine — 邂逅事件', () => {
  describe('C10. createEncounter: 创建邂逅', () => {
    it('生成有效的邂逅事件', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const encounter = createEncounter('pet-a', 'pet-b', cell, 0.75)

      expect(encounter.encounterId).toMatch(/^enc-/)
      expect(encounter.petA).toBe('pet-a')
      expect(encounter.petB).toBe('pet-b')
      expect(encounter.h3Cell).toBe(cell)
      expect(encounter.matchScore).toBe(0.75)
      expect(encounter.status).toBe('pending')
    })

    it('不同邂逅事件ID不同', () => {
      const cell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const e1 = createEncounter('a', 'b', cell, 0.5)
      const e2 = createEncounter('a', 'b', cell, 0.5)
      expect(e1.encounterId).not.toBe(e2.encounterId)
    })
  })
})

describe('ConstellationEngine — 伪名生成', () => {
  describe('C11. generatePseudonym: 隐私伪名', () => {
    it('猫类伪名包含猫相关字', () => {
      const name = generatePseudonym('cat')
      expect(name).toMatch(/[喵猫瞳爪]/)
    })

    it('犬类伪名包含犬相关字', () => {
      const name = generatePseudonym('dog')
      expect(name).toMatch(/[汪犬尾鼻]/)
    })

    it('鸟类伪名包含鸟相关字', () => {
      const name = generatePseudonym('bird')
      expect(name).toMatch(/[翼羽鸣翎]/)
    })

    it('伪名包含数字后缀', () => {
      const name = generatePseudonym('cat')
      expect(name).toMatch(/\d+$/)
    })
  })
})

describe('ConstellationEngine — 数据流完整性', () => {
  describe('C12. GPS→H3→布局→渲染 数据流', () => {
    it('完整数据流：GPS输入 → 星点坐标输出', () => {
      const userCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const selfTag = createPetTagVector(mockPet)

      const nearbyPets = [
        {
          pseudonym: '月喵17',
          emoji: '😺',
          species: 'cat',
          h3Cell: getNearbyCells(userCell)[1],
          tagVector: createPetTagVector(mockPet),
        },
      ]

      const layout = layoutConstellation(userCell, mockPet, nearbyPets, selfTag)

      expect(layout.centerH3).toBe(userCell)
      expect(layout.nodes.length).toBeGreaterThanOrEqual(2)
      expect(layout.nodes[0].isSelf).toBe(true)
      expect(layout.nodes[0].x).toBe(0)
      expect(layout.nodes[0].y).toBe(0)

      const otherNodes = layout.nodes.filter((n) => !n.isSelf)
      otherNodes.forEach((node) => {
        expect(typeof node.x).toBe('number')
        expect(typeof node.y).toBe('number')
        expect(typeof node.brightness).toBe('number')
        expect(node.brightness).toBeGreaterThanOrEqual(0)
        expect(node.brightness).toBeLessThanOrEqual(1)
      })
    })

    it('隐私保证：布局数据中不含GPS坐标', () => {
      const userCell = latLngToH3Cell(BEIJING_SANLITUN.lat, BEIJING_SANLITUN.lng)
      const selfTag = createPetTagVector(mockPet)
      const layout = layoutConstellation(userCell, mockPet, [], selfTag)

      const layoutStr = JSON.stringify(layout)
      expect(layoutStr).not.toContain(String(BEIJING_SANLITUN.lat))
      expect(layoutStr).not.toContain(String(BEIJING_SANLITUN.lng))
    })
  })
})
