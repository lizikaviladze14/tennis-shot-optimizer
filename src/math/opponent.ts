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
  if (ballSpeedMps <= 0) throw new Error('returnProbability: ballSpeedMps must be greater than 0')

  const ballFlightDistance = distance(hitter, landing)
  const ballFlightTime = ballFlightDistance / ballSpeedMps
  const opponentReach = opponentSkill.runSpeedMps * ballFlightTime
  const gap = distance(opponent, landing)
  const margin = gap - opponentReach
  const pReach = reachProbability(margin, steepness)
  const pReturn = opponentSkill.consistency * pReach
  return pReturn
}
