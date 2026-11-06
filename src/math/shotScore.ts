import { COURT_SURFACE_LENGTH_M, COURT_SURFACE_WIDTH_M, NET_X_M, RUNOFF_M, SINGLES_ALLEY_M } from "./courtGeometry";
import { type CourtPoint, distance } from "./point";


export function calcShotScore(you: CourtPoint, opponent: CourtPoint, target: CourtPoint) {
    const isShotIn = isPointInCourt(target)
    const targetDistanceFromYou = distance(you, target)
    const targetDistanceFromOpponent = distance(opponent, target)

    return { isShotIn, targetDistanceFromYou, targetDistanceFromOpponent }
}

export function isPointInCourt(point: CourtPoint) {
    return (
      point.x > NET_X_M &&
      point.x <= COURT_SURFACE_LENGTH_M &&
      point.y >= SINGLES_ALLEY_M &&
      point.y <= COURT_SURFACE_WIDTH_M - SINGLES_ALLEY_M
    )
}

export function isOnOpponentHalf(point: CourtPoint): boolean {
    return (
      point.x > NET_X_M &&
      point.x <= COURT_SURFACE_LENGTH_M + RUNOFF_M &&
      point.y >= -RUNOFF_M &&
      point.y <= COURT_SURFACE_WIDTH_M + RUNOFF_M
    )
}