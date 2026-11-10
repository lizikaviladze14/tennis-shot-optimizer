import { describe, expect, it } from 'vitest'
import { bestInterception, opponentCoverage, reachProbability, returnProbability } from '../opponent'
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
  const noBounce = { afterBounceSpeedMps: 25, playableWindowS: 0 }

  // 20 m flight at 25 m/s = 0.8 s, reach 5 × 0.8 = 4 m, gap 3 m, margin -1 m → 0.88 × 0.953
  it('matches the hand example', () => {
    expect(returnProbability(hitter, opponent, landing, 25, opponentSkill, 3, noBounce)).toBeCloseTo(0.838, 3)
  })

  it('throws when ballSpeedMps is 0', () => {
    expect(() =>
      returnProbability(hitter, opponent, landing, 0, opponentSkill, 3, { afterBounceSpeedMps: 0, playableWindowS: 0 }),
    ).toThrow('ballSpeedMps')
  })

  const steepness = 3
  const shortHitter = { x: 0, y: 5.485 }
  const shortLanding = { x: 16.4, y: 5.485 }
  const shortOpponent = { x: 24.57, y: 5.485 }

  function shortDrive(playableWindowS: number) {
    return returnProbability(shortHitter, shortOpponent, shortLanding, 28, opponentSkill, steepness, {
      afterBounceSpeedMps: 18.2,
      playableWindowS,
    })
  }

  it('equals the old result when the playable window is 0', () => {
    expect(
      returnProbability(hitter, opponent, landing, 25, opponentSkill, steepness, {
        afterBounceSpeedMps: 25,
        playableWindowS: 0,
      }),
    ).toBeCloseTo(0.838, 3)
  })

  it('is almost no return for a short fast drive with no bounce', () => {
    expect(shortDrive(0)).toBeLessThan(0.01)
  })

  it('is an easy return for the same shot once the ball keeps travelling', () => {
    expect(shortDrive(0.4)).toBeCloseTo(0.88, 2)
  })

  it('never lowers the return probability when the window gets longer', () => {
    const window0 = shortDrive(0)
    const window02 = shortDrive(0.2)
    const window04 = shortDrive(0.4)
    expect(window04).toBeGreaterThanOrEqual(window02)
    expect(window02).toBeGreaterThanOrEqual(window0)
  })

  it('throws when playableWindowS is negative', () => {
    expect(() => shortDrive(-0.1)).toThrow('playableWindowS must be 0 or greater')
  })
})

describe('bestInterception', () => {
  it('plays the ball at the landing when the window is 0', () => {
    const interception = bestInterception(hitter, opponent, landing, 25, 5, {
      afterBounceSpeedMps: 25,
      playableWindowS: 0,
    })
    expect(interception.point).toEqual(landing)
    expect(interception.afterBounceM).toBe(0)
  })

  it('plays a short fast drive at the end of its path', () => {
    const interception = bestInterception(
      { x: 0, y: 5.485 },
      { x: 24.57, y: 5.485 },
      { x: 16.4, y: 5.485 },
      28,
      5,
      { afterBounceSpeedMps: 18.2, playableWindowS: 0.4 },
    )
    expect(interception.afterBounceM).toBeCloseTo(7.28)
    expect(interception.marginM).toBeLessThan(0)
  })
})
