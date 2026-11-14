/**
 * One-at-a-time sensitivity analysis for the Detailed model.
 *
 * For one base setup, finds the recommended aim, then re-runs the search with
 * each parameter set to a low and a high value (everything else at base) and
 * reports how the recommendation and its score change.
 *
 * Pure: no Vue, no DOM. Results are plain numbers and ids; wording lives in
 * src/utils/sensitivityFormat.ts.
 */
import { findBestAim, shotValue, type AimResult } from '@/math/optimizer'
import { targetZone, type TargetZone } from '@/math/describeTarget'
import { DEFAULT_OPPONENT, DEFAULT_YOU } from '@/math/playerPosition'
import type { CourtPoint } from '@/math/point'
import { createDraws, mulberry32, type StandardDraw } from '@/math/random'
import { buildScenario, defaultModelGuesses, type ScenarioInputs } from './scenario'
import { estimateShotOutcome } from '@/math/simulation'
import { GRID_CELLS } from '@/math/modelConstants'
import { SHOT_TYPE_PROFILES, type ShotType } from '@/types/shotTypes'
import { OPPONENT_SKILL_PRESETS, type OpponentSkillLevel } from '@/types/opponentSkill'
import { RISK_PRESETS, type RiskPreference } from '@/types/riskPreference'
import { SHOT_ACCURACY_PRESETS, type ShotAccuracyLevel } from '@/types/shotAccuracy'

/** Everything that defines a run. Plain data, so it can be sent to a worker. */
export type SensitivitySetup = {
  hitterLevel: ShotAccuracyLevel
  opponentLevel: OpponentSkillLevel
  shotType: ShotType
  risk: RiskPreference
  shotsPerTarget: number
  seed: number
  hitter: CourtPoint
  opponent: CourtPoint
  cellCount: number
}

export const DEFAULT_SENSITIVITY_SETUP: SensitivitySetup = {
  hitterLevel: 'pro',
  opponentLevel: 'pro',
  shotType: 'drive',
  risk: 'balanced',
  shotsPerTarget: 2000,
  seed: 42,
  hitter: { ...DEFAULT_YOU },
  opponent: { ...DEFAULT_OPPONENT },
  cellCount: GRID_CELLS,
}

export type ParameterId =
  | 'playableWindow'
  | 'reachSteepness'
  | 'returnValue'
  | 'depthSpeedFactor'
  | 'afterBounceFactor'
  | 'shortestDepth'
  | 'sideError'
  | 'depthError'
  | 'ballSpeed'
  | 'runSpeed'
  | 'consistency'

export type ParameterGroup = 'model' | 'player'
export type VariationLevel = 'low' | 'base' | 'high'
/** A single number, or the rally-value pair q at the net / at the baseline. */
export type ParameterValue = number | { atNet: number; atBaseline: number }

export type SensitivityParameter = {
  id: ParameterId
  group: ParameterGroup
  values: { level: VariationLevel; value: ParameterValue }[]
  /** The base inputs with this parameter set to `value`. */
  apply: (inputs: ScenarioInputs, value: ParameterValue) => ScenarioInputs
}

export type Verdict = 'small' | 'noticeable' | 'large'
export type AdviceChange = 'yes' | 'shifts' | 'similar' | 'no'

export type AimSummary = {
  aim: CourtPoint
  zone: TargetZone
  pRallyWin: number
  /** The score findBestAim maximizes. */
  value: number
}

export type VariationResult = {
  level: VariationLevel
  value: ParameterValue
  recommended: AimSummary
  /** (best score − score of the base aim), both under this value, × 100. Never negative. */
  costPoints: number
}

export type ParameterResult = {
  id: ParameterId
  group: ParameterGroup
  variations: VariationResult[]
  largestCost: number
  verdict: Verdict
  changesAdvice: AdviceChange
}

export type SensitivityResult = {
  base: AimSummary
  parameters: ParameterResult[]
  searchCount: number
}

export type ProgressCallback = (done: number, total: number) => void

/** Small < 1 point, Noticeable 1–3, Large > 3. */
export function verdictFor(largestCost: number): Verdict {
  if (largestCost < 1) return 'small'
  if (largestCost <= 3) return 'noticeable'
  return 'large'
}

function sameZone(a: TargetZone, b: TargetZone) {
  return a.depth === b.depth && a.lateral === b.lateral
}

