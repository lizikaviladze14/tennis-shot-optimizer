import { distance, type CourtPoint } from './point'

/**
 * Where a shot lands when it misses the aim by the given offsets.
 * depthOffset > 0: lands long (past the aim).
 * sideOffset > 0: lands to the hitter's own right.
 * Throws if hitter and aim are the same point (shot direction undefined).
 */
export function landingPoint(hitter: CourtPoint, aim: CourtPoint, depthOffset: number, sideOffset: number): CourtPoint {
    // 1. arrow from hitter to aim
    const arrow = { x: aim.x - hitter.x, y: aim.y - hitter.y }

    // 2. length of the arrow
    const arrowLength = distance(hitter, aim)
    if (arrowLength === 0) throw new Error('landingPoint: hitter and aim are the same point')

    // 3. unit vector along the shot
    const along = { x: arrow.x / arrowLength, y: arrow.y / arrowLength }

    // 4. unit vector to the right
    const right = { x: -along.y, y: along.x }

    // 5. depth step
    const depthStep = { x: depthOffset * along.x, y: depthOffset * along.y }
    
    // 6. side step
    const sideStep = { x: sideOffset * right.x, y: sideOffset * right.y }

    // 7. landing = aim + depth step + side step
    const landing = { x: aim.x + depthStep.x + sideStep.x, y: aim.y + depthStep.y + sideStep.y }

    return landing
}