import { describe, expect, it } from 'vitest'
import {
  LEFT_THIRD_Y_M,
  RIGHT_THIRD_Y_M,
  metresInsideSideline,
  metresPastNet,
  metresRightOfCenter,
  targetLabel,
  targetZone,
  zoneLabel,
} from '../describeTarget'
import {
  CENTER_SERVICE_Y_M,
  COURT_SURFACE_LENGTH_M,
  COURT_SURFACE_WIDTH_M,
  NET_X_M,
  SERVICE_LINE_FAR_X_M,
  SINGLES_ALLEY_M,
} from '../courtGeometry'

const c = CENTER_SERVICE_Y_M

describe('metresPastNet and metresRightOfCenter', () => {
  it('measures from the net and the center line', () => {
    expect(metresPastNet({ x: NET_X_M + 3.4, y: c })).toBeCloseTo(3.4)
    expect(metresRightOfCenter({ x: 18, y: c + 1.8 })).toBeCloseTo(1.8)
    expect(metresRightOfCenter({ x: 18, y: c - 1.8 })).toBeCloseTo(-1.8)
  })
})

describe('metresInsideSideline', () => {
  it('is positive inside the singles court', () => {
    expect(metresInsideSideline({ x: 18, y: SINGLES_ALLEY_M + 2.3 })).toBeCloseTo(2.3)
    expect(metresInsideSideline({ x: 18, y: COURT_SURFACE_WIDTH_M - SINGLES_ALLEY_M - 1 })).toBeCloseTo(1)
  })

  it('is 0 on the line', () => {
    expect(metresInsideSideline({ x: 18, y: SINGLES_ALLEY_M })).toBe(0)
  })

  it('is negative outside the line', () => {
    expect(metresInsideSideline({ x: 18, y: SINGLES_ALLEY_M - 0.5 })).toBeCloseTo(-0.5)
  })
})

describe('targetZone: depth', () => {
  it('is short before the service line', () => {
    expect(targetZone({ x: NET_X_M + 3, y: c }).depth).toBe('short')
  })

  it('is mid between the service line and the deep zone', () => {
    expect(targetZone({ x: 19, y: c }).depth).toBe('mid')
  })

  it('is deep within 3 m of the far baseline', () => {
    expect(targetZone({ x: COURT_SURFACE_LENGTH_M - 1, y: c }).depth).toBe('deep')
  })

  it('counts the service line as mid', () => {
    expect(targetZone({ x: SERVICE_LINE_FAR_X_M, y: c }).depth).toBe('mid')
    expect(targetZone({ x: SERVICE_LINE_FAR_X_M - 0.01, y: c }).depth).toBe('short')
  })

  it('counts exactly 3 m from the baseline as deep', () => {
    expect(targetZone({ x: COURT_SURFACE_LENGTH_M - 3, y: c }).depth).toBe('deep')
    expect(targetZone({ x: COURT_SURFACE_LENGTH_M - 3.01, y: c }).depth).toBe('mid')
  })
})

describe('targetZone: lateral', () => {
  it('is left channel in the low-y third', () => {
    expect(targetZone({ x: 18, y: SINGLES_ALLEY_M + 1 }).lateral).toBe('left channel')
  })

  it('is center in the middle third', () => {
    expect(targetZone({ x: 18, y: c }).lateral).toBe('center')
  })

  it('is right channel in the high-y third', () => {
    expect(targetZone({ x: 18, y: COURT_SURFACE_WIDTH_M - SINGLES_ALLEY_M - 1 }).lateral).toBe('right channel')
  })

  it('counts the third boundaries as center', () => {
    expect(targetZone({ x: 18, y: LEFT_THIRD_Y_M }).lateral).toBe('center')
    expect(targetZone({ x: 18, y: LEFT_THIRD_Y_M - 0.01 }).lateral).toBe('left channel')
    expect(targetZone({ x: 18, y: RIGHT_THIRD_Y_M }).lateral).toBe('center')
    expect(targetZone({ x: 18, y: RIGHT_THIRD_Y_M + 0.01 }).lateral).toBe('right channel')
  })
})

describe('zoneLabel', () => {
  it('capitalizes the first word', () => {
    expect(zoneLabel({ depth: 'short', lateral: 'right channel' })).toBe('Short · right channel')
  })

  it('labels the design example', () => {
    expect(zoneLabel(targetZone({ x: NET_X_M + 3.4, y: c + 1.8 }))).toBe('Short · right channel')
  })
})

describe('targetLabel', () => {
  const rightSideline = COURT_SURFACE_WIDTH_M - SINGLES_ALLEY_M

  it('uses the zone label inside the singles court', () => {
    expect(targetLabel({ x: NET_X_M + 3.4, y: c + 1.8 })).toBe('Short · right channel')
  })

  it('counts the lines as in', () => {
    expect(targetLabel({ x: COURT_SURFACE_LENGTH_M, y: rightSideline })).toBe('Deep · right channel')
  })

  it('labels a ball past the baseline as long', () => {
    expect(targetLabel({ x: COURT_SURFACE_LENGTH_M + 0.5, y: c })).toBe('Out · long')
  })

  it('labels a ball past a singles sideline as wide, using the hitter left and right', () => {
    expect(targetLabel({ x: 18, y: SINGLES_ALLEY_M - 0.5 })).toBe('Out · wide left')
    expect(targetLabel({ x: 18, y: rightSideline + 0.5 })).toBe('Out · wide right')
  })

  it('counts the doubles alley as out', () => {
    expect(targetLabel({ x: 18, y: rightSideline + SINGLES_ALLEY_M / 2 })).toBe('Out · wide right')
  })

  it('combines long and wide', () => {
    expect(targetLabel({ x: COURT_SURFACE_LENGTH_M + 1, y: rightSideline + 1 })).toBe('Out · long and wide right')
  })
})
