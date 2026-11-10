import { distance, unitVector, type CourtPoint } from './point'

/**
 * Where a shot lands when it misses the aim by the given offsets.
 * depthOffset > 0: lands long (past the aim).
 * sideOffset > 0: lands to the hitter's own right.
 * Throws if hitter and aim are the same point (shot direction undefined).
 */
export function landingPoint(hitter: CourtPoint, aim: CourtPoint, depthOffset: number, sideOffset: number): CourtPoint {
    if (distance(hitter, aim) === 0) throw new Error('landingPoint: hitter and aim are the same point')

    // 1. unit vector along the shot
    const along = unitVector(hitter, aim)

    // 2. unit vector to the right
    const right = { x: -along.y, y: along.x }

    // 3. depth step
    const depthStep = { x: depthOffset * along.x, y: depthOffset * along.y }

    // 4. side step
    const sideStep = { x: sideOffset * right.x, y: sideOffset * right.y }

    // 5. landing = aim + depth step + side step
    const landing = { x: aim.x + depthStep.x + sideStep.x, y: aim.y + depthStep.y + sideStep.y }

    return landing
}