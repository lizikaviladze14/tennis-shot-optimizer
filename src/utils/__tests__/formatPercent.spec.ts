import { describe, expect, it } from 'vitest'
import { formatPercent } from '../formatPercent'

describe('formatPercent', () => {
  it('shows the extremes as bounds, not certainty', () => {
    expect(formatPercent(1)).toBe('>99%')
    expect(formatPercent(0.995)).toBe('>99%')
    expect(formatPercent(0.99)).toBe('99%')
    expect(formatPercent(0.5)).toBe('50%')
    expect(formatPercent(0.01)).toBe('1%')
    expect(formatPercent(0.004)).toBe('<1%')
    expect(formatPercent(0)).toBe('<1%')
  })
})
