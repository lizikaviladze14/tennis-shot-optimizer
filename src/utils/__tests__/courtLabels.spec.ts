import { describe, expect, it } from 'vitest'
import { describePlayerPosition, zoneLabel } from '../courtLabels'
import { targetZone } from '@/math/describeTarget'
import { CENTER_SERVICE_Y_M, COURT_SURFACE_LENGTH_M, NET_X_M } from '@/math/courtGeometry'

describe('zoneLabel', () => {
  it('capitalizes the first word and maps lateral ids', () => {
    expect(zoneLabel({ depth: 'short', lateral: 'right' })).toBe('Short · right channel')
    expect(zoneLabel({ depth: 'mid', lateral: 'left' })).toBe('Mid · left channel')
    expect(zoneLabel({ depth: 'deep', lateral: 'center' })).toBe('Deep · center')
  })

  it('labels the design example', () => {
    expect(zoneLabel(targetZone({ x: NET_X_M + 3.4, y: CENTER_SERVICE_Y_M + 1.8 }))).toBe(
      'Short · right channel',
    )
  })
})

describe('describePlayerPosition', () => {
  it("uses the opponent's own right, which is toward -y", () => {
    expect(
      describePlayerPosition('opponent', { x: COURT_SURFACE_LENGTH_M, y: CENTER_SERVICE_Y_M - 1 }),
    ).toBe('on the baseline · 1.0 m right')
  })

  it("uses the opponent's own left, which is toward +y", () => {
    expect(
      describePlayerPosition('opponent', { x: COURT_SURFACE_LENGTH_M, y: CENTER_SERVICE_Y_M + 1 }),
    ).toBe('on the baseline · 1.0 m left')
  })

  it('uses your own right, which is toward +y', () => {
    expect(describePlayerPosition('you', { x: 0, y: CENTER_SERVICE_Y_M + 1 })).toBe(
      'on the baseline · 1.0 m right',
    )
  })
})
