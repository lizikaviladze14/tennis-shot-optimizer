<script setup lang="ts">
import { ref, computed } from 'vue'
import TennisCourt from './components/court/TennisCourt.vue'
import LeftSidebar from './components/layout/LeftSidebar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import type { TennisCourtSurface } from '@/types/tennisCourt'
import { DEFAULT_YOU, DEFAULT_OPPONENT } from '@/math/playerPosition'
import type { CourtPoint } from '@/math/point'
import { CENTER_SERVICE_Y_M } from '@/math/courtGeometry'
import { estimateInProbability } from '@/math/simulation'
import { createDraws, mulberry32 } from '@/math/random'
import { SHOT_ACCURACY_PRESETS, type ShotAccuracy, type ShotAccuracyLevel } from '@/types/shotAccuracy'
import { OPPONENT_SKILL_PRESETS, type OpponentSkill, type OpponentSkillLevel } from '@/types/opponentSkill'
import CourtControls from './components/court/CourtControls.vue'

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

const you = ref<CourtPoint>({ ...DEFAULT_YOU })
const opponent = ref<CourtPoint>({ ...DEFAULT_OPPONENT })
const target = ref<CourtPoint>({ x: 18, y: CENTER_SERVICE_Y_M })

const DRAWS_SEED = 42
const draws = createDraws(500, mulberry32(DRAWS_SEED))

const inProbability = computed(() =>
  estimateInProbability(you.value, target.value, shotAccuracy.value.depthErrorM, shotAccuracy.value.sideErrorM, draws),
)

function resetPositions() {
  you.value = { ...DEFAULT_YOU }
  opponent.value = { ...DEFAULT_OPPONENT }
}
</script>

<template>
  <div class="layout">
    <LeftSidebar :surface="surface" :you="you" :opponent="opponent" :shot-accuracy="shotAccuracy"
      :opponent-skill="opponentSkill" @select-surface="surface = $event" @reset-positions="resetPositions"
      @select-accuracy="selectAccuracy" @update-side-error="setSideError" @update-depth-error="setDepthError" @update-ball-speed="setBallSpeed"
      @select-opponent-skill="selectOpponentSkill" @update-run-speed="setRunSpeed"
      @update-consistency="setConsistency" />
    <main>
      <div class="court-wrapper">
        <div class="heading">
          <h2>Court</h2>
          <p class="hint">Click anywhere on your opponent's side to test your own target.</p>
        </div>
        <TennisCourt :surface="surface" :shot-accuracy="shotAccuracy" :you="you" :opponent="opponent" v-model:target="target"
          :show-dispersion="showDispersion" :show-trajectory="showTrajectory" :show-heatmap="showHeatmap"
          :show-landings="showLandings" @update:you="you = $event" @update:opponent="opponent = $event" />
        <CourtControls v-model:show-dispersion="showDispersion" v-model:show-trajectory="showTrajectory"
          :show-heatmap="showHeatmap" :show-landings="showLandings" @update:show-dispersion="showDispersion = $event"
          @update:show-trajectory="showTrajectory = $event" @update:show-heatmap="showHeatmap = $event"
          @update:show-landings="showLandings = $event" />
      </div>
    </main>
    <RightSidebar :in-probability="inProbability" />
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: flex;
  align-items: flex-start;
  gap: 1.6rem;
  padding: 1.6rem;
}

main {
  flex: 1;
  min-width: 0;

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

      .hint {
        font-size: 1.1rem;
        color: var(--text-color-secondary);
        margin-left: auto;
      }
    }
  }
}
</style>
