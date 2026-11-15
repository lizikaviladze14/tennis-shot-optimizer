<script setup lang="ts">
import { computed } from 'vue'
import IconInfo from '@/assets/icons/icon-info.vue'
import { metresInsideSideline, metresPastNet, metresRightOfCenter, targetLabel } from '@/math/describeTarget'
import { distance, type CourtPoint } from '@/math/point'
import type { Interception } from '@/math/opponent'
import type { ShotOutcome } from '@/math/simulation'
import { formatPercent } from '@/utils/formatPercent'

const props = withDefaults(defineProps<{
    heading: string
    aim: CourtPoint
    opponent: CourtPoint
    outcome: ShotOutcome
    interception: Interception
    accentColor?: string
    isActive?: boolean
    rangeNote?: string
    showRallyWin?: boolean
    isStale?: boolean
}>(), {
    accentColor: 'var(--text-color-primary)',
    isActive: false,
    rangeNote: undefined,
    showRallyWin: false,
    isStale: false,
})

const emit = defineEmits<{
    showOnCourt: []
    recalculate: []
}>()

const title = computed(() => targetLabel(props.aim))

const position = computed(() => {
    const pastNet = `${metresPastNet(props.aim).toFixed(1)} m past net`
    const right = metresRightOfCenter(props.aim)
    const side = right >= 0 ? 'right' : 'left'
    return `${pastNet} · ${Math.abs(right).toFixed(1)} m ${side} of center`
})

const sentence = computed(() => {
    const fromOpponent = distance(props.opponent, props.aim).toFixed(1)
    const inside = metresInsideSideline(props.aim)
    const sideline = inside >= 0
        ? `and still ${inside.toFixed(1)} m inside the sideline`
        : `and ${Math.abs(inside).toFixed(1)} m outside the sideline`
    const { afterBounceM, distanceNeededM, coverageM, marginM } = props.interception
    const metres = (value: number) => value.toFixed(1)
    const where = afterBounceM < 0.1
        ? `They'd have to reach the landing spot: ${metres(distanceNeededM)} m away, with ${metres(coverageM)} m of reach.`
        : `They'd play it about ${metres(afterBounceM)} m after the bounce: they need ${metres(distanceNeededM)} m and can cover ${metres(coverageM)} m.`
    // A gap of a few centimetres rounds to 0.0, so say it in words instead
    const isTooClose = metres(Math.abs(marginM)) === '0.0'
    const spare = marginM > 0
        ? isTooClose ? ' Just out of reach.' : ` Short by ${metres(marginM)} m.`
        : isTooClose ? ' Just reaches it in time.' : ` ${metres(-marginM)} m to spare.`
    return `Lands ${fromOpponent} m from your opponent ${sideline}. ${where}${spare}`
})

function percent(fraction: number) {
    return Math.round(fraction * 100)
}

const rows = computed(() => {
    const list = [
        { id: 'in', label: 'Lands in', shortLabel: 'Lands in', value: props.outcome.pIn },
        { id: 'return', label: 'Opponent gets it back (if in)', shortLabel: 'Opponent gets it back', value: props.outcome.pReturnGivenIn },
        { id: 'win', label: 'Wins the point', shortLabel: 'Wins the point', value: props.outcome.pWin },
    ]
    if (props.showRallyWin) {
        list.push({ id: 'rally', label: 'Wins the rally', shortLabel: 'Wins the rally', value: props.outcome.pRallyWin })
    }
    return list
})
</script>

<template>
    <div class="shot-result-card" :class="{ 'is-active': isActive, 'is-stale': isStale }"
        :style="{ '--card-accent': accentColor }">
        <p v-if="isStale" class="stale-label">
            <span class="dot" aria-hidden="true" />
            Out of date ·
            <button type="button" @click="emit('recalculate')">Recalculate</button>
        </p>
        <div class="heading">
            <h3>{{ heading }}</h3>
            <span v-if="isActive" class="on-court">On court</span>
            <button v-else type="button" class="show-on-court" @click="emit('showOnCourt')">Show on court</button>
        </div>

        <div class="title">
            <span class="ring" aria-hidden="true" />
            <h2>{{ title }}</h2>
        </div>
        <p v-if="rangeNote" class="range-note">{{ rangeNote }}</p>
        <p class="position">{{ position }}</p>

        <p class="sentence">{{ sentence }}</p>

        <div class="rows">
            <div v-for="row in rows" :key="row.id" class="row" :class="`row-${row.id}`">
                <div class="row-heading">
                    <span class="label-full">{{ row.label }}</span>
                    <span class="label-short">{{ row.shortLabel }}</span>
                    <span class="value">{{ row.value === null ? '—' : formatPercent(row.value) }}</span>
                </div>
                <div class="bar">
                    <div class="bar-fill" :style="{ width: `${row.value === null ? 0 : percent(row.value)}%` }" />
                </div>
            </div>
        </div>

        <p class="note">
            <IconInfo class="note-icon" color="var(--text-color-secondary)" />
            <span>These are estimates from a simplified model with illustrative settings. They are not real-world
                guarantees.</span>
        </p>
    </div>
</template>

<style scoped lang="scss">
@use '../styles/breakpoints' as *;

