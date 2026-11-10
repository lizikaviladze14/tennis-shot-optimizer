import type { OpponentSkill } from '@/types/opponentSkill'
import { distance, type CourtPoint } from './point'

/**
 * Smooth 0–1 chance that the opponent reaches the ball.
 * margin = gap − reach (metres): negative means time to spare, positive means too slow.
 * steepness (1/m): how quickly the chance drops around the edge of reach.
 */
export function reachProbability(margin: number, steepness: number): number {
  const pReach = 1 / (1 + Math.exp(steepness * margin))
  return pReach
}

/**
 * How far the opponent can run while the ball travels from hitter to landing.
 * coverage = runSpeedMps × (distance(hitter, landing) ÷ ballSpeedMps)
 */
export function opponentCoverage(
  hitter: CourtPoint,
  landing: CourtPoint,
  ballSpeedMps: number,
  runSpeedMps: number,
): number {
  if (ballSpeedMps <= 0) throw new Error('opponentCoverage: ballSpeedMps must be greater than 0')

  const ballFlightTime = distance(hitter, landing) / ballSpeedMps
  return runSpeedMps * ballFlightTime
}

/** What happens to the ball after it bounces. */
export type BounceSettings = {
  /** Ball speed after the bounce (m/s): ball speed × the shot type's afterBounceSpeedFactor. */
  afterBounceSpeedMps: number
  /** How long the ball stays playable after the bounce (s). 0 turns the bounce model off. */
  playableWindowS: number
}

/** Points along the ball's path after the bounce, as fractions of the playable window. */
const BOUNCE_SAMPLE_FRACTIONS = [0, 0.25, 0.5, 0.75, 1]

export type Interception = {
  point: CourtPoint
  /** Distance from the landing to the point where the opponent plays the ball. */
  afterBounceM: number
  /** Distance the opponent must run to that point. */
  distanceNeededM: number
  /** How far they can run in the time available at that point. */
  coverageM: number
  /** distanceNeededM − coverageM. Negative means time to spare. */
  marginM: number
}

/**
 * Where the opponent can most easily play the ball: the point along its path
 * after the bounce with the smallest margin (distance needed − coverage).
 */
export function bestInterception(
  hitter: CourtPoint,
  opponent: CourtPoint,
  landing: CourtPoint,
  ballSpeedMps: number,
  runSpeedMps: number,
  bounce: BounceSettings,
): Interception {
  if (ballSpeedMps <= 0) throw new Error('bestInterception: ballSpeedMps must be greater than 0')
  if (bounce.playableWindowS < 0)
    throw new Error('bestInterception: playableWindowS must be 0 or greater')

  const flightDistanceM = distance(hitter, landing)
  if (flightDistanceM === 0)
    throw new Error('bestInterception: hitter and landing are the same point')
  const direction = {
    x: (landing.x - hitter.x) / flightDistanceM,
    y: (landing.y - hitter.y) / flightDistanceM,
  }

  const flightTimeS = flightDistanceM / ballSpeedMps
  const bounceTravelM = bounce.afterBounceSpeedMps * bounce.playableWindowS

  let best: Interception | null = null
  for (const s of BOUNCE_SAMPLE_FRACTIONS) {
    const afterBounceM = s * bounceTravelM
    const point = {
      x: landing.x + afterBounceM * direction.x,
      y: landing.y + afterBounceM * direction.y,
    }
    const coverageM = runSpeedMps * (flightTimeS + s * bounce.playableWindowS)
    const distanceNeededM = distance(opponent, point)
    const marginM = distanceNeededM - coverageM
    if (!best || marginM < best.marginM) {
      best = { point, afterBounceM, distanceNeededM, coverageM, marginM }
    }
  }

  if (!best) throw new Error('bestInterception: no sample points')
  return best
}

/**
 * Chance the opponent returns a ball that landed in.
 * The opponent can play the ball anywhere along its path after the bounce,
 * so it checks several points and uses the one easiest for the opponent to reach.
 * Returns consistency × chance of reaching that point.
 */
export function returnProbability(
  hitter: CourtPoint,
  opponent: CourtPoint,
  landing: CourtPoint,
  ballSpeedMps: number,
  opponentSkill: OpponentSkill,
  steepness: number,
  bounce: BounceSettings,
): number {
  if (ballSpeedMps <= 0) throw new Error('returnProbability: ballSpeedMps must be greater than 0')
  if (bounce.playableWindowS < 0)
    throw new Error('returnProbability: playableWindowS must be 0 or greater')

  const { marginM } = bestInterception(
    hitter,
    opponent,
    landing,
    ballSpeedMps,
    opponentSkill.runSpeedMps,
    bounce,
  )
  return opponentSkill.consistency * reachProbability(marginM, steepness)
}
