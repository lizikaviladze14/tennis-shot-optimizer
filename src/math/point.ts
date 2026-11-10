export type CourtPoint = { x: number; y: number }

export function distance(a: CourtPoint, b: CourtPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Length-1 arrow pointing from `from` to `to`. Throws if they're the same point. */
export function unitVector(from: CourtPoint, to: CourtPoint): CourtPoint {
  const arrow = { x: to.x - from.x, y: to.y - from.y }
  const arrowLength = distance(from, to)
  if (arrowLength === 0) throw new Error('unitVector: from and to are the same point')
  const unit = { x: arrow.x / arrowLength, y: arrow.y / arrowLength }
  return unit
}
