<script setup lang="ts">
import { computed } from 'vue'
import { targetLabel } from '@/math/describeTarget'
import type { AimResult } from '@/math/optimizer'
import type { CourtPoint } from '@/math/point'
import type { ShotOutcome } from '@/math/simulation'
import type { ShownShot } from '@/types/shownShot'

const props = withDefaults(defineProps<{
    recommended: AimResult
    safest: AimResult
    highestWin: AimResult
    target: CourtPoint
    targetOutcome: ShotOutcome
    shownShot: ShownShot
    isStale?: boolean
    showRallyWin?: boolean
    rangeNote?: string
}>(), {
    isStale: false,
    showRallyWin: false,
    rangeNote: undefined,
})

const emit = defineEmits<{
    select: [shot: ShownShot]
}>()

type Row = {
    id: 'safest' | 'highestWin' | 'target'
    title: string
    marker: 'ring' | 'diamond'
    aim: CourtPoint
    outcome: ShotOutcome
    sameAsRecommended: boolean
}

function samePoint(a: CourtPoint, b: CourtPoint) {
    return a.x === b.x && a.y === b.y
}

const rows = computed<Row[]>(() => [
    {
        id: 'safest',
        title: 'Safest shot',
        marker: 'ring',
        aim: props.safest.aim,
        outcome: props.safest.outcome,
        sameAsRecommended: props.safest === props.recommended,
    },
    {
        id: 'highestWin',
        title: props.showRallyWin ? 'Highest rally win' : 'Highest win chance',
        marker: 'ring',
        aim: props.highestWin.aim,
        outcome: props.highestWin.outcome,
        sameAsRecommended: props.highestWin === props.recommended,
    },
    {
        id: 'target',
        title: 'Your target',
        marker: 'diamond',
        aim: props.target,
        outcome: props.targetOutcome,
        sameAsRecommended: samePoint(props.target, props.recommended.aim),
    },
])

function winFraction(outcome: ShotOutcome) {
    return props.showRallyWin ? outcome.pRallyWin : outcome.pWin
}

const winLabel = computed(() => (props.showRallyWin ? 'Wins the rally' : 'Wins the point'))
const winUnit = computed(() => (props.showRallyWin ? 'rally' : 'win'))

function badge(row: Row) {
    if (row.id === 'target' && props.rangeNote) return ''
    if (row.sameAsRecommended) return 'Same as recommended'
    const difference = Math.round((winFraction(row.outcome) - winFraction(props.recommended.outcome)) * 100)
    const gap = `${Math.abs(difference)} pp vs recommended`
    if (difference > 0) return `+${gap}`
    if (difference < 0) return `−${gap}`
    return gap
}

function isShown(row: Row) {
    return props.shownShot === row.id || (row.sameAsRecommended && props.shownShot === 'recommended')
}

function percent(fraction: number) {
    return Math.round(fraction * 100)
}
</script>

<template>
    <section class="compare-alternatives" :class="{ 'is-stale': isStale }">
        <h3>Compare alternatives</h3>
        <ul>
            <li v-for="row in rows" :key="row.id">
                <button type="button" class="row" :class="[`row-${row.marker}`, { 'is-shown': isShown(row) }]"
                    :aria-pressed="isShown(row)" @click="emit('select', row.id)">
                    <span class="row-heading">
                        <span class="marker" :class="`marker-${row.marker}`" aria-hidden="true" />
                        <span class="titles">
                            <span class="title">{{ row.title }}</span>
                            <span class="zone">{{ targetLabel(row.aim) }}</span>
                            <span v-if="row.id === 'target' && rangeNote" class="range-note">{{ rangeNote }}</span>
                        </span>
                        <span v-if="badge(row)" class="badge">{{ badge(row) }}</span>
                    </span>
                    <span class="stats">
                        <span class="stat stat-in">
                            <span class="stat-heading">
                                <span class="stat-label">Lands in</span>
                                <span class="value">{{ percent(row.outcome.pIn) }}%<span class="unit"> in</span></span>
                            </span>
                            <span class="bar"><span class="bar-fill"
                                    :style="{ width: `${percent(row.outcome.pIn)}%` }" /></span>
                        </span>
                        <span class="stat stat-win">
                            <span class="stat-heading">
                                <span class="stat-label">{{ winLabel }}</span>
                                <span class="value">{{ percent(winFraction(row.outcome)) }}%<span class="unit">
                                        {{ winUnit }}</span></span>
                            </span>
                            <span class="bar"><span class="bar-fill"
                                    :style="{ width: `${percent(winFraction(row.outcome))}%` }" /></span>
                        </span>
                    </span>
                </button>
            </li>
        </ul>
    </section>
