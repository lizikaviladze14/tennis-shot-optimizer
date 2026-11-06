import { describe, expect, it } from 'vitest'
import { describePlayerPosition } from '../playerPosition'
import { CENTER_SERVICE_Y_M, COURT_SURFACE_LENGTH_M } from '../courtGeometry'

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
