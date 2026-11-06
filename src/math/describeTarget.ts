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

export type TargetZone = {
  depth: 'short' | 'mid' | 'deep'
  lateral: 'left channel' | 'center' | 'right channel'
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
  const lateral =
    aim.y < LEFT_THIRD_Y_M ? 'left channel' : aim.y > RIGHT_THIRD_Y_M ? 'right channel' : 'center'
  return { depth, lateral }
}

export function zoneLabel(zone: TargetZone): string {
  return `${zone.depth.charAt(0).toUpperCase()}${zone.depth.slice(1)} · ${zone.lateral}`
}
