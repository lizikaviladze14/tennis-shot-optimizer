<script setup lang="ts">
import { computed } from 'vue'
import type { AimResult } from '@/math/optimizer'
import type { CourtPoint } from '@/math/point'
import type { ShotOutcome } from '@/math/simulation'
import type { ShownShot } from '@/types/shownShot'

const props = withDefaults(defineProps<{
    results: AimResult[]
    recommended: AimResult
    safest: AimResult
    highestWin: AimResult
    target: CourtPoint
    targetOutcome: ShotOutcome
    shownShot?: ShownShot
    isStale?: boolean
}>(), {
    shownShot: 'target',
    isStale: false,
})

const emit = defineEmits<{
    select: [shot: ShownShot]
}>()

const viewBox = { width: 300, height: 208 }
const plotPadding = { left: 40, top: 14, right: 10, bottom: 28 }
const yAxisMax = 1.1
const plotWidth = viewBox.width - plotPadding.left - plotPadding.right
const plotHeight = viewBox.height - plotPadding.top - plotPadding.bottom

function pMiss(pIn: number) {
    return 1 - pIn
}

const xMax = computed(() => {
    let max = 0.6
    for (const result of props.results) {
        max = Math.max(max, pMiss(result.outcome.pIn))
    }
    max = Math.max(max, pMiss(props.targetOutcome.pIn))
    return Math.max(0.6, Math.ceil(max * 5) / 5)
})

const xTicks = computed(() => {
    const ticks: number[] = []
    for (let t = 0; t <= xMax.value + 1e-9; t += 0.2) ticks.push(t)
    return ticks
})

const yTicks = [yAxisMax, yAxisMax / 2, 0]

function plotX(miss: number) {
    return plotPadding.left + (miss / xMax.value) * plotWidth
}

function plotY(win: number) {
    return plotPadding.top + (1 - win / yAxisMax) * plotHeight
}

const dots = computed(() =>
    props.results.map((result) => ({
        cx: plotX(pMiss(result.outcome.pIn)),
        cy: plotY(result.outcome.pWin),
    })),
)

function sameAim(a: AimResult, b: AimResult) {
    return a === b || (a.aim.x === b.aim.x && a.aim.y === b.aim.y)
}

const recommendedPos = computed(() => ({
    cx: plotX(pMiss(props.recommended.outcome.pIn)),
    cy: plotY(props.recommended.outcome.pWin),
}))

const safestIsRecommended = computed(() => sameAim(props.safest, props.recommended))
const maxWinIsRecommended = computed(() => sameAim(props.highestWin, props.recommended))
const maxWinIsSafest = computed(() => sameAim(props.highestWin, props.safest))

const recommendedCallout = computed(() => {
    const parts = ['Recommended']
    if (maxWinIsRecommended.value) parts.push('Max win')
    if (safestIsRecommended.value) parts.push('Safest')
    return parts.join(' · ')
})

const safestPos = computed(() =>
    safestIsRecommended.value
        ? null
        : { cx: plotX(pMiss(props.safest.outcome.pIn)), cy: plotY(props.safest.outcome.pWin) },
)

const safestCallout = computed(() => {
    if (safestIsRecommended.value) return ''
    return maxWinIsSafest.value ? 'Max win · Safest' : 'Safest'
})

const maxWinPos = computed(() =>
    maxWinIsRecommended.value || maxWinIsSafest.value
        ? null
        : { cx: plotX(pMiss(props.highestWin.outcome.pIn)), cy: plotY(props.highestWin.outcome.pWin) },
)

const youPos = computed(() => ({
    cx: plotX(pMiss(props.targetOutcome.pIn)),
    cy: plotY(props.targetOutcome.pWin),
}))

function calloutStyle(pos: { cx: number; cy: number }, flip = false) {
    const left = (pos.cx / viewBox.width) * 100
    const top = (pos.cy / viewBox.height) * 100
    const flipX = flip || pos.cx > viewBox.width * 0.62
    return {
        left: `${left}%`,
        top: `${top}%`,
        transform: flipX ? 'translate(calc(-100% - 0.8rem), -50%)' : 'translate(0.8rem, -50%)',
    }
}

function percentTick(value: number) {
    return `${Math.round(value * 100)}%`
}
</script>

