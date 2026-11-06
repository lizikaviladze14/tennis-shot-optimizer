import { describe, expect, it } from 'vitest'
import { createDraws, mulberry32, standardNormalPair } from '../random'

function firstValues(rand: () => number, count: number) {
  return Array.from({ length: count }, () => rand())
}

describe('standardNormalPair', () => {
  it('returns a pair of standard normal numbers', () => {
    const pair = standardNormalPair(0.25, 0.5)
    expect(pair.z1).toBeCloseTo(0)
    expect(pair.z2).toBeCloseTo(1.1774, 4)
  })

  it('returns zeros when u2 is 1, because ln 1 = 0', () => {
    const pair = standardNormalPair(0, 1)
    expect(pair.z1).toBeCloseTo(0)
    expect(pair.z2).toBeCloseTo(0)
  })

  it('throws when u2 is 0', () => {
    expect(() => standardNormalPair(0, 0)).toThrow()
  })
})

describe('createDraws', () => {
  it('creates the requested number of draws', () => {
    expect(createDraws(100)).toHaveLength(100)
  })

  it('returns an empty array for 0', () => {
    expect(createDraws(0)).toEqual([])
  })

  it('creates identical draws from the same seed', () => {
    expect(createDraws(100, mulberry32(42))).toEqual(createDraws(100, mulberry32(42)))
  })
})

describe('mulberry32', () => {
  it('gives the same first 10 values for the same seed', () => {
    expect(firstValues(mulberry32(42), 10)).toEqual(firstValues(mulberry32(42), 10))
  })

  it('gives different first 10 values for different seeds', () => {
    expect(firstValues(mulberry32(1), 10)).not.toEqual(firstValues(mulberry32(2), 10))
  })

  it('returns values in [0, 1)', () => {
    const values = firstValues(mulberry32(42), 10000)

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
  })
})