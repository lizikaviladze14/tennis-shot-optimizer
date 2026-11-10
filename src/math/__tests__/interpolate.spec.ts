import { describe, expect, it } from 'vitest'
import { interpolateByDepth } from '../interpolate'

const minPastNetM = 0
const maxPastNetM = 11.885

function at(pastNetM: number) {
  return interpolateByDepth(pastNetM, minPastNetM, maxPastNetM, 0.2, 0.5)
}

describe('interpolateByDepth', () => {
  it('is the end values at the ends of the range', () => {
    expect(at(0)).toBeCloseTo(0.2, 3)
    expect(at(11.885)).toBeCloseTo(0.5, 3)
  })

  it('is linear between the ends', () => {
    expect(at(6)).toBeCloseTo(0.351, 3)
    expect(at(3)).toBeCloseTo(0.276, 3)
  })

  it('clamps outside the range', () => {
    expect(at(-1)).toBeCloseTo(0.2, 3)
    expect(at(15)).toBeCloseTo(0.5, 3)
  })

  it('returns valueAtMax when the range has no width', () => {
    expect(interpolateByDepth(4, 5, 5, 0.2, 0.5)).toBe(0.5)
  })
})
