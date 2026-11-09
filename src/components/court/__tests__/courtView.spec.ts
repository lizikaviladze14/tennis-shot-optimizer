import { describe, expect, it } from 'vitest'
import { NET_X_M } from '@/math/courtGeometry'
import { DEFAULT_OPPONENT, DEFAULT_YOU } from '@/math/playerPosition'
import { courtToViewBox, viewBoxToCourt } from '../courtView'

describe('courtView', () => {
  it('round-trips default positions in both orientations', () => {
    for (const vertical of [false, true]) {
      for (const point of [DEFAULT_YOU, DEFAULT_OPPONENT]) {
          const view = courtToViewBox(point, vertical)
        const back = viewBoxToCourt(view.x, view.y, vertical)
        expect(back.x).toBeCloseTo(point.x)
        expect(back.y).toBeCloseTo(point.y)
      }
    }
  })

  it('maps a point inside the hitter baseline to above them on the portrait court', () => {
    const behind = { x: -0.4, y: 5 }
    const inside = { x: 2, y: 5 }
    const behindView = courtToViewBox(behind, true)
    const insideView = courtToViewBox(inside, true)
    expect(insideView.y).toBeLessThan(behindView.y)
    expect(viewBoxToCourt(insideView.x, insideView.y, true).x).toBeGreaterThan(0)
  })

  it('maps a point inside the opponent baseline below them on the portrait court', () => {
    const behind = DEFAULT_OPPONENT
    const inside = { x: NET_X_M + 4, y: behind.y }
    const behindView = courtToViewBox(behind, true)
    const insideView = courtToViewBox(inside, true)
    expect(insideView.y).toBeGreaterThan(behindView.y)
    expect(inside.x).toBeLessThan(behind.x)
  })
})
