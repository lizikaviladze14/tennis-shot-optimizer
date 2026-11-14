<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import SegmentedControl from '@/components/base/SegmentedControl.vue'
import {
  DEFAULT_SENSITIVITY_SETUP,
  searchCount,
  sensitivityParameters,
  type ParameterGroup,
  type SensitivityResult,
  type SensitivitySetup,
} from '@/analysis/sensitivity'
import type { SensitivityRequest, SensitivityResponse } from '@/workers/sensitivity.worker'
import { CENTER_SERVICE_Y_M, COURT_SURFACE_LENGTH_M } from '@/math/courtGeometry'
import { DEFAULT_OPPONENT, DEFAULT_YOU } from '@/math/playerPosition'
import type { CourtPoint } from '@/math/point'
import type { OpponentSkillLevel } from '@/types/opponentSkill'
import { RISK_PRESETS, type RiskPreference } from '@/types/riskPreference'
import type { ShotAccuracyLevel } from '@/types/shotAccuracy'
import { SHOT_COUNT_OPTIONS } from '@/types/shotCount'
import type { ShotType } from '@/types/shotTypes'
import {
  CALCULATION_STEPS,
  formatAim,
  formatSensitivityPercent,
  formatSetupLine,
  GROUP_TITLES,
  sensitivityRows,
  summaryRows,
  VERDICT_LEGEND,
} from '@/utils/sensitivityFormat'

/** The app's current setup. Only read when "Copy my current setup" is pressed. */
export type AppSetup = {
  hitterLevel: ShotAccuracyLevel
  opponentLevel: OpponentSkillLevel
  shotType: ShotType
  risk: RiskPreference
  shotsPerTarget: number
  hitter: CourtPoint
  opponent: CourtPoint
}

const props = defineProps<{
  open: boolean
  appSetup: AppSetup
}>()

const emit = defineEmits<{ close: [] }>()

type PositionChoice = 'default' | 'centered' | 'wide' | 'current'
type ShotsChoice = '500' | '1000' | '2000'

/** "Pulled wide": 3 m to the opponent's own right, 0.8 m behind their baseline. */
const PULLED_WIDE_M = 3
const BEHIND_BASELINE_M = 0.8

const levelOptions: { id: ShotAccuracyLevel & OpponentSkillLevel; label: string }[] = [
  { id: 'club', label: 'Club' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'pro', label: 'Pro' },
]
const shotTypeOptions: { id: ShotType; label: string }[] = [
  { id: 'drive', label: 'Drive' },
  { id: 'slice', label: 'Slice' },
  { id: 'drop', label: 'Drop shot' },
]
const riskOptions = (Object.keys(RISK_PRESETS) as RiskPreference[]).map((id) => ({ id, label: RISK_PRESETS[id].label }))
const shotsOptions = SHOT_COUNT_OPTIONS.filter((option) => option.count >= 500).map((option) => ({
  id: option.id as ShotsChoice,
  label: option.count.toLocaleString('en-US'),
}))
const positionOptions = computed<{ id: PositionChoice; label: string }[]>(() => [
  { id: 'default', label: 'Default' },
  { id: 'centered', label: 'Centered' },
  { id: 'wide', label: 'Pulled wide' },
  ...(copiedPositions.value ? [{ id: 'current' as const, label: 'Current' }] : []),
])
const POSITION_LABELS: Record<PositionChoice, string> = {
  default: 'default positions',
  centered: 'opponent centered',
  wide: 'opponent pulled wide',
  current: 'current positions',
}

const hitterLevel = ref<ShotAccuracyLevel>(DEFAULT_SENSITIVITY_SETUP.hitterLevel)
const opponentLevel = ref<OpponentSkillLevel>(DEFAULT_SENSITIVITY_SETUP.opponentLevel)
const shotType = ref<ShotType>(DEFAULT_SENSITIVITY_SETUP.shotType)
const risk = ref<RiskPreference>(DEFAULT_SENSITIVITY_SETUP.risk)
const shots = ref<ShotsChoice>(String(DEFAULT_SENSITIVITY_SETUP.shotsPerTarget) as ShotsChoice)
const position = ref<PositionChoice>('default')
/** Plain { x, y } copies, never the app's reactive objects. */
const copiedPositions = ref<{ hitter: CourtPoint; opponent: CourtPoint } | null>(null)

