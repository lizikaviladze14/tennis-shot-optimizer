<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, toRaw } from 'vue'
import TennisCourt from './components/court/TennisCourt.vue'
import LeftSidebar from './components/layout/LeftSidebar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import IconTennisShot from './assets/icons/icon-tennis-shot.vue'
import IconCrosshair from './assets/icons/icon-crosshair.vue'
import IconInfo from './assets/icons/icon-info.vue'
import type { TennisCourtSurface } from '@/types/tennisCourt'
import { DEFAULT_YOU, DEFAULT_OPPONENT } from '@/math/playerPosition'
import type { CourtPoint } from '@/math/point'
import { CENTER_SERVICE_Y_M } from '@/math/courtGeometry'
import { metresPastNet } from '@/math/describeTarget'
import { aimInterception, aimShotSettings, estimateShotOutcome, type ShotScenario } from '@/math/simulation'
import { createBallPath } from '@/animation/ballPath'
import { useShotAnimation } from '@/composables/useShotAnimation'
import { createDraws, mulberry32 } from '@/math/random'
import { SHOT_ACCURACY_PRESETS, type ShotAccuracy, type ShotAccuracyLevel } from '@/types/shotAccuracy'
import { OPPONENT_SKILL_PRESETS, type OpponentSkill, type OpponentSkillLevel } from '@/types/opponentSkill'
import { RISK_PRESETS, type RiskPreference } from '@/types/riskPreference'
import { DEFAULT_SHOT_COUNT, type ShotCount } from '@/types/shotCount'
import CourtControls from './components/court/CourtControls.vue'
import type { AimResult } from '@/math/optimizer'
import type { StandardDraw } from '@/math/random'
import { GRID_CELLS } from '@/math/modelConstants'
import { highestWinResult, safestResult, type WinMetric } from '@/math/analytics'
import type { ShownShot } from '@/types/shownShot'
import { simulatedLandings, landingCounts } from '@/math/analytics'
import ModelAnalytics from './components/ModelAnalytics.vue'
import SegmentedControl from '@/components/base/SegmentedControl.vue'
import { SHOT_TYPE_PROFILES, type ShotType } from '@/types/shotTypes'
import type { ModelLevel } from '@/types/modelLevel'
import { buildScenario } from '@/analysis/scenario'

const surface = ref<TennisCourtSurface>('hard')
const shotAccuracy = ref<ShotAccuracy>({
  level: 'advanced',
  ...SHOT_ACCURACY_PRESETS.advanced,
})

const showDispersion = ref(true)
const showTrajectory = ref(true)
const showHeatmap = ref(false)
const showLandings = ref(false)

const modelLevel = ref<ModelLevel>('detailed')
const shotType = ref<ShotType>('drive')
const modelLevelOptions: { id: ModelLevel; label: string }[] = [
  { id: 'simple', label: 'Simple' },
  { id: 'detailed', label: 'Detailed' },
]

function selectAccuracy(level: ShotAccuracyLevel) {
  shotAccuracy.value = { level, ...SHOT_ACCURACY_PRESETS[level] }
}

function setSideError(sideErrorM: number) {
  shotAccuracy.value = { ...shotAccuracy.value, sideErrorM }
}

function setDepthError(depthErrorM: number) {
  shotAccuracy.value = { ...shotAccuracy.value, depthErrorM }
}

function setBallSpeed(ballSpeedMps: number) {
  shotAccuracy.value = { ...shotAccuracy.value, ballSpeedMps }
}

const opponentSkill = ref<OpponentSkill>({
  level: 'advanced',
  ...OPPONENT_SKILL_PRESETS.advanced,
})

function selectOpponentSkill(level: OpponentSkillLevel) {
  opponentSkill.value = { level, ...OPPONENT_SKILL_PRESETS[level] }
}

function setRunSpeed(runSpeedMps: number) {
  opponentSkill.value = { ...opponentSkill.value, runSpeedMps }
}

function setConsistency(consistency: number) {
  opponentSkill.value = { ...opponentSkill.value, consistency }
}

