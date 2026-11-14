/**
 * Wording for the sensitivity analysis, shared by scripts/sensitivity.ts
 * (Markdown) and the "Test assumptions" dialog.
 */
import type {
  AdviceChange,
  AimSummary,
  ParameterGroup,
  ParameterId,
  ParameterResult,
  ParameterValue,
  SensitivityResult,
  SensitivitySetup,
  VariationLevel,
  Verdict,
} from '@/analysis/sensitivity'
import { COURT_SURFACE_LENGTH_M, NET_X_M } from '@/math/courtGeometry'
import { metresPastNet, metresRightOfCenter } from '@/math/describeTarget'
import { RISK_PRESETS } from '@/types/riskPreference'
import { SHOT_TYPE_PROFILES } from '@/types/shotTypes'
import { zoneLabel } from './courtLabels'

export const PARAMETER_LABELS: Record<ParameterId, { name: string; symbol: string; unit: string }> = {
  playableWindow: { name: 'Playable window', symbol: 'T', unit: 's' },
  reachSteepness: { name: 'Reach steepness', symbol: 'k', unit: '/m' },
  returnValue: { name: 'Rally value at net / baseline', symbol: 'q₀ / q₁', unit: '' },
  depthSpeedFactor: { name: 'Depth speed factor', symbol: 'f_min', unit: '' },
  afterBounceFactor: { name: 'After-bounce factor', symbol: 'b', unit: '' },
  shortestDepth: { name: 'Shortest depth', symbol: 'd_min', unit: 'm' },
  sideError: { name: 'Side error', symbol: 'σ_side', unit: 'm' },
  depthError: { name: 'Depth error', symbol: 'σ_depth', unit: 'm' },
  ballSpeed: { name: 'Ball speed', symbol: 'v', unit: 'm/s' },
  runSpeed: { name: 'Opponent running speed', symbol: 'v_opp', unit: 'm/s' },
  consistency: { name: 'Opponent consistency', symbol: 'c', unit: '' },
}

export const GROUP_TITLES: Record<ParameterGroup, string> = {
  model: 'Model guesses',
  player: 'Player inputs',
}

export const VERDICT_LEGEND = 'Small < 1 pt · Noticeable 1–3 pts · Large > 3 pts · pts = points per 100 shots'

const RISK_LAMBDAS = Object.values(RISK_PRESETS)
  .map((risk) => `${risk.label} ${risk.riskWeight}`)
  .join(', ')

const NET_TO_BASELINE_M = (COURT_SURFACE_LENGTH_M - NET_X_M).toFixed(2)

export type CalculationStep = {
  title: string
  formulas: string[]
  explanation: string
  /** Every symbol in the formulas with a short meaning, in order of appearance. */
  symbols: [symbol: string, meaning: string][]
}

/**
 * How every number in the tables is calculated, in the order the model runs.
 * Symbols match PARAMETER_LABELS. Shown before the tables in the dialog and
 * in docs/sensitivity-results.md.
 */
