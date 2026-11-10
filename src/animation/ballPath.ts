// Animation geometry: where to draw the ball over time. Not part of the
// model; peak heights are visual only.

import type { BounceSettings } from '../math/opponent'
import { distance, unitVector, type CourtPoint } from '../math/point'

export type BallPath = {
  hitter: CourtPoint
  aim: CourtPoint
  direction: CourtPoint
  flightTimeS: number
  playableWindowS: number
  afterBounceDistanceM: number
}

/**
 * Everything about a shot's path that doesn't depend on time.
 * Pass it to ballStateAt.
 */
export function createBallPath(
  hitter: CourtPoint,
  aim: CourtPoint,
  ballSpeedMps: number,
  bounce: BounceSettings,
): BallPath {
  if (ballSpeedMps <= 0) throw new Error('createBallPath: ballSpeedMps must be greater than 0')
  const direction = unitVector(hitter, aim)
  const flightTimeS = distance(hitter, aim) / ballSpeedMps
  const playableWindowS = bounce.playableWindowS
  const afterBounceDistanceM = bounce.afterBounceSpeedMps * playableWindowS

  return {
    hitter,
    aim,
    direction,
    flightTimeS,
    playableWindowS,
    afterBounceDistanceM,
  }
}

/** Visual peak heights for the animation only; the model doesn't use them. */
export const FLIGHT_PEAK_M = 1.5
export const BOUNCE_PEAK_M = 0.8

export type BallPhase = 'flight' | 'bounce' | 'done'

export type BallState = {
  /** Where the ball's shadow is on the court. */
  position: CourtPoint
  /** How high the ball is above its shadow (metres, visual only). */
  heightM: number
  phase: BallPhase
}

/** Up-and-down arc: 0 at fraction 0 and 1, `peak` at fraction 0.5. */
function arcHeight(fraction: number, peak: number): number {
  return 4 * peak * fraction * (1 - fraction)
}

/**
 * Where the ball is at `timeS` seconds after the hit.
 * Flight: from the hitter to the aim, rising and falling.
 * Bounce: from the aim onward along the shot's direction, with a smaller arc.
 * Done: the playable window is over; the ball stays at the end point.
 */
export function ballStateAt(path: BallPath, timeS: number): BallState {
  const t = Math.max(0, timeS)
  const { hitter, aim, direction, flightTimeS, playableWindowS, afterBounceDistanceM } = path

  // 1. flight: hitter → aim
  if (t <= flightTimeS) {
    const f = t / flightTimeS
    return {
      position: {
        x: hitter.x + f * (aim.x - hitter.x),
        y: hitter.y + f * (aim.y - hitter.y),
      },
      heightM: arcHeight(f, FLIGHT_PEAK_M),
      phase: 'flight',
    }
  }

  // 2. after the bounce: aim → onward (skipped when the window is 0)
  if (t <= flightTimeS + playableWindowS) {
    const g = (t - flightTimeS) / playableWindowS
    return {
      position: {
        x: aim.x + g * afterBounceDistanceM * direction.x,
        y: aim.y + g * afterBounceDistanceM * direction.y,
      },
      heightM: arcHeight(g, BOUNCE_PEAK_M),
      phase: 'bounce',
    }
  }

  // 3. done: stay at the end of the path
  return {
    position: {
      x: aim.x + afterBounceDistanceM * direction.x,
      y: aim.y + afterBounceDistanceM * direction.y,
    },
    heightM: 0,
    phase: 'done',
  }
}
