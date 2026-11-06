import { describe, expect, it } from 'vitest'
import { estimateShotOutcome, type ShotScenario } from '../simulation'
import { createDraws } from '../random'
import { CENTER_SERVICE_Y_M } from '../courtGeometry'

const scenario: ShotScenario = {
  hitter: { x: 0, y: CENTER_SERVICE_Y_M },
  opponent: { x: 20, y: CENTER_SERVICE_Y_M + 3 },
  shot: { level: 'advanced', depthErrorM: 1.4, sideErrorM: 0.9, ballSpeedMps: 25 },
  opponentSkill: { level: 'advanced', runSpeedMps: 5, consistency: 0.88 },
}

const withErrors = (depthErrorM: number, sideErrorM: number): ShotScenario => ({
  ...scenario,
  shot: { ...scenario.shot, depthErrorM, sideErrorM },
})

const aimInCourt = { x: 18, y: CENTER_SERVICE_Y_M }
const aimLong = { x: 30, y: CENTER_SERVICE_Y_M }
const aimAtLanding = { x: 20, y: CENTER_SERVICE_Y_M }
const centerDraw = { z1: 0, z2: 0 }
const wideDraw = { z1: 0, z2: 10 }

describe('estimateShotOutcome: pIn', () => {
  it('returns 1 when the only draw lands on an aim in the court', () => {
    expect(estimateShotOutcome(withErrors(1, 1), aimInCourt, [centerDraw]).pIn).toBe(1)
  })

  it('returns 0 when the only draw lands on an aim behind the far baseline', () => {
    expect(estimateShotOutcome(withErrors(1, 1), aimLong, [centerDraw]).pIn).toBe(0)
  })

  it('returns 0.5 when one of two draws swings out wide', () => {
    expect(estimateShotOutcome(withErrors(1, 1), aimInCourt, [centerDraw, wideDraw]).pIn).toBe(0.5)
  })

  it('throws when draws is empty', () => {
    expect(() => estimateShotOutcome(withErrors(1, 1), aimInCourt, [])).toThrow('draws must not be empty')
  })

  it('lands in about half the time when aiming straight down the sideline', () => {
    const sideline: ShotScenario = { ...withErrors(0.01, 0.5), hitter: { x: 0, y: 1.37 } }
    const result = estimateShotOutcome(sideline, { x: 18, y: 1.37 }, createDraws(10000))

    expect(Math.abs(result.pIn - 0.5)).toBeLessThan(0.03)
  })
})

// Same hand example as opponent.spec.ts: P(return) of a ball landing on the aim is 0.88 × 0.953 ≈ 0.838.
describe('estimateShotOutcome: return and win', () => {
  it('uses the single in-shot for return and win', () => {
    const result = estimateShotOutcome(scenario, aimAtLanding, [centerDraw])

    expect(result.pIn).toBe(1)
    expect(result.pReturnGivenIn).toBeCloseTo(0.838, 3)
    expect(result.pWin).toBeCloseTo(0.162, 3)
  })

  it('divides pWin by all shots but pReturnGivenIn only by in-shots', () => {
    const result = estimateShotOutcome(scenario, aimAtLanding, [centerDraw, wideDraw])

    expect(result.pIn).toBe(0.5)
    expect(result.pReturnGivenIn).toBeCloseTo(0.838, 3)
    expect(result.pWin).toBeCloseTo(0.081, 3)
  })

  it('returns null for pReturnGivenIn when every shot is out', () => {
    const result = estimateShotOutcome(scenario, aimLong, [centerDraw])

    expect(result.pIn).toBe(0)
    expect(result.pWin).toBe(0)
    expect(result.pReturnGivenIn).toBeNull()
  })
})
