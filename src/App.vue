<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import TennisCourt from './components/court/TennisCourt.vue'
import LeftSidebar from './components/layout/LeftSidebar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import type { TennisCourtSurface } from '@/types/tennisCourt'
import { DEFAULT_YOU, DEFAULT_OPPONENT } from '@/math/playerPosition'
import type { CourtPoint } from '@/math/point'
import { CENTER_SERVICE_Y_M } from '@/math/courtGeometry'
import { estimateShotOutcome, type ShotScenario } from '@/math/simulation'
import { opponentCoverage } from '@/math/opponent'
import { createDraws, mulberry32 } from '@/math/random'
import { SHOT_ACCURACY_PRESETS, type ShotAccuracy, type ShotAccuracyLevel } from '@/types/shotAccuracy'
import { OPPONENT_SKILL_PRESETS, type OpponentSkill, type OpponentSkillLevel } from '@/types/opponentSkill'
import { RISK_PRESETS, type RiskPreference } from '@/types/riskPreference'
import CourtControls from './components/court/CourtControls.vue'
import { findBestAim, type AimResult } from '@/math/optimizer'
import { GRID_CELLS } from '@/math/modelConstants'

const surface = ref<TennisCourtSurface>('hard')
const shotAccuracy = ref<ShotAccuracy>({
  level: 'advanced',
  ...SHOT_ACCURACY_PRESETS.advanced,
})

const showDispersion = ref(true)
const showTrajectory = ref(true)
const showHeatmap = ref(false)
const showLandings = ref(false)

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
const DRAWS_COUNT = 500
const draws = createDraws(DRAWS_COUNT, mulberry32(DRAWS_SEED))

const scenario = computed<ShotScenario>(() => ({
  hitter: you.value,
  opponent: opponent.value,
  shot: shotAccuracy.value,
  opponentSkill: opponentSkill.value,
}))

const outcome = computed(() => estimateShotOutcome(scenario.value, target.value, draws))

const coverage = computed(() =>
  opponentCoverage(you.value, target.value, shotAccuracy.value.ballSpeedMps, opponentSkill.value.runSpeedMps),
)

const riskWeight = computed(() => RISK_PRESETS[riskPreference.value].riskWeight)
const recommendation = ref<{ best: AimResult, results: AimResult[] } | null>(null)
const isStale = ref(false)
const showRecommendedShot = ref(false)

const recommendedCoverage = computed(() =>
  recommendation.value
    ? opponentCoverage(
      you.value,
      recommendation.value.best.aim,
      shotAccuracy.value.ballSpeedMps,
      opponentSkill.value.runSpeedMps,
    )
    : undefined,
)

const MIN_LOADER_MS = 400
const isCalculating = ref(false)

function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve)))
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function calculateRecommendation() {
  if (isCalculating.value) return
  isCalculating.value = true
  const startedAt = performance.now()

  // findBestAim blocks the main thread, so let the loader paint first
  await nextPaint()

  console.time('findBestAim')
  const result = findBestAim(scenario.value, draws, riskWeight.value, GRID_CELLS)
  console.timeEnd('findBestAim')

  await wait(MIN_LOADER_MS - (performance.now() - startedAt))

  recommendation.value = result
  isStale.value = false
  showRecommendedShot.value = true
  isCalculating.value = false
}

function resetPositions() {
  you.value = { ...DEFAULT_YOU }
  opponent.value = { ...DEFAULT_OPPONENT }
}

watch([scenario, riskPreference], () => {
  isStale.value = true
}, { deep: true })

watch(target, () => {
  showRecommendedShot.value = false
})

onMounted(() => {
  calculateRecommendation()
})
</script>

<template>
  <div class="layout">
    <LeftSidebar :surface="surface" :you="you" :opponent="opponent" :shot-accuracy="shotAccuracy"
      :opponent-skill="opponentSkill" @select-surface="surface = $event" @reset-positions="resetPositions"
      @select-accuracy="selectAccuracy" @update-side-error="setSideError" @update-depth-error="setDepthError"
      @update-ball-speed="setBallSpeed" @select-opponent-skill="selectOpponentSkill" @update-run-speed="setRunSpeed"
      @update-consistency="setConsistency" :risk-preference="riskPreference"
      @select-risk-preference="riskPreference = $event" />
    <main>
      <div class="court-wrapper">
        <div class="heading">
          <h2>Court</h2>
          <span class="status" :class="{ 'is-stale': isStale }">
            <span class="status-dot" aria-hidden="true" />
            {{ isStale ? 'Inputs changed: recalculate' : 'Results up to date' }}
          </span>
          <p class="hint">Click anywhere on your opponent's side to test your own target.</p>
        </div>
        <TennisCourt :surface="surface" :shot-accuracy="shotAccuracy" :you="you" :opponent="opponent"
          v-model:target="target" :show-dispersion="showDispersion" :show-trajectory="showTrajectory"
          :show-heatmap="showHeatmap" :show-landings="showLandings" @update:you="you = $event"
          @update:opponent="opponent = $event" :recommended-aim="recommendation?.best.aim" :is-stale="isStale"
          :show-recommended-shot="showRecommendedShot" :aim-results="recommendation?.results" />
        <CourtControls v-model:show-dispersion="showDispersion" v-model:show-trajectory="showTrajectory"
          v-model:show-heatmap="showHeatmap" v-model:show-landings="showLandings" />
      </div>
    </main>
    <RightSidebar :aim="target" :opponent="opponent" :outcome="outcome" :coverage-m="coverage"
      :recommended="recommendation?.best ?? null" :recommended-coverage-m="recommendedCoverage"
      :candidate-count="GRID_CELLS * GRID_CELLS" :shots-per-target="DRAWS_COUNT" :is-calculating="isCalculating"
      :show-recommended-shot="showRecommendedShot" @calculate="calculateRecommendation"
      @show-on-court="showRecommendedShot = $event === 'recommended'" />
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  gap: 1.6rem;
  height: 100vh;
  padding: 1.6rem;
  overflow: hidden;
}

main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #2a3340 transparent;

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
        --status-color: #6fd08c;

        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        margin-left: 1.2rem;
        padding: 0.3rem 0.9rem;
        border: 1px solid var(--layout-border-color);
        border-radius: 99rem;
        background: var(--options-bg-color);
        color: var(--text-color-secondary);
        font-size: 1.1rem;

        &.is-stale {
          --status-color: #f2b84b;
        }

        .status-dot {
          width: 0.7rem;
          height: 0.7rem;
          border-radius: 50%;
          background: var(--status-color);
        }
      }

      .hint {
        font-size: 1.1rem;
        color: var(--text-color-secondary);
        margin-left: auto;
      }
    }
  }
}
</style>
