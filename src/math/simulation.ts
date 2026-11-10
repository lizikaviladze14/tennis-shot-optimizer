import type { OpponentSkill } from '@/types/opponentSkill'
import type { ShotAccuracy } from '@/types/shotAccuracy'
import { COURT_SURFACE_LENGTH_M, NET_X_M } from './courtGeometry'
import { metresPastNet } from './describeTarget'
import { interpolateByDepth } from './interpolate'
import { landingPoint } from './landing'
import { REACH_STEEPNESS } from './modelConstants'
import { bestInterception, returnProbability, type BounceSettings, type Interception } from './opponent'
import { depthSpeedFactor } from './shotProfle'
import type { CourtPoint } from './point'
import type { StandardDraw } from './random'
import { isPointInCourt } from './shotScore'

export type ShotScenario = {
  hitter: CourtPoint
  opponent: CourtPoint
  shot: ShotAccuracy
  opponentSkill: OpponentSkill
  bounce: BounceSettings
  depthSpeed: { minPastNetM: number; maxPastNetM: number; minFactor: number }
  /** Chance the hitter still wins the rally after a return, by where the ball
      landed: atNet for a landing at the net, atBaseline at the baseline,
      linear in between. { atNet: 0, atBaseline: 0 } turns this off. */
  returnValue: { atNet: number; atBaseline: number }
}

export type ShotOutcome = {
  pIn: number
  pWin: number
  pReturnGivenIn: number | null
  /** Mean of (w_i − pWin)² over all draws. w_i is 0 if out, 1 − P(return) if in. */
  winContributionVariance: number
  /** Mean of rallyContribution over all draws. An out ball contributes 0. */
  pRallyWin: number
  /** Standard error of pRallyWin: √(population variance / n), the same quantity the P(win) interval takes from winContributionVariance. */
  pRallyWinSE: number
}

/** The opponent's best interception for a shot that lands exactly on the aim. */
export function aimInterception(scenario: ShotScenario, aim: CourtPoint): Interception {
  const factor = depthSpeedFactor(metresPastNet(aim), scenario.depthSpeed)
  const aimBallSpeed = scenario.shot.ballSpeedMps * factor
  const aimBounce = {
    ...scenario.bounce,
    afterBounceSpeedMps: scenario.bounce.afterBounceSpeedMps * factor,
  }
  return bestInterception(
    scenario.hitter,
    scenario.opponent,
    aim,
    aimBallSpeed,
    scenario.opponentSkill.runSpeedMps,
    aimBounce,
  )
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
  const factor = depthSpeedFactor(metresPastNet(aim), scenario.depthSpeed)
  const aimBallSpeed = shot.ballSpeedMps * factor
  const aimBounce = {
    ...scenario.bounce,
    afterBounceSpeedMps: scenario.bounce.afterBounceSpeedMps * factor,
  }
  let inCount = 0
  let returnSum = 0
  const winContributions: number[] = []
  const rallyContributions: number[] = []
  const baselinePastNetM = COURT_SURFACE_LENGTH_M - NET_X_M

  draws.forEach((draw) => {
    const depthOffset = shot.depthErrorM * draw.z1
    const sideOffset = shot.sideErrorM * draw.z2

    const landing = landingPoint(hitter, aim, depthOffset, sideOffset)

    let w = 0
    let rallyContribution = 0
    if (isPointInCourt(landing)) {
      inCount++
      const pReturn = returnProbability(
        hitter,
        opponent,
        landing,
        aimBallSpeed,
        opponentSkill,
        REACH_STEEPNESS,
        aimBounce,
      )
      returnSum += pReturn
      w = 1 - pReturn
      const q = interpolateByDepth(
        metresPastNet(landing),
        0,
        baselinePastNetM,
        scenario.returnValue.atNet,
        scenario.returnValue.atBaseline,
      )
      rallyContribution = 1 - (1 - q) * pReturn
    }
    winContributions.push(w)
    rallyContributions.push(rallyContribution)
  })

  const pWin = winContributions.reduce((sum, w) => sum + w, 0) / draws.length
  const pRallyWin = rallyContributions.reduce((sum, rally) => sum + rally, 0) / draws.length
  let varianceSum = 0
  let rallyVarianceSum = 0
  for (const w of winContributions) {
    varianceSum += (w - pWin) ** 2
  }
  for (const rally of rallyContributions) {
    rallyVarianceSum += (rally - pRallyWin) ** 2
  }

  return {
    pIn: inCount / draws.length,
    pWin,
    pReturnGivenIn: inCount > 0 ? returnSum / inCount : null,
    winContributionVariance: varianceSum / draws.length,
    pRallyWin,
    pRallyWinSE: Math.sqrt(rallyVarianceSum / draws.length / draws.length),
  }
}
