import {
  CENTER_SERVICE_Y_M,
  COURT_SURFACE_LENGTH_M,
  COURT_SURFACE_SINGLES_WIDTH_M,
  NET_X_M,
  SERVICE_LINE_FAR_X_M,
  SINGLES_LEFT_Y_M,
  SINGLES_RIGHT_Y_M,
} from './courtGeometry'
import type { CourtPoint } from './point'
import { isPointInCourt } from './shotScore'
import { zoneLabel } from '@/utils/courtLabels'

export type TargetZone = {
  depth: 'short' | 'mid' | 'deep'
  lateral: 'left' | 'center' | 'right'
}

const DEEP_ZONE_M = 3
export const LEFT_THIRD_Y_M = SINGLES_LEFT_Y_M + COURT_SURFACE_SINGLES_WIDTH_M / 3
export const RIGHT_THIRD_Y_M = SINGLES_LEFT_Y_M + (2 * COURT_SURFACE_SINGLES_WIDTH_M) / 3

export function metresPastNet(aim: CourtPoint): number {
  return aim.x - NET_X_M
}

/**
 * Positive = the hitter's own right (larger y).
 */
export function metresRightOfCenter(aim: CourtPoint): number {
  return aim.y - CENTER_SERVICE_Y_M
}

/**
 * Distance to the nearest singles sideline. Negative if outside.
 */
export function metresInsideSideline(aim: CourtPoint): number {
  return Math.min(aim.y - SINGLES_LEFT_Y_M, SINGLES_RIGHT_Y_M - aim.y)
}

/**
 * Depth: short before the service line, deep within 3 m of the far baseline, otherwise mid.
 * Lateral: the singles width split into thirds; points on a third boundary count as center.
 */
export function targetZone(aim: CourtPoint): TargetZone {
  const depth =
    aim.x < SERVICE_LINE_FAR_X_M
      ? 'short'
      : aim.x >= COURT_SURFACE_LENGTH_M - DEEP_ZONE_M
        ? 'deep'
        : 'mid'
  const lateral = aim.y < LEFT_THIRD_Y_M ? 'left' : aim.y > RIGHT_THIRD_Y_M ? 'right' : 'center'
  return { depth, lateral }
}

/**
 * Card title for an aim: the zone label when it's inside the singles court,
 * otherwise why it's out, e.g. "Out · long and wide right".
 * Left and right are the hitter's own.
 */
export function targetLabel(aim: CourtPoint): string {
  if (isPointInCourt(aim)) return zoneLabel(targetZone(aim))
  const reasons: string[] = []
  if (aim.x > COURT_SURFACE_LENGTH_M) reasons.push('long')
  if (aim.y < SINGLES_LEFT_Y_M) reasons.push('wide left')
  else if (aim.y > SINGLES_RIGHT_Y_M) reasons.push('wide right')
  return reasons.length > 0 ? `Out · ${reasons.join(' and ')}` : 'Out'
}
