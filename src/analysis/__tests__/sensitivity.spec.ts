import { describe, expect, it } from 'vitest'
import {
  adviceChange,
  DEFAULT_SENSITIVITY_SETUP,
  runSensitivity,
  searchCount,
  sensitivityParameters,
  setupToInputs,
  verdictFor,
  type SensitivityParameter,
  type SensitivitySetup,
} from '../sensitivity'
import { buildScenario } from '@/analysis/scenario'
import { createDraws, mulberry32 } from '@/math/random'
import { OPPONENT_SKILL_PRESETS } from '@/types/opponentSkill'
import { SHOT_ACCURACY_PRESETS } from '@/types/shotAccuracy'
import { SHOT_TYPE_PROFILES } from '@/types/shotTypes'

const setup: SensitivitySetup = { ...DEFAULT_SENSITIVITY_SETUP, shotsPerTarget: 40, cellCount: 5 }
const draws = createDraws(setup.shotsPerTarget, mulberry32(setup.seed))
const parameters = sensitivityParameters(setup)
const byId = (id: SensitivityParameter['id']) => parameters.find((p) => p.id === id)!

describe('verdictFor', () => {
  it('uses Small < 1, Noticeable 1–3, Large > 3', () => {
    expect(verdictFor(0)).toBe('small')
    expect(verdictFor(0.99)).toBe('small')
    expect(verdictFor(1)).toBe('noticeable')
    expect(verdictFor(3)).toBe('noticeable')
    expect(verdictFor(3.01)).toBe('large')
  })
})

describe('adviceChange', () => {
  const base = { depth: 'deep', lateral: 'center' } as const
  const moved = { depth: 'deep', lateral: 'right' } as const

  it('is "no" when the zone stays the same and the cost is < 1', () => {
    expect(adviceChange(base, [{ zone: base, costPoints: 0.9 }])).toBe('no')
  })

  it('is "aim shifts within zone" when the zone stays the same but the cost is ≥ 1', () => {
    expect(adviceChange(base, [{ zone: base, costPoints: 1 }])).toBe('shifts')
    expect(adviceChange(base, [{ zone: base, costPoints: 5 }])).toBe('shifts')
  })

  it('prefers "aim shifts within zone" over a cheap zone change', () => {
    expect(adviceChange(base, [{ zone: moved, costPoints: 0.1 }, { zone: base, costPoints: 3 }])).toBe('shifts')
  })

  it('is "similar alternative" when the zone changes but the cost is < 1', () => {
    expect(adviceChange(base, [{ zone: moved, costPoints: 0.5 }])).toBe('similar')
  })

  it('is "yes" when the zone changes and the cost is ≥ 1', () => {
    expect(adviceChange(base, [{ zone: moved, costPoints: 0.2 }, { zone: moved, costPoints: 1 }])).toBe('yes')
  })
})

describe('sensitivityParameters', () => {
  it('gives every parameter low, base and high with exactly one base', () => {
    expect(parameters).toHaveLength(11)
    for (const parameter of parameters) {
      expect(parameter.values.map((v) => v.level)).toEqual(['low', 'base', 'high'])
    }
  })

  it('takes the base values from the presets', () => {
    const pro = SHOT_ACCURACY_PRESETS.pro
    expect(byId('sideError').values[1]!.value).toBe(pro.sideErrorM)
    expect(byId('ballSpeed').values.map((v) => v.value)).toEqual([
      pro.ballSpeedMps * 0.8,
      pro.ballSpeedMps,
      pro.ballSpeedMps * 1.2,
    ].map((v) => Math.round(v * 1000) / 1000))
    expect(byId('afterBounceFactor').values[1]!.value).toBe(SHOT_TYPE_PROFILES.drive.afterBounceSpeedFactor)
  })

  it('caps opponent consistency at 1', () => {
    const values = byId('consistency').values.map((v) => v.value as number)
    expect(values[1]).toBe(OPPONENT_SKILL_PRESETS.pro.consistency)
    expect(values[2]).toBe(1)
    expect(values.every((v) => v <= 1)).toBe(true)
  })

  it('updates the after-bounce speed when the ball speed changes', () => {
    const inputs = byId('ballSpeed').apply(setupToInputs(setup), 30)
    const { scenario } = buildScenario(inputs)
    expect(scenario.shot.ballSpeedMps).toBe(30)
    expect(scenario.bounce.afterBounceSpeedMps).toBeCloseTo(30 * SHOT_TYPE_PROFILES.drive.afterBounceSpeedFactor)
  })

  it('updates the after-bounce speed when the after-bounce factor changes', () => {
    const inputs = byId('afterBounceFactor').apply(setupToInputs(setup), 0.75)
    const { scenario } = buildScenario(inputs)
    expect(scenario.bounce.afterBounceSpeedMps).toBeCloseTo(scenario.shot.ballSpeedMps * 0.75)
  })

  it('moves both the search range and the depth-speed range with the shortest depth', () => {
    const inputs = byId('shortestDepth').apply(setupToInputs(setup), 5.5)
    const built = buildScenario(inputs)
    expect(built.pastNetRange?.min).toBe(5.5)
    expect(built.scenario.depthSpeed.minPastNetM).toBe(5.5)
  })
})

describe('runSensitivity', () => {
  const progress: [number, number][] = []
  const result = runSensitivity(setup, draws, (done, total) => progress.push([done, total]))

  it('counts progress up to the total, one step per search', () => {
    const total = searchCount(parameters)
    expect(total).toBe(23)
    expect(progress).toHaveLength(total)
    expect(progress.map(([done]) => done)).toEqual(Array.from({ length: total }, (_, i) => i + 1))
    expect(progress.every(([, t]) => t === total)).toBe(true)
  })

  it('never reports a negative cost', () => {
    for (const parameter of result.parameters) {
      for (const variation of parameter.variations) expect(variation.costPoints).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives zero cost when the recommended aim does not change', () => {
    for (const parameter of result.parameters) {
      for (const variation of parameter.variations) {
        const { aim } = variation.recommended
        if (aim.x === result.base.aim.x && aim.y === result.base.aim.y) expect(variation.costPoints).toBe(0)
      }
    }
  })

  it('reuses the base search for base rows', () => {
    for (const parameter of result.parameters) {
      const base = parameter.variations.find((v) => v.level === 'base')!
      expect(base.recommended).toBe(result.base)
      expect(base.costPoints).toBe(0)
    }
  })

  it('reports a verdict from the largest cost', () => {
    for (const parameter of result.parameters) {
      expect(parameter.largestCost).toBe(Math.max(...parameter.variations.map((v) => v.costPoints)))
      expect(parameter.verdict).toBe(verdictFor(parameter.largestCost))
    }
  })

  it('gives zero cost for a parameter that has no effect', () => {
    const noop: SensitivityParameter = {
      id: 'playableWindow',
      group: 'model',
      values: [
        { level: 'low', value: 1 },
        { level: 'base', value: 2 },
        { level: 'high', value: 3 },
      ],
      apply: (inputs) => inputs,
    }
    const single = runSensitivity(setup, draws, undefined, [noop])
    expect(single.parameters[0]!.largestCost).toBe(0)
    expect(single.parameters[0]!.changesAdvice).toBe('no')
  })
})