const riskPreference = ref<RiskPreference>('balanced')

const you = ref<CourtPoint>({ ...DEFAULT_YOU })
const opponent = ref<CourtPoint>({ ...DEFAULT_OPPONENT })
const target = ref<CourtPoint>({ x: 18, y: CENTER_SERVICE_Y_M })

const DRAWS_SEED = 42
const shotsPerTarget = ref<ShotCount>(DEFAULT_SHOT_COUNT)
const draws = computed(() => createDraws(shotsPerTarget.value, mulberry32(DRAWS_SEED)))

const builtScenario = computed(() =>
  buildScenario({
    modelLevel: modelLevel.value,
    shotType: shotType.value,
    shot: shotAccuracy.value,
    opponentSkill: opponentSkill.value,
    hitter: you.value,
    opponent: opponent.value,
  }),
)
const scenario = computed<ShotScenario>(() => builtScenario.value.scenario)
const effectiveShot = computed(() => scenario.value.shot)
const pastNetRange = computed(() => builtScenario.value.pastNetRange)

/** Plain snapshot for the "Test assumptions" dialog's "Copy my current setup". */
const labSetup = computed(() => ({
  hitterLevel: shotAccuracy.value.level,
  opponentLevel: opponentSkill.value.level,
  shotType: shotType.value,
  risk: riskPreference.value,
  shotsPerTarget: shotsPerTarget.value,
  hitter: { x: you.value.x, y: you.value.y },
  opponent: { x: opponent.value.x, y: opponent.value.y },
}))

const outcome = computed(() => estimateShotOutcome(scenario.value, target.value, draws.value))

const targetInterception = computed(() => aimInterception(scenario.value, target.value))

const riskWeight = computed(() => RISK_PRESETS[riskPreference.value].riskWeight)
const recommendation = ref<{ best: AimResult; results: AimResult[]; scenario: ShotScenario } | null>(null)
const appliedDraws = ref<StandardDraw[]>([])
const isStale = ref(false)
const shownShot = ref<ShownShot>('target')

const winMetric = computed((): WinMetric => (modelLevel.value === 'detailed' ? 'pRallyWin' : 'pWin'))

const safest = computed(() =>
  recommendation.value ? safestResult(recommendation.value.results, winMetric.value) : null,
)
const highestWin = computed(() =>
  recommendation.value ? highestWinResult(recommendation.value.results, winMetric.value) : null,
)

const highestWinLabel = computed(() =>
  modelLevel.value === 'detailed' ? 'Highest rally win' : 'Highest win chance',
)

const alternative = computed(() => {
  const shot = shownShot.value
  if (shot === 'safest' && safest.value) return { aim: safest.value.aim, label: 'Safest shot' }
  if (shot === 'highestWin' && highestWin.value) return { aim: highestWin.value.aim, label: highestWinLabel.value }
  return null
})

const courtShot = computed(() => {
  if (shownShot.value === 'recommended') return 'recommended'
  if (alternative.value) return 'alternative'
  return 'target'
})

const { ballState, isPlaying, progress, bouncePoint, play, stop } = useShotAnimation()
const playerDragging = ref(false)

const shownAim = computed(() => {
  if (shownShot.value === 'recommended' && recommendation.value) return recommendation.value.best.aim
  if (alternative.value) return alternative.value.aim
  return target.value
})

let settingsReplayTimer: ReturnType<typeof setTimeout> | null = null

function playShownShot() {
  if (playerDragging.value) return
  const aim = shownAim.value
  if (!aim) return
  if (shownShot.value === 'recommended' && isStale.value) return
  const saved = shownShot.value !== 'target' ? recommendation.value?.scenario : undefined
  const settings = saved ?? scenario.value
  const from = saved?.hitter ?? you.value
  const { ballSpeedMps, bounce: shotBounce } = aimShotSettings(settings, aim)
  play(createBallPath(from, aim, ballSpeedMps, shotBounce))
}

function onDragStart() {
  playerDragging.value = true
}

