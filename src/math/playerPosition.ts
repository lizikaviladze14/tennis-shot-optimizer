import { CENTER_SERVICE_Y_M, COURT_SURFACE_LENGTH_M } from './courtGeometry'
import type { CourtPoint } from './point'

export const DEFAULT_YOU: CourtPoint = {
  x: -0.4,
  y: CENTER_SERVICE_Y_M + 1.6,
}

export const DEFAULT_OPPONENT: CourtPoint = {
  x: COURT_SURFACE_LENGTH_M + 0.8,
  y: CENTER_SERVICE_Y_M - 1.8,
}