.shot-result-card {
    --result-in-color: var(--text-color-primary);
    --result-return-color: #f0a070;
    --result-win-color: var(--green);
    --result-rally-color: color-mix(in srgb, var(--green) 55%, white);

    padding: 1.6rem;

    &.is-stale .rows {
        opacity: 0.55;
    }

    .stale-label {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 1.2rem;
        color: var(--text-color-secondary);
        font-size: 1.2rem;

        .dot {
            width: 0.7rem;
            height: 0.7rem;
            border-radius: 50%;
            background: #f2b84b;
        }

        button {
            padding: 0;
            border: none;
            background: none;
            color: var(--green);
            font: inherit;
            font-weight: 600;
            cursor: pointer;

            &:hover {
                text-decoration: underline;
            }

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }
        }
    }

    &.is-active {
        background: color-mix(in srgb, var(--card-accent) 5%, transparent);
        box-shadow: inset 0.3rem 0 0 var(--card-accent);

        .heading h3 {
            color: var(--card-accent);
        }
    }

    .heading {
        display: flex;
        align-items: center;
        justify-content: space-between;

        h3 {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        .on-court {
            padding: 0.5rem 1rem;
            border: 1px solid color-mix(in srgb, var(--card-accent) 45%, transparent);
            border-radius: 10px;
            background: color-mix(in srgb, var(--card-accent) 12%, transparent);
            color: var(--card-accent);
            font-size: 1.2rem;
            font-weight: 600;
        }

        .show-on-court {
            padding: 0.5rem 1rem;
            border: 1px solid var(--layout-border-color);
            border-radius: 10px;
            background: transparent;
            color: var(--text-color-primary);
            font: inherit;
            font-size: 1.2rem;
            cursor: pointer;

            &:hover {
                background: rgba(255, 255, 255, 0.04);
            }

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }
        }
    }

    .title {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1.4rem;

        .ring {
            flex: none;
            width: 1.4rem;
            height: 1.4rem;
            border: 0.3rem solid var(--result-win-color);
            border-radius: 50%;
            background: #2a3a30;
        }

        h2 {
            color: var(--text-color-primary);
            font-size: 1.8rem;
            font-weight: 700;
        }
    }

    .range-note {
        margin-top: 0.6rem;
        padding-left: 2.4rem;
        color: var(--text-color-secondary);
        font-size: 1.2rem;
        line-height: 1.45;
    }

    .position {
        margin-top: 0.4rem;
        padding-left: 2.4rem;
        color: var(--text-color-secondary);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 1.1rem;
        line-height: 1.45;
    }

    .sentence {
        margin-top: 1.2rem;
        color: var(--text-color-primary);
        font-size: 1.3rem;
        line-height: 1.5;
    }

    .rows {
        display: flex;
        flex-direction: column;
        gap: 1.4rem;
        margin-top: 1.4rem;
        padding: 1.4rem;
        border: 1px solid var(--layout-border-color);
        border-radius: 1rem;
        background: #0d1116;

        .row-heading {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 0.8rem;
            margin-bottom: 0.8rem;
            color: var(--text-color-primary);
            font-size: 1.2rem;

            .value {
                font-size: 1.6rem;
                font-weight: 500;
            }

            .label-short {
                display: none;
            }
        }

        .bar {
            height: 0.5rem;
            border-radius: 1rem;
            background: #1f252d;
            overflow: hidden;

            .bar-fill {
                height: 100%;
                border-radius: 1rem;
            }
        }

        .row-in {
            .value {
                color: var(--result-in-color);
            }

            .bar-fill {
                background: var(--result-in-color);
            }
        }

        .row-return {
            .value {
                color: var(--result-return-color);
            }

            .bar-fill {
                background: var(--result-return-color);
            }
        }

        .row-win {
            .value {
                color: var(--result-win-color);
            }

            .bar-fill {
                background: var(--result-win-color);
            }
        }

        .row-rally {
            .value {
                color: var(--result-rally-color);
            }

            .bar-fill {
                background: var(--result-rally-color);
            }
        }
    }

    .note {
        display: flex;
        align-items: flex-start;
        gap: 0.8rem;
        margin-top: 1.4rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;
        line-height: 1.45;

        .note-icon {
            flex: none;
            margin-top: 0.1rem;
        }
    }
}

@media (max-width: $layout-wide) {
    .shot-result-card {
        padding: 1.4rem 1.4rem 1.2rem;

        .heading {

            .on-court,
            .show-on-court {
                display: none;
            }
        }

        .title h2 {
            font-size: 1.7rem;
        }

        .rows {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;

            &:has(.row-rally) {
                grid-template-columns: 1fr 1fr;
            }
            gap: 0.8rem;
            margin-top: 1.2rem;
            padding: 1.2rem 0.6rem;

            .row-heading {
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 0.4rem;
                margin-bottom: 0;

                .label-full {
                    display: none;
                }

                .label-short {
                    display: block;
                    order: 2;
                    color: var(--text-color-secondary);
                    font-size: 1rem;
                    font-weight: 500;
                    line-height: 1.3;
                }

                .value {
                    order: 1;
                    font-size: 2rem;
                    font-weight: 700;
                }
            }

            .bar {
                display: none;
            }
        }
    }
}
</style>
