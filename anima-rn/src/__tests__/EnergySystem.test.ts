import {
  createEnergyState,
  decayEnergy,
  onOwnerInteraction,
  onPetPat,
  onOwnerSad,
  onSocialInteraction,
  onHarassOther,
  canDoSocial,
  canDoHarass,
  computeStatus,
  getWanderingBehavior,
  getStatusEmoji,
} from '../lib/EnergySystem'
import type { EnergyState, PetStatus } from '../types'

describe('EnergySystem — 数据结构', () => {
  describe('E1. createEnergyState: 初始状态', () => {
    it('默认状态: mood=80, energy=100', () => {
      const state = createEnergyState()
      expect(state.mood).toBe(80)
      expect(state.energy).toBe(100)
      expect(state.status).toBe('happy')
    })

    it('可覆盖部分字段', () => {
      const state = createEnergyState({ mood: 30, energy: 50 })
      expect(state.mood).toBe(30)
      expect(state.energy).toBe(50)
      expect(state.status).not.toBe('happy')
    })

    it('status根据mood/energy自动计算', () => {
      const state = createEnergyState({ mood: 10, energy: 5 })
      expect(state.status).toBe('sleeping')
    })

    it('lastInteractionAt是有效ISO时间', () => {
      const state = createEnergyState()
      expect(new Date(state.lastInteractionAt).getTime()).not.toBeNaN()
    })
  })
})

describe('EnergySystem — 状态转换逻辑', () => {
  describe('E2. computeStatus: 双维度→7种状态', () => {
    const cases: Array<{ mood: number; energy: number; expected: PetStatus }> = [
      { mood: 80, energy: 90, expected: 'happy' },
      { mood: 60, energy: 50, expected: 'idle' },
      { mood: 30, energy: 80, expected: 'bored' },
      { mood: 60, energy: 20, expected: 'tired' },
      { mood: 15, energy: 80, expected: 'grumpy' },
      { mood: 50, energy: 5, expected: 'sleeping' },
    ]

    cases.forEach(({ mood, energy, expected }) => {
      it(`mood=${mood}, energy=${energy} → ${expected}`, () => {
        expect(computeStatus(mood, energy)).toBe(expected)
      })
    })

    it('energy≤10 强制sleeping，无论mood多高', () => {
      expect(computeStatus(100, 10)).toBe('sleeping')
      expect(computeStatus(100, 9)).toBe('sleeping')
    })

    it('mood≤20 + energy>50 → grumpy', () => {
      expect(computeStatus(20, 60)).toBe('grumpy')
    })
  })
})

describe('EnergySystem — 自然衰减', () => {
  describe('E3. decayEnergy: 时间驱动衰减', () => {
    it('刚交互后衰减接近0', () => {
      const state = createEnergyState({ mood: 80, energy: 50 })
      const decayed = decayEnergy(state)
      expect(decayed.mood).toBeCloseTo(80, 0)
    })

    it('1小时不互动 → mood下降5', () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
      const state = createEnergyState({
        mood: 80,
        energy: 50,
        lastInteractionAt: oneHourAgo,
      })
      const decayed = decayEnergy(state)
      expect(decayed.mood).toBeLessThan(80)
      expect(decayed.mood).toBeGreaterThanOrEqual(75)
    })

    it('8小时不互动 → mood显著下降', () => {
      const eightHoursAgo = new Date(Date.now() - 8 * 3600000).toISOString()
      const state = createEnergyState({
        mood: 80,
        energy: 50,
        lastInteractionAt: eightHoursAgo,
      })
      const decayed = decayEnergy(state)
      expect(decayed.mood).toBeLessThan(50)
    })

    it('energy随时间恢复', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 3600000).toISOString()
      const state = createEnergyState({
        mood: 80,
        energy: 30,
        lastInteractionAt: fiveHoursAgo,
      })
      const decayed = decayEnergy(state)
      expect(decayed.energy).toBeGreaterThan(30)
    })

    it('mood最低不低于5', () => {
      const longAgo = new Date(Date.now() - 100 * 3600000).toISOString()
      const state = createEnergyState({
        mood: 80,
        energy: 50,
        lastInteractionAt: longAgo,
      })
      const decayed = decayEnergy(state)
      expect(decayed.mood).toBeGreaterThanOrEqual(5)
    })

    it('energy最高不超过100', () => {
      const longAgo = new Date(Date.now() - 100 * 3600000).toISOString()
      const state = createEnergyState({
        mood: 80,
        energy: 50,
        lastInteractionAt: longAgo,
      })
      const decayed = decayEnergy(state)
      expect(decayed.energy).toBeLessThanOrEqual(100)
    })
  })
})

