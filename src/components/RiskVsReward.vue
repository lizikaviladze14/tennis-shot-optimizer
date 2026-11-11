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
    showRallyWin?: boolean
    targetOutOfRange?: boolean
}>(), {
    shownShot: 'target',
    isStale: false,
    showRallyWin: false,
    targetOutOfRange: false,
})

const emit = defineEmits<{
    select: [shot: ShownShot]
}>()

const viewBox = { width: 300, height: 208 }
const plotPadding = { left: 40, top: 14, right: 10, bottom: 28 }
const yAxisMax = 1
const plotWidth = viewBox.width - plotPadding.left - plotPadding.right
const plotHeight = viewBox.height - plotPadding.top - plotPadding.bottom
const yTicks = [1, 0.75, 0.5, 0.25, 0]
const labelHeight = 24
const labelGap = 6
const labelCharWidth = 7.6
const labelPadX = 16
const labelGapX = 8

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

function plotX(miss: number) {
    return plotPadding.left + (miss / xMax.value) * plotWidth
}

function plotY(win: number) {
    return plotPadding.top + (1 - win / yAxisMax) * plotHeight
}

function reward(outcome: ShotOutcome) {
    return props.showRallyWin ? outcome.pRallyWin : outcome.pWin
}

function samePoint(a: CourtPoint, b: CourtPoint) {
    return a.x === b.x && a.y === b.y
}

const dots = computed(() =>
    props.results
        .filter((result) => !samePoint(result.aim, props.target))
        .map((result) => ({
            cx: plotX(pMiss(result.outcome.pIn)),
            cy: plotY(reward(result.outcome)),
        })),
)

function sameAim(a: AimResult, b: AimResult) {
    return a === b || (a.aim.x === b.aim.x && a.aim.y === b.aim.y)
}

const recommendedPos = computed(() => ({
    cx: plotX(pMiss(props.recommended.outcome.pIn)),
    cy: plotY(reward(props.recommended.outcome)),
}))

const safestIsRecommended = computed(() => sameAim(props.safest, props.recommended))
const maxWinIsRecommended = computed(() => sameAim(props.highestWin, props.recommended))
const maxWinIsSafest = computed(() => sameAim(props.highestWin, props.safest))

const targetOnRecommended = computed(() => samePoint(props.target, props.recommended.aim))
const targetOnSafest = computed(() => samePoint(props.target, props.safest.aim))
const targetOnHighest = computed(() => samePoint(props.target, props.highestWin.aim))
const showYouMarker = computed(() => !targetOnRecommended.value && !targetOnSafest.value && !targetOnHighest.value)

const recommendedCallout = computed(() => {
    const parts = ['Recommended']
    if (maxWinIsRecommended.value) parts.push('Max win')
    if (safestIsRecommended.value) parts.push('Safest')
    if (targetOnRecommended.value) parts.push('You')
    return parts.join(' · ')
})

const safestPos = computed(() =>
    safestIsRecommended.value
        ? null
        : { cx: plotX(pMiss(props.safest.outcome.pIn)), cy: plotY(reward(props.safest.outcome)) },
)

const safestCallout = computed(() => {
    if (safestIsRecommended.value) return ''
    const parts = [maxWinIsSafest.value ? 'Max win · Safest' : 'Safest']
    if (targetOnSafest.value) parts.push('You')
    return parts.join(' · ')
})

const maxWinPos = computed(() =>
    maxWinIsRecommended.value || maxWinIsSafest.value
        ? null
        : { cx: plotX(pMiss(props.highestWin.outcome.pIn)), cy: plotY(reward(props.highestWin.outcome)) },
)

const youPos = computed(() => ({
    cx: plotX(pMiss(props.targetOutcome.pIn)),
    cy: plotY(reward(props.targetOutcome)),
}))

type MarkerId = ShownShot

type PlacedLabel = {
    id: MarkerId
    text: string
    cx: number
    cy: number
    flip: boolean
    offsetY: number
    showLabel: boolean
}

function labelBox(label: PlacedLabel) {
    const width = label.text.length * labelCharWidth + labelPadX
    const x = label.flip ? label.cx - labelGapX - width : label.cx + labelGapX
    const y = label.cy + label.offsetY - labelHeight / 2
    return { x, y, right: x + width, bottom: y + labelHeight }
}