function positionsFor(choice: PositionChoice): { hitter: CourtPoint; opponent: CourtPoint } {
  const hitter = { x: DEFAULT_YOU.x, y: DEFAULT_YOU.y }
  if (choice === 'current' && copiedPositions.value) {
    const copied = copiedPositions.value
    return { hitter: { x: copied.hitter.x, y: copied.hitter.y }, opponent: { x: copied.opponent.x, y: copied.opponent.y } }
  }
  if (choice === 'centered') return { hitter, opponent: { x: DEFAULT_OPPONENT.x, y: CENTER_SERVICE_Y_M } }
  if (choice === 'wide') {
    // the opponent faces the hitter, so their right is smaller y
    return { hitter, opponent: { x: COURT_SURFACE_LENGTH_M + BEHIND_BASELINE_M, y: CENTER_SERVICE_Y_M - PULLED_WIDE_M } }
  }
  return { hitter, opponent: { x: DEFAULT_OPPONENT.x, y: DEFAULT_OPPONENT.y } }
}

/** The setup as plain data: primitives and { x, y } points only. */
const setup = computed<SensitivitySetup>(() => ({
  hitterLevel: hitterLevel.value,
  opponentLevel: opponentLevel.value,
  shotType: shotType.value,
  risk: risk.value,
  shotsPerTarget: Number(shots.value),
  seed: DEFAULT_SENSITIVITY_SETUP.seed,
  cellCount: DEFAULT_SENSITIVITY_SETUP.cellCount,
  ...positionsFor(position.value),
}))

function copyCurrentSetup() {
  const app = props.appSetup
  hitterLevel.value = app.hitterLevel
  opponentLevel.value = app.opponentLevel
  shotType.value = app.shotType
  risk.value = app.risk
  const nearest = shotsOptions.reduce((best, option) =>
    Math.abs(Number(option.id) - app.shotsPerTarget) < Math.abs(Number(best.id) - app.shotsPerTarget) ? option : best,
  )
  shots.value = nearest.id
  copiedPositions.value = {
    hitter: { x: app.hitter.x, y: app.hitter.y },
    opponent: { x: app.opponent.x, y: app.opponent.y },
  }
  position.value = 'current'
}

// --- running -------------------------------------------------------------

const result = ref<SensitivityResult | null>(null)
const resultSetup = ref<{ key: string; line: string } | null>(null)
const isRunning = ref(false)
const progress = ref({ done: 0, total: 0 })
const errorMessage = ref<string | null>(null)

let worker: Worker | null = null
let requestId = 0

const setupKey = computed(() => JSON.stringify(setup.value))
const isOutOfDate = computed(() => result.value !== null && resultSetup.value?.key !== setupKey.value)

function stopWorker() {
  worker?.terminate()
  worker = null
}

function run() {
  stopWorker()
  const id = ++requestId
  const request: SensitivityRequest = { id, setup: JSON.parse(setupKey.value) as SensitivitySetup }
  const runKey = setupKey.value
  const runLine = formatSetupLine(request.setup, POSITION_LABELS[position.value])
  progress.value = { done: 0, total: searchCount(sensitivityParameters(request.setup)) }
  errorMessage.value = null
  isRunning.value = true

  const current = new Worker(new URL('../workers/sensitivity.worker.ts', import.meta.url), { type: 'module' })
  worker = current
  current.onmessage = (event: MessageEvent<SensitivityResponse>) => {
    const message = event.data
    if (message.id !== requestId) return
    if (message.type === 'progress') {
      progress.value = { done: message.done, total: message.total }
      return
    }
    isRunning.value = false
    stopWorker()
    if (message.type === 'error') {
      errorMessage.value = message.message
      return
    }
    result.value = message.result
    resultSetup.value = { key: runKey, line: runLine }
  }
  current.onerror = () => {
    if (id !== requestId) return
    isRunning.value = false
    errorMessage.value = 'The analysis stopped because of an error.'
    stopWorker()
  }
  current.postMessage(request)
}

function cancel() {
  requestId++
  stopWorker()
  isRunning.value = false
}

onUnmounted(() => {
  requestId++
  stopWorker()
})

const progressText = computed(() => `Testing ${progress.value.done} of ${progress.value.total} variations…`)
const progressPercent = computed(() =>
  progress.value.total > 0 ? Math.round((progress.value.done / progress.value.total) * 100) : 0,
)

