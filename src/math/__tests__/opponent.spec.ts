import { describe, expect, it } from 'vitest'
import { opponentCoverage, reachProbability, returnProbability } from '../opponent'
import type { OpponentSkill } from '@/types/opponentSkill'

const hitter = { x: 0, y: 5.485 }
const opponent = { x: 20, y: 8.485 }
const landing = { x: 20, y: 5.485 }
const opponentSkill: OpponentSkill = { level: 'advanced', runSpeedMps: 5, consistency: 0.88 }

describe('opponentCoverage', () => {
  it('is run speed × flight time (20 m at 25 m/s = 0.8 s)', () => {
    expect(opponentCoverage(hitter, landing, 25, 5)).toBe(4)
  })

  it('throws when ballSpeedMps is 0', () => {
    expect(() => opponentCoverage(hitter, landing, 0, 5)).toThrow('ballSpeedMps')
  })
})

describe('reachProbability', () => {
  it('is 0.5 at the edge of reach', () => {
    expect(reachProbability(0, 3)).toBeCloseTo(0.5)
  })

  it('is high with 1 m to spare', () => {
    expect(reachProbability(-1, 3)).toBeCloseTo(0.953, 3)
  })

  it('is low when 1 m too slow', () => {
    expect(reachProbability(1, 3)).toBeCloseTo(0.047, 3)
  })

  it('is symmetric around the edge of reach', () => {
    expect(reachProbability(0.7, 3) + reachProbability(-0.7, 3)).toBeCloseTo(1)
  })
})

describe('returnProbability', () => {
  // 20 m flight at 25 m/s = 0.8 s, reach 5 × 0.8 = 4 m, gap 3 m, margin -1 m → 0.88 × 0.953
  it('matches the hand example', () => {
    expect(returnProbability(hitter, opponent, landing, 25, opponentSkill, 3)).toBeCloseTo(0.838, 3)
  })

  it('throws when ballSpeedMps is 0', () => {
    expect(() => returnProbability(hitter, opponent, landing, 0, opponentSkill, 3)).toThrow('ballSpeedMps')
  })
})