</template>

<style scoped lang="scss">
@use '../styles/breakpoints' as *;

.compare-alternatives {
    --compare-in-color: var(--text-color-primary);
    --compare-win-color: var(--green);

    padding: 1.6rem;
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);
    transition: opacity 0.15s ease;

    &.is-stale {
        opacity: 0.6;
    }

    h3 {
        color: var(--text-color-secondary);
        font-size: 1.1rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }

    ul {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1.4rem;
        list-style: none;
    }

    .row {
        --row-accent: var(--text-color-primary);

        display: flex;
        flex-direction: column;
        gap: 1.2rem;
        width: 100%;
        padding: 1.2rem 1.4rem;
        border: 1px solid var(--layout-border-color);
        border-radius: 1rem;
        background: #0d1116;
        color: var(--text-color-primary);
        font: inherit;
        text-align: left;
        cursor: pointer;

        &.row-diamond {
            --row-accent: var(--court-target-color);
        }

        &:hover {
            border-color: #2f3742;
        }

        &:focus-visible {
            outline: 1px solid var(--text-color-secondary);
            outline-offset: 2px;
        }

        &.is-shown {
            border-color: color-mix(in srgb, var(--row-accent) 55%, transparent);
            background: color-mix(in srgb, var(--row-accent) 5%, #0d1116);
        }
    }

    .row-heading {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    }

    .marker {
        flex: none;
        margin-top: 0.3rem;

        &.marker-ring {
            position: relative;
            width: 1.2rem;
            height: 1.2rem;
            border: 0.2rem solid var(--text-color-primary);
            border-radius: 50%;

            &::after {
                content: '';
                position: absolute;
                inset: 0.22rem;
                border-radius: 50%;
                background: var(--text-color-primary);
            }
        }

        &.marker-diamond {
            width: 1rem;
            height: 1rem;
            margin: 0.4rem 0.1rem 0;
            border-radius: 0.15rem;
            background: var(--court-target-color);
            transform: rotate(45deg);
        }
    }

    .titles {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;

        .title {
            font-size: 1.3rem;
            font-weight: 600;
        }

        .zone {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            line-height: 1.35;
        }

        .range-note {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            line-height: 1.35;
        }
    }

    .badge {
        flex: none;
        max-width: 9rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;
        line-height: 1.35;
        text-align: right;
    }

    .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.2rem;
    }

    .stat-heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.6rem;
        margin-bottom: 0.6rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;

        .value {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 1.2rem;
        }

        .unit {
            display: none;
        }
    }

    .bar {
        display: block;
        height: 0.4rem;
        border-radius: 1rem;
        background: #1f252d;
        overflow: hidden;

        .bar-fill {
            display: block;
            height: 100%;
            border-radius: 1rem;
        }
    }

    .stat-in {
        .value {
            color: var(--compare-in-color);
        }

        .bar-fill {
            background: var(--compare-in-color);
        }
    }

    .stat-win {
        .value {
            color: var(--compare-win-color);
        }

        .bar-fill {
            background: var(--compare-win-color);
        }
    }
}

@media (max-width: $layout-wide) {
    .compare-alternatives {
        .badge {
            display: none;
        }

        .row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 1rem 1.2rem;
            padding: 1.1rem 1.2rem;
        }

        .row-heading {
            min-width: 0;
        }

        .stats {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            text-align: right;
        }

        .stat-heading {
            margin-bottom: 0;
            justify-content: flex-end;

            .stat-label {
                display: none;
            }

            .value {
                font-size: 1.3rem;
                font-weight: 600;
            }

            .unit {
                display: inline;
                font-weight: 500;
            }
        }

        .bar {
            display: none;
        }
    }
}
</style>