const summary = computed(() => (result.value ? summaryRows(result.value.parameters) : []))
const groups: ParameterGroup[] = ['model', 'player']
const groupRows = computed(() =>
  groups.map((group) => ({
    group,
    title: GROUP_TITLES[group],
    rows: result.value ? sensitivityRows(result.value, group) : [],
  })),
)

// --- dialog behaviour ------------------------------------------------------

const dialog = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    title.value?.focus()
  },
)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === title.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  } else if (!dialog.value.contains(active)) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @click.self="emit('close')">
      <div ref="dialog" class="lab" role="dialog" aria-modal="true" aria-labelledby="sensitivity-lab-title"
        aria-describedby="sensitivity-lab-desc" @keydown="onKeydown">
        <header class="lab-header">
          <div>
            <h2 id="sensitivity-lab-title" ref="title" tabindex="-1">How much do the assumptions matter?</h2>
            <p id="sensitivity-lab-desc" class="desc">
              A sandbox: experiments here don't change the app's recommendation.
            </p>
          </div>
          <button type="button" class="close" aria-label="Close" @click="emit('close')">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="lab-body">
          <section class="setup" aria-labelledby="sensitivity-setup-title">
            <div class="setup-heading">
              <h3 id="sensitivity-setup-title">Setup</h3>
              <button type="button" class="secondary" @click="copyCurrentSetup">Copy my current setup</button>
            </div>
            <p class="muted">Always the Detailed model. Each parameter is tested low and high, everything else at
              base.</p>

            <div class="controls">
              <div class="control">
                <span class="label">Hitter level</span>
                <SegmentedControl v-model="hitterLevel" :options="levelOptions" ariaLabel="Hitter level" />
              </div>
              <div class="control">
                <span class="label">Opponent level</span>
                <SegmentedControl v-model="opponentLevel" :options="levelOptions" ariaLabel="Opponent level" />
              </div>
              <div class="control">
                <span class="label">Shot type</span>
                <SegmentedControl v-model="shotType" :options="shotTypeOptions" ariaLabel="Shot type" />
              </div>
              <div class="control">
                <span class="label">Risk</span>
                <SegmentedControl v-model="risk" :options="riskOptions" ariaLabel="Risk" />
              </div>
              <div class="control">
                <span class="label">Shots per target</span>
                <SegmentedControl v-model="shots" :options="shotsOptions" ariaLabel="Shots per target" />
              </div>
              <div class="control">
                <span class="label">Opponent position</span>
                <SegmentedControl v-model="position" :options="positionOptions" ariaLabel="Opponent position" />
              </div>
            </div>

            <div class="run-row">
              <button v-if="!isRunning" type="button" class="run" @click="run">Run</button>
              <button v-else type="button" class="run is-cancel" @click="cancel">Cancel</button>
              <button v-if="isOutOfDate && !isRunning" type="button" class="out-of-date" @click="run">
                Out of date · <span class="again">Run again</span>
              </button>
            </div>

            <div v-if="isRunning" class="progress">
              <div class="bar" role="progressbar" :aria-valuenow="progress.done" aria-valuemin="0"
                :aria-valuemax="progress.total" aria-label="Sensitivity analysis progress">
                <div class="fill" :style="{ width: `${progressPercent}%` }" />
              </div>
            </div>
            <p class="progress-text" aria-live="polite">{{ isRunning ? progressText : '' }}</p>
            <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
          </section>

          <template v-if="result && resultSetup">
            <p class="muted run-line" :class="{ 'is-stale': isOutOfDate }">
              {{ resultSetup.line }}<br>
              Base recommendation: {{ formatAim(result.base) }}, rally win
              <span class="num">{{ formatSensitivityPercent(result.base.pRallyWin) }}</span>
            </p>

            <details class="block" open>
              <summary>How it's calculated</summary>
              <ol class="steps">
                <li v-for="step in CALCULATION_STEPS" :key="step.title" class="step">
                  <h4>{{ step.title }}</h4>
                  <div class="formulas">
                    <code v-for="formula in step.formulas" :key="formula">{{ formula }}</code>
                    <dl class="symbols">
                      <div v-for="[symbol, meaning] in step.symbols" :key="symbol">
                        <dt>{{ symbol }}</dt>
                        <dd>{{ meaning }}</dd>
                      </div>
                    </dl>
                  </div>
                  <p class="explanation">{{ step.explanation }}</p>
                </li>
              </ol>
            </details>

            <details class="block" open>
              <summary>Summary</summary>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Parameter</th>
                      <th scope="col">Changes the advice?</th>
                      <th scope="col" class="num">Largest cost</th>
                      <th scope="col">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in summary" :key="row.id">
                      <th scope="row">{{ row.parameter }}</th>
                      <td>{{ row.changesAdvice }}</td>
                      <td class="num">{{ row.largestCost }}</td>
                      <td><span class="pill" :class="`is-${row.verdict}`">{{ row.verdictLabel }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

            <details v-for="group in groupRows" :key="group.group" class="block" open>
              <summary>{{ group.title }}</summary>
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Parameter</th>
                      <th scope="col" class="num">Value</th>
                      <th scope="col">Recommended aim</th>
                      <th scope="col" class="num">Rally win</th>
                      <th scope="col" class="num">Cost of keeping the base aim</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in group.rows" :key="row.key"
                      :class="{ 'is-base': row.isBase, 'starts-group': row.parameter }">
                      <th scope="row">{{ row.parameter ?? '' }}</th>
                      <td class="num">{{ row.value }}</td>
                      <td>{{ row.aim }}</td>
                      <td class="num">{{ row.rallyWin }}</td>
                      <td class="num">{{ row.cost }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

            <p class="muted legend">{{ VERDICT_LEGEND }}. Cost = how many points of the score you'd lose by keeping the
              base aim under the changed value.</p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use '../styles/breakpoints' as *;

$mono: ui-monospace, SFMono-Regular, Menlo, monospace;

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.4rem;
  background: rgba(0, 0, 0, 0.6);
}

.lab {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 105rem;
  max-height: calc(100vh - 4.8rem);
  border: 1px solid var(--layout-border-color);
  border-radius: var(--border-radius);
  background: var(--layout-bg-color);
  color: var(--text-color-primary);
  box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.5);
}