function boxesOverlap(a: ReturnType<typeof labelBox>, b: ReturnType<typeof labelBox>) {
    return a.x < b.right + labelGap && a.right + labelGap > b.x && a.y < b.bottom + labelGap && a.bottom + labelGap > b.y
}

function verticallyInside(box: ReturnType<typeof labelBox>) {
    return box.y >= 0 && box.bottom <= viewBox.height
}

const placedLabels = computed(() => {
    const seeds: PlacedLabel[] = [{
        id: 'recommended',
        text: recommendedCallout.value,
        cx: recommendedPos.value.cx,
        cy: recommendedPos.value.cy,
        flip: recommendedPos.value.cx > viewBox.width * 0.62,
        offsetY: 0,
        showLabel: true,
    }]
    if (showYouMarker.value) {
        seeds.push({
            id: 'target',
            text: 'You',
            cx: youPos.value.cx,
            cy: youPos.value.cy,
            flip: youPos.value.cx > viewBox.width * 0.62,
            offsetY: 0,
            showLabel: true,
        })
    }
    if (safestPos.value) {
        seeds.push({
            id: 'safest',
            text: safestCallout.value,
            cx: safestPos.value.cx,
            cy: safestPos.value.cy,
            flip: safestPos.value.cx > viewBox.width * 0.62,
            offsetY: 0,
            showLabel: true,
        })
    }
    if (maxWinPos.value) {
        seeds.push({
            id: 'highestWin',
            text: targetOnHighest.value ? 'Max win · You' : 'Max win',
            cx: maxWinPos.value.cx,
            cy: maxWinPos.value.cy,
            flip: maxWinPos.value.cx > viewBox.width * 0.62,
            offsetY: 0,
            showLabel: true,
        })
    }

    const step = labelHeight + labelGap
    const shifts = [0, -step, step, -2 * step, 2 * step, -3 * step, 3 * step, -4 * step, 4 * step]
    const placed: PlacedLabel[] = []
    const byId: Partial<Record<MarkerId, PlacedLabel>> = {}

    for (const seed of seeds) {
        let chosen: PlacedLabel | null = null
        for (const flip of [seed.flip, !seed.flip]) {
            if (chosen) break
            for (const offsetY of shifts) {
                const option = { ...seed, flip, offsetY }
                const box = labelBox(option)
                if (!verticallyInside(box)) continue
                if (placed.some((other) => boxesOverlap(box, labelBox(other)))) continue
                chosen = option
                break
            }
        }
        const label = chosen ?? { ...seed, showLabel: false }
        if (label.showLabel) placed.push(label)
        byId[label.id] = label
    }

    return byId
})

function calloutStyle(label: PlacedLabel) {
    const left = (label.cx / viewBox.width) * 100
    const top = ((label.cy + label.offsetY) / viewBox.height) * 100
    return {
        left: `${left}%`,
        top: `${top}%`,
        transform: label.flip ? 'translate(calc(-100% - 0.8rem), -50%)' : 'translate(0.8rem, -50%)',
    }
}