function onDragEnd() {
  playerDragging.value = false
  if (shownShot.value === 'target') playShownShot()
}

const recommendedLandings = computed(() => {
  const saved = recommendation.value
  if (!saved) return []
  return simulatedLandings(saved.scenario.hitter, saved.best.aim, saved.scenario.shot, appliedDraws.value)
})

const recommendedLandingCounts = computed(() => landingCounts(recommendedLandings.value))

// an alternative that is the recommended aim is shown as the recommended shot
function showOnCourt(shot: ShownShot) {
  const best = recommendation.value?.best
  const isRecommended =
    (shot === 'safest' && safest.value === best) || (shot === 'highestWin' && highestWin.value === best)
  shownShot.value = isRecommended ? 'recommended' : shot
  if (!(isStale.value && shot !== 'target')) playShownShot()
}

const recommendedInterception = computed(() =>
  recommendation.value ? aimInterception(scenario.value, recommendation.value.best.aim) : undefined,
)

const candidateCount = computed(() => recommendation.value?.results.length ?? GRID_CELLS * GRID_CELLS)

const targetRangeNote = computed(() => {
  if (modelLevel.value !== 'detailed') return undefined
  const profile = SHOT_TYPE_PROFILES[shotType.value]
  const pastNet = metresPastNet(target.value)
  if (pastNet < profile.minPastNetM || pastNet > profile.maxPastNetM) {
    return `Outside the usual range for a ${profile.label}.`
  }
  return undefined
})

const MIN_CALCULATING_MS = 350
const RECOMMENDED_GLIDE_MS = 400
const isCalculating = ref(false)
const computeTimeMs = ref<number | null>(null)

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Set while a discrete choice is flushing, so that change is not marked stale. */
let autoRecalc = false

type OptimizerResult = { best: AimResult; results: AimResult[] }

let worker: Worker | null = null
let requestId = 0
let rejectActive: ((reason: unknown) => void) | null = null
let shotAfterGlide: ReturnType<typeof setTimeout> | null = null

function toPlain<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value
  const raw = toRaw(value as object) as T
  if (Array.isArray(raw)) return raw.map((item) => toPlain(item)) as T
  const copy: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(raw as object)) copy[key] = toPlain(item)
  return copy as T
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clearShotAfterGlide() {
  if (shotAfterGlide !== null) {
    clearTimeout(shotAfterGlide)
    shotAfterGlide = null
  }
}

function playAfterGlide(hadAim: boolean) {
  clearShotAfterGlide()
  if (!hadAim || prefersReducedMotion()) {
    playShownShot()
    return
  }
  shotAfterGlide = setTimeout(() => {
    shotAfterGlide = null
    if (shownShot.value === 'recommended') playShownShot()
  }, RECOMMENDED_GLIDE_MS)
}

/** Latest request wins: a newer call cancels the search still running. */
function runFindBestAim(input: {
  scenario: ShotScenario
  draws: StandardDraw[]
  riskWeight: number
  cellCount: number
  pastNetRange?: { min: number; max: number }
}): Promise<OptimizerResult> {
  rejectActive?.(new Error('superseded'))
  rejectActive = null
  worker?.terminate()
  const current = new Worker(new URL('./workers/optimizer.worker.ts', import.meta.url), { type: 'module' })
  worker = current
  const id = ++requestId
  return new Promise((resolve, reject) => {
    rejectActive = reject
    const finish = (settle: () => void) => {
      if (rejectActive === reject) rejectActive = null
      current.onmessage = null
      current.onerror = null
      settle()
    }
    current.onmessage = (event: MessageEvent<{ id: number; result: OptimizerResult }>) => {
      if (event.data.id !== id) return
      finish(() => resolve(event.data.result))
    }
    current.onerror = () => {
      finish(() => reject(new Error('optimizer worker failed')))
    }
    current.postMessage({ id, ...input })
  })
}

