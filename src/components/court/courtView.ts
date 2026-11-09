import { RUNOFF_M, WHOLE_COURT_LENGTH_M } from '@/math/courtGeometry'
import type { CourtPoint } from '@/math/point'

/** Map a court point into the SVG viewBox, after the portrait rotation if needed. */
export function courtToViewBox(point: CourtPoint, vertical: boolean) {
    const sx = RUNOFF_M + point.x
    const sy = RUNOFF_M + point.y
    if (vertical) return { x: sy, y: WHOLE_COURT_LENGTH_M - sx }
    return { x: sx, y: sy }
}

/** Inverse of courtToViewBox. */
export function viewBoxToCourt(viewX: number, viewY: number, vertical: boolean): CourtPoint {
    if (vertical) {
        return { x: WHOLE_COURT_LENGTH_M - viewY - RUNOFF_M, y: viewX - RUNOFF_M }
    }
    return { x: viewX - RUNOFF_M, y: viewY - RUNOFF_M }
}