.lab-header {
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
  padding: 1.6rem 1.6rem 1.2rem;
  border-bottom: 1px solid var(--layout-border-color);

  h2 {
    font-size: 1.6rem;
    font-weight: 500;
    letter-spacing: 0.04em;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 1px solid var(--text-color-secondary);
      outline-offset: 2px;
    }
  }

  .desc {
    margin-top: 0.4rem;
    font-size: 1.2rem;
    color: var(--text-color-secondary);
  }

  .close {
    margin-left: auto;
    padding: 0.4rem;
    border: none;
    background: transparent;
    color: var(--text-color-secondary);
    cursor: pointer;

    svg {
      display: block;
    }

    &:hover {
      color: var(--text-color-primary);
    }
  }
}

.lab-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.6rem 1.6rem calc(1.6rem + var(--badge-clearance));
  scrollbar-width: thin;
  scrollbar-color: #2a3340 transparent;
}

button:focus-visible,
summary:focus-visible {
  outline: 1px solid var(--text-color-secondary);
  outline-offset: 2px;
}

.setup-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;

  h3 {
    font-size: 1.3rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-color-secondary);
  }
}

.muted {
  font-size: 1.2rem;
  color: var(--text-color-secondary);
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
  gap: 0.4rem 1.6rem;
  margin-top: 0.8rem;

  .control {
    margin-top: 0.8rem;
  }

  .label {
    font-size: 1.2rem;
    color: var(--text-color-secondary);
  }

  :deep(.options) {
    margin-top: 0.6rem;
  }
}

.secondary {
  padding: 0.7rem 1.2rem;
  border: 1px solid var(--layout-border-color);
  border-radius: 0.8rem;
  background: var(--checkbox-bg-color);
  color: var(--text-color-primary);
  font: inherit;
  font-size: 1.2rem;
  cursor: pointer;

  &:hover {
    background: #222a33;
  }
}

.run-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.2rem;
  margin-top: 1.6rem;
}

.run {
  min-width: 12rem;
  padding: 1rem 2rem;
  border: none;
  border-radius: 1rem;
  background: var(--green);
  color: #0b1a10;
  font: inherit;
  font-size: 1.4rem;
  font-weight: 700;
  cursor: pointer;

  &.is-cancel {
    background: #2a313c;
    color: var(--text-color-primary);
  }
}

.out-of-date {
  padding: 0.4rem 0;
  border: none;
  background: transparent;
  color: #f2b84b;
  font: inherit;
  font-size: 1.2rem;
  cursor: pointer;

  .again {
    text-decoration: underline;
  }
}

