import { COURT_SURFACE_LENGTH_M, NET_X_M, SINGLES_LEFT_Y_M, SINGLES_RIGHT_Y_M } from './courtGeometry'
import type { AimResult } from './optimizer'

export type HeatmapCell = {
  x: number
  y: number
  width: number
  height: number
  t: number
}

/**
 * One rectangle per result, centered on that result's aim.
 * Court metres, x/y is the top-left corner. t ranks value from 0 to 1;
 * when every value is equal, t is 0.5.
 */
export function heatmapCells(results: AimResult[], cellCount: number): HeatmapCell[] {
  if (!(Number.isInteger(cellCount) && cellCount >= 1)) {
    throw new Error('heatmapCells: cellCount must be a positive integer')
  }
  if (results.length === 0) return []

  const width = (COURT_SURFACE_LENGTH_M - NET_X_M) / cellCount
  const height = (SINGLES_RIGHT_Y_M - SINGLES_LEFT_Y_M) / cellCount

  let min = Infinity
  let max = -Infinity
  for (const result of results) {
    if (result.value < min) min = result.value
    if (result.value > max) max = result.value
  }
  const span = max - min

  return results.map((result) => ({
    x: result.aim.x - width / 2,
    y: result.aim.y - height / 2,
    width,
    height,
    t: span === 0 ? 0.5 : (result.value - min) / span,
  }))
}
