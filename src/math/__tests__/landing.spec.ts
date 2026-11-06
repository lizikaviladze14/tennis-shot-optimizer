import { describe, expect, it } from 'vitest'
import { landingPoint } from '../landing'

const hitter = { x: 0, y: 5.485 }
const aim = { x: 18, y: 5.485 }

describe('landingPoint', () => {
  it('lands on the aim with zero offsets', () => {
    const landing = landingPoint(hitter, aim, 0, 0)

    expect(landing.x).toBeCloseTo(18)
    expect(landing.y).toBeCloseTo(5.485)
  })

  it('lands 1 m long on a straight shot', () => {
    const landing = landingPoint(hitter, aim, 1, 0)

    expect(landing.x).toBeCloseTo(19)
    expect(landing.y).toBeCloseTo(5.485)
  })

  it("lands 1 m to the hitter's right on a straight shot", () => {
    const landing = landingPoint(hitter, aim, 0, 1)

    expect(landing.x).toBeCloseTo(18)
    expect(landing.y).toBeCloseTo(6.485)
  })

  it('lands 2 m long on a (3,4) shot', () => {
    const landing = landingPoint({ x: 0, y: 0 }, { x: 3, y: 4 }, 2, 0)

    expect(landing.x).toBeCloseTo(4.2)
    expect(landing.y).toBeCloseTo(5.6)
  })

  it("lands 1 m to the hitter's right on a (3,4) shot", () => {
    const landing = landingPoint({ x: 0, y: 0 }, { x: 3, y: 4 }, 0, 1)

    expect(landing.x).toBeCloseTo(2.2)
    expect(landing.y).toBeCloseTo(4.6)
  })

  it('combines depth and side offsets on a (3,4) shot', () => {
    const landing = landingPoint({ x: 0, y: 0 }, { x: 3, y: 4 }, 2, 1)

    expect(landing.x).toBeCloseTo(3.4)
    expect(landing.y).toBeCloseTo(6.2)
  })

  it('throws when hitter equals aim', () => {
    expect(() => landingPoint({ x: 5, y: 5 }, { x: 5, y: 5 }, 0, 0)).toThrow()
  })
})
