import { describe, expect, it } from 'vitest'
import { estimateInProbability } from '../simulation'
import { createDraws } from '../random'
import { CENTER_SERVICE_Y_M } from '../courtGeometry'

const hitter = { x: 0, y: CENTER_SERVICE_Y_M }
const aimInCourt = { x: 18, y: CENTER_SERVICE_Y_M }
const aimLong = { x: 30, y: CENTER_SERVICE_Y_M }

describe('estimateInProbability', () => {
  it('returns 1 when the only draw lands on an aim in the court', () => {
    expect(estimateInProbability(hitter, aimInCourt, 1, 1, [{ z1: 0, z2: 0 }])).toBe(1)
  })

  it('returns 0 when the only draw lands on an aim behind the far baseline', () => {
    expect(estimateInProbability(hitter, aimLong, 1, 1, [{ z1: 0, z2: 0 }])).toBe(0)
  })

  it('returns 0.5 when one of two draws swings out wide', () => {
    const draws = [
      { z1: 0, z2: 0 },
      { z1: 0, z2: 10 },
    ]

    expect(estimateInProbability(hitter, aimInCourt, 1, 1, draws)).toBe(0.5)
  })

  it('throws when draws is empty', () => {
    expect(() => estimateInProbability(hitter, aimInCourt, 1, 1, [])).toThrow('draws must not be empty')
  })

  it('lands in about half the time when aiming straight down the sideline', () => {
    const result = estimateInProbability({ x: 0, y: 1.37 }, { x: 18, y: 1.37 }, 0.01, 0.5, createDraws(10000))

    expect(Math.abs(result - 0.5)).toBeLessThan(0.03)
  })
})
