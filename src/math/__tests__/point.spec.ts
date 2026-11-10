import { describe, expect, it } from 'vitest'
import { distance, unitVector } from '../point'

describe('distance', () => {
  it('measures the hypotenuse of a 3-4-5 triangle', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5)
  })
})

describe('unitVector', () => {
  it('points from (0, 0) to (3, 4) as (0.6, 0.8)', () => {
    const unit = unitVector({ x: 0, y: 0 }, { x: 3, y: 4 })
    expect(unit.x).toBeCloseTo(0.6)
    expect(unit.y).toBeCloseTo(0.8)
  })

  it('has length 1 for a diagonal', () => {
    const unit = unitVector({ x: 1, y: 2 }, { x: 4, y: 6 })
    expect(Math.hypot(unit.x, unit.y)).toBeCloseTo(1)
  })

  it('throws when from and to are the same point', () => {
    expect(() => unitVector({ x: 1, y: 1 }, { x: 1, y: 1 })).toThrow(
      'from and to are the same point',
    )
  })
})
