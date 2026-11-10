import { describe, expect, it } from 'vitest'
import { aimInterception, estimateShotOutcome, type ShotScenario } from '../simulation'
import { createDraws } from '../random'
import { CENTER_SERVICE_Y_M, COURT_SURFACE_LENGTH_M, NET_X_M } from '../courtGeometry'

const scenario: ShotScenario = {
  hitter: { x: 0, y: CENTER_SERVICE_Y_M },
  opponent: { x: 20, y: CENTER_SERVICE_Y_M + 3 },
  shot: { level: 'advanced', depthErrorM: 1.4, sideErrorM: 0.9, ballSpeedMps: 25 },
  opponentSkill: { level: 'advanced', runSpeedMps: 5, consistency: 0.88 },
  bounce: { afterBounceSpeedMps: 25, playableWindowS: 0 },
  depthSpeed: { minPastNetM: 0, maxPastNetM: 1, minFactor: 1 },
  returnValue: { atNet: 0, atBaseline: 0 },
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

describe('aimInterception', () => {
  it('is the aim itself when the window is 0 and depth does not change the speed', () => {
    const interception = aimInterception(scenario, aimInCourt)
    expect(interception.point).toEqual(aimInCourt)
  })
})

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

describe('estimateShotOutcome: winContributionVariance', () => {
  it('is 0 when every shot has the same win contribution', () => {
    expect(estimateShotOutcome(scenario, aimAtLanding, [centerDraw]).winContributionVariance).toBe(0)
    expect(estimateShotOutcome(scenario, aimLong, [centerDraw]).winContributionVariance).toBe(0)
  })

  it('is 0.25 for one unreturnable in-shot and one out', () => {
    const neverReturns: ShotScenario = {
      ...scenario,
      opponentSkill: { ...scenario.opponentSkill, consistency: 0 },
    }
    const result = estimateShotOutcome(neverReturns, aimAtLanding, [centerDraw, wideDraw])

    expect(result.pWin).toBe(0.5)
    expect(result.winContributionVariance).toBe(0.25)
  })
})

describe('estimateShotOutcome: depth speed', () => {
  it('gives the opponent a higher return chance when a short aim is slower', () => {
    const aim = { x: NET_X_M + 4.6, y: CENTER_SERVICE_Y_M }
    const depthRange = { minPastNetM: 4.5, maxPastNetM: 11.885 }
    const fullSpeed = estimateShotOutcome(
      { ...scenario, depthSpeed: { ...depthRange, minFactor: 1 } },
      aim,
      [centerDraw],
    )
    const slower = estimateShotOutcome(
      { ...scenario, depthSpeed: { ...depthRange, minFactor: 0.6 } },
      aim,
      [centerDraw],
    )

    expect(slower.pReturnGivenIn).not.toBeNull()
    expect(fullSpeed.pReturnGivenIn).not.toBeNull()
    expect(slower.pReturnGivenIn!).toBeGreaterThan(fullSpeed.pReturnGivenIn!)
  })
})

describe('estimateShotOutcome: rally win', () => {
  it('equals pWin when a return is worth nothing', () => {
    const result = estimateShotOutcome(scenario, aimAtLanding, [centerDraw])
    expect(result.pRallyWin).toBe(result.pWin)
  })

  it('uses a constant q of 0.5 for a mid-court aim', () => {
    const valued = { ...scenario, returnValue: { atNet: 0.5, atBaseline: 0.5 } }
    const result = estimateShotOutcome(valued, aimInCourt, [centerDraw])
    expect(result.pReturnGivenIn).not.toBeNull()
    expect(result.pRallyWin).toBeCloseTo(1 - 0.5 * result.pReturnGivenIn!)
  })

  it('gives a returned deep landing more rally value than a short one', () => {
    const valued = { ...scenario, returnValue: { atNet: 0.2, atBaseline: 0.5 } }
    const short = estimateShotOutcome(valued, { x: NET_X_M + 1, y: CENTER_SERVICE_Y_M }, [centerDraw])
    const deep = estimateShotOutcome(
      valued,
      { x: COURT_SURFACE_LENGTH_M - 0.5, y: CENTER_SERVICE_Y_M },
      [centerDraw],
    )
    expect(deep.pRallyWin - deep.pWin).toBeGreaterThan(short.pRallyWin - short.pWin)
  })
})