<template>
    <section class="risk-vs-reward" :class="{ 'is-stale': isStale }">
        <div class="heading">
            <h3>Risk vs reward</h3>
            <p>each dot = one target</p>
        </div>

        <div class="chart">
            <svg :viewBox="`0 0 ${viewBox.width} ${viewBox.height}`" role="img"
                aria-label="Scatter of candidate targets: chance of missing versus chance of winning the point">
                <line :x1="plotPadding.left" :y1="plotPadding.top" :x2="plotPadding.left"
                    :y2="plotPadding.top + plotHeight" stroke="#2a3340" stroke-width="1" />
                <line :x1="plotPadding.left" :y1="plotPadding.top + plotHeight"
                    :x2="plotPadding.left + plotWidth" :y2="plotPadding.top + plotHeight" stroke="#2a3340"
                    stroke-width="1" />
                <line v-for="tick in yTicks" :key="`yg-${tick}`" :x1="plotPadding.left" :y1="plotY(tick)"
                    :x2="plotPadding.left + plotWidth" :y2="plotY(tick)" stroke="#1f252d" stroke-width="1" />
                <text v-for="tick in yTicks" :key="`yl-${tick}`" :x="plotPadding.left - 6" :y="plotY(tick)"
                    text-anchor="end" dominant-baseline="middle" fill="var(--text-color-secondary)" font-size="9">{{
                        percentTick(tick)
                    }}</text>
                <text v-for="tick in xTicks" :key="`xl-${tick}`" :x="plotX(tick)"
                    :y="plotPadding.top + plotHeight + 14" text-anchor="middle" fill="var(--text-color-secondary)"
                    font-size="9">{{ percentTick(tick) }}</text>

                <circle v-for="(dot, index) in dots" :key="index" :cx="dot.cx" :cy="dot.cy" r="1.7" class="dot"
                    fill="#8b98a4" fill-opacity="0.42" />

                <g class="mark recommended" :class="{ 'is-shown': shownShot === 'recommended' }"
                    @click="emit('select', 'recommended')">
                    <circle :cx="recommendedPos.cx" :cy="recommendedPos.cy" r="4.2" fill="#6fd08c" />
                </g>
                <g v-if="safestPos" class="mark alternative"
                    :class="{ 'is-shown': shownShot === 'safest' }" @click="emit('select', 'safest')">
                    <circle :cx="safestPos.cx" :cy="safestPos.cy" r="4.2" fill="rgba(0, 0, 0, 0.35)"
                        stroke="var(--text-color-primary)" stroke-width="1.2" />
                    <circle :cx="safestPos.cx" :cy="safestPos.cy" r="1.4" fill="var(--text-color-primary)" />
                </g>
                <g v-if="maxWinPos" class="mark alternative"
                    :class="{ 'is-shown': shownShot === 'highestWin' }" @click="emit('select', 'highestWin')">
                    <circle :cx="maxWinPos.cx" :cy="maxWinPos.cy" r="4.2" fill="rgba(0, 0, 0, 0.35)"
                        stroke="var(--text-color-primary)" stroke-width="1.2" />
                    <circle :cx="maxWinPos.cx" :cy="maxWinPos.cy" r="1.4" fill="var(--text-color-primary)" />
                </g>
                <g class="mark you" :class="{ 'is-shown': shownShot === 'target' }"
                    @click="emit('select', 'target')">
                    <rect :x="youPos.cx - 3.2" :y="youPos.cy - 3.2" width="6.4" height="6.4" rx="0.7"
                        fill="var(--court-target-color)" :transform="`rotate(45 ${youPos.cx} ${youPos.cy})`" />
                </g>
            </svg>

            <button type="button" class="callout is-recommended" :style="calloutStyle(recommendedPos)"
                @click="emit('select', 'recommended')">{{ recommendedCallout }}</button>
            <button v-if="safestPos" type="button" class="callout is-alt" :style="calloutStyle(safestPos)"
                @click="emit('select', 'safest')">{{ safestCallout }}</button>
            <button v-if="maxWinPos" type="button" class="callout is-alt" :style="calloutStyle(maxWinPos)"
                @click="emit('select', 'highestWin')">Max win</button>
            <button type="button" class="callout is-you" :style="calloutStyle(youPos)"
                @click="emit('select', 'target')">
                <span class="you-diamond" aria-hidden="true" />
                You
            </button>
        </div>

        <div class="axis-captions">
            <span>↑ Wins the point outright</span>
            <span>Chance of missing →</span>
        </div>
    </section>
</template>

<style scoped lang="scss">
.risk-vs-reward {
    padding: 1.6rem;
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);
    transition: opacity 0.15s ease;

    &.is-stale {
        opacity: 0.6;
    }

    .heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;

        h3 {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        p {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
        }
    }

    .chart {
        position: relative;
        margin-top: 1.2rem;

        svg {
            display: block;
            width: 100%;
            height: auto;
        }

        .mark {
            cursor: pointer;
        }
    }

    .callout {
        position: absolute;
        z-index: 1;
        padding: 0.25rem 0.7rem;
        border: none;
        border-radius: 0.5rem;
        font: inherit;
        font-size: 1.1rem;
        font-weight: 700;
        line-height: 1.3;
        white-space: nowrap;
        cursor: pointer;

        &.is-recommended {
            background: #6fd08c;
            color: #0b1a10;
        }

        &.is-alt {
            background: #111;
            color: var(--text-color-primary);
        }

        &.is-you {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #111;
            color: var(--court-target-color);

            .you-diamond {
                width: 0.7rem;
                height: 0.7rem;
                border-radius: 0.1rem;
                background: var(--court-target-color);
                transform: rotate(45deg);
            }
        }

        &:focus-visible {
            outline: 1px solid var(--text-color-secondary);
            outline-offset: 2px;
        }
    }

    .axis-captions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 0.4rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;
    }
}
</style>
