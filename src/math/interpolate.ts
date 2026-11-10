/**
 * Linear interpolation by depth past the net: valueAtMin at minPastNetM,
 * valueAtMax at maxPastNetM, clamped outside the range.
 */
export function interpolateByDepth(
  pastNetM: number,
  minPastNetM: number,
  maxPastNetM: number,
  valueAtMin: number,
  valueAtMax: number,
): number {
  if (minPastNetM === maxPastNetM) return valueAtMax
  if (pastNetM <= minPastNetM) return valueAtMin
  if (pastNetM >= maxPastNetM) return valueAtMax
  const t = (pastNetM - minPastNetM) / (maxPastNetM - minPastNetM)
  return valueAtMin + t * (valueAtMax - valueAtMin)
}
