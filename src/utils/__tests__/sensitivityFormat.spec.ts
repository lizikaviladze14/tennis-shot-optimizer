import { describe, expect, it } from 'vitest'
import {
  CALCULATION_STEPS,
  calculationStepsMarkdown,
  formatAdviceChange,
  formatAim,
  formatAimPosition,
  formatCost,
  formatParameterName,
  formatParameterValue,
  formatSensitivityPercent,
  formatSetupLine,
  formatVerdict,
  sensitivityRows,
  summaryRows,
} from '../sensitivityFormat'
import { CENTER_SERVICE_Y_M, NET_X_M } from '@/math/courtGeometry'
import { DEFAULT_SENSITIVITY_SETUP, type AimSummary, type SensitivityResult } from '@/analysis/sensitivity'

const at = (pastNet: number, right: number) => ({ x: NET_X_M + pastNet, y: CENTER_SERVICE_Y_M + right })

describe('formatAimPosition', () => {
  it('says "center" when the aim is on the center line', () => {
    expect(formatAimPosition(at(9.8, 0))).toBe('9.8 m past net, center')
  })

  it('gives metres right or left of center', () => {
    expect(formatAimPosition(at(7.2, 2.1))).toBe('7.2 m past net, 2.1 m right')
    expect(formatAimPosition(at(7.2, -1.04))).toBe('7.2 m past net, 1.0 m left')
  })

  it('treats a tiny offset as center', () => {
    expect(formatAimPosition(at(5, 0.04))).toBe('5.0 m past net, center')
  })
})

describe('formatAim', () => {
  it('combines the zone label and the position', () => {
    expect(formatAim({ aim: at(9.8, 0), zone: { depth: 'deep', lateral: 'center' } })).toBe(
      'Deep · center (9.8 m past net, center)',
    )
  })
})

describe('small formatters', () => {
  it('formats percent with one decimal', () => {
    expect(formatSensitivityPercent(0.6234)).toBe('62.3%')
  })

  it('formats cost in pts with one decimal', () => {
    expect(formatCost(0)).toBe('0.0 pts')
    expect(formatCost(1.26)).toBe('1.3 pts')
  })

  it('formats verdict and advice change', () => {
    expect(formatVerdict('noticeable')).toBe('Noticeable')
    expect(formatAdviceChange('similar')).toBe('Similar alternative')
    expect(formatAdviceChange('yes')).toBe('Yes')
    expect(formatAdviceChange('shifts')).toBe('Aim shifts within zone')
  })

  it('formats parameter names and values with units', () => {
    expect(formatParameterName('playableWindow')).toBe('Playable window (T)')
    expect(formatParameterValue('playableWindow', 0.4)).toBe('0.4 s')
    expect(formatParameterValue('reachSteepness', 3)).toBe('3/m')
    expect(formatParameterValue('returnValue', { atNet: 0.2, atBaseline: 0.5 })).toBe('0.2 / 0.5')
    expect(formatParameterValue('consistency', 0.95)).toBe('0.95')
    expect(formatParameterValue('ballSpeed', 33.6)).toBe('33.6 m/s')
  })

  it('formats the setup line', () => {
    expect(formatSetupLine(DEFAULT_SENSITIVITY_SETUP, 'default positions')).toBe(
      'Detailed · Drive · Pro vs Pro · default positions · Balanced (λ = 0.4) · 2000 shots per target · seed 42 · 27×27 grid',
    )
  })
})

describe('rows', () => {
  const base: AimSummary = { aim: at(9.8, 0), zone: { depth: 'deep', lateral: 'center' }, pRallyWin: 0.5, value: 0.4 }
  const moved: AimSummary = { aim: at(7.2, 2.1), zone: { depth: 'mid', lateral: 'right' }, pRallyWin: 0.55, value: 0.45 }
  const result: SensitivityResult = {
    base,
    searchCount: 3,
    parameters: [
      {
        id: 'playableWindow',
        group: 'model',
        largestCost: 1.5,
        verdict: 'noticeable',
        changesAdvice: 'yes',
        variations: [
          { level: 'low', value: 0.3, recommended: base, costPoints: 0 },
          { level: 'base', value: 0.4, recommended: base, costPoints: 0 },
          { level: 'high', value: 0.5, recommended: moved, costPoints: 1.5 },
        ],
      },
    ],
  }

  it('shows the parameter only on its first row and marks the base row', () => {
    const rows = sensitivityRows(result, 'model')
    expect(rows.map((r) => r.parameter)).toEqual(['Playable window (T)', null, null])
    expect(rows.map((r) => r.isBase)).toEqual([false, true, false])
    expect(rows[1]!.value).toBe('0.4 s (base)')
    expect(rows[2]!.cost).toBe('1.5 pts')
    expect(sensitivityRows(result, 'player')).toEqual([])
  })

  it('builds summary rows', () => {
    expect(summaryRows(result.parameters)).toEqual([
      {
        id: 'playableWindow',
        parameter: 'Playable window (T)',
        changesAdvice: 'Yes',
        largestCost: '1.5 pts',
        verdict: 'noticeable',
        verdictLabel: 'Noticeable',
      },
    ])
  })
})

describe('calculation steps', () => {
  it('takes the risk weights from the presets', () => {
    const score = CALCULATION_STEPS.find((step) => step.title === 'Score of an aim')!
    const lambda = score.symbols.find(([symbol]) => symbol === 'λ')!
    expect(lambda[1]).toContain('Safer 1, Balanced 0.4, Aggressive 0')
  })

  it('gives every step at least one formula, an explanation and its symbols', () => {
    for (const step of CALCULATION_STEPS) {
      expect(step.formulas.length).toBeGreaterThan(0)
      expect(step.explanation.length).toBeGreaterThan(0)
      expect(step.symbols.length).toBeGreaterThan(0)
    }
  })

  it('explains the speed symbols', () => {
    const speed = CALCULATION_STEPS.find((step) => step.title === 'Ball speed for this aim')!
    expect(speed.symbols.map(([symbol]) => symbol)).toEqual(
      expect.arrayContaining(['d_A', 'f_min', 'v_A', 'v_B']),
    )
  })

  it('renders numbered Markdown with formulas in code blocks', () => {
    const markdown = calculationStepsMarkdown()
    expect(markdown.startsWith('### 1. Where a shot lands\n\n```\nL = A')).toBe(true)
    expect(markdown.match(/^### \d+\./gm)).toHaveLength(CALCULATION_STEPS.length)
  })
})
