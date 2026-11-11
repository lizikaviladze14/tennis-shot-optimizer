import { describe, expect, it } from 'vitest'
import { estimateLabelSize, placeLabels, type MarkerLabel } from '../labelPlacement'

function aim(partial: Partial<MarkerLabel> & Pick<MarkerLabel, 'id' | 'markerX' | 'markerY'>): MarkerLabel {
  return {
    text: 'Recommended',
    markerRadius: 0.32,
    kind: 'aim',
    ...partial,
  }
}

describe('estimateLabelSize', () => {
  it('grows with the text length', () => {
    expect(estimateLabelSize('YOU').width).toBeLessThan(estimateLabelSize('OPPONENT').width)
  })
})

describe('placeLabels', () => {
  it('keeps labels from overlapping when two markers share a spot', () => {
    const placed = placeLabels(
      [
        aim({ id: 'a', text: 'Recommended', markerX: 10, markerY: 5 }),
        aim({ id: 'b', text: 'Your target', markerX: 10, markerY: 5, markerRadius: 0.3 }),
      ],
      { width: 30, height: 15 },
      { vertical: false },
    )
    const a = placed.a
    const b = placed.b
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    if (!a || !b) return
    const gap = 0.12
    const overlap =
      a.x < b.x + b.width + gap &&
      a.x + a.width + gap > b.x &&
      a.y < b.y + b.height + gap &&
      a.y + a.height + gap > b.y
    expect(overlap).toBe(false)
  })

  it('prefers the below side for an aim on the landscape court', () => {
    const placed = placeLabels(
      [aim({ id: 'aim', markerX: 20, markerY: 5 })],
      { width: 30, height: 15 },
      { vertical: false },
    )
    const box = placed.aim
    expect(box).not.toBeNull()
    if (!box) return
    expect(box.x + box.width / 2).toBeCloseTo(20)
    expect(box.y).toBeGreaterThan(5)
  })

  it('keeps an aim label off the deep side when the marker is near the right edge', () => {
    const placed = placeLabels(
      [aim({ id: 'edge', markerX: 29.5, markerY: 5 })],
      { width: 30, height: 15 },
      { vertical: false },
    )
    const box = placed.edge
    expect(box).not.toBeNull()
    if (!box) return
    // beside slots overflow the edge, so fall back toward the net (left), not deep
    expect(box.x + box.width).toBeLessThan(29.5)
  })

  it('puts the hitter label above-side first on the landscape court', () => {
    const placed = placeLabels(
      [
        {
          id: 'you',
          text: 'YOU',
          markerX: 4,
          markerY: 5,
          markerRadius: 0.5,
          kind: 'hitter',
        },
      ],
      { width: 30, height: 15 },
      { vertical: false },
    )
    const box = placed.you
    expect(box).not.toBeNull()
    if (!box) return
    expect(box.y + box.height).toBeLessThan(5)
  })

  it('maps beside to left/right on the vertical court', () => {
    const placed = placeLabels(
      [aim({ id: 'aim', markerX: 5, markerY: 12 })],
      { width: 15, height: 30 },
      { vertical: true },
    )
    const box = placed.aim
    expect(box).not.toBeNull()
    if (!box) return
    // first choice is below-side → right in the portrait viewBox
    expect(box.x).toBeGreaterThan(5)
    expect(box.y + box.height / 2).toBeCloseTo(12)
  })

  it('hides a label when no side fits inside the bounds', () => {
    const placed = placeLabels(
      [aim({ id: 'tight', markerX: 0.2, markerY: 0.2 })],
      { width: 1.2, height: 1.2 },
      { vertical: false },
    )
    expect(placed.tight).toBeNull()
  })
})