/**
 * Whether a parameter changes the advice, from its low and high variations:
 * - "yes": some variation moves the zone and costs ≥ 1 point to ignore;
 * - "shifts": the zone stays, but the aim moves within it and costs ≥ 1 point;
 * - "similar": the zone moves, but every such move costs < 1 point;
 * - "no": otherwise.
 */
export function adviceChange(base: TargetZone, variations: { zone: TargetZone; costPoints: number }[]): AdviceChange {
  const moved = variations.filter((variation) => !sameZone(variation.zone, base))
  if (moved.some((variation) => variation.costPoints >= 1)) return 'yes'
  if (variations.some((variation) => variation.costPoints >= 1)) return 'shifts'
  if (moved.length > 0) return 'similar'
  return 'no'
}

/** The Detailed scenario inputs for a setup, with every value from the presets. */
export function setupToInputs(setup: SensitivitySetup): ScenarioInputs {
  return {
    modelLevel: 'detailed',
    shotType: setup.shotType,
    shot: { level: setup.hitterLevel, ...SHOT_ACCURACY_PRESETS[setup.hitterLevel] },
    opponentSkill: { level: setup.opponentLevel, ...OPPONENT_SKILL_PRESETS[setup.opponentLevel] },
    hitter: { x: setup.hitter.x, y: setup.hitter.y },
    opponent: { x: setup.opponent.x, y: setup.opponent.y },
  }
}

export function createSensitivityDraws(setup: SensitivitySetup): StandardDraw[] {
  return createDraws(setup.shotsPerTarget, mulberry32(setup.seed))
}

const round = (value: number) => Math.round(value * 1000) / 1000

function spread(base: number, low: number, high: number, clamp?: { min?: number; max?: number }) {
  const limit = (value: number) =>
    round(Math.min(clamp?.max ?? Infinity, Math.max(clamp?.min ?? -Infinity, value)))
  return [
    { level: 'low' as const, value: limit(low) },
    { level: 'base' as const, value: base },
    { level: 'high' as const, value: limit(high) },
  ]
}

const asNumber = (value: ParameterValue) => {
  if (typeof value !== 'number') throw new Error('sensitivity: expected a number')
  return value
}

function withModel(inputs: ScenarioInputs, model: ScenarioInputs['model']): ScenarioInputs {
  return { ...inputs, model: { ...inputs.model, ...model } }
}

/** Player inputs are varied by these factors around the level's values. */
export const PLAYER_FACTORS = { low: 0.8, high: 1.2 } as const

/**
 * The tested parameters for a setup. Base values come from the presets and
 * model constants. Contains functions, so build it where it's used (e.g.
 * inside the worker) rather than sending it.
 */
export function sensitivityParameters(setup: SensitivitySetup): SensitivityParameter[] {
  const inputs = setupToInputs(setup)
  const guesses = defaultModelGuesses(setup.shotType)
  const maxPastNetM = SHOT_TYPE_PROFILES[setup.shotType].maxPastNetM
  const { low, high } = PLAYER_FACTORS
  const shot = inputs.shot
  const skill = inputs.opponentSkill

  const model = (
    id: ParameterId,
    values: SensitivityParameter['values'],
    apply: SensitivityParameter['apply'],
  ): SensitivityParameter => ({ id, group: 'model', values, apply })
  const player = (
    id: ParameterId,
    base: number,
    apply: SensitivityParameter['apply'],
    max?: number,
  ): SensitivityParameter => ({
    id,
    group: 'player',
    values: spread(base, base * low, base * high, { max }),
    apply,
  })

  return [
    model('playableWindow', spread(guesses.playableWindowS, guesses.playableWindowS - 0.1, guesses.playableWindowS + 0.1), (i, v) =>
      withModel(i, { playableWindowS: asNumber(v) }),
    ),
    model('reachSteepness', spread(guesses.reachSteepness, guesses.reachSteepness - 1, guesses.reachSteepness + 2), (i, v) =>
      withModel(i, { reachSteepness: asNumber(v) }),
    ),
    model(
      'returnValue',
      [-0.1, 0, 0.1].map((delta, index) => ({
        level: (['low', 'base', 'high'] as const)[index]!,
        value:
          delta === 0
            ? { atNet: guesses.returnValueAtNet, atBaseline: guesses.returnValueAtBaseline }
            : { atNet: round(guesses.returnValueAtNet + delta), atBaseline: round(guesses.returnValueAtBaseline + delta) },
      })),
      (i, v) => {
        if (typeof v === 'number') throw new Error('sensitivity: expected a rally-value pair')
        return withModel(i, { returnValueAtNet: v.atNet, returnValueAtBaseline: v.atBaseline })
      },
    ),
    model(
      'depthSpeedFactor',
      spread(guesses.minDepthSpeedFactor, guesses.minDepthSpeedFactor - 0.1, guesses.minDepthSpeedFactor + 0.1, { max: 1 }),
      (i, v) => withModel(i, { minDepthSpeedFactor: asNumber(v) }),
    ),
    model(
      'afterBounceFactor',
      spread(guesses.afterBounceSpeedFactor, guesses.afterBounceSpeedFactor - 0.1, guesses.afterBounceSpeedFactor + 0.1),
      (i, v) => withModel(i, { afterBounceSpeedFactor: asNumber(v) }),
    ),
    model(
      'shortestDepth',
      spread(guesses.minPastNetM, guesses.minPastNetM - 1, guesses.minPastNetM + 1, { min: 0, max: maxPastNetM - 1 }),
      (i, v) => withModel(i, { minPastNetM: asNumber(v) }),
    ),
    player('sideError', shot.sideErrorM, (i, v) => ({ ...i, shot: { ...i.shot, sideErrorM: asNumber(v) } })),
    player('depthError', shot.depthErrorM, (i, v) => ({ ...i, shot: { ...i.shot, depthErrorM: asNumber(v) } })),
    player('ballSpeed', shot.ballSpeedMps, (i, v) => ({ ...i, shot: { ...i.shot, ballSpeedMps: asNumber(v) } })),
    player('runSpeed', skill.runSpeedMps, (i, v) => ({
      ...i,
      opponentSkill: { ...i.opponentSkill, runSpeedMps: asNumber(v) },
    })),
    player(
      'consistency',
      skill.consistency,
      (i, v) => ({ ...i, opponentSkill: { ...i.opponentSkill, consistency: asNumber(v) } }),
      1,
    ),
  ]
}

