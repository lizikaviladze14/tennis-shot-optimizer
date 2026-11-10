<script setup lang="ts">
import OpponentHalfCourt from '@/components/court/OpponentHalfCourt.vue'
import type { LandingCount, LandingKind } from '@/math/analytics'
import type { CourtPoint } from '@/math/point'

defineProps<{
    landings: { point: CourtPoint; kind: LandingKind }[]
    counts: LandingCount
    recommendedAim?: CourtPoint
    shotsPerTarget: number
}>()

const kindColor: Record<LandingKind, string> = {
    in: '#e8edf0',
    long: '#e88980',
    wide: '#e88980',
    netShort: '#e88980',
}

const recommendedColor = 'var(--green)'
const landingRadius = 0.1
const recommendedRingRadius = 0.32
</script>

<template>
    <section class="where-shots-land">
        <div class="heading">
            <h3>Where your shots land</h3>
            <p>{{ shotsPerTarget }} shots · recommended target</p>
        </div>
        <div class="chart">
            <OpponentHalfCourt>
                <template #overlay>
                    <circle v-for="(landing, index) in landings" :key="index" :cx="landing.point.x"
                        :cy="landing.point.y" :r="landingRadius" :fill="kindColor[landing.kind]"
                        :opacity="landing.kind === 'in' ? 0.9 : 0.85" />
                    <g v-if="recommendedAim" :transform="`translate(${recommendedAim.x} ${recommendedAim.y})`">
                        <circle :r="recommendedRingRadius" fill="rgba(0, 0, 0, 0.35)" :stroke="recommendedColor"
                            stroke-width="0.08" />
                    </g>
                </template>
            </OpponentHalfCourt>
        </div>
        <ul class="counts">
            <li>
                <span>In</span>
                <strong>{{ counts.in }}</strong>
            </li>
            <li class="is-out">
                <span>Long</span>
                <strong>{{ counts.long }}</strong>
            </li>
            <li class="is-out">
                <span>Wide</span>
                <strong>{{ counts.wide }}</strong>
            </li>
            <li class="is-out">
                <span>Net / short</span>
                <strong>{{ counts.netShort }}</strong>
            </li>
        </ul>
    </section>
</template>

<style scoped lang="scss">
.where-shots-land {
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

    .counts {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.8rem;
        margin-top: 1.2rem;
        list-style: none;

        li {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            color: var(--text-color-secondary);
            font-size: 1.1rem;

            strong {
                color: var(--text-color-primary);
                font-size: 1.6rem;
                font-weight: 600;
            }

            &.is-out strong {
                color: #e88980;
            }
        }
    }
}
</style>