function continuousKey() {
  const current = scenario.value
  return JSON.stringify({
    hitter: current.hitter,
    opponent: current.opponent,
    sideErrorM: current.shot.sideErrorM,
    depthErrorM: current.shot.depthErrorM,
    ballSpeedMps: current.shot.ballSpeedMps,
    runSpeedMps: current.opponentSkill.runSpeedMps,
    consistency: current.opponentSkill.consistency,
  })
}

async function calculateRecommendation(options?: { manual?: boolean }) {
  const manual = options?.manual === true
  clearShotAfterGlide()
  isCalculating.value = true
  const startedAt = performance.now()
  const scenarioSnapshot = toPlain(scenario.value)
  const drawsSnapshot = toPlain(draws.value)
  const inputsKey = continuousKey()
  const searchStarted = performance.now()
  const pending = runFindBestAim({
    scenario: scenarioSnapshot,
    draws: drawsSnapshot,
    riskWeight: riskWeight.value,
    cellCount: GRID_CELLS,
    pastNetRange: pastNetRange.value ? toPlain(pastNetRange.value) : undefined,
  })
  const id = requestId
  let result: OptimizerResult
  try {
    result = await pending
  } catch {
    if (id !== requestId) return
    isCalculating.value = false
    return
  }
  if (id !== requestId) return
  computeTimeMs.value = Math.round(performance.now() - searchStarted)
  await wait(Math.max(0, MIN_CALCULATING_MS - (performance.now() - startedAt)))
  if (id !== requestId) return

  const hadAim = recommendation.value !== null
  recommendation.value = { best: result.best, results: result.results, scenario: scenarioSnapshot }
  appliedDraws.value = drawsSnapshot
  isCalculating.value = false
  if (continuousKey() !== inputsKey) {
    isStale.value = true
    return
  }
  isStale.value = false
  if (manual) shownShot.value = 'recommended'
  if (manual || shownShot.value === 'recommended') {
    await nextTick()
    if (id !== requestId) return
    playAfterGlide(hadAim)
  }
}

function resetPositions() {
  you.value = { ...DEFAULT_YOU }
  opponent.value = { ...DEFAULT_OPPONENT }
}

watch(
  () => [
    modelLevel.value,
    shotType.value,
    shotAccuracy.value.level,
    opponentSkill.value.level,
    riskPreference.value,
    shotsPerTarget.value,
  ],
  () => {
    autoRecalc = true
    queueMicrotask(() => {
      autoRecalc = false
    })
    void calculateRecommendation({ manual: false })
  },
)

watch(scenario, () => {
  if (autoRecalc) return
  isStale.value = true
}, { deep: true })

watch(target, () => {
  shownShot.value = 'target'
  playShownShot()
})

// Sliders, level, shot type, model level and opponent settings: replay your
// target once the controls have settled. Player drags replay on pointerup.
watch([shotAccuracy, opponentSkill, modelLevel, shotType], () => {
  if (shownShot.value !== 'target') return
  if (settingsReplayTimer !== null) clearTimeout(settingsReplayTimer)
  settingsReplayTimer = setTimeout(() => {
    settingsReplayTimer = null
    if (shownShot.value === 'target') playShownShot()
  }, 400)
}, { deep: true })

const NARROW_QUERY = '(max-width: 70em)'
const setupOpen = ref(false)
const isNarrow = ref(typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches)
const menuButton = ref<HTMLButtonElement | null>(null)
const doneButton = ref<HTMLButtonElement | null>(null)
const analyticsPanel = ref<{ revealExplainer: () => void } | null>(null)
let narrowQuery: MediaQueryList | null = null

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const setupSummary = computed(() => {
  const spread = `${shotAccuracy.value.sideErrorM.toFixed(1)}/${shotAccuracy.value.depthErrorM.toFixed(1)} m`
  const parts = [capitalize(surface.value), capitalize(shotAccuracy.value.level)]
  if (modelLevel.value === 'detailed') parts.push(SHOT_TYPE_PROFILES[shotType.value].label)
  parts.push(spread, RISK_PRESETS[riskPreference.value].label)
  return parts.join(' · ')
})

function syncNarrow() {
  isNarrow.value = Boolean(narrowQuery?.matches)
  if (!isNarrow.value) setupOpen.value = false
}

