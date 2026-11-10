<script setup lang="ts">
import { computed } from 'vue'
import OpponentHalfCourt from '@/components/court/OpponentHalfCourt.vue'
import { GRID_CELLS } from '@/math/modelConstants'
import { heatmapCells } from '@/math/heatmap'
import type { AimResult } from '@/math/optimizer'
import type { CourtPoint } from '@/math/point'

const props = withDefaults(defineProps<{
    results: AimResult[]
    recommendedAim?: CourtPoint
    opponent?: CourtPoint
    cellCount?: number
}>(), {
    recommendedAim: undefined,
    opponent: undefined,
    cellCount: GRID_CELLS,
})

const cells = computed(() => heatmapCells(props.results, props.cellCount))

function cellFill(t: number) {
    return `color-mix(in srgb, var(--green) ${Math.round(t * 100)}%, #15241c)`
}

const recommendedColor = 'var(--green)'
const recommendedRingRadius = 0.32
const opponentColor = '#ff8a30'
</script>

<template>
    <section class="target-value-map">
        <div class="heading">
            <h3>Target value map</h3>
            <p>{{ results.length }} targets</p>
        </div>
        <div class="chart">
            <OpponentHalfCourt>
                <rect v-for="(cell, index) in cells" :key="index" :x="cell.x" :y="cell.y" :width="cell.width"
                    :height="cell.height" :fill="cellFill(cell.t)" />
                <template #overlay>
                    <g v-if="recommendedAim" :transform="`translate(${recommendedAim.x} ${recommendedAim.y})`">
                        <circle :r="recommendedRingRadius" fill="rgba(0, 0, 0, 0.35)" :stroke="recommendedColor"
                            stroke-width="0.08" />
                        <circle r="0.1" :fill="recommendedColor" />
                    </g>
                    <circle v-if="opponent" :cx="opponent.x" :cy="opponent.y" r="0.28" :fill="opponentColor"
                        stroke="#111" stroke-width="0.06" />
                </template>
            </OpponentHalfCourt>
        </div>
        <div class="legend">
            <span>Lower value</span>
            <span class="bar" aria-hidden="true" />
            <span>Higher</span>
        </div>
    </section>
</template>

<style scoped lang="scss">
.target-value-map {
    padding: 1.4rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 1.2rem;
    background: #0d1116;

    .heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.2rem;

        h3 {
            color: var(--text-color-primary);
            font-size: 1.3rem;
            font-weight: 600;
        }

        p {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
        }
    }

    .chart {
        border-radius: 1rem;
        overflow: hidden;
    }

    .legend {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1.2rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;

        .bar {
            flex: 1;
            height: 0.5rem;
            border-radius: 1rem;
            background: linear-gradient(90deg, #15241c, var(--green));
        }
    }
}
</style>
