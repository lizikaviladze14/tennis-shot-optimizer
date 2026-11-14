<script setup lang="ts">
import ShotResultCard from '@/components/ShotResultCard.vue'
import CompareAlternatives from '@/components/CompareAlternatives.vue'
import RiskVsReward from '@/components/RiskVsReward.vue'
import IconCrosshair from '@/assets/icons/icon-crosshair.vue'
import type { AimResult } from '@/math/optimizer'
import type { CourtPoint } from '@/math/point'
import type { Interception } from '@/math/opponent'
import type { ShotOutcome } from '@/math/simulation'
import type { ShownShot } from '@/types/shownShot'

withDefaults(defineProps<{
    aim: CourtPoint
    opponent: CourtPoint
    outcome: ShotOutcome
    interception: Interception
    recommended?: AimResult | null
    recommendedInterception?: Interception
    candidateCount: number
    shotsPerTarget: number
    isCalculating?: boolean
    shownShot?: ShownShot
    safest?: AimResult | null
    highestWin?: AimResult | null
    isStale?: boolean
    results?: AimResult[]
    rangeNote?: string
    showRallyWin?: boolean
}>(), {
    recommended: null,
    recommendedInterception: undefined,
    isCalculating: false,
    shownShot: 'target',
    safest: null,
    highestWin: null,
    isStale: false,
    results: () => [],
    rangeNote: undefined,
    showRallyWin: false,
})

const emit = defineEmits<{
    calculate: []
    showOnCourt: [shot: ShownShot]
}>()
</script>

<template>
    <div class="right-sidebar">
        <div class="results-card">
            <div class="action">
                <button type="button" class="calculate"
                    :class="{ 'is-loading': isCalculating, 'is-stale': isStale && !isCalculating }"
                    :disabled="isCalculating" :aria-busy="isCalculating" @click="emit('calculate')">
                    <span v-if="isCalculating">Simulating {{ shotsPerTarget }} shots…</span>
                    <template v-else>
                        <IconCrosshair />
                        <span>{{ isStale ? 'Calculate optimal shot' : 'Recalculate' }}</span>
                    </template>
                </button>
                <p class="hint">Tests {{ candidateCount }} candidate targets with {{ shotsPerTarget }} shots each.</p>
            </div>
            <ShotResultCard v-if="recommended && recommendedInterception" class="recommended"
                heading="Recommended shot" :aim="recommended.aim" :opponent="opponent" :outcome="recommended.outcome"
                :interception="recommendedInterception" accent-color="var(--green)" :show-rally-win="showRallyWin"
                :is-active="shownShot === 'recommended'" :is-stale="isStale"
                @show-on-court="emit('showOnCourt', 'recommended')" @recalculate="emit('calculate')" />
            <ShotResultCard class="your-target" heading="Your target" :aim="aim" :opponent="opponent" :outcome="outcome"
                :interception="interception" accent-color="var(--court-target-color)" :range-note="rangeNote"
                :show-rally-win="showRallyWin"
                :is-active="shownShot === 'target' || !recommended" @show-on-court="emit('showOnCourt', 'target')" />
        </div>
        <RiskVsReward v-if="recommended && safest && highestWin && results.length" :results="results"
            :recommended="recommended" :safest="safest" :highest-win="highestWin" :target="aim"
            :target-outcome="outcome" :shown-shot="shownShot" :is-stale="isStale" :show-rally-win="showRallyWin"
            :target-out-of-range="Boolean(rangeNote)" @select="emit('showOnCourt', $event)" />
        <CompareAlternatives v-if="recommended && safest && highestWin" :recommended="recommended" :safest="safest"
            :highest-win="highestWin" :target="aim" :target-outcome="outcome" :shown-shot="shownShot"
            :is-stale="isStale" :show-rally-win="showRallyWin" :range-note="rangeNote"
            @select="emit('showOnCourt', $event)" />
    </div>
</template>

<style scoped lang="scss">
@use '../../styles/breakpoints' as *;

.right-sidebar {
    width: 30rem;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    min-height: 0;
    padding-bottom: var(--badge-clearance);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #2a3340 transparent;
    background: transparent;
    border: none;

    >* {
        flex-shrink: 0;
    }

    .results-card {
        background-color: var(--layout-bg-color);
        border: 1px solid var(--layout-border-color);
        border-radius: var(--border-radius);
        overflow: hidden;
    }

    .action {
        padding: 1.6rem;
        border-bottom: 1px solid var(--layout-border-color);

        .calculate {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            width: 100%;
            padding: 1.3rem 1.6rem;
            border: 1px solid var(--green);
            border-radius: 1rem;
            background: transparent;
            color: var(--green);
            font: inherit;
            font-size: 1.5rem;
            font-weight: 700;
            cursor: pointer;

            &:hover {
                background: rgba(111, 208, 140, 0.08);
            }

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }

            &.is-stale {
                border: none;
                background: var(--green);
                color: #0b1a10;
                animation: calculate-pulse 2s ease-in-out infinite;

                &:hover {
                    background: #7fdc9a;
                }
            }

            &.is-loading {
                border: none;
                background: #233a2b;
                box-shadow: inset 0 -0.4rem 0 #1c2f23;
                color: #8fe0a8;
                cursor: progress;
                animation: none;
            }
        }

        @keyframes calculate-pulse {

            0%,
            100% {
                box-shadow: 0 0 0 0 rgba(111, 208, 140, 0.45);
            }

            50% {
                box-shadow: 0 0 1.6rem 0.4rem rgba(111, 208, 140, 0.35);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .calculate.is-stale {
                animation: none;
            }
        }

        .hint {
            margin-top: 1rem;
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            line-height: 1.45;
            text-align: center;
        }
    }

    .recommended {
        border-bottom: 1px solid var(--layout-border-color);
    }
}

@media (max-width: $layout-wide) {
    .right-sidebar {
        width: auto;
        padding-bottom: 0;
        overflow: visible;
        background: transparent;
        border: none;

        .action {
            .calculate:not(.is-loading) {
                border: none;
                background: var(--green);
                color: #0b1a10;
                animation: none;

                &:hover {
                    background: #7fdc9a;
                }
            }

            .hint {
                display: none;
            }
        }

        .recommended {
            border-bottom: none;
        }

        .recommended+.your-target {
            display: none;
        }
    }
}
</style>
