import { describe, expect, it } from 'vitest'
import { calcShotScore, isOnOpponentHalf, isPointInCourt } from '../shotScore'
import {
  CENTER_SERVICE_Y_M,
  COURT_SURFACE_LENGTH_M,
  COURT_SURFACE_WIDTH_M,
  NET_X_M,
  RUNOFF_M,
  SINGLES_ALLEY_M,
} from '../courtGeometry'

const you = { x: 0, y: CENTER_SERVICE_Y_M }
const opponent = { x: COURT_SURFACE_LENGTH_M, y: CENTER_SERVICE_Y_M }

describe('isPointInCourt', () => {
  it('accepts the middle of the opponent singles court', () => {
    expect(isPointInCourt({ x: 18, y: CENTER_SERVICE_Y_M })).toBe(true)
  })

  it('rejects a point on the net', () => {
    expect(isPointInCourt({ x: NET_X_M, y: CENTER_SERVICE_Y_M })).toBe(false)
  })

  it('accepts the far baseline and both singles sidelines', () => {
    expect(isPointInCourt({ x: COURT_SURFACE_LENGTH_M, y: CENTER_SERVICE_Y_M })).toBe(true)
    expect(isPointInCourt({ x: 18, y: SINGLES_ALLEY_M })).toBe(true)
    expect(isPointInCourt({ x: 18, y: COURT_SURFACE_WIDTH_M - SINGLES_ALLEY_M })).toBe(true)
  })

  it('rejects an alley', () => {
    expect(isPointInCourt({ x: 18, y: SINGLES_ALLEY_M - 0.1 })).toBe(false)
  })
})

describe('isOnOpponentHalf', () => {
  it('accepts a point in the far runoff', () => {
    expect(isOnOpponentHalf({ x: COURT_SURFACE_LENGTH_M + 1, y: -1 })).toBe(true)
  })

  it('rejects a point on my side', () => {
    expect(isOnOpponentHalf({ x: 5, y: CENTER_SERVICE_Y_M })).toBe(false)
  })

  it('rejects a point exactly on the net', () => {
    expect(isOnOpponentHalf({ x: NET_X_M, y: CENTER_SERVICE_Y_M })).toBe(false)
  })

  it('rejects a point beyond the far runoff', () => {
    expect(isOnOpponentHalf({ x: COURT_SURFACE_LENGTH_M + RUNOFF_M + 0.1, y: CENTER_SERVICE_Y_M })).toBe(false)
  })
})

describe('calcShotScore', () => {
  it('measures a straight shot up the middle', () => {
    const result = calcShotScore(you, opponent, { x: 18, y: CENTER_SERVICE_Y_M })

    expect(result.isShotIn).toBe(true)
    expect(result.targetDistanceFromYou).toBeCloseTo(18)
    expect(result.targetDistanceFromOpponent).toBeCloseTo(COURT_SURFACE_LENGTH_M - 18)
  })

  it('still returns distances when the target is out', () => {
    const result = calcShotScore({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 4 })

    expect(result.isShotIn).toBe(false)
    expect(result.targetDistanceFromYou).toBeCloseTo(5)
    expect(result.targetDistanceFromOpponent).toBeCloseTo(5)
  })
})