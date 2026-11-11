export type LabelBox = {
  x: number
  y: number
  width: number
  height: number
}

/** Court role: aims sit past the net; hitter/opponent face it from opposite ends. */
export type LabelKind = 'aim' | 'hitter' | 'opponent'

export type MarkerLabel = {
  id: string
  text: string
  markerX: number
  markerY: number
  /** Half-size of the marker, used as clearance before the label. */
  markerRadius: number
  kind: LabelKind
}

export type PlaceLabelsOptions = {
  fontSize?: number
  gap?: number
  height?: number
  margin?: number
  /** Portrait court: length runs vertically in the viewBox. */
  vertical?: boolean
}

/** ViewBox sides. SVG y grows downward, so "below" is toward the bottom of the screen. */
type ViewSide = 'left' | 'right' | 'above' | 'below'

/**
 * Court-relative sides, mapped into viewBox order per role and orientation.
 * beside = across the court; towardNet / awayFromNet = along its length.
 */
function viewSidesFor(kind: LabelKind, vertical: boolean): ViewSide[] {
  if (!vertical) {
    // Landscape: length → ±x, across → ±y (below = +y).
    if (kind === 'aim') return ['below', 'above', 'left', 'right']
    if (kind === 'hitter') return ['above', 'below', 'left', 'right']
    return ['above', 'below', 'right', 'left']
  }
  // Portrait: across → ±x, length → ∓y (away from the near baseline is up).
  if (kind === 'aim') return ['right', 'left', 'below', 'above']
  if (kind === 'hitter') return ['left', 'right', 'below', 'above']
  return ['left', 'right', 'above', 'below']
}

/** Estimated chip size from the label text. ViewBox metres, not DOM pixels. */
export function estimateLabelSize(text: string, fontSize = 0.3, height = 0.56) {
  const width = text.length * fontSize * 0.55 + 0.5
  return { width, height }
}

function overlaps(a: LabelBox, b: LabelBox, gap: number) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  )
}

function fits(box: LabelBox, boundsWidth: number, boundsHeight: number, margin: number) {
  return (
    box.x >= margin &&
    box.y >= margin &&
    box.x + box.width <= boundsWidth - margin &&
    box.y + box.height <= boundsHeight - margin
  )
}

function candidateBox(
  marker: MarkerLabel,
  side: ViewSide,
  size: { width: number; height: number },
  gap: number,
): LabelBox {
  const { width, height } = size
  const clear = marker.markerRadius + gap
  if (side === 'right') {
    return {
      x: marker.markerX + clear,
      y: marker.markerY - height / 2,
      width,
      height,
    }
  }
  if (side === 'left') {
    return {
      x: marker.markerX - clear - width,
      y: marker.markerY - height / 2,
      width,
      height,
    }
  }
  if (side === 'above') {
    return {
      x: marker.markerX - width / 2,
      y: marker.markerY - clear - height,
      width,
      height,
    }
  }
  return {
    x: marker.markerX - width / 2,
    y: marker.markerY + clear,
    width,
    height,
  }
}

/**
 * Places labels in the given marker priority order. Each marker tries
 * court-relative sides (see viewSidesFor). Returns null when no slot fits.
 */
export function placeLabels(
  markers: MarkerLabel[],
  bounds: { width: number; height: number },
  options: PlaceLabelsOptions = {},
): Record<string, LabelBox | null> {
  const fontSize = options.fontSize ?? 0.3
  const gap = options.gap ?? 0.12
  const height = options.height ?? 0.56
  const margin = options.margin ?? 0.12
  const vertical = options.vertical ?? false
  const placed: LabelBox[] = []
  const result: Record<string, LabelBox | null> = {}

  for (const marker of markers) {
    const size = estimateLabelSize(marker.text, fontSize, height)
    let chosen: LabelBox | null = null
    for (const side of viewSidesFor(marker.kind, vertical)) {
      const box = candidateBox(marker, side, size, gap)
      if (!fits(box, bounds.width, bounds.height, margin)) continue
      if (placed.some((other) => overlaps(box, other, gap))) continue
      chosen = box
      break
    }
    result[marker.id] = chosen
    if (chosen) placed.push(chosen)
  }

  return result
}
