import { describe, expect, it } from 'vitest'
import { applyShotProfile, depthSpeedFactor } from '../shotProfle'
import { SHOT_TYPE_PROFILES } from '@/types/shotTypes'
import type { ShotAccuracy } from '@/types/shotAccuracy'

const base: ShotAccuracy = {
  level: 'advanced',
  sideErrorM: 0.9,
  depthErrorM: 1.4,
  ballSpeedMps: 23,
}

describe('applyShotProfile', () => {
  it('leaves a drive at the base values', () => {
    const result = applyShotProfile(base, SHOT_TYPE_PROFILES.drive)
    expect(result.level).toBe('advanced')
    expect(result.sideErrorM).toBeCloseTo(0.9)
    expect(result.depthErrorM).toBeCloseTo(1.4)
    expect(result.ballSpeedMps).toBeCloseTo(23)
  })

  it('scales a drop shot', () => {
    const result = applyShotProfile(base, SHOT_TYPE_PROFILES.drop)
    expect(result.sideErrorM).toBeCloseTo(0.72)
    expect(result.depthErrorM).toBeCloseTo(0.84)
    expect(result.ballSpeedMps).toBeCloseTo(9.2)
  })

  it('scales a slice', () => {
    const result = applyShotProfile(base, SHOT_TYPE_PROFILES.slice)
    expect(result.sideErrorM).toBeCloseTo(0.81)
    expect(result.depthErrorM).toBeCloseTo(1.54)
    expect(result.ballSpeedMps).toBeCloseTo(17.25)
  })

  it('does not change the input', () => {
    applyShotProfile(base, SHOT_TYPE_PROFILES.drop)
    expect(base.sideErrorM).toBe(0.9)
    expect(base.depthErrorM).toBe(1.4)
    expect(base.ballSpeedMps).toBe(23)
  })
})

describe('depthSpeedFactor', () => {
  const driveDepth = { minPastNetM: 4.5, maxPastNetM: 11.885, minFactor: 0.6 }

  it('is the minimum at the short end of the drive range', () => {
    expect(depthSpeedFactor(4.5, driveDepth)).toBeCloseTo(0.6)
  })

  it('is full speed at the deep end', () => {
    expect(depthSpeedFactor(11.885, driveDepth)).toBeCloseTo(1)
  })

  it('grows linearly between the ends', () => {
    expect(depthSpeedFactor(6, driveDepth)).toBeCloseTo(0.6812, 3)
  })

  it('clamps outside the range', () => {
    expect(depthSpeedFactor(2, driveDepth)).toBe(0.6)
    expect(depthSpeedFactor(15, driveDepth)).toBe(1)
  })

  it('stays at full speed when minFactor is 1', () => {
    const flat = { ...driveDepth, minFactor: 1 }
    expect(depthSpeedFactor(2, flat)).toBe(1)
    expect(depthSpeedFactor(6, flat)).toBe(1)
    expect(depthSpeedFactor(15, flat)).toBe(1)
  })
})