describe('EnergySystem — 交互影响', () => {
  describe('E4. onOwnerInteraction: 主人互动', () => {
    it('mood增加15', () => {
      const state = createEnergyState({ mood: 50, energy: 80 })
      const result = onOwnerInteraction(state)
      expect(result.mood).toBe(65)
    })

    it('mood不超过100', () => {
      const state = createEnergyState({ mood: 95, energy: 80 })
      const result = onOwnerInteraction(state)
      expect(result.mood).toBe(100)
    })

    it('更新lastInteractionAt', () => {
      const oldTime = new Date('2026-01-01').toISOString()
      const state = createEnergyState({ mood: 50, energy: 80, lastInteractionAt: oldTime })
      const result = onOwnerInteraction(state)
      expect(result.lastInteractionAt).not.toBe(oldTime)
    })
  })

  describe('E5. onPetPat: 撸宠物', () => {
    it('mood增加10', () => {
      const state = createEnergyState({ mood: 50, energy: 80 })
      const result = onPetPat(state)
      expect(result.mood).toBe(60)
    })
  })

  describe('E6. onOwnerSad: 主人难过', () => {
    it('mood减少10', () => {
      const state = createEnergyState({ mood: 60, energy: 80 })
      const result = onOwnerSad(state)
      expect(result.mood).toBe(50)
    })
  })

  describe('E7. onSocialInteraction: 社交消耗', () => {
    it('energy减少20, mood增加5', () => {
      const state = createEnergyState({ mood: 50, energy: 80 })
      const result = onSocialInteraction(state)
      expect(result.energy).toBe(60)
      expect(result.mood).toBe(55)
    })

    it('更新lastSocialAt', () => {
      const state = createEnergyState({ mood: 50, energy: 80, lastSocialAt: null })
      const result = onSocialInteraction(state)
      expect(result.lastSocialAt).not.toBeNull()
    })
  })

  describe('E8. onHarassOther: 骚扰其他宠物', () => {
    it('energy减少15, mood增加8', () => {
      const state = createEnergyState({ mood: 50, energy: 80 })
      const result = onHarassOther(state)
      expect(result.energy).toBe(65)
      expect(result.mood).toBe(58)
    })
  })
})

describe('EnergySystem — 行为门控', () => {
  describe('E9. canDoSocial: 社交能力判断', () => {
    it('energy充足 + 正常状态 → 可以社交', () => {
      const state = createEnergyState({ mood: 60, energy: 80 })
      expect(canDoSocial(state)).toBe(true)
    })

    it('energy不足 → 不能社交', () => {
      const state = createEnergyState({ mood: 60, energy: 15 })
      expect(canDoSocial(state)).toBe(false)
    })

    it('sleeping状态 → 不能社交', () => {
      const state = createEnergyState({ mood: 60, energy: 5 })
      expect(canDoSocial(state)).toBe(false)
    })

    it('grumpy状态 → 不能社交', () => {
      const state = createEnergyState({ mood: 15, energy: 80 })
      expect(canDoSocial(state)).toBe(false)
    })
  })

  describe('E10. canDoHarass: 骚扰能力判断', () => {
    it('energy充足 + mood≥40 → 可以骚扰', () => {
      const state = createEnergyState({ mood: 50, energy: 80 })
      expect(canDoHarass(state)).toBe(true)
    })

    it('mood<40 → 不能骚扰', () => {
      const state = createEnergyState({ mood: 30, energy: 80 })
      expect(canDoHarass(state)).toBe(false)
    })
  })
})

describe('EnergySystem — 闲逛行为决策', () => {
  describe('E11. getWanderingBehavior: 闲逛→行为映射', () => {
    it('energy<20 → go_home', () => {
      expect(getWanderingBehavior({ energy: 15 } as EnergyState, 50)).toBe('go_home')
    })

    it('energy<30 → sleep', () => {
      expect(getWanderingBehavior({ energy: 25 } as EnergyState, 50)).toBe('sleep')
    })

    it('mood<30 + energy>50 → harass', () => {
      expect(getWanderingBehavior({ energy: 60 } as EnergyState, 25)).toBe('harass')
    })

    it('mood>50 + energy>50 → socialize', () => {
      expect(getWanderingBehavior({ energy: 60 } as EnergyState, 60)).toBe('socialize')
    })
  })
})

describe('EnergySystem — 数据流完整性', () => {
  describe('E12. 完整生命周期数据流', () => {
    it('新用户 → 互动 → 社交 → 耗尽 → 恢复', () => {
      let state = createEnergyState()
      expect(state.status).toBe('happy')

      state = onSocialInteraction(state)
      expect(state.energy).toBe(80)
      expect(state.lastSocialAt).not.toBeNull()

      state = onSocialInteraction(state)
      state = onSocialInteraction(state)
      state = onSocialInteraction(state)
      expect(state.energy).toBe(20)

      expect(canDoSocial(state)).toBe(true)

      state = onSocialInteraction(state)
      expect(state.energy).toBe(0)
      expect(canDoSocial(state)).toBe(false)
      expect(state.status).toBe('sleeping')

      const fiveHoursLater = new Date(Date.now() - 5 * 3600000).toISOString()
      state = { ...state, lastInteractionAt: fiveHoursLater }
      state = decayEnergy(state)
      expect(state.energy).toBeGreaterThan(0)
    })
  })
})