export const CALCULATION_STEPS: CalculationStep[] = [
  {
    title: 'Where a shot lands',
    formulas: ['L = A + σ_depth·z₁·û + σ_side·z₂·r̂'],
    explanation:
      'Each simulated shot misses the aim by a random amount, long or short and left or right. The same N draws are used for every aim, so aims are compared fairly.',
    symbols: [
      ['L', 'where the ball lands'],
      ['A', 'the aim point'],
      ['σ_depth, σ_side', 'depth and side error: typical miss in metres'],
      ['z₁, z₂', 'random numbers from a standard normal curve, one pair per simulated shot'],
      ['û, r̂', 'one-metre directions: along the shot, and to the hitter’s right'],
    ],
  },
  {
    title: 'Ball speed for this aim',
    formulas: ['f(d_A) = f_min + (1 − f_min)·(d_A − d_min) / (d_max − d_min)', 'v_A = v·f(d_A)    v_B = b·v_A'],
    explanation:
      'A shorter aim needs a slower ball, so the speed grows from a fraction f_min at the shortest depth to full speed at the deepest (clamped outside that range). The bounce then slows the ball by b.',
    symbols: [
      ['d_A', 'how far past the net the aim is (m)'],
      ['d_min, d_max', 'shortest and deepest landing for this shot type (m)'],
      ['f_min', 'depth speed factor: share of full speed at d_min'],
      ['f(d_A)', 'share of full speed used for this aim'],
      ['v', 'the player’s ball speed (m/s)'],
      ['v_A', 'ball speed for this aim'],
      ['b', 'after-bounce factor'],
      ['v_B', 'ball speed after the bounce'],
    ],
  },
  {
    title: 'Can the opponent get there?',
    formulas: [
      'P(s) = L + s·v_B·T·û_L,   s ∈ {0, ¼, ½, ¾, 1}',
      'm = min over s of [ |O − P(s)| − v_opp·(|H − L| / v_A + s·T) ]',
    ],
    explanation:
      'After the bounce the ball keeps travelling and stays playable for a while. At five moments along that path, compare how far the opponent must run with how far they can run in the time so far, and keep the easiest one.',
    symbols: [
      ['T', 'playable window: seconds the ball stays playable after the bounce'],
      ['s', 'fraction of T that has passed'],
      ['P(s)', 'where the ball is at that moment'],
      ['û_L', 'one-metre direction from the hitter to where the ball landed'],
      ['O, H', 'opponent’s and hitter’s positions'],
      ['|X − Y|', 'distance between two points (m)'],
      ['|H − L| / v_A', 'the ball’s flight time to the bounce (s)'],
      ['v_opp', 'opponent’s running speed (m/s)'],
      ['m', 'margin (m): distance still to run; negative means time to spare'],
    ],
  },
  {
    title: 'Chance of a return',
    formulas: ['P_reach = 1 / (1 + e^(k·m))', 'P_return = c·P_reach'],
    explanation:
      'A smooth chance of reaching the ball: 50% when the margin is exactly 0, higher with time to spare, lower when too far. Reaching it isn’t enough; the opponent also has to put it back in.',
    symbols: [
      ['P_reach', 'chance the opponent reaches the ball'],
      ['k', 'reach steepness (1/m): how quickly that chance drops around m = 0'],
      ['e', 'Euler’s number, ≈ 2.718'],
      ['c', 'opponent consistency: chance a reached ball goes back in'],
      ['P_return', 'chance the ball comes back'],
    ],
  },
  {
    title: 'Rally value of each shot',
    formulas: ['q(d_L) = q₀ + (q₁ − q₀)·d_L / d_baseline', 'w = 1 − (1 − q(d_L))·P_return   (in),   w = 0   (out)'],
    explanation:
      'A returned ball isn’t a lost point: you can still win the rally, more often after a deep shot. Each simulated shot is worth 1 as a winner, q if it comes back, and 0 if it’s out.',
    symbols: [
      ['d_L', 'how far past the net the ball landed (m)'],
      ['d_baseline', `net to baseline, ${NET_TO_BASELINE_M} m`],
      ['q₀, q₁', 'rally value: chance to still win after a return of a ball that landed at the net / at the baseline'],
      ['q(d_L)', 'that chance for this landing'],
      ['w', 'what one simulated shot is worth'],
    ],
  },
  {
    title: 'Score of an aim',
    formulas: ['P(rally win) = (1/N)·Σ w', 'S = P(rally win) − λ·P(miss)'],
    explanation:
      'The search scores every aim on the grid between d_min and the baseline and recommends the one with the highest S.',
    symbols: [
      ['N', 'simulated shots per aim'],
      ['Σ w', 'sum of w over those shots'],
      ['P(miss)', 'share of shots that land out'],
      ['λ', `risk weight, from the risk choice (${RISK_LAMBDAS})`],
      ['S', 'the aim’s score'],
    ],
  },
  {
    title: 'Cost of keeping the base aim',
    formulas: ['cost = 100 · ( S′(A′) − S′(A_base) )'],
    explanation:
      'Change one parameter, run the search again, and measure how much score you lose by sticking with the old aim. Never negative.',
    symbols: [
      ['A_base', 'the aim recommended with every parameter at base'],
      ['A′', 'the aim recommended after the change'],
      ['S′', 'score calculated with the changed value'],
      ['pts', 'points per 100 shots: score × 100'],
    ],
  },
  {
    title: 'Verdict and “Changes the advice?”',
    formulas: ['largest cost = max(cost_low, cost_high)'],
    explanation:
      'Small < 1 pt, Noticeable 1–3 pts, Large > 3 pts. “Yes” if a tested value moves the recommendation to another zone and costs at least 1 pt; “Aim shifts within zone” if the zone stays but the aim moves inside it and costs at least 1 pt; “Similar alternative” if the zone moves but the cost is below 1 pt; otherwise “No”.',
    symbols: [['cost_low, cost_high', 'the cost with the parameter’s low and high value']],
  },
]

/** "Playable window (T)" */
export function formatParameterName(id: ParameterId): string {
  const { name, symbol } = PARAMETER_LABELS[id]
  return `${name} (${symbol})`
}