const rewardCaption = computed(() => (props.showRallyWin ? 'Wins the rally ↑' : '↑ Wins the point'))
const chartLabel = computed(() =>
    props.showRallyWin
        ? 'Scatter of candidate targets: chance of missing versus chance of winning the rally'
        : 'Scatter of candidate targets: chance of missing versus chance of winning the point',
)

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
            <svg :viewBox="`0 0 ${viewBox.width} ${viewBox.height}`" role="img" :aria-label="chartLabel">
                <line :x1="plotPadding.left" :y1="plotPadding.top" :x2="plotPadding.left"
                    :y2="plotPadding.top + plotHeight" stroke="#2a3340" stroke-width="1" />
                <line :x1="plotPadding.left" :y1="plotPadding.top + plotHeight" :x2="plotPadding.left + plotWidth"
                    :y2="plotPadding.top + plotHeight" stroke="#2a3340" stroke-width="1" />
                <line v-for="tick in yTicks" :key="`yg-${tick}`" :x1="plotPadding.left" :y1="plotY(tick)"
                    :x2="plotPadding.left + plotWidth" :y2="plotY(tick)" stroke="#1f252d" stroke-width="1" />
                <text v-for="tick in yTicks" :key="`yl-${tick}`" :x="plotPadding.left - 6" :y="plotY(tick)"
                    text-anchor="end" dominant-baseline="middle" fill="var(--text-color-secondary)" font-size="9">{{
                        percentTick(tick)
                    }}</text>
                <text v-for="tick in xTicks" :key="`xl-${tick}`" :x="plotX(tick)" :y="plotPadding.top + plotHeight + 14"
                    text-anchor="middle" fill="var(--text-color-secondary)" font-size="9">{{ percentTick(tick) }}</text>

                <circle v-for="(dot, index) in dots" :key="index" :cx="dot.cx" :cy="dot.cy" r="1.7" class="dot"
                    fill="#8b98a4" fill-opacity="0.42" />

                <g class="mark recommended" :class="{ 'is-shown': shownShot === 'recommended' }"
                    @click="emit('select', 'recommended')">
                    <title v-if="placedLabels.recommended && !placedLabels.recommended.showLabel">{{
                        placedLabels.recommended.text }}</title>
                    <circle :cx="recommendedPos.cx" :cy="recommendedPos.cy" r="4.2" fill="var(--green)" />
                </g>
                <g v-if="safestPos" class="mark alternative" :class="{ 'is-shown': shownShot === 'safest' }"
                    @click="emit('select', 'safest')">
                    <title v-if="placedLabels.safest && !placedLabels.safest.showLabel">{{ placedLabels.safest.text
                        }}</title>
                    <circle :cx="safestPos.cx" :cy="safestPos.cy" r="4.2" fill="rgba(0, 0, 0, 0.35)"
                        stroke="var(--text-color-primary)" stroke-width="1.2" />
                    <circle :cx="safestPos.cx" :cy="safestPos.cy" r="1.4" fill="var(--text-color-primary)" />
                </g>
                <g v-if="maxWinPos" class="mark alternative" :class="{ 'is-shown': shownShot === 'highestWin' }"
                    @click="emit('select', 'highestWin')">
                    <title v-if="placedLabels.highestWin && !placedLabels.highestWin.showLabel">{{
                        placedLabels.highestWin.text }}</title>
                    <circle :cx="maxWinPos.cx" :cy="maxWinPos.cy" r="4.2" fill="rgba(0, 0, 0, 0.35)"
                        stroke="var(--text-color-primary)" stroke-width="1.2" />
                    <circle :cx="maxWinPos.cx" :cy="maxWinPos.cy" r="1.4" fill="var(--text-color-primary)" />
                </g>
                <g v-if="showYouMarker" class="mark you" :class="{ 'is-shown': shownShot === 'target' }"
                    @click="emit('select', 'target')">
                    <title v-if="placedLabels.target && !placedLabels.target.showLabel">{{ placedLabels.target.text
                        }}</title>
                    <rect :x="youPos.cx - 3.2" :y="youPos.cy - 3.2" width="6.4" height="6.4" rx="0.7"
                        :fill="targetOutOfRange ? 'none' : 'var(--court-target-color)'"
                        :stroke="targetOutOfRange ? 'var(--court-target-color)' : 'none'" stroke-width="1.2"
                        :transform="`rotate(45 ${youPos.cx} ${youPos.cy})`" />
                </g>
            </svg>

            <button v-if="placedLabels.recommended?.showLabel" type="button" class="callout is-recommended"
                :style="calloutStyle(placedLabels.recommended)" @click="emit('select', 'recommended')">{{
                    placedLabels.recommended.text }}</button>
            <button v-if="placedLabels.safest?.showLabel" type="button" class="callout is-alt"
                :style="calloutStyle(placedLabels.safest)" @click="emit('select', 'safest')">{{
                    placedLabels.safest.text }}</button>
            <button v-if="placedLabels.highestWin?.showLabel" type="button" class="callout is-alt"
                :style="calloutStyle(placedLabels.highestWin)" @click="emit('select', 'highestWin')">{{
                    placedLabels.highestWin.text }}</button>
            <button v-if="placedLabels.target?.showLabel" type="button" class="callout is-you"
                :style="calloutStyle(placedLabels.target)" @click="emit('select', 'target')">
                <span class="you-diamond" aria-hidden="true" />
                You
            </button>
        </div>

        <div class="axis-captions">
            <span>{{ rewardCaption }}</span>
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
            background: var(--green);
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
