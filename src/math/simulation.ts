import type { OpponentSkill } from '@/types/opponentSkill'
import type { ShotAccuracy } from '@/types/shotAccuracy'
import { landingPoint } from './landing'
import { REACH_STEEPNESS } from './modelConstants'
import { returnProbability } from './opponent'
import type { CourtPoint } from './point'
import type { StandardDraw } from './random'
import { isPointInCourt } from './shotScore'

export type ShotScenario = {
  hitter: CourtPoint
  opponent: CourtPoint
  shot: ShotAccuracy
  opponentSkill: OpponentSkill
}

export type ShotOutcome = {
  pIn: number
  pWin: number
  pReturnGivenIn: number | null
  /** Mean of (w_i − pWin)² over all draws. w_i is 0 if out, 1 − P(return) if in. */
  winContributionVariance: number
}

/**
 * Estimates the outcome of a shot at `aim` by landing one shot per draw.
 * pIn and pWin divide by all shots: an out ball counts as a lost point.
 * pReturnGivenIn divides only by the shots that land in, and is null when none do.
 * winContributionVariance is the population variance of the per-shot win
 * contributions, used for a Monte Carlo interval on pWin.
 * @param scenario - Hitter, opponent, your shot and the opponent's skill.
 * @param aim - The aim's position.
 * @param draws - Standard normal swings shared by every aim
 */
export function estimateShotOutcome(
  scenario: ShotScenario,
  aim: CourtPoint,
  draws: StandardDraw[],
): ShotOutcome {
  if (draws.length === 0) {
    throw new Error('estimateShotOutcome: draws must not be empty')
  }

  const { hitter, opponent, shot, opponentSkill } = scenario
  let inCount = 0
  let returnSum = 0
  const winContributions: number[] = []

  draws.forEach((draw) => {
    const depthOffset = shot.depthErrorM * draw.z1
    const sideOffset = shot.sideErrorM * draw.z2

    const landing = landingPoint(hitter, aim, depthOffset, sideOffset)

    let w = 0
    if (isPointInCourt(landing)) {
      inCount++
      const pReturn = returnProbability(
        hitter,
        opponent,
        landing,
        shot.ballSpeedMps,
        opponentSkill,
        REACH_STEEPNESS,
      )
      returnSum += pReturn
      w = 1 - pReturn
    }
    winContributions.push(w)
  })

  const pWin = winContributions.reduce((sum, w) => sum + w, 0) / draws.length
  let varianceSum = 0
  for (const w of winContributions) {
    varianceSum += (w - pWin) ** 2
  }

  return {
    pIn: inCount / draws.length,
    pWin,
    pReturnGivenIn: inCount > 0 ? returnSum / inCount : null,
    winContributionVariance: varianceSum / draws.length,
  }
}