/** Up to two decimals, trailing zeros trimmed: 0.4, 0.65, 28. */
function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/** "0.4 s", "0.2 / 0.5", "28 m/s" */
export function formatParameterValue(id: ParameterId, value: ParameterValue): string {
  if (typeof value !== 'number') return `${formatNumber(value.atNet)} / ${formatNumber(value.atBaseline)}`
  const { unit } = PARAMETER_LABELS[id]
  const number = formatNumber(value)
  if (!unit) return number
  return unit.startsWith('/') ? `${number}${unit}` : `${number} ${unit}`
}

/** "9.8 m past net, center" / "7.2 m past net, 2.1 m right". Left and right are the hitter's own. */
export function formatAimPosition(aim: { x: number; y: number }): string {
  const pastNet = `${metresPastNet(aim).toFixed(1)} m past net`
  const right = Math.round(metresRightOfCenter(aim) * 10) / 10
  if (right === 0) return `${pastNet}, center`
  return `${pastNet}, ${Math.abs(right).toFixed(1)} m ${right > 0 ? 'right' : 'left'}`
}

/** "Deep · center (9.8 m past net, center)" */
export function formatAim(summary: Pick<AimSummary, 'aim' | 'zone'>): string {
  return `${zoneLabel(summary.zone)} (${formatAimPosition(summary.aim)})`
}

/** One decimal, e.g. "62.4%". */
export function formatSensitivityPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`
}

/** Points per 100 shots (score × 100), one decimal: "1.3 pts". */
export function formatCost(costPoints: number): string {
  return `${costPoints.toFixed(1)} pts`
}

export function formatVerdict(verdict: Verdict): string {
  return { small: 'Small', noticeable: 'Noticeable', large: 'Large' }[verdict]
}

export function formatAdviceChange(change: AdviceChange): string {
  return { yes: 'Yes', shifts: 'Aim shifts within zone', similar: 'Similar alternative', no: 'No' }[change]
}

/** "Detailed · Drive · Pro vs Pro · default positions · Balanced (λ = 0.4) · 2000 shots per target · seed 42 · 27×27 grid" */
export function formatSetupLine(setup: SensitivitySetup, positionsLabel: string): string {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const risk = RISK_PRESETS[setup.risk]
  return [
    'Detailed',
    SHOT_TYPE_PROFILES[setup.shotType].label,
    `${capitalize(setup.hitterLevel)} vs ${capitalize(setup.opponentLevel)}`,
    positionsLabel,
    `${risk.label} (λ = ${risk.riskWeight})`,
    `${setup.shotsPerTarget} shots per target`,
    `seed ${setup.seed}`,
    `${setup.cellCount}×${setup.cellCount} grid`,
  ].join(' · ')
}

export type SensitivityRow = {
  key: string
  /** Parameter name + symbol on the first row of each parameter only. */
  parameter: string | null
  level: VariationLevel
  isBase: boolean
  /** Base values carry "(base)". */
  value: string
  aim: string
  rallyWin: string
  cost: string
}

/** Table rows for one group, in parameter order, low → base → high. */
export function sensitivityRows(result: SensitivityResult, group: ParameterGroup): SensitivityRow[] {
  return result.parameters
    .filter((parameter) => parameter.group === group)
    .flatMap((parameter) =>
      parameter.variations.map((variation, index) => {
        const isBase = variation.level === 'base'
        const value = formatParameterValue(parameter.id, variation.value)
        return {
          key: `${parameter.id}-${variation.level}`,
          parameter: index === 0 ? formatParameterName(parameter.id) : null,
          level: variation.level,
          isBase,
          value: isBase ? `${value} (base)` : value,
          aim: formatAim(variation.recommended),
          rallyWin: formatSensitivityPercent(variation.recommended.pRallyWin),
          cost: formatCost(variation.costPoints),
        }
      }),
    )
}

/** CALCULATION_STEPS as Markdown: a numbered heading, the formulas in a code block, the symbols, then the explanation. */
export function calculationStepsMarkdown(): string {
  return CALCULATION_STEPS.map(
    (step, index) =>
      `### ${index + 1}. ${step.title}\n\n\`\`\`\n${step.formulas.join('\n')}\n\`\`\`\n\n${step.symbols.map(([symbol, meaning]) => `- \`${symbol}\` — ${meaning}`).join('\n')}\n\n${step.explanation}`,
  ).join('\n\n')
}

export type SummaryRow = {
  id: ParameterId
  parameter: string
  changesAdvice: string
  largestCost: string
  verdict: Verdict
  verdictLabel: string
}

export function summaryRows(parameters: ParameterResult[]): SummaryRow[] {
  return parameters.map((parameter) => ({
    id: parameter.id,
    parameter: formatParameterName(parameter.id),
    changesAdvice: formatAdviceChange(parameter.changesAdvice),
    largestCost: formatCost(parameter.largestCost),
    verdict: parameter.verdict,
    verdictLabel: formatVerdict(parameter.verdict),
  }))
}
