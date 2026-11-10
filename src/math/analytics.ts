import type { ShotAccuracy } from '@/types/shotAccuracy'
import type { AimResult } from './optimizer'
import type { CourtPoint } from './point'
import type { StandardDraw } from './random'
import { COURT_SURFACE_LENGTH_M, NET_X_M } from './courtGeometry'
import { landingPoint } from './landing'
import { isPointInCourt } from './shotScore'
import { Z_95 } from './modelConstants'

/** Which chance to rank by. Simple mode uses an outright winner; Detailed uses the rally. */
export type WinMetric = 'pWin' | 'pRallyWin'

/**
 * The aim most likely to land in.
 * Ties go to the higher value of `metric`, then to the first aim in grid order.
 */
export function safestResult(results: AimResult[], metric: WinMetric = 'pWin'): AimResult {
  let safest = results[0]
  if (!safest) {
    throw new Error('safestResult: no results to compare')
  }

  for (const result of results) {
    const { pIn } = result.outcome
    const best = safest.outcome
    if (pIn > best.pIn || (pIn === best.pIn && result.outcome[metric] > best[metric])) {
      safest = result
    }
  }

  return safest
}

/**
 * The aim most likely to win, outright or as a rally, depending on `metric`.
 * Ties go to the higher P(in), then to the first aim in grid order.
 */
export function highestWinResult(results: AimResult[], metric: WinMetric = 'pWin'): AimResult {
  let highestWin = results[0]
  if (!highestWin) {
    throw new Error('highestWinResult: no results to compare')
  }

  for (const result of results) {
    const score = result.outcome[metric]
    const best = highestWin.outcome
    if (score > best[metric] || (score === best[metric] && result.outcome.pIn > best.pIn)) {
      highestWin = result
    }
  }

  return highestWin
}

/**
 * How many percentage points more often `result` wins the point than `reference`,
 * rounded to a whole number. Negative when `result` wins less often.
 * The difference is rounded, not each percentage, so it can be ±1 while both
 * percentages round to the same whole number (95.4% vs 94.6% gives +1).
 * @param result - The aim being compared, e.g. the safest shot or your target.
 * @param reference - The aim it's compared against, usually the recommended shot.
 */
export function pointsDifference(
  result: Pick<AimResult, 'outcome'>,
  reference: Pick<AimResult, 'outcome'>,
): number {
  return Math.round((result.outcome.pWin - reference.outcome.pWin) * 100)
}

export type LandingKind = 'in' | 'long' | 'wide' | 'netShort'

/**
 * The same simulated landings that `estimateShotOutcome` averages into pIn.
 * One entry per draw: the bounce point plus whether it was in, long,
 * net/short, or wide. Empty draws returns an empty array.
 */
export function simulatedLandings(
  hitter: CourtPoint,
  aim: CourtPoint,
  shot: ShotAccuracy,
  draws: StandardDraw[],
): { point: CourtPoint; kind: LandingKind }[] {
  return draws.map((draw) => {
    const point = landingPoint(hitter, aim, shot.depthErrorM * draw.z1, shot.sideErrorM * draw.z2)
    const kind: LandingKind = isPointInCourt(point)
      ? 'in'
      : point.x <= NET_X_M
        ? 'netShort'
        : point.x > COURT_SURFACE_LENGTH_M
          ? 'long'
          : 'wide'
    return { point, kind }
  })
}

export type LandingCount = { in: number; long: number; wide: number; netShort: number }

/**
 * How many simulated landings fell in, long, wide, or net/short.
 * Empty list returns zeros. Does not resimulate: pass the tags from
 * `simulatedLandings`.
 */
export function landingCounts(landings: { kind: LandingKind }[]): LandingCount {
  let inCount = 0,
    longCount = 0,
    wideCount = 0,
    netShortCount = 0

  for (const landing of landings) {
    switch (landing.kind) {
      case 'in':
        inCount++
        break
      case 'long':
        longCount++
        break
      case 'wide':
        wideCount++
        break
      case 'netShort':
        netShortCount++
        break
    }
  }

  return { in: inCount, long: longCount, wide: wideCount, netShort: netShortCount }
}

/**
 * Half-width of a 95% Monte Carlo interval: Z_95 × √(variance / n).
 * For P(in) pass pIn × (1 − pIn); for P(win) pass winContributionVariance.
 * @param variance - Population variance of the per-shot contributions.
 * @param n - Number of simulated shots.
 */
export function intervalHalfWidth(variance: number, n: number): number {
  if (n <= 0) throw new Error('intervalHalfWidth: n must be greater than 0')
  return Z_95 * Math.sqrt(variance / n)
}
