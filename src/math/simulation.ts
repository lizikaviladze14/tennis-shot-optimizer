import { landingPoint } from './landing'
import type { CourtPoint } from './point'
import type { StandardDraw } from './random'
import { isPointInCourt } from './shotScore'

/**
 * Estimates the probability of a shot being in the court given the error margins.
 * @param hitter - The hitter's position.
 * @param aim - The aim's position.
 * @param depthErrorM - The depth error margin in meters.
 * @param sideErrorM - The side error margin in meters.
 * @param draws - Standard normal swings shared by every aim
 * @returns The probability of a shot being in the court.
 */
export function estimateInProbability(
  hitter: CourtPoint,
  aim: CourtPoint,
  depthErrorM: number,
  sideErrorM: number,
  draws: StandardDraw[],
): number {
  if (draws.length === 0) {
    throw new Error('estimateInProbability: draws must not be empty')
  }

  let inCourtCount = 0

  draws.forEach((draw) => {
    const depthOffset = depthErrorM * draw.z1
    const sideOffset = sideErrorM * draw.z2

    const landing = landingPoint(hitter, aim, depthOffset, sideOffset)

    if (isPointInCourt(landing)) {
      inCourtCount++
    }
  })

  return inCourtCount / draws.length
}
