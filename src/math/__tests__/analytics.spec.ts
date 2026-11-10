import { describe, expect, it } from 'vitest'
import {
  highestWinResult,
  intervalHalfWidth,
  landingCounts,
  pointsDifference,
  safestResult,
  simulatedLandings,
} from '../analytics'
import {
  CENTER_SERVICE_Y_M,
  SINGLES_RIGHT_Y_M,
} from '../courtGeometry'
import { Z_95 } from '../modelConstants'
import type { AimResult } from '../optimizer'
import type { ShotAccuracy } from '@/types/shotAccuracy'

function result(x: number, pIn: number, pWin: number, pRallyWin = pWin): AimResult {
  return { aim: { x, y: 4 }, outcome: { pIn, pWin, pRallyWin, pRallyWinSE: 0, pReturnGivenIn: null, winContributionVariance: 0 }, value: pWin }
}

describe('safestResult', () => {
  it('throws for an empty list', () => {
    expect(() => safestResult([])).toThrow()
  })

  it('returns the only result', () => {
    const only = result(14, 0.5, 0.2)
    expect(safestResult([only])).toBe(only)
  })

  it('picks the highest P(in), even when its P(win) is lower', () => {
    const risky = result(14, 0.9, 0.8)
    const safe = result(15, 0.99, 0.1)
    expect(safestResult([risky, safe])).toBe(safe)
  })

  it('breaks a P(in) tie with the higher P(win)', () => {
    const lowWin = result(14, 1, 0.3)
    const highWin = result(15, 1, 0.9)
    expect(safestResult([lowWin, highWin])).toBe(highWin)
  })

  it('keeps the first result on a full tie', () => {
    const first = result(14, 0.8, 0.5)
    const second = result(15, 0.8, 0.5)
    expect(safestResult([first, second])).toBe(first)
  })

  it('handles P(win) = 0 and P(in) = 0', () => {
    const neverIn = result(14, 0, 0)
    const neverWins = result(15, 0.6, 0)
    expect(safestResult([neverIn, neverWins])).toBe(neverWins)
  })

  it('breaks a P(in) tie with the higher rally win when that metric is selected', () => {
    const lowRally = result(14, 1, 0.9, 0.2)
    const highRally = result(15, 1, 0.1, 0.8)
    expect(safestResult([lowRally, highRally], 'pRallyWin')).toBe(highRally)
  })
})

describe('highestWinResult', () => {
  it('throws for an empty list', () => {
    expect(() => highestWinResult([])).toThrow()
  })

  it('returns the only result', () => {
    const only = result(14, 0.5, 0.2)
    expect(highestWinResult([only])).toBe(only)
  })

  it('picks the highest P(win), even when its P(in) is lower', () => {
    const safe = result(14, 0.99, 0.1)
    const risky = result(15, 0.9, 0.8)
    expect(highestWinResult([safe, risky])).toBe(risky)
  })

  it('breaks a P(win) tie with the higher P(in)', () => {
    const lowIn = result(14, 0.7, 0.6)
    const highIn = result(15, 0.95, 0.6)
    expect(highestWinResult([lowIn, highIn])).toBe(highIn)
  })

  it('keeps the first result on a full tie', () => {
    const first = result(14, 0.8, 0.5)
    const second = result(15, 0.8, 0.5)
    expect(highestWinResult([first, second])).toBe(first)
  })

  it('handles P(win) = 0 everywhere', () => {
    const neverIn = result(14, 0, 0)
    const inButNeverWins = result(15, 0.6, 0)
    expect(highestWinResult([neverIn, inButNeverWins])).toBe(inButNeverWins)
  })

  it('ranks by rally win when that metric is selected', () => {
    const highWin = result(14, 0.9, 0.8, 0.2)
    const highRally = result(15, 0.7, 0.1, 0.6)
    expect(highestWinResult([highWin, highRally], 'pRallyWin')).toBe(highRally)
  })

  it('breaks a rally-win tie with the higher P(in)', () => {
    const lowIn = result(14, 0.4, 0.9, 0.5)
    const highIn = result(15, 0.8, 0.1, 0.5)
    expect(highestWinResult([lowIn, highIn], 'pRallyWin')).toBe(highIn)
  })
})

describe('pointsDifference', () => {
  it('is positive when the result wins more often', () => {
    expect(pointsDifference(result(14, 1, 0.96), result(15, 1, 0.95))).toBe(1)
  })

  it('is negative when the result wins less often', () => {
    expect(pointsDifference(result(14, 1, 0.3), result(15, 1, 0.95))).toBe(-65)
  })

  it('is 0 for the same win chance', () => {
    const recommended = result(14, 1, 0.95)
    expect(pointsDifference(recommended, recommended)).toBe(0)
  })

  it('rounds the difference, not each percentage', () => {
    expect(pointsDifference(result(14, 1, 0.954), result(15, 1, 0.946))).toBe(1)
  })
})

const hitter = { x: 0, y: CENTER_SERVICE_Y_M }
const shot: ShotAccuracy = { level: 'advanced', depthErrorM: 1, sideErrorM: 1, ballSpeedMps: 23 }
const noSwing = { z1: 0, z2: 0 }

describe('simulatedLandings', () => {
  it('returns an empty array when there are no draws', () => {
    expect(simulatedLandings(hitter, { x: 18, y: CENTER_SERVICE_Y_M }, shot, [])).toEqual([])
  })

  it('tags a landing on an in-court aim as in', () => {
    const aim = { x: 18, y: CENTER_SERVICE_Y_M }
    const [landing] = simulatedLandings(hitter, aim, shot, [noSwing])
    expect(landing?.kind).toBe('in')
    expect(landing?.point).toEqual(aim)
  })

  it('tags a landing past the far baseline as long', () => {
    const [landing] = simulatedLandings(hitter, { x: 30, y: CENTER_SERVICE_Y_M }, shot, [noSwing])
    expect(landing?.kind).toBe('long')
  })

  it('tags a landing on the hitter side of the net as netShort', () => {
    const [landing] = simulatedLandings(hitter, { x: 5, y: CENTER_SERVICE_Y_M }, shot, [noSwing])
    expect(landing?.kind).toBe('netShort')
  })

  it('tags a landing in the doubles alley as wide', () => {
    const [landing] = simulatedLandings(hitter, { x: 18, y: SINGLES_RIGHT_Y_M + 0.5 }, shot, [noSwing])
    expect(landing?.kind).toBe('wide')
  })
})

describe('landingCounts', () => {
  it('returns zeros for an empty list', () => {
    expect(landingCounts([])).toEqual({ in: 0, long: 0, wide: 0, netShort: 0 })
  })

  it('counts each kind', () => {
    expect(
      landingCounts([
        { kind: 'in' },
        { kind: 'long' },
        { kind: 'wide' },
        { kind: 'netShort' },
        { kind: 'in' },
      ]),
    ).toEqual({ in: 2, long: 1, wide: 1, netShort: 1 })
  })
})

describe('intervalHalfWidth', () => {
  it('throws when n is not positive', () => {
    expect(() => intervalHalfWidth(0.25, 0)).toThrow('n must be greater than 0')
  })

  it('is 0 when there is no variance', () => {
    expect(intervalHalfWidth(0, 500)).toBe(0)
  })

  it('is Z_95 times the standard error', () => {
    expect(intervalHalfWidth(0.25, 100)).toBeCloseTo(Z_95 * 0.05)
  })
})