async function openSetup() {
  setupOpen.value = true
  await nextTick()
  doneButton.value?.focus()
}

function closeSetup() {
  setupOpen.value = false
  menuButton.value?.focus()
}

function calculateFromSetup() {
  closeSetup()
  calculateRecommendation({ manual: true })
}

function showHowItWorks() {
  analyticsPanel.value?.revealExplainer()
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && setupOpen.value) closeSetup()
}

onMounted(() => {
  narrowQuery = window.matchMedia(NARROW_QUERY)
  syncNarrow()
  narrowQuery.addEventListener('change', syncNarrow)
  window.addEventListener('keydown', onWindowKeydown)
  calculateRecommendation({ manual: true })
})

onUnmounted(() => {
  if (settingsReplayTimer !== null) clearTimeout(settingsReplayTimer)
  clearShotAfterGlide()
  requestId += 1
  rejectActive?.(new Error('superseded'))
  rejectActive = null
  worker?.terminate()
  worker = null
  narrowQuery?.removeEventListener('change', syncNarrow)
  window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <div class="layout" :class="{ 'is-setup-open': setupOpen }">
    <header class="app-header">
      <div class="brand">
        <IconTennisShot class="brand-icon" />
        <div class="brand-text">
          <h1>
            <span class="title-full">Tennis Shot Optimizer</span>
            <span class="title-short">Shot Optimizer</span>
          </h1>
          <p class="tagline">Place both players, set your accuracy — the model finds where to aim.</p>
        </div>
      </div>
      <div class="header-actions">
        <SegmentedControl v-if="!isNarrow" class="model-level" :options="modelLevelOptions" :model-value="modelLevel"
          ariaLabel="Model level" @update:model-value="modelLevel = $event" />
        <p class="disclaimer">
          <span class="disclaimer-dot" aria-hidden="true" />
          Model estimates · illustrative values
        </p>
        <button type="button" class="how-it-works" @click="showHowItWorks">
          <IconInfo />
          How it works
        </button>
        <button ref="menuButton" type="button" class="menu" aria-label="Open setup" :aria-expanded="setupOpen"
          aria-controls="setup-panel" @click="openSetup">
          <span class="menu-line" aria-hidden="true" />
          <span class="menu-line short" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div class="setup-summary">
      <p>{{ setupSummary }}</p>
      <button type="button" class="edit" @click="openSetup">Edit</button>
    </div>

    <div id="setup-panel" class="setup-panel" :class="{ 'is-open': setupOpen }" :role="isNarrow ? 'dialog' : undefined"
      :aria-modal="isNarrow ? setupOpen : undefined" :aria-labelledby="isNarrow ? 'setup-title' : undefined"
      :inert="isNarrow && !setupOpen">
      <div class="setup-toolbar">
        <h2 id="setup-title">Setup</h2>
        <button ref="doneButton" type="button" class="done" @click="closeSetup">Done</button>
      </div>
      <div v-if="isNarrow" class="setup-model-level">
        <SegmentedControl :options="modelLevelOptions" :model-value="modelLevel" ariaLabel="Model level"
          @update:model-value="modelLevel = $event" />
      </div>
      <LeftSidebar :surface="surface" :you="you" :opponent="opponent" :shot-accuracy="shotAccuracy"
        :opponent-skill="opponentSkill" :model-level="modelLevel" :shot-type="shotType" :effective-shot="effectiveShot"
        @select-surface="surface = $event" @reset-positions="resetPositions" @select-accuracy="selectAccuracy"
        @update-side-error="setSideError" @update-depth-error="setDepthError" @update-ball-speed="setBallSpeed"
        @select-opponent-skill="selectOpponentSkill" @update-run-speed="setRunSpeed"
        @update-consistency="setConsistency" @select-shot-type="shotType = $event" :risk-preference="riskPreference"
        @select-risk-preference="riskPreference = $event" :shot-count="shotsPerTarget"
        @select-shot-count="shotsPerTarget = $event" />
      <div class="setup-footer">
        <button type="button" class="calculate" :class="{ 'is-loading': isCalculating }" :disabled="isCalculating"
          :aria-busy="isCalculating" @click="calculateFromSetup">
          <span v-if="isCalculating">Simulating {{ shotsPerTarget }} shots…</span>
          <template v-else>
            <IconCrosshair />
            <span>Calculate optimal shot</span>
          </template>
        </button>
      </div>
    </div>

    <main>
      <div class="center-pane">
        <div class="court-wrapper">
          <div class="heading">
            <h2>Court</h2>
            <span v-if="isCalculating" class="status is-calculating" aria-live="polite">
              <span class="status-dot" aria-hidden="true" />
              Finding the best shot…
            </span>
            <button v-else-if="isStale" type="button" class="status is-stale"
              @click="calculateRecommendation({ manual: true })">
              <span class="status-dot" aria-hidden="true" />
              Inputs changed · <span class="recalculate">Recalculate</span>
            </button>
            <span v-else class="status">
              <span class="status-dot" aria-hidden="true" />
              Results up to date
            </span>
            <p class="hint">Click anywhere on your opponent's side to test your own target.</p>
          </div>
          <TennisCourt :surface="surface" :shot-accuracy="effectiveShot" :you="you" :opponent="opponent"
            v-model:target="target" :show-dispersion="showDispersion" :show-trajectory="showTrajectory"
            :show-heatmap="showHeatmap" :show-landings="showLandings" @update:you="you = $event"
            @update:opponent="opponent = $event" :recommended-aim="recommendation?.best.aim"
            :recommended-shot="recommendation?.scenario.shot" :recommended-hitter="recommendation?.scenario.hitter"
            :is-stale="isStale" :shown-shot="courtShot" :alternative-aim="alternative?.aim"
            :alternative-label="alternative?.label" :aim-results="recommendation?.results"
            :simulated-landings="recommendedLandings" :vertical="isNarrow" :ball-state="ballState"
            :bounce-point="bouncePoint" :is-calculating="isCalculating" @drag-start="onDragStart"
            @drag-end="onDragEnd" />
          <CourtControls v-model:show-dispersion="showDispersion" v-model:show-trajectory="showTrajectory"
            v-model:show-heatmap="showHeatmap" v-model:show-landings="showLandings" :is-playing="isPlaying"
            :progress="progress" @play="playShownShot" @stop="stop" />
        </div>
        <ModelAnalytics ref="analyticsPanel" :recommended-landings="recommendedLandings"
          :recommended-landing-counts="recommendedLandingCounts" :results="recommendation?.results ?? []"
          :recommended-aim="recommendation?.best.aim" :opponent="recommendation?.scenario.opponent ?? opponent"
          :shots-per-target="shotsPerTarget" :candidate-count="candidateCount"
          :recommended-outcome="recommendation?.best.outcome" :compute-time-ms="computeTimeMs" :grid-cells="GRID_CELLS"
          :draws-count="shotsPerTarget" :show-rally-win="modelLevel === 'detailed'" :model-level="modelLevel"
          :shot-label="SHOT_TYPE_PROFILES[shotType].label" :is-stale="isStale" :app-setup="labSetup" />
      </div>
      <RightSidebar :aim="target" :opponent="opponent" :outcome="outcome" :interception="targetInterception"
        :recommended="recommendation?.best ?? null" :recommended-interception="recommendedInterception"
        :candidate-count="candidateCount" :shots-per-target="shotsPerTarget" :is-calculating="isCalculating"
        :range-note="targetRangeNote" :shown-shot="shownShot" :safest="safest" :highest-win="highestWin"
        :is-stale="isStale" :results="recommendation?.results ?? []" :show-rally-win="modelLevel === 'detailed'"
        @calculate="calculateRecommendation({ manual: true })" @show-on-court="showOnCourt" />
    </main>
  </div>
</template>

<style scoped lang="scss">
@use './styles/breakpoints' as *;

.layout {
  display: grid;
  grid-template-columns: 27rem minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1.6rem;
  height: 100vh;
  padding: 0 1.6rem 1.6rem;
  overflow: hidden;
}

.setup-summary,
.setup-toolbar,
.setup-footer {
  display: none;
}

.app-header {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 1.6rem;
  margin: 0 -1.6rem;
  padding: 1.2rem 2.4rem;
  border-bottom: 1px solid var(--layout-border-color);
  background: var(--layout-bg-color);

  .brand {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    min-width: 0;

    .brand-icon {
      display: block;
      width: 3.4rem;
      height: 3.4rem;
      flex: none;
    }

    .title-short {
      display: none;
    }

    h1 {
      font-size: 1.6rem;
      font-weight: 650;
    }

    .tagline {
      margin-top: 0.25rem;
      color: var(--text-color-secondary);
      font-size: 1.2rem;
      line-height: 1.35;
    }
  }

  .header-actions {
    display: flex;
    flex: none;
    align-items: center;
    gap: 1rem;

    .model-level {
      margin-top: 0;
    }
  }

  .disclaimer {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.6rem 1.2rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 99rem;
    background: var(--options-bg-color);
    color: var(--text-color-secondary);
    font-size: 1.2rem;
    white-space: nowrap;

    .disclaimer-dot {
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 50%;
      background: #f2b84b;
    }
  }

  .how-it-works {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.6rem 1.2rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 99rem;
    background: var(--options-bg-color);
    color: var(--text-color-primary);
    font: inherit;
    font-size: 1.3rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      background: #1a2027;
    }

    &:focus-visible {
      outline: 1px solid var(--text-color-secondary);
      outline-offset: 2px;
    }
  }

  .menu {
    display: none;
  }
}

.setup-panel {
  display: contents;
}

main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30rem;
  gap: 1.6rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.center-pane {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #2a3340 transparent;
}

.court-wrapper {
  background-color: var(--layout-bg-color);
  border: 1px solid var(--layout-border-color);
  border-radius: var(--border-radius);
  padding: 1.6rem;

  .heading {
    display: flex;
    align-items: center;
    margin-bottom: 1.2rem;

    h2 {
      font-size: 1.4rem;
      font-weight: 500;
      color: var(--text-color-primary);
      letter-spacing: 0.12em;
    }

    .status {
      --status-color: var(--green);

      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      margin-left: 1.2rem;
      padding: 0.3rem 0.9rem;
      border: 1px solid var(--layout-border-color);
      border-radius: 99rem;
      background: var(--options-bg-color);
      color: var(--text-color-secondary);
      font: inherit;
      font-size: 1.1rem;

      &.is-stale {
        --status-color: #f2b84b;
        cursor: pointer;

        .recalculate {
          color: var(--green);
        }

        &:hover .recalculate {
          text-decoration: underline;
        }
      }

      .status-dot {
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 50%;
        background: var(--status-color);
      }

      &.is-calculating .status-dot {
        animation: status-pulse 1.2s ease-in-out infinite;
      }
    }

    .hint {
      font-size: 1.1rem;
      color: var(--text-color-secondary);
      margin-left: auto;
    }
  }
}

@media (max-width: $layout-wide) {
  .layout {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100dvh;
    padding: 0;
  }

  .app-header {
    flex: none;
    margin: 0;
    padding: calc(1rem + env(safe-area-inset-top)) 1.4rem 1rem;
    border-bottom: none;
    background: var(--site-bg-color);

    .brand {
      gap: 0.8rem;

      .brand-icon {
        width: 3.2rem;
        height: 3.2rem;
      }

      .title-full {
        display: none;
      }

      .title-short {
        display: inline;
      }

      .tagline {
        display: none;
      }
    }

    .disclaimer,
    .how-it-works {
      display: none;
    }

    .menu {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 0.5rem;
      width: 4.4rem;
      height: 4.4rem;
      padding: 0 0.9rem;
      border: 1px solid var(--layout-border-color);
      border-radius: 1rem;
      background: var(--layout-bg-color);
      cursor: pointer;

      .menu-line {
        display: block;
        width: 1.6rem;
        height: 0.15rem;
        border-radius: 1rem;
        background: var(--text-color-primary);

        &.short {
          width: 1.1rem;
        }
      }

      &:focus-visible {
        outline: 1px solid var(--text-color-secondary);
        outline-offset: 2px;
      }
    }
  }

  .setup-summary {
    display: flex;
    flex: none;
    align-items: center;
    gap: 1rem;
    margin: 0 1.4rem 1.2rem;
    padding: 0.8rem 1.2rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 1rem;
    background: var(--layout-bg-color);

    p {
      flex: 1;
      min-width: 0;
      color: var(--text-color-secondary);
      font-size: 1.2rem;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .edit {
      flex: none;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--green);
      font: inherit;
      font-size: 1.3rem;
      font-weight: 600;
      cursor: pointer;

      &:focus-visible {
        outline: 1px solid var(--text-color-secondary);
        outline-offset: 2px;
      }
    }
  }

  .setup-panel {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 0;
    z-index: 40;
    width: auto;
    background: var(--site-bg-color);
    transform: translateX(-100%);
    visibility: hidden;
    pointer-events: none;
    overscroll-behavior: contain;
    transition: transform 0.2s ease, visibility 0.2s ease;

    &.is-open {
      transform: none;
      visibility: visible;
      pointer-events: auto;
    }

    :deep(.left-sidebar) {
      flex: 1;
      width: 100%;
      min-height: 0;
      border: none;
      border-radius: 0;
      background: var(--layout-bg-color);
    }
  }

  .setup-model-level {
    flex: none;
    padding: 1.2rem 1.6rem 0;
    background: var(--layout-bg-color);

    :deep(.options) {
      margin-top: 0;
    }
  }

  .setup-toolbar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    padding: calc(1.2rem + env(safe-area-inset-top)) 1.6rem 1.2rem;
    border-bottom: 1px solid var(--layout-border-color);
    background: var(--layout-bg-color);

    h2 {
      font-size: 1.8rem;
      font-weight: 650;
    }

    .done {
      padding: 0 0.4rem;
      border: none;
      background: transparent;
      color: var(--text-color-primary);
      font: inherit;
      font-size: 1.5rem;
      font-weight: 600;
      cursor: pointer;

      &:focus-visible {
        outline: 1px solid var(--text-color-secondary);
        outline-offset: 2px;
      }
    }
  }

  .setup-footer {
    display: block;
    flex: none;
    padding: 1.2rem 1.6rem calc(1.2rem + var(--badge-clearance) + env(safe-area-inset-bottom));
    border-top: 1px solid var(--layout-border-color);
    background: var(--layout-bg-color);
  }

  .calculate {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    width: 100%;
    padding: 1.3rem 1.6rem;
    border: none;
    border-radius: 1rem;
    background: var(--green);
    color: #0b1a10;
    font: inherit;
    font-size: 1.5rem;
    font-weight: 700;
    cursor: pointer;

    &:focus-visible {
      outline: 1px solid var(--text-color-secondary);
      outline-offset: 2px;
    }

    &.is-loading {
      background: #233a2b;
      color: #8fe0a8;
      cursor: progress;
    }
  }

  main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    padding: 0 1.4rem calc(1.6rem + var(--badge-clearance) + env(safe-area-inset-bottom));
    scrollbar-width: thin;
    scrollbar-color: #2a3340 transparent;
  }

  .center-pane {
    display: contents;
    overflow: visible;
  }

  .court-wrapper {
    order: 1;
    padding: 1.2rem;

    .heading {
      display: none;
    }
  }

  :deep(.right-sidebar) {
    order: 2;
    width: 100%;
    margin-top: 1.2rem;
    overflow: visible;
  }

  :deep(.model-analytics) {
    order: 3;
    margin-top: 1.2rem;
  }
}

@keyframes status-pulse {
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .setup-panel {
    transition: none;
  }

  .status.is-calculating .status-dot {
    animation: none;
  }
}
</style>
