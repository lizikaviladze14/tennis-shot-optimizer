import { describe, expect, it } from 'vitest'
import { distance } from '../point'

describe('distance', () => {
  it('measures the hypotenuse of a 3-4-5 triangle', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5)
  })
})