.progress {
  margin-top: 1.2rem;

  .bar {
    height: 0.6rem;
    border-radius: 0.3rem;
    background: var(--options-bg-color);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--green);
    transition: width 0.2s ease;
  }
}

.progress-text {
  min-height: 1.6rem;
  margin-top: 0.6rem;
  font-size: 1.2rem;
  color: var(--text-color-secondary);
}

.error {
  margin-top: 0.6rem;
  font-size: 1.2rem;
  color: var(--red);
}

.run-line {
  line-height: 1.5;

  &.is-stale {
    opacity: 0.6;
  }
}

.block {
  margin-top: 1rem;
  border: 1px solid var(--layout-border-color);
  border-radius: 1rem;
  background: var(--options-bg-color);

  summary {
    padding: 1.5rem 1.2rem;
    font-size: 1.3rem;
    font-weight: 500;
    cursor: pointer;
  }
}

.steps {
  display: grid;
  gap: 1.2rem;
  margin: 0;
  padding: 0 1.2rem 1.2rem;
  list-style: none;
  counter-reset: step;

  .step {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(24rem, 34rem);
    grid-template-areas:
      'title title'
      'formulas explanation';
    gap: 0.4rem 1.6rem;
    padding-top: 1.2rem;
    border-top: 1px solid var(--layout-border-color);
    counter-increment: step;
  }

  h4 {
    grid-area: title;
    font-size: 1.2rem;
    font-weight: 500;

    &::before {
      content: counter(step) '. ';
      color: var(--text-color-secondary);
    }
  }

  .formulas {
    grid-area: formulas;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
    overflow-x: auto;

    code {
      font-family: $mono;
      font-size: 1.45rem;
      line-height: 1.5;
      white-space: pre;
      color: var(--text-color-primary);
    }
  }

  .explanation {
    grid-area: explanation;
    font-size: 1.2rem;
    line-height: 1.5;
    color: var(--text-color-secondary);
  }

  .symbols {
    display: grid;
    gap: 0.1rem;
    margin-top: 0.4rem;
    font-size: 1.05rem;
    line-height: 1.45;
    color: var(--text-color-secondary);

    div {
      display: flex;
      gap: 0.5rem;
    }

    dt {
      flex: none;
      font-family: $mono;
      color: #c5d0d2;

      &::after {
        content: ' –';
        color: var(--text-color-secondary);
      }
    }

    dd {
      margin: 0;
    }
  }
}

.table-scroll {
  overflow-x: auto;
  padding: 0 1.2rem 1.2rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.2rem;

  th,
  td {
    padding: 0.6rem 0.8rem;
    text-align: left;
    white-space: nowrap;
    border-top: 1px solid var(--layout-border-color);
  }

  thead th {
    padding-top: 1rem;
    padding-bottom: 1rem;
    border-top: none;
    font-weight: 500;
    color: var(--text-color-secondary);
  }

  tbody th {
    font-weight: 500;
  }

  .num {
    text-align: right;
    font-family: $mono;
    font-variant-numeric: tabular-nums;
  }

  tbody tr:not(.starts-group) th,
  tbody tr:not(.starts-group) td {
    border-top-color: transparent;
  }

  tr.is-base td {
    font-weight: 700;
    color: var(--text-color-primary);
  }

  tr:not(.is-base) td {
    color: #c5d0d2;
  }
}

.pill {
  display: inline-block;
  padding: 0.2rem 0.8rem;
  border-radius: 99rem;
  font-size: 1.1rem;
  font-weight: 600;

  &.is-small {
    background: var(--verdict-small-bg);
    color: var(--verdict-small-color);
  }

  &.is-noticeable {
    background: var(--verdict-noticeable-bg);
    color: var(--verdict-noticeable-color);
  }

  &.is-large {
    background: var(--verdict-large-bg);
    color: var(--verdict-large-color);
  }
}

.legend {
  margin-top: 1.2rem;
}

.num {
  font-family: $mono;
}

@media (max-width: $layout-wide) {
  .backdrop {
    padding: 0;
  }

  .lab {
    max-width: none;
    height: 100%;
    max-height: none;
    border: none;
    border-radius: 0;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .controls {
    grid-template-columns: 1fr;
  }

  .steps .step {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'title'
      'formulas'
      'explanation';
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress .fill {
    transition: none;
  }
}
</style>
