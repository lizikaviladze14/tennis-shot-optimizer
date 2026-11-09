import {
  COURT_SURFACE_LENGTH_M,
  NET_X_M,
  SINGLES_LEFT_Y_M,
  SINGLES_RIGHT_Y_M,
} from './courtGeometry'
import type { CourtPoint } from './point'
import type { StandardDraw } from './random'
import { estimateShotOutcome, type ShotOutcome, type ShotScenario } from './simulation'

/**
 * Score used to compare aims: P(win) − riskWeight × P(miss).
 * Equivalent to the expected points per shot when a win scores +1,
 * a returned ball scores 0, and a miss scores −riskWeight.
 *
 * Not a probability: it can be negative when riskWeight > 0.
 * riskWeight (λ) = 0 ranks by P(win) alone; larger values penalize misses more.
 *
 * Only meaningful for comparison. The grid search maximizes it to pick the
 * recommended aim. riskWeight doesn't change any aim's probabilities, only
 * how aims are ranked, so a single target's score says little on its own.
 */
export function shotValue(outcome: ShotOutcome, riskWeight: number): number {
  if (riskWeight < 0) {
    throw new Error('shotValue: riskWeight must be 0 or greater')
  }
  const { pIn, pWin } = outcome
  const pMiss = 1 - pIn
  const value = pWin - riskWeight * pMiss
  return value
}

/**
 * Aim points at the centers of a cellCount × cellCount grid over the
 * opponent's singles court (net to far baseline, sideline to sideline).
 * Centers are used so that no aim sits on a line (where P(in) is a coin
 * flip), and so that each aim represents one heatmap cell.
 * Order: x index outer, y index inner.
 */
export function gridAims(cellCount: number): CourtPoint[] {
  if (!(Number.isInteger(cellCount) && cellCount >= 1)) {
    throw new Error('gridAims: cellCount must be a positive integer')
  }
  const alongX = COURT_SURFACE_LENGTH_M - NET_X_M
  const alongY = SINGLES_RIGHT_Y_M - SINGLES_LEFT_Y_M

  const cellSizeX = alongX / cellCount
  const cellSizeY = alongY / cellCount

  const points: CourtPoint[] = []

  for (let i = 0; i < cellCount; i++) {
    for (let j = 0; j < cellCount; j++) {
      const x = NET_X_M + (i + 0.5) * cellSizeX
      const y = SINGLES_LEFT_Y_M + (j + 0.5) * cellSizeY
      points.push({ x, y })
    }
  }

  return points
}

export type AimResult = { aim: CourtPoint; outcome: ShotOutcome; value: number }

/**
 * Scores every grid aim with the same draws and returns the best aim plus
 * all results, in gridAims order (used by the heatmap).
 * Ties keep the first aim in grid order.
 */
export function findBestAim(
  scenario: ShotScenario,
  draws: StandardDraw[],
  riskWeight: number,
  cellCount: number,
): { best: AimResult; results: AimResult[] } {
  const aims = gridAims(cellCount)

  const results: AimResult[] = []

  for (const aim of aims) {
    const outcome = estimateShotOutcome(scenario, aim, draws)
    const value = shotValue(outcome, riskWeight)
    results.push({ aim, outcome, value })
  }

  let best = results[0]
  if (!best) {
    throw new Error('findBestAim: no aims to compare')
  }

  for (const result of results) {
    if (result.value > best.value) {
      best = result
    }
  }

  return { best, results }
}
