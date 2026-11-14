<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import WhereShotsLand from '@/components/WhereShotsLand.vue'
import TargetValueMap from '@/components/TargetValueMap.vue'
import SimulationRun from '@/components/SimulationRun.vue'
import ModelExplainerCard from '@/components/ModelExplainerCard.vue'
import SensitivityLab, { type AppSetup } from '@/components/SensitivityLab.vue'
import type { LandingCount, LandingKind } from '@/math/analytics'
import type { AimResult } from '@/math/optimizer'
import type { CourtPoint } from '@/math/point'
import type { ShotOutcome } from '@/math/simulation'
import type { ModelLevel } from '@/types/modelLevel'

defineProps<{
    recommendedLandings: { point: CourtPoint; kind: LandingKind }[]
    recommendedLandingCounts: LandingCount
    results: AimResult[]
    recommendedAim?: CourtPoint
    opponent?: CourtPoint
    shotsPerTarget: number
    candidateCount: number
    recommendedOutcome?: ShotOutcome
    computeTimeMs?: number | null
    gridCells: number
    drawsCount: number
    showRallyWin?: boolean
    modelLevel?: ModelLevel
    shotLabel?: string
    isStale?: boolean
    /** The app's current setup, for the "Test assumptions" dialog's "Copy my current setup". */
    appSetup: AppSetup
}>()

const isOpen = ref(true)
const explainerHighlighted = ref(false)
let highlightTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
    if (window.matchMedia('(max-width: 70em)').matches) isOpen.value = false
})

onUnmounted(() => {
    if (highlightTimer) clearTimeout(highlightTimer)
})

function toggle() {
    isOpen.value = !isOpen.value
}

async function revealExplainer() {
    isOpen.value = true
    explainerHighlighted.value = false
    if (highlightTimer) clearTimeout(highlightTimer)
    await nextTick()
    document.getElementById('how-the-model-works')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    explainerHighlighted.value = true
    highlightTimer = setTimeout(() => {
        explainerHighlighted.value = false
        highlightTimer = null
    }, 1800)
}

const labOpen = ref(false)
const labButton = ref<HTMLButtonElement | null>(null)

function openLab() {
    labOpen.value = true
}

async function closeLab() {
    labOpen.value = false
    await nextTick()
    labButton.value?.focus()
}

defineExpose({ revealExplainer })
</script>

<template>
    <div class="model-analytics">
        <div class="heading" @click="toggle">
            <div class="title">
                <h1>Model Analytics</h1>
                <p class="desc">
                    Where your shots land, how every target scored, and how the model works
                </p>
            </div>

            <button ref="labButton" type="button" class="lab-button" aria-haspopup="dialog" @click.stop="openLab">
                Test assumptions
            </button>

            <button type="button" class="toggle" :aria-expanded="isOpen" aria-controls="model-analytics-panel"
                @click.stop="toggle">
                <svg class="chevron" :class="{ 'is-open': isOpen }" width="18" height="18" viewBox="0 0 20 20"
                    fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </button>
        </div>

        <div v-show="isOpen" id="model-analytics-panel" class="content">
            <WhereShotsLand :landings="recommendedLandings" :counts="recommendedLandingCounts"
                :recommended-aim="recommendedAim" :shots-per-target="shotsPerTarget" />
            <TargetValueMap :results="results" :recommended-aim="recommendedAim" :opponent="opponent" />
            <SimulationRun v-if="recommendedOutcome && computeTimeMs != null" :candidate-count="candidateCount"
                :shots-per-target="shotsPerTarget" :outcome="recommendedOutcome" :compute-time-ms="computeTimeMs"
                :show-rally-win="showRallyWin" :is-stale="isStale" />
            <ModelExplainerCard id="how-the-model-works" class="explainer" :grid-cells="gridCells"
                :draws-count="drawsCount" :highlighted="explainerHighlighted" :model-level="modelLevel"
                :shot-label="shotLabel" />
        </div>

        <SensitivityLab :open="labOpen" :app-setup="appSetup" @close="closeLab" />
    </div>
</template>

<style scoped lang="scss">
@use '../styles/breakpoints' as *;

.model-analytics {
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);
    padding: 1.6rem;
    margin-top: 1rem;

    .heading {
        display: flex;
        align-items: center;
        cursor: pointer;

        .title {
            .desc {
                margin-top: 0.5rem;
                font-size: 1.1rem;
                color: var(--text-color-secondary);
            }
        }

        h1 {
            font-size: 1.4rem;
            font-weight: 500;
            color: var(--text-color-primary);
            letter-spacing: 0.12em;
        }

        .lab-button {
            flex: none;
            margin-left: auto;
            padding: 0.6rem 1.1rem;
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

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }
        }

        .toggle {
            margin-left: 0.8rem;
            padding: 0.4rem;
            border: none;
            background: transparent;
            color: var(--text-color-secondary);
            cursor: pointer;

            &:hover {
                color: var(--text-color-primary);
            }

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }
        }

        .chevron {
            display: block;
            transition: transform 0.15s ease;

            &.is-open {
                transform: rotate(180deg);
            }
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .chevron {
            transition: none;
        }
    }

    .content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.2rem;
        margin-top: 1.6rem;

        .explainer {
            grid-column: 1 / -1;
        }
    }
}

@media (max-width: $layout-wide) {
    .model-analytics {
        .heading .title .desc {
            padding-right: 1rem;
        }

        .content {
            grid-template-columns: 1fr;
        }
    }
}
</style>
