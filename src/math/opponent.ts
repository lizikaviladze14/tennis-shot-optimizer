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

/**
 * Chance the opponent returns a ball that landed in: consistency × chance of reaching it.
 * Reach = running speed × ball flight time, flight time = hitter-to-landing distance ÷ ball speed.
 */
export function returnProbability(
  hitter: CourtPoint,
  opponent: CourtPoint,
  landing: CourtPoint,
  ballSpeedMps: number,
  opponentSkill: OpponentSkill,
  steepness: number,
): number {
  const opponentReach = opponentCoverage(hitter, landing, ballSpeedMps, opponentSkill.runSpeedMps)
  const gap = distance(opponent, landing)
  const margin = gap - opponentReach
  const pReach = reachProbability(margin, steepness)
  const pReturn = opponentSkill.consistency * pReach
  return pReturn
}
