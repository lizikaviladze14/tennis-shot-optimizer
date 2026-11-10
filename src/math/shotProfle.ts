import type { ShotAccuracy } from '@/types/shotAccuracy'
import type { ShotTypeProfile } from '@/types/shotTypes'
import { interpolateByDepth } from './interpolate'

/**
 * Returns the values a shot type actually uses:
 * the level’s values multiplied by the profile’s factors.
 * Doesn’t change shot.
 */

export function applyShotProfile(shot: ShotAccuracy, profile: ShotTypeProfile): ShotAccuracy {
  const newAccuracy: ShotAccuracy = {
    level: shot.level,
    sideErrorM: shot.sideErrorM * profile.sideFactor,
    depthErrorM: shot.depthErrorM * profile.depthFactor,
    ballSpeedMps: shot.ballSpeedMps * profile.speedFactor,
  }
  return newAccuracy
}

/**
 * Speed multiplier for an aim at the given depth past the net: minFactor at
 * minPastNetM, 1 at maxPastNetM, linear in between, clamped outside the range.
 */
export function depthSpeedFactor(
  pastNetM: number,
  depthSpeed: { minPastNetM: number; maxPastNetM: number; minFactor: number },
): number {
  const { minPastNetM, maxPastNetM, minFactor } = depthSpeed
  return interpolateByDepth(pastNetM, minPastNetM, maxPastNetM, minFactor, 1)
}
