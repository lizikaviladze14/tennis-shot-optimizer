import { describe, expect, it } from 'vitest'
import { findBestAim, gridAims, shotValue } from '../optimizer'
import type { ShotOutcome, ShotScenario } from '../simulation'
import { isPointInCourt } from '../shotScore'
import { metresPastNet } from '../describeTarget'
import {
  CENTER_SERVICE_Y_M,
  COURT_SURFACE_LENGTH_M,
  NET_X_M,
  SERVICE_LINE_FAR_X_M,
  SINGLES_LEFT_Y_M,
  SINGLES_RIGHT_Y_M,
} from '../courtGeometry'

const A: ShotOutcome = { pIn: 0.8, pWin: 0.4, pRallyWin: 0.4, pRallyWinSE: 0, pReturnGivenIn: null, winContributionVariance: 0 }
const B: ShotOutcome = { pIn: 0.97, pWin: 0.3, pRallyWin: 0.3, pRallyWinSE: 0, pReturnGivenIn: null, winContributionVariance: 0 }

describe('shotValue', () => {
  it('prefers the safer shot B with riskWeight 1', () => {
    expect(shotValue(A, 1)).toBeCloseTo(0.2)
    expect(shotValue(B, 1)).toBeCloseTo(0.27)
  })

  it('prefers the riskier shot A with riskWeight 0.5', () => {
    expect(shotValue(A, 0.5)).toBeCloseTo(0.3)
    expect(shotValue(B, 0.5)).toBeCloseTo(0.285)
  })

  it('equals P(win) with riskWeight 0', () => {
    expect(shotValue(A, 0)).toBeCloseTo(0.4)
    expect(shotValue(A, 0)).toBeCloseTo(A.pWin)
  })

  it('scores A and B equally at riskWeight 10/17', () => {
    expect(shotValue(A, 10 / 17)).toBeCloseTo(shotValue(B, 10 / 17))
  })

  it('can be negative', () => {
    expect(shotValue({ pIn: 0.5, pWin: 0.2, pRallyWin: 0.2, pRallyWinSE: 0, pReturnGivenIn: null, winContributionVariance: 0 }, 1)).toBeCloseTo(-0.3)
  })

  it('throws when riskWeight is negative', () => {
    expect(() => shotValue(A, -1)).toThrow('riskWeight must be 0 or greater')
  })
})

describe('gridAims', () => {
  const cellCount = 27
  const cellX = (COURT_SURFACE_LENGTH_M - NET_X_M) / cellCount
  const cellY = (SINGLES_RIGHT_Y_M - SINGLES_LEFT_Y_M) / cellCount
  const aims = gridAims(cellCount)

  it('has cellCount × cellCount points', () => {
    expect(aims).toHaveLength(729)
  })

  it('starts at the center of the cell next to the net and the left sideline', () => {
    const first = aims[0]!
    expect(first.x).toBeCloseTo(NET_X_M + cellX / 2)
    expect(first.y).toBeCloseTo(SINGLES_LEFT_Y_M + cellY / 2)
  })

  it('ends at the center of the cell at the far baseline and the right sideline', () => {
    const last = aims[aims.length - 1]!
    expect(last.x).toBeCloseTo(COURT_SURFACE_LENGTH_M - cellX / 2)
    expect(last.y).toBeCloseTo(SINGLES_RIGHT_Y_M - cellY / 2)
  })

  it('keeps every point in the court', () => {
    expect(aims.every((aim) => isPointInCourt(aim))).toBe(true)
  })

  it('has points on the center line when cellCount is odd', () => {
    const closest = aims.reduce((a, b) =>
      Math.abs(b.y - CENTER_SERVICE_Y_M) < Math.abs(a.y - CENTER_SERVICE_Y_M) ? b : a,
    )
    expect(closest.y).toBeCloseTo(CENTER_SERVICE_Y_M)
  })

  it('throws for a cellCount that is not a positive integer', () => {
    expect(() => gridAims(0)).toThrow('cellCount must be a positive integer')
    expect(() => gridAims(2.5)).toThrow('cellCount must be a positive integer')
  })
})

describe('findBestAim', () => {
  const scenario: ShotScenario = {
    hitter: { x: 0, y: CENTER_SERVICE_Y_M },
    opponent: { x: COURT_SURFACE_LENGTH_M, y: 2 },
    shot: { level: 'advanced', depthErrorM: 1.4, sideErrorM: 0.9, ballSpeedMps: 25 },
    opponentSkill: { level: 'advanced', runSpeedMps: 5, consistency: 0.88 },
    bounce: { afterBounceSpeedMps: 25, playableWindowS: 0 },
    depthSpeed: { minPastNetM: 0, maxPastNetM: 1, minFactor: 1 },
    returnValue: { atNet: 0, atBaseline: 0 },
  }
  const { best, results } = findBestAim(scenario, [{ z1: 0, z2: 0 }], 0.4, 27)

  it('returns one result per grid aim', () => {
    expect(results).toHaveLength(729)
  })

  it('returns results in gridAims order', () => {
    expect(results.map((result) => result.aim)).toEqual(gridAims(27))
  })

  it('picks the highest value', () => {
    expect(results.every((result) => best.value >= result.value)).toBe(true)
  })

  it('aims short and away from an opponent standing deep at low y', () => {
    expect(best.aim.y).toBeGreaterThan(CENTER_SERVICE_Y_M)
    expect(best.aim.x).toBeLessThan(SERVICE_LINE_FAR_X_M)
  })
})

describe('findBestAim pastNetRange', () => {
  const scenario: ShotScenario = {
    hitter: { x: 0, y: CENTER_SERVICE_Y_M },
    opponent: { x: COURT_SURFACE_LENGTH_M, y: 2 },
    shot: { level: 'advanced', depthErrorM: 1.4, sideErrorM: 0.9, ballSpeedMps: 25 },
    opponentSkill: { level: 'advanced', runSpeedMps: 5, consistency: 0.88 },
    bounce: { afterBounceSpeedMps: 25, playableWindowS: 0 },
    depthSpeed: { minPastNetM: 0, maxPastNetM: 1, minFactor: 1 },
    returnValue: { atNet: 0, atBaseline: 0 },
  }
  const draws = [{ z1: 0, z2: 0 }]
  const riskWeight = 0.4
  const cellCount = 27

  it('returns the full grid when no range is given', () => {
    const { results } = findBestAim(scenario, draws, riskWeight, cellCount)
    expect(results).toHaveLength(729)
  })

  it('keeps only drop-range aims', () => {
    const { results } = findBestAim(scenario, draws, riskWeight, cellCount, { min: 0.5, max: 5 })
    expect(results.every((result) => {
      const pastNet = metresPastNet(result.aim)
      return 0.5 <= pastNet && pastNet <= 5
    })).toBe(true)
    expect(results.length).toBeLessThan(729)
  })

  it('keeps drive-range aims off the short ball', () => {
    const range = { min: 4.5, max: COURT_SURFACE_LENGTH_M - NET_X_M }
    const { best, results } = findBestAim(scenario, draws, riskWeight, cellCount, range)
    expect(results.every((result) => metresPastNet(result.aim) >= 4.5)).toBe(true)
    const bestPastNet = metresPastNet(best.aim)
    expect(bestPastNet).toBeGreaterThanOrEqual(range.min)
    expect(bestPastNet).toBeLessThanOrEqual(range.max)
  })

  it('throws when the range is outside the court', () => {
    expect(() => findBestAim(scenario, draws, riskWeight, cellCount, { min: 20, max: 30 })).toThrow(
      'no aims in the given range',
    )
  })
})
