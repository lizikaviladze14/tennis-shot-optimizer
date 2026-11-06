export type CourtPoint = { x: number; y: number }

export function distance(a: CourtPoint, b: CourtPoint): number {
    return Math.hypot(b.x - a.x, b.y - a.y)
}