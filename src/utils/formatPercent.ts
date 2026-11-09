/**
 * Formats a probability for display. Values are estimates from a finite
 * simulation, so the extremes are shown as ">99%" and "<1%" instead of
 * implying certainty.
 */
export function formatPercent(p: number): string {
  if (p > 0.99) return '>99%'
  if (p < 0.01) return '<1%'
  return `${Math.round(p * 100)}%`
}