function summarize(result: AimResult): AimSummary {
  return {
    aim: { x: result.aim.x, y: result.aim.y },
    zone: targetZone(result.aim),
    pRallyWin: result.outcome.pRallyWin,
    value: result.value,
  }
}

/** Number of findBestAim searches a run makes: the base plus every non-base value. */
export function searchCount(parameters: SensitivityParameter[]): number {
  return 1 + parameters.reduce((sum, p) => sum + p.values.filter((v) => v.level !== 'base').length, 0)
}

/**
 * Runs the analysis. Calls onProgress(done, total) after each search.
 * `parameters` defaults to sensitivityParameters(setup); pass a subset in tests.
 */
export function runSensitivity(
  setup: SensitivitySetup,
  draws: StandardDraw[],
  onProgress?: ProgressCallback,
  parameters: SensitivityParameter[] = sensitivityParameters(setup),
): SensitivityResult {
  const riskWeight = RISK_PRESETS[setup.risk].riskWeight
  const baseInputs = setupToInputs(setup)
  const total = searchCount(parameters)
  let done = 0

  const search = (inputs: ScenarioInputs) => {
    const { scenario, pastNetRange } = buildScenario(inputs)
    const found = findBestAim(scenario, draws, riskWeight, setup.cellCount, pastNetRange)
    done++
    onProgress?.(done, total)
    return { scenario, found }
  }

  const baseSearch = search(baseInputs)
  const base = summarize(baseSearch.found.best)

  const results: ParameterResult[] = parameters.map((parameter) => {
    const variations: VariationResult[] = parameter.values.map(({ level, value }) => {
      if (level === 'base') return { level, value, recommended: base, costPoints: 0 }
      const { scenario, found } = search(parameter.apply(baseInputs, value))
      const best = found.best
      // the base aim may lie outside a changed search range, so score it directly
      const baseAimResult = found.results.find((r) => r.aim.x === base.aim.x && r.aim.y === base.aim.y)
      const baseAimValue =
        baseAimResult?.value ?? shotValue(estimateShotOutcome(scenario, base.aim, draws), riskWeight)
      const costPoints = Math.max(0, (best.value - baseAimValue) * 100)
      return { level, value, recommended: summarize(best), costPoints }
    })
    const largestCost = Math.max(...variations.map((v) => v.costPoints))
    return {
      id: parameter.id,
      group: parameter.group,
      variations,
      largestCost,
      verdict: verdictFor(largestCost),
      changesAdvice: adviceChange(
        base.zone,
        variations.map((v) => ({ zone: v.recommended.zone, costPoints: v.costPoints })),
      ),
    }
  })

  return { base, parameters: results, searchCount: total }
}
