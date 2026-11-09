<script setup lang="ts">
import ShotResultCard from '@/components/ShotResultCard.vue'
import IconCrosshair from '@/assets/icons/icon-crosshair.vue'
import type { AimResult } from '@/math/optimizer'
import type { CourtPoint } from '@/math/point'
import type { ShotOutcome } from '@/math/simulation'

withDefaults(defineProps<{
    aim: CourtPoint
    opponent: CourtPoint
    outcome: ShotOutcome
    coverageM: number
    recommended?: AimResult | null
    recommendedCoverageM?: number
    candidateCount: number
    shotsPerTarget: number
    isCalculating?: boolean
    showRecommendedShot?: boolean
}>(), {
    recommended: null,
    recommendedCoverageM: undefined,
    isCalculating: false,
    showRecommendedShot: false,
})

const emit = defineEmits<{
    calculate: []
    showOnCourt: [shot: 'recommended' | 'target']
}>()
</script>

<template>
    <div class="right-sidebar">
        <div class="action">
            <button type="button" class="calculate" :class="{ 'is-loading': isCalculating }" :disabled="isCalculating"
                :aria-busy="isCalculating" @click="emit('calculate')">
                <span v-if="isCalculating">Simulating {{ shotsPerTarget }} shots…</span>
                <template v-else>
                    <IconCrosshair />
                    <span>Calculate optimal shot</span>
                </template>
            </button>
            <p class="hint">Tests {{ candidateCount }} candidate targets with {{ shotsPerTarget }} shots each.</p>
        </div>
        <ShotResultCard v-if="recommended && recommendedCoverageM !== undefined" class="recommended"
            heading="Recommended shot" :aim="recommended.aim" :opponent="opponent" :outcome="recommended.outcome"
            :coverage-m="recommendedCoverageM" accent-color="#6fd08c" :is-active="showRecommendedShot"
            @show-on-court="emit('showOnCourt', 'recommended')" />
        <ShotResultCard heading="Your target" :aim="aim" :opponent="opponent" :outcome="outcome"
            :coverage-m="coverageM" accent-color="var(--court-target-color)"
            :is-active="!showRecommendedShot || !recommended" @show-on-court="emit('showOnCourt', 'target')" />
    </div>
</template>

<style scoped lang="scss">
.right-sidebar {
    width: 30rem;
    flex: none;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #2a3340 transparent;
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);

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
            border: none;
            border-radius: 1rem;
            background: #6fd08c;
            color: #0b1a10;
            font: inherit;
            font-size: 1.5rem;
            font-weight: 700;
            cursor: pointer;

            &:hover {
                background: #7fdc9a;
            }

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }

            &.is-loading {
                background: #233a2b;
                box-shadow: inset 0 -0.4rem 0 #1c2f23;
                color: #8fe0a8;
                cursor: progress;
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
</style>
